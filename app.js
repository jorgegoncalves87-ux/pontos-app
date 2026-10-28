import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, signInAnonymously, connectAuthEmulator,
  EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, writeBatch,
  arrayUnion, arrayRemove,
  query, orderBy, limit, runTransaction, serverTimestamp, connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// As notificações (firebase-messaging) só são carregadas quando alguém as liga.
const messaging = () => import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js");
import { firebaseConfig, vapidKey } from "./firebase-config.js";
import { t as tr, LANG, LOCALE, LANGS, setLang, legalUrl } from "./i18n.js?v=2026-10-28.18";
import { landingHTML } from "./landing.js?v=2026-10-28.18";

// ---------- Firebase ----------
// ?emulator abre a app contra os emuladores locais (apenas para testes).
const useEmulator = new URLSearchParams(location.search).has("emulator");
const config = useEmulator ? { apiKey: "demo", projectId: "demo-pontos", authDomain: "localhost" } : firebaseConfig;
const configured = useEmulator || !String(firebaseConfig.apiKey).startsWith("COLOCA");

let auth, db, fbApp;
if (configured) {
  fbApp = initializeApp(config);
  auth = getAuth(fbApp);
  // Os dados ficam guardados no aparelho: ao abrir a app aparecem logo e atualizam-se a seguir.
  db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  if (useEmulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
}

// ---------- Estado ----------
const S = {
  user: null,
  familyId: null, // = uid da conta da família; nos aparelhos dos filhos vem do link de ligação
  linkError: null, // "invalid" | "revoked" quando o aparelho não está ligado
  joining: false,
  fam: undefined, // undefined = a carregar, null = família por configurar
  kids: [], tasks: [], rewards: [], log: [],
  kidsLoaded: false,
  role: null, // "parent" | id do filho
  tab: null,
  kidDate: null, // dia escolhido pelo filho para marcar tarefas
  unsub: [],
};

const EMOJIS = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐵", "🦄", "🐙", "🐧", "🐶", "🐱", "🚀", "⚽", "🎨", "🌟"];
const LOG_LIMIT = 500;

const famDoc = () => doc(db, "families", S.familyId);
const col = (name) => collection(db, "families", S.familyId, name);
const FAMILY_KEY = "pf-family";
const isDevice = () => !!S.user?.isAnonymous; // aparelho ligado por link (sem email/password)

// Link de ligação: #join=<familyId>.<código>
let JOIN = (() => {
  const m = location.hash.match(/^#join=([A-Za-z0-9_-]+)\.([a-f0-9]{16,})$/);
  return m ? { familyId: m[1], token: m[2] } : null;
})();
const joinLink = (token) => `${location.origin}${location.pathname}#join=${S.familyId}.${token}`;
/** Esquece o link do endereço (para não voltar a ligar o aparelho sozinho). */
function forgetJoinLink() {
  JOIN = null;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
const app = document.getElementById("app");
document.title = tr("SAS Kids — tarefas que valem pontos e prémios");

// Android/Chrome: guardamos o pedido de instalação para o botão "Instalar agora".
let installPrompt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; showInstallNow(); });
addEventListener("appinstalled", () => { installPrompt = null; showInstallNow(); });
// O Chrome só propõe instalar se houver service worker; é o mesmo das notificações.
if ("serviceWorker" in navigator && !useEmulator) navigator.serviceWorker.register("./sw.js").catch(() => {});
function showInstallNow() { document.getElementById("installNow")?.classList.toggle("hidden", !installPrompt); }

// ---------- Utilitários ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateStr();
const DATE_FMT = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });
const noon = (s) => new Date(s + "T12:00:00");
const fmtDate = (s) => DATE_FMT.format(noon(s));
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return dateStr(new Date(y, m - 1, d + n)); };
// Em pt-PT o formato "curto" do Intl dá "segunda"; usamos as abreviaturas habituais.
const PT_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekday = (s) => {
  if (LANG === "pt") return PT_DAYS[noon(s).getDay()];
  const w = DAY_FMT.format(noon(s)).replace(/\.$/, "");
  return w.charAt(0).toUpperCase() + w.slice(1);
};
/** "Hoje", "Ontem" ou "Qua 14/10". */
const dayLabel = (s) => (s === today() ? tr("Hoje") : s === addDays(today(), -1) ? tr("Ontem") : `${weekday(s)} ${fmtDate(s)}`);
/** Fuso horário deste aparelho: o lembrete das 19:45 usa o da família. */
const TIMEZONE = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon"; } catch { return "Europe/Lisbon"; } })();
const DEFAULT_BACK_DAYS = 3;
const MAX_BACK_DAYS = 14;
/** Quantos dias para trás os filhos podem marcar tarefas (definido pelo pai/mãe). */
const backDays = () => Math.min(MAX_BACK_DAYS, Math.max(0, S.fam?.maxBackDays ?? DEFAULT_BACK_DAYS));
const ptsHtml = (n) => `<span class="pts ${n >= 0 ? "plus" : "minus"}">${n > 0 ? "+" : ""}${n}</span>`;
const kidById = (id) => S.kids.find((k) => k.id === id);
const kidName = (id) => { const k = kidById(id); return k ? `${k.emoji} ${k.name}` : "?"; };
const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
/** Foto do filho (se houver) ou o emoji. */
/** Foto do perfil Pai/Mãe (se houver) ou o cadeado. */
const parentAvatar = (cls = "") => avatar({ photo: S.fam?.parentPhoto, emoji: "🔐" }, cls);
const avatar = (k, cls = "") => (k.photo && PHOTO_RE.test(k.photo)
  ? `<img class="avatar ${cls}" src="${k.photo}" alt="">`
  : `<span class="avatar-emoji ${cls}">${esc(k.emoji)}</span>`);
const STATUS_LABEL = { pending: tr("Por validar"), approved: tr("Aprovado"), rejected: tr("Rejeitado") };
const statusPill = (s) => `<span class="pill ${s}">${STATUS_LABEL[s]}</span>`;

async function hashPin(pin) {
  // Famílias trazidas de outra instalação guardam o id antigo em pinSalt, para os PINs continuarem válidos.
  const data = new TextEncoder().encode(`${S.fam?.pinSalt || S.familyId}:${pin}`);
  const h = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const validPin = (p) => /^\d{4,6}$/.test(p);

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

async function guard(fn) {
  try { await fn(); } catch (e) { console.error(e); toast(e.message || tr("Ocorreu um erro.")); }
}

// ---------- Modal ----------
const modal = document.getElementById("modal");
function closeModal() { modal.classList.add("hidden"); modal.innerHTML = ""; }
/** Abre um formulário; onSubmit recebe os valores e pode lançar erro para mostrar na própria janela. */
function openForm(title, bodyHtml, onSubmit, submitLabel = tr("Guardar")) {
  modal.innerHTML = `<form class="sheet"><h2 style="margin-top:0">${esc(title)}</h2>${bodyHtml}
    <div class="err"></div>
    <div class="actions"><button type="button" data-close>${tr("Cancelar")}</button><button class="primary" type="submit">${esc(submitLabel)}</button></div></form>`;
  modal.classList.remove("hidden");
  const form = modal.querySelector("form");
  form.querySelector("[data-close]").onclick = closeModal;
  const first = form.querySelector("input:not([type=checkbox]):not([type=radio]), select, textarea");
  if (first) setTimeout(() => first.focus(), 50);
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await onSubmit(new FormData(form), form);
      closeModal();
    } catch (e) {
      console.error(e);
      form.querySelector(".err").textContent = e.message || tr("Ocorreu um erro.");
      btn.disabled = false;
    }
  };
  return form;
}
// Fecha ao tocar fora da janela, mas só se o toque também começou fora. No telemóvel, o teclado
// a abrir desloca a janela e o "click" de um toque num campo pode cair no fundo escurecido.
let downOnBackdrop = false;
modal.addEventListener("pointerdown", (e) => { downOnBackdrop = e.target === modal; });
modal.addEventListener("click", (e) => {
  if (e.target === modal && downOnBackdrop && !modal.contains(document.activeElement)) closeModal();
  downOnBackdrop = false;
});

function askPin(title, check) {
  openForm(title, `<input name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="PIN" style="font-size:1.6rem;text-align:center;letter-spacing:.4em">`,
    async (fd) => { await check(fd.get("pin")); }, tr("Entrar"));
}

// ---------- Ciclo de vida ----------
function stopListeners() { S.unsub.forEach((u) => u()); S.unsub = []; }

/** Ordena sempre por pontos (do menor para o maior) e, em empate, por nome. */
const byValue = (field) => (a, b) => (a[field] ?? 0) - (b[field] ?? 0) || a.title.localeCompare(b.title, LOCALE);

function startListeners() {
  stopListeners();
  const onErr = (e) => {
    console.error(e);
    if (e.code === "permission-denied" && isDevice()) return unlinkDevice("revoked");
    toast(tr("Erro a ler dados: {code}", { code: e.code }));
  };
  S.unsub.push(onSnapshot(famDoc(), (snap) => {
    // Sem cópia no aparelho, espera pela resposta do servidor (senão parecia uma família por criar).
    if (!snap.exists() && snap.metadata.fromCache) return;
    S.fam = snap.exists() ? snap.data() : null;
    // A língua escolhida pelos pais vale para todos os aparelhos da família.
    if (S.fam?.lang && LANGS[S.fam.lang] && S.fam.lang !== LANG && setLang(S.fam.lang)) return location.reload();
    render();
  }, onErr));
  S.unsub.push(onSnapshot(col("kids"), (snap) => {
    S.kidsLoaded = true;
    S.kids = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    render();
  }, onErr));
  S.unsub.push(onSnapshot(col("tasks"), (snap) => {
    S.tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byValue("points"));
    render();
  }, onErr));
  S.unsub.push(onSnapshot(col("rewards"), (snap) => {
    S.rewards = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byValue("cost"));
    render();
  }, onErr));
  S.unsub.push(onSnapshot(query(col("log"), orderBy("createdAt", "desc"), limit(LOG_LIMIT)), (snap) => {
    S.log = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, onErr));
}

function setRole(role) {
  S.role = role;
  S.tab = null;
  S.kidDate = null;
  render();
}

/** Liga este aparelho à família do link (conta anónima + registo em members/). */
async function joinFamily(user) {
  S.joining = true;
  render();
  try {
    await setDoc(doc(db, "families", JOIN.familyId, "members", user.uid),
      { token: JOIN.token, joinedAt: serverTimestamp(), device: navigator.userAgent.slice(0, 150) }, { merge: true });
    try { localStorage.setItem(FAMILY_KEY, JOIN.familyId); } catch {}
    S.linkError = null;
    return JOIN.familyId;
  } catch (e) {
    console.error(e);
    S.linkError = "invalid";
    return null;
  } finally {
    S.joining = false;
  }
}

/** Desliga este aparelho (conta anónima) da família. */
async function unlinkDevice(reason = null) {
  stopListeners();
  try { localStorage.removeItem(FAMILY_KEY); } catch {}
  S.familyId = null;
  S.linkError = reason;
  S.fam = undefined;
  render();
}

if (configured) {
  onAuthStateChanged(auth, async (user) => {
    stopListeners();
    S.user = user;
    S.fam = undefined;
    S.kids = []; S.tasks = []; S.rewards = []; S.log = [];
    S.kidsLoaded = false;
    S.role = null;
    S.familyId = null;
    if (!user) {
      // Abriu um link de ligação: entra sem email nem password.
      if (JOIN) { S.joining = true; render(); await signInAnonymously(auth).catch((e) => { S.joining = false; S.linkError = "invalid"; console.error(e); render(); }); return; }
      return render();
    }
    if (!user.isAnonymous) {
      S.familyId = user.uid;
      // Sem email confirmado não há acesso aos dados: mostra só o ecrã para confirmar
      // e envia o email (uma vez por sessão; contas antigas não o receberam ao registar).
      if (!user.emailVerified) {
        const k = `sk-verify-sent-${user.uid}`;
        let sent = false; try { sent = !!sessionStorage.getItem(k); sessionStorage.setItem(k, "1"); } catch {}
        if (!sent) sendVerification();
        return render();
      }
    } else {
      let saved = null;
      try { saved = localStorage.getItem(FAMILY_KEY); } catch {}
      // O link fica no endereço de propósito (o iPhone guarda-o no ícone do ecrã principal).
      S.familyId = JOIN ? await joinFamily(user) : saved;
      if (!S.familyId) return render();
    }
    // Nenhum perfil fica lembrado: ao abrir a app, cada um entra com o seu PIN.
    startListeners();
    render();
  });
} else {
  renderNotConfigured();
}

// ---------- Notificações ----------
// Cada aparelho guarda o seu token em families/<id>/pushTokens/<id>, com quem quer avisos:
// { parent: true } e/ou { kids: [ids] }. O envio é feito pelo notificador (notifier/notify.mjs).
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const pushKey = (who) => `pf-push-${S.familyId}-${who}`;
const pushOn = (who) => {
  try { return typeof Notification !== "undefined" && Notification.permission === "granted" && !!localStorage.getItem(pushKey(who)); }
  catch { return false; }
};

async function sha256hex(text) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * O iPhone só mostra o pedido de autorização se for feito no próprio toque: qualquer espera
 * antes (mesmo de milissegundos) faz com que recuse em silêncio. Por isso o pedido é feito
 * logo no toque do sino e o resultado é passado para aqui.
 */
async function pushToken(permRequest) {
  if (!vapidKey) throw new Error(tr("As notificações ainda não estão configuradas (falta a chave Web Push)."));
  const fail = (code, msg) => Object.assign(new Error(msg), { pushHelp: code });
  // No iPhone/iPad só há notificações na app adicionada ao ecrã principal e aberta pelo ícone.
  if (isIOS() && !isStandalone()) throw fail("ios-install", tr("No iPhone, primeiro adiciona a app ao ecrã principal (Partilhar → Adicionar ao ecrã principal) e abre-a a partir do ícone."));
  const { getMessaging, getToken, isSupported } = await messaging();
  if (!(await isSupported().catch(() => false)) || !("serviceWorker" in navigator)) {
    throw fail("unsupported", tr("Este navegador não suporta notificações."));
  }
  const perm = await (permRequest ?? Notification.requestPermission());
  if (perm !== "granted") throw fail("denied", tr("As notificações foram bloqueadas. Ativa-as nas definições do telemóvel para esta app."));
  const reg = await navigator.serviceWorker.register("./sw.js");
  const token = await getToken(getMessaging(fbApp), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) throw new Error(tr("Não foi possível ativar as notificações."));
  return token;
}

/** Liga ou desliga os avisos deste aparelho para o pai/mãe ("parent") ou para um filho (id). */
async function togglePush(who) {
  if (pushOn(who)) {
    const id = localStorage.getItem(pushKey(who));
    await updateDoc(doc(col("pushTokens"), id), who === "parent" ? { parent: false } : { kids: arrayRemove(who) }).catch(() => {});
    try { localStorage.removeItem(pushKey(who)); } catch {}
    toast(tr("Notificações desligadas neste aparelho."));
  } else {
    // Nada de "await" antes disto (ver pushToken).
    const permRequest = typeof Notification !== "undefined" && Notification.permission === "default" && !(isIOS() && !isStandalone())
      ? Notification.requestPermission() : null;
    let token;
    try { token = await pushToken(permRequest); }
    catch (e) { if (e.pushHelp) return pushHelp(e.pushHelp); throw e; }
    const id = (await sha256hex(token)).slice(0, 40);
    await setDoc(doc(col("pushTokens"), id), {
      token, updatedAt: serverTimestamp(), device: navigator.userAgent.slice(0, 150),
      ...(who === "parent" ? { parent: true } : { kids: arrayUnion(who) }),
    }, { merge: true });
    try { localStorage.setItem(pushKey(who), id); } catch {}
    toast(tr("Notificações ligadas! 🔔"));
  }
  render();
}
/** Ajuda quando as notificações não ligam: o que fazer, passo a passo e com imagens. */
function pushHelp(code) {
  const img = (f) => `<img src="illustrations/instalar/${LANG}/${f}" alt="" class="help-img">`;
  let title, body;
  if (code === "ios-install") {
    title = tr("Primeiro, instala a app");
    body = `<p>${tr("No iPhone e no iPad, a Apple só deixa receber notificações na app instalada no ecrã principal. No Safari não funciona.")}</p>
      <ol class="help-steps">
        <li>${img("ios-2.svg")}<span>${tr("Toca em <b>Partilhar</b> (o quadrado com a seta, em baixo).")}</span></li>
        <li>${img("ios-3.svg")}<span>${tr("Toca em <b>Adicionar ao ecrã principal</b> e depois em <b>Adicionar</b>.")}</span></li>
        <li>${img("ios-5.svg")}<span>${tr("Abre a SAS Kids <b>pelo ícone</b>, entra e toca outra vez no sino.")}</span></li>
      </ol>`;
  } else if (code === "denied") {
    title = tr("As notificações estão bloqueadas");
    body = `<p>${tr("Este aparelho recusou as notificações da SAS Kids. Para as voltar a ligar:")}</p>
      ${isIOS() ? `<ol class="help-steps text"><li>${tr("Abre as <b>Definições</b> do iPhone.")}</li><li>${tr("Toca em <b>Notificações</b> e depois em <b>SAS Kids</b>.")}</li><li>${tr("Liga <b>Permitir notificações</b>.")}</li><li>${tr("Volta à app e toca no sino.")}</li></ol>`
      : `<ol class="help-steps text"><li>${tr("Toca no ícone à esquerda do endereço (ou, na app instalada, mantém o dedo no ícone → <b>Informações da app</b>).")}</li><li>${tr("Abre <b>Notificações</b> e escolhe <b>Permitir</b>.")}</li><li>${tr("Volta à app e toca no sino.")}</li></ol>`}`;
  } else {
    title = tr("Este navegador não suporta notificações");
    body = `<p>${tr("Usa o Chrome no Android, ou instala a app no ecrã principal do iPhone.")}</p>`;
  }
  const state = `${typeof Notification === "undefined" ? "—" : Notification.permission} · ${isStandalone() ? "app" : "browser"} · v${APP_VERSION}`;
  modal.innerHTML = `<div class="sheet help"><img src="illustrations/mascote.svg" alt="" class="help-mascot"><h2>${title}</h2>${body}
    <p class="small muted" style="text-align:center;margin-top:12px">${state}</p>
    <div class="actions"><button class="primary" data-close>${tr("Percebi")}</button></div></div>`;
  modal.classList.remove("hidden");
  modal.querySelector("[data-close]").onclick = closeModal;
}

const bellButton = (who) => `<button class="icon-btn ${pushOn(who) ? "on" : ""}" id="bell" title="${tr("Notificações")}" aria-label="${tr("Notificações")}">${pushOn(who) ? ICON.bell : ICON.bellOff}</button>`;

// ---------- Render principal ----------
function render() {
  app.classList.remove("landing");
  if (!(S.user && S.familyId && S.fam && S.role && (S.role === "parent" || kidById(S.role)))) {
    app.classList.remove("shell");
    delete app.dataset.view;
  }
  if (!configured) return renderNotConfigured();
  if (S.joining) { app.innerHTML = `<div class="center muted">${tr("A ligar este aparelho…")}</div>`; return; }
  if (!S.user) return renderLogin();
  if (!S.familyId) return renderNotLinked();
  // Conta dos pais com email por confirmar: não entra (as regras do Firebase também o exigem).
  if (!isDevice() && !S.user.emailVerified) return renderVerify();
  if (S.fam === undefined) { app.innerHTML = `<div class="center muted">${tr("A carregar…")}</div>`; return; }
  if (S.fam === null) return renderSetup();
  if (S.role && S.role !== "parent" && !kidById(S.role)) {
    // O perfil guardado já não existe (ou os filhos ainda estão a carregar).
    if (S.kidsLoaded) setRole(null);
    else { app.innerHTML = `<div class="center muted">${tr("A carregar…")}</div>`; }
    return;
  }
  if (!S.role) return renderProfiles();
  if (S.role === "parent") return renderParent();
  return renderKid(kidById(S.role));
}

// ---------- Emails (confirmar o email e repor a password) ----------
// Os emails saem do nosso servidor (api/mail.php) com o desenho da SAS Kids. Se ele falhar, usa-se
// o email simples da Firebase, para ninguém ficar sem conseguir confirmar ou recuperar a conta.
async function requestMail(action, extra) {
  try {
    const res = await fetch("api/mail.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lang: LANG, ...extra }) });
    if (res.status === 429) return "too-many";
    return res.ok ? "ok" : "fail";
  } catch { return "fail"; }
}
async function sendVerification() {
  const r = await requestMail("verify", { idToken: await S.user.getIdToken() });
  if (r === "fail") { try { await sendEmailVerification(S.user); return "ok"; } catch { return "fail"; } }
  return r;
}
const mailToast = (r) => toast(r === "ok" ? tr("Email enviado! Vê também a pasta de spam.")
  : r === "too-many" ? tr("Espera um pouco antes de pedir outro email.") : tr("Não foi possível enviar o email. Tenta daqui a pouco."));

/** Confirma se o email já foi confirmado (o utilizador volta do email para a app). */
async function checkVerified(silent) {
  const u = auth.currentUser;
  if (!u || u.isAnonymous || app.querySelector("#verifiedBtn") === null && u.emailVerified) return;
  await u.reload().catch((e) => console.warn("reload", e));
  if (u.emailVerified) {
    S.user = u;
    // Token novo, com email_verified, para as regras do Firebase deixarem entrar.
    await u.getIdToken(true).catch(() => {});
    if (!S.unsub.length) startListeners();
    render();
    toast(tr("Email confirmado!"));
  }
  else if (!silent) toast(tr("Ainda não está confirmado. Abre o email e toca no botão."));
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user && !S.user.isAnonymous) checkVerified(true); });

function renderVerify() {
  app.innerHTML = `<div class="verify-box">${BRAND}<div class="card">
    <img src="illustrations/mascote.svg" alt="" class="auth-mascot">
    <h1>${tr("Confirma o teu email")}</h1>
    <p class="muted">${tr("Enviámos um email para {email}. Abre-o e toca em <b>Confirmar email</b>. Depois volta aqui.", { email: `<b>${esc(S.user.email)}</b>` })}</p>
    <button class="primary block" id="verifiedBtn">${tr("Já confirmei")}</button>
    <div class="actions"><button class="link" id="resendBtn">${tr("Reenviar email")}</button><button class="link" id="otherAccount">${tr("Usar outra conta")}</button></div>
  </div></div>`;
  document.getElementById("verifiedBtn").onclick = () => guard(() => checkVerified(false));
  document.getElementById("resendBtn").onclick = () => guard(async () => mailToast(await sendVerification()));
  document.getElementById("otherAccount").onclick = () => signOut(auth);
}

function renderNotLinked() {
  const msg = S.linkError === "revoked"
    ? tr("Este aparelho foi desligado pelo pai/mãe.")
    : S.linkError === "invalid" ? tr("Este link de ligação já não é válido.") : tr("Este aparelho ainda não está ligado à família.");
  app.innerHTML = `<div class="card" style="max-width:420px;margin:40px auto 0;text-align:center">
    <img src="illustrations/mascote.svg" alt="" style="width:120px"><img src="illustrations/logo-texto.svg" alt="SAS Kids" style="display:block;height:34px;margin:8px auto 12px"><p>${msg}</p>
    <p class="muted">${tr("Pede ao pai/mãe um link novo: na app, ⚙️ Definições → <b>Ligar aparelho de um filho</b>.")}</p>
    <button class="link" id="toLogin">${tr("Sou o pai/mãe: entrar com email")}</button></div>`;
  document.getElementById("toLogin").onclick = () => { forgetJoinLink(); signOut(auth); };
}

function renderNotConfigured() {
  app.innerHTML = `<div class="card"><h1>⭐ SAS Kids</h1>
    <p>Falta ligar a app ao Firebase. Edita o ficheiro <b>firebase-config.js</b> com a configuração do teu projeto — os passos estão no README.</p></div>`;
}

function renderLogin() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  app.classList.add("landing");
  app.innerHTML = landingHTML(standalone);
  const card = document.getElementById("authCard");
  const showAuth = (mode, scroll) => {
    card.querySelectorAll("[data-auth]").forEach((b) => b.classList.toggle("active", b.dataset.auth === mode));
    document.getElementById("loginForm").classList.toggle("hidden", mode !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", mode !== "register");
    if (scroll) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => card.querySelector(`#${mode}Form input`)?.focus({ preventScroll: true }), 400);
    }
  };
  card.querySelectorAll("[data-auth]").forEach((b) => (b.onclick = () => showAuth(b.dataset.auth)));
  app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => showAuth(b.dataset.go, true)));
  // Instalar: mostra logo os passos do sistema deste telemóvel.
  const showOs = (os) => {
    app.querySelectorAll("[data-os]").forEach((b) => b.classList.toggle("active", b.dataset.os === os));
    app.querySelectorAll("[data-steps]").forEach((l) => l.classList.toggle("hidden", l.dataset.steps !== os));
  };
  app.querySelectorAll("[data-os]").forEach((b) => (b.onclick = () => showOs(b.dataset.os)));
  if (app.querySelector("[data-os]")) showOs(isIOS() ? "ios" : "android");
  showInstallNow();
  app.querySelectorAll(".lang-sel").forEach((sel) => (sel.onchange = () => { setLang(sel.value); location.reload(); }));
  const ib = document.getElementById("installBtn");
  if (ib) ib.onclick = async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; showInstallNow(); };

  const login = document.getElementById("loginForm");
  const loginErr = document.getElementById("loginErr");
  login.onsubmit = async (ev) => {
    ev.preventDefault();
    loginErr.textContent = "";
    try { await signInWithEmailAndPassword(auth, login.email.value.trim(), login.password.value); }
    catch (e) { loginErr.textContent = authError(e.code); }
  };
  document.getElementById("forgot").onclick = async () => {
    const email = login.email.value.trim();
    if (!email) { loginErr.textContent = tr("Escreve primeiro o email."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { loginErr.textContent = authError("auth/invalid-email"); return; }
    let r = await requestMail("reset", { email });
    if (r === "fail") { try { await sendPasswordResetEmail(auth, email); r = "ok"; } catch (e) { r = e.code === "auth/user-not-found" ? "ok" : "fail"; } }
    if (r === "ok") toast(tr("Se existir uma conta com este email, enviámos um link para escolheres uma password nova."));
    else mailToast(r);
  };

  const reg = document.getElementById("registerForm");
  const regErr = document.getElementById("registerErr");
  reg.onsubmit = async (ev) => {
    ev.preventDefault();
    regErr.textContent = "";
    if (reg.password.value !== reg.password2.value) { regErr.textContent = tr("As passwords não coincidem."); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, reg.email.value.trim(), reg.password.value);
      S.user = cred.user;
    } catch (e) { regErr.textContent = authError(e.code); }
  };
}

function authError(code) {
  return ({
    "auth/invalid-credential": tr("Email ou password errados."),
    "auth/wrong-password": tr("Email ou password errados."),
    "auth/user-not-found": tr("Email ou password errados."),
    "auth/email-already-in-use": tr("Já existe uma conta com este email. Usa \"Entrar\"."),
    "auth/weak-password": tr("A password tem de ter pelo menos 6 caracteres."),
    "auth/invalid-email": tr("Email inválido."),
    "auth/too-many-requests": tr("Demasiadas tentativas. Tenta daqui a pouco."),
    "auth/operation-not-allowed": tr("Ativa o login por Email/Password na consola do Firebase."),
    "auth/network-request-failed": tr("Sem ligação à internet. Tenta outra vez."),
  })[code] || tr("Erro: {code}", { code });
}

function renderSetup() {
  app.innerHTML = `<div style="max-width:480px;margin:20px auto 0">${BRAND}
    <h1>${tr("Configurar a família")}</h1>
    <p class="muted">${tr("O PIN do pai/mãe protege a área de gestão. Os filhos não o devem saber.")}</p>
    <form class="card" id="setupForm">
      <label>${tr("PIN do pai/mãe (4 a 6 dígitos)")}</label>
      <input name="pin" type="password" inputmode="numeric" maxlength="6" required>
      <label>${tr("Repetir PIN")}</label>
      <input name="pin2" type="password" inputmode="numeric" maxlength="6" required>
      <div class="err" id="setupErr"></div>
      <button class="primary block" type="submit">${tr("Continuar")}</button>
    </form>
    <button class="link" id="logout">${tr("Sair da conta")}</button></div>`;
  document.getElementById("logout").onclick = () => signOut(auth);
  const form = document.getElementById("setupForm");
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const pin = form.pin.value, pin2 = form.pin2.value;
    const err = document.getElementById("setupErr");
    if (!validPin(pin)) { err.textContent = tr("O PIN tem de ter 4 a 6 dígitos."); return; }
    if (pin !== pin2) { err.textContent = tr("Os PINs não coincidem."); return; }
    await guard(async () => {
      await setDoc(famDoc(), { parentPinHash: await hashPin(pin), lang: LANG, tz: TIMEZONE, createdAt: serverTimestamp() });
      setRole("parent");
      S.tab = "kids";
      render();
    });
  };
}

function renderProfiles() {
  app.innerHTML = `${BRAND}<div class="who"><img src="illustrations/mascote.svg" alt="" class="who-mascot"></div><div class="header"><h1>${tr("Quem és tu?")}</h1><button class="link" id="logout">${isDevice() ? tr("Desligar") : tr("Sair")}</button></div>
    <div class="profiles">
      ${S.kids.map((k) => `<button class="profile" data-kid="${k.id}"><span class="emoji">${avatar(k, "lg")}</span>${esc(k.name)}</button>`).join("")}
      <button class="profile" data-parent><span class="emoji">${parentAvatar("lg")}</span>${tr("Pai / Mãe")}</button>
    </div>
    ${S.kids.length ? "" : `<p class="muted" style="margin-top:16px">${tr("Ainda não há filhos. Entra como pai/mãe para os adicionar.")}</p>`}`;
  document.getElementById("logout").onclick = () => leaveDevice();
  app.querySelector("[data-parent]").onclick = () => askPin(tr("PIN do pai/mãe"), async (pin) => {
    if ((await hashPin(pin)) !== S.fam.parentPinHash) throw new Error(tr("PIN errado."));
    setRole("parent");
  });
  app.querySelectorAll("[data-kid]").forEach((b) => (b.onclick = () => {
    const kid = kidById(b.dataset.kid);
    askPin(tr("Olá {name}! Qual é o teu PIN?", { name: kid.name }), async (pin) => {
      if ((await hashPin(pin)) !== kid.pinHash) throw new Error(tr("PIN errado."));
      setRole(kid.id);
    });
  }));
}

// ---------- Ícones (desenhados à mão, no estilo da mascote; herdam a cor do texto) ----------
const svg = (body) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const FILL = 'fill="currentColor" fill-opacity=".16"';
const ICON = {
  phone: svg(`<rect x="6.5" y="2.5" width="11" height="19" rx="3" ${FILL}/><path d="M10.5 18h3"/>`),
  validate: svg(`<rect x="3" y="3" width="18" height="18" rx="6" ${FILL}/><path d="M8 12.4l2.7 2.7L16.2 9.4"/>`),
  kids: svg(`<circle cx="9" cy="8" r="3.3" ${FILL}/><circle cx="16.6" cy="9.6" r="2.6" ${FILL}/><path d="M3.4 19.5c.6-3.4 2.9-5.3 5.6-5.3s5 1.9 5.6 5.3"/><path d="M14.6 15c.6-.4 1.3-.6 2-.6 2.2 0 3.7 1.5 4.1 4.6"/>`),
  tasks: svg(`<rect x="5" y="4.5" width="14" height="16.5" rx="3.5" ${FILL}/><rect x="9" y="2.5" width="6" height="4" rx="1.6" fill="#fff"/><path d="M8.6 12.6l1.9 1.9 3.9-3.9"/><path d="M9 17.4h6"/>`),
  rewards: svg(`<rect x="4" y="11" width="16" height="10" rx="2.5" ${FILL}/><rect x="2.8" y="7.6" width="18.4" height="4" rx="1.6"/><path d="M12 7.6V21"/><path d="M12 7.6C10.6 4.4 6.8 3.8 6.8 6.2c0 1.4 2.4 1.4 5.2 1.4zM12 7.6c1.4-3.2 5.2-3.8 5.2-1.4 0 1.4-2.4 1.4-5.2 1.4z"/>`),
  history: svg(`<circle cx="12" cy="12" r="9" ${FILL}/><path d="M12 7.2V12l3.2 2"/>`),
  bell: svg(`<path d="M6.2 16.5V11a5.8 5.8 0 0 1 11.6 0v5.5l1.5 2H4.7z" ${FILL}/><path d="M10 20.6a2.2 2.2 0 0 0 4 0"/>`),
  bellOff: svg(`<path d="M6.2 16.5V11a5.8 5.8 0 0 1 11.6 0v5.5l1.5 2H4.7z"/><path d="M10 20.6a2.2 2.2 0 0 0 4 0"/><path d="M3.5 3.5l17 17"/>`),
  settings: svg(`<path d="M12 2.8l2 1.9 2.7-.5.9 2.6 2.5 1.2-.6 2.7 1.6 2.2-1.6 2.2.6 2.7-2.5 1.2-.9 2.6-2.7-.5-2 1.9-2-1.9-2.7.5-.9-2.6-2.5-1.2.6-2.7L2.9 12l1.6-2.2-.6-2.7 2.5-1.2.9-2.6 2.7.5z" ${FILL}/><circle cx="12" cy="12" r="3.2"/>`),
  swap: svg(`<path d="M7 7.5h11.5l-3-3M17 16.5H5.5l3 3"/>`),
};

function renderTabs(tabs) {
  if (!S.tab || !tabs.some((t) => t.id === S.tab)) S.tab = tabs[0].id;
  return `<nav class="tabs">${tabs.map((t) =>
    `<button data-tab="${t.id}" class="${S.tab === t.id ? "active" : ""}"><span class="ic">${ICON[t.icon]}</span><span>${t.label}${t.badge ? ` <span class="badge">${t.badge}</span>` : ""}</span></button>`).join("")}</nav>`;
}

/**
 * Ecrãs com barra de separadores: o conteúdo tem scroll próprio e a barra fica sempre em baixo
 * (no iPad, uma barra "position: fixed" podia ficar a meio do ecrã). Mantém o scroll entre renders.
 */
const BRAND = `<div class="brandbar"><img src="illustrations/logo-icon.svg" alt="" class="bb-ic"><img src="illustrations/logo-texto.svg" alt="SAS Kids" class="bb-txt"></div>`;
function renderShell(content, nav) {
  const prev = app.querySelector(".scroll");
  const top = prev && app.classList.contains("shell") && app.dataset.view === `${S.role}:${S.tab}` ? prev.scrollTop : 0;
  app.classList.add("shell");
  app.dataset.view = `${S.role}:${S.tab}`;
  app.innerHTML = `<div class="scroll"><div class="inner">${BRAND}${content}</div></div>${nav}`;
  app.querySelector(".scroll").scrollTop = top;
}
const scrollToTop = () => { const el = app.querySelector(".scroll"); if (el) el.scrollTop = 0; else window.scrollTo(0, 0); };

function bindTabs() {
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; render(); scrollToTop(); }));
}

// ---------- Primeiros passos (família nova) ----------
const isNewFamily = () => !S.kids.length && !S.tasks.length && !S.rewards.length;
const STEPS = () => [
  [ICON.kids, tr("Adiciona um filho")],
  [ICON.tasks, tr("Escolhe as tarefas e os pontos")],
  [ICON.rewards, tr("Escolhe os prémios e os pontos")],
  [ICON.phone, tr("Liga o aparelho do filho")],
];
/** Barra "1 · 2 · 3" mostrada nas janelas dos primeiros passos. */
const stepper = (current) => `<ol class="stepper" aria-label="${tr("Primeiros passos")}">${STEPS().map(([ic, label], i) =>
  `<li class="${i + 1 < current ? "done" : i + 1 === current ? "now" : ""}"><span class="dot">${i + 1 < current ? "✓" : i + 1}</span><span>${label}</span></li>`).join("")}</ol>`;
/** Cartão de boas-vindas no separador Filhos, enquanto a família ainda não tem filhos. */
function welcomeCard() {
  return `<div class="card welcome">
    <img src="illustrations/mascote.svg" alt="" class="welcome-mascot">
    <h2>${tr("Vamos começar!")}</h2>
    <p class="muted">${tr("Em 4 passos a tua família fica pronta a ganhar pontos.")}</p>
    <ol class="welcome-steps">${STEPS().map(([ic, label], i) => `<li><span class="ic">${ic}</span><span class="n">${i + 1}</span><b>${label}</b><span class="small muted">${[
      tr("Nome, idade e um PIN secreto."),
      tr("Já vêm escolhidas a pensar na idade: confirma os pontos de cada uma."),
      tr("O que se pode ganhar com os pontos: confirma quanto custa cada um."),
      tr("Lê o código QR com o telemóvel ou tablet do filho, ou envia-lhe o link."),
    ][i]}</span></li>`).join("")}</ol>
    <p class="tip">💡 ${tr("A qualquer momento podes adicionar, mudar ou remover tarefas e prémios.")}</p>
    <button class="primary block" id="addKid">+ ${tr("Adicionar o primeiro filho")}</button>
  </div>`;
}

// ---------- Mascote ----------
// A mascote vem inline (e não num <img>) para os braços e as pernas poderem dançar.
let mascotSvg = null;
// As cenas só são carregadas na primeira vez que a mascote aparece.
let scenesMod = null;
const loadScenes = () => (scenesMod ??= import("./scenes.js?v=2026-10-28.18").catch(() => null));
/**
 * Cena da mascote para uma tarefa ou missão: as que vieram das sugestões têm uma animação própria
 * (guardada em task.scene; nas outras reconhece-se pelo título). As restantes usam a dança normal.
 */
function sceneFor(t) {
  if (!t) return null;
  if (t.scene) return t.scene;
  const title = (t.title || "").trim().toLowerCase();
  return TASK_IDEAS.find((i) => i[0].toLowerCase() === title)?.[4] || MISSION_IDEAS.find((m) => m[0].toLowerCase() === title)?.[2] || null;
}
async function mascotDance(msg, scene = null) {
  try { mascotSvg ??= await (await fetch("illustrations/mascote.svg?v=2026-10-28.18")).text(); } catch { return toast(msg); }
  const stage = scene && (await loadScenes())?.sceneSvg(scene, mascotSvg);
  document.querySelector(".dance")?.remove();
  const el = document.createElement("div");
  el.className = "dance";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="dance-stars">${"⭐🌟✨⭐🌟✨⭐🌟".split(/(?=[⭐🌟✨])/u).map((c, i) => `<i style="--i:${i}">${c}</i>`).join("")}</div>
    <div class="dance-bubble">${esc(msg)}</div><div class="dance-mascot ${stage ? "wide" : ""}">${stage || mascotSvg}</div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 300); };
  el.onclick = close;
  setTimeout(close, stage ? 3800 : 2800);
}

// ---------- Regras de negócio ----------
/**
 * Tarefas de um filho. Há dois tipos e ambos aparecem todos os dias:
 * recorrentes (para fazer sempre) e espontâneas (pontos extra quando acontecem).
 * Tarefas antigas "só um dia" passam a contar como espontâneas.
 */
function tasksFor(kidId) {
  return S.tasks.filter((t) => t.active !== false && !isSpecial(t) && (!t.kidIds?.length || t.kidIds.includes(kidId)));
}
const isRecurring = (t) => !!t.recurring;

// ---------- Missões (tarefas com prazo) ----------
// O pai/mãe define "até dia X". O filho pode dizer que já fez; no fim do prazo o pai/mãe decide
// se ganhou os pontos. Os registos têm type "special" e taskId.
const isSpecial = (t) => !!t.special && !!t.deadline;
/** Fim do prazo: 23:59:59 do dia escolhido, na hora do aparelho. */
const deadlineMs = (t) => { const [y, m, d] = t.deadline.split("-").map(Number); return new Date(y, m - 1, d, 23, 59, 59).getTime(); };
const isOver = (t) => Date.now() > deadlineMs(t);
const kidsOf = (t) => (t.kidIds?.length ? S.kids.filter((k) => t.kidIds.includes(k.id)) : S.kids);
/** Registo mais recente de um filho numa missão (S.log vem do mais recente para o mais antigo). */
const specialEntry = (kidId, taskId) => S.log.find((e) => e.type === "special" && e.kidId === kidId && e.taskId === taskId);
const specialsFor = (kidId) => S.tasks.filter((t) => t.active !== false && isSpecial(t) && (!t.kidIds?.length || t.kidIds.includes(kidId)));
/** Missões já terminadas em que este filho ainda não tem decisão. */
const undecidedSpecials = () => S.tasks.filter((t) => t.active !== false && isSpecial(t) && isOver(t))
  .flatMap((t) => kidsOf(t).filter((k) => !specialEntry(k.id, t.id)).map((k) => ({ t, k })));

function countdownText(ms) {
  if (ms <= 0) return tr("Terminou");
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${d ? `${d}d ` : ""}${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}
// Os contadores descem sozinhos; quando um chega a zero, o ecrã é redesenhado.
setInterval(() => {
  let ended = false;
  document.querySelectorAll("[data-deadline]").forEach((el) => {
    const left = Number(el.dataset.deadline) - Date.now();
    if (left <= 0 && el.textContent !== tr("Terminou")) ended = true;
    el.textContent = countdownText(left);
  });
  if (ended) render();
}, 1000);

/** O pai/mãe decide uma missão terminada em que o filho não chegou a dizer que fez. */
async function decideSpecial(task, kidId, won) {
  await runTransaction(db, async (tx) => {
    const kRef = doc(col("kids"), kidId);
    const k = await tx.get(kRef);
    if (!k.exists()) throw new Error(tr("Este filho já não existe."));
    const cur = k.data().points || 0;
    const next = won ? Math.max(0, cur + task.points) : cur;
    if (won) tx.update(kRef, { points: next });
    tx.set(doc(col("log")), {
      kidId, type: "special", taskId: task.id, title: task.title, points: task.points, applied: next - cur,
      date: today(), status: won ? "approved" : "rejected", createdAt: serverTimestamp(), decidedAt: serverTimestamp(),
    });
  });
}

// Ideias para começar (o pai/mãe escolhe quais quer adicionar).
// Tarefas: [título, pontos, idade mínima, idade máxima, cena da mascote (scenes.js)]. Uma criança que faça tudo ganha 30–50 pontos por dia;
// os prémios vão de 1–2 dias (pequenos) a 1–2 meses (grandes) de esforço.
const TASK_IDEAS = [
  [tr("Fazer a cama"), 5, 4, 17, "cama"], [tr("Lavar os dentes (manhã e noite)"), 5, 4, 17, "dentes"], [tr("Vestir-se sozinho(a)"), 3, 4, 8, "vestir"],
  [tr("Arrumar os brinquedos"), 5, 4, 9, "brinquedos"], [tr("Pôr a roupa suja no cesto"), 3, 4, 17, "cesto"], [tr("Pôr a mesa"), 5, 5, 17, "pormesa"],
  [tr("Levantar a mesa"), 5, 5, 17, "levantarmesa"], [tr("Comer a fruta e os legumes"), 5, 4, 17, "fruta"], [tr("Tomar banho sem reclamar"), 5, 4, 10, "banho"],
  [tr("Ir para a cama à hora combinada"), 5, 4, 17, "deitar"], [tr("Arrumar sapatos e casaco ao chegar"), 3, 4, 17, "sapatos"],
  [tr("Dar comida e água ao animal"), 5, 6, 17, "animal"], [tr("Preparar a mochila para o dia seguinte"), 5, 6, 17, "mochila"],
  [tr("Fazer os trabalhos de casa"), 10, 6, 17, "tpc"], [tr("Ler 20 minutos"), 10, 6, 17, "ler"], [tr("Arrumar o quarto"), 10, 6, 17, "quarto"],
  [tr("Praticar instrumento ou desporto (15 min)"), 10, 7, 17, "desporto"], [tr("Cumprir o limite de tempo de ecrã"), 10, 7, 17, "ecra"],
  [tr("Ajudar a arrumar a loiça"), 5, 7, 17, "loica"], [tr("Levar o lixo ou a reciclagem"), 5, 8, 17, "lixo"],
  [tr("Estudar para um teste (30 min)"), 15, 9, 17, "estudar"], [tr("Preparar o próprio lanche"), 5, 9, 17, "lanche"],
  [tr("Estender ou dobrar a roupa"), 10, 10, 17, "roupa"], [tr("Aspirar ou varrer uma divisão"), 10, 10, 17, "aspirar"],
];
const REWARD_IDEAS = [
  [tr("Escolher a sobremesa do jantar"), 30], [tr("15 minutos extra de ecrã"), 30], [tr("Escolher a música no carro durante uma semana"), 40],
  [tr("Escolher o filme da noite em família"), 50], [tr("Deitar 30 min mais tarde (fim de semana)"), 60], [tr("Gelado ou doce ao fim de semana"), 60],
  [tr("Escolher o jantar de um dia"), 80], [tr("Vale \"hoje não faço uma tarefa\""), 80], [tr("Pequeno-almoço na cama"), 100],
  [tr("Noite de jogos de tabuleiro (escolhe o jogo)"), 100], [tr("1 hora extra de consola ao fim de semana"), 120],
  [tr("Convidar um amigo para brincar cá em casa"), 150], [tr("Ir ao parque ou à praia à escolha"), 150], [tr("Um livro novo"), 250],
  [tr("Acampar na sala / dormida com amigo"), 300], [tr("Uma tarde a sós com o pai ou a mãe"), 300], [tr("Ida ao cinema"), 400],
  [tr("Escolher o programa do fim de semana"), 400], [tr("Brinquedo ou jogo até 15 €"), 600],
  [tr("Atividade nova à escolha (karting, escalada…)"), 800], [tr("Ida ao zoo, aquário ou parque de diversões"), 1000],
  [tr("Prenda maior à escolha (até 40 €)"), 1500],
];
// Sugestões ao criar uma missão (o pai/mãe pode escrever outra).
// [título, pontos, cena da mascote (scenes.js)]
const MISSION_IDEAS = [
  [tr("Ler um livro inteiro"), 50, "livro"], [tr("Arrumar e organizar o armário"), 30, "armario"], [tr("Ajudar a lavar o carro"), 25, "carro"],
  [tr("Aprender algo novo (andar de bicicleta, nadar, atar os sapatos…)"), 60, "aprender"],
];

/** Registo mais recente de uma tarefa para um filho num dia. */
const taskEntry = (kidId, taskId, date) =>
  S.log.find((e) => e.type === "task" && e.kidId === kidId && e.taskId === taskId && e.date === date);

const pendingRewardCost = (kidId) => S.log
  .filter((e) => e.type === "reward" && e.kidId === kidId && e.status === "pending")
  .reduce((s, e) => s + Math.abs(e.points), 0);

const available = (kid) => (kid.points || 0) - pendingRewardCost(kid.id);

/** Aprova um registo pendente e aplica os pontos ao saldo (que nunca desce abaixo de 0). */
async function approveEntry(entryId, pointsOverride = null) {
  await runTransaction(db, async (tx) => {
    const eRef = doc(col("log"), entryId);
    const e = await tx.get(eRef);
    if (!e.exists() || e.data().status !== "pending") throw new Error(tr("Este pedido já foi tratado."));
    const entry = e.data();
    const kRef = doc(col("kids"), entry.kidId);
    const k = await tx.get(kRef);
    if (!k.exists()) throw new Error(tr("Este filho já não existe."));
    const cur = k.data().points || 0;
    // Nos extras sugeridos pelos filhos, os pontos são os que o pai/mãe decide ao aprovar.
    if (entry.type === "extra" && pointsOverride == null) throw new Error(tr("Usa \"Dar pontos\" para decidir quantos pontos vale."));
    const points = pointsOverride ?? entry.points;
    if (entry.type === "reward" && cur < Math.abs(points)) throw new Error(tr("Saldo insuficiente para esta recompensa."));
    const next = Math.max(0, cur + points);
    tx.update(kRef, { points: next });
    tx.update(eRef, { status: "approved", points, applied: next - cur, decidedAt: serverTimestamp() });
  });
}

async function rejectEntry(entryId) {
  await updateDoc(doc(col("log"), entryId), { status: "rejected", decidedAt: serverTimestamp() });
}

/** Bónus ou penalização dada pelo pai: entra logo como aprovada. */
async function adjustPoints(kidId, points, title) {
  await runTransaction(db, async (tx) => {
    const kRef = doc(col("kids"), kidId);
    const k = await tx.get(kRef);
    if (!k.exists()) throw new Error(tr("Este filho já não existe."));
    const cur = k.data().points || 0;
    const next = Math.max(0, cur + points);
    tx.update(kRef, { points: next });
    tx.set(doc(col("log")), {
      kidId, type: points < 0 ? "penalty" : "bonus", title, points, applied: next - cur,
      date: today(), status: "approved", createdAt: serverTimestamp(), decidedAt: serverTimestamp(),
    });
  });
}

// ---------- Gráfico semanal ----------
/** Pontos ganhos e perdidos por dia (só registos aprovados; os prémios trocados não contam). */
function dailyPoints(kidId, days) {
  const map = Object.fromEntries(days.map((d) => [d, { gain: 0, loss: 0 }]));
  for (const e of S.log) {
    if (e.kidId !== kidId || e.status !== "approved" || e.type === "reward" || !map[e.date]) continue;
    const v = e.applied ?? e.points;
    if (v >= 0) map[e.date].gain += v; else map[e.date].loss -= v;
  }
  return map;
}

/** Barra com a ponta arredondada (4px) e quadrada junto à linha do zero. */
function barPath(x, y, w, h, up) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return up
    ? `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
    : `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
}

function weekChart(kid) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 13));
  const cur = dailyPoints(kid.id, days), prev = dailyPoints(kid.id, prevDays);
  const net = (m) => Object.values(m).reduce((s, v) => s + v.gain - v.loss, 0);
  const week = net(cur), last = net(prev), diff = week - last;
  const maxG = Math.max(10, ...days.map((d) => cur[d].gain));
  const maxL = Math.max(0, ...days.map((d) => cur[d].loss));
  const W = 308, top = 14, labelH = 20, plotH = maxL ? 120 : 96, H = top + plotH + labelH;
  const k = plotH / (maxG + maxL), zeroY = top + maxG * k;
  const slot = W / 7, bw = Math.min(24, slot * 0.55);
  const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);
  const cols = days.map((d, i) => {
    const { gain, loss } = cur[d];
    const x = i * slot + (slot - bw) / 2;
    const gh = gain * k, lh = loss * k;
    const label = d === today() ? tr("Hoje") : weekday(d);
    return `<g>
      <path class="bar-gain" d="${barPath(x, zeroY - gh - 1, bw, gh, true)}"/>
      <path class="bar-loss" d="${barPath(x, zeroY + 1, bw, lh, false)}"/>
      <text x="${i * slot + slot / 2}" y="${H - 5}" text-anchor="middle" class="axis${d === today() ? " now" : ""}">${label}</text>
      <rect class="hit" x="${i * slot}" y="0" width="${slot}" height="${H}" data-chart-day data-kid="${kid.id}"
        data-text="${esc(`${dayLabel(d)}: ${gain ? tr("+{n} ganhos", { n: gain }) : tr("nada ganho")}${loss ? ` · ${tr("−{n} perdidos", { n: loss })}` : ""}`)}"/>
    </g>`;
  }).join("");
  const summary = `${tr("Últimos 7 dias: {n} pontos.", { n: fmt(week) })} ${days.map((d) => `${dayLabel(d)} +${cur[d].gain}${cur[d].loss ? ` −${cur[d].loss}` : ""}`).join(", ")}.`;
  return `<div class="chart">
    <div class="row spread wrap">
      <div><b>${tr("Últimos 7 dias: {n}", { n: fmt(week) })}</b>
        <div class="small muted">${diff === 0 ? tr("Igual aos 7 dias anteriores") : tr("{arrow} {n} vs. 7 dias anteriores ({last})", { arrow: diff > 0 ? "▲" : "▼", n: Math.abs(diff), last: fmt(last) })}</div></div>
      <div class="legend small"><span><i class="sw gain"></i>${tr("Ganhos")}</span><span><i class="sw loss"></i>${tr("Perdidos")}</span></div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">
      <line class="grid" x1="0" x2="${W}" y1="${top}" y2="${top}"/>
      <text class="axis" x="0" y="${top - 4}">${maxG}</text>
      ${cols}
      <line class="base" x1="0" x2="${W}" y1="${zeroY}" y2="${zeroY}"/>
    </svg>
    <div class="small muted chart-cap" id="cap-${kid.id}">${tr("Toca numa barra para ver o dia.")}</div>
  </div>`;
}

/** Pontos líquidos (ganhos − perdidos) de um filho nos últimos 7 dias. */
function weekNet(kidId) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  return Object.values(dailyPoints(kidId, days)).reduce((s, v) => s + v.gain - v.loss, 0);
}

/**
 * Comparação dos irmãos nos últimos 7 dias. Com `me`, diz a esse filho quantos pontos
 * está acima ou abaixo de cada irmão.
 */
function siblingsSummary(me = null) {
  if (S.kids.length < 2) return "";
  const rows = S.kids.map((k) => ({ k, net: weekNet(k.id) })).sort((a, b) => b.net - a.net || a.k.name.localeCompare(b.k.name, LOCALE));
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
  const fmt = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
  const myNet = me ? weekNet(me.id) : 0;
  const compare = (r) => {
    if (!me || r.k.id === me.id) return "";
    const d = myNet - r.net;
    const v = { name: esc(r.k.name), n: Math.abs(d) };
    return `<div class="small muted">${d === 0 ? tr("Estás empatado com {name}", v) : d > 0 ? tr("Estás <b>▲ {n} pontos acima</b> de {name}", v) : tr("Estás <b>▼ {n} pontos abaixo</b> de {name}", v)}</div>`;
  };
  return `<div class="card sibs">
    <div class="small muted" style="margin-bottom:8px">${tr("Pontos ganhos menos perdidos nos últimos 7 dias")}</div>
    ${rows.map((r) => `<div class="sib ${me && r.k.id === me.id ? "me" : ""}">
      <div class="row">${avatar(r.k, "sm")}
        <div class="grow"><b>${esc(r.k.name)}${me && r.k.id === me.id ? ` ${tr("(tu)")}` : ""}</b>${compare(r)}</div>
        <span class="pts">${fmt(r.net)}</span></div>
      <div class="sib-track"><i class="${r.net < 0 ? "neg" : ""}" style="width:${Math.round((Math.abs(r.net) / max) * 100)}%"></i></div>
    </div>`).join("")}
  </div>`;
}

function bindCharts() {
  app.querySelectorAll("[data-chart-day]").forEach((el) => {
    const show = () => {
      const cap = document.getElementById(`cap-${el.dataset.kid}`);
      if (cap) cap.textContent = el.dataset.text;
      el.closest("svg").querySelectorAll(".hit.on").forEach((h) => h.classList.remove("on"));
      el.classList.add("on");
    };
    el.addEventListener("click", show);
    el.addEventListener("mouseenter", show);
  });
}

const CORRECTABLE = ["task", "extra", "bonus", "penalty", "special"];

function historyItem(e, showKid, editable = false) {
  const icon = { task: "✅", reward: "🎁", penalty: "⚠️", bonus: "🌟", extra: "💡", special: "🚀" }[e.type] || "•";
  const floorNote = e.status === "approved" && e.applied !== undefined && e.applied !== e.points
    ? `<div class="small muted">${tr("Aplicado: {n} (o saldo não desce abaixo de 0)", { n: e.applied })}</div>` : "";
  // Um extra à espera ainda não tem pontos: mostra os que o filho pediu.
  const pts = e.type === "extra" && e.status === "pending"
    ? `<span class="pts">${e.suggested ? tr("pede {n}", { n: e.suggested }) : "?"}</span>` : ptsHtml(e.points);
  const canFix = editable && ["approved", "rejected"].includes(e.status) && CORRECTABLE.includes(e.type);
  return `<div class="card row">
    <div style="font-size:1.4rem">${icon}</div>
    <div class="grow"><div><b>${esc(e.title)}</b></div>
      <div class="small muted">${fmtDate(e.date)}${showKid ? " · " + esc(kidName(e.kidId)) : ""}${e.corrected ? ` · ${tr("corrigido")}` : ""}</div>${floorNote}
      ${canFix ? `<button class="link" style="padding:4px 0" data-fix="${e.id}">${tr("Corrigir pontos")}</button>` : ""}</div>
    <div style="text-align:right">${pts}<div>${statusPill(e.status)}</div></div></div>`;
}

/**
 * Corrige os pontos de um registo aprovado ou rejeitado e acerta o saldo pela diferença
 * (o saldo continua a não descer abaixo de 0). Com pontos > 0 fica aprovado; com 0 fica
 * rejeitado. O filho é avisado da correção.
 */
async function correctEntry(entryId, newPoints) {
  await runTransaction(db, async (tx) => {
    const eRef = doc(col("log"), entryId);
    const e = await tx.get(eRef);
    if (!e.exists() || !["approved", "rejected"].includes(e.data().status)) throw new Error(tr("Este registo já não pode ser corrigido."));
    const entry = e.data();
    const kRef = doc(col("kids"), entry.kidId);
    const k = await tx.get(kRef);
    if (!k.exists()) throw new Error(tr("Este filho já não existe."));
    const cur = k.data().points || 0;
    // Um registo rejeitado não mexeu no saldo.
    const base = entry.status === "approved" ? cur - (entry.applied ?? entry.points) : cur;
    const next = Math.max(0, base + newPoints);
    tx.update(kRef, { points: next });
    tx.update(eRef, {
      status: newPoints === 0 ? "rejected" : "approved", points: newPoints, applied: next - base,
      corrected: true, decidedAt: serverTimestamp(), notifiedKid: false,
    });
  });
}

function fixForm(e) {
  const isPenalty = e.type === "penalty";
  const rejected = e.status === "rejected";
  // Para um rejeitado, sugere os pontos da tarefa (ou os pedidos, num extra).
  const task = S.tasks.find((t) => t.id === e.taskId);
  const value = rejected ? (e.type === "extra" ? e.suggested ?? "" : task?.points ?? Math.abs(e.points)) : Math.abs(e.points);
  openForm(tr("Corrigir \"{title}\"", { title: e.title }), `<p class="small muted">${esc(kidName(e.kidId))} · ${fmtDate(e.date)} · ${rejected ? tr("estava rejeitado") : tr("agora: {n} pontos", { n: e.points })}.
      ${tr("O saldo é acertado pela diferença. Com 0 fica rejeitado.")}</p>
    <label>${isPenalty ? tr("Pontos a retirar") : tr("Pontos certos")}</label>
    <input name="points" type="number" inputmode="numeric" min="0" required value="${value}">`,
  async (fd) => {
    const n = readPoints(fd.get("points"), { allowZero: true });
    await correctEntry(e.id, isPenalty ? -n : n);
    toast(tr("Pontos corrigidos."));
  }, tr("Corrigir"));
}

// ---------- Vista do filho ----------
function renderKid(kid) {
  const tabs = [
    { id: "today", icon: "tasks", label: tr("Tarefas") },
    { id: "rewards", icon: "rewards", label: tr("Prémios") },
    { id: "history", icon: "history", label: tr("Histórico") },
  ];
  const nav = renderTabs(tabs);
  let body = "";
  if (S.tab === "today") body = kidToday(kid);
  if (S.tab === "rewards") body = kidRewards(kid);
  if (S.tab === "history") {
    const items = S.log.filter((e) => e.kidId === kid.id);
    body = `${S.kids.length > 1 ? `<h2>${S.kids.length > 2 ? tr("Eu e os meus irmãos") : tr("Eu e o meu irmão")}</h2>${siblingsSummary(kid)}` : ""}<h2>${tr("A minha semana")}</h2>${weekChart(kid)}<h2>${tr("Histórico")}</h2>`
      + (items.length ? items.map((e) => historyItem(e, false)).join("") : `<div class="empty">${tr("Ainda não há nada no histórico.")}</div>`);
  }
  const pending = S.log.filter((e) => e.kidId === kid.id && e.type === "task" && e.status === "pending")
    .reduce((s, e) => s + e.points, 0);
  renderShell(`<div class="header"><h1 class="row"><button class="avatar-btn" id="myPhoto" aria-label="${tr("Mudar a minha foto")}">${avatar(kid, "md")}<span class="cam">📷</span></button> ${esc(kid.name)}</h1><div>${bellButton(kid.id)}<button class="link" id="switch">${tr("Trocar")}</button></div></div>
    <div class="balance"><img src="illustrations/mascote.svg" alt="" class="bal-mascot"><div class="big">⭐ ${kid.points || 0}</div><div>${tr("pontos")}${pending ? ` · ${tr("+{n} por validar", { n: pending })}` : ""}</div></div>
    ${body}`, nav);
  document.getElementById("switch").onclick = () => setRole(null);
  bindTabs();
  document.getElementById("bell").onclick = () => guard(() => togglePush(kid.id));
  document.getElementById("myPhoto").onclick = () => photoForm(tr("A foto de {name}", { name: kid.name }), kid.photo, (photo) => updateDoc(doc(col("kids"), kid.id), { photo }));
  bindKidActions(kid);
  bindCharts();
}

/** Dias que o filho pode marcar, do mais recente para o mais antigo. */
const markableDays = () => Array.from({ length: backDays() + 1 }, (_, i) => addDays(today(), -i));

/** Tarefas do dia ainda por marcar. */
/** Tarefas recorrentes do dia ainda por marcar. */
const unmarkedCount = (kidId, date) => tasksFor(kidId).filter((t) => isRecurring(t) && !taskEntry(kidId, t.id, date)).length;

function specialsBox(kid) {
  const now = Date.now();
  const list = specialsFor(kid.id).filter((t) => {
    const e = specialEntry(kid.id, t.id);
    // Depois de decidida, continua à vista mais 3 dias para o filho ver o resultado.
    return !isOver(t) || !e || e.status === "pending" || now < deadlineMs(t) + 3 * 86400000;
  }).sort((a, b) => deadlineMs(a) - deadlineMs(b));
  if (!list.length) return "";
  return `<h2>🚀 ${tr("Missões")}</h2>` + list.map((t) => {
    const e = specialEntry(kid.id, t.id), over = isOver(t);
    let status;
    if (e?.status === "approved") status = `<div class="sp-result win">🎉 ${tr("Ganhaste {pts} pontos!", { pts: ptsHtml(e.applied ?? e.points) })}</div>`;
    else if (e?.status === "rejected") status = `<div class="sp-result">😕 ${tr("Desta vez não ganhaste.")}</div>`;
    else if (e?.status === "pending") status = `<div class="row spread"><span class="pill pending">⏳ ${tr("À espera do pai/mãe")}</span>${over ? "" : `<button class="link" data-special-undo="${e.id}">${tr("Cancelar")}</button>`}</div>`;
    else if (over) status = `<div class="sp-result">⌛ ${tr("Terminou — o pai/mãe vai decidir.")}</div>`;
    else status = `<button class="primary block" data-special-done="${t.id}">✋ ${tr("Já fiz!")}</button>`;
    return `<div class="special ${over ? "over" : ""}">
      <div class="row spread"><b class="sp-title">${esc(t.title)}</b><span class="sp-pts">+${t.points}</span></div>
      <div class="small" style="font-weight:600">${tr("Até {date}", { date: `${weekday(t.deadline)} ${fmtDate(t.deadline)}` })}</div>
      ${over || ["approved", "rejected"].includes(e?.status) ? "" : `<div class="sp-count" data-deadline="${deadlineMs(t)}">${countdownText(deadlineMs(t) - now)}</div>`}
      ${status}
    </div>`;
  }).join("");
}

function kidToday(kid) {
  const special = specialsBox(kid);
  const days = markableDays();
  // Volta a hoje se o dia escolhido saiu da janela (mudou o dia ou o pai/mãe reduziu o limite).
  if (!days.includes(S.kidDate)) S.kidDate = today();
  const date = S.kidDate;
  const strip = days.length > 1 ? `<div class="days">${days.map((d) => {
    const left = unmarkedCount(kid.id, d);
    return `<button class="day ${d === date ? "active" : ""}" data-day="${d}">${dayLabel(d)}${left ? ` <span class="dot">${left}</span>` : ""}</button>`;
  }).join("")}</div>` : "";
  const tasks = tasksFor(kid.id);
  const isToday = date === today();
  if (!tasks.length) return special + strip + `<div class="empty">${tr("Ainda não há tarefas.")} 🎉</div>`;
  const rec = tasks.filter(isRecurring), extra = tasks.filter((t) => !isRecurring(t));
  const done = rec.filter((t) => taskEntry(kid.id, t.id, date)).length;
  const hint = isToday ? tr("Toca nas tarefas que fizeste hoje. O pai/mãe depois valida.")
    : date === addDays(today(), -1) ? tr("Toca nas tarefas que fizeste ontem. O pai/mãe depois valida.")
    : tr("Toca nas tarefas que fizeste em {day}. O pai/mãe depois valida.", { day: dayLabel(date) });
  return special + strip + `<p class="muted">${hint}</p>`
    + (rec.length ? `<h2>📅 ${tr("Todos os dias")} <span class="muted small">· ${tr("{done}/{total} feitas", { done, total: rec.length })}</span></h2>${rec.map((x) => taskButton(kid, x, date)).join("")}` : "")
    + (extra.length ? `<h2>✨ ${tr("Espontâneas")}</h2><p class="small muted">${tr("Fizeste alguma destas? Ganha pontos extra!")}</p>${extra.map((x) => taskButton(kid, x, date)).join("")}` : "")
    + extraBox(kid, date);
}

/** Pedido de pontos por algo que não está na lista; o pai/mãe decide se aceita e quantos pontos vale. */
function extraBox(kid, date) {
  const mine = S.log.filter((e) => e.type === "extra" && e.kidId === kid.id && e.date === date);
  return `<h2>💡 ${tr("Fizeste outra coisa?")}</h2>
    <p class="small muted">${tr("Conta o que fizeste que não está na lista. O pai/mãe decide se vale pontos e quantos.")}</p>
    ${mine.map((e) => `<div class="card row"><div class="grow"><b>${esc(e.title)}</b>
      ${e.status === "pending" ? `<div class="small muted">${e.suggested ? tr("Pediste {n} pontos", { n: e.suggested }) : tr("À espera do pai/mãe")}</div>` : ""}</div>
      ${e.status === "approved" ? ptsHtml(e.points) : ""}${statusPill(e.status)}
      ${e.status === "pending" ? `<button class="link" data-undo-extra="${e.id}">${tr("Cancelar")}</button>` : ""}</div>`).join("")}
    <form class="card" id="extraForm">
      <input name="title" required maxlength="100" placeholder="${tr("Ex: Ajudei a vizinha com as compras")}">
      <div class="row" style="margin-top:8px">
        <input name="suggested" type="number" inputmode="numeric" min="1" placeholder="${tr("Pontos que achas que vale (opcional)")}" class="grow">
        <button class="primary" type="submit">${tr("Pedir")}</button>
      </div>
    </form>`;
}

function taskButton(kid, t, date) {
  const e = taskEntry(kid.id, t.id, date);
  const st = e?.status || "";
  const mark = { pending: "⏳", approved: "✓", rejected: "✕" }[st] || "";
  return `<button class="task ${st}" data-task="${t.id}">
    <span class="check">${mark}</span>
    <span class="grow"><b>${esc(t.title)}</b>${st ? `<br><span class="small muted">${STATUS_LABEL[st]}${st === "pending" ? ` · ${tr("toca para desmarcar")}` : ""}</span>` : ""}</span>
    ${ptsHtml(t.points)}</button>`;
}

function kidRewards(kid) {
  const active = S.rewards.filter((r) => r.status === "active");
  const mine = S.rewards.filter((r) => r.suggestedBy === kid.id && r.status !== "active");
  const requests = S.log.filter((e) => e.kidId === kid.id && e.type === "reward" && e.status === "pending");
  const avail = available(kid);
  return `${requests.length ? `<h2>${tr("Pedidos à espera")}</h2>${requests.map((e) => historyItem(e, false)).join("")}` : ""}
    <h2>${tr("Prémios")}</h2>
    ${active.length ? active.map((r) => {
      const can = avail >= r.cost;
      return `<div class="card row"><div class="grow"><b>${esc(r.title)}</b>
        <div class="small muted">${can ? tr("Já tens pontos suficientes!") : tr("Faltam {n} pontos", { n: r.cost - avail })}</div></div>
        <span class="pts">⭐ ${r.cost}</span>
        <button class="primary" data-claim="${r.id}" ${can ? "" : "disabled"}>${tr("Pedir")}</button></div>`;
    }).join("") : `<div class="empty">${tr("Ainda não há prémios. Sugere um!")}</div>`}
    <h2>${tr("Sugerir um prémio")}</h2>
    <form class="card row" id="suggestForm"><input name="title" placeholder="${tr("O que gostavas de ganhar?")}" required maxlength="80" class="grow">
      <button class="primary" type="submit">${tr("Sugerir")}</button></form>
    ${mine.length ? `<h2>${tr("As minhas sugestões")}</h2>${mine.map((r) => `<div class="card row"><div class="grow">${esc(r.title)}</div>
      <span class="pill ${r.status === "rejected" ? "rejected" : "pending"}">${r.status === "rejected" ? tr("Recusada") : tr("À espera do preço")}</span></div>`).join("")}` : ""}`;
}

function bindKidActions(kid) {
  app.querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => { S.kidDate = b.dataset.day; render(); }));
  app.querySelectorAll("[data-task]").forEach((b) => (b.onclick = () => guard(async () => {
    const t = S.tasks.find((x) => x.id === b.dataset.task);
    const date = S.kidDate || today();
    if (!markableDays().includes(date)) throw new Error(tr("Já não dá para marcar tarefas deste dia."));
    const e = taskEntry(kid.id, t.id, date);
    if (!e) {
      await addDoc(col("log"), {
        kidId: kid.id, type: "task", taskId: t.id, title: t.title, points: t.points,
        date, status: "pending", createdAt: serverTimestamp(),
      });
      mascotDance(tr("Boa! Agora o pai/mãe tem de validar."), sceneFor(t));
    } else if (e.status === "pending") {
      await deleteDoc(doc(col("log"), e.id));
    } else {
      toast(e.status === "approved" ? tr("Esta já está aprovada. 👍") : tr("Esta foi rejeitada."));
    }
  })));
  app.querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => guard(async () => {
    const r = S.rewards.find((x) => x.id === b.dataset.claim);
    if (available(kid) < r.cost) throw new Error(tr("Ainda não tens pontos suficientes."));
    if (!confirm(tr("Pedir \"{title}\" por {n} pontos?", { title: r.title, n: r.cost }))) return;
    await addDoc(col("log"), {
      kidId: kid.id, type: "reward", rewardId: r.id, title: r.title, points: -r.cost,
      date: today(), status: "pending", createdAt: serverTimestamp(),
    });
    toast(tr("Pedido enviado ao pai/mãe!"));
  })));
  app.querySelectorAll("[data-special-done]").forEach((b) => (b.onclick = () => guard(async () => {
    const t = S.tasks.find((x) => x.id === b.dataset.specialDone);
    if (!t || isOver(t)) throw new Error(tr("O prazo desta missão já terminou."));
    if (specialEntry(kid.id, t.id)) return;
    await addDoc(col("log"), {
      kidId: kid.id, type: "special", taskId: t.id, title: t.title, points: t.points,
      date: today(), status: "pending", createdAt: serverTimestamp(),
    });
    mascotDance(tr("Missão cumprida! O pai/mãe vai ver. 🤞"), sceneFor(t));
  })));
  app.querySelectorAll("[data-special-undo]").forEach((b) => (b.onclick = () => guard(() => deleteDoc(doc(col("log"), b.dataset.specialUndo)))));
  const xf = document.getElementById("extraForm");
  if (xf) xf.onsubmit = (ev) => {
    ev.preventDefault();
    const title = xf.title.value.trim();
    if (!title) return;
    const sug = xf.suggested.value ? Number(xf.suggested.value) : null;
    guard(async () => {
      if (sug !== null) readPoints(sug);
      await addDoc(col("log"), {
        kidId: kid.id, type: "extra", title, points: 0, suggested: sug,
        date: S.kidDate || today(), status: "pending", createdAt: serverTimestamp(),
      });
      toast(tr("Pedido enviado! O pai/mãe vai decidir. 🤞"));
    });
  };
  app.querySelectorAll("[data-undo-extra]").forEach((b) => (b.onclick = () => guard(() => deleteDoc(doc(col("log"), b.dataset.undoExtra)))));
  const sf = document.getElementById("suggestForm");
  if (sf) sf.onsubmit = (ev) => {
    ev.preventDefault();
    const title = sf.title.value.trim();
    if (!title) return;
    guard(async () => {
      await addDoc(col("rewards"), { title, status: "suggested", suggestedBy: kid.id, cost: null, createdAt: serverTimestamp() });
      toast(tr("Sugestão enviada!"));
    });
  };
}

// ---------- Vista do pai ----------
function renderParent() {
  const pending = S.log.filter((e) => e.status === "pending");
  const suggestions = S.rewards.filter((r) => r.status === "suggested");
  const tabs = [
    { id: "validate", icon: "validate", label: tr("Validar"), badge: pending.length + suggestions.length + undecidedSpecials().length },
    { id: "kids", icon: "kids", label: tr("Filhos") },
    { id: "tasks", icon: "tasks", label: tr("Tarefas") },
    { id: "rewards", icon: "rewards", label: tr("Prémios") },
    { id: "history", icon: "history", label: tr("Histórico") },
  ];
  const nav = renderTabs(tabs);
  const views = { validate: parentValidate, kids: parentKids, tasks: parentTasks, rewards: parentRewards, history: parentHistory };
  renderShell(`<div class="header"><h1 class="row"><button class="avatar-btn" id="myPhoto" aria-label="${tr("Mudar a foto do pai/mãe")}">${parentAvatar("md")}<span class="cam">📷</span></button> ${tr("Pai / Mãe")}</h1>
    <div>${bellButton("parent")}<button class="icon-btn" id="settings" title="${tr("Definições")}" aria-label="${tr("Definições")}">${ICON.settings}</button><button class="link" id="switch">${tr("Trocar")}</button></div></div>
    ${views[S.tab]()}`, nav);
  document.getElementById("switch").onclick = () => setRole(null);
  document.getElementById("settings").onclick = openSettings;
  bindTabs();
  document.getElementById("bell").onclick = () => guard(() => togglePush("parent"));
  document.getElementById("myPhoto").onclick = () => photoForm(tr("Foto do pai/mãe"), S.fam.parentPhoto, (photo) => updateDoc(famDoc(), { parentPhoto: photo }));
  bindParentActions();
  bindCharts();
}

function parentValidate() {
  const pending = S.log.filter((e) => e.status === "pending");
  const suggestions = S.rewards.filter((r) => r.status === "suggested");
  const ended = undecidedSpecials();
  if (!pending.length && !suggestions.length && !ended.length) return `<div class="empty">${tr("Nada por validar.")} ✨</div>`;
  let html = "";
  if (ended.length) {
    html += `<h2>🚀 ${tr("Missões terminadas")}</h2><p class="small muted">${tr("O prazo acabou. Ganharam os pontos?")}</p>`
      + ended.map(({ t, k }) => `<div class="card row wrap">
        ${avatar(k, "sm")}
        <div class="grow"><b>${esc(t.title)}</b><div class="small muted">${esc(k.name)} · ${tr("terminou {date}", { date: fmtDate(t.deadline) })}</div></div>
        <button class="good" data-special-win="${t.id}|${k.id}">${tr("Ganhou +{n}", { n: t.points })}</button>
        <button class="bad" data-special-lose="${t.id}|${k.id}">${tr("Não")}</button></div>`).join("");
  }
  for (const kid of S.kids) {
    const items = pending.filter((e) => e.kidId === kid.id).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) continue;
    const taskCount = items.filter((e) => e.type === "task").length;
    html += `<div class="row spread"><h2 class="row">${avatar(kid, "sm")} ${esc(kid.name)} <span class="muted small">· ${tr("saldo {n}", { n: kid.points || 0 })}</span></h2>
      ${taskCount > 1 ? `<button class="good" data-approve-all="${kid.id}">${tr("Aprovar tarefas ({n})", { n: taskCount })}</button>` : ""}</div>`;
    html += items.map((e) => e.type === "special" ? `<div class="card row wrap special-row">
      <div style="font-size:1.3rem">🚀</div>
      <div class="grow"><b>${esc(e.title)}</b><div class="small muted">${tr("Missão · diz que já fez")} · ${dayLabel(e.date)}</div></div>
      ${ptsHtml(e.points)}
      <button class="good" data-approve="${e.id}" aria-label="${tr("Ganhou")}">✓</button>
      <button class="bad" data-reject="${e.id}" aria-label="${tr("Não ganhou")}">✕</button></div>` : e.type === "extra" ? `<div class="card row wrap">
      <div style="font-size:1.3rem">💡</div>
      <div class="grow"><b>${esc(e.title)}</b><div class="small muted">${tr("Extra fora da lista")} · ${dayLabel(e.date)}${e.suggested ? ` · ${tr("pede {n} pts", { n: e.suggested })}` : ""}</div></div>
      <button class="good" data-give-extra="${e.id}">${tr("Dar pontos")}</button>
      <button class="bad" data-reject="${e.id}" aria-label="${tr("Rejeitar")}">✕</button></div>` : `<div class="card row wrap">
      <div style="font-size:1.3rem">${e.type === "reward" ? "🎁" : "✅"}</div>
      <div class="grow"><b>${esc(e.title)}</b><div class="small muted">${e.type === "reward" ? tr("Pedido de prémio") : tr("Tarefa")} · ${dayLabel(e.date)}</div></div>
      ${ptsHtml(e.points)}
      <button class="good" data-approve="${e.id}" aria-label="${tr("Aprovar")}">✓</button>
      <button class="bad" data-reject="${e.id}" aria-label="${tr("Rejeitar")}">✕</button></div>`).join("");
  }
  if (suggestions.length) {
    html += `<h2>${tr("Prémios sugeridos")}</h2>` + suggestions.map((r) => `<div class="card row wrap">
      <div class="grow"><b>${esc(r.title)}</b><div class="small muted">${tr("Sugerido por {name}", { name: esc(kidName(r.suggestedBy)) })}</div></div>
      <button class="good" data-price="${r.id}">${tr("Dar preço")}</button>
      <button class="bad" data-decline="${r.id}">${tr("Recusar")}</button></div>`).join("");
  }
  return html;
}

function parentKids() {
  return (S.kids.length > 1 ? `<h2 style="margin-top:0">${tr("Comparação")}</h2>${siblingsSummary()}` : "")
    + (S.kids.length ? S.kids.map((k) => `<div class="card">
      <div class="row"><button class="avatar-btn" data-kid-photo="${k.id}" aria-label="${tr("Mudar a foto de {name}", { name: esc(k.name) })}">${avatar(k, "md")}<span class="cam">📷</span></button>
        <div class="grow"><h3>${esc(k.name)} ${kidAge(k) != null ? `<span class="muted small">· ${tr("{n} anos", { n: kidAge(k) })}</span>` : `<button class="pill pending" data-edit-kid="${k.id}">${tr("Falta a idade")}</button>`}</h3><div class="muted small">${pendingRewardCost(k.id) ? tr("{n} pts em pedidos de prémio", { n: pendingRewardCost(k.id) }) : ""}</div></div>
        <div class="pts" style="font-size:1.4rem">⭐ ${k.points || 0}</div></div>
      ${weekChart(k)}
      <div class="row wrap" style="margin-top:10px">
        <button class="bad" data-penalty="${k.id}">− ${tr("Mau comportamento")}</button>
        <button class="good" data-bonus="${k.id}">+ ${tr("Bónus")}</button>
        <button data-edit-kid="${k.id}">${tr("Editar")}</button></div></div>`).join("")
    : "")
    + (S.kids.length ? `<button class="primary block" id="addKid">+ ${tr("Adicionar filho")}</button>` : welcomeCard());
}

function parentTasks() {
  const active = S.tasks.filter((t) => t.active !== false);
  const row = (t) => `<div class="card row">
      <div class="grow"><b>${esc(t.title)}</b><div class="small muted">${esc(t.kidIds?.length ? t.kidIds.map(kidName).join(", ") : tr("Todos os filhos"))}</div></div>
      ${ptsHtml(t.points)}<button data-edit-task="${t.id}">${tr("Editar")}</button></div>`;
  const specials = active.filter(isSpecial).sort((a, b) => deadlineMs(a) - deadlineMs(b));
  const rec = active.filter((t) => isRecurring(t) && !isSpecial(t)), extra = active.filter((t) => !isRecurring(t) && !isSpecial(t));
  const spRow = (t) => {
    const kids = kidsOf(t), decided = kids.filter((k) => ["approved", "rejected"].includes(specialEntry(k.id, t.id)?.status)).length;
    return `<div class="card row special-row">
      <div class="grow"><b>${esc(t.title)}</b><div class="small muted">${tr("Até {date}", { date: fmtDate(t.deadline) })} · ${esc(t.kidIds?.length ? t.kidIds.map(kidName).join(", ") : tr("Todos os filhos"))}</div>
        <div class="small">${isOver(t) ? tr("Terminou · {done}/{total} decididos", { done: decided, total: kids.length }) : tr("Faltam {time}", { time: `<span data-deadline="${deadlineMs(t)}">${countdownText(deadlineMs(t) - Date.now())}</span>` })}</div></div>
      ${ptsHtml(t.points)}<button data-edit-task="${t.id}">${tr("Editar")}</button></div>`;
  };
  return `<button class="block" id="taskIdeas" style="margin-bottom:4px">💡 ${tr("Ideias de tarefas")}</button>
    <div class="row spread"><h2>🚀 ${tr("Missões")} <span class="muted small">· ${tr("com prazo")}</span></h2><button class="primary" data-add-task="special">+ ${tr("Nova")}</button></div>
    ${specials.length ? specials.map(spRow).join("") : `<div class="empty">${tr("Missões com data limite, como \"Ler um livro até sexta\". No fim decides se ganharam.")}</div>`}
    <div class="row spread"><h2>📅 ${tr("Recorrentes")} <span class="muted small">· ${tr("todos os dias")}</span></h2><button class="primary" data-add-task="rec">+ ${tr("Nova")}</button></div>
    ${rec.length ? rec.map(row).join("") : `<div class="empty">${tr("Tarefas para fazer sempre, como \"Fazer a cama\".")}</div>`}
    <div class="row spread"><h2>✨ ${tr("Espontâneas")} <span class="muted small">· ${tr("quando acontecem")}</span></h2><button class="primary" data-add-task="extra">+ ${tr("Nova")}</button></div>
    ${extra.length ? extra.map(row).join("") : `<div class="empty">${tr("Pontos extra para coisas que não são diárias, como \"Ajudar a lavar o carro\".")}</div>`}`;
}

function parentRewards() {
  const active = S.rewards.filter((r) => r.status === "active");
  return `<div class="row" style="margin-bottom:12px"><button class="grow" id="rewardIdeas">💡 ${tr("Ideias")}</button><button class="primary grow" id="addReward">+ ${tr("Novo prémio")}</button></div>`
    + (active.length ? active.map((r) => `<div class="card row">
      <div class="grow"><b>${esc(r.title)}</b>${r.suggestedBy ? `<div class="small muted">${tr("Sugerido por {name}", { name: esc(kidName(r.suggestedBy)) })}</div>` : ""}</div>
      <span class="pts">⭐ ${r.cost}</span><button data-edit-reward="${r.id}">${tr("Editar")}</button></div>`).join("")
      : `<div class="empty">${tr("Ainda não há prémios.")}</div>`);
}

function parentHistory() {
  const items = S.log.filter((e) => e.status !== "pending");
  return items.length ? items.slice(0, 200).map((e) => historyItem(e, true, true)).join("") : `<div class="empty">${tr("Ainda não há histórico.")}</div>`;
}

function bindParentActions() {
  const on = (sel, fn) => app.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b)));
  on("[data-approve]", (b) => guard(() => approveEntry(b.dataset.approve)));
  on("[data-fix]", (b) => fixForm(S.log.find((x) => x.id === b.dataset.fix)));
  on("[data-give-extra]", (b) => {
    const e = S.log.find((x) => x.id === b.dataset.giveExtra);
    openForm(tr("Pontos para \"{title}\"", { title: e.title }), `<p class="small muted">${e.suggested ? tr("{name} pediu {n} pontos.", { name: esc(kidName(e.kidId)), n: e.suggested }) : tr("{name} não sugeriu pontos.", { name: esc(kidName(e.kidId)) })}</p>
      <label>${tr("Quantos pontos vale?")}</label><input name="points" type="number" inputmode="numeric" min="1" required value="${e.suggested ?? ""}">`,
    async (fd) => { await approveEntry(e.id, readPoints(fd.get("points"))); toast(tr("Pontos dados! 🌟")); }, tr("Dar pontos"));
  });
  on("[data-reject]", (b) => guard(() => rejectEntry(b.dataset.reject)));
  on("[data-approve-all]", (b) => guard(async () => {
    const ids = S.log.filter((e) => e.status === "pending" && e.type === "task" && e.kidId === b.dataset.approveAll).map((e) => e.id);
    for (const id of ids) await approveEntry(id);
    toast(tr("{n} tarefas aprovadas.", { n: ids.length }));
  }));
  on("[data-price]", (b) => rewardForm(S.rewards.find((r) => r.id === b.dataset.price)));
  on("[data-decline]", (b) => guard(() => updateDoc(doc(col("rewards"), b.dataset.decline), { status: "rejected" })));
  on("[data-penalty]", (b) => pointsForm(b.dataset.penalty, -1));
  on("[data-bonus]", (b) => pointsForm(b.dataset.bonus, 1));
  on("[data-edit-kid]", (b) => kidForm(kidById(b.dataset.editKid)));
  on("[data-kid-photo]", (b) => { const k = kidById(b.dataset.kidPhoto); photoForm(tr("A foto de {name}", { name: k.name }), k.photo, (photo) => updateDoc(doc(col("kids"), k.id), { photo })); });
  on("[data-edit-task]", (b) => taskForm(S.tasks.find((t) => t.id === b.dataset.editTask)));
  on("[data-edit-reward]", (b) => rewardForm(S.rewards.find((r) => r.id === b.dataset.editReward)));
  on("#addKid", () => kidForm(null));
  on("[data-add-task]", (b) => taskForm(null, b.dataset.addTask));
  const decide = (b, won) => guard(async () => {
    const [tid, kid] = (won ? b.dataset.specialWin : b.dataset.specialLose).split("|");
    const t = S.tasks.find((x) => x.id === tid);
    if (specialEntry(kid, tid)) return;
    await decideSpecial(t, kid, won);
    toast(won ? tr("Pontos dados! 🌟") : tr("Registado."));
  });
  on("[data-special-win]", (b) => decide(b, true));
  on("[data-special-lose]", (b) => decide(b, false));
  on("#taskIdeas", () => ideasForm("tasks"));
  on("#rewardIdeas", () => ideasForm("rewards"));
  on("#addReward", () => rewardForm(null));
}

const MAX_POINTS = 1000000;

function readPoints(v, { allowZero = false } = {}) {
  const n = Number(v);
  const min = allowZero ? 0 : 1;
  if (!Number.isInteger(n) || n < min || n > MAX_POINTS) {
    throw new Error(tr("Os pontos têm de ser um número inteiro entre {min} e {max}.", { min, max: MAX_POINTS.toLocaleString(LOCALE) }));
  }
  return n;
}

function pointsForm(kidId, sign) {
  const kid = kidById(kidId);
  const title = sign < 0 ? tr("Mau comportamento — {name}", { name: kid.name }) : tr("Bónus — {name}", { name: kid.name });
  openForm(title, `<label>${tr("Motivo")}</label><input name="title" required maxlength="100" placeholder="${sign < 0 ? tr("Ex: Bateu no irmão") : tr("Ex: Ajudou sem ninguém pedir")}">
    <label>${tr("Pontos")}</label><input name="points" type="number" inputmode="numeric" min="1" required>
    ${sign < 0 ? `<p class="small muted">${tr("Saldo atual: {n}. O saldo nunca desce abaixo de 0.", { n: kid.points || 0 })}</p>` : ""}`,
  async (fd) => {
    const pts = readPoints(fd.get("points"));
    await adjustPoints(kidId, sign * pts, fd.get("title").trim());
    toast(sign < 0 ? tr("Penalização registada.") : tr("Bónus atribuído!"));
  }, sign < 0 ? tr("Retirar pontos") : tr("Dar pontos"));
}

// ---------- Atualizações ----------
// Os telemóveis guardam a app em cache; ao abrir (e ao voltar à app) comparamos com version.json
// e, se houver versão nova, recarregamos os ficheiros. Atualiza APP_VERSION e version.json juntos.
const APP_VERSION = "2026-10-28.18";
async function checkForUpdate() {
  try {
    if (!modal.classList.contains("hidden")) return; // não interromper quem está a escrever
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    const { version } = await res.json();
    if (!version || version === APP_VERSION) return;
    // Evita ciclos se o servidor ainda estiver a servir a versão antiga.
    if (sessionStorage.getItem("pf-updated-to") === version) return;
    sessionStorage.setItem("pf-updated-to", version);
    await Promise.all(["./", "index.html", "app.js", "style.css", "firebase-config.js", "sw.js", "manifest.webmanifest", "i18n.js", "landing.js", `i18n/${LANG}.json`]
      .map((u) => fetch(u, { cache: "reload" }).catch(() => {})));
    location.reload();
  } catch { /* sem rede: tenta da próxima vez */ }
}
setTimeout(checkForUpdate, 1500);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });

const PHOTO_SIZE = 192;

/** Campos do recorte de foto (usados por photoEditor). */
const photoFieldHtml = () => `
    <div class="row wrap">
      <canvas id="photoCanvas" width="${PHOTO_SIZE}" height="${PHOTO_SIZE}" class="photo-edit hidden"></canvas>
      <div class="grow">
        <label class="btn" style="display:inline-block;margin:0;font-weight:400">📷 ${tr("Escolher foto")}<input type="file" accept="image/*" id="photoFile" hidden></label>
        <button type="button" class="link hidden" id="photoRemove">${tr("Remover foto")}</button>
        <div id="photoZoomBox" class="hidden"><p class="small muted" style="margin:8px 0 2px">${tr("Arrasta para centrar a cara; usa a barra para aproximar.")}</p>
          <input type="range" id="photoZoom" min="1" max="4" step="0.01" value="1"></div>
      </div>
    </div>`;

/**
 * Recorte quadrado da foto: arrastar para mover, barra para aproximar.
 * Fica guardada como JPEG pequeno (~15 KB) nos dados da família — nunca no repositório público.
 */
function photoEditor(form, initial) {
  const canvas = form.querySelector("#photoCanvas"), ctx = canvas.getContext("2d");
  const zoomEl = form.querySelector("#photoZoom"), zoomBox = form.querySelector("#photoZoomBox");
  const removeBtn = form.querySelector("#photoRemove");
  const st = { img: null, zoom: 1, x: 0, y: 0, changed: false, removed: false };
  const draw = () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    if (!st.img) return;
    const base = PHOTO_SIZE / Math.min(st.img.width, st.img.height);
    const w = st.img.width * base * st.zoom, h = st.img.height * base * st.zoom;
    // Não deixa aparecer fundo vazio à volta da foto.
    st.x = Math.min(0, Math.max(PHOTO_SIZE - w, st.x));
    st.y = Math.min(0, Math.max(PHOTO_SIZE - h, st.y));
    ctx.drawImage(st.img, st.x, st.y, w, h);
  };
  const show = (on) => {
    canvas.classList.toggle("hidden", !on);
    removeBtn.classList.toggle("hidden", !on);
  };
  const load = (src, editable) => {
    const img = new Image();
    img.onload = () => {
      st.img = img;
      st.zoom = 1;
      const base = PHOTO_SIZE / Math.min(img.width, img.height);
      st.x = (PHOTO_SIZE - img.width * base) / 2;
      st.y = (PHOTO_SIZE - img.height * base) / 2;
      zoomEl.value = 1;
      zoomBox.classList.toggle("hidden", !editable);
      show(true);
      draw();
    };
    img.src = src;
  };
  if (initial) load(initial, false);
  form.querySelector("#photoFile").onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    st.changed = true; st.removed = false;
    load(URL.createObjectURL(file), true);
  };
  zoomEl.oninput = () => {
    // Aproxima a partir do centro do recorte.
    const c = PHOTO_SIZE / 2, k = Number(zoomEl.value) / st.zoom;
    st.x = c - (c - st.x) * k; st.y = c - (c - st.y) * k;
    st.zoom = Number(zoomEl.value);
    draw();
  };
  let drag = null;
  canvas.onpointerdown = (e) => {
    if (zoomBox.classList.contains("hidden")) return;
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    const scale = PHOTO_SIZE / canvas.getBoundingClientRect().width;
    st.x += (e.clientX - drag.x) * scale; st.y += (e.clientY - drag.y) * scale;
    drag = { x: e.clientX, y: e.clientY };
    draw();
  };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);
  removeBtn.onclick = () => {
    st.img = null; st.changed = true; st.removed = true;
    zoomBox.classList.add("hidden");
    show(false);
  };
  return {
    get changed() { return st.changed; },
    dataUrl: () => (st.removed || !st.img ? null : canvas.toDataURL("image/jpeg", 0.82)),
  };
}

/** Janela só para mudar uma foto (abre ao tocar na foto). */
function photoForm(title, current, save) {
  const form = openForm(title, `${photoFieldHtml()}<p class="small muted" style="margin-top:10px">${tr("Toca em \"Escolher foto\" para tirar uma foto ou escolher da galeria.")}</p>`,
    async () => {
      if (!photo.changed) return;
      await save(photo.dataUrl());
      toast(tr("Foto atualizada! 📸"));
    });
  const photo = photoEditor(form, current && PHOTO_RE.test(current) ? current : null);
  // Abre logo a escolha da foto (no iPhone pode ser preciso tocar no botão).
  setTimeout(() => form.querySelector("#photoFile")?.click(), 50);
}

const MIN_AGE = 2, MAX_AGE = 17;
/** Idade aproximada (a partir do ano de nascimento guardado), ou null se ainda não foi indicada. */
const kidAge = (kid) => (kid?.birthYear ? new Date().getFullYear() - kid.birthYear : null);

function kidForm(kid) {
  const emoji = kid?.emoji || EMOJIS[S.kids.length % EMOJIS.length];
  const form = openForm(kid ? tr("Editar {name}", { name: kid.name }) : tr("Novo filho"), `${!kid && isNewFamily() ? stepper(1) : ""}
    <label>${tr("Nome")}</label><input name="name" required maxlength="30" value="${esc(kid?.name || "")}">
    <label>${tr("Idade")}</label><input name="age" type="number" inputmode="numeric" min="${MIN_AGE}" max="${MAX_AGE}" required value="${kidAge(kid) ?? ""}" placeholder="${tr("Ex: 8")}">
    <label>${tr("Foto")}</label>${photoFieldHtml()}
    <label>${tr("Emoji (quando não há foto)")}</label><select name="emoji">${EMOJIS.map((e) => `<option ${e === emoji ? "selected" : ""}>${e}</option>`).join("")}</select>
    <label>${kid ? tr("Novo PIN (deixa vazio para manter)") : tr("PIN (4 a 6 dígitos)")}</label>
    <input name="pin" type="password" inputmode="numeric" maxlength="6" ${kid ? "" : "required"} autocomplete="off">
    ${kid ? `<button type="button" class="bad" id="delKid" style="margin-top:16px">${tr("Remover {name}", { name: esc(kid.name) })}</button>` : ""}`,
  async (fd) => {
    const name = fd.get("name").trim(), pin = fd.get("pin");
    if (!name) throw new Error(tr("Escreve o nome."));
    const age = Number(fd.get("age"));
    if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) throw new Error(tr("Escreve a idade (entre {min} e {max} anos).", { min: MIN_AGE, max: MAX_AGE }));
    // Guarda-se só o ano de nascimento aproximado: a idade sobe sozinha e não fica a data de nascimento.
    const data = { name, emoji: fd.get("emoji"), birthYear: new Date().getFullYear() - age };
    if (photo.changed) data.photo = photo.dataUrl();
    if (pin || !kid) {
      if (!validPin(pin)) throw new Error(tr("O PIN tem de ter 4 a 6 dígitos."));
      data.pinHash = await hashPin(pin);
    }
    if (kid) { await updateDoc(doc(col("kids"), kid.id), data); return; }
    // Família nova (ainda sem filhos, tarefas nem prémios): a seguir propõe tarefas e prémios para começar.
    const firstKid = isNewFamily();
    const ref = await addDoc(col("kids"), { ...data, points: 0, order: S.kids.length, createdAt: serverTimestamp() });
    if (firstKid) {
      setTimeout(async () => {
        for (let i = 0; i < 30 && !kidById(ref.id); i++) await new Promise((r) => setTimeout(r, 100));
        ideasForm("tasks", { starter: true });
      }, 50);
    }
  });
  const photo = photoEditor(form, kid?.photo && PHOTO_RE.test(kid.photo) ? kid.photo : null);
  const del = form.querySelector("#delKid");
  if (del) del.onclick = () => guard(async () => {
    if (!confirm(tr("Remover {name}? Perde os {n} pontos. O histórico fica guardado.", { name: kid.name, n: kid.points || 0 }))) return;
    await deleteDoc(doc(col("kids"), kid.id));
    closeModal();
  });
}

function taskForm(task, kindDefault = "rec") {
  const kind = task ? (isSpecial(task) ? "special" : isRecurring(task) ? "rec" : "extra") : kindDefault;
  const placeholder = { rec: tr("Ex: Fazer a cama"), extra: tr("Ex: Ajudar a lavar o carro"), special: tr("Ex: Ler um livro inteiro") }[kind];
  const form = openForm(task ? tr("Editar tarefa") : tr("Nova tarefa"), `
    <label>${tr("Tarefa")}</label><input name="title" required maxlength="80" value="${esc(task?.title || "")}" placeholder="${placeholder}">
    <label>${tr("Pontos")}</label><input name="points" type="number" inputmode="numeric" min="1" required value="${task?.points ?? ""}">
    <label>${tr("Tipo")}</label>
    <label class="inline"><input type="radio" name="kind" value="rec" ${kind === "rec" ? "checked" : ""}> 📅 ${tr("Recorrente (todos os dias)")}</label>
    <label class="inline"><input type="radio" name="kind" value="extra" ${kind === "extra" ? "checked" : ""}> ✨ ${tr("Espontânea (quando acontece)")}</label>
    <label class="inline"><input type="radio" name="kind" value="special" ${kind === "special" ? "checked" : ""}> 🚀 ${tr("Missão (com prazo)")}</label>
    <div id="deadlineBox">
      ${task ? "" : `<label>${tr("Sugestões")}</label><div class="chips">${MISSION_IDEAS.map(([t, p], i) => `<button type="button" class="chip" data-mission="${i}">${esc(t)} <b>+${p}</b></button>`).join("")}</div>
      <p class="small muted">${tr("Toca numa sugestão ou escreve a tua missão em cima.")}</p>`}
      <label>${tr("Até que dia?")}</label><input name="deadline" type="date" min="${today()}" value="${task?.deadline || addDays(today(), 7)}">
      <p class="small muted">${tr("Os filhos veem um contador até ao fim desse dia. No fim, decides se ganharam os pontos.")}</p></div>
    <label>${tr("Para quem")}</label>
    ${S.kids.length ? S.kids.map((k) => `<label class="inline"><input type="checkbox" name="kids" value="${k.id}" ${!task?.kidIds?.length || task.kidIds.includes(k.id) ? "checked" : ""}> ${avatar(k, "xs")} ${esc(k.name)}</label>`).join("") : `<p class="small muted">${tr("Todos os filhos.")}</p>`}
    ${task ? `<button type="button" class="bad" id="delTask" style="margin-top:16px">${tr("Apagar tarefa")}</button>` : ""}`,
  async (fd) => {
    const title = fd.get("title").trim();
    if (!title) throw new Error(tr("Escreve o nome da tarefa."));
    const k = fd.get("kind");
    const deadline = fd.get("deadline");
    if (k === "special" && !/^\d{4}-\d{2}-\d{2}$/.test(deadline || "")) throw new Error(tr("Escolhe até que dia."));
    if (k === "special" && deadline < today() && deadline !== task?.deadline) throw new Error(tr("A data limite não pode ser no passado."));
    const selKids = fd.getAll("kids");
    if (S.kids.length && !selKids.length) throw new Error(tr("Escolhe pelo menos um filho."));
    const data = {
      title, points: readPoints(fd.get("points")), recurring: k === "rec",
      special: k === "special", deadline: k === "special" ? deadline : null,
      days: [], date: null,
      // Lista vazia = todos os filhos (incluindo os que forem adicionados depois).
      kidIds: selKids.length === S.kids.length ? [] : selKids,
      active: true,
    };
    if (task) await updateDoc(doc(col("tasks"), task.id), data);
    else await addDoc(col("tasks"), { ...data, createdAt: serverTimestamp() });
  });
  const syncKind = () => form.querySelector("#deadlineBox").classList.toggle("hidden", form.querySelector("[name=kind]:checked").value !== "special");
  form.querySelectorAll("[name=kind]").forEach((r) => (r.onchange = syncKind));
  form.querySelectorAll("[data-mission]").forEach((b) => (b.onclick = () => {
    const [t, p] = MISSION_IDEAS[Number(b.dataset.mission)];
    // form.title é o atributo "title" do formulário, não o campo.
    form.querySelector("[name=title]").value = t; form.querySelector("[name=points]").value = p;
    form.querySelectorAll("[data-mission]").forEach((x) => x.classList.toggle("on", x === b));
  }));
  syncKind();
  const del = form.querySelector("#delTask");
  // Arquivar em vez de apagar mantém o histórico coerente.
  if (del) del.onclick = () => guard(async () => {
    if (!confirm(tr("Apagar esta tarefa?"))) return;
    await updateDoc(doc(col("tasks"), task.id), { active: false });
    closeModal();
  });
}

/** Lista de ideias para escolher e adicionar de uma vez (os pontos podem ser ajustados antes). */
/**
 * Lista de ideias para escolher e adicionar de uma vez (os pontos podem ser ajustados antes).
 * As tarefas vêm já marcadas para as idades dos filhos e ficam atribuídas só a quem tem idade para elas.
 * Com starter (família nova, primeiro filho): tarefas e depois prémios, tudo já marcado.
 */
function ideasForm(kind, { starter = false } = {}) {
  const isTasks = kind === "tasks";
  const existing = new Set((isTasks ? S.tasks.filter((t) => t.active !== false) : S.rewards.filter((r) => r.status === "active"))
    .map((x) => x.title.trim().toLowerCase()));
  const fits = (idea) => (isTasks ? S.kids.filter((k) => { const a = kidAge(k); return a == null || (a >= idea[2] && a <= idea[3]); }) : S.kids);
  const ideas = (isTasks ? TASK_IDEAS : REWARD_IDEAS).filter(([title]) => !existing.has(title.toLowerCase()))
    .map((idea) => ({ idea, kids: fits(idea) }))
    .sort((a, b) => (b.kids.length > 0) - (a.kids.length > 0) || (a.idea[2] ?? 0) - (b.idea[2] ?? 0) || a.idea[1] - b.idea[1] || a.idea[0].localeCompare(b.idea[0], LOCALE));
  if (!ideas.length) { if (starter && isTasks) return ideasForm("rewards", { starter }); toast(tr("Já adicionaste todas as ideias.")); return; }
  const allAges = (idea) => !isTasks || (idea[2] <= MIN_AGE + 2 && idea[3] >= MAX_AGE);
  const who = ({ idea, kids }) => {
    if (!isTasks) return "";
    const ages = idea[3] >= MAX_AGE ? tr("{n}+ anos", { n: idea[2] }) : tr("{min}–{max} anos", { min: idea[2], max: idea[3] });
    const names = kids.length && kids.length < S.kids.length ? ` · ${kids.map((k) => esc(k.name)).join(", ")}` : "";
    return `<div class="small muted">${ages}${names}</div>`;
  };
  const row = (x, i) => `<div class="row idea" style="margin:6px 0">
      <label class="inline grow" style="margin:0"><input type="checkbox" name="pick" value="${i}" ${(starter || isTasks) && x.kids.length ? "checked" : ""}> <span>${esc(x.idea[0])}${who(x)}</span></label>
      <input name="pts${i}" type="number" inputmode="numeric" min="1" value="${x.idea[1]}" style="width:80px">
    </div>`;
  const fitting = ideas.filter((x) => x.kids.length), other = ideas.filter((x) => !x.kids.length);
  const title = starter ? (isTasks ? tr("Tarefas para começar") : tr("Prémios para começar")) : isTasks ? tr("Ideias de tarefas recorrentes") : tr("Ideias de prémios");
  const intro = isTasks
    ? (S.kids.length ? tr("Já marcámos as tarefas certas para a idade dos teus filhos. Cada uma fica só para quem tem idade para ela. Desmarca as que não quiseres e ajusta os pontos.") : tr("Escolhe as que queres e ajusta os pontos."))
    : starter ? tr("Prémios para trocar pelos pontos, dos pequenos (1 a 2 dias de tarefas) aos grandes (1 a 2 meses). Desmarca os que não quiseres e ajusta os pontos.") : tr("Escolhe as que queres e ajusta os pontos.");
  const form = openForm(title, `${starter ? stepper(isTasks ? 2 : 3) : ""}
    <p class="small muted">${intro}</p>
    ${starter ? `<p class="tip small">💡 ${tr("A qualquer momento podes adicionar, mudar ou remover tarefas e prémios.")}</p>` : ""}
    <label class="inline" style="font-weight:600"><input type="checkbox" id="pickAll" ${starter || (isTasks && !other.length) ? "checked" : ""}> ${tr("Selecionar todas")}</label>
    ${fitting.map((x) => row(x, ideas.indexOf(x))).join("")}
    ${other.length ? `<h3 style="margin:14px 0 4px">${tr("Para outras idades")}</h3>${other.map((x) => row(x, ideas.indexOf(x))).join("")}` : ""}`,
  async (fd) => {
    const picked = fd.getAll("pick").map(Number);
    if (!picked.length && !starter) throw new Error(tr("Escolhe pelo menos uma."));
    const batch = writeBatch(db);
    for (const i of picked) {
      const pts = readPoints(fd.get(`pts${i}`));
      const { idea, kids } = ideas[i];
      // Tarefas para todas as idades ficam para todos (incluindo filhos futuros); as outras só para quem tem idade.
      const kidIds = allAges(idea) || !kids.length ? [] : kids.map((k) => k.id);
      batch.set(doc(col(isTasks ? "tasks" : "rewards")), isTasks
        ? { title: idea[0], points: pts, recurring: true, days: [], date: null, kidIds, scene: idea[4], active: true, createdAt: serverTimestamp() }
        : { title: idea[0], cost: pts, status: "active", suggestedBy: null, createdAt: serverTimestamp() });
    }
    if (picked.length) await batch.commit();
    if (picked.length) toast(isTasks ? tr("{n} tarefa(s) adicionada(s).", { n: picked.length }) : tr("{n} prémio(s) adicionado(s).", { n: picked.length }));
    if (starter && isTasks) setTimeout(() => ideasForm("rewards", { starter }), 50);
    if (starter && !isTasks) setTimeout(() => guard(() => openLinkDevice({ starter })), 50);
  }, tr("Adicionar"));
  const all = form.querySelector("#pickAll");
  all.onchange = () => form.querySelectorAll("[name=pick]").forEach((c) => (c.checked = all.checked));
}

function rewardForm(reward) {
  const isSuggestion = reward?.status === "suggested";
  const form = openForm(isSuggestion ? tr("Dar preço à sugestão") : reward ? tr("Editar prémio") : tr("Novo prémio"), `
    <label>${tr("Prémio")}</label><input name="title" required maxlength="80" value="${esc(reward?.title || "")}" placeholder="${tr("Ex: 30 min extra de consola")}">
    <label>${tr("Custa quantos pontos?")}</label><input name="cost" type="number" inputmode="numeric" min="1" required value="${reward?.cost ?? ""}">
    ${reward && !isSuggestion ? `<button type="button" class="bad" id="delReward" style="margin-top:16px">${tr("Apagar prémio")}</button>` : ""}`,
  async (fd) => {
    const title = fd.get("title").trim();
    if (!title) throw new Error(tr("Escreve o nome do prémio."));
    const data = { title, cost: readPoints(fd.get("cost")), status: "active" };
    if (reward) await updateDoc(doc(col("rewards"), reward.id), data);
    else await addDoc(col("rewards"), { ...data, suggestedBy: null, createdAt: serverTimestamp() });
  }, isSuggestion ? tr("Aprovar") : tr("Guardar"));
  const del = form.querySelector("#delReward");
  if (del) del.onclick = () => guard(async () => {
    if (!confirm(tr("Apagar este prémio?"))) return;
    await updateDoc(doc(col("rewards"), reward.id), { status: "archived" });
    closeModal();
  });
}

function openSettings() {
  const form = openForm(tr("Definições"), `
    <label>${tr("Língua")}</label>
    <select name="lang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === LANG ? "selected" : ""}>${v}</option>`).join("")}</select>
    <p class="small muted">${tr("Muda a língua em todos os aparelhos da família, incluindo as notificações.")}</p>
    <label>${tr("Foto do perfil Pai / Mãe")}</label>${photoFieldHtml()}
    <label>${tr("Mudar PIN do pai/mãe")}</label>
    <input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="${tr("Novo PIN (deixa vazio para manter)")}" autocomplete="off">
    <label>${tr("Os filhos podem marcar tarefas até quantos dias para trás?")}</label>
    <input name="backDays" type="number" inputmode="numeric" min="0" max="${MAX_BACK_DAYS}" required value="${backDays()}">
    <p class="small muted">${tr("0 = só o próprio dia. Máximo {n}.", { n: MAX_BACK_DAYS })}</p>
    <label>${tr("Aparelhos dos filhos")}</label>
    <p class="small muted" id="devCount">${tr("A contar aparelhos ligados…")}</p>
    <div class="row wrap">
      <button type="button" class="good" id="linkDevice">${tr("Ligar aparelho de um filho")}</button>
      <button type="button" class="bad" id="unlinkAll">${tr("Desligar todos")}</button>
    </div>
    <label>${tr("Recomeçar")}</label>
    <p class="small muted">${tr("Põe o saldo de todos os filhos a 0 e apaga o histórico de pontos (tarefas marcadas, validações, bónus, penalizações e pedidos de prémio). Filhos, tarefas e prémios ficam.")}</p>
    <button type="button" class="bad" id="resetPoints">${tr("Apagar todos os pontos")}</button>
    <p class="small muted" style="margin-top:16px">${isDevice() ? tr("Aparelho ligado por link") : tr("Conta: {email}", { email: esc(S.user.email) })}</p>
    <button type="button" class="bad" id="logoutAll" style="margin-top:8px">${isDevice() ? tr("Desligar este aparelho") : tr("Sair da conta neste aparelho")}</button>
    ${isDevice() ? "" : `<label style="margin-top:18px">${tr("Apagar conta")}</label>
    <p class="small muted">${tr("Apaga para sempre a conta da família e todos os dados: filhos, fotos, tarefas, prémios, pontos e histórico.")} <a href="${legalUrl("privacy")}" target="_blank">${tr("Política de privacidade")}</a></p>
    <button type="button" class="bad" id="deleteAccount">${tr("Apagar conta e todos os dados")}</button>`}`,
  async (fd) => {
    const pin = fd.get("pin");
    const back = Number(fd.get("backDays"));
    if (!Number.isInteger(back) || back < 0 || back > MAX_BACK_DAYS) throw new Error(tr("Escolhe um número de dias entre 0 e {n}.", { n: MAX_BACK_DAYS }));
    const changes = {};
    const lang = fd.get("lang");
    if (LANGS[lang] && lang !== (S.fam.lang || LANG)) changes.lang = lang;
    if (S.fam.tz !== TIMEZONE) changes.tz = TIMEZONE;
    if (pin) {
      if (!validPin(pin)) throw new Error(tr("O PIN tem de ter 4 a 6 dígitos."));
      changes.parentPinHash = await hashPin(pin);
    }
    if (back !== backDays()) changes.maxBackDays = back;
    if (photo.changed) changes.parentPhoto = photo.dataUrl();
    if (!Object.keys(changes).length) return;
    await updateDoc(famDoc(), changes);
    if (changes.lang) { setLang(changes.lang); location.reload(); return; }
    toast(tr("Definições guardadas."));
  });
  const photo = photoEditor(form, S.fam.parentPhoto && PHOTO_RE.test(S.fam.parentPhoto) ? S.fam.parentPhoto : null);
  form.querySelector("#logoutAll").onclick = () => { closeModal(); leaveDevice(); };
  form.querySelector("#linkDevice").onclick = () => guard(openLinkDevice);
  const del = form.querySelector("#deleteAccount");
  if (del) del.onclick = () => {
    if (!confirm(tr("Apagar a conta e TODOS os dados da família? Isto não se pode desfazer."))) return;
    openForm(tr("Confirmar com a password"), `<p class="small muted">${tr("Por segurança, escreve a password da conta {email}.", { email: esc(S.user.email) })}</p>
      <label>${tr("Password")}</label><input name="password" type="password" autocomplete="current-password" required>`,
    async (fd) => {
      try { await reauthenticateWithCredential(S.user, EmailAuthProvider.credential(S.user.email, fd.get("password"))); }
      catch (e) { throw new Error(authError(e.code)); }
      await deleteFamily();
      toast(tr("Conta e dados apagados."));
    }, tr("Apagar tudo"));
  };
  form.querySelector("#resetPoints").onclick = () => guard(async () => {
    if (!confirm(tr("Apagar TODOS os pontos e o histórico? Isto não se pode desfazer."))) return;
    if (!confirm(tr("Tens a certeza? Os saldos de todos os filhos voltam a 0."))) return;
    const n = await resetPoints();
    closeModal();
    toast(tr("Pontos apagados ({n} registos). Recomeçar! 🚀", { n }));
  });
  form.querySelector("#unlinkAll").onclick = () => guard(async () => {
    if (!confirm(tr("Desligar todos os aparelhos ligados por link? Vão precisar de um link novo para voltar a entrar."))) return;
    const n = await revokeDevices();
    form.querySelector("#devCount").textContent = tr("Desligados {n} aparelho(s). O link antigo deixou de funcionar.", { n });
  });
  getDocs(col("members")).then((snap) => {
    const el = form.querySelector("#devCount");
    if (el) el.textContent = snap.size ? tr("{n} aparelho(s) ligado(s) por link.", { n: snap.size }) : tr("Nenhum aparelho ligado por link.");
  }).catch(() => {});
}

/** Sair (conta da família) ou desligar (aparelho ligado por link). */
async function leaveDevice() {
  if (isDevice()) {
    if (!confirm(tr("Desligar este aparelho? Para voltar a entrar é preciso um link novo do pai/mãe."))) return;
    await deleteDoc(doc(col("members"), S.user.uid)).catch(() => {});
    await unlinkDevice();
    forgetJoinLink();
    await signOut(auth);
  } else {
    if (!confirm(tr("Sair da conta da família neste aparelho?"))) return;
    await signOut(auth);
  }
}

/** Código QR (SVG) para um texto. A biblioteca só é carregada quando é preciso. */
async function qrSvg(text) {
  const { default: qrcode } = await import("./vendor/qrcode.js");
  const qr = qrcode(0, "M");
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + q} ${y + q}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" class="qr" role="img" aria-label="${tr("Código QR do link")}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#2f3657" shape-rendering="crispEdges"/></svg>`;
}

/** Ligar o aparelho de um filho: código QR e link. Com starter é o 4.º passo dos primeiros passos. */
async function openLinkDevice({ starter = false } = {}) {
  let token = S.fam.inviteToken;
  if (!token) {
    token = newToken();
    await updateDoc(famDoc(), { inviteToken: token });
  }
  const link = joinLink(token);
  let qr = "";
  try { qr = await qrSvg(link); } catch {}
  modal.innerHTML = `<div class="sheet"><h2 style="margin-top:0">${tr("Ligar aparelho de um filho")}</h2>
    ${starter ? stepper(4) : ""}
    ${qr ? `<div class="qr-box">${qr}<p class="small">${tr("No telemóvel ou tablet do filho, abre a câmara e aponta para este código.")}</p></div>` : ""}
    <p>${tr("Ou envia este link para o telemóvel ou tablet do teu filho (WhatsApp, SMS, email…). Ao abri-lo, o aparelho fica ligado à família e o filho só precisa do PIN.")}</p>
    <input readonly value="${esc(link)}" id="linkBox" style="font-size:.8rem">
    <div class="row wrap" style="margin-top:10px">
      ${navigator.share ? `<button class="primary" id="shareLink">${tr("Partilhar")}</button>` : ""}
      <button id="copyLink">${tr("Copiar link")}</button>
    </div>
    <p class="small muted" style="margin-top:14px">${tr("<b>Ícone no ecrã principal:</b> depois de abrir o link no aparelho do filho, usa logo aí \"Adicionar ao ecrã principal\".")}</p>
    <p class="small muted">⚠️ ${tr("Quem tiver este link entra na app da família (mas precisa dos PINs). Se o link chegar a quem não devia, usa \"Desligar todos\".")}</p>
    <div class="actions"><button ${starter ? 'class="primary"' : ""} data-close>${starter ? tr("Concluir") : tr("Fechar")}</button></div></div>`;
  modal.classList.remove("hidden");
  modal.querySelector("[data-close]").onclick = () => {
    closeModal();
    if (starter) { S.tab = "kids"; render(); mascotDance(tr("Tudo pronto! Boa sorte com as tarefas.")); }
  };
  modal.querySelector("#copyLink").onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast(tr("Link copiado.")); }
    catch { const box = modal.querySelector("#linkBox"); box.select(); toast(tr("Seleciona e copia o link.")); }
  };
  const share = modal.querySelector("#shareLink");
  if (share) share.onclick = () => navigator.share({ title: "SAS Kids", text: tr("Abre este link para entrar na app:"), url: link }).catch(() => {});
}

/** Saldos a 0 e histórico apagado; filhos, tarefas e prémios mantêm-se. Devolve quantos registos apagou. */
async function resetPoints() {
  const snap = await getDocs(col("log"));
  const ops = [...snap.docs.map((d) => (b) => b.delete(d.ref)), ...S.kids.map((k) => (b) => b.update(doc(col("kids"), k.id), { points: 0 }))];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
  return snap.size;
}

/** Apaga todos os dados da família e, por fim, a própria conta (direito ao apagamento, RGPD art. 17.º). */
async function deleteFamily() {
  stopListeners();
  const refs = [];
  for (const name of ["log", "tasks", "rewards", "kids", "pushTokens", "members"]) {
    (await getDocs(col(name))).docs.forEach((d) => refs.push(d.ref));
  }
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  await deleteDoc(famDoc());
  try { localStorage.clear(); } catch {}
  await deleteUser(S.user);
}

/** Desliga todos os aparelhos ligados por link e invalida o link antigo. */
async function revokeDevices() {
  const snap = await getDocs(col("members"));
  const batch = writeBatch(db);
  batch.update(famDoc(), { inviteToken: newToken() });
  // Um aparelho ligado não se desliga a si próprio aqui, para não perder o acesso a meio.
  let n = 0;
  snap.docs.forEach((d) => { if (d.id !== S.user.uid) { batch.delete(d.ref); n++; } });
  await batch.commit();
  return n;
}
