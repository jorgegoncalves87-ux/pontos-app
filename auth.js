// Página dos links dos emails: confirmar o email (mode=verifyEmail) e escolher uma password nova (mode=resetPassword).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, applyActionCode, verifyPasswordResetCode, confirmPasswordReset, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { t as tr } from "./i18n.js?v=2026-10-28.15";

const params = new URLSearchParams(location.search);
const useEmulator = params.has("emulator");
const auth = getAuth(initializeApp(useEmulator ? { apiKey: "demo", projectId: "demo-pontos", authDomain: "localhost" } : firebaseConfig));
if (useEmulator) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
const mode = params.get("mode"), code = params.get("oobCode") || "";
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const home = useEmulator ? "./?emulator" : "./";

function screen(title, text, inner = "", art = "mascote.svg") {
  app.innerHTML = `<div class="lp-compact auth-page">
    <img src="illustrations/logo-texto.svg" alt="SAS Kids" class="compact-logo">
    <div class="auth-card">
      <img src="illustrations/${art}" alt="" class="auth-mascot">
      <h1>${title}</h1>${text ? `<p class="muted">${text}</p>` : ""}${inner}
    </div></div>`;
}
const homeButton = (label) => `<a class="cta block" href="${home}">${label}</a>`;
const invalid = () => screen(tr("Este link já não é válido"), tr("O link pode ter expirado ou já ter sido usado. Pede um novo na app."), homeButton(tr("Abrir a SAS Kids")));

async function main() {
  if (mode === "verifyEmail") {
    screen(tr("A confirmar…"), "");
    try { await applyActionCode(auth, code); }
    catch { return invalid(); }
    screen(tr("Email confirmado!"), tr("Já podes voltar à SAS Kids e criar a tua família."), homeButton(tr("Abrir a SAS Kids")));
  } else if (mode === "resetPassword") {
    let email;
    try { email = await verifyPasswordResetCode(auth, code); }
    catch { return invalid(); }
    screen(tr("Escolhe uma password nova"), tr("Para a conta {email}.", { email: `<b>${esc(email)}</b>` }), `
      <form class="auth-form" id="resetForm">
        <label>${tr("Password nova (mínimo 6 caracteres)")}</label><input name="password" type="password" autocomplete="new-password" minlength="6" required>
        <label>${tr("Repetir password")}</label><input name="password2" type="password" autocomplete="new-password" minlength="6" required>
        <div class="err" id="resetErr"></div>
        <button class="cta block" type="submit">${tr("Guardar password")}</button>
      </form>`);
    const form = document.getElementById("resetForm"), err = document.getElementById("resetErr");
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      err.textContent = "";
      if (form.password.value !== form.password2.value) { err.textContent = tr("As passwords não coincidem."); return; }
      const btn = form.querySelector("button"); btn.disabled = true;
      try { await confirmPasswordReset(auth, code, form.password.value); }
      catch (e) {
        btn.disabled = false;
        if (e.code === "auth/weak-password") { err.textContent = tr("A password tem de ter pelo menos 6 caracteres."); return; }
        return invalid();
      }
      screen(tr("Password alterada!"), tr("Já podes entrar com a password nova."), homeButton(tr("Entrar")));
    };
  } else {
    invalid();
  }
}
main();
