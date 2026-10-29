# Página de validação (Artifact) com os posts e Reels por aprovar da fila. Uso: python3 social/gerador/validacao.py -> social/gerador/tmp-validacao/validacao.html e files.json (mapa para o campo files do Artifact).
import os; os.makedirs("/home/user/pontos-app/social/gerador/tmp-validacao", exist_ok=True)
import json, html, sys
q = json.load(open('/home/user/pontos-app/social/queue.json'))['posts']
items = [p for p in q if p.get('approved') is not True]
e = html.escape
DOW = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
from datetime import date
def when(at):
    d, h = at.split(' '); y, m, dd = map(int, d.split('-'))
    return f"{DOW[date(y, m, dd).weekday()]} {dd}/{m} · {h}"
cards = []
for i, p in enumerate(items, 1):
    reel = 'video' in p
    media = (f'<video src="{p["video"]}" controls playsinline preload="metadata" muted loop></video>' if reel
             else f'<img src="{p["image"]}" alt="" loading="lazy">')
    cards.append(f'''<article class="item">
  <div class="media {'reel' if reel else 'img'}">{media}</div>
  <div class="txt"><div class="meta"><span class="num">{i}</span><span class="kind">{'Reel' if reel else 'Post'}</span><span>{when(p['at'])}</span></div>
  <pre>{e(p['caption'])}</pre><code>{e(p['id'])}</code></div></article>''')
files = {p.get('video') or p.get('image'): '/home/user/pontos-app/' + (p.get('video') or p.get('image')) for p in items}
nr = sum('video' in p for p in items); ni = len(items) - nr
page = f'''<title>Validação Instagram SAS Kids</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
/* Layout: lista numerada; cada item tem o vídeo/imagem à esquerda e a legenda à direita (empilha no telemóvel) */
:root {{ --bg:#fffdf8; --card:#fff; --ink:#2f3657; --muted:#646b8a; --teal:#1fa5a8; --line:#f1eee6; --mint:#d8f3e8; --butter:#fff1bd; --font:"Nunito", ui-rounded, "Segoe UI", system-ui, sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#1d2133; --card:#272c42; --ink:#eef0fa; --muted:#aab0cc; --teal:#3cc3c6; --line:#353b56; --mint:#22433d; --butter:#4a4226; color-scheme:dark; }} }}
:root[data-theme="dark"] {{ --bg:#1d2133; --card:#272c42; --ink:#eef0fa; --muted:#aab0cc; --teal:#3cc3c6; --line:#353b56; --mint:#22433d; --butter:#4a4226; color-scheme:dark; }}
* {{ box-sizing:border-box; }}
body {{ background:var(--bg); color:var(--ink); font-family:var(--font); margin:0; line-height:1.5; padding-block:24px 48px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }}
main {{ max-width:900px; margin:0 auto; display:grid; gap:18px; }}
h1 {{ margin:0; font-size:1.9rem; font-weight:900; text-wrap:balance; }}
.lead {{ margin:0; color:var(--muted); }}
.how {{ background:var(--butter); border-radius:16px; padding:12px 16px; margin:0; }}
.item {{ display:grid; grid-template-columns:240px minmax(0,1fr); gap:18px; background:var(--card); border:2px solid var(--line); border-radius:22px; padding:14px; }}
.media video, .media img {{ width:100%; display:block; border-radius:14px; background:#000; max-width:100%; }}
.media.reel video {{ aspect-ratio:9/16; }} .media.img img {{ aspect-ratio:4/5; object-fit:cover; }}
.txt {{ min-width:0; display:grid; gap:8px; align-content:start; }}
.meta {{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; font-weight:800; font-size:.9rem; }}
.num {{ background:var(--teal); color:#fff; border-radius:999px; min-width:2em; text-align:center; padding:2px 10px; font-variant-numeric:tabular-nums; }}
.kind {{ background:var(--mint); border-radius:999px; padding:2px 10px; }}
pre {{ margin:0; white-space:pre-wrap; word-break:break-word; font-family:var(--font); font-size:.95rem; }}
code {{ color:var(--muted); font-size:.75rem; }}
@media (max-width:620px) {{ .item {{ grid-template-columns:1fr; }} .media {{ max-width:300px; }} }}
</style>
<main>
<header style="display:grid;gap:8px"><h1>Validação Instagram SAS Kids</h1>
<p class="lead">{nr} Reels e {ni} posts à espera da tua aprovação. Nada disto sai sem o teu ok.</p></header>
<p class="how">Responde na conversa com o Claude: <b>"aprovo todos"</b>, ou por exemplo <b>"aprovo todos menos 7 e 12; no 3 muda a frase para…"</b>. Os números são os da esquerda.</p>
{''.join(cards)}
</main>'''
open('/home/user/pontos-app/social/gerador/tmp-validacao/validacao.html', 'w').write(page)
json.dump(files, open('/home/user/pontos-app/social/gerador/tmp-validacao/files.json', 'w'))
print(len(items), nr, ni)
