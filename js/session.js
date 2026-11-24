// The one store of this tab's work (brief §5.9): what the person entered for a live run, the settings
// they chose, the live run with everything the agents and the engine produced, and what they decided. It
// lives in memory and nowhere else: nothing here is written to local storage, session storage, IndexedDB,
// the Cache API or a cookie, put in a URL or logged, and a reload or a closed tab ends it. The person keeps
// a result only by downloading it. The key lives in js/keystore.js, the set's shared memory-only store,
// and goes through this module to the rest of the page; "Clear everything" empties both. While a result
// exists that has not been downloaded, the browser asks before the page is left.
// Adapted from the Prototype Ideator 0.2.0 (532e0f5) js/session.js: this tool's form, run and decisions.

import { forgetKey } from "./keystore.js";
import { APP, CAP, DEFAULT_PRESET } from "./config.js";

export { getKey, hasKey, setKey, forgetKey, looksLikeKey, maskKey, redactSecrets } from "./keystore.js";

const DIMENSIONS = ["political", "economic", "social", "technological", "environmental", "legal"];

/** An empty live form: the company, and per dimension the lines the person typed. */
export function emptyInputs() {
  return { company: { name: "", sector: "", country: "", what: "" }, lines: Object.fromEntries(DIMENSIONS.map((d) => [d, ""])), factors: [] };
}

/**
 * The person's factors from the lines they typed, one per line, empty lines skipped, numbered u1, u2 and
 * so on in the order of PESTEL and then of the lines.
 */
export function factorsFromLines(lines) {
  const out = [];
  for (const d of DIMENSIONS) {
    for (const raw of String(lines?.[d] ?? "").split(/\r?\n/)) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text) out.push({ id: `u${out.length + 1}`, dimension: d, text });
    }
  }
  return out;
}

/** Changes one field of the form, or a dimension's lines, and keeps the factors in step. */
export function setInput(field, value) {
  if (field.startsWith("lines.")) {
    state.inputs.lines[field.slice(6)] = String(value ?? "");
    state.inputs.factors = factorsFromLines(state.inputs.lines);
  } else if (Object.hasOwn(state.inputs.company, field)) {
    state.inputs.company[field] = String(value ?? "");
  }
  notify();
}

/** What the person did in a live run: corrections undone, AI factors removed or edited, choices made. */
export function freshPerson() {
  return { undone: new Set(), removed: new Set(), edits: new Map(), choices: new Map(), decided: false };
}

function blank() {
  return {
    mode: "simulation",          // "simulation" or "live"
    inputs: emptyInputs(),
    settings: { preset: DEFAULT_PRESET, research: false, model: null, effort: null, cap: CAP.default },
    run: null,                   // the live run, as js/pipeline.js builds it
    person: freshPerson(),
    last: null,                  // { eur, ms, preset, research } of the last live run in this tab
    result: false,               // true once a live run has produced something worth keeping
    downloaded: false,           // true once that result has been downloaded since it last changed
  };
}

let state = blank();
const listeners = new Set();

function notify() {
  for (const fn of [...listeners]) {
    try { fn(state); } catch (e) { console.error(`[${APP.name}] session listener failed:`, e); }
  }
}

/** The session, read-only by convention: change it through the functions below. */
export function session() {
  return state;
}

/** Calls fn(session) after every change. Returns an unsubscribe function. */
export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Changes plain fields of the session. */
export function updateSession(patch) {
  for (const [k, v] of Object.entries(patch || {})) if (Object.hasOwn(state, k)) state[k] = v;
  notify();
}

/** A result now exists that has not been downloaded since it changed. */
export function markResult() {
  state.result = true;
  state.downloaded = false;
  notify();
}

/** The person downloaded the result as it stands. */
export function markDownloaded() {
  state.downloaded = true;
  notify();
}

/**
 * "Clear everything": the key, the form, the run and the decisions, as if the tab had just opened. What
 * the last run cost and took stays for the dialog's estimate: two numbers, nothing the person entered.
 */
export function clearEverything() {
  forgetKey();
  const last = state.last;
  state = blank();
  state.last = last;
  notify();
}

/** True while leaving the page would lose a result the person has not downloaded. */
export function wouldLose() {
  return state.result && !state.downloaded;
}

/** The browser's own leave-page warning while a result exists that has not been downloaded. */
export function guardLeaving(target = globalThis) {
  target.addEventListener?.("beforeunload", (e) => {
    if (!wouldLose()) return;
    e.preventDefault();
    e.returnValue = "";
  });
}
