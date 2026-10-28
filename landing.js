// Página de apresentação: é o que vê quem ainda não entrou (o site de saskids.net).
// O app.js trata dos formulários de "Entrar" e "Nova família".

const IMG = "illustrations/";

const BENEFITS = [
  ["🧭", "Responsabilidade", "Quando uma tarefa é \"dele\", a criança percebe que a casa funciona porque todos ajudam, e não por magia."],
  ["🔁", "Rotinas que ficam", "Fazer todos os dias o mesmo pequeno gesto transforma-o em hábito. Ao fim de umas semanas já ninguém precisa de lembrar."],
  ["🎯", "Esforço com recompensa", "Os pontos tornam visível o que cada um fez. Juntar para um prémio maior ensina a esperar e a planear."],
  ["💪", "Autoestima e autonomia", "Conseguir sozinho, e ver isso reconhecido pelos pais, dá confiança para desafios maiores, na escola e fora dela."],
  ["🕊️", "Menos discussões", "As regras ficam claras e combinadas. Em vez de repetir dez vezes, os pais só validam o que foi feito."],
  ["🐷", "Primeiras lições de gestão", "Gastar já num prémio pequeno ou poupar para um grande? Os pontos são um treino seguro antes da mesada."],
];

const STEPS = [
  ["Cria a família", "Uma conta para os pais. Cada filho tem o seu perfil, com foto e um PIN só dele."],
  ["Combina tarefas e prémios", "Diárias, em certos dias ou de uma só vez. Começa com as nossas ideias ou cria as tuas."],
  ["Os filhos marcam, tu validas", "Eles marcam o que fizeram; recebes um aviso e aprovas com um toque."],
  ["Trocam pontos por prémios", "Os filhos pedem o prémio quando têm pontos que cheguem, e até podem sugerir prémios novos."],
];

const FEATURES = [
  ["✅", "Tarefas diárias e espontâneas", "Rotinas de todos os dias e pedidos de pontos extra para aquela ajuda inesperada."],
  ["🚀", "Missões com prazo", "Desafios especiais com contagem decrescente. \"Já fiz!\" e os pais confirmam."],
  ["🎁", "Prémios sugeridos pelos filhos", "Eles propõem, os pais decidem quantos pontos vale."],
  ["⚖️", "Bónus e penalizações", "Reconhecer um gesto bonito ou tirar pontos por mau comportamento. O saldo nunca fica negativo."],
  ["📊", "Gráfico da semana", "Os pontos ganhos e perdidos em cada dia, para conversar sobre a semana."],
  ["🔔", "Notificações", "Aviso aos pais quando há tarefas para validar e aos filhos quando os pontos são aprovados."],
];

const GALLERY = [
  ["cama.svg", "Fazer a cama", "Criança a fazer a cama"],
  ["plantas.svg", "Regar as plantas", "Criança a regar as plantas"],
  ["mesa.svg", "Pôr a mesa", "Criança a pôr a mesa"],
  ["cao.svg", "Dar comida ao cão", "Criança a dar comida ao cão"],
  ["brinquedos.svg", "Arrumar os brinquedos", "Criança a arrumar os brinquedos"],
  ["premio.svg", "E depois… o prémio!", "Duas crianças felizes com gelados e balões"],
];

const FAQ = [
  ["Os filhos precisam de email ou telemóvel?", "Não. Os pais enviam um link para o aparelho de cada filho (tablet, telemóvel ou computador) e eles entram só com o PIN."],
  ["Para que idades é?", "Funciona melhor entre os 4 e os 14 anos. Os mais novos com tarefas simples e ajuda para ler; os mais velhos gerem tudo sozinhos."],
  ["E se o meu filho marcar uma tarefa que não fez?", "Nada conta sem a validação dos pais. Podes aprovar, rejeitar e até corrigir mais tarde no histórico."],
  ["Posso usar em vários aparelhos?", "Sim. Os pais entram com o email em qualquer aparelho e cada filho no seu, tudo sincronizado."],
  ["Os pontos podem ficar negativos?", "Não. As penalizações ficam no histórico, mas o saldo nunca desce abaixo de zero."],
  ["Preciso de instalar alguma coisa?", "Não. Abre no navegador e, se quiseres, adiciona ao ecrã principal para ficar com ícone, como uma app."],
];

function authCard() {
  return `<div class="auth-card" id="authCard">
    <div class="auth-tabs" role="tablist">
      <button type="button" role="tab" data-auth="login" class="active">Entrar</button>
      <button type="button" role="tab" data-auth="register">Nova família</button>
    </div>
    <form id="loginForm" class="auth-form">
      <label>Email</label><input name="email" type="email" autocomplete="username" required>
      <label>Password</label><input name="password" type="password" autocomplete="current-password" required minlength="6">
      <div class="err" id="loginErr"></div>
      <button class="cta block" type="submit">Entrar</button>
      <button class="link" type="button" id="forgot">Esqueci-me da password</button>
      <p class="hint">Filhos: abram o link que o pai/mãe vos enviou. Não precisam de email.</p>
    </form>
    <form id="registerForm" class="auth-form hidden">
      <label>Email do pai/mãe</label><input name="email" type="email" autocomplete="username" required>
      <label>Password (mínimo 6 caracteres)</label><input name="password" type="password" autocomplete="new-password" required minlength="6">
      <label>Repetir password</label><input name="password2" type="password" autocomplete="new-password" required minlength="6">
      <label class="check"><input name="adult" type="checkbox" required> <span>Sou maior de idade e responsável pelas crianças que vou adicionar.</span></label>
      <div class="err" id="registerErr"></div>
      <button class="cta block" type="submit">Criar nova família</button>
      <p class="hint">A seguir escolhes o PIN dos pais e adicionas os filhos.</p>
    </form>
  </div>`;
}

/** Na app instalada no ecrã principal não faz sentido a apresentação: só o cartão de entrada. */
export function landingHTML(standalone) {
  if (standalone) {
    return `<div class="lp-compact"><div class="logo big">⭐ SAS Kids</div>
      <img src="${IMG}hero.svg" alt="" class="compact-art">${authCard()}</div>`;
  }
  return `
  <header class="lp-nav">
    <a class="logo" href="#topo">⭐ SAS Kids</a>
    <nav><a href="#como">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#perguntas">Perguntas</a></nav>
    <button class="cta small" data-go="login">Entrar</button>
  </header>

  <section class="lp-hero" id="topo">
    <div class="hero-text">
      <span class="pill">Para famílias com crianças dos 4 aos 14 anos</span>
      <h1>Tarefas feitas,<br><span class="hl">sorrisos ganhos.</span></h1>
      <p class="lead">A SAS Kids transforma as tarefas do dia a dia num jogo de pontos. Os filhos marcam o que fizeram, os pais validam, e os pontos trocam-se por prémios que a família combina em conjunto.</p>
      <div class="hero-cta">
        <button class="cta" data-go="register">Criar nova família</button>
        <button class="ghost" data-go="login">Já tenho conta</button>
      </div>
      <ul class="ticks"><li>Sem anúncios</li><li>Filhos entram só com PIN</li><li>Telemóvel, tablet e computador</li></ul>
    </div>
    <img class="hero-art" src="${IMG}hero.svg" alt="Duas crianças a saltar de alegria com estrelas e um troféu">
  </section>

  <section class="lp-gallery" aria-label="Exemplos de tarefas">
    ${GALLERY.map(([f, t, alt]) => `<figure><img src="${IMG}${f}" alt="${alt}"><figcaption>${t}</figcaption></figure>`).join("")}
  </section>

  <section class="lp-section" id="beneficios">
    <h2>Porque é que as tarefas fazem bem</h2>
    <p class="sub">Pequenas responsabilidades, repetidas todos os dias, ensinam coisas que nenhum sermão consegue.</p>
    <div class="grid3">
      ${BENEFITS.map(([i, t, d], n) => `<div class="tile c${n % 6}"><div class="ic">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-band" id="como">
    <h2>Como funciona</h2>
    <ol class="steps">
      ${STEPS.map(([t, d], n) => `<li><span class="num">${n + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}
    </ol>
  </section>

  <section class="lp-section">
    <h2>Tudo o que a tua família precisa</h2>
    <div class="grid3">
      ${FEATURES.map(([i, t, d]) => `<div class="feat"><span class="ic">${i}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-quote">
    <img src="${IMG}premio.svg" alt="">
    <div>
      <h2>Regalias que se conquistam</h2>
      <p>Mais meia hora de tablet, escolher o jantar de sexta, um passeio ao parque ou aquele brinquedo que andam a namorar. Quando o prémio vem do esforço, sabe muito melhor, e os filhos aprendem que as coisas boas da vida se constroem um dia de cada vez.</p>
    </div>
  </section>

  <section class="lp-section" id="perguntas">
    <h2>Perguntas frequentes</h2>
    <div class="faq">
      ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
    </div>
  </section>

  <section class="lp-section lp-auth" id="entrar">
    <div>
      <h2>Começa hoje</h2>
      <p class="sub">Cria a conta da família em menos de 2 minutos. Se já tens conta, entra aqui.</p>
      <img src="${IMG}brinquedos.svg" alt="" class="auth-art">
    </div>
    ${authCard()}
  </section>

  <footer class="lp-foot">
    <div class="logo">⭐ SAS Kids</div>
    <p>© ${new Date().getFullYear()} SAS Kids. Feito em Portugal para famílias.</p>
  </footer>`;
}
