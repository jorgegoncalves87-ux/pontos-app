// Cenas da mascote: uma animação para cada tarefa sugerida (TASK_IDEAS em app.js).
// O palco tem 460×380; a mascote (300×370) fica à direita, em x = 150, e os objetos à esquerda.
// Cada cena: pose (classe CSS que mexe braços, pernas e cabeça), back (atrás da mascote),
// front (à frente) e head (dentro da cabeça, para se mexer com ela).
// As tarefas que não vêm das sugestões usam a dança normal (mascotDance sem cena).

const C = { teal: "#1fa5a8", dark: "#2f3657", wood: "#c9935f", woodD: "#a8744a", yellow: "#ffd25e", pink: "#ff9fb2",
  lilac: "#b9a6f0", mint: "#7fd8b5", sky: "#cfeeff", red: "#ff7a6b", white: "#ffffff", grey: "#9aa0bb", skin: "#ffd3b4", bg: "#fffdf8" };

/** Objeto que voa (em arco) desde (dx, dy) até à posição onde está desenhado. */
const toss = (inner, dx, dy, d) => `<g class="p s-toss" style="--dx:${dx}px;--dy:${dy}px;--d:${d}s">${inner}</g>`;
/** Objeto que aparece a crescer. */
const pop = (inner, d) => `<g class="p s-pop" style="--d:${d}s">${inner}</g>`;
/** Objeto que cai de cima e assenta. */
const drop = (inner, d, h = 160) => `<g class="p s-drop" style="--d:${d}s;--h:-${h}px">${inner}</g>`;
/** Brilho de "ficou feito". */
const sparkle = (x, y, d, s = 1) => pop(`<path d="M${x} ${y - 16 * s} L${x + 4 * s} ${y - 4 * s} L${x + 16 * s} ${y} L${x + 4 * s} ${y + 4 * s} L${x} ${y + 16 * s} L${x - 4 * s} ${y + 4 * s} L${x - 16 * s} ${y} L${x - 4 * s} ${y - 4 * s} Z" fill="${C.yellow}"/>`, d);
const sparkles = (pts) => pts.map(([x, y, d, s]) => sparkle(x, y, d, s)).join("");
/** Bolhas a subir. */
const bubbles = (pts) => pts.map(([x, y, r, d]) => `<circle class="p s-rise" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${C.sky}" stroke-width="2"/>`).join("");
const table = (x, w, y = 262) => `<rect x="${x}" y="${y}" width="${w}" height="12" rx="5" fill="${C.wood}"/>
  <rect x="${x + 10}" y="${y + 10}" width="9" height="${348 - y - 10}" rx="3" fill="${C.woodD}"/><rect x="${x + w - 19}" y="${y + 10}" width="9" height="${348 - y - 10}" rx="3" fill="${C.woodD}"/>`;
const tshirt = (x, y, fill, s = 1) => `<path d="M${x - 14 * s} ${y} L${x - 30 * s} ${y + 10 * s} L${x - 24 * s} ${y + 22 * s} L${x - 16 * s} ${y + 18 * s} L${x - 16 * s} ${y + 46 * s} L${x + 16 * s} ${y + 46 * s} L${x + 16 * s} ${y + 18 * s} L${x + 24 * s} ${y + 22 * s} L${x + 30 * s} ${y + 10 * s} L${x + 14 * s} ${y} Q${x} ${y + 10 * s} ${x - 14 * s} ${y} Z" fill="${fill}" stroke="rgba(0,0,0,.08)" stroke-width="2" stroke-linejoin="round"/>`;
const sock = (x, y, fill) => `<path d="M${x} ${y} h14 v22 q0 10 -10 10 h-12 q-6 0 -6 -6 q0 -6 6 -6 h8 Z" fill="${fill}"/><rect x="${x}" y="${y}" width="14" height="6" fill="#fff" opacity=".6"/>`;
const book = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/><rect x="${x + 3}" y="${y + 6}" width="${w - 6}" height="3" fill="#fff" opacity=".6"/>`;
const zzz = [0, 0.8, 1.6].map((d, i) => `<text class="p s-zzz" style="--d:${d}s" x="${372 + i * 18}" y="${120 - i * 6}" font-size="${26 + i * 6}" font-weight="800" fill="${C.lilac}" font-family="Nunito,Arial,sans-serif">Z</text>`).join("");

export const SCENES = {
  // Fazer a cama: o lençol passa de amarrotado a esticado.
  cama: { pose: "reach", back: `
    <rect x="8" y="196" width="22" height="140" rx="8" fill="${C.woodD}"/>
    <rect x="18" y="262" width="176" height="46" rx="10" fill="${C.wood}"/><rect x="24" y="300" width="12" height="40" rx="4" fill="${C.woodD}"/><rect x="176" y="300" width="12" height="40" rx="4" fill="${C.woodD}"/>
    <rect x="26" y="244" width="166" height="24" rx="10" fill="#fff" stroke="#eee6da" stroke-width="2"/>
    <ellipse cx="62" cy="242" rx="28" ry="13" fill="${C.sky}"/>
    <g class="p s-blanket"><rect x="82" y="238" width="116" height="40" rx="10" fill="${C.lilac}"/><path d="M90 252 h96" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/></g>
    ${sparkles([[150, 220, 1.7], [196, 230, 1.9, 0.7]])}` },

  // Lavar os dentes: escova a mexer e espuma.
  dentes: { pose: "brush", front: `
    <g class="s-brush"><rect x="322" y="150" width="46" height="9" rx="4" fill="${C.teal}" transform="rotate(-18 345 154)"/>
    <rect x="306" y="152" width="20" height="10" rx="3" fill="#fff" stroke="${C.sky}" stroke-width="2"/></g>
    ${bubbles([[300, 150, 6, 0.2], [318, 140, 5, 0.6], [290, 146, 4, 1.0], [324, 150, 7, 1.4], [306, 138, 5, 1.8]])}` },

  // Vestir-se: a camisola cai do alto e veste a mascote.
  vestir: { pose: "up", front: `
    ${drop(tshirt(300, 172, C.mint, 1.55), 0.3, 260)}
    ${sparkles([[236, 190, 1.4], [366, 186, 1.6, 0.8]])}`, back: `
    <rect x="20" y="130" width="130" height="214" rx="10" fill="${C.wood}"/><rect x="30" y="140" width="52" height="194" rx="6" fill="#e3b47c"/><rect x="88" y="140" width="52" height="194" rx="6" fill="#e3b47c"/>
    <circle cx="74" cy="236" r="4" fill="${C.woodD}"/><circle cx="96" cy="236" r="4" fill="${C.woodD}"/>
    ${sock(100, 300, C.pink)}` },

  // Arrumar os brinquedos: bola, cubo e urso saltam para a caixa.
  brinquedos: { pose: "reach", back: `
    ${toss(`<circle cx="70" cy="272" r="20" fill="${C.red}"/><path d="M52 266 q18 12 36 0" stroke="#fff" stroke-width="4" fill="none"/>`, 150, 60, 0.2)}
    ${toss(`<rect x="96" y="258" width="34" height="34" rx="6" fill="${C.teal}"/><text x="113" y="284" text-anchor="middle" font-size="24" font-weight="900" fill="#fff" font-family="Arial">A</text>`, 110, 70, 0.9)}
    ${toss(`<circle cx="138" cy="262" r="14" fill="${C.wood}"/><circle cx="128" cy="250" r="6" fill="${C.wood}"/><circle cx="148" cy="250" r="6" fill="${C.wood}"/><circle cx="134" cy="260" r="2" fill="${C.dark}"/><circle cx="142" cy="260" r="2" fill="${C.dark}"/>`, 70, 60, 1.6)}`,
  front: `<rect x="30" y="278" width="140" height="66" rx="10" fill="${C.yellow}"/><rect x="30" y="278" width="140" height="14" rx="6" fill="#f2b84b"/>
    <path d="M60 310 l10 8 l14 -14" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" class="p s-pop" style="--d:2.3s"/>` },

  // Roupa suja no cesto.
  cesto: { pose: "reach", back: `
    ${toss(tshirt(90, 250, C.pink, 0.9), 150, 50, 0.2)}
    ${toss(sock(110, 262, C.lilac), 110, 60, 0.9)}
    ${toss(sock(70, 266, C.teal), 140, 60, 1.6)}
    ${sparkles([[100, 240, 2.3], [160, 256, 2.5, 0.7]])}`,
  front: `<path d="M34 280 h132 l-12 64 h-108 Z" fill="#e3b47c"/><path d="M38 292 h124 M42 310 h116 M46 328 h108" stroke="#c9935f" stroke-width="4"/>
    <rect x="28" y="274" width="144" height="12" rx="6" fill="${C.wood}"/>` },

  // Pôr a mesa: prato, garfo, faca e copo aparecem por ordem.
  pormesa: { pose: "reach", back: `${table(10, 190)}
    ${pop(`<ellipse cx="100" cy="258" rx="40" ry="9" fill="#fff" stroke="${C.sky}" stroke-width="3"/><ellipse cx="100" cy="257" rx="24" ry="5" fill="none" stroke="${C.sky}" stroke-width="2"/>`, 0.2)}
    ${pop(`<path d="M46 228 v32 M40 228 v10 q6 8 12 0 v-10" stroke="${C.grey}" stroke-width="4" fill="none" stroke-linecap="round"/>`, 0.7)}
    ${pop(`<path d="M154 228 q8 6 0 20 v12" stroke="${C.grey}" stroke-width="5" fill="none" stroke-linecap="round"/>`, 1.1)}
    ${pop(`<path d="M168 226 h22 l-3 34 h-16 Z" fill="${C.sky}" stroke="#9fd6f0" stroke-width="2"/><rect x="171" y="240" width="16" height="18" fill="#9fd6f0" opacity=".7"/>`, 1.5)}
    ${sparkles([[100, 210, 2.1]])}` },

  // Levantar a mesa: a loiça sai da mesa e ela fica limpa.
  levantarmesa: { pose: "reach", back: `${table(10, 190)}
    <g class="p s-away" style="--d:0.3s"><ellipse cx="80" cy="258" rx="38" ry="9" fill="#fff" stroke="${C.sky}" stroke-width="3"/><circle cx="70" cy="254" r="5" fill="${C.red}"/><circle cx="88" cy="255" r="4" fill="${C.mint}"/></g>
    <g class="p s-away" style="--d:0.9s"><path d="M140 226 h22 l-3 34 h-16 Z" fill="${C.sky}" stroke="#9fd6f0" stroke-width="2"/></g>
    <g class="p s-away" style="--d:1.4s"><path d="M178 232 v28 M172 232 v10 q6 8 12 0 v-10" stroke="${C.grey}" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    ${sparkles([[60, 236, 2.0], [140, 232, 2.2, 0.8], [104, 220, 2.4, 0.6]])}` },

  // Comer a fruta: a maçã vai à boca e leva dentadas.
  fruta: { pose: "eat", front: `
    <g class="s-eatfood"><circle cx="394" cy="178" r="17" fill="${C.red}"/><path d="M394 162 q2 -8 8 -10" stroke="${C.woodD}" stroke-width="3" fill="none"/><ellipse cx="404" cy="158" rx="7" ry="4" fill="${C.mint}"/>
    <circle class="p s-pop" style="--d:0.95s" cx="380" cy="172" r="7" fill="${C.bg}"/><circle class="p s-pop" style="--d:1.95s" cx="382" cy="186" r="7" fill="${C.bg}"/></g>
    <g class="p s-zzz" style="--d:1s"><path d="M250 120 q-8 -10 0 -14 q8 -4 10 6 q2 -10 10 -6 q8 4 0 14 l-10 10 Z" fill="${C.pink}"/></g>`, back: `
    ${table(10, 150, 290)}<path d="M24 290 q60 -26 120 0 Z" fill="#fff" stroke="${C.sky}" stroke-width="3"/>
    <path d="M58 276 l26 -6 l-4 8 Z" fill="#ff9a3c"/><circle cx="104" cy="278" r="9" fill="${C.mint}"/><circle cx="116" cy="276" r="8" fill="${C.yellow}"/>` },

  // Tomar banho: na banheira, com espuma, bolhas e um patinho.
  banho: { pose: "bath", back: `
    <path d="M126 70 v-20 q0 -12 12 -12 h40" stroke="${C.grey}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M114 72 h26 l-4 10 h-18 Z" fill="${C.grey}"/>
    ${[0, 0.3, 0.6, 0.9].map((d, i) => `<path class="p s-fall" style="--d:${d}s" d="M${118 + i * 6} 90 q3 8 0 10 q-3 -2 0 -10 Z" fill="#7cc8f0"/>`).join("")}`,
  front: `<path d="M150 262 h300 v18 q0 54 -60 60 h-180 q-60 -6 -60 -60 Z" fill="#fff" stroke="${C.sky}" stroke-width="4"/>
    <rect x="142" y="254" width="316" height="16" rx="8" fill="${C.sky}"/>
    <path d="M190 340 l-8 14 M410 340 l8 14" stroke="${C.grey}" stroke-width="7" stroke-linecap="round"/>
    ${[[180, 252, 16], [210, 246, 20], [246, 250, 15], [360, 248, 18], [396, 252, 16], [426, 248, 14]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${C.sky}" stroke-width="2"/>`).join("")}
    <g class="p s-bob"><ellipse cx="420" cy="244" rx="20" ry="12" fill="${C.yellow}"/><circle cx="430" cy="228" r="10" fill="${C.yellow}"/><path d="M438 228 l9 2 l-9 3 Z" fill="#ff9a3c"/><circle cx="432" cy="225" r="2" fill="${C.dark}"/></g>
    ${[[250, 108, 9], [270, 98, 12], [296, 94, 14], [322, 98, 12], [344, 106, 9]].map(([x, y, r]) => `<circle class="s-foam" cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${C.sky}" stroke-width="2"/>`).join("")}
    ${bubbles([[200, 230, 8, 0.2], [380, 226, 6, 0.7], [240, 232, 5, 1.2], [350, 230, 9, 1.6], [300, 236, 6, 2.0]])}` },

  // Ir para a cama: lua, estrelas, olhos fechados e "Z Z Z".
  deitar: { pose: "sleep", back: `
    <path d="M84 36 a40 40 0 1 0 40 56 a32 32 0 1 1 -40 -56 Z" fill="${C.yellow}"/>
    ${[[30, 150, 0], [170, 60, 0.5], [60, 220, 1], [190, 150, 1.5]].map(([x, y, d]) => `<path class="p s-twinkle" style="--d:${d}s" d="M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z" fill="${C.yellow}"/>`).join("")}
    <rect x="20" y="300" width="180" height="40" rx="12" fill="${C.lilac}"/><ellipse cx="60" cy="296" rx="34" ry="13" fill="#fff"/>`,
  front: zzz,
  head: `<ellipse cx="127" cy="131" rx="11" ry="13" fill="${C.skin}"/><ellipse cx="173" cy="131" rx="11" ry="13" fill="${C.skin}"/>
    <path d="M118 133 q9 7 18 0 M164 133 q9 7 18 0" stroke="${C.dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M128 150 Q150 186 172 150 Z" fill="${C.skin}"/><path d="M140 158 q10 6 20 0" stroke="${C.dark}" stroke-width="4" fill="none" stroke-linecap="round"/>` },

  // Sapatos e casaco: o casaco vai para o cabide e os sapatos para o lugar.
  sapatos: { pose: "reach", back: `
    <rect x="66" y="100" width="10" height="244" rx="5" fill="${C.woodD}"/><ellipse cx="71" cy="344" rx="34" ry="7" fill="${C.woodD}"/>
    <path d="M71 116 q-24 -4 -26 10 M71 116 q24 -4 26 10" stroke="${C.woodD}" stroke-width="6" fill="none" stroke-linecap="round"/>
    ${toss(`<path d="M86 126 q-18 0 -22 16 l-10 78 h22 l4 -30 l4 30 h22 l-6 -78 q-2 -16 -14 -16 Z" fill="${C.red}"/><path d="M80 130 v60" stroke="#fff" stroke-width="3" opacity=".5"/>`, 180, 80, 0.2)}
    <rect x="110" y="338" width="90" height="8" rx="4" fill="${C.lilac}"/>
    <g class="p s-slide" style="--d:1.2s"><path d="M120 324 q0 -12 12 -12 h8 q4 10 20 12 v12 h-40 Z" fill="${C.teal}"/><path d="M160 324 q0 -12 12 -12 h8 q4 10 20 12 v12 h-40 Z" fill="${C.teal}"/></g>
    ${sparkles([[150, 300, 2.0, 0.7]])}` },

  // Dar comida ao animal: a ração cai na tigela e o cão abana a cauda.
  animal: { pose: "pour", back: `
    <g class="p s-wag" style="transform-origin: 30px 300px"><path d="M30 300 q-26 -10 -20 -40" stroke="#e0a96d" stroke-width="10" fill="none" stroke-linecap="round"/></g>
    <ellipse cx="70" cy="310" rx="46" ry="30" fill="#e0a96d"/><rect x="40" y="320" width="14" height="28" rx="6" fill="#e0a96d"/><rect x="82" y="320" width="14" height="28" rx="6" fill="#e0a96d"/>
    <g class="p s-nod"><circle cx="108" cy="272" r="28" fill="#e0a96d"/><ellipse cx="90" cy="262" rx="10" ry="20" fill="#b8814d" transform="rotate(20 90 262)"/>
    <circle cx="114" cy="266" r="4" fill="${C.dark}"/><ellipse cx="132" cy="280" rx="7" ry="5" fill="${C.dark}"/><path d="M122 292 q4 10 10 0" fill="${C.pink}"/></g>
    <path d="M130 330 h62 l-8 18 h-46 Z" fill="${C.teal}"/>
    ${[0, 0.35, 0.7, 1.05, 1.4, 1.75].map((d, i) => `<circle class="p s-fall" style="--d:${d}s" cx="${160 + (i % 3) * 6}" cy="220" r="5" fill="${C.woodD}"/>`).join("")}`,
  front: `<g transform="rotate(-30 178 200)"><rect x="160" y="170" width="38" height="50" rx="6" fill="${C.yellow}"/><circle cx="179" cy="194" r="9" fill="#fff"/><path d="M175 192 q4 -6 8 0" stroke="${C.woodD}" stroke-width="3" fill="none"/></g>` },

  // Preparar a mochila: livro, estojo e lanche entram e o fecho fecha.
  mochila: { pose: "reach", back: `
    ${toss(book(64, 222, 46, 60, C.red), 150, 40, 0.2)}
    ${toss(`<rect x="108" y="226" width="56" height="18" rx="9" fill="${C.yellow}"/>`, 110, 40, 0.8)}
    ${toss(`<rect x="94" y="230" width="36" height="28" rx="6" fill="${C.mint}"/>`, 130, 50, 1.4)}
    ${sparkles([[108, 214, 2.6], [176, 236, 2.8, 0.7]])}`,
  front: `<path d="M44 250 q0 -24 24 -24 h80 q24 0 24 24 v84 q0 10 -10 10 h-108 q-10 0 -10 -10 Z" fill="${C.teal}"/>
    <rect x="66" y="290" width="84" height="40" rx="10" fill="#13878a"/>
    <path class="p s-zip" d="M50 252 H166" stroke="${C.yellow}" stroke-width="5" stroke-linecap="round" stroke-dasharray="116" stroke-dashoffset="116" style="--d:2s"/>` },

  // Trabalhos de casa: o lápis escreve no caderno e aparece um visto.
  tpc: { pose: "write", back: `${table(0, 210)}
    <rect x="40" y="244" width="130" height="20" rx="4" fill="#fff" stroke="#e8e3f7" stroke-width="2"/>`,
  front: `<g class="s-pencil"><path d="M170 242 l-30 -30 l8 -8 l30 30 l-2 10 Z" fill="${C.yellow}"/><path d="M178 234 l-2 10 l-10 -2 Z" fill="${C.dark}"/></g>
    ${[0, 0.7, 1.4].map((d, i) => `<path class="p s-zip" style="--d:${d}s" d="M${52} ${250 + i * 5} h96" stroke="${C.grey}" stroke-width="2" stroke-dasharray="96" stroke-dashoffset="96"/>`).join("")}
    ${pop(`<path d="M80 196 l14 14 l28 -30" stroke="${C.teal}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, 2.2)}` },

  // Ler 20 minutos: o livro aberto vira páginas.
  ler: { pose: "read", front: `
    <path d="M300 214 q-34 -12 -66 0 v62 q32 -12 66 0 Z" fill="#fff" stroke="${C.sky}" stroke-width="3"/>
    <path d="M300 214 q34 -12 66 0 v62 q-32 -12 -66 0 Z" fill="#fff" stroke="${C.sky}" stroke-width="3"/>
    <path d="M244 228 h44 M244 240 h44 M244 252 h36 M312 228 h44 M312 240 h44 M312 252 h36" stroke="${C.grey}" stroke-width="3" opacity=".5"/>
    <g class="s-page"><path d="M300 214 q34 -12 66 0 v62 q-32 -12 -66 0 Z" fill="#f7f4ff" stroke="${C.sky}" stroke-width="3"/></g>
    <path d="M226 278 q74 -20 148 0 v10 q-74 -18 -148 0 Z" fill="${C.teal}"/>`, back: `
    ${[[230, 120, 0.4], [370, 110, 1.2], [214, 180, 2.0]].map(([x, y, d]) => `<text class="p s-zzz" style="--d:${d}s" x="${x}" y="${y}" font-size="26" fill="${C.teal}" font-weight="900" font-family="Arial">★</text>`).join("")}` },

  // Arrumar o quarto: os livros endireitam-se na prateleira e tudo brilha.
  quarto: { pose: "reach", back: `
    <rect x="16" y="200" width="170" height="10" rx="4" fill="${C.woodD}"/><rect x="16" y="120" width="170" height="10" rx="4" fill="${C.woodD}"/>
    ${[[24, C.red, 0.2], [50, C.teal, 0.5], [76, C.yellow, 0.8], [102, C.lilac, 1.1], [128, C.mint, 1.4]].map(([x, f, d], i) =>
      `<g class="p s-straight" style="--d:${d}s;--r:${i % 2 ? 24 : -22}deg">${book(x, 136, 22, 64, f)}</g>`).join("")}
    <g class="p s-straight" style="--d:1.7s;--r:18deg"><rect x="60" y="40" width="70" height="54" rx="6" fill="#fff" stroke="${C.wood}" stroke-width="6"/><path d="M70 84 l18 -20 l12 12 l8 -8 l14 16 Z" fill="${C.mint}"/><circle cx="114" cy="58" r="6" fill="${C.yellow}"/></g>
    ${toss(sock(90, 300, C.pink), 140, 30, 0.6)}${toss(`<circle cx="140" cy="318" r="16" fill="${C.red}"/>`, 100, 20, 1.2)}
    ${sparkles([[40, 240, 2.1], [170, 100, 2.3, 0.8], [110, 290, 2.5, 0.7]])}` },

  // Instrumento ou desporto: pontapé na bola para a baliza, com notas musicais.
  desporto: { pose: "kick", back: `
    <path d="M10 220 h100 v124" stroke="#fff" stroke-width="7" fill="none"/><path d="M10 220 h100 v124 M10 220 v124" stroke="${C.grey}" stroke-width="5" fill="none"/>
    <path d="M20 230 l80 100 M40 230 l60 76 M10 260 l60 84 M10 300 l34 44 M100 236 l-80 100 M80 230 l-60 76 M110 270 l-56 74" stroke="${C.grey}" stroke-width="1.5" opacity=".6"/>
    <g class="p s-kickball"><circle cx="70" cy="300" r="18" fill="#fff" stroke="${C.dark}" stroke-width="3"/><path d="M70 290 l8 6 l-3 9 h-10 l-3 -9 Z" fill="${C.dark}"/></g>
    ${[[200, 120, 0.2], [240, 80, 0.9], [180, 60, 1.6]].map(([x, y, d]) => `<text class="p s-zzz" style="--d:${d}s" x="${x}" y="${y}" font-size="34" fill="${C.lilac}" font-weight="900" font-family="Arial">♪</text>`).join("")}` },

  // Cumprir o tempo de ecrã: a ampulheta acaba, o tablet desliga e aparece uma bola para ir brincar.
  ecra: { pose: "wave", back: `
    <rect x="30" y="170" width="140" height="100" rx="14" fill="${C.dark}"/>
    <g class="s-screen"><rect x="40" y="180" width="120" height="80" rx="6" fill="${C.sky}"/><circle cx="80" cy="214" r="14" fill="${C.yellow}"/><path d="M40 250 l40 -24 l30 18 l20 -10 l30 16 v10 h-120 Z" fill="${C.mint}"/></g>
    <path d="M90 270 v40 M60 312 h60" stroke="${C.dark}" stroke-width="8" stroke-linecap="round"/>
    <g transform="translate(176 230)"><path d="M0 0 h30 M0 60 h30 M4 0 q0 22 11 30 q-11 8 -11 30 M26 0 q0 22 -11 30 q11 8 11 30" stroke="${C.woodD}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path class="s-sandtop" d="M7 6 h16 q-2 14 -8 22 q-6 -8 -8 -22 Z" fill="${C.yellow}"/><path class="s-sandbot" d="M6 56 q2 -14 9 -18 q7 4 9 18 Z" fill="${C.yellow}"/></g>
    ${pop(`<path d="M74 222 l16 16 l30 -34" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, 1.9)}
    <g class="p s-bounce" style="--d:2.2s"><circle cx="146" cy="328" r="16" fill="${C.red}"/><path d="M130 324 q16 10 32 0" stroke="#fff" stroke-width="4" fill="none"/></g>` },

  // Arrumar a loiça: os pratos entram no escorredor, com espuma.
  loica: { pose: "scrub", back: `
    <rect x="14" y="300" width="176" height="44" rx="10" fill="${C.sky}" stroke="#9fd6f0" stroke-width="3"/>
    ${[0.3, 0.9, 1.5].map((d, i) => drop(`<ellipse cx="${50 + i * 34}" cy="286" rx="10" ry="34" fill="#fff" stroke="${C.sky}" stroke-width="3"/>`, d, 150)).join("")}
    <path d="M20 270 v40 M184 270 v40 M20 300 h164" stroke="${C.grey}" stroke-width="4" stroke-linecap="round"/>
    ${bubbles([[180, 200, 7, 0.1], [160, 180, 5, 0.6], [196, 170, 6, 1.1], [170, 210, 4, 1.6]])}
    ${sparkles([[84, 236, 2.2, 0.8]])}`, front: `<g class="s-sponge"><rect x="168" y="186" width="34" height="22" rx="6" fill="${C.yellow}"/><rect x="168" y="200" width="34" height="8" rx="3" fill="${C.mint}"/></g>` },

  // Levar o lixo: o saco vai para o contentor e a tampa fecha.
  lixo: { pose: "reach", back: `
    ${toss(`<path d="M86 236 q-20 4 -22 30 q0 24 26 24 q26 0 26 -24 q-2 -26 -22 -30 l6 -10 h-20 Z" fill="${C.dark}"/>`, 140, 40, 0.3)}
    ${sparkles([[92, 216, 1.9], [160, 236, 2.1, 0.7]])}`,
  front: `<path d="M36 260 h112 l-10 86 h-92 Z" fill="${C.mint}"/><path d="M72 300 l10 -16 l10 16 M100 312 h-20 M60 312 l10 -16" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="s-lid"><rect x="28" y="248" width="128" height="16" rx="6" fill="#3fb98a"/><rect x="78" y="240" width="28" height="10" rx="4" fill="#3fb98a"/></g>` },

  // Estudar para um teste: acende-se a lâmpada e o teste enche-se de vistos.
  estudar: { pose: "think", back: `
    <g class="s-bulb"><circle cx="214" cy="62" r="24" fill="${C.yellow}"/><rect x="205" y="84" width="18" height="14" rx="3" fill="${C.grey}"/>
    <path d="M182 40 l-10 -8 M246 40 l10 -8 M214 28 v-12" stroke="${C.yellow}" stroke-width="5" stroke-linecap="round"/></g>
    <rect x="30" y="170" width="120" height="160" rx="8" fill="#fff" stroke="#e8e3f7" stroke-width="3" transform="rotate(-6 90 250)"/>
    ${[0, 1, 2].map((i) => `<path d="M58 ${206 + i * 40} h60" stroke="${C.grey}" stroke-width="4" opacity=".5" transform="rotate(-6 90 250)"/>`).join("")}
    ${[0, 1, 2].map((i) => pop(`<path d="M${44 - i * 4} ${200 + i * 40} l8 8 l14 -16" stroke="${C.teal}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, 1.2 + i * 0.4)).join("")}` },

  // Preparar o lanche: a sanduíche monta-se camada a camada.
  lanche: { pose: "reach", back: `${table(10, 180, 290)}<ellipse cx="100" cy="288" rx="64" ry="10" fill="#fff" stroke="${C.sky}" stroke-width="3"/>
    ${drop(`<rect x="56" y="268" width="88" height="16" rx="8" fill="#e8b874"/>`, 0.2)}
    ${drop(`<path d="M50 266 q11 -8 22 0 q11 -8 22 0 q11 -8 22 0 q11 -8 22 0 l-2 6 h-84 Z" fill="${C.mint}"/>`, 0.6)}
    ${drop(`<path d="M58 258 h84 l-30 10 h-54 Z" fill="${C.yellow}"/>`, 1.0)}
    ${drop(`<ellipse cx="80" cy="252" rx="16" ry="6" fill="${C.red}"/><ellipse cx="118" cy="252" rx="16" ry="6" fill="${C.red}"/>`, 1.4)}
    ${drop(`<path d="M54 248 q0 -22 46 -22 q46 0 46 22 Z" fill="#e8b874"/><path d="M80 236 h4 M100 232 h4 M118 238 h4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`, 1.8)}
    ${sparkles([[100, 196, 2.4]])}` },

  // Estender ou dobrar a roupa: as peças aparecem no estendal e abanam ao vento.
  roupa: { pose: "up", back: `
    <path d="M0 120 q100 30 200 0" stroke="${C.grey}" stroke-width="3" fill="none"/>
    ${[[40, 128, C.pink, 0.2], [96, 136, C.teal, 0.8], [154, 128, C.yellow, 1.4]].map(([x, y, f, d]) =>
      pop(`<g class="s-sway">${tshirt(x, y, f, 0.9)}<rect x="${x - 3}" y="${y - 6}" width="6" height="12" rx="2" fill="${C.woodD}"/></g>`, d)).join("")}
    <path d="M20 330 h150 v14 h-150 Z" fill="${C.lilac}"/>${drop(`<rect x="34" y="316" width="122" height="14" rx="4" fill="${C.mint}"/>`, 1.9, 80)}` },

  // Aspirar ou varrer: o aspirador anda para trás e para a frente e o pó desaparece.
  aspirar: { pose: "push", back: `
    ${[[40, 340, 0.4], [70, 344, 0.7], [100, 338, 1.0], [130, 342, 1.3], [24, 336, 1.6]].map(([x, y, d]) =>
      `<g class="p s-dust" style="--d:${d}s"><circle cx="${x}" cy="${y}" r="5" fill="${C.grey}" opacity=".6"/><circle cx="${x + 8}" cy="${y + 2}" r="3" fill="${C.grey}" opacity=".5"/></g>`).join("")}
    ${sparkles([[60, 300, 2.2, 0.7], [120, 296, 2.4, 0.6]])}`,
  front: `<g class="s-vacuum"><path d="M186 214 q-40 30 -80 110" stroke="${C.dark}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <rect x="70" y="320" width="60" height="18" rx="8" fill="${C.teal}"/><rect x="150" y="290" width="44" height="50" rx="14" fill="${C.red}"/><circle cx="172" cy="306" r="8" fill="#fff" opacity=".6"/><circle cx="160" cy="342" r="6" fill="${C.dark}"/><circle cx="186" cy="342" r="6" fill="${C.dark}"/></g>` },

  // ---------- Missões sugeridas (MISSION_IDEAS) ----------
  // Ler um livro inteiro: o livro junta-se à pilha dos lidos e ganha uma medalha.
  livro: { pose: "up", back: `
    ${drop(book(40, 304, 120, 30, C.teal), 0.2, 200)}
    ${drop(book(50, 274, 104, 30, C.yellow), 0.6, 200)}
    ${drop(book(44, 244, 112, 30, C.red), 1.0, 200)}
    ${pop(`<path d="M86 178 l-10 34 l14 -8 l8 14 l6 -36 Z M114 178 l10 34 l-14 -8 l-8 14 l-6 -36 Z" fill="${C.red}"/><circle cx="100" cy="176" r="24" fill="${C.yellow}" stroke="#f2b84b" stroke-width="4"/><path d="M100 162 l4 9 h10 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 h10 Z" fill="#fff"/>`, 1.6)}
    ${sparkles([[40, 170, 2.0], [160, 150, 2.2, 0.8], [170, 230, 2.4, 0.6]])}`, front: `
    <g class="s-sway"><path d="M368 130 q-22 -10 -44 0 v40 q22 -10 44 0 Z" fill="${C.lilac}"/><path d="M368 130 q22 -10 44 0 v40 q-22 -10 -44 0 Z" fill="#cdbff5"/></g>` },

  // Arrumar e organizar o armário: as portas abrem-se e a roupa dobrada entra nas prateleiras.
  armario: { pose: "reach", back: `
    <rect x="12" y="100" width="176" height="244" rx="10" fill="${C.wood}"/><rect x="22" y="110" width="156" height="226" rx="6" fill="#f4e6d2"/>
    <rect x="22" y="180" width="156" height="7" fill="${C.woodD}"/><rect x="22" y="250" width="156" height="7" fill="${C.woodD}"/>
    <path d="M40 120 h120" stroke="${C.grey}" stroke-width="4" stroke-linecap="round"/>
    ${[[56, C.pink, 0.3], [100, C.teal, 0.6], [144, C.yellow, 0.9]].map(([x, f, d]) => pop(`<path d="M${x} 122 l-14 10 v40 h28 v-40 Z" fill="${f}"/><path d="M${x} 122 v-6" stroke="${C.grey}" stroke-width="3"/>`, d)).join("")}
    ${[[40, C.lilac, 1.2], [92, C.mint, 1.5], [140, C.red, 1.8]].map(([x, f, d]) => drop(`<rect x="${x}" y="226" width="40" height="11" rx="3" fill="${f}"/><rect x="${x}" y="238" width="40" height="11" rx="3" fill="${f}" opacity=".75"/>`, d, 120)).join("")}
    ${[[44, C.teal, 2.0], [96, C.yellow, 2.2]].map(([x, f, d]) => drop(`<path d="M${x} 318 q0 -12 12 -12 h6 q4 8 16 10 v10 h-34 Z" fill="${f}"/>`, d, 100)).join("")}
    <g class="p s-door" style="--d:0.1s"><rect x="12" y="100" width="88" height="244" rx="8" fill="${C.woodD}"/><circle cx="90" cy="222" r="4" fill="${C.yellow}"/></g>
    <g class="p s-doorr" style="--d:0.1s"><rect x="100" y="100" width="88" height="244" rx="8" fill="${C.woodD}"/><circle cx="110" cy="222" r="4" fill="${C.yellow}"/></g>
    ${sparkles([[30, 92, 2.4, 0.8], [176, 96, 2.6, 0.7]])}` },

  // Ajudar a lavar o carro: esponja, espuma, água e o carro a brilhar.
  carro: { pose: "scrub", back: `
    <path d="M8 300 q0 -26 26 -30 l30 -36 q8 -8 20 -8 h56 q12 0 20 10 l22 34 q26 4 26 30 v14 h-200 Z" fill="${C.sky}"/>
    <path d="M70 240 h34 v30 h-58 Z M112 240 h30 l18 30 h-48 Z" fill="#fff" opacity=".85"/>
    <path d="M8 300 q0 -26 26 -30 l30 -36 q8 -8 20 -8 h56 q12 0 20 10 l22 34 q26 4 26 30 v14 h-200 Z" fill="none" stroke="#7cc8f0" stroke-width="4"/>
    <circle cx="50" cy="318" r="20" fill="${C.dark}"/><circle cx="50" cy="318" r="8" fill="${C.grey}"/><circle cx="160" cy="318" r="20" fill="${C.dark}"/><circle cx="160" cy="318" r="8" fill="${C.grey}"/>
    <g class="p s-wipe">${[[90, 286, 14], [112, 280, 18], [136, 288, 13], [70, 292, 11], [156, 290, 10]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${C.sky}" stroke-width="2"/>`).join("")}</g>
    ${[0, 0.3, 0.6, 0.9, 1.2].map((d, i) => `<path class="p s-fall" style="--d:${d}s" d="M${30 + i * 36} 200 q4 10 0 13 q-4 -3 0 -13 Z" fill="#7cc8f0"/>`).join("")}
    ${bubbles([[60, 260, 7, 0.2], [130, 250, 6, 0.8], [180, 260, 5, 1.3]])}
    ${sparkles([[40, 250, 2.5], [150, 236, 2.7, 0.8], [190, 290, 2.9, 0.6]])}`,
  front: `<g class="s-sponge"><rect x="168" y="186" width="34" height="22" rx="6" fill="${C.yellow}"/><rect x="168" y="200" width="34" height="8" rx="3" fill="${C.mint}"/></g>` },

  // Aprender algo novo: a mascote anda de bicicleta pela primeira vez e ganha uma medalha.
  aprender: { pose: "ride", back: `
    ${[0, 0.4, 0.8].map((d, i) => `<path class="p s-speed" style="--d:${d}s" d="M${40 + i * 10} ${250 + i * 30} h70" stroke="${C.grey}" stroke-width="5" stroke-linecap="round" opacity=".5"/>`).join("")}
    ${pop(`<path d="M86 118 l-10 34 l14 -8 l8 14 l6 -36 Z M114 118 l10 34 l-14 -8 l-8 14 l-6 -36 Z" fill="${C.teal}"/><circle cx="100" cy="116" r="24" fill="${C.yellow}" stroke="#f2b84b" stroke-width="4"/><path d="M100 102 l4 9 h10 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 h10 Z" fill="#fff"/>`, 2.0)}`,
  front: `<g class="s-ridebike">
    <g class="p s-spin"><circle cx="220" cy="318" r="38" fill="none" stroke="${C.dark}" stroke-width="7"/><path d="M220 282 v72 M184 318 h72 M195 293 l50 50 M245 293 l-50 50" stroke="${C.grey}" stroke-width="2"/></g>
    <g class="p s-spin"><circle cx="390" cy="318" r="38" fill="none" stroke="${C.dark}" stroke-width="7"/><path d="M390 282 v72 M354 318 h72 M365 293 l50 50 M415 293 l-50 50" stroke="${C.grey}" stroke-width="2"/></g>
    <path d="M220 318 L290 318 L370 240 M290 318 L280 272 M220 318 L280 272 L360 272 M390 318 L370 240" stroke="${C.red}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M262 266 h36" stroke="${C.dark}" stroke-width="9" stroke-linecap="round"/><path d="M360 234 l22 -6" stroke="${C.dark}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="290" cy="318" r="9" fill="${C.dark}"/></g>` },
};

/** SVG da cena, a partir do texto do mascote.svg. */
export function sceneSvg(id, mascot) {
  const s = SCENES[id];
  if (!s) return null;
  const inner = mascot.replace("<svg ", '<svg x="150" y="0" width="300" height="370" overflow="visible" ').replace("<!--head-->", s.head || "");
  return `<svg class="scene pose-${s.pose} scene-${id}" viewBox="0 0 460 380" overflow="visible" aria-hidden="true">${s.back || ""}${inner}${s.front || ""}</svg>`;
}
