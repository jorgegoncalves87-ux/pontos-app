// Gera as imagens dos posts do Instagram (1080×1350) a partir da mascote, das cenas e do logo. Uso: node social/gerador/gerar.mjs (precisa do Playwright); as imagens saem em social/gerador/out2/.
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = "/home/user/pontos-app";
const OUT = new URL("./out2/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const { sceneSvg } = await import(`${APP}/scenes.js`);
const SCENE_CSS = (() => { const css = readFileSync(`${APP}/style.css`, "utf8"); return ".dance svg g { transform-box: fill-box; }\n" + css.slice(css.indexOf("/* Cenas da mascote")); })();
const MASCOT = readFileSync(`${APP}/illustrations/mascote.svg`, "utf8");
const LOGO_ICON = readFileSync(`${APP}/illustrations/logo-icon.svg`, "utf8");
const LOGO_TXT = readFileSync(`${APP}/illustrations/logo-texto.svg`, "utf8");
const FILL = 'fill="currentColor" fill-opacity=".16"';
const ic = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICON = {
  kids: ic(`<circle cx="9" cy="8" r="3.3" ${FILL}/><circle cx="16.6" cy="9.6" r="2.6" ${FILL}/><path d="M3.4 19.5c.6-3.4 2.9-5.3 5.6-5.3s5 1.9 5.6 5.3"/><path d="M14.6 15c.6-.4 1.3-.6 2-.6 2.2 0 3.7 1.5 4.1 4.6"/>`),
  tasks: ic(`<rect x="5" y="4.5" width="14" height="16.5" rx="3.5" ${FILL}/><rect x="9" y="2.5" width="6" height="4" rx="1.6" fill="#fff"/><path d="M8.6 12.6l1.9 1.9 3.9-3.9"/><path d="M9 17.4h6"/>`),
  rewards: ic(`<rect x="4" y="11" width="16" height="10" rx="2.5" ${FILL}/><rect x="2.8" y="7.6" width="18.4" height="4" rx="1.6"/><path d="M12 7.6V21"/><path d="M12 7.6C10.6 4.4 6.8 3.8 6.8 6.2c0 1.4 2.4 1.4 5.2 1.4zM12 7.6c1.4-3.2 5.2-3.8 5.2-1.4 0 1.4-2.4 1.4-5.2 1.4z"/>`),
  validate: ic(`<rect x="3" y="3" width="18" height="18" rx="6" ${FILL}/><path d="M8 12.4l2.7 2.7L16.2 9.4"/>`),
  phone: ic(`<rect x="6.5" y="2.5" width="11" height="19" rx="3" ${FILL}/><path d="M10.5 18h3"/>`),
  bell: ic(`<path d="M6.2 16.5V11a5.8 5.8 0 0 1 11.6 0v5.5l1.5 2H4.7z" ${FILL}/><path d="M10 20.6a2.2 2.2 0 0 0 4 0"/>`),
  shield: ic(`<path d="M12 2.8l7.5 3v5.6c0 4.8-3.2 8.4-7.5 9.8-4.3-1.4-7.5-5-7.5-9.8V5.8z" ${FILL}/><path d="M8.6 12.2l2.4 2.4 4.4-4.6"/>`),
  question: ic(`<circle cx="12" cy="12" r="9" ${FILL}/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .8-1 1.5v.6"/><path d="M12 17.2h.01"/>`),
  star: ic(`<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" ${FILL}/>`),
};
const C = { cream: "#fffdf8", teal: "#1fa5a8", tealD: "#13878a", dark: "#2f3657", muted: "#646b8a", mint: "#d8f3e8", sky: "#e2f3ff", butter: "#fff1bd", pink: "#ffe1e8", lilac: "#ece6ff", coral: "#ff8f7a" };
const scene = (id) => sceneSvg(id, MASCOT);

const logoBar = `<div class="logo">${LOGO_ICON}${LOGO_TXT}</div>`;
const foot = (txt = "saskids.net") => `<div class="foot"><span>${txt}</span></div>`;
const post = (id, bg, body) => `<section id="${id}" class="post" style="background:${bg}">${logoBar}${body}</section>`;

const sceneP = (id, bg, h1, sceneId, lead) => post(id, bg, `<h1>${h1}</h1><div class="art scene dance">${scene(sceneId)}</div><p class="lead">${lead}</p>${foot()}`);
const list = (items) => `<ul class="prizes">${items.map(([t, p]) => `<li><span>${t}</span><b>${p}</b></li>`).join("")}</ul>`;
const POSTS = [
  sceneP("p10", `linear-gradient(170deg, ${C.sky}, ${C.cream} 75%)`, "Trabalhos de casa<br>feitos? <em>+10 pontos</em>", "tpc", "As tarefas que dão mais trabalho valem mais pontos. Tu decides quanto."),
  post("p11", C.cream, `<h1>Quantos pontos<br>dar a cada tarefa?</h1>
    ${list([["Tarefas rápidas<small>pôr a roupa no cesto, arrumar os sapatos</small>", `3 ${ICON.star}`], ["Do dia a dia<small>fazer a cama, lavar os dentes, pôr a mesa</small>", `5 ${ICON.star}`], ["Que dão trabalho<small>trabalhos de casa, arrumar o quarto, ler</small>", `10 ${ICON.star}`], ["As grandes<small>estudar para um teste</small>", `15 ${ICON.star}`]])}
    <p class="lead small">Uma criança que faça tudo ganha 30 a 50 pontos por dia.</p>${foot()}`),
  sceneP("p12", `linear-gradient(170deg, ${C.butter}, ${C.cream} 75%)`, "O cão já comeu?<br><em>+5 pontos</em>", "animal", "Cuidar do animal lá de casa é das primeiras responsabilidades a sério."),
  post("p13", C.cream, `<h1>Cada filho<br>com o <em>seu PIN</em></h1>
    <ul class="feats">${[[ICON.kids, C.mint, "Um perfil para cada filho, com foto ou emoji"], [ICON.phone, C.sky, "Cada um entra no próprio telemóvel ou tablet"], [ICON.shield, C.pink, "Ninguém marca tarefas no lugar do irmão"], [ICON.validate, C.butter, "O pai/mãe tem um PIN só seu para validar"]]
      .map(([i, bg, t]) => `<li><span class="ic" style="background:${bg}">${i}</span><b>${t}</b></li>`).join("")}</ul>
    <div class="art corner">${MASCOT}</div>${foot()}`),
  sceneP("p14", `linear-gradient(170deg, ${C.lilac}, ${C.cream} 75%)`, "20 minutos de leitura?<br><em>+10 pontos</em>", "ler", "Uma página de cada vez. A mascote vira as páginas com eles."),
  post("p15", C.cream, `<h1>Prémios que<br><em>não custam dinheiro</em></h1>
    ${list([["Escolher o jantar de um dia", `80 ${ICON.star}`], ["Deitar 30 min mais tarde ao fim de semana", `60 ${ICON.star}`], ["Noite de jogos de tabuleiro", `100 ${ICON.star}`], ["Pequeno-almoço na cama", `100 ${ICON.star}`], ["Uma tarde a sós com o pai ou a mãe", `300 ${ICON.star}`]])}
    <p class="lead small">Muitas vezes, o melhor prémio é tempo juntos.</p>${foot()}`),
  sceneP("p16", `linear-gradient(170deg, ${C.mint}, ${C.cream} 75%)`, "Quarto arrumado?<br><em>+10 pontos</em>", "quarto", "Livros no lugar, brinquedos na caixa. E brilha tudo."),
  post("p17", C.cream, `<h1>Tarefas certas<br>para <em>cada idade</em></h1>
    ${list([["A partir dos 4 anos<small>arrumar os brinquedos, vestir-se sozinho</small>", "4+"], ["A partir dos 7 anos<small>ajudar com a loiça, cumprir o tempo de ecrã</small>", "7+"], ["A partir dos 10 anos<small>estender a roupa, aspirar uma divisão</small>", "10+"]])}
    <p class="lead small">Ao adicionares um filho, a app já escolhe as tarefas para a idade dele.</p>${foot()}`),
  sceneP("p18", `linear-gradient(170deg, ${C.pink}, ${C.cream} 75%)`, "Mesa posta?<br><em>+5 pontos</em>", "pormesa", "Prato, garfo, faca e copo. O jantar começa com uma ajuda."),
  post("p19", C.cream, `<h1>3 regras para os<br>pontos <em>resultarem</em></h1>
    <ol class="steps">${[[ICON.rewards, C.pink, "Combinem os prémios juntos", "Se os filhos ajudarem a escolher, esforçam-se mais."], [ICON.validate, C.mint, "Validem no próprio dia", "A recompensa tem de vir logo a seguir."], [ICON.star, C.butter, "Elogiem o esforço", "Os pontos ajudam; o elogio conta mais."]]
      .map(([i, bg, t, d], n) => `<li><span class="ic" style="background:${bg}">${i}</span><span class="n">${n + 1}</span><div><b>${t}</b><span>${d}</span></div></li>`).join("")}</ol>${foot()}`),
  sceneP("p20", `linear-gradient(170deg, ${C.sky}, ${C.cream} 75%)`, "Mochila pronta<br>para amanhã? <em>+5</em>", "mochila", "Livros, estojo e lanche, na véspera. Manhãs sem correrias."),
  post("p21", C.cream, `<h1>Lembretes<br><em>à hora certa</em></h1>
    <ul class="feats">${[[ICON.bell, C.pink, "O pai/mãe recebe um aviso quando um filho marca uma tarefa"], [ICON.tasks, C.mint, "Ao fim do dia, os filhos são lembrados das tarefas por marcar"], [ICON.rewards, C.butter, "Os pedidos de prémios chegam logo ao telemóvel"]]
      .map(([i, bg, t]) => `<li><span class="ic" style="background:${bg}">${i}</span><b>${t}</b></li>`).join("")}</ul>
    <div class="art corner">${MASCOT}</div>${foot()}`),
  sceneP("p22", `linear-gradient(170deg, ${C.butter}, ${C.cream} 75%)`, "Missão de fim de semana:<br><em>lavar o carro</em>", "carro", "Missões são desafios com prazo. Esta vale 25 pontos."),
  sceneP("p23", `linear-gradient(170deg, ${C.lilac}, ${C.cream} 75%)`, "Cama à hora<br>combinada? <em>+5</em>", "deitar", "Boa noite, sem negociações. Até amanhã! 🌙"),
];
const HIGHLIGHTS = [];


const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: Nunito, Arial, sans-serif; color: ${C.dark}; background: #ddd; }
.post { width: 1080px; height: 1350px; position: relative; overflow: hidden; padding: 80px 84px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 34px; }
.logo { display: flex; align-items: center; gap: 16px; height: 64px; }
.logo svg:first-child { width: 64px; height: 64px; } .logo svg:last-child { height: 44px; width: auto; }
h1 { font-size: 92px; line-height: 1.04; font-weight: 900; letter-spacing: -1.5px; text-wrap: balance; }
h1 em { font-style: normal; color: ${C.teal}; }
.q { color: ${C.coral}; } .q.ok { color: ${C.teal}; }
.lead { font-size: 40px; line-height: 1.3; color: ${C.muted}; font-weight: 700; max-width: 860px; text-wrap: balance; }
.lead.small { font-size: 34px; }
.art { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; }
.art svg { max-height: 100%; width: auto; height: 100%; overflow: visible; }
.art.scene svg { width: 100%; height: auto; max-height: 100%; }
.art.corner { position: absolute; right: -30px; bottom: 150px; width: 280px; height: 350px; flex: none; }
.foot { margin-top: auto; }
.foot span { display: inline-block; background: ${C.teal}; color: #fff; font-weight: 900; font-size: 36px; padding: 20px 44px; border-radius: 999px; }
.steps { list-style: none; padding: 0; display: grid; gap: 26px; width: 100%; text-align: left; }
.steps li { position: relative; display: flex; align-items: center; gap: 30px; background: #fff; border: 4px solid #f1eee6; border-radius: 40px; padding: 28px 34px; }
.steps .ic, .feats .ic { width: 120px; height: 120px; flex: none; border-radius: 34px; display: grid; place-items: center; color: ${C.tealD}; }
.steps .ic svg, .feats .ic svg { width: 70px; height: 70px; }
.steps .n { position: absolute; left: 14px; top: 12px; width: 44px; height: 44px; border-radius: 50%; background: ${C.teal}; color: #fff; font-weight: 900; font-size: 26px; display: grid; place-items: center; }
.steps b { display: block; font-size: 46px; font-weight: 900; } .steps div span { font-size: 32px; color: ${C.muted}; font-weight: 700; }
.prizes { list-style: none; padding: 0; width: 100%; display: grid; gap: 22px; }
.prizes small { display: block; font-size: 30px; font-weight: 700; color: ${C.muted}; margin-top: 4px; }
.prizes li { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 4px solid #f1eee6; border-radius: 36px; padding: 22px 40px; font-size: 42px; font-weight: 800; text-align: left; }
.prizes li:nth-child(odd) { background: ${C.butter}; border-color: transparent; }
.prizes b { display: flex; align-items: center; gap: 10px; color: ${C.tealD}; font-weight: 900; white-space: nowrap; } .prizes b svg { width: 46px; height: 46px; color: #f2b84b; }
.feats { list-style: none; padding: 0; width: 100%; display: grid; gap: 26px; text-align: left; }
.feats li { display: flex; align-items: center; gap: 30px; font-size: 44px; }
.feats b { font-weight: 800; max-width: 520px; }
.feats.tight li { gap: 24px; } .feats.tight b { max-width: 820px; font-size: 42px; }
.feats .dot { width: 26px; height: 26px; border-radius: 50%; background: ${C.teal}; flex: none; }
.shield { width: 280px; height: 280px; color: ${C.teal}; } .shield svg { width: 100%; height: 100%; }
.phone { width: 360px; height: 560px; border-radius: 64px; background: ${C.dark}; padding: 22px; flex: none; }
.phone .screen { width: 100%; height: 100%; border-radius: 46px; background: linear-gradient(170deg, ${C.sky}, #fff); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; font-size: 34px; font-weight: 900; }
.phone .screen svg { width: 150px; height: 150px; }
.mini { list-style: none; padding: 0; display: grid; gap: 16px; text-align: left; font-size: 38px; font-weight: 800; }
.mini b { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: ${C.teal}; color: #fff; margin-right: 16px; font-size: 30px; }
.hl { width: 1080px; height: 1920px; display: grid; place-items: center; }
.hl-ic { width: 560px; height: 560px; border-radius: 50%; background: #fff; display: grid; place-items: center; color: ${C.tealD}; box-shadow: 0 20px 60px rgba(47,54,87,.12); }
.hl-ic svg { width: 300px; height: 300px; }
#avatar { width: 1080px; height: 1080px; overflow: hidden; display: grid; place-items: center; background: linear-gradient(135deg, #c9f0e6, #cfe6ff); }
#avatar svg { width: 1080px; height: 1080px; flex: none; }
${SCENE_CSS}
#post-1 h1 { font-size: 86px; }
</style></head><body>
${POSTS.join("")}${HIGHLIGHTS.join("")}
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 2000 } });
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(3300); // deixa as cenas chegarem ao fim da animação
for (const id of await p.$$eval("section", (s) => s.map((e) => e.id))) {
  await p.locator(`#${id}`).screenshot({ path: `${OUT}${id}.png` });
}
await b.close();
console.log("ok");
