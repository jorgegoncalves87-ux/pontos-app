<?php
// Publicador do Instagram da SAS Kids (@saskidsapp), para correr no alojamento (cPanel) com uma
// tarefa agendada a cada 15 minutos. Lê a fila em social/queue.json e publica, um de cada vez,
// os posts cuja hora (de Lisboa) já chegou. As imagens são servidas pelo próprio site
// (https://saskids.net/social/...), que é de onde a Meta as vai buscar.
//
// O acesso à conta fica FORA da pasta pública, em /home/UTILIZADOR/pontos-secrets/instagram.json
// (permissões 600). Na primeira vez basta lá pôr {"user_token": "..."} (token de utilizador de
// longa duração, com instagram_basic, instagram_content_publish, pages_show_list e
// pages_read_engagement): o script troca-o pelo token da Página, que não expira, guarda-o e apaga
// o token de utilizador. O que já foi publicado fica em pontos-secrets/instagram-state.json.
//
// Cron Job (a cada 15 minutos):
//   /usr/local/bin/php /home/sfpo/public_html/pontos.sfpo.pt/notifier-php/instagram.php >> /home/sfpo/pontos-secrets/instagram.log 2>&1
// Opções: --check (confirma a ligação e mostra a fila, sem publicar), --dry (mostra o que publicaria).
// Para testes: IG_GRAPH_BASE (servidor falso), IG_SECRETS_DIR, IG_NOW (ISO 8601), IG_POLL_SECONDS.

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

const TZ = 'Europe/Lisbon';
const USERNAME = 'saskidsapp';      // a conta onde se publica (evita publicar numa Página errada)
const MAX_ATTEMPTS = 3;             // depois de 3 falhas, um post deixa de ser tentado (fica no registo)
$SITE = rtrim(getenv('SITE_URL') ?: 'https://saskids.net', '/');
$GRAPH = rtrim(getenv('IG_GRAPH_BASE') ?: 'https://graph.facebook.com/v23.0', '/');
$CHECK = in_array('--check', $argv ?? [], true);
$DRY = in_array('--dry', $argv ?? [], true);
$NOW = new DateTimeImmutable(getenv('IG_NOW') ?: 'now', new DateTimeZone(TZ));
$home = getenv('HOME') ?: (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['dir'] : dirname(__DIR__, 2));
$SECRETS = rtrim(getenv('IG_SECRETS_DIR') ?: rtrim($home, '/') . '/pontos-secrets', '/');
$CONF_FILE = "$SECRETS/instagram.json";
$STATE_FILE = "$SECRETS/instagram-state.json";

function out(string $msg): void { global $NOW; echo $NOW->format('Y-m-d H:i') . " $msg\n"; }

/** Pedido à Graph API. Devolve o JSON; lança erro com a mensagem da Meta. */
function graph(string $method, string $path, array $params): array {
    global $GRAPH;
    $url = "$GRAPH/" . ltrim($path, '/');
    $ch = curl_init($method === 'GET' ? $url . '?' . http_build_query($params) : $url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    if ($method === 'POST') curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params)]);
    $raw = curl_exec($ch);
    if ($raw === false) throw new RuntimeException('Sem ligação à Meta: ' . curl_error($ch));
    curl_close($ch);
    $body = json_decode($raw, true) ?: [];
    if (isset($body['error'])) throw new RuntimeException('Meta: ' . ($body['error']['message'] ?? json_encode($body['error'])));
    return $body;
}

function saveJson(string $file, array $data): void {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($file, 0600);
}

// ---------- Acesso à conta ----------
if (!is_readable($CONF_FILE)) { out("Sem $CONF_FILE: nada a fazer."); exit(0); }
$conf = json_decode(file_get_contents($CONF_FILE), true) ?: [];

// Primeira vez: troca o token de utilizador pelo token da Página ligada a @saskidsapp.
if (empty($conf['page_token']) && !empty($conf['user_token'])) {
    try {
        $pages = graph('GET', 'me/accounts', ['fields' => 'name,access_token,instagram_business_account{id,username}', 'access_token' => $conf['user_token']])['data'] ?? [];
    } catch (Throwable $e) { out('Token de utilizador recusado. ' . $e->getMessage()); exit(1); }
    $found = null;
    foreach ($pages as $p) if (strcasecmp($p['instagram_business_account']['username'] ?? '', USERNAME) === 0) $found = $p;
    if (!$found) {
        $seen = array_map(fn($p) => ($p['name'] ?? '?') . ' → ' . ($p['instagram_business_account']['username'] ?? 'sem Instagram'), $pages);
        out('Nenhuma Página ligada a @' . USERNAME . '. Encontrei: ' . ($seen ? implode('; ', $seen) : 'nenhuma Página'));
        exit(1);
    }
    $conf = ['page_id' => $found['id'], 'page_name' => $found['name'], 'ig_user_id' => $found['instagram_business_account']['id'],
        'username' => $found['instagram_business_account']['username'], 'page_token' => $found['access_token']];
    saveJson($CONF_FILE, $conf);
    out("Ligado a @{$conf['username']} (Página \"{$conf['page_name']}\"). O token de utilizador foi apagado do ficheiro.");
}
if (empty($conf['page_token']) || empty($conf['ig_user_id'])) { out("$CONF_FILE incompleto: falta user_token ou page_token/ig_user_id."); exit(1); }

// ---------- Fila ----------
$queue = json_decode((string)@file_get_contents(dirname(__DIR__) . '/social/queue.json'), true)['posts'] ?? [];
$state = is_readable($STATE_FILE) ? (json_decode(file_get_contents($STATE_FILE), true) ?: []) : [];
$done = fn($p) => !empty($state[$p['id']]['media_id']);
$failed = fn($p) => ($state[$p['id']]['attempts'] ?? 0) >= MAX_ATTEMPTS;
$atOf = fn($p) => new DateTimeImmutable($p['at'], new DateTimeZone(TZ));
$pending = array_values(array_filter($queue, fn($p) => !$done($p) && !$failed($p)));
usort($pending, fn($a, $b) => $atOf($a) <=> $atOf($b));

if ($CHECK) {
    $me = graph('GET', $conf['ig_user_id'], ['fields' => 'username,media_count', 'access_token' => $conf['page_token']]);
    out("Ligação OK: @{$me['username']}, {$me['media_count']} publicações.");
    out(count($pending) . ' por publicar' . ($pending ? '; a seguinte: ' . $pending[0]['id'] . ' em ' . $pending[0]['at'] : '') . '.');
    foreach ($queue as $p) if ($failed($p)) out("Parado depois de " . MAX_ATTEMPTS . " falhas: {$p['id']} ({$state[$p['id']]['error']})");
    exit(0);
}

$due = array_values(array_filter($pending, fn($p) => $atOf($p) <= $NOW));
if (!$due) exit(0); // nada para já (silencioso, para o registo não crescer a cada 15 minutos)

// Um post por execução, e nunca duas execuções ao mesmo tempo.
$lock = fopen("$SECRETS/instagram.lock", 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) exit(0);

$p = $due[0];
$imageUrl = $SITE . '/' . ltrim($p['image'], '/');
if ($DRY) { out("[dry] publicaria {$p['id']} ($imageUrl)."); exit(0); }

$token = $conf['page_token'];
try {
    $container = graph('POST', "{$conf['ig_user_id']}/media", ['image_url' => $imageUrl, 'caption' => $p['caption'], 'access_token' => $token])['id'];
    // A Meta descarrega e processa a imagem antes de deixar publicar.
    $status = '';
    $deadline = time() + (int)(getenv('IG_POLL_SECONDS') ?: 90);
    do {
        $status = graph('GET', $container, ['fields' => 'status_code', 'access_token' => $token])['status_code'] ?? '';
        if ($status === 'FINISHED' || $status === 'ERROR') break;
        sleep(getenv('IG_POLL_SECONDS') ? 0 : 5);
    } while (time() < $deadline);
    if ($status !== 'FINISHED') throw new RuntimeException("a imagem não ficou pronta (estado: " . ($status ?: '?') . ")");
    $media = graph('POST', "{$conf['ig_user_id']}/media_publish", ['creation_id' => $container, 'access_token' => $token])['id'];
    $state[$p['id']] = ['media_id' => $media, 'published_at' => $NOW->format(DATE_ATOM)];
    saveJson($STATE_FILE, $state);
    out("Publicado {$p['id']} (media $media).");
} catch (Throwable $e) {
    $n = ($state[$p['id']]['attempts'] ?? 0) + 1;
    $state[$p['id']] = ['attempts' => $n, 'error' => $e->getMessage(), 'last_try' => $NOW->format(DATE_ATOM)];
    saveJson($STATE_FILE, $state);
    out("Falhou {$p['id']} (tentativa $n de " . MAX_ATTEMPTS . "): " . $e->getMessage());
    exit(1);
}
