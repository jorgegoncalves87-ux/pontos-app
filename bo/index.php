<?php
// Backoffice da SAS Kids: números do negócio (inscrições, filhos, idades, línguas, atividade).
// Lê as estatísticas que o notificador calcula de hora a hora (pontos-secrets/stats.json, fora do site).
// Não tem acesso ao Firebase nem mostra nomes, fotos, emails ou textos das famílias.
// A pasta tem de estar protegida com password no cPanel ("Privacidade de diretórios"); sem isso não mostra nada.
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

$user = $_SERVER['REMOTE_USER'] ?? $_SERVER['REDIRECT_REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? '';
$home = function_exists('posix_getpwuid') ? (posix_getpwuid(posix_geteuid())['dir'] ?? '') : '';
if (!$home && preg_match('#^/home\d*/[^/]+#', __DIR__, $m)) $home = $m[0];
$file = getenv('STATS_FILE') ?: rtrim($home, '/') . '/pontos-secrets/stats.json';
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');

function page(string $title, string $body): void {
    echo '<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<meta name="robots" content="noindex, nofollow"><title>' . htmlspecialchars($title) . '</title><link rel="icon" href="../icons/icon-192.png">'
       . '<style>' . CSS . '</style></head><body><header><img src="../illustrations/logo-icon.svg" alt=""><b>SAS Kids</b><span>Backoffice</span></header><main>'
       . $body . '</main></body></html>';
}
const CSS = <<<'CSS'
:root { --ink:#2f3657; --muted:#646b8a; --line:#ece9f5; --teal:#13878a; --teal2:#1fa5a8; --mint:#d8f3e8; --bg:#fffdf8; }
* { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.45 ui-rounded,"SF Pro Rounded","Nunito","Segoe UI",system-ui,sans-serif; }
header { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line); background:#fff; position:sticky; top:0; }
header img { width:30px; height:30px; } header b { color:var(--teal); font-size:1.1rem; } header span { color:var(--muted); font-weight:600; }
main { max-width:1100px; margin:0 auto; padding:20px 16px 48px; }
h1 { font-size:1.5rem; margin:0 0 2px; } h2 { font-size:1.05rem; margin:0 0 12px; } .muted { color:var(--muted); } .small { font-size:.85rem; }
.tiles { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin:18px 0; }
.tile { background:#fff; border:2px solid #f1eee6; border-radius:18px; padding:14px 16px; }
.tile .v { font-size:1.9rem; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; } .tile .l { color:var(--muted); font-size:.88rem; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; } @media (max-width:760px) { .grid { grid-template-columns:1fr; } }
.card { background:#fff; border:2px solid #f1eee6; border-radius:18px; padding:16px; margin-bottom:14px; min-width:0; }
.cols { display:flex; align-items:flex-end; gap:2px; height:150px; border-bottom:1px solid #d9d6e6; }
.cols .c { flex:1; display:flex; flex-direction:column; justify-content:flex-end; height:100%; position:relative; }
.cols .c i { display:block; background:var(--teal2); border-radius:4px 4px 0 0; min-height:0; }
.cols .c:hover i { background:var(--teal); } .cols .c .n { font-size:.7rem; text-align:center; color:var(--muted); font-variant-numeric:tabular-nums; }
.axis { display:flex; gap:2px; font-size:.7rem; color:var(--muted); } .axis span { flex:1; text-align:left; white-space:nowrap; overflow:visible; }
.bars { display:grid; grid-template-columns:auto 1fr auto; gap:6px 10px; align-items:center; }
.bars .t { height:14px; background:#f3f1f9; border-radius:4px; overflow:hidden; } .bars .t i { display:block; height:100%; background:var(--teal2); border-radius:0 4px 4px 0; }
.bars .k { font-size:.9rem; white-space:nowrap; } .bars .x { font-size:.85rem; color:var(--muted); font-variant-numeric:tabular-nums; text-align:right; }
.tbl { overflow-x:auto; } table { width:100%; border-collapse:collapse; font-size:.88rem; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); white-space:nowrap; } th { color:var(--muted); font-weight:600; background:#faf9fd; }
.yes { color:#1d8a4f; font-weight:700; } .warn { background:#fff3c4; border-radius:14px; padding:14px 16px; }
code { background:#f3f1f9; padding:1px 6px; border-radius:6px; }
CSS;

if ($user === '') {
    http_response_code(403);
    page('Backoffice protegido', '<div class="warn"><h1>Falta proteger esta página</h1><p>Por segurança, o backoffice só mostra números depois de a pasta ter password.</p>'
        . '<p>No cPanel: <b>Privacidade de diretórios</b> (Directory Privacy) → pasta <code>public_html/pontos.sfpo.pt/bo</code> → marca <b>Proteger este diretório com uma senha</b> → cria um utilizador e uma senha.</p></div>');
    exit;
}
$data = is_readable($file) ? json_decode(file_get_contents($file), true) : null;
if (!$data) {
    page('Backoffice', '<h1>Ainda sem números</h1><p class="muted">As estatísticas são calculadas pelo notificador (Cron Job) uma vez por hora. Volta daqui a 5 minutos.</p>');
    exit;
}

$fams = $data['families'] ?? [];
$now = new DateTimeImmutable('now', new DateTimeZone('Europe/Lisbon'));
$days = fn($iso) => $iso ? (int)floor(($now->getTimestamp() - strtotime($iso)) / 86400) : null;
$ages = array_merge(...array_map(fn($f) => $f['kidAges'] ?? [], $fams ?: [[]]));
$kidsTotal = count($ages);
$withAge = array_values(array_filter($ages, fn($a) => $a !== null));
$new = fn($n) => count(array_filter($fams, fn($f) => ($d = $days($f['createdAt'] ?? null)) !== null && $d < $n));
$active7 = count(array_filter($fams, fn($f) => ($f['log7'] ?? 0) > 0));
$withPush = count(array_filter($fams, fn($f) => !empty($f['pushParent']) || ($f['pushKids'] ?? 0) > 0));
$withKids = count(array_filter($fams, fn($f) => !empty($f['kidAges'])));
$nF = count($fams);
$pct = fn($a, $b) => $b ? round(100 * $a / $b) . '%' : '—';

$tile = fn($v, $l) => "<div class=\"tile\"><div class=\"v\">$v</div><div class=\"l\">$l</div></div>";
$body = '<h1>Resumo</h1><p class="muted small">Atualizado: ' . $h((new DateTimeImmutable($data['generatedAt']))->setTimezone(new DateTimeZone('Europe/Lisbon'))->format('d/m/Y H:i'))
    . ' · recalculado de hora a hora · só números, sem dados pessoais</p><div class="tiles">'
    . $tile($nF, 'Famílias inscritas') . $tile($new(7), 'Novas nos últimos 7 dias') . $tile($new(30), 'Novas nos últimos 30 dias')
    . $tile($kidsTotal, 'Filhos') . $tile($withKids ? number_format($kidsTotal / $withKids, 1, ',', '') : '—', 'Filhos por família (com filhos)')
    . $tile($withAge ? number_format(array_sum($withAge) / count($withAge), 1, ',', '') : '—', 'Idade média')
    . $tile($active7 . ' <span class="small muted">(' . $pct($active7, $nF) . ')</span>', 'Famílias ativas (7 dias)')
    . $tile($withPush . ' <span class="small muted">(' . $pct($withPush, $nF) . ')</span>', 'Com notificações ligadas')
    . $tile(array_sum(array_column($fams, 'kidDevices')), 'Aparelhos de filhos ligados')
    . $tile(array_sum(array_column($fams, 'log7')), 'Registos nos últimos 7 dias') . '</div>';

// Inscrições por dia (últimos 30 dias)
$byDay = [];
for ($i = 29; $i >= 0; $i--) $byDay[$now->modify("-$i days")->format('Y-m-d')] = 0;
foreach ($fams as $f) if (!empty($f['createdAt'])) { $d = (new DateTimeImmutable($f['createdAt']))->setTimezone(new DateTimeZone('Europe/Lisbon'))->format('Y-m-d'); if (isset($byDay[$d])) $byDay[$d]++; }
$cols = function (array $series, callable $label, string $unit) use ($h) {
    $max = max(1, ...array_values($series));
    $out = '<div class="cols" role="img" aria-label="' . $h(implode(', ', array_map(fn($k, $v) => $label($k) . ": $v", array_keys($series), $series))) . '">';
    foreach ($series as $k => $v) $out .= '<div class="c" title="' . $h($label($k) . ": $v $unit") . '">' . ($v ? "<span class=\"n\">$v</span>" : '') . '<i style="height:' . round(100 * $v / $max) . '%"></i></div>';
    $out .= '</div><div class="axis">';
    $i = 0; foreach ($series as $k => $v) $out .= '<span>' . ($i++ % max(1, intdiv(count($series), 6)) === 0 ? $h($label($k)) : '') . '</span>';
    return $out . '</div>';
};
$ageHist = []; for ($a = 2; $a <= 17; $a++) $ageHist[$a] = 0;
foreach ($withAge as $a) if (isset($ageHist[$a])) $ageHist[$a]++;
$bars = function (array $counts) use ($h) {
    arsort($counts); $max = max(1, ...array_values($counts ?: [0]));
    if (!$counts) return '<p class="muted">Sem dados.</p>';
    $out = '<div class="bars">';
    foreach ($counts as $k => $v) $out .= '<span class="k">' . $h($k) . '</span><span class="t"><i style="width:' . round(100 * $v / $max) . '%"></i></span><span class="x">' . $v . '</span>';
    return $out . '</div>';
};
$langNames = ['pt' => 'Português', 'es' => 'Español', 'fr' => 'Français', 'it' => 'Italiano', 'en' => 'English', 'zh' => '中文'];
$langs = []; foreach ($fams as $f) { $k = $langNames[$f['lang'] ?? 'pt'] ?? ($f['lang'] ?? '?'); $langs[$k] = ($langs[$k] ?? 0) + 1; }
$tzs = []; foreach ($fams as $f) { $k = $f['tz'] ?: 'Desconhecido'; $tzs[$k] = ($tzs[$k] ?? 0) + 1; }
arsort($tzs); $tzs = array_slice($tzs, 0, 10, true);

$body .= '<div class="grid"><div class="card"><h2>Inscrições por dia <span class="muted small">· últimos 30 dias</span></h2>'
    . $cols($byDay, fn($d) => substr($d, 8, 2) . '/' . substr($d, 5, 2), 'família(s)') . '</div>'
    . '<div class="card"><h2>Idades dos filhos' . ($kidsTotal > count($withAge) ? ' <span class="muted small">· ' . ($kidsTotal - count($withAge)) . ' sem idade</span>' : '') . '</h2>'
    . $cols($ageHist, fn($a) => "$a", 'filho(s)') . '<p class="muted small" style="margin:6px 0 0">anos</p></div>'
    . '<div class="card"><h2>Língua</h2>' . $bars($langs) . '</div>'
    . '<div class="card"><h2>Fuso horário <span class="muted small">· indica o país</span></h2>' . $bars($tzs) . '</div></div>';

// Tabela (mais recentes primeiro)
usort($fams, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
$fmt = fn($iso) => $iso ? (new DateTimeImmutable($iso))->setTimezone(new DateTimeZone('Europe/Lisbon'))->format('d/m/Y') : '—';
$body .= '<div class="card"><h2>Famílias <span class="muted small">· identificador anónimo</span></h2><div class="tbl"><table><tr><th>ID</th><th>Inscrição</th><th>Língua</th><th>Fuso</th><th>Filhos</th><th>Idades</th><th>Tarefas</th><th>Missões</th><th>Prémios</th><th>Aparelhos</th><th>Notificações</th><th>Registos 7d</th><th>Registos 30d</th><th>Total</th><th>Última atividade</th></tr>';
foreach ($fams as $f) {
    $ag = implode(', ', array_map(fn($a) => $a ?? '?', $f['kidAges'] ?? []));
    $push = (!empty($f['pushParent']) ? 'pais' : '') . (($f['pushKids'] ?? 0) ? (!empty($f['pushParent']) ? ' + ' : '') . $f['pushKids'] . ' filho(s)' : '');
    $body .= '<tr><td><code>' . $h($f['id']) . '</code></td><td>' . $fmt($f['createdAt'] ?? null) . '</td><td>' . $h($f['lang'] ?? '') . '</td><td>' . $h($f['tz'] ?? '—') . '</td><td>'
        . count($f['kidAges'] ?? []) . '</td><td>' . $h($ag ?: '—') . '</td><td>' . (int)$f['tasks'] . '</td><td>' . (int)$f['missions'] . '</td><td>' . (int)$f['rewards'] . '</td><td>'
        . (int)$f['kidDevices'] . '</td><td>' . ($push ? '<span class="yes">' . $h($push) . '</span>' : '—') . '</td><td>' . (int)$f['log7'] . '</td><td>' . (int)$f['log30'] . '</td><td>'
        . (int)$f['logTotal'] . '</td><td>' . $fmt($f['lastActivity'] ?? null) . '</td></tr>';
}
$body .= '</table></div></div>';
page('Backoffice · SAS Kids', $body);
