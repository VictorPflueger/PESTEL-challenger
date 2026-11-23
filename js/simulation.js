// The simulation: three recorded runs (data/scenarios/), played without a key through the same run model,
// engine and views as a live run. A scenario holds every text in English and German; localise() turns it
// into the shapes the agents' schemas define, in one language, and runFromScenario() builds the run the
// page shows from it and from what the person did (corrections undone, choices made, the decision taken).
// The person's state lives apart from the texts, so EN | DE switches every word mid-run and keeps it.

import S1 from "../data/scenarios/s1.js";
import S2 from "../data/scenarios/s2.js";
import S3 from "../data/scenarios/s3.js";
import { SOURCES } from "../data/sources.js";

/** The scenarios in the order the page offers them; Auental Energie opens by default. */
export const SCENARIOS = Object.freeze([S1, S2, S3]);
export const DEFAULT_SCENARIO = "s3";
export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id) || null;

const isText = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && typeof v.en === "string" && typeof v.de === "string";

/** Every {en, de} pair in a value, deep, replaced by the text in one language. */
export function localise(value, lang) {
  if (isText(value)) return value[lang === "de" ? "de" : "en"];
  if (Array.isArray(value)) return value.map((v) => localise(v, lang));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localise(v, lang)]));
  return value;
}

/** What the person did in a run: corrections undone, factors removed, choices made, the decision taken. */
export function freshState() {
  return { undone: new Set(), removed: new Set(), choices: new Map(), decided: false };
}

/** The sources a factor rests on that the scenario's author checked, with their titles and dates read. */
function checkedSources(sc) {
  const byUrl = new Map(SOURCES.map((s) => [s.url, s]));
  return Object.fromEntries(Object.entries(sc.checked || {}).map(([id, urls]) => [id, urls.map((u) => byUrl.get(u) || { url: u, title: u, read_on: null })]));
}

/** The run of a scenario in a language, with the person's state. */
export function runFromScenario(sc, lang, state = freshState()) {
  const a = sc.answers;
  return {
    mode: "simulation",
    scenario: sc.id,
    as_of: sc.as_of,
    source: sc.source,
    lang,
    company: { ...sc.company, ...localise(sc.texts, lang)[lang === "de" ? "de" : "en"] },
    team: localise(sc.team, lang),
    research: !!sc.research,
    signals: localise(a.scout?.signals ?? [], lang),
    scan: localise(a.scanner, lang),
    issues: localise(a.red_team.issues, lang),
    impacts: localise(a.analyst.impacts, lang),
    responses: localise(a.strategist.responses, lang),
    summary: localise(a.writer.summary, lang),
    checked: localise(checkedSources(sc), lang),
    recorded: new Map(sc.choices.map((c) => [c.factor, c.choice])),
    undone: state.undone,
    removed: state.removed,
    choices: state.choices,
    decided: state.decided,
  };
}
