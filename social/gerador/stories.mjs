// Gera as stories do Instagram (1080×1920, JPEG) com a mascote. Por defeito, uma story por dia às 18:30
// a anunciar o Reel das 19:00 desse dia; sem Reel nesse dia, uma dica para pais.
// Uso: node social/gerador/stories.mjs [prefixo]   (precisa do Playwright; as imagens saem em social/stories/)
import { readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
// Todas saem em vídeo (6 s, animadas e com música), a pedido do Jorge; para uma sair em imagem, tira-a daqui.
export const ANIMATED = { has: () => true };
const FPS = 30, DUR = 6;

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
.pop { animation: pop .5s cubic-bezier(.3,1.5,.5,1) var(--d, 0s) both; }
@keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
.foot span { display: inline-block; background: #fff; color: ${C.dark}; font-size: 50px; font-weight: 900; padding: 22px 48px; border-radius: 999px; box-shadow: 0 14px 40px rgba(47,54,87,.12); }
</style></head><body>
<div class="top">${LOGO_ICON}${LOGO_TXT}</div>
<div class="label pop">${label}</div>
<h1 class="pop ${title.split('<br>').length > 2 ? 'long' : ''}" style="--d:.2s">${title}</h1>
${art(sceneId)}
<div class="foot pop" style="--d:1.2s"><span>${foot}</span></div>
</body></html>`;

// Melodia simples (original, igual à dos Reels) com um "pop" ao entrar e um "ding" quando a tarefa fica feita.
function melody(file, dur, dings) {
  const SR = 44100, n = Math.ceil(SR * dur), buf = new Float32Array(n);
  const tone = (t0, f, len, vol, decay) => {
    for (let i = Math.floor(t0 * SR), e = Math.min(n, Math.floor((t0 + len) * SR)); i < e; i++) {
      const t = i / SR - t0, env = Math.min(1, t * 200) * Math.exp(-t * decay);
      buf[i] += vol * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t));
    }
  };
  const chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]];
  for (let beat = 0, t = 0; t < dur - 0.3; beat++, t = beat * 0.25) {
    const ch = chords[Math.floor(beat / 8) % 4];
    tone(t, ch[beat % 3] * (beat % 4 === 3 ? 2 : 1), 0.5, 0.07, 7);
    if (beat % 4 === 0) tone(t, ch[0] / 2, 0.6, 0.08, 4);
  }
  tone(0.02, 660, 0.12, 0.12, 30);
  for (const d of dings) { tone(d, 1318.5, 0.6, 0.12, 6); tone(d + 0.08, 1760, 0.6, 0.1, 6); }
  for (let i = Math.floor((dur - 0.6) * SR); i < n; i++) buf[i] *= (n - i) / (0.6 * SR);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.max(-1, Math.min(1, buf[i])) * 32000 | 0, i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(file, Buffer.concat([h, pcm]));
}

// Story em vídeo: as animações são postas no tempo certo a cada fotograma (vídeo sempre igual).
async function video(s) {
  const tmp = new URL("./tmp-stories/", import.meta.url).pathname;
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  for (let f = 0; f < FPS * DUR; f++) {
    await p.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; } }, f / FPS);
    await p.screenshot({ path: `${tmp}${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
  }
  melody(`${tmp}audio.wav`, DUR, [1.6]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", `${tmp}%04d.jpg`, "-i", `${tmp}audio.wav`,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "23", "-r", String(FPS), "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-shortest", `${OUT}${s[0]}.mp4`]);
  // Imagem de capa (fim da animação) para a página de validação.
  execFileSync("cp", [`${tmp}${String(FPS * DUR - 1).padStart(4, "0")}.jpg`, `${OUT}${s[0]}.jpg`]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${s[0]}.mp4`);
}

const only = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of STORIES.filter((s) => !only || s[0].startsWith(only))) {
  await p.setContent(page(s), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  if (ANIMATED.has(s[0].slice(0, 3))) { await video(s); continue; }
  // As cenas param no fim da animação (tudo arrumado), não a meio.
  await p.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 3200; } });
  const png = `${OUT}${s[0]}.png`;
  await p.screenshot({ path: png });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-q:v", "2", `${OUT}${s[0]}.jpg`]);
  execFileSync("rm", ["-f", png]);
  console.log(`${s[0]}.jpg`);
}
await b.close();
