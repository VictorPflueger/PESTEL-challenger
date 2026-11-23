// The scenario checker (brief §7): every reason a recorded run could mislead, found before it plays. Shared
// by tools/check-scenarios.mjs, which runs it on the three scenarios and prints what it finds, and by
// tests/scenarios.mjs, which plants a defect of each kind and proves it is caught. It fails on
//   - an answer that breaks its schema in either language, or names an id that does not exist;
//   - a text missing in a language, or placeholders that differ between the languages;
//   - prose that fails the fact audit, or a placeholder outside the Writer's summary;
//   - a break of the method's guardrails (brief §6.7) or of the counts the agents must keep;
//   - a figure that no longer matches the frozen reference figures;
//   - an address missing from data/sources.js or DATA_SOURCES.md, or evidence that is no signal's;
//   - anything shaped like an API key, and a thinking block;
// and it plays every scenario along the recorded choices and along two others, all accept and every
// factor's other option, and checks that the figures and the summary still hold together.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea) js/runs_check.js, for this tool's run format.

import { validate } from "./schema.js";
import { SCHEMAS, REQUESTS } from "./schemas.js";
import { SOURCES } from "../data/sources.js";
import { KPIS } from "../data/kpis.js";
import { DIMENSIONS } from "./engine.js";
import { localise, runFromScenario, freshState } from "./simulation.js";
import * as R from "./run.js";
import { auditText, FACT_RE, renderFacts } from "./facts.js";

const LANGS = ["en", "de"];
const isText = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && typeof v.en === "string" && typeof v.de === "string";
const placeholders = (s) => [...String(s).matchAll(new RegExp(FACT_RE.source, "g"))].map((m) => m[1]).sort().join("|");
const close = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) <= 1e-9);
const sameList = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

/**
 * Where the prose sits in a scenario: path patterns (with * for every array item) whose value must be a
 * text in both languages, and whether a placeholder may appear there (the Writer's summary only).
 */
const PROSE = [
  ["team.*.text", false],
  ["answers.scout.signals.*.title", false], ["answers.scout.signals.*.summary", false],
  ["answers.scanner.factors.*.text", false], ["answers.scanner.factors.*.basis", false],
  ["answers.scanner.ratings.*.basis", false],
  ["answers.red_team.issues.*.title", false], ["answers.red_team.issues.*.reason", false],
  ["answers.red_team.issues.*.correction.new_factor.text", false], ["answers.red_team.issues.*.correction.new_factor.basis", false],
  ["answers.red_team.issues.*.correction.outdated_reason", false], ["answers.red_team.issues.*.correction.link.effect", false],
  ["answers.analyst.impacts.*.basis", false], ["answers.analyst.impacts.*.not_monetisable", false],
  ["answers.analyst.impacts.*.kpis.*.basis", false], ["answers.analyst.impacts.*.kpis.*.new_kpi.name", false],
  ["answers.analyst.impacts.*.kpis.*.new_kpi.definition", false],
  ["answers.strategist.responses.*.title", false], ["answers.strategist.responses.*.first_step", false],
  ["answers.strategist.responses.*.owner", false],
  ["answers.strategist.responses.*.monitor.signal", false], ["answers.strategist.responses.*.monitor.trigger", false],
  ["answers.strategist.responses.*.monitor.where", false], ["answers.strategist.responses.*.monitor.how_often", false],
  ["answers.writer.summary.headline", true], ["answers.writer.summary.situation", true],
  ["answers.writer.summary.findings.*", true], ["answers.writer.summary.recommendation", true],
  ["answers.writer.summary.assumptions.*", true],
];

/** Every value at a path pattern, with its concrete path; null values (a field that does not apply) are skipped. */
function at(root, pattern) {
  let out = [{ v: root, path: "" }];
  for (const key of pattern.split(".")) {
    const next = [];
    for (const { v, path } of out) {
      if (v === null || v === undefined) continue;
      if (key === "*") (Array.isArray(v) ? v : []).forEach((x, i) => next.push({ v: x, path: `${path}[${i}]` }));
      else if (typeof v === "object" && key in v) next.push({ v: v[key], path: path ? `${path}.${key}` : key });
    }
    out = next;
  }
  return out.filter(({ v }) => v !== null && v !== undefined);
}

/** Every string anywhere in a value, with its path. */
function strings(v, path = "", out = []) {
  if (typeof v === "string") out.push({ v, path });
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out);
  return out;
}

/** The addresses a scenario cites: signals, the factors' and issues' evidence, and the author's checks. */
export function scenarioUrls(sc) {
  const urls = new Set();
  for (const s of sc.answers.scout?.signals ?? []) urls.add(s.url);
  for (const f of sc.answers.scanner?.factors ?? []) for (const u of f.evidence ?? []) urls.add(u);
  for (const i of sc.answers.red_team?.issues ?? []) {
    for (const u of i.evidence ?? []) urls.add(u);
    for (const u of i.correction?.new_factor?.evidence ?? []) urls.add(u);
  }
  for (const list of Object.values(sc.checked ?? {})) for (const u of list) urls.add(u);
  return [...urls];
}

/** The evidence the fact audit reads for a scenario in a language. */
function corpus(sc, lang) {
  const loc = (v) => localise(v, lang);
  const titles = [
    ...SOURCES.flatMap((s) => [s.title.en, s.title.de, s.publisher, s.fact?.en ?? "", s.fact?.de ?? ""]),
    ...(sc.answers.scout?.signals ?? []).flatMap((s) => [loc(s.title)]),
    ...KPIS.flatMap((k) => [k.name.en, k.name.de]),
  ];
  const texts = [
    sc.company.name, sc.texts?.[lang]?.what ?? "",
    ...(sc.team ?? []).map((t) => loc(t.text)),
    ...(sc.answers.scout?.signals ?? []).map((s) => loc(s.summary)),
  ];
  return { titles, texts, quotes: [], urls: scenarioUrls(sc) };
}

/** The ids of every factor a scenario can hold: the team's, the Scanner's and those the challenge adds. */
function factorIds(sc) {
  const team = (sc.team ?? []).map((t) => t.id);
  const scan = (sc.answers.scanner?.factors ?? []).map((f) => f.id);
  const added = (sc.answers.red_team?.issues ?? []).map((i) => i.correction?.new_factor?.id).filter(Boolean);
  return { team, scan, added, all: [...team, ...scan, ...added] };
}

/** The engine's figures for a run, in the shape the scenario freezes. */
export function frozenFigures(run) {
  const before = R.figures(run, { decided: false }).before;
  const done = R.figures({ ...run, decided: true });
  const scan = R.dimensionStates(run, 1);
  return {
    before: { at_stake: before.atStake, readiness: before.readiness, pressure: before.pressure, threats: before.threats, monetised: before.monetised },
    after: { left: done.after.atStake, readiness: done.after.readiness, pressure: done.after.pressure },
    upside: done.upside,
    watch: done.watch.length,
    factors: done.factorsCount,
    added: done.factorsAdded,
    scan_pressure: DIMENSIONS.filter((d) => scan[d].status === "pressure"),
  };
}

function compareFrozen(frozen, now) {
  const out = [];
  if (!frozen || !Object.keys(frozen).length) return ["has no frozen figures; record these: " + JSON.stringify(now)];
  const num = (a, b, name) => { if (!close(a ?? null, b ?? null)) out.push(`${name} is ${b}, frozen ${a}`); };
  const list = (a, b, name) => { if (!sameList(a, b)) out.push(`${name} is [${(b || []).join(", ")}], frozen [${(a || []).join(", ")}]`); };
  num(frozen.before?.at_stake, now.before.at_stake, "at stake before the decision");
  num(frozen.before?.readiness, now.before.readiness, "readiness before the decision");
  list(frozen.before?.pressure, now.before.pressure, "dimensions under pressure before the decision");
  num(frozen.before?.threats, now.before.threats, "threats counted");
  num(frozen.before?.monetised, now.before.monetised, "threats with a euro range");
  num(frozen.after?.left, now.after.left, "at stake after the decision");
  num(frozen.after?.readiness, now.after.readiness, "readiness after the decision");
  list(frozen.after?.pressure, now.after.pressure, "dimensions under pressure after the decision");
  num(frozen.upside, now.upside, "upside");
  num(frozen.watch, now.watch, "watch list rows");
  num(frozen.factors, now.factors, "factors counted");
  num(frozen.added, now.added, "factors the agents added");
  list(frozen.scan_pressure, now.scan_pressure, "dimensions under pressure after the scan");
  return out;
}

/** The method's guardrails and the counts the agents keep, on the run in one language. */
function guardrails(sc, run, lang) {
  const out = [];
  const say = (m) => out.push(`${lang}: ${m}`);
  const scanned = R.scannedFactors(run);
  for (const d of DIMENSIONS) {
    const n = scanned.filter((f) => f.dimension === d).length;
    if (n < 2 || n > 6) say(`after the scan, ${d} holds ${n} factors; the Scanner completes each dimension to two to six`);
  }
  for (const f of R.challengedFactors(run)) {
    if (!f.direction) say(`factor ${f.id} has no direction`);
    if (f.direction === "threat" && !(Number.isInteger(f.readiness) && f.readiness >= 1 && f.readiness <= 5)) say(`threat ${f.id} has readiness ${f.readiness}; a threat's readiness is 1 to 5`);
    if (f.direction === "opportunity" && f.readiness !== null) say(`opportunity ${f.id} has a readiness level; opportunities have none`);
    for (const k of ["likelihood", "impact"]) if (!(Number.isInteger(f[k]) && f[k] >= 1 && f[k] <= 5)) say(`factor ${f.id} has ${k} ${f[k]}; it is 1 to 5`);
    if ([...String(f.text)].length > 90) say(`factor ${f.id}'s text has ${[...String(f.text)].length} characters; at most 90`);
  }
  for (const d of DIMENSIONS) {
    const n = R.challengedFactors(run).filter((f) => f.dimension === d && !f.outdated).length;
    if (n > 6) say(`after the challenge, ${d} holds ${n} factors; at most six`);
  }
  if ((run.issues || []).length > 8) say(`the Red team raises ${run.issues.length} issues; at most eight`);
  if ((run.signals || []).length > 8) say(`the Scout reports ${run.signals.length} signals; at most eight`);
  const factors = new Map(R.challengedFactors(run).map((f) => [f.id, f]));
  for (const i of run.impacts || []) {
    if (i.eur_year_low !== null && i.eur_year_high !== null && i.eur_year_low > i.eur_year_high) say(`impact on ${i.factor}: low above high`);
    if (i.upside && i.upside.eur_year_low > i.upside.eur_year_high) say(`impact on ${i.factor}: upside low above high`);
    for (const k of i.kpis) if (k.change_low > k.change_high) say(`impact on ${i.factor}: KPI ${k.id} low above high`);
    const f = factors.get(i.factor);
    if (f?.direction === "threat" && i.not_monetisable === null && (i.eur_year_low === null || i.eur_year_high === null)) say(`threat ${i.factor} has neither a euro range nor a reason for none`);
    if (f?.direction === "opportunity" && !i.upside) say(`opportunity ${i.factor} has no upside`);
  }
  const perFactor = new Map();
  for (const r of run.responses || []) {
    const f = factors.get(r.factor) || R.scannedFactors(run).find((x) => x.id === r.factor);
    perFactor.set(r.factor, [...(perFactor.get(r.factor) || []), r]);
    if (f?.direction === "opportunity" && r.kind === "mitigate") say(`response ${r.id}: an opportunity is used or watched, not mitigated`);
    if (r.kind === "mitigate") {
      const m = r.mitigate;
      if (!m) { say(`response ${r.id} is a mitigation without its figures`); continue; }
      const impact = (run.impacts || []).find((i) => i.factor === r.factor);
      if (f && m.residual_likelihood > f.likelihood) say(`response ${r.id}: residual likelihood ${m.residual_likelihood} is above the threat's ${f.likelihood}`);
      if (impact?.eur_year_high !== null && impact?.eur_year_high !== undefined && m.residual_eur_year_high > impact.eur_year_high) say(`response ${r.id}: residual range is above the original`);
      if (m.residual_eur_year_low > m.residual_eur_year_high) say(`response ${r.id}: residual low above high`);
      if (impact?.not_monetisable) say(`response ${r.id} gives a residual range for a threat without one`);
    }
    if (r.kind === "monitor" && !(r.monitor?.signal && r.monitor?.trigger)) say(`response ${r.id} watches without a signal and a trigger`);
    if (r.kind === "advantage" && !r.advantage) say(`response ${r.id} is an advantage without its upside`);
    if (r.advantage && r.advantage.eur_year_low > r.advantage.eur_year_high) say(`response ${r.id}: upside low above high`);
  }
  for (const [id, list] of perFactor) {
    const rec = list.filter((r) => r.recommended).length;
    if (rec !== 1) say(`factor ${id} has ${rec} recommended responses; it has exactly one`);
    if (list.length > 3) say(`factor ${id} has ${list.length} responses; at most three`);
  }
  for (const f of R.decisionFactors(run)) if (!perFactor.has(f.id)) say(`factor ${f.id} has no response`);
  return out;
}

/**
 * Plays a run along a set of choices: the figures and the summary must hold together. Returns problems.
 */
function play(sc, lang, label, choose) {
  const out = [];
  const state = freshState();
  const run0 = runFromScenario(sc, lang, state);
  for (const f of R.decisionFactors(run0)) state.choices.set(f.id, choose(run0, f));
  state.decided = true;
  const run = runFromScenario(sc, lang, state);
  const r = R.figures(run);
  const bad = (x) => x === null || !Number.isFinite(x);
  if (bad(r.after.atStake) || r.after.atStake < 0) out.push(`${label} (${lang}): at stake after is ${r.after.atStake}`);
  if (r.after.readiness !== null && (r.after.readiness < 0 || r.after.readiness > 100)) out.push(`${label} (${lang}): readiness after is ${r.after.readiness}`);
  if (r.after.atStake > r.before.atStake + 1e-9) out.push(`${label} (${lang}): a response raises the money at stake`);
  for (const row of R.watchList(run)) if (!row.signal || !row.trigger) out.push(`${label} (${lang}): watch row ${row.factor} lacks a signal or trigger`);
  const values = R.runFacts(run, lang);
  for (const t of strings(run.summary)) {
    const shown = renderFacts(t.v, values);
    if (/\{\{fact:/.test(shown)) out.push(`${label} (${lang}): the summary's ${t.path} keeps a placeholder the run has no figure for`);
  }
  return out;
}

/**
 * Checks one scenario. dataSources: the text of DATA_SOURCES.md (omit in the browser). Returns
 * { id, problems, figures }.
 */
export function checkScenario(sc, { dataSources = null } = {}) {
  const problems = [];
  const say = (m) => problems.push(m);

  // The scenario's own shape, and nothing that should never be there.
  const shape = validate(sc, SCHEMAS.scenario, SCHEMAS);
  for (const e of shape.errors) say(`scenario ${e.path}: ${e.message}`);
  const raw = JSON.stringify(sc);
  if (/sk-ant-[A-Za-z0-9_-]{6,}/.test(raw) || /x-api-key/i.test(raw)) say("holds something shaped like an API key");
  const thinking = (v) => v && typeof v === "object" && (Array.isArray(v) ? v.some(thinking) : ("thinking" in v || v.type === "thinking" || v.type === "redacted_thinking" || Object.values(v).some(thinking)));
  if (thinking(sc)) say("holds a thinking block");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sc.as_of || "")) say(`as_of ${sc.as_of} is no date`);
  for (const l of LANGS) if (!sc.texts?.[l]?.what) say(`texts.${l}.what is missing`);

  // Both languages for every text, the same placeholders in each, and placeholders only where allowed.
  for (const [pattern, allowed] of PROSE) {
    for (const { v, path } of at(sc, pattern)) {
      if (!isText(v)) { say(`${path} is not a text in English and German`); continue; }
      if (!v.en.trim() || !v.de.trim()) say(`${path} is empty in ${!v.en.trim() ? "English" : "German"}`);
      if (placeholders(v.en) !== placeholders(v.de)) say(`${path} has different placeholders in English and German`);
      if (!allowed && placeholders(v.en)) say(`${path} holds a placeholder; only the Writer's summary cites the engine's figures`);
    }
  }
  // Anything else bilingual must still be complete.
  for (const { v, path } of strings(localise(sc, "en"))) if (!v.trim() && !path.endsWith("published")) say(`${path} is empty`);

  // The ids: unique, and every reference to one that exists.
  const ids = factorIds(sc);
  const dup = ids.all.filter((x, i) => ids.all.indexOf(x) !== i);
  if (dup.length) say(`factor ids used twice: ${[...new Set(dup)].join(", ")}`);
  const known = new Set(ids.all);
  for (const r of sc.answers.scanner?.ratings ?? []) if (!ids.team.includes(r.factor)) say(`a rating names ${r.factor}, which the team did not enter`);
  for (const i of sc.answers.red_team?.issues ?? []) {
    for (const f of i.factors) if (!known.has(f)) say(`issue ${i.id} names factor ${f}, which does not exist`);
    const c = i.correction;
    if (c.factor && !known.has(c.factor)) say(`issue ${i.id}'s correction names factor ${c.factor}, which does not exist`);
    if (c.kind === "add_factor" && !c.new_factor) say(`issue ${i.id} adds a factor but gives none`);
    if (c.kind !== "add_factor" && !c.factor) say(`issue ${i.id}'s correction names no factor`);
    if (c.link) for (const f of [c.link.from, c.link.to]) if (!known.has(f)) say(`issue ${i.id} links factor ${f}, which does not exist`);
  }
  const issueIds = (sc.answers.red_team?.issues ?? []).map((i) => i.id);
  if (new Set(issueIds).size !== issueIds.length) say("issue ids used twice");
  const impacts = (sc.answers.analyst?.impacts ?? []).map((i) => i.factor);
  for (const f of impacts) if (!known.has(f)) say(`an impact names factor ${f}, which does not exist`);
  for (const f of ids.all) if (!impacts.includes(f)) say(`factor ${f} has no impact; the Analyst covers every factor`);
  const responses = sc.answers.strategist?.responses ?? [];
  const responseIds = new Set(responses.map((r) => r.id));
  if (responseIds.size !== responses.length) say("response ids used twice");
  for (const r of responses) if (!known.has(r.factor)) say(`response ${r.id} names factor ${r.factor}, which does not exist`);
  for (const c of sc.choices) {
    const r = responses.find((x) => x.id === c.choice);
    if (c.choice !== "accept" && !r) say(`the recorded choice for ${c.factor} is ${c.choice}, which is no response`);
    if (r && r.factor !== c.factor) say(`the recorded choice ${c.choice} answers ${r.factor}, not ${c.factor}`);
  }

  // Evidence: research or not, addresses from the signals, every address in the registers.
  const signalUrls = new Set((sc.answers.scout?.signals ?? []).map((s) => s.url));
  if (!sc.research && signalUrls.size) say("runs without research but holds signals");
  const evidence = [
    ...(sc.answers.scanner?.factors ?? []).flatMap((f) => f.evidence.map((u) => [`factor ${f.id}`, u])),
    ...(sc.answers.red_team?.issues ?? []).flatMap((i) => [...i.evidence.map((u) => [`issue ${i.id}`, u]), ...(i.correction?.new_factor?.evidence ?? []).map((u) => [`factor ${i.correction.new_factor.id}`, u])]),
  ];
  for (const [who, u] of evidence) if (!signalUrls.has(u)) say(`${who} cites ${u}, which no signal of this run gave`);
  for (const id of Object.keys(sc.checked ?? {})) if (!known.has(id)) say(`the author's checks name factor ${id}, which does not exist`);
  const registered = new Set(SOURCES.map((s) => s.url));
  for (const u of scenarioUrls(sc)) {
    if (!registered.has(u)) say(`${u} is missing from data/sources.js`);
    if (dataSources !== null && !dataSources.includes(u)) say(`${u} is missing from DATA_SOURCES.md`);
  }

  for (const lang of LANGS) {
    const loc = (v) => localise(v, lang);
    const a = sc.answers;
    // Each answer against its schema, in each language.
    const checks = [
      ["the Scanner's answer", loc(a.scanner), REQUESTS.Scan],
      ["the Red team's answer", loc(a.red_team), REQUESTS.Issues],
      ["the Analyst's answer", loc(a.analyst), REQUESTS.Impacts],
      ["the Strategist's answer", loc(a.strategist), REQUESTS.Responses],
      ["the Writer's answer", loc(a.writer), REQUESTS.SummaryRequest],
      ...(a.scout ? (loc(a.scout).signals ?? []).map((s, i) => [`signal ${i + 1}`, s, SCHEMAS.signal]) : []),
      ...sc.choices.map((c, i) => [`recorded choice ${i + 1}`, c, SCHEMAS.decision]),
    ];
    for (const [who, value, schema] of checks) {
      const r = validate(value, schema, SCHEMAS);
      for (const e of r.errors.slice(0, 5)) say(`${lang}: ${who} ${e.path}: ${e.message}`);
    }

    const run = runFromScenario(sc, lang);
    // A value the schema refuses can stop the engine itself (a readiness outside 1 to 5): say so, and go on.
    try {
      for (const m of guardrails(sc, run, lang)) say(m);
    } catch (e) {
      say(`${lang}: the engine cannot compute this run: ${e.message}`);
      continue;
    }

    // The fact audit on every agent's text; the summary's placeholders against the run's fact keys.
    const keys = new Set(Object.keys(R.runFacts({ ...run, decided: true }, lang)));
    const ev = corpus(sc, lang);
    for (const [pattern] of PROSE) {
      if (pattern.startsWith("team.")) continue; // what the person entered is theirs, never audited
      for (const { v, path } of at(sc, pattern)) {
        if (!isText(v)) continue;
        const r = auditText(v[lang], { facts: keys, evidence: ev });
        if (r.tokens.length) say(`${lang}: ${path} writes a figure the engine did not compute: ${r.tokens.join(", ")}`);
        if (r.unknownFacts.length) say(`${lang}: ${path} cites unknown fact keys: ${r.unknownFacts.join(", ")}`);
      }
    }
  }

  // The frozen figures, then the run along two other sets of choices.
  const run = runFromScenario(sc, "en");
  let figures = null;
  try {
    figures = frozenFigures(run);
    for (const m of compareFrozen(sc.frozen, figures)) say(`frozen figures: ${m}`);
    for (const lang of LANGS) {
      for (const m of play(sc, lang, "along the recorded choices", (r, f) => r.recorded.get(f.id) ?? "accept")) say(m);
      for (const m of play(sc, lang, "accepting every threat as it is", () => "accept")) say(m);
      for (const m of play(sc, lang, "with every factor's other option", (r, f) => R.optionsFor(r, f.id).find((o) => !o.recommended)?.id ?? "accept")) say(m);
    }
    // The recorded choices cover every factor the person decides on.
    for (const f of R.decisionFactors(run)) if (!run.recorded.has(f.id)) say(`no recorded choice for ${f.id}`);
  } catch (e) {
    say(`the engine cannot compute the figures: ${e.message}`);
  }

  return { id: sc.id, problems, figures };
}
