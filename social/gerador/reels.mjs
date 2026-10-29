// Gera os Reels do Instagram (1080×1920, 30 fps, MP4 com som) a partir das cenas da mascote.
// Cada Reel é uma sequência de "cenas" com hora de início e fim; as animações CSS são paradas e
// postas no tempo certo a cada fotograma, por isso o vídeo sai sempre igual e sem saltos.
// Uso: node social/gerador/reels.mjs   (precisa do Playwright e do ffmpeg; os MP4 saem em social/reels/)
import { readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = new URL("../../", import.meta.url).pathname;
const OUT = `${APP}social/reels/`;
const TMP = new URL("./tmp-reels/", import.meta.url).pathname;
const FPS = 30;
mkdirSync(OUT, { recursive: true });
const { sceneSvg } = await import(`${APP}scenes.js`);
const MASCOT = readFileSync(`${APP}illustrations/mascote.svg`, "utf8");
const LOGO_ICON = readFileSync(`${APP}illustrations/logo-icon.svg`, "utf8");
const LOGO_TXT = readFileSync(`${APP}illustrations/logo-texto.svg`, "utf8");
const css = readFileSync(`${APP}style.css`, "utf8");
const DANCE_CSS = css.slice(css.indexOf("/* A mascote dança"), css.indexOf("@media (prefers-reduced-motion", css.indexOf("/* A mascote dança")));
const SCENE_CSS = ".dance svg g { transform-box: fill-box; }\n" + css.slice(css.indexOf("/* Cenas da mascote"), css.lastIndexOf("@media (prefers-reduced-motion"));
const C = { cream: "#fffdf8", teal: "#1fa5a8", dark: "#2f3657", muted: "#646b8a", mint: "#d8f3e8", sky: "#e2f3ff", butter: "#fff1bd", pink: "#ffe1e8", lilac: "#ece6ff", coral: "#ff8f7a" };
const bg = (c) => `linear-gradient(170deg, ${c}, ${C.cream} 78%)`;

// ---------- Peças ----------
const scene = (id) => `<div class="art dance"><div class="dance-mascot wide">${sceneSvg(id, MASCOT)}</div></div>`;
const dancer = `<div class="art dance"><div class="dance-mascot solo">${MASCOT}</div></div>`;
const badge = (txt, d = 1.4) => `<div class="badge pop" style="--d:${d}s">${txt}</div>`;
const seg = (start, end, color, body) => ({ start, end, html: `<section class="seg" data-start="${start}" data-end="${end}" style="background:${bg(color)}"><div class="top">${LOGO_ICON}${LOGO_TXT}</div>${body}</section>` });
const ending = (start, end, line) => seg(start, end, C.sky, `<div class="end">
  <div class="end-logo pop" style="--d:0s">${LOGO_ICON}</div>
  <h1 class="pop" style="--d:.25s">${line}</h1>
  <div class="pill pop" style="--d:.6s">Grátis em saskids.net</div></div>`);

// Reel de uma tarefa: pergunta, cena, pontos e fecho.
const single = (id, color, hook, sceneId, pts, line, ding = 2.0) => ({ id, segs: [
  seg(0, 4.4, color, `<h1 class="pop">${hook}</h1>${scene(sceneId)}${badge(`+${pts} ⭐`, ding)}`),
  ending(4.4, 6.8, line),
], dings: [ding] });
// Reel de 4 tarefas seguidas sobre um tema.
const montage = (id, items, line) => {
  const segs = items.map(([color, hook, sceneId, pts, d], i) => seg(i * 2.6, (i + 1) * 2.6, color, `<h1 class="pop">${hook}</h1>${scene(sceneId)}${badge(`+${pts} ⭐`, d)}`));
  segs.push(ending(10.4, 12.6, line));
  return { id, segs, dings: items.map(([, , , , d], i) => i * 2.6 + d) };
};

export const REELS = [
  montage("r01-cada-tarefa-uma-festa", [[C.lilac, "Cama feita?", "cama", 5, 1.5], [C.mint, "Dentes lavados?", "dentes", 5, 1.2], [C.butter, "Quarto arrumado?", "quarto", 10, 1.6], [C.lilac, "Na cama à hora?", "deitar", 5, 1.2]], "Cada tarefa,<br><em>uma festa.</em>"),
  { id: "r02-como-funciona", segs: [
      seg(0, 2.5, C.mint, `<h1 class="pop"><span class="n">1</span>Adiciona<br>os filhos</h1>${dancer}`),
      seg(2.5, 5.0, C.sky, `<h1 class="pop"><span class="n">2</span>Escolhe<br>as tarefas</h1>${scene("tpc")}`),
      seg(5.0, 7.5, C.pink, `<h1 class="pop"><span class="n">3</span>Combina<br>os prémios</h1>${scene("livro")}`),
      seg(7.5, 10.0, C.butter, `<h1 class="pop"><span class="n">4</span>Eles marcam,<br><em>tu validas</em></h1>${scene("brinquedos")}${badge("✓ Feito", 1.6)}`),
      ending(10.0, 12.4, "Tarefas que<br><em>valem pontos.</em>"),
    ], dings: [6.6, 9.1] },
  { id: "r03-antes-depois", segs: [
      seg(0, 2.4, C.pink, `<div class="quote pop"><small>Antes</small>“Já te disse<br>10 vezes!” 😩</div>`),
      seg(2.4, 5.0, C.mint, `<div class="quote ok pop"><small>Depois</small>“Já fiz!” ✓</div>${scene("cesto")}`),
      seg(5.0, 7.6, C.butter, `<h1 class="pop">E há <em>missões</em></h1>${scene("aprender")}${badge("+60 ⭐", 2.0)}`),
      seg(7.6, 10.2, C.sky, `<h1 class="pop">…para o<br>fim de semana</h1>${scene("carro")}${badge("+25 ⭐", 2.4)}`),
      ending(10.2, 12.6, "Menos discussões.<br><em>Mais “já fiz!”</em>"),
    ], dings: [3.0, 7.0, 10.0] },
  single("r04-brinquedos", C.butter, "Brinquedos<br>arrumados?", "brinquedos", 5, "Arrumar também<br><em>é brincar.</em>"),
  montage("r05-rotina-da-manha", [[C.sky, "Cama feita?", "cama", 5, 1.5], [C.mint, "Vestido sozinho?", "vestir", 3, 1.4], [C.lilac, "Dentes lavados?", "dentes", 5, 1.2], [C.butter, "Mochila pronta?", "mochila", 5, 2.0]], "Manhãs<br><em>sem correrias.</em>"),
  single("r06-banho", C.sky, "Banho<br>sem reclamar?", "banho", 5, "Até o banho<br><em>fica divertido.</em>", 1.6),
  single("r07-animal", C.butter, "O cão<br>já comeu?", "animal", 5, "Responsabilidade<br><em>a sério.</em>"),
  montage("r08-jantar-em-equipa", [[C.pink, "Mesa posta?", "pormesa", 5, 1.7], [C.mint, "Fruta comida?", "fruta", 5, 1.2], [C.sky, "Mesa levantada?", "levantarmesa", 5, 2.0], [C.butter, "Loiça arrumada?", "loica", 5, 2.2]], "Jantar<br><em>em equipa.</em>"),
  single("r09-tpc", C.sky, "TPC feito?", "tpc", 10, "As tarefas difíceis<br><em>valem mais.</em>", 2.3),
  single("r10-ler", C.lilac, "20 minutos<br>a ler?", "ler", 10, "Uma página<br><em>de cada vez.</em>"),
  single("r11-desporto", C.mint, "Treino<br>feito?", "desporto", 10, "Golo! ⚽<br><em>+10 pontos.</em>", 1.8),
  montage("r12-tarefas-de-crescidos", [[C.sky, "Roupa estendida?", "roupa", 10, 1.9], [C.butter, "Divisão aspirada?", "aspirar", 10, 2.2], [C.mint, "Lixo levado?", "lixo", 5, 1.4], [C.lilac, "Estudo feito?", "estudar", 15, 1.6]], "Tarefas<br><em>de crescidos.</em>"),
  single("r13-ecra", C.pink, "Tempo de ecrã<br>cumprido?", "ecra", 10, "Desligar<br><em>e ir brincar.</em>", 2.0),
  single("r14-cesto", C.mint, "Roupa suja<br>no cesto?", "cesto", 3, "As pequenas<br><em>também contam.</em>"),
  single("r15-lanche", C.butter, "Lanche feito<br>por ti?", "lanche", 5, "Mãos<br><em>na massa.</em>", 2.3),
  montage("r16-missoes", [[C.lilac, "Ler um livro?", "livro", 50, 1.8], [C.sky, "Armário arrumado?", "armario", 30, 2.2], [C.butter, "Carro lavado?", "carro", 25, 2.2], [C.mint, "Andar de bicicleta?", "aprender", 60, 2.0]], "Missões:<br><em>desafios com prazo.</em>"),
  single("r17-sapatos", C.pink, "Sapatos<br>no lugar?", "sapatos", 3, "Casa arrumada<br><em>desde a porta.</em>", 1.8),
  single("r18-levantar-mesa", C.sky, "Mesa<br>levantada?", "levantarmesa", 5, "Acabou o jantar,<br><em>ajudas tu.</em>", 2.3),
  single("r19-armario", C.lilac, "Missão: arrumar<br>o armário", "armario", 30, "Missão<br><em>cumprida!</em>", 2.5),
  single("r20-carro", C.butter, "Missão: lavar<br>o carro", "carro", 25, "Fim de semana<br><em>em família.</em>", 2.6),
];

const page = (r) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${C.cream}; font-family: Nunito, Arial, sans-serif; color: ${C.dark}; }
${DANCE_CSS}
${SCENE_CSS}
.seg { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; padding: 230px 70px 0; text-align: center; }
.top { display: flex; align-items: center; gap: 16px; height: 72px; margin-bottom: 70px; }
.top svg:first-child { width: 72px; height: 72px; } .top svg:last-child { height: 50px; width: auto; }
h1 { font-size: 118px; line-height: 1.02; font-weight: 900; letter-spacing: -2px; }
h1 em { font-style: normal; color: ${C.teal}; }
h1 .n { display: block; width: 120px; height: 120px; margin: 0 auto 26px; border-radius: 50%; background: ${C.teal}; color: #fff; font-size: 74px; line-height: 120px; letter-spacing: 0; }
.art { position: relative; inset: auto; background: none; backdrop-filter: none; animation: none; cursor: default; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; padding-bottom: 300px; }
.art .dance-mascot.wide { width: 980px; } .art .dance-mascot.solo { width: 560px; }
.dance-stars { display: none; }
.badge { position: absolute; z-index: 5; left: 50%; top: 1430px; margin-left: -190px; width: 380px; padding: 26px 0; border-radius: 999px; background: ${C.teal}; color: #fff; font-size: 70px; font-weight: 900; box-shadow: 0 18px 50px rgba(31,165,168,.35); }
.quote { margin-top: 160px; font-size: 128px; line-height: 1.05; font-weight: 900; color: ${C.coral}; }
.quote.ok { color: ${C.teal}; margin-top: 60px; }
.quote small { display: block; font-size: 52px; letter-spacing: 6px; text-transform: uppercase; color: ${C.muted}; margin-bottom: 24px; }
.end { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 60px; padding-bottom: 380px; }
.end-logo svg { width: 360px; height: 360px; }
.pill { background: ${C.teal}; color: #fff; font-size: 62px; font-weight: 900; padding: 30px 64px; border-radius: 999px; }
.pop { animation: pop .5s cubic-bezier(.3,1.5,.5,1) var(--d, 0s) both; }
@keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
</style></head><body>${r.segs.map((s) => s.html).join("")}</body></html>`;

// ---------- Som: melodia simples (original) + "pop" a cada cena + "ding" quando ganha pontos ----------
function audio(r, file) {
  const SR = 44100, dur = r.segs.at(-1).end, n = Math.ceil(SR * dur), buf = new Float32Array(n);
  const tone = (t0, f, len, vol, decay) => {
    for (let i = Math.floor(t0 * SR), e = Math.min(n, Math.floor((t0 + len) * SR)); i < e; i++) {
      const t = i / SR - t0, env = Math.min(1, t * 200) * Math.exp(-t * decay);
      buf[i] += vol * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t));
    }
  };
  // Ukulele imaginário: arpejo alegre em Dó (C-Am-F-G), 120 bpm, bem baixinho por baixo.
  const chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]];
  for (let beat = 0, t = 0; t < dur - 0.3; beat++, t = beat * 0.25) {
    const ch = chords[Math.floor(beat / 8) % 4];
    tone(t, ch[beat % 3] * (beat % 4 === 3 ? 2 : 1), 0.5, 0.06, 7);
    if (beat % 4 === 0) tone(t, ch[0] / 2, 0.6, 0.07, 4);
  }
  for (const s of r.segs) tone(s.start + 0.02, 660, 0.12, 0.12, 30);                  // pop ao mudar de cena
  for (const d of r.dings) { tone(d, 1318.5, 0.6, 0.12, 6); tone(d + 0.08, 1760, 0.6, 0.1, 6); } // ding
  for (let i = Math.floor((dur - 0.6) * SR); i < n; i++) buf[i] *= (n - i) / (0.6 * SR);   // acaba suave
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.max(-1, Math.min(1, buf[i])) * 32000 | 0, i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(file, Buffer.concat([h, pcm]));
}

// ---------- Fotogramas ----------
const only = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const r of REELS.filter((r) => !only || r.id.startsWith(only))) {
  rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
  await p.setContent(page(r), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const total = Math.round(r.segs.at(-1).end * FPS);
  for (let f = 0; f < total; f++) {
    await p.evaluate((t) => {
      for (const s of document.querySelectorAll(".seg")) {
        const a = +s.dataset.start, e = +s.dataset.end, on = t >= a && t < e;
        s.style.display = on ? "flex" : "none";
        if (!on) continue;
        s.style.opacity = Math.min(1, (t - a) / 0.18 + (a === 0 ? 1 : 0), (e - t) / 0.18 + (s.nextElementSibling ? 0 : 1));
        for (const an of s.getAnimations({ subtree: true })) { an.pause(); an.currentTime = (t - a) * 1000; }
      }
    }, f / FPS);
    await p.screenshot({ path: `${TMP}${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
  }
  audio(r, `${TMP}audio.wav`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", `${TMP}%04d.jpg`, "-i", `${TMP}audio.wav`,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "23", "-r", String(FPS), "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-shortest", `${OUT}${r.id}.mp4`]);
  console.log(`${r.id}.mp4 (${(total / FPS).toFixed(1)} s)`);
}
await b.close();
rmSync(TMP, { recursive: true, force: true });
