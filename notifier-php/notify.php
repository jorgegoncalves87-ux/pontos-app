<?php
// Notificador da app SAS Kids, em PHP, para correr no alojamento (cPanel) com uma
// tarefa agendada a cada 5 minutos. Faz o mesmo que notifier/notify.mjs:
//  - pai/mãe: tarefas marcadas, prémios pedidos e sugeridos, extras, missões feitas ou terminadas;
//  - filhos: pontos validados/rejeitados, correções, bónus, penalizações e missões;
//  - filhos, por volta das 19:45 (Lisboa): lembrete se ainda há tarefas do dia por marcar.
//
// Uso (Cron Job do cPanel):
//   php /home/UTILIZADOR/public_html/pontos.sfpo.pt/notifier-php/notify.php
// A chave da conta de serviço do Firebase fica FORA da pasta pública, em:
//   /home/UTILIZADOR/pontos-secrets/service-account.json   (ou na variável PONTOS_SERVICE_ACCOUNT)
// Exemplo de Cron Job (a cada 5 minutos):
//   /usr/local/bin/php /home/sfpo/public_html/pontos.sfpo.pt/notifier-php/notify.php >> /home/sfpo/pontos-secrets/notify.log 2>&1
// Opções: --log-only (escreve as mensagens em vez de as enviar). Para testes: FIRESTORE_EMULATOR_HOST,
// GCLOUD_PROJECT e NOTIFY_NOW (ISO 8601).

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

const TZ = 'Europe/Lisbon';
const REMINDER_START = '19:45';
const REMINDER_END = '21:30';
$APP_URL = getenv('APP_URL') ?: 'https://pontos.sfpo.pt/';
$LOG_ONLY = in_array('--log-only', $argv ?? [], true);
$NOW = getenv('NOTIFY_NOW') ? new DateTimeImmutable(getenv('NOTIFY_NOW')) : new DateTimeImmutable('now');

// ---------- Ligação ao Firebase ----------
$emulator = getenv('FIRESTORE_EMULATOR_HOST');
if ($emulator) {
    $PROJECT = getenv('GCLOUD_PROJECT') ?: 'demo-pontos';
    $BASE = "http://$emulator/v1/projects/$PROJECT/databases/(default)/documents";
    $TOKEN = 'owner'; // o emulador aceita "owner" e ignora as regras
} else {
    // A chave fica na pasta pessoal da conta (ex.: /home/sfpo/pontos-secrets), fora de qualquer pasta pública.
    $home = getenv('HOME') ?: (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['dir'] : dirname(__DIR__, 2));
    $saPath = getenv('PONTOS_SERVICE_ACCOUNT') ?: rtrim($home, '/') . '/pontos-secrets/service-account.json';
    if (!is_readable($saPath)) { fwrite(STDERR, "Sem chave da conta de serviço em $saPath: nada a fazer.\n"); exit(0); }
    $sa = json_decode(file_get_contents($saPath), true);
    $PROJECT = $sa['project_id'];
    $BASE = "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents";
    $TOKEN = accessToken($sa);
}

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

/** Token OAuth da conta de serviço (JWT assinado com RS256). */
function accessToken(array $sa): string {
    $now = time();
    $head = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = b64url(json_encode([
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
        'aud' => $sa['token_uri'], 'iat' => $now, 'exp' => $now + 3600,
    ]));
    openssl_sign("$head.$claims", $sig, $sa['private_key'], 'sha256WithRSAEncryption');
    $res = http('POST', $sa['token_uri'], http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => "$head.$claims." . b64url($sig),
    ]), ['Content-Type: application/x-www-form-urlencoded'], false);
    if (empty($res['body']['access_token'])) throw new RuntimeException('Falha a obter token: ' . json_encode($res['body']));
    return $res['body']['access_token'];
}

function http(string $method, string $url, $body = null, array $headers = [], bool $auth = true): array {
    global $TOKEN;
    $ch = curl_init($url);
    if ($auth) $headers[] = "Authorization: Bearer $TOKEN";
    if (is_array($body)) { $body = json_encode($body, JSON_UNESCAPED_UNICODE); $headers[] = 'Content-Type: application/json'; }
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 30]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($ch);
    if ($raw === false) throw new RuntimeException("Pedido falhou ($url): " . curl_error($ch));
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($raw, true)];
}

// ---------- Firestore (REST) ----------
/** Converte um valor do Firestore REST num valor PHP. */
function val(array $v) {
    if (array_key_exists('nullValue', $v)) return null;
    if (isset($v['booleanValue'])) return (bool)$v['booleanValue'];
    if (isset($v['integerValue'])) return (int)$v['integerValue'];
    if (isset($v['doubleValue'])) return (float)$v['doubleValue'];
    if (isset($v['stringValue'])) return $v['stringValue'];
    if (isset($v['timestampValue'])) return $v['timestampValue'];
    if (isset($v['arrayValue'])) return array_map('val', $v['arrayValue']['values'] ?? []);
    if (isset($v['mapValue'])) return fields($v['mapValue']['fields'] ?? []);
    return null;
}
function fields(array $f): array { $o = []; foreach ($f as $k => $v) $o[$k] = val($v); return $o; }
/** Documento → ['_name' => caminho completo, '_id' => id, ...campos]. */
function doc(array $d): array { return ['_name' => $d['name'], '_id' => basename($d['name'])] + fields($d['fields'] ?? []); }

function listDocs(string $path): array {
    global $BASE;
    $out = []; $page = '';
    do {
        $r = http('GET', "$BASE/$path?pageSize=300" . ($page ? '&pageToken=' . urlencode($page) : ''));
        if ($r['code'] >= 400) throw new RuntimeException("Erro a listar $path: " . json_encode($r['body']));
        foreach ($r['body']['documents'] ?? [] as $d) $out[] = doc($d);
        $page = $r['body']['nextPageToken'] ?? '';
    } while ($page);
    return $out;
}

/** Documentos da subcoleção $coll de $parent com um filtro simples (campo, operador, valor tipado). */
function query(string $parent, string $coll, string $field, string $op, array $value): array {
    global $BASE;
    $r = http('POST', "$BASE/$parent:runQuery", ['structuredQuery' => [
        'from' => [['collectionId' => $coll]],
        'where' => ['fieldFilter' => ['field' => ['fieldPath' => $field], 'op' => $op, 'value' => $value]],
    ]]);
    if ($r['code'] >= 400) throw new RuntimeException("Erro na consulta $coll: " . json_encode($r['body']));
    $out = [];
    foreach ($r['body'] as $row) if (isset($row['document'])) $out[] = doc($row['document']);
    return $out;
}

/** Atualiza campos (booleanos/strings) em vários documentos de uma vez. */
function updateMany(array $updates): void {
    global $BASE, $PROJECT;
    foreach (array_chunk($updates, 400) as $chunk) {
        $writes = [];
        foreach ($chunk as [$name, $data]) {
            $f = [];
            foreach ($data as $k => $v) {
                $typed = is_bool($v) ? ['booleanValue' => $v] : ['stringValue' => (string)$v];
                // "notify.initialized" → campo "initialized" dentro do mapa "notify".
                if (str_contains($k, '.')) { [$a, $b] = explode('.', $k, 2); $f[$a]['mapValue']['fields'][$b] = $typed; }
                else $f[$k] = $typed;
            }
            $writes[] = ['update' => ['name' => $name, 'fields' => $f], 'updateMask' => ['fieldPaths' => array_keys($data)]];
        }
        $r = http('POST', preg_replace('#/documents$#', '/documents:commit', $BASE), ['writes' => $writes]);
        if ($r['code'] >= 400) throw new RuntimeException('Erro a gravar: ' . json_encode($r['body']));
    }
}

// ---------- Envio ----------
function send(array $fam, array $tokenDocs, string $title, string $body, string $tag): void {
    global $LOG_ONLY, $PROJECT, $APP_URL, $BASE;
    $tokens = array_values(array_unique(array_filter(array_column($tokenDocs, 'token'))));
    if (!$tokens) return;
    echo "[{$fam['_id']}] → " . count($tokens) . " aparelho(s): $title — " . str_replace("\n", ' / ', $body) . "\n";
    if ($LOG_ONLY) return;
    foreach ($tokens as $t) {
        $r = http('POST', "https://fcm.googleapis.com/v1/projects/$PROJECT/messages:send", ['message' => [
            'token' => $t,
            'data' => ['title' => $title, 'body' => $body, 'tag' => $tag, 'link' => $APP_URL],
            'webpush' => ['headers' => ['Urgency' => 'high', 'TTL' => '86400']],
        ]]);
        if ($r['code'] < 400) continue;
        $status = $r['body']['error']['status'] ?? '';
        echo "  falhou ($status)\n";
        // Aparelho que já não aceita notificações: apaga o registo.
        if (in_array($status, ['NOT_FOUND', 'INVALID_ARGUMENT', 'UNREGISTERED'], true)) {
            foreach ($tokenDocs as $d) if (($d['token'] ?? '') === $t) {
                $rel = substr($d['_name'], strpos($d['_name'], '/documents/') + 11);
                http('DELETE', "$BASE/$rel");
            }
        }
    }
}

function plural(int $n, string $one, string $many): string { return "$n " . ($n === 1 ? $one : $many); }
function signed(int $n): string { return $n > 0 ? "+$n" : '−' . abs($n); }
function pts(array $e): int { return (int)($e['applied'] ?? $e['points'] ?? 0); }
function forKid(array $t, string $kidId): bool { return empty($t['kidIds']) || in_array($kidId, $t['kidIds'], true); }

// ---------- Uma família ----------
function processFamily(array $fam): void {
    global $NOW;
    $path = 'families/' . $fam['_id'];
    $notify = $fam['notify'] ?? [];
    $firstRun = empty($notify['initialized']);
    $kids = []; foreach (listDocs("$path/kids") as $k) $kids[$k['_id']] = $k;
    $tokens = listDocs("$path/pushTokens");
    $tasks = listDocs("$path/tasks");
    $parentTokens = array_filter($tokens, fn($t) => ($t['parent'] ?? false) === true);
    $kidTokens = fn($id) => array_filter($tokens, fn($t) => in_array($id, $t['kids'] ?? [], true));
    $kidName = fn($id) => $kids[$id]['name'] ?? 'Um filho';
    $lis = $NOW->setTimezone(new DateTimeZone(TZ));
    $date = $lis->format('Y-m-d'); $time = $lis->format('H:i');

    // 1) Pai/mãe: novos pedidos à espera de validação.
    $newPending = array_filter(query($path, 'log', 'status', 'EQUAL', ['stringValue' => 'pending']), fn($d) => empty($d['notifiedParent']));
    $newSugg = array_filter(query($path, 'rewards', 'status', 'EQUAL', ['stringValue' => 'suggested']), fn($d) => empty($d['notifiedParent']));
    if (!$firstRun && ($newPending || $newSugg)) {
        $byKid = [];
        foreach ($newPending as $e) {
            $k = &$byKid[$e['kidId']];
            $k ??= ['tasks' => 0, 'rewards' => [], 'extras' => [], 'specials' => []];
            match ($e['type'] ?? '') { 'reward' => $k['rewards'][] = $e['title'], 'extra' => $k['extras'][] = $e['title'], 'special' => $k['specials'][] = $e['title'], default => $k['tasks']++ };
            unset($k);
        }
        $lines = [];
        foreach ($byKid as $kidId => $k) {
            $parts = [];
            if ($k['tasks']) $parts[] = 'marcou ' . plural($k['tasks'], 'tarefa', 'tarefas');
            if ($k['rewards']) $parts[] = 'pediu ' . (count($k['rewards']) === 1 ? "o prémio \"{$k['rewards'][0]}\"" : count($k['rewards']) . ' prémios');
            if ($k['specials']) $parts[] = 'diz que já cumpriu a missão ' . implode(', ', array_map(fn($t) => "\"$t\"", $k['specials']));
            if ($k['extras']) $parts[] = 'pede pontos por ' . (count($k['extras']) === 1 ? "\"{$k['extras'][0]}\"" : count($k['extras']) . ' coisas fora da lista');
            $lines[] = $kidName($kidId) . ' ' . implode(' e ', $parts);
        }
        foreach ($newSugg as $r) $lines[] = $kidName($r['suggestedBy'] ?? '') . " sugeriu o prémio \"{$r['title']}\"";
        $hasReward = (bool)array_filter($byKid, fn($k) => $k['rewards']);
        send($fam, $parentTokens, $hasReward ? '🎁 Pedido de prémio para validar' : '✔️ Há coisas para validar', implode("\n", $lines), 'validar');
    }
    updateMany(array_map(fn($d) => [$d['_name'], ['notifiedParent' => true]], array_merge(array_values($newPending), array_values($newSugg))));

    // 1b) Pai/mãe: missões cujo prazo acabou e ainda não foram decididas.
    $specials = array_filter($tasks, fn($t) => ($t['active'] ?? true) !== false && !empty($t['special']) && !empty($t['deadline']));
    $ended = array_filter($specials, fn($t) => $t['deadline'] < $date && empty($t['notifiedEnded']));
    $specialLog = null;
    if ($ended) {
        $specialLog = query($path, 'log', 'type', 'EQUAL', ['stringValue' => 'special']);
        $decided = [];
        foreach ($specialLog as $d) if (($d['status'] ?? '') !== 'pending') $decided["{$d['kidId']}|{$d['taskId']}"] = true;
        $lines = [];
        foreach ($ended as $t) {
            $who = array_filter(array_keys($kids), fn($id) => forKid($t, $id) && empty($decided["$id|{$t['_id']}"]));
            if ($who) $lines[] = "\"{$t['title']}\" (" . implode(', ', array_map($kidName, $who)) . ')';
        }
        if (!$firstRun && $lines) send($fam, $parentTokens, '🚀 Missão terminou', "Decide se ganharam os pontos:\n" . implode("\n", $lines), 'especial');
        updateMany(array_map(fn($t) => [$t['_name'], ['notifiedEnded' => true]], array_values($ended)));
    }

    // 2) Filhos: pontos validados (ou rejeitados), correções, bónus e penalizações dos últimos 3 dias.
    $since = $NOW->modify('-3 days')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    $newDecided = array_filter(query($path, 'log', 'decidedAt', 'GREATER_THAN_OR_EQUAL', ['timestampValue' => $since]),
        fn($d) => empty($d['notifiedKid']) && in_array($d['status'] ?? '', ['approved', 'rejected'], true));
    if (!$firstRun) {
        $byKid = [];
        foreach ($newDecided as $e) $byKid[$e['kidId']][] = $e;
        foreach ($byKid as $kidId => $entries) {
            if (!isset($kids[$kidId])) continue;
            $lines = [];
            foreach ($entries as $e) if (!empty($e['corrected'])) $lines[] = "✏️ Corrigido: {$e['title']} → " . signed(pts($e)) . ' pontos';
            $entries = array_filter($entries, fn($e) => empty($e['corrected']));
            $of = fn($type, $status = null) => array_filter($entries, fn($e) => ($e['type'] ?? '') === $type && ($status === null || $e['status'] === $status));
            if ($ok = $of('task', 'approved')) $lines[] = '✅ ' . plural(count($ok), 'tarefa validada', 'tarefas validadas') . ': ' . signed(array_sum(array_map('pts', $ok))) . ' pontos';
            if ($no = $of('task', 'rejected')) $lines[] = '✕ ' . plural(count($no), 'tarefa não foi aceite', 'tarefas não foram aceites');
            foreach ($of('special') as $e) $lines[] = $e['status'] === 'approved' ? "🚀 Missão cumprida \"{$e['title']}\": " . signed(pts($e)) . ' pontos!' : "🚀 Missão \"{$e['title']}\": desta vez não.";
            foreach ($of('extra') as $e) $lines[] = $e['status'] === 'approved' ? "💡 {$e['title']}: " . signed(pts($e)) . ' pontos' : "💡 Sem pontos para: {$e['title']}";
            foreach ($of('bonus') as $e) $lines[] = '🌟 Bónus ' . signed(pts($e)) . ": {$e['title']}";
            foreach ($of('penalty') as $e) $lines[] = '⚠️ ' . signed(pts($e)) . ": {$e['title']}";
            foreach ($of('reward') as $e) $lines[] = $e['status'] === 'approved' ? "🎁 Prémio aprovado: {$e['title']}!" : "🎁 Prémio não aprovado: {$e['title']}";
            if (!$lines) continue;
            $lines[] = 'Tens agora ' . (int)($kids[$kidId]['points'] ?? 0) . ' pontos ⭐';
            send($fam, $kidTokens($kidId), "{$kids[$kidId]['name']}, os teus pontos mudaram!", implode("\n", $lines), "pontos-$kidId");
        }
    }
    updateMany(array_map(fn($d) => [$d['_name'], ['notifiedKid' => true]], array_values($newDecided)));

    // 3) Filhos: lembrete das 19:45 se ainda há tarefas de hoje por marcar ou missões a acabar.
    if ($time >= REMINDER_START && $time <= REMINDER_END && ($notify['lastReminderDate'] ?? '') !== $date) {
        $marked = [];
        foreach (query($path, 'log', 'date', 'EQUAL', ['stringValue' => $date]) as $d) if (($d['type'] ?? '') === 'task') $marked["{$d['kidId']}|{$d['taskId']}"] = true;
        $claimed = [];
        foreach ($specialLog ?? query($path, 'log', 'type', 'EQUAL', ['stringValue' => 'special']) as $d) $claimed["{$d['kidId']}|{$d['taskId']}"] = true;
        $recurring = array_filter($tasks, fn($t) => ($t['active'] ?? true) !== false && !empty($t['recurring']) && empty($t['special']));
        $tom = $lis->modify('+1 day')->format('Y-m-d');
        foreach ($kids as $kidId => $kid) {
            $left = count(array_filter($recurring, fn($t) => forKid($t, $kidId) && empty($marked["$kidId|{$t['_id']}"])));
            $soon = array_filter($specials, fn($t) => in_array($t['deadline'], [$date, $tom], true) && forKid($t, $kidId) && empty($claimed["$kidId|{$t['_id']}"]));
            if (!$left && !$soon) continue;
            $lines = [];
            if ($left) $lines[] = $left === 1 ? 'Falta 1 tarefa de hoje. Já a fizeste? Marca-a na app antes de dormir.'
                : "Faltam $left tarefas de hoje. Já as fizeste? Marca-as na app antes de dormir.";
            foreach ($soon as $t) $lines[] = "🚀 A missão \"{$t['title']}\" acaba " . ($t['deadline'] === $date ? 'hoje' : 'amanhã') . '!';
            send($fam, $kidTokens($kidId), "⏰ {$kid['name']}, ainda tens tarefas!", implode("\n", $lines), "lembrete-$kidId");
        }
        updateMany([[$fam['_name'], ['notify.lastReminderDate' => $date]]]);
    }

    if ($firstRun) updateMany([[$fam['_name'], ['notify.initialized' => true]]]);
}

// ---------- Todas as famílias ----------
$failed = 0;
$families = listDocs('families');
foreach ($families as $fam) {
    try { processFamily($fam); } catch (Throwable $e) { $failed++; fwrite(STDERR, "[{$fam['_id']}] erro: " . $e->getMessage() . "\n"); }
}
echo 'Feito: ' . count($families) . ' família(s)' . ($failed ? ", $failed com erro" : '') . ".\n";
exit($failed ? 1 : 0);
