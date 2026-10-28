<?php
// Passa uma família da app antiga (Firebase "pontos-familia") para a SAS Kids (Firebase "pontos-app").
// Corre no servidor, na linha de comandos (Terminal do cPanel ou uma tarefa agendada de uma vez só):
//
//   php migrate.php --to-email=EMAIL_NA_SAS_KIDS            → só mostra o que vai fazer (não muda nada)
//   php migrate.php --to-email=EMAIL_NA_SAS_KIDS --go       → faz a cópia
//   … --replace   apaga primeiro o que já houver nessa conta da SAS Kids (ex.: uma família de teste)
//   … --from-email=EMAIL_ANTIGO   se a app antiga tiver mais do que uma família
//
// Chaves (fora da pasta pública, com permissões 600):
//   ~/pontos-secrets/familia-service-account.json   ← app antiga (pontos-familia)
//   ~/pontos-secrets/service-account.json           ← SAS Kids (a que o notificador já usa)
//
// Copia a família, os filhos (com fotos e pontos), tarefas, missões, prémios e todo o histórico, com os
// mesmos ids. Os PINs continuam iguais (pinSalt). Não copia aparelhos ligados nem notificações, que
// pertencem à instalação antiga: na SAS Kids liga-se de novo cada aparelho e o sino.
// A app antiga não é alterada.

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$opt = getopt('', ['to-email:', 'from-email:', 'go', 'replace']);
$GO = isset($opt['go']); $REPLACE = isset($opt['replace']);
if (empty($opt['to-email'])) { fwrite(STDERR, "Falta --to-email=… (o email da conta criada na SAS Kids).\n"); exit(1); }

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function http(string $method, string $url, ?string $token, $body = null, array $headers = []): array {
    $ch = curl_init($url);
    if ($token) $headers[] = "Authorization: Bearer $token";
    if (is_array($body)) { $body = json_encode($body, JSON_UNESCAPED_UNICODE); $headers[] = 'Content-Type: application/json'; }
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 60]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($ch);
    if ($raw === false) throw new RuntimeException("Pedido falhou ($url): " . curl_error($ch));
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($raw, true)];
}

/** Ligação a um projeto: ['project', 'base' (Firestore), 'auth' (Identity Toolkit), 'token']. */
function connect(string $saFile, string $emuProjectEnv): array {
    $emu = getenv('FIRESTORE_EMULATOR_HOST');
    if ($emu) {
        $p = getenv($emuProjectEnv);
        return ['project' => $p, 'token' => 'owner', 'base' => "http://$emu/v1/projects/$p/databases/(default)/documents",
                'auth' => 'http://' . (getenv('FIREBASE_AUTH_EMULATOR_HOST') ?: '127.0.0.1:9099') . "/identitytoolkit.googleapis.com/v1/projects/$p"];
    }
    if (!is_readable($saFile)) throw new RuntimeException("Não encontro a chave $saFile");
    $sa = json_decode(file_get_contents($saFile), true);
    $now = time();
    $head = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = b64url(json_encode(['iss' => $sa['client_email'], 'aud' => $sa['token_uri'], 'iat' => $now, 'exp' => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit']));
    openssl_sign("$head.$claims", $sig, $sa['private_key'], 'sha256WithRSAEncryption');
    $r = http('POST', $sa['token_uri'], null, http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => "$head.$claims." . b64url($sig)]),
        ['Content-Type: application/x-www-form-urlencoded']);
    if (empty($r['body']['access_token'])) throw new RuntimeException("Chave $saFile recusada: " . json_encode($r['body']));
    $p = $sa['project_id'];
    return ['project' => $p, 'token' => $r['body']['access_token'], 'base' => "https://firestore.googleapis.com/v1/projects/$p/databases/(default)/documents",
            'auth' => "https://identitytoolkit.googleapis.com/v1/projects/$p"];
}

/** Documentos (com os campos tal como o Firestore os guarda) de uma coleção. */
function listRaw(array $c, string $path): array {
    $out = []; $page = '';
    do {
        $r = http('GET', "{$c['base']}/$path?pageSize=300" . ($page ? '&pageToken=' . urlencode($page) : ''), $c['token']);
        if ($r['code'] >= 400) throw new RuntimeException("Erro a ler $path: " . json_encode($r['body']));
        foreach ($r['body']['documents'] ?? [] as $d) $out[basename($d['name'])] = $d['fields'] ?? [];
        $page = $r['body']['nextPageToken'] ?? '';
    } while ($page);
    return $out;
}
function getRaw(array $c, string $path): ?array {
    $r = http('GET', "{$c['base']}/$path", $c['token']);
    if ($r['code'] === 404) return null;
    if ($r['code'] >= 400) throw new RuntimeException("Erro a ler $path: " . json_encode($r['body']));
    return $r['body']['fields'] ?? [];
}
/** O PHP lê {} vazios como [] e voltaria a escrevê-los como lista; no formato do Firestore um [] vazio é sempre {}. */
function objects($v) {
    if (!is_array($v)) return $v;
    if ($v === []) return new stdClass();
    foreach ($v as $k => $x) $v[$k] = objects($x);
    return $v;
}
function commit(array $c, array $writes): void {
    $writes = array_map('objects', $writes);
    foreach (array_chunk($writes, 400) as $chunk) {
        $r = http('POST', preg_replace('#/documents$#', '/documents:commit', $c['base']), $c['token'], ['writes' => $chunk]);
        if ($r['code'] >= 400) throw new RuntimeException('Erro a gravar: ' . json_encode($r['body']));
    }
}
function lookupEmail(array $c, string $email): ?array {
    $r = http('POST', "{$c['auth']}/accounts:lookup", $c['token'], ['email' => [$email]]);
    if ($r['code'] >= 400) throw new RuntimeException('Erro a procurar a conta: ' . json_encode($r['body']));
    return $r['body']['users'][0] ?? null;
}
function lookupUid(array $c, string $uid): ?array {
    $r = http('POST', "{$c['auth']}/accounts:lookup", $c['token'], ['localId' => [$uid]]);
    return $r['code'] < 400 ? ($r['body']['users'][0] ?? null) : null;
}

try {
    $home = getenv('HOME') ?: (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['dir'] : '');
    $sec = rtrim($home, '/') . '/pontos-secrets';
    $from = connect(getenv('FROM_SERVICE_ACCOUNT') ?: "$sec/familia-service-account.json", 'FROM_PROJECT');
    $to = connect(getenv('TO_SERVICE_ACCOUNT') ?: "$sec/service-account.json", 'TO_PROJECT');
    echo "Origem: {$from['project']}  →  Destino: {$to['project']}\n";

    // 1) Família de origem
    $families = listRaw($from, 'families');
    if (!empty($opt['from-email'])) {
        $u = lookupEmail($from, $opt['from-email']);
        if (!$u || !isset($families[$u['localId']])) throw new RuntimeException("Não há família para {$opt['from-email']} na app antiga.");
        $srcId = $u['localId'];
    } else {
        if (count($families) !== 1) {
            echo "A app antiga tem " . count($families) . " famílias. Escolhe uma com --from-email=…:\n";
            foreach (array_keys($families) as $id) echo "  - " . (lookupUid($from, $id)['email'] ?? '(sem email)') . "\n";
            exit(1);
        }
        $srcId = array_key_first($families);
    }
    $srcUser = lookupUid($from, $srcId);
    echo "Família antiga: " . ($srcUser['email'] ?? '(sem email)') . "\n";

    // 2) Conta de destino (criada antes em saskids.net com "Nova família")
    $dst = lookupEmail($to, $opt['to-email']);
    if (!$dst) throw new RuntimeException("Não existe a conta {$opt['to-email']} na SAS Kids. Cria-a primeiro em saskids.net → Nova família.");
    $dstId = $dst['localId'];
    $dstPath = "families/$dstId";

    // 3) O que há para copiar
    $famFields = $families[$srcId];
    $subs = [];
    foreach (['kids', 'tasks', 'rewards', 'log'] as $coll) $subs[$coll] = listRaw($from, "families/$srcId/$coll");
    echo "A copiar: " . implode(', ', array_map(fn($k) => count($subs[$k]) . " $k", array_keys($subs))) . "\n";
    foreach ($subs['kids'] as $kf) echo "  · " . ($kf['name']['stringValue'] ?? '?') . ': ' . ($kf['points']['integerValue'] ?? 0) . " pontos\n";

    $existing = getRaw($to, $dstPath);
    // Só uma vez: se a tarefa agendada ficar ligada, não volta a apagar e copiar por cima do que entretanto se fez.
    if (($existing['migratedFrom']['stringValue'] ?? '') === $from['project']) {
        echo "\nEsta conta já recebeu a família antiga (migração feita). Nada a fazer: podes apagar a tarefa agendada.\n";
        exit(0);
    }
    $existingSubs = [];
    foreach (['kids', 'tasks', 'rewards', 'log', 'members', 'pushTokens'] as $coll) $existingSubs[$coll] = listRaw($to, "$dstPath/$coll");
    $hasData = $existing !== null || array_sum(array_map('count', $existingSubs)) > 0;
    if ($hasData && !$REPLACE) {
        echo "\nA conta {$opt['to-email']} já tem dados na SAS Kids (" . implode(', ', array_map(fn($k) => count($existingSubs[$k]) . " $k", array_keys($existingSubs))) . ").\n"
           . "Para os apagar e pôr lá a família antiga, junta --replace.\n";
        exit(1);
    }
    if (!$GO) { echo "\nNada foi alterado (ensaio). Para copiar, junta --go" . ($hasData ? ' --replace' : '') . ".\n"; exit(0); }

    // 4) Apagar o que houver no destino (com --replace)
    $writes = [];
    foreach ($existingSubs as $coll => $docs) foreach (array_keys($docs) as $id) $writes[] = ['delete' => "projects/{$to['project']}/databases/(default)/documents/$dstPath/$coll/$id"];
    if ($writes) { commit($to, $writes); echo "Apagados " . count($writes) . " documentos que estavam na conta de destino.\n"; }

    // 5) Copiar
    $name = fn($rel) => "projects/{$to['project']}/databases/(default)/documents/$dstPath$rel";
    unset($famFields['inviteToken'], $famFields['notify']);
    $famFields['pinSalt'] = ['stringValue' => $famFields['pinSalt']['stringValue'] ?? $srcId]; // PINs continuam válidos
    $famFields['lang'] ??= ['stringValue' => 'pt'];
    $famFields['tz'] ??= ['stringValue' => 'Europe/Lisbon'];
    $famFields['migratedFrom'] = ['stringValue' => $from['project']];
    // O notificador não deve avisar de nada antigo.
    $famFields['notify'] = ['mapValue' => ['fields' => ['initialized' => ['booleanValue' => true]]]];
    $writes = [['update' => ['name' => $name(''), 'fields' => $famFields]]];
    foreach ($subs as $coll => $docs) foreach ($docs as $id => $f) {
        if ($coll === 'log') { $f['notifiedParent'] = ['booleanValue' => true]; $f['notifiedKid'] = ['booleanValue' => true]; }
        if ($coll === 'rewards') $f['notifiedParent'] = ['booleanValue' => true];
        if ($coll === 'tasks') $f['notifiedEnded'] = ['booleanValue' => true];
        $writes[] = ['update' => ['name' => $name("/$coll/$id"), 'fields' => $f]];
    }
    commit($to, $writes);
    echo "Feito: " . count($writes) . " documentos copiados para {$opt['to-email']} na SAS Kids.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Erro: ' . $e->getMessage() . "\n");
    exit(1);
}
