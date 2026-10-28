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
.filters { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:end; background:#fff; border:2px solid #f1eee6; border-radius:18px; padding:12px 14px; margin-bottom:16px; }
.filters label { display:flex; flex-direction:column; gap:3px; font-size:.8rem; color:var(--muted); font-weight:600; }
.filters fieldset { border:0; padding:0; margin:0; display:flex; gap:10px; align-items:end; } .filters fieldset[hidden] { display:none; }
.filters select, .filters input, .filters button { font:inherit; font-size:.92rem; color:var(--ink); padding:7px 10px; border:2px solid var(--line); border-radius:12px; background:#fff; }
.filters button { background:var(--teal); color:#fff; border-color:var(--teal); font-weight:700; cursor:pointer; }
.tile .cmp { margin-top:6px; font-size:.82rem; } .d { font-weight:700; } .d.up { color:#1d8a4f; } .d.down { color:#c2410c; }
.legend { display:flex; gap:14px; font-size:.8rem; color:var(--muted); margin:-4px 0 10px; } .legend span { display:inline-flex; align-items:center; gap:5px; }
.sw { width:10px; height:10px; border-radius:3px; display:inline-block; } .sw.cur { background:var(--teal2); } .sw.prev { background:#c9c7d6; }
.cols .c { flex-direction:row; align-items:flex-end; gap:1px; } .cols .c i { flex:1; } .cols .c i.p { background:#c9c7d6; }
.cols.single .c { flex-direction:column; justify-content:flex-end; } .cols.single .c i { flex:none; width:100%; }
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
$tz = new DateTimeZone('Europe/Lisbon');
$today = new DateTimeImmutable('today', $tz);

// ---------- Período e comparação (?p=7|30|90|365|custom&from=&to=&cmp=prev|yoy) ----------
$P = $_GET['p'] ?? '30';
$validDate = fn($d) => is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) ? new DateTimeImmutable($d, $tz) : null;
if ($P === 'custom' && ($f = $validDate($_GET['from'] ?? '')) && ($t = $validDate($_GET['to'] ?? '')) && $f <= $t) { $from = $f; $to = $t; }
else { if (!in_array($P, ['7', '30', '90', '365'], true)) $P = '30'; $to = $today; $from = $today->modify('-' . ((int)$P - 1) . ' days'); }
$len = (int)$from->diff($to)->days + 1;
$CMP = ($_GET['cmp'] ?? 'prev') === 'yoy' ? 'yoy' : 'prev';
if ($CMP === 'yoy') { $cFrom = $from->modify('-1 year'); $cTo = $to->modify('-1 year'); }
else { $cTo = $from->modify('-1 day'); $cFrom = $cTo->modify('-' . ($len - 1) . ' days'); }
$fmtD = fn(DateTimeImmutable $d) => $d->format('d/m/Y');
$ymd = fn(DateTimeImmutable $d) => $d->format('Y-m-d');
$inRange = fn(?string $day, $a, $b) => $day !== null && $day >= $ymd($a) && $day <= $ymd($b);
$dayOf = fn($iso) => $iso ? (new DateTimeImmutable($iso))->setTimezone($tz)->format('Y-m-d') : null;

// ---------- Indicadores de um intervalo ----------
$metrics = function ($a, $b) use ($fams, $inRange, $dayOf) {
    $m = ['new' => 0, 'kids' => 0, 'active' => 0, 'logs' => 0, 'total' => 0, 'kidsTotal' => 0];
    foreach ($fams as $f) {
        $created = $dayOf($f['createdAt'] ?? null);
        if ($inRange($created, $a, $b)) $m['new']++;
        // Sem data de criação (dados antigos) conta como já existente.
        if ($created === null || $created <= $b->format('Y-m-d')) $m['total']++;
        foreach ($f['kidCreated'] ?? array_fill(0, count($f['kidAges'] ?? []), null) as $k) { if ($inRange($k, $a, $b)) $m['kids']++; if ($k === null || $k <= $b->format('Y-m-d')) $m['kidsTotal']++; }
        $n = 0; foreach ($f['logByDay'] ?? [] as $d => $c) if ($inRange($d, $a, $b)) $n += $c;
        $m['logs'] += $n; if ($n > 0) $m['active']++;
    }
    return $m;
};
$cur = $metrics($from, $to); $prev = $metrics($cFrom, $cTo);
$delta = function ($a, $b) {
    if ($b == 0) return $a == 0 ? '<span class="d">=</span>' : '<span class="d up">novo</span>';
    $p = round(100 * ($a - $b) / $b);
    return '<span class="d ' . ($p > 0 ? 'up' : ($p < 0 ? 'down' : '')) . '">' . ($p > 0 ? '▲ +' : ($p < 0 ? '▼ ' : '= ')) . $p . '%</span>';
};
$cmpName = $CMP === 'yoy' ? 'homólogo' : 'anterior';
$tile = fn($v, $l, $pv = null, $d = '') => "<div class=\"tile\"><div class=\"v\">$v</div><div class=\"l\">$l</div>"
    . ($pv !== null ? "<div class=\"cmp\">$d <span class=\"muted\">vs. $pv</span></div>" : '') . '</div>';

// ---------- Filtros ----------
$opt = fn($v, $l) => '<option value="' . $v . '"' . ($P === $v ? ' selected' : '') . ">$l</option>";
$body = '<form class="filters" method="get">'
    . '<label>Período <select name="p" onchange="this.form.custom.hidden=this.value!==\'custom\';if(this.value!==\'custom\')this.form.submit()">'
    . $opt('7', 'Últimos 7 dias') . $opt('30', 'Últimos 30 dias') . $opt('90', 'Últimos 90 dias') . $opt('365', 'Últimos 12 meses') . $opt('custom', 'Personalizado…') . '</select></label>'
    . '<fieldset name="custom"' . ($P === 'custom' ? '' : ' hidden') . '><label>De <input type="date" name="from" value="' . $ymd($from) . '"></label>'
    . '<label>Até <input type="date" name="to" value="' . $ymd($to) . '" max="' . $ymd($today) . '"></label><button>Aplicar</button></fieldset>'
    . '<label>Comparar com <select name="cmp" onchange="this.form.submit()"><option value="prev"' . ($CMP === 'prev' ? ' selected' : '') . '>Período anterior</option>'
    . '<option value="yoy"' . ($CMP === 'yoy' ? ' selected' : '') . '>Período homólogo (ano anterior)</option></select></label></form>';

$body .= '<h1>' . $fmtD($from) . ' – ' . $fmtD($to) . ' <span class="muted small">(' . $len . ' dias)</span></h1>'
    . '<p class="muted small">Comparado com o período ' . $cmpName . ': ' . $fmtD($cFrom) . ' – ' . $fmtD($cTo)
    . ' · dados de ' . $h((new DateTimeImmutable($data['generatedAt']))->setTimezone($tz)->format('d/m/Y H:i')) . ' (recalculados de hora a hora) · só números, sem dados pessoais</p>';

$pushNow = count(array_filter($fams, fn($f) => !empty($f['pushParent']) || ($f['pushKids'] ?? 0) > 0));
$acc = $data['accounts'] ?? null;
$accHtml = $acc ? '<div class="card"><h2>Contas <span class="muted small">· Firebase Authentication (hoje)</span></h2><div class="tiles" style="margin:0">'
    . $tile((int)$acc['email'], 'Contas de pais (email)') . $tile((int)$acc['withFamily'], 'Com família configurada')
    . $tile((int)$acc['withoutFamily'], 'Criaram conta mas não acabaram (sem PIN)') . $tile((int)$acc['anonymous'], 'Aparelhos de filhos (contas anónimas)')
    . '</div><p class="muted small" style="margin:10px 0 0">As famílias acima contam só quem acabou a configuração. Os emails estão na consola do Firebase → Authentication → Users.</p></div>' : '';
$body .= '<div class="tiles">'
    . $tile($cur['new'], 'Novas famílias', $prev['new'], $delta($cur['new'], $prev['new']))
    . $tile($cur['kids'], 'Novos filhos', $prev['kids'], $delta($cur['kids'], $prev['kids']))
    . $tile($cur['active'], 'Famílias ativas', $prev['active'], $delta($cur['active'], $prev['active']))
    . $tile($cur['logs'], 'Registos (tarefas, pedidos, pontos…)', $prev['logs'], $delta($cur['logs'], $prev['logs']))
    . $tile($cur['total'], 'Famílias no fim do período', $prev['total'], $delta($cur['total'], $prev['total']))
    . $tile($cur['kidsTotal'], 'Filhos no fim do período', $prev['kidsTotal'], $delta($cur['kidsTotal'], $prev['kidsTotal']))
    . $tile($pushNow, 'Com notificações (hoje)')
    . $tile(array_sum(array_map(fn($f) => (int)($f['kidDevices'] ?? 0), $fams)), 'Aparelhos de filhos (hoje)')
    . '</div>';

// ---------- Séries por dia / semana / mês, atual vs. comparação ----------
$unit = $len <= 31 ? 'day' : ($len <= 120 ? 'week' : 'month');
$bucketKey = function (string $day, DateTimeImmutable $start) use ($unit, $tz) {
    $d = new DateTimeImmutable($day, $tz);
    if ($unit === 'day') return (int)$start->diff($d)->days;
    if ($unit === 'week') return intdiv((int)$start->diff($d)->days, 7);
    return ((int)$d->format('Y') - (int)$start->format('Y')) * 12 + (int)$d->format('n') - (int)$start->format('n');
};
$nB = $bucketKey($ymd($to), $from) + 1;
$bLabel = function (int $i) use ($unit, $from) {
    if ($unit === 'day') return $from->modify("+$i days")->format('d/m');
    if ($unit === 'week') return $from->modify('+' . (7 * $i) . ' days')->format('d/m');
    return $from->modify('first day of this month')->modify("+$i months")->format('m/Y');
};
$series = function (callable $events, DateTimeImmutable $a, DateTimeImmutable $b) use ($nB, $bucketKey, $inRange) {
    $out = array_fill(0, $nB, 0);
    foreach ($events() as [$day, $n]) if ($inRange($day, $a, $b)) { $k = $bucketKey($day, $a); if ($k >= 0 && $k < $nB) $out[$k] += $n; }
    return $out;
};
$signups = fn() => array_map(fn($f) => [$dayOf($f['createdAt'] ?? null), 1], $fams);
$kidsEv = fn() => array_merge(...array_map(fn($f) => array_map(fn($k) => [$k, 1], $f['kidCreated'] ?? []), $fams ?: [[]]));
$logsEv = fn() => array_merge(...array_map(fn($f) => array_map(fn($d, $c) => [$d, $c], array_keys($f['logByDay'] ?? []), $f['logByDay'] ?? []), $fams ?: [[]]));
$pair = function (string $title, callable $ev, string $what) use ($series, $from, $to, $cFrom, $cTo, $nB, $bLabel, $h, $cmpName, $unit) {
    $a = $series($ev, $from, $to); $b = $series($ev, $cFrom, $cTo);
    $max = max(1, ...$a, ...$b);
    $per = ['day' => 'por dia', 'week' => 'por semana', 'month' => 'por mês'][$unit];
    $out = '<div class="card"><h2>' . $title . ' <span class="muted small">· ' . $per . '</span></h2>'
        . '<div class="legend"><span><i class="sw cur"></i>Período escolhido</span><span><i class="sw prev"></i>Período ' . $cmpName . '</span></div><div class="cols">';
    for ($i = 0; $i < $nB; $i++) {
        $out .= '<div class="c" title="' . $h($bLabel($i) . ": {$a[$i]} $what (período $cmpName: {$b[$i]})") . '">'
            . '<i class="p" style="height:' . round(100 * $b[$i] / $max) . '%"></i><i style="height:' . round(100 * $a[$i] / $max) . '%"></i></div>';
    }
    $out .= '</div><div class="axis">';
    $step = max(1, (int)ceil($nB / 7));
    for ($i = 0; $i < $nB; $i++) $out .= '<span>' . ($i % $step === 0 ? $h($bLabel($i)) : '') . '</span>';
    return $out . '</div><p class="muted small" style="margin:8px 0 0">Total: <b>' . array_sum($a) . '</b> vs. ' . array_sum($b) . '</p></div>';
};
$body .= $accHtml;
$body .= '<div class="grid">' . $pair('Novas famílias', $signups, 'família(s)') . $pair('Registos de atividade', $logsEv, 'registo(s)')
    . $pair('Novos filhos', $kidsEv, 'filho(s)');

// Distribuições das famílias inscritas no período
$inPer = array_filter($fams, fn($f) => $inRange($dayOf($f['createdAt'] ?? null), $from, $to));
$ages = array_values(array_filter(array_merge(...array_map(fn($f) => $f['kidAges'] ?? [], $inPer ?: [[]])), fn($a) => $a !== null));
$ageHist = []; for ($x = 2; $x <= 17; $x++) $ageHist[$x] = 0;
foreach ($ages as $x) if (isset($ageHist[$x])) $ageHist[$x]++;
$amax = max(1, ...array_values($ageHist));
$ageHtml = '<div class="cols single">';
foreach ($ageHist as $x => $v) $ageHtml .= '<div class="c" title="' . "$x anos: $v filho(s)" . '">' . ($v ? "<span class=\"n\">$v</span>" : '') . '<i style="height:' . round(100 * $v / $amax) . '%"></i></div>';
$ageHtml .= '</div><div class="axis">'; foreach ($ageHist as $x => $v) $ageHtml .= '<span>' . ($x % 2 === 0 ? $x : '') . '</span>';
$ageHtml .= '</div>';
$body .= '<div class="card"><h2>Idades dos filhos <span class="muted small">· famílias inscritas no período'
    . ($ages ? ' · média ' . number_format(array_sum($ages) / count($ages), 1, ',', '') . ' anos' : '') . '</span></h2>' . $ageHtml . '</div></div>';

$bars = function (array $counts) use ($h) {
    if (!$counts) return '<p class="muted">Sem inscrições no período.</p>';
    arsort($counts); $max = max(1, ...array_values($counts));
    $out = '<div class="bars">';
    foreach ($counts as $k => $v) $out .= '<span class="k">' . $h($k) . '</span><span class="t"><i style="width:' . round(100 * $v / $max) . '%"></i></span><span class="x">' . $v . '</span>';
    return $out . '</div>';
};
$langNames = ['pt' => 'Português', 'es' => 'Español', 'fr' => 'Français', 'it' => 'Italiano', 'en' => 'English', 'zh' => '中文'];
$langs = []; foreach ($inPer as $f) { $k = $langNames[$f['lang'] ?? 'pt'] ?? ($f['lang'] ?? '?'); $langs[$k] = ($langs[$k] ?? 0) + 1; }
$tzs = []; foreach ($inPer as $f) { $k = $f['tz'] ?: 'Desconhecido'; $tzs[$k] = ($tzs[$k] ?? 0) + 1; }
arsort($tzs); $tzs = array_slice($tzs, 0, 10, true);
$body .= '<div class="grid"><div class="card"><h2>Língua <span class="muted small">· inscritas no período</span></h2>' . $bars($langs) . '</div>'
    . '<div class="card"><h2>Fuso horário <span class="muted small">· indica o país</span></h2>' . $bars($tzs) . '</div></div>';

// Tabela (todas, mais recentes primeiro); a atividade conta só o período escolhido
usort($fams, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
$fmt = fn($iso) => $iso ? (new DateTimeImmutable($iso))->setTimezone($tz)->format('d/m/Y') : '—';
$body .= '<div class="card"><h2>Famílias <span class="muted small">· identificador anónimo · registos no período escolhido</span></h2><div class="tbl"><table><tr><th>ID</th><th>Inscrição</th><th>Língua</th><th>Fuso</th><th>Filhos</th><th>Idades</th><th>Tarefas</th><th>Missões</th><th>Prémios</th><th>Aparelhos</th><th>Notificações</th><th>Registos</th><th>Total</th><th>Última atividade</th></tr>';
foreach ($fams as $f) {
    $n = 0; foreach ($f['logByDay'] ?? [] as $d => $c) if ($inRange($d, $from, $to)) $n += $c;
    $ag = implode(', ', array_map(fn($a) => $a ?? '?', $f['kidAges'] ?? []));
    $push = (!empty($f['pushParent']) ? 'pais' : '') . (($f['pushKids'] ?? 0) ? (!empty($f['pushParent']) ? ' + ' : '') . $f['pushKids'] . ' filho(s)' : '');
    $body .= '<tr><td><code>' . $h($f['id']) . '</code></td><td>' . $fmt($f['createdAt'] ?? null) . '</td><td>' . $h($f['lang'] ?? '') . '</td><td>' . $h($f['tz'] ?? '—') . '</td><td>'
        . count($f['kidAges'] ?? []) . '</td><td>' . $h($ag ?: '—') . '</td><td>' . (int)($f['tasks'] ?? 0) . '</td><td>' . (int)($f['missions'] ?? 0) . '</td><td>' . (int)($f['rewards'] ?? 0) . '</td><td>'
        . (int)($f['kidDevices'] ?? 0) . '</td><td>' . ($push ? '<span class="yes">' . $h($push) . '</span>' : '—') . '</td><td>' . $n . '</td><td>'
        . (int)($f['logTotal'] ?? 0) . '</td><td>' . $fmt($f['lastActivity'] ?? null) . '</td></tr>';
}
$body .= '</table></div></div>';
page('Backoffice · SAS Kids', $body);
