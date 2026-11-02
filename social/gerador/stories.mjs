// Gera as stories do Instagram (1080×1920, JPEG) com a mascote. Por defeito, uma story por dia às 18:30
// a anunciar o Reel das 19:00 desse dia; sem Reel nesse dia, uma dica para pais.
// Uso: node social/gerador/stories.mjs [prefixo]   (precisa do Playwright; as imagens saem em social/stories/)
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = new URL("../../", import.meta.url).pathname;
const OUT = `${APP}social/stories/`;
mkdirSync(OUT, { recursive: true });
const { sceneSvg } = await import(`${APP}scenes.js`);
const MASCOT = readFileSync(`${APP}illustrations/mascote.svg`, "utf8");
const LOGO_ICON = readFileSync(`${APP}illustrations/logo-icon.svg`, "utf8");
const LOGO_TXT = readFileSync(`${APP}illustrations/logo-texto.svg`, "utf8");
const css = readFileSync(`${APP}style.css`, "utf8");
const DANCE_CSS = css.slice(css.indexOf("/* A mascote dança"), css.indexOf("@media (prefers-reduced-motion", css.indexOf("/* A mascote dança")));
const SCENE_CSS = ".dance svg g { transform-box: fill-box; }\n" + css.slice(css.indexOf("/* Cenas da mascote"), css.lastIndexOf("@media (prefers-reduced-motion"));
const C = { cream: "#fffdf8", teal: "#1fa5a8", dark: "#2f3657", muted: "#646b8a", mint: "#d8f3e8", sky: "#e2f3ff", butter: "#fff1bd", pink: "#ffe1e8", lilac: "#ece6ff", coral: "#ff8f7a" };

// [id, cor, etiqueta, título, cena (ou null para a mascote a dançar), rodapé]
const teaser = (id, color, hook, sceneId) => [id, color, "Hoje às 19h", hook, sceneId, "Novo Reel 🎬 · @saskidsapp"];
const tip = (id, color, label, text, sceneId) => [id, color, label, text, sceneId, "saskids.net · grátis"];
export const STORIES = [
  teaser("s01-antes-depois", C.pink, "“Já te disse<br>10 vezes!” 😩", "cesto"),
  teaser("s02-brinquedos", C.butter, "Brinquedos<br>arrumados?", "brinquedos"),
  teaser("s03-rotina-da-manha", C.sky, "A rotina<br>da manhã ☀️", "cama"),
  teaser("s04-banho", C.sky, "Banho<br>sem reclamar?", "banho"),
  teaser("s05-animal", C.butter, "O cão<br>já comeu? 🐶", "animal"),
  teaser("s06-jantar", C.pink, "Jantar<br>em equipa 🍽️", "pormesa"),
  teaser("s07-tpc", C.sky, "TPC<br>feito? ✏️", "tpc"),
  teaser("s08-ler", C.lilac, "20 minutos<br>a ler? 📖", "ler"),
  teaser("s09-desporto", C.mint, "Treino<br>feito? ⚽", "desporto"),
  teaser("s10-crescidos", C.butter, "Tarefas<br>de crescidos 💪", "aspirar"),
  teaser("s11-ecra", C.pink, "Tempo de ecrã<br>cumprido? 📱", "ecra"),
  teaser("s12-cesto", C.mint, "Roupa suja<br>no cesto? 🧦", "cesto"),
  teaser("s13-lanche", C.butter, "Lanche feito<br>por ti? 🥪", "lanche"),
  teaser("s14-missoes", C.lilac, "Missões<br>com prazo 🏆", "aprender"),
  teaser("s15-sapatos", C.pink, "Sapatos<br>no lugar? 👟", "sapatos"),
  teaser("s16-levantar-mesa", C.sky, "Mesa<br>levantada?", "levantarmesa"),
  teaser("s17-armario", C.lilac, "Missão: arrumar<br>o armário 👕", "armario"),
  teaser("s18-carro", C.butter, "Missão: lavar<br>o carro 🚗", "carro"),
  tip("s19-dica-pontos", C.mint, "Sabias que…", "Quem faz todas<br>as tarefas ganha<br><em>30 a 50 pontos</em><br>por dia?", null),
  tip("s20-dica-premios", C.sky, "Dica de domingo", "Combinem<br>os prémios <em>juntos</em>:<br>assim esforçam-se<br>mais.", "livro"),
];

const art = (sceneId) => sceneId
  ? `<div class="art dance"><div class="dance-mascot wide">${sceneSvg(sceneId, MASCOT)}</div></div>`
  : `<div class="art dance"><div class="dance-mascot solo">${MASCOT}</div></div>`;
const page = ([id, color, label, title, sceneId, foot]) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1920px; overflow: hidden; font-family: Nunito, Arial, sans-serif; color: ${C.dark}; }
body { background: linear-gradient(170deg, ${color}, ${C.cream} 78%); display: flex; flex-direction: column; align-items: center; text-align: center; padding: 260px 70px 0; }
${DANCE_CSS}
${SCENE_CSS}
.top { display: flex; align-items: center; gap: 16px; height: 72px; margin-bottom: 54px; }
.top svg:first-child { width: 72px; height: 72px; } .top svg:last-child { height: 50px; width: auto; }
.label { background: ${C.teal}; color: #fff; font-size: 54px; font-weight: 900; padding: 16px 44px; border-radius: 999px; margin-bottom: 40px; }
h1 { font-size: 112px; line-height: 1.04; font-weight: 900; letter-spacing: -2px; }
h1 em { font-style: normal; color: ${C.teal}; }
h1.long { font-size: 88px; }
.art { position: relative; inset: auto; background: none; backdrop-filter: none; animation: none; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; padding-bottom: 470px; }
.art .dance-mascot.wide { width: 860px; } .art .dance-mascot.solo { width: 520px; }
.dance-stars { display: none; }
.foot { position: absolute; bottom: 250px; left: 0; right: 0; text-align: center; }
.foot span { display: inline-block; background: #fff; color: ${C.dark}; font-size: 50px; font-weight: 900; padding: 22px 48px; border-radius: 999px; box-shadow: 0 14px 40px rgba(47,54,87,.12); }
</style></head><body>
<div class="top">${LOGO_ICON}${LOGO_TXT}</div>
<div class="label">${label}</div>
<h1 class="${title.split('<br>').length > 2 ? 'long' : ''}">${title}</h1>
${art(sceneId)}
<div class="foot"><span>${foot}</span></div>
</body></html>`;

const only = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of STORIES.filter((s) => !only || s[0].startsWith(only))) {
  await p.setContent(page(s), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  // As cenas param no fim da animação (tudo arrumado), não a meio.
  await p.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 3200; } });
  const png = `${OUT}${s[0]}.png`;
  await p.screenshot({ path: png });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-q:v", "2", `${OUT}${s[0]}.jpg`]);
  execFileSync("rm", ["-f", png]);
  console.log(`${s[0]}.jpg`);
}
await b.close();
