// Página de apresentação: é o que vê quem ainda não entrou (o site de saskids.net).
// O app.js trata dos formulários de "Entrar" e "Nova família".
import { t as tr, LANG, legalUrl, langSelect } from "./i18n.js?v=2026-10-28.12";

const IMG = "illustrations/";

const BENEFITS = [
  ["🧭", tr("Responsabilidade"), tr("Quando uma tarefa é \"dele\", a criança percebe que a casa funciona porque todos ajudam, e não por magia.")],
  ["🔁", tr("Rotinas que ficam"), tr("Fazer todos os dias o mesmo pequeno gesto transforma-o em hábito. Ao fim de umas semanas já ninguém precisa de lembrar.")],
  ["🎯", tr("Esforço com recompensa"), tr("Os pontos tornam visível o que cada um fez. Juntar para um prémio maior ensina a esperar e a planear.")],
  ["💪", tr("Autoestima e autonomia"), tr("Conseguir sozinho, e ver isso reconhecido pelos pais, dá confiança para desafios maiores, na escola e fora dela.")],
  ["🕊️", tr("Menos discussões"), tr("As regras ficam claras e combinadas. Em vez de repetir dez vezes, os pais só validam o que foi feito.")],
  ["🐷", tr("Primeiras lições de gestão"), tr("Gastar já num prémio pequeno ou poupar para um grande? Os pontos são um treino seguro antes da mesada.")],
];

const STEPS = [
  [tr("Cria a família"), tr("Uma conta para os pais. Cada filho tem o seu perfil, com foto e um PIN só dele.")],
  [tr("Combina tarefas e prémios"), tr("Diárias, em certos dias ou de uma só vez. Começa com as nossas ideias ou cria as tuas.")],
  [tr("Os filhos marcam, tu validas"), tr("Eles marcam o que fizeram; recebes um aviso e aprovas com um toque.")],
  [tr("Trocam pontos por prémios"), tr("Os filhos pedem o prémio quando têm pontos que cheguem, e até podem sugerir prémios novos.")],
];

const FEATURES = [
  ["✅", tr("Tarefas diárias e espontâneas"), tr("Rotinas de todos os dias e pedidos de pontos extra para aquela ajuda inesperada.")],
  ["🚀", tr("Missões com prazo"), tr("Desafios especiais com contagem decrescente. \"Já fiz!\" e os pais confirmam.")],
  ["🎁", tr("Prémios sugeridos pelos filhos"), tr("Eles propõem, os pais decidem quantos pontos vale.")],
  ["⚖️", tr("Bónus e penalizações"), tr("Reconhecer um gesto bonito ou tirar pontos por mau comportamento. O saldo nunca fica negativo.")],
  ["📊", tr("Gráfico da semana"), tr("Os pontos ganhos e perdidos em cada dia, para conversar sobre a semana.")],
  ["🔔", tr("Notificações"), tr("Aviso aos pais quando há tarefas para validar e aos filhos quando os pontos são aprovados.")],
];

const GALLERY = [
  ["cama.svg", tr("Fazer a cama"), tr("Criança a fazer a cama")],
  ["plantas.svg", tr("Regar as plantas"), tr("Criança a regar as plantas")],
  ["mesa.svg", tr("Pôr a mesa"), tr("Criança a pôr a mesa")],
  ["cao.svg", tr("Dar comida ao cão"), tr("Criança a dar comida ao cão")],
  ["brinquedos.svg", tr("Arrumar os brinquedos"), tr("Criança a arrumar os brinquedos")],
  ["premio.svg", tr("E depois… o prémio!"), tr("Duas crianças felizes com gelados e balões")],
];

const INSTALL = {
  ios: { name: "iPhone / iPad", browser: "Safari", steps: [
    ["ios-1.svg", tr("Abre o Safari"), tr("Escreve <b>saskids.net</b> na barra de endereço e abre a página.")],
    ["ios-2.svg", tr("Toca em Partilhar"), tr("É o quadrado com uma seta para cima, em baixo no ecrã. Se não o vires, toca primeiro em <b>⋯</b>.")],
    ["ios-3.svg", tr("Adicionar ao ecrã principal"), tr("Desliza a lista para baixo e toca em <b>Adicionar ao ecrã principal</b>.")],
    ["ios-4.svg", tr("Toca em Adicionar"), tr("No canto superior direito. O nome SAS Kids já vem escrito.")],
    ["ios-5.svg", tr("Pronto!"), tr("A SAS Kids aparece no ecrã principal, com a mascote. Abre sempre por aqui.")],
  ] },
  android: { name: "Android", browser: "Chrome", steps: [
    ["and-1.svg", tr("Abre o Chrome"), tr("Escreve <b>saskids.net</b> na barra de endereço e abre a página.")],
    ["and-2.svg", tr("Toca nos três pontos"), tr("O botão <b>⋮</b> fica no canto superior direito.")],
    ["and-3.svg", tr("Adicionar ao ecrã principal"), tr("Toca em <b>Adicionar ao ecrã principal</b> (em alguns telemóveis diz <b>Instalar app</b>).")],
    ["and-4.svg", tr("Toca em Instalar"), tr("Confirma. Em poucos segundos a app fica instalada.")],
    ["and-5.svg", tr("Pronto!"), tr("A SAS Kids aparece no ecrã principal e na lista de apps.")],
  ] },
};

function installSection() {
  const tab = (k) => `<button type="button" role="tab" data-os="${k}">${k === "ios" ? "🍎" : "🤖"} ${INSTALL[k].name}</button>`;
  const steps = (k) => `<ol class="inst-steps" data-steps="${k}">${INSTALL[k].steps.map(([img, t, d], i) =>
    `<li><img src="${IMG}instalar/${LANG}/${img}" alt="" class="inst-img"><span class="num">${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>`;
  return `<section class="lp-section lp-install" id="instalar">
    <h2>${tr("Instala a app no telemóvel")}</h2>
    <p class="sub">${tr("Em 30 segundos a SAS Kids fica no ecrã principal, com ícone, como qualquer outra app. Não ocupa espaço e atualiza sozinha.")}</p>
    <div class="inst-quick hidden" id="installNow"><button class="cta" id="installBtn">📲 ${tr("Instalar agora")}</button><span>${tr("Um toque e está feito.")}</span></div>
    <div class="auth-tabs inst-tabs" role="tablist">${tab("ios")}${tab("android")}</div>
    ${steps("ios")}${steps("android")}
    <div class="inst-tips">
      <div class="tile c1"><div class="ic">👧</div><h3>${tr("No telemóvel ou tablet dos filhos")}</h3><p>${tr("Abre primeiro o <b>link que recebeste na app</b> (⚙️ Definições → Ligar aparelho de um filho) e só depois faz estes passos. Assim a app já abre ligada à família.")}</p></div>
      <div class="tile c2"><div class="ic">🔔</div><h3>${tr("Notificações no iPhone")}</h3><p>${tr("No iPhone, as notificações só funcionam com a app adicionada ao ecrã principal. Depois de instalar, abre-a pelo ícone e toca no sino.")}</p></div>
      <div class="tile c4"><div class="ic">💻</div><h3>${tr("No computador")}</h3><p>${tr("No Chrome ou no Edge, carrega no ícone de instalar ao lado do endereço. Ou usa simplesmente o site.")}</p></div>
    </div>
  </section>`;
}

const FAQ = [
  [tr("Os filhos precisam de email ou telemóvel?"), tr("Não. Os pais enviam um link para o aparelho de cada filho (tablet, telemóvel ou computador) e eles entram só com o PIN.")],
  [tr("Para que idades é?"), tr("Funciona melhor entre os 4 e os 14 anos. Os mais novos com tarefas simples e ajuda para ler; os mais velhos gerem tudo sozinhos.")],
  [tr("E se o meu filho marcar uma tarefa que não fez?"), tr("Nada conta sem a validação dos pais. Podes aprovar, rejeitar e até corrigir mais tarde no histórico.")],
  [tr("Posso usar em vários aparelhos?"), tr("Sim. Os pais entram com o email em qualquer aparelho e cada filho no seu, tudo sincronizado.")],
  [tr("Os pontos podem ficar negativos?"), tr("Não. As penalizações ficam no histórico, mas o saldo nunca desce abaixo de zero.")],
  [tr("Preciso de instalar alguma coisa?"), tr("Não é preciso ir à loja de apps. Abre no navegador e adiciona ao ecrã principal para ficar com ícone, como uma app. Vê os passos em <a href=\"#instalar\">Instalar app</a>.")],
];

function authCard() {
  return `<div class="auth-card" id="authCard">
    <div class="auth-tabs" role="tablist">
      <button type="button" role="tab" data-auth="login" class="active">${tr("Entrar")}</button>
      <button type="button" role="tab" data-auth="register">${tr("Nova família")}</button>
    </div>
    <form id="loginForm" class="auth-form">
      <label>Email</label><input name="email" type="email" autocomplete="username" required>
      <label>${tr("Password")}</label><input name="password" type="password" autocomplete="current-password" required minlength="6">
      <div class="err" id="loginErr"></div>
      <button class="cta block" type="submit">${tr("Entrar")}</button>
      <button class="link" type="button" id="forgot">${tr("Esqueci-me da password")}</button>
      <p class="hint">${tr("Filhos: abram o link que o pai/mãe vos enviou. Não precisam de email.")}</p>
      <p class="hint"><a href="${legalUrl("privacy")}" target="_blank">${tr("Privacidade")}</a> · <a href="${legalUrl("terms")}" target="_blank">${tr("Termos")}</a></p>
    </form>
    <form id="registerForm" class="auth-form hidden">
      <label>${tr("Email do pai/mãe")}</label><input name="email" type="email" autocomplete="username" required>
      <label>${tr("Password (mínimo 6 caracteres)")}</label><input name="password" type="password" autocomplete="new-password" required minlength="6">
      <label>${tr("Repetir password")}</label><input name="password2" type="password" autocomplete="new-password" required minlength="6">
      <label class="check"><input name="adult" type="checkbox" required> <span>${tr("Sou maior de idade, sou responsável pelas crianças que vou adicionar e aceito os {terms} e a {privacy}.", { terms: `<a href="${legalUrl("terms")}" target="_blank">${tr("Termos")}</a>`, privacy: `<a href="${legalUrl("privacy")}" target="_blank">${tr("Política de Privacidade")}</a>` })}</span></label>
      <div class="err" id="registerErr"></div>
      <button class="cta block" type="submit">${tr("Criar nova família")}</button>
      <p class="hint">${tr("A seguir escolhes o PIN dos pais e adicionas os filhos.")}</p>
    </form>
  </div>`;
}

/** Na app instalada no ecrã principal não faz sentido a apresentação: só o cartão de entrada. */
export function landingHTML(standalone) {
  if (standalone) {
    return `<div class="lp-compact"><img src="${IMG}mascote.svg" alt="" class="compact-mascot"><img src="${IMG}logo-texto.svg" alt="SAS Kids" class="compact-logo">${authCard()}<div class="compact-lang">🌐 ${langSelect("langSelC")}</div></div>`;
  }
  return `
  <header class="lp-nav">
    <a class="logo" href="#topo"><img src="${IMG}logo-icon.svg" alt="" class="logo-ic"><img src="${IMG}logo-texto.svg" alt="SAS Kids" class="logo-txt"></a>
    <nav><a href="#como">${tr("Como funciona")}</a><a href="#beneficios">${tr("Benefícios")}</a><a href="#perguntas">${tr("Perguntas")}</a></nav>
    ${langSelect()}
    <a class="ghost small install-link" href="#instalar">📲 ${tr("Instalar")}<span class="hide-sm"> ${tr("app")}</span></a>
    <button class="cta small" data-go="login">${tr("Entrar")}</button>
  </header>

  <section class="lp-hero" id="topo">
    <div class="hero-text">
      <span class="pill">${tr("Para famílias com crianças dos 4 aos 14 anos")}</span>
      <h1>${tr("Tarefas feitas,")}<br><span class="hl">${tr("sorrisos ganhos.")}</span></h1>
      <p class="lead">${tr("A SAS Kids transforma as tarefas do dia a dia num jogo de pontos. Os filhos marcam o que fizeram, os pais validam, e os pontos trocam-se por prémios que a família combina em conjunto.")}</p>
      <div class="hero-cta">
        <button class="cta" data-go="register">${tr("Criar nova família")}</button>
        <button class="ghost" data-go="login">${tr("Já tenho conta")}</button>
      </div>
      <ul class="ticks"><li>${tr("Sem anúncios")}</li><li>${tr("Filhos entram só com PIN")}</li><li>${tr("Telemóvel, tablet e computador")}</li></ul>
    </div>
    <img class="hero-art" src="${IMG}hero.svg" alt="${tr("Duas crianças a saltar de alegria com estrelas e um troféu")}">
  </section>

  <section class="lp-gallery" aria-label="${tr("Exemplos de tarefas")}">
    ${GALLERY.map(([f, t, alt]) => `<figure><img src="${IMG}${f}" alt="${alt}"><figcaption>${t}</figcaption></figure>`).join("")}
  </section>

  <section class="lp-section" id="beneficios">
    <h2>${tr("Porque é que as tarefas fazem bem")}</h2>
    <p class="sub">${tr("Pequenas responsabilidades, repetidas todos os dias, ensinam coisas que nenhum sermão consegue.")}</p>
    <div class="grid3">
      ${BENEFITS.map(([i, t, d], n) => `<div class="tile c${n % 6}"><div class="ic">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-band" id="como">
    <h2>${tr("Como funciona")}</h2>
    <ol class="steps">
      ${STEPS.map(([t, d], n) => `<li><span class="num">${n + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}
    </ol>
  </section>

  <section class="lp-section">
    <h2>${tr("Tudo o que a tua família precisa")}</h2>
    <div class="grid3">
      ${FEATURES.map(([i, t, d]) => `<div class="feat"><span class="ic">${i}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-quote">
    <img src="${IMG}premio.svg" alt="">
    <div>
      <h2>${tr("Regalias que se conquistam")}</h2>
      <p>${tr("Mais meia hora de tablet, escolher o jantar de sexta, um passeio ao parque ou aquele brinquedo que andam a namorar. Quando o prémio vem do esforço, sabe muito melhor, e os filhos aprendem que as coisas boas da vida se constroem um dia de cada vez.")}</p>
    </div>
  </section>

  ${installSection()}

  <section class="lp-section" id="perguntas">
    <h2>${tr("Perguntas frequentes")}</h2>
    <div class="faq">
      ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-auth" id="entrar">
    <div>
      <h2>${tr("Começa hoje")}</h2>
      <p class="sub">${tr("Cria a conta da família em menos de 2 minutos. Se já tens conta, entra aqui.")}</p>
      <img src="${IMG}mascote.svg" alt="${tr("A mascote da SAS Kids a saltar com uma estrela")}" class="auth-art mascot">
    </div>
    ${authCard()}
  </section>

  <footer class="lp-foot">
    <img src="${IMG}logo.svg" alt="SAS Kids" class="foot-logo">
    <p>© ${new Date().getFullYear()} SAS Kids. ${tr("Feito em Portugal para famílias.")}</p>
    <p>🌐 ${langSelect("langSelF")}</p>
    <p class="legal"><a href="${legalUrl("terms")}">${tr("Termos e Condições")}</a> · <a href="${legalUrl("privacy")}">${tr("Política de Privacidade")}</a></p>
  </footer>`;
}
