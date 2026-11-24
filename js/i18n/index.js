// Both languages. English opens every first visit, whatever the browser's language; German is one click
// away (brief §5.11). The choice: ?lang=de or ?lang=en in the address wins and becomes the stored choice;
// otherwise the stored choice (localStorage "pestel.lang"); otherwise English. <html lang> follows. A
// change re-renders every view through onLang(), without a reload.
//
// Every string a person reads lives in en.js and de.js under the same keys. Values may hold placeholders
// in braces, "{name}", filled from t()'s second argument. index.html keeps the English texts as static
// defaults; its elements name their key in data-i18n (text) or data-i18n-attr ("attribute:key;
// attribute:key"), and applyStatic() replaces them at runtime. The two guides are written out in the
// page, one per language, as Vici's guide expects.
// Adapted from the Sovereignty Assessment 2.0.0: the storage key, the log prefix, and no Diagnostics.

import { STORAGE } from "../config.js";
import EN from "./en.js";
import DE from "./de.js";

export const LANGS = ["en", "de"];
const DICTS = { en: EN, de: DE };
const LOCALES = { en: "en-GB", de: "de-DE" };

let lang = "en";
const listeners = new Set();
const missing = new Set();

function readStored() {
  try { return localStorage.getItem(STORAGE.lang); } catch { return null; }
}
function store(value) {
  try { localStorage.setItem(STORAGE.lang, value); } catch { /* storage blocked: the choice lasts this page only */ }
}

/**
 * The language at start-up: ?lang= wins and is stored, then the stored choice, then English. The
 * browser's own language is never asked.
 */
export function initLang(search = location.search) {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (LANGS.includes(fromUrl)) {
    lang = fromUrl;
    store(fromUrl);
  } else {
    const stored = readStored();
    lang = LANGS.includes(stored) ? stored : "en";
  }
  document.documentElement.lang = locale(lang) === "de-DE" ? "de" : "en-GB";
  return lang;
}

export function getLang() {
  return lang;
}

/** The Intl locale of a language: en-GB or de-DE. */
export function locale(l = lang) {
  return LOCALES[l] || LOCALES.en;
}

/** Switches the whole interface, stores the choice and tells every view. No reload. */
export function setLang(next) {
  if (!LANGS.includes(next)) return;
  store(next);
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = next === "de" ? "de" : "en-GB";
  document.documentElement.dataset.lang = next;
  applyStatic();
  for (const fn of [...listeners]) {
    try { fn(lang); } catch (e) { console.error("[PESTEL Challenger] language listener failed:", e); }
  }
}

/**
 * Runs fn with `l` as the active language of t(), tn(), getLang() and every formatter that asks for it, and
 * returns what fn returns. Nothing is stored and no view hears of it: a live run's report speaks the run's
 * language whatever the page shows (brief §5.11).
 */
export function inLang(l, fn) {
  if (!LANGS.includes(l) || l === lang) return fn();
  const was = lang;
  lang = l;
  try { return fn(); } finally { lang = was; }
}

/** Calls fn(lang) after every language change. Returns an unsubscribe function. */
export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The text of a key in the active language (or in `l`), with {placeholders} filled from vars. An unknown
 * key returns the key itself, so it shows on screen and the tests find it.
 */
export function t(key, vars = null, l = lang) {
  const dict = DICTS[l] || EN;
  let text = dict[key];
  if (typeof text !== "string") {
    missing.add(key);
    text = key;
  }
  if (!vars) return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, name) => (Object.hasOwn(vars, name) && vars[name] !== null && vars[name] !== undefined ? String(vars[name]) : m));
}

/** The plural form of a key for n: key.one or key.other, chosen by the language's plural rules. */
export function tn(key, n, vars = {}, l = lang) {
  const form = new Intl.PluralRules(locale(l)).select(Number(n)) === "one" ? "one" : "other";
  return t(`${key}.${form}`, { n, ...vars }, l);
}

/** Whether a key exists in both languages. */
export function has(key) {
  return typeof EN[key] === "string" && typeof DE[key] === "string";
}

/** The dictionary of a language (read-only), for the tests. */
export function dictionary(l) {
  return DICTS[l] || null;
}

/** Keys asked for that neither dictionary has. */
export function missingKeys() {
  return [...missing];
}

/** The values of an element's data-i18n-vars (JSON), or null. */
function varsOf(el) {
  const raw = el.dataset.i18nVars;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Re-translates every element that names its key: data-i18n="key" sets an element's text (with
 * data-i18n-vars='{"name": value}' for its placeholders, and data-i18n-n="n" for a plural form);
 * data-i18n-attr="aria-label:key; title:key" sets its attributes. The document title and description
 * follow.
 */
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    const vars = varsOf(el);
    const n = el.dataset.i18nN;
    el.textContent = n !== undefined ? tn(el.dataset.i18n, Number(n), vars || {}) : t(el.dataset.i18n, vars);
  }
  for (const el of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
  if (root === document) {
    document.title = t("app.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("app.description"));
  }
}
