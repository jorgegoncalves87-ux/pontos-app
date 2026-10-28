// Línguas da SAS Kids. O português é a língua de origem: as chaves das traduções são o próprio
// texto em português (i18n/<língua>.json). Um texto sem tradução aparece em português.
export const LANGS = { pt: "Português", es: "Español", fr: "Français", it: "Italiano", en: "English", zh: "中文" };
const LOCALES = { pt: "pt-PT", es: "es-ES", fr: "fr-FR", it: "it-IT", en: "en-GB", zh: "zh-CN" };
const KEY = "sk-lang";

/** Escolha guardada neste aparelho; senão, a língua do telemóvel/navegador; senão, inglês. */
function detectLang() {
  try { const saved = localStorage.getItem(KEY); if (LANGS[saved]) return saved; } catch {}
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const code = String(l || "").slice(0, 2).toLowerCase();
    if (LANGS[code]) return code;
  }
  return "en";
}

export const LANG = detectLang();
export const LOCALE = LOCALES[LANG];
document.documentElement.lang = LOCALE;

let dict = {};
if (LANG !== "pt") {
  try { dict = await (await fetch(`i18n/${LANG}.json${new URL(import.meta.url).search}`)).json(); } catch { /* fica em português */ }
}

/** Traduz um texto; {nome} é substituído pelo valor em vars. */
export function t(text, vars) {
  const out = dict[text] || text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : out;
}

/** Guarda a língua deste aparelho. Devolve false se não deu para guardar (ex.: navegação privada). */
export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); return localStorage.getItem(KEY) === lang; } catch { return false; }
}

/** Página legal na língua atual. */
export const legalUrl = (kind) => (LANG === "pt"
  ? (kind === "privacy" ? "privacidade.html" : "termos.html")
  : `${kind}-${LANG}.html`);

/** Seletor de língua (muda e recarrega). */
export const langSelect = (id = "langSel") => `<select id="${id}" class="lang-sel" aria-label="Language">${Object.entries(LANGS)
  .map(([k, v]) => `<option value="${k}" ${k === LANG ? "selected" : ""}>${v}</option>`).join("")}</select>`;
