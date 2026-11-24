// "Save run as simulation" (brief §13, PLAN.md section 9): after a live run, the run in the format the
// simulation plays (schemas/scenario.json), so Victor can curate it into a recorded scenario. It holds
// what the person entered, every agent's answer as the run kept it (AI factors removed at Scan left out,
// edits applied), the person's choices and the engine's figures. It never holds the key, a prompt, a
// thinking block or the request log. Its texts stand in the run's language; the other language is left
// empty, and the company keeps its real name with fictional set to false, so the scenario checker lists
// exactly what curation still owes: a fictional name, the other language, and every fact checked at source.

import { PROSE, frozenFigures } from "./scenario_check.js";
import * as R from "./run.js";
import { APP } from "./config.js";

/** A text in the run's language, the other left for curation. */
const bilingual = (text, lang) => (lang === "de" ? { en: "", de: String(text) } : { en: String(text), de: "" });

/** Sets every value at a path pattern (with * for each array item) through fn, in place. */
function mapAt(root, pattern, fn) {
  const keys = pattern.split(".");
  const walk = (v, i) => {
    if (v === null || v === undefined) return;
    const k = keys[i];
    const last = i === keys.length - 1;
    if (k === "*") {
      if (!Array.isArray(v)) return;
      v.forEach((x, n) => (last ? (x !== null && x !== undefined && (v[n] = fn(x))) : walk(x, i + 1)));
    } else if (typeof v === "object" && k in v) {
      if (last) { if (v[k] !== null && v[k] !== undefined) v[k] = fn(v[k]); } else walk(v[k], i + 1);
    }
  };
  walk(root, 0);
}

/** The live run in the scenario format, from the run with the person's state. */
export function scenarioOf(view, { now = new Date() } = {}) {
  const lang = view.lang;
  const kept = (view.scan?.factors || [])
    .filter((f) => !view.removed?.has(f.id))
    .map((f) => ({ ...f, ...(view.edits?.get(f.id) || {}) }));
  const sc = {
    id: "live",
    as_of: view.as_of,
    source: "recorded",
    company: { name: view.company.name, sector: view.company.sector || "general", country: view.company.country, fictional: false },
    texts: { en: { what: "", country: "" }, de: { what: "", country: "" } },
    team: view.team.map((t) => ({ id: t.id, dimension: t.dimension, text: t.text })),
    research: !!view.research,
    checked: {},
    answers: {
      ...(view.research ? { scout: { signals: (view.signals || []).map((s) => ({ ...s })) } } : {}),
      scanner: { factors: kept, ratings: (view.scan?.ratings || []).map((r) => ({ ...r })), sector: view.scan?.sector ?? null },
      red_team: { issues: structuredClone(view.issues || []) },
      analyst: { impacts: structuredClone(view.impacts || []) },
      strategist: { responses: structuredClone(view.responses || []) },
      writer: { summary: structuredClone(view.summary || {}) },
    },
    choices: R.engineDecisions(view).map((d) => ({ factor: d.factor, choice: d.response ?? "accept", at: now.toISOString(), by: "you" })),
    frozen: frozenFigures(view),
  };
  sc.texts[lang] = { what: view.company.what, country: view.company.country };
  for (const [pattern] of PROSE) mapAt(sc, pattern, (v) => bilingual(v, lang));
  return sc;
}

/** A company's name for a file name: lower case, umlauts written out, other marks dropped, hyphens between. */
export function slugOf(name) {
  return String(name || "company").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";
}

/** The file name: pestel-challenger-<company>-<date>-<lang>-run.json, umlauts written out. */
export function saveName(view) {
  return `${APP.id}-challenger-${slugOf(view.company.name)}-${view.as_of}-${view.lang}-run.json`;
}

/** A report's file name (brief §9): pestel-challenger-<company>-<YYYY-MM-DD>-<lang>.<ext>. */
export function reportName(run, { date, lang, ext }) {
  return `${APP.id}-challenger-${slugOf(run.company.name)}-${date}-${lang}.${ext}`;
}

/** Downloads a text as a file the person keeps; nothing else leaves the page. */
export function downloadText(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
