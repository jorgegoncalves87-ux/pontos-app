<?php
// Envia os emails da SAS Kids com o nosso desenho: confirmar o email e repor a password.
// A Firebase gera o código seguro (accounts:sendOobCode com returnOobLink) e este script envia-o num
// email nosso, com um link para https://saskids.net/auth.html, onde o código é usado.
//
// POST JSON: { "action": "verify", "idToken": "...", "lang": "pt" }
//            { "action": "reset",  "email": "...",  "lang": "pt" }
// Responde sempre {"ok": true} a pedidos válidos (no "reset" não revela se o email existe).
// Limites: 5 emails por hora para o mesmo endereço, 30 por hora para o mesmo IP.

require __DIR__ . '/mail-templates.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$reply = function (int $code, array $body) { http_response_code($code); echo json_encode($body); exit; };

if ($_SERVER['REQUEST_METHOD'] !== 'POST') $reply(405, ['error' => 'method']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_filter(array_map('trim', explode(',', getenv('MAIL_ALLOWED_ORIGINS') ?: 'https://saskids.net')));
if ($origin && !in_array($origin, $allowed, true)) $reply(403, ['error' => 'origin']);
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $in['action'] ?? '';
$lang = in_array($in['lang'] ?? '', ['pt', 'es', 'fr', 'it', 'en', 'zh'], true) ? $in['lang'] : 'en';
$SITE = getenv('SITE_URL') ?: 'https://saskids.net/';

// ---------- Ligação à Firebase ----------
$home = function_exists('posix_getpwuid') ? (posix_getpwuid(posix_geteuid())['dir'] ?? '') : '';
if (!$home && preg_match('#^/home\d*/[^/]+#', __DIR__, $m)) $home = $m[0];
$SECRETS = getenv('SECRETS_DIR') ?: rtrim($home, '/') . '/pontos-secrets';
$emu = getenv('FIREBASE_AUTH_EMULATOR_HOST');
preg_match('/apiKey:\s*"([^"]+)"/', (string)@file_get_contents(__DIR__ . '/../firebase-config.js'), $km);
$API_KEY = $emu ? 'demo' : ($km[1] ?? '');

function post(string $url, array $body, ?string $token = null): array {
    $ch = curl_init($url);
    $h = ['Content-Type: application/json'];
    if ($token) $h[] = "Authorization: Bearer $token";
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => $h, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20]);
    $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    return ['code' => $code, 'body' => json_decode((string)$raw, true) ?: []];
}
function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function adminToken(string $secrets, ?string $emu): array {
    if ($emu) return ['owner', getenv('GCLOUD_PROJECT') ?: 'demo-pontos'];
    $sa = json_decode((string)@file_get_contents("$secrets/service-account.json"), true);
    if (!$sa) throw new RuntimeException('sem chave');
    $now = time();
    $head = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = b64url(json_encode(['iss' => $sa['client_email'], 'aud' => $sa['token_uri'], 'iat' => $now, 'exp' => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/identitytoolkit']));
    openssl_sign("$head.$claims", $sig, $sa['private_key'], 'sha256WithRSAEncryption');
    $ch = curl_init($sa['token_uri']);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => "$head.$claims." . b64url($sig)])]);
    $r = json_decode((string)curl_exec($ch), true); curl_close($ch);
    if (empty($r['access_token'])) throw new RuntimeException('token');
    return [$r['access_token'], $sa['project_id']];
}
$IDT = $emu ? "http://$emu/identitytoolkit.googleapis.com/v1" : 'https://identitytoolkit.googleapis.com/v1';

/** Limite simples por chave (email ou IP): no máximo $max envios na última hora. */
function allow(string $secrets, string $key, int $max): bool {
    $f = "$secrets/mail-rate.json";
    $fp = @fopen($f, 'c+'); if (!$fp) return true;
    flock($fp, LOCK_EX);
    $data = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
    $now = time();
    foreach ($data as $k => $ts) { $data[$k] = array_values(array_filter($ts, fn($t) => $t > $now - 3600)); if (!$data[$k]) unset($data[$k]); }
    $ok = count($data[$key] ?? []) < $max;
    if ($ok) $data[$key][] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($data)); fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    @chmod($f, 0600);
    return $ok;
}

function sendMail(string $to, array $mail, string $secrets): bool {
    [$subject, $html, $text] = $mail;
    if ($dir = getenv('MAIL_DIR')) { file_put_contents("$dir/" . time() . '-' . preg_replace('/\W/', '_', $to) . '.html', $html); return true; }
    $b = 'sk' . bin2hex(random_bytes(8));
    $headers = "From: SAS Kids <noreply@saskids.net>\r\nReply-To: privacidade@saskids.net\r\nMIME-Version: 1.0\r\n"
        . "Content-Type: multipart/alternative; boundary=\"$b\"\r\n";
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";
    return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f noreply@saskids.net');
}

try {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    if (!allow($SECRETS, 'ip:' . $ip, 30)) $reply(429, ['error' => 'too-many']);
    [$token, $project] = adminToken($SECRETS, $emu);

    if ($action === 'verify') {
        $idToken = (string)($in['idToken'] ?? '');
        // Quem pede é quem tem sessão iniciada: a Firebase confirma o idToken e diz-nos o email.
        $u = post("$IDT/accounts:lookup?key=$API_KEY", ['idToken' => $idToken])['body']['users'][0] ?? null;
        if (!$u || empty($u['email'])) $reply(401, ['error' => 'session']);
        if (!empty($u['emailVerified'])) $reply(200, ['ok' => true, 'already' => true]);
        $email = $u['email'];
        $type = 'VERIFY_EMAIL'; $mode = 'verifyEmail'; $kind = 'verify';
    } elseif ($action === 'reset') {
        $email = strtolower(trim((string)($in['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $reply(400, ['error' => 'email']);
        $type = 'PASSWORD_RESET'; $mode = 'resetPassword'; $kind = 'reset';
    } else {
        $reply(400, ['error' => 'action']);
    }
    if (!allow($SECRETS, 'mail:' . hash('sha256', $email), 5)) $reply(429, ['error' => 'too-many']);

    $r = post("$IDT/projects/$project/accounts:sendOobCode", ['requestType' => $type, 'email' => $email, 'returnOobLink' => true], $token);
    if (empty($r['body']['oobLink'])) {
        // No "reset" não dizemos se a conta existe.
        if ($kind === 'reset' && str_contains(json_encode($r['body']), 'EMAIL_NOT_FOUND')) $reply(200, ['ok' => true]);
        error_log('SAS Kids mail: ' . json_encode($r['body']));
        $reply(502, ['error' => 'firebase']);
    }
    parse_str((string)parse_url($r['body']['oobLink'], PHP_URL_QUERY), $q);
    if (empty($q['oobCode'])) $reply(502, ['error' => 'code']);
    $link = $SITE . 'auth.html?' . http_build_query(['mode' => $mode, 'oobCode' => $q['oobCode'], 'lang' => $lang]);
    if (!sendMail($email, renderMail($kind, $lang, $link, $email, $SITE), $SECRETS)) $reply(502, ['error' => 'mail']);
    $reply(200, ['ok' => true]);
} catch (Throwable $e) {
    error_log('SAS Kids mail: ' . $e->getMessage());
    $reply(500, ['error' => 'server']);
}
