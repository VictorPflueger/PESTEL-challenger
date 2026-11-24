// The checks every agent's answer passes before the next step reads it (brief §5.2, §6.7 and §5.10). The
// schema comes first (js/schema.js against the request's format), then what a schema cannot hold: ids,
// counts, ranges, references and the refusals of brief §6.7, each with the message that goes back to the
// agent for its one repair:
//   a readiness level outside 1 to 5, or one given for an opportunity;
//   a factor without a direction;
//   a correction that names a factor that does not exist;
//   a residual risk above the original, in its high end or in what it leaves at stake;
//   a euro figure below zero, or a range whose low is above its high;
//   a monitor response without a signal and a trigger;
//   more than six factors in a dimension;
//   a change to a factor's text the person entered.
// Last, the fact audit (js/facts.js) on every text the agent wrote. Code sends a failing answer back once
// with its problems; if the repair fails a guard again, the run stops at that step (js/pipeline.js), and
// if it fails only the audit, its texts show with an "Unchecked" tag.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea) js/guards.js: this method's refusals, and the
// audit on structured fields.
//
// Every function returns { problems, audit }: problems are { code, message } that stop the run if a repair
// keeps them; audit lists { path, tokens, unknown } of texts that write a figure the engine did not compute.

import { validate } from "./schema.js";
import { SCHEMAS, REQUESTS } from "./schemas.js";
import { DIMENSIONS } from "./engine.js";
import { expected } from "./risk.js";
import { SECTORS, kpisFor } from "../data/kpis.js";
import { auditText } from "./facts.js";

const MAX_TEXT = 90;
const MAX_PER_DIMENSION = 6;
const MIN_PER_DIMENSION = 2;
const MAX_ISSUES = 8;
const MAX_SIGNALS = 8;

/** The message of each refusal, in the words the agent reads. */
export const REFUSALS = Object.freeze({
  readiness_range: "a readiness level outside 1 to 5",
  readiness_opportunity: "a readiness level given for an opportunity",
  direction: "a factor without a direction",
  unknown_factor: "a correction that names a factor that does not exist",
  residual: "a residual risk above the original",
  monitor: "a monitor response without a signal and a trigger",
  dimension_full: "more than six factors in a dimension",
  user_text: "a change to a factor's text the person entered",
});

/** The lower-cased enum values the schema expects: capitalisation of enum values is not guaranteed. */
export function lowerEnums(value) {
  if (Array.isArray(value)) return value.map(lowerEnums);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && ["dimension", "direction", "horizon", "confidence", "kind", "type", "better"].includes(k)) out[k] = v.toLowerCase();
      else if (k === "dimensions" && Array.isArray(v)) out[k] = v.map((d) => (typeof d === "string" ? d.toLowerCase() : d));
      else out[k] = lowerEnums(v);
    }
    return out;
  }
  return value;
}

function collector() {
  const problems = [];
  const audit = [];
  const seen = new Set();
  return {
    problems, audit,
    refuse(code, detail) {
      const message = `${REFUSALS[code]}: ${detail}`;
      if (!seen.has(message)) { seen.add(message); problems.push({ code, message }); }
    },
    fail(code, message) {
      if (!seen.has(message)) { seen.add(message); problems.push({ code, message }); }
    },
    // The format's own errors, except where a refusal below says the same in plainer words.
    schema(value, format) {
      const errors = validate(value, format, SCHEMAS).errors.filter((e) => !COVERED.test(e.path || ""));
      for (const e of errors.slice(0, 8)) this.fail("schema", `the answer does not match its format at ${e.path || "the top"}: ${e.message}`);
    },
    text(path, value, ctx) {
      if (typeof value !== "string" || !value) return;
      const r = auditText(value, { facts: ctx.facts || [], evidence: ctx.evidence || {} });
      if (!r.pass) audit.push({ path, tokens: r.tokens, unknown: r.unknownFacts });
    },
  };
}

/** Fields the refusals check in code, so their format errors would only repeat them. */
const COVERED = /\.(direction|readiness)$/;
const list = (v) => (Array.isArray(v) ? v : []);
const done = (c) => ({ problems: c.problems, audit: c.audit });
const ok1to5 = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

/** A factor's ratings, as the Scanner and the Red team give them. */
function checkRatings(c, who, r, { needsDirection = true } = {}) {
  if (needsDirection && r.direction !== "threat" && r.direction !== "opportunity") c.refuse("direction", who);
  if (!ok1to5(r.likelihood)) c.fail("rating", `${who} has likelihood ${r.likelihood}; it is 1 to 5`);
  if (!ok1to5(r.impact)) c.fail("rating", `${who} has impact ${r.impact}; it is 1 to 5`);
  if (r.direction === "opportunity" && r.readiness !== null && r.readiness !== undefined) c.refuse("readiness_opportunity", who);
  if (r.direction === "threat" && !ok1to5(r.readiness)) c.refuse("readiness_range", `${who} has ${r.readiness}`);
}

/**
 * Names with digits a run may write although no source of the run says them first: chemistry, standards,
 * laws and networks a manager names by their digits. The audit lets these through as written; every other
 * number in an agent's text needs a source or a placeholder.
 */
export const NAMES_WITH_DIGITS = Object.freeze([
  "CO2", "CO₂", "H2", "PM2.5", "PM10", "4G", "5G", "6G", "Industry 4.0", "Scope 1", "Scope 2", "Scope 3",
  "COVID-19", "G7", "G20", "Euro 7", "Fit for 55", "Basel III", "IFRS 9", "IFRS 17", "NIS2", "Web3", "B2B", "B2C",
  "ISO 9001", "ISO 14001", "ISO 14064", "ISO 14083", "ISO 27001", "ISO 50001", "ESRS E1",
]);

/** What the audit may read as evidence in a live run: the person's words, the signals, the KPI names and the names above. */
export function liveEvidence({ inputs, signals = [], sector = null }) {
  return {
    titles: [...signals.map((s) => s.title), ...kpisFor(sector || inputs.company.sector).flatMap((k) => [k.name.en, k.name.de]), ...NAMES_WITH_DIGITS],
    texts: [inputs.company.name, inputs.company.what, inputs.company.country, ...inputs.factors.map((f) => f.text), ...signals.map((s) => s.summary)].filter(Boolean),
    quotes: [],
    urls: signals.map((s) => s.url),
  };
}

// ---- Scout ---------------------------------------------------------------------------------------------

/**
 * The Scout's signals. urls: the addresses this request's own search results gave; any other is refused
 * here and, earlier, as a tool error (js/pipeline.js).
 */
export function checkSignals(answer, { urls = new Set() } = {}) {
  const c = collector();
  const a = lowerEnums(answer);
  c.schema(a, REQUESTS.Signals);
  const signals = Array.isArray(a?.signals) ? a.signals : [];
  if (signals.length > MAX_SIGNALS) c.fail("count", `${signals.length} signals; at most ${MAX_SIGNALS}`);
  signals.forEach((s, i) => {
    if (s.url && !urls.has(s.url)) c.fail("url", `signal ${i + 1} gives ${s.url}, which no search result of this request gave`);
    if (s.published !== null && s.published !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(s.published)) c.fail("date", `signal ${i + 1} gives the date "${s.published}"; use YYYY-MM-DD or null`);
  });
  return done(c);
}

// ---- Scanner -------------------------------------------------------------------------------------------

/** The Scanner's answer against the person's factors: inputs { company, factors }. */
export function checkScan(answer, { inputs, signals = [], evidence }) {
  const c = collector();
  const a = lowerEnums(answer);
  c.schema(a, REQUESTS.Scan);
  if (!a || !Array.isArray(a.factors) || !Array.isArray(a.ratings)) return done(c);
  const team = inputs.factors;
  const teamIds = new Set(team.map((f) => f.id));
  const teamTexts = new Set(team.map((f) => f.text.trim().toLowerCase()));
  const signalUrls = new Set(signals.map((s) => s.url));
  const ids = new Set();
  const isItem = (x) => x && typeof x === "object" && !Array.isArray(x);
  for (const f of a.factors.filter(isItem)) {
    const who = `the new factor "${f.text}"`;
    if (teamIds.has(f.id)) c.refuse("user_text", `${who} takes the id ${f.id} of a factor the person entered`);
    else if (ids.has(f.id)) c.fail("id", `the id ${f.id} is used twice`);
    ids.add(f.id);
    if (teamTexts.has(String(f.text).trim().toLowerCase())) c.refuse("user_text", `${who} repeats a factor the person entered`);
    if ([...String(f.text)].length > MAX_TEXT) c.fail("text", `${who} has ${[...String(f.text)].length} characters; at most ${MAX_TEXT}`);
    if (!String(f.text).trim()) c.fail("text", `a new factor (${f.id}) has no text`);
    checkRatings(c, who, f);
    for (const u of list(f.evidence)) if (!signalUrls.has(u)) c.fail("evidence", `${who} cites ${u}, which is no signal of this run`);
  }
  const rated = new Map();
  for (const r of a.ratings.filter(isItem)) {
    if (!teamIds.has(r.factor)) { c.refuse("unknown_factor", `a rating names ${r.factor}, which is no factor the person entered`); continue; }
    if (rated.has(r.factor)) c.fail("rating", `the factor ${r.factor} is rated twice`);
    rated.set(r.factor, r);
    checkRatings(c, `the rating of the person's factor ${r.factor}`, r);
  }
  for (const f of team) if (!rated.has(f.id) && !f.rated) c.fail("rating", `the person's factor ${f.id} ("${f.text}") has no rating; rate it once in ratings`);
  for (const d of DIMENSIONS) {
    const n = team.filter((f) => f.dimension === d).length + a.factors.filter((f) => f?.dimension === d).length;
    if (n > MAX_PER_DIMENSION) c.refuse("dimension_full", `${d} holds ${n} factors`);
    if (n < MIN_PER_DIMENSION) c.fail("count", `${d} holds ${n} factor(s); complete it to at least ${MIN_PER_DIMENSION}`);
  }
  if (!inputs.company.sector) {
    if (!SECTORS.some((s) => s.id === a.sector)) c.fail("sector", `sector "${a.sector}" is not one of the ids given`);
  }
  a.factors.forEach((f, i) => { if (isItem(f)) { c.text(`factors[${i}].text`, f.text, { evidence }); c.text(`factors[${i}].basis`, f.basis, { evidence }); } });
  a.ratings.forEach((r, i) => { if (isItem(r)) c.text(`ratings[${i}].basis`, r.basis, { evidence }); });
  return done(c);
}

// ---- Red team ------------------------------------------------------------------------------------------

/** The Red team's issues against the factors after the scan (the person's removals and edits applied). */
export function checkIssues(answer, { factors, signals = [], evidence }) {
  const c = collector();
  const a = lowerEnums(answer);
  c.schema(a, REQUESTS.Issues);
  if (!a || !Array.isArray(a.issues)) return done(c);
  const byId = new Map(factors.map((f) => [f.id, f]));
  const userIds = new Set(factors.filter((f) => f.source === "user").map((f) => f.id));
  const signalUrls = new Set(signals.map((s) => s.url));
  if (a.issues.length > MAX_ISSUES) c.fail("count", `${a.issues.length} issues; at most ${MAX_ISSUES}`);
  const issueIds = new Set();
  const added = new Map();
  const counts = Object.fromEntries(DIMENSIONS.map((d) => [d, factors.filter((f) => f.dimension === d && !f.outdated).length]));
  a.issues.forEach((issue, n) => {
    if (!issue || typeof issue !== "object") return;
    const who = `issue "${issue.title}"`;
    if (issueIds.has(issue.id)) c.fail("id", `the issue id ${issue.id} is used twice`);
    issueIds.add(issue.id);
    for (const f of list(issue.factors)) if (!byId.has(f) && !added.has(f)) c.refuse("unknown_factor", `${who} names ${f}`);
    for (const u of list(issue.evidence)) if (!signalUrls.has(u)) c.fail("evidence", `${who} cites ${u}, which is no signal of this run`);
    const k = issue.correction && typeof issue.correction === "object" ? issue.correction : {};
    if (k.kind === "add_factor") {
      const nf = k.new_factor;
      if (!nf) { c.fail("correction", `${who} adds a factor but gives none`); return; }
      if (userIds.has(nf.id)) c.refuse("user_text", `${who} adds a factor with the id ${nf.id} of one the person entered`);
      else if (byId.has(nf.id) || added.has(nf.id)) c.fail("id", `${who} adds a factor with the id ${nf.id}, which is taken`);
      added.set(nf.id, nf);
      if ([...String(nf.text)].length > MAX_TEXT) c.fail("text", `${who} adds a factor of ${[...String(nf.text)].length} characters; at most ${MAX_TEXT}`);
      checkRatings(c, `the factor ${who} adds`, nf);
      counts[nf.dimension] = (counts[nf.dimension] || 0) + 1;
      if (counts[nf.dimension] > MAX_PER_DIMENSION) c.refuse("dimension_full", `${who} adds a factor to ${nf.dimension}, which then holds ${counts[nf.dimension]}`);
      for (const u of list(nf.evidence)) if (!signalUrls.has(u)) c.fail("evidence", `the factor ${who} adds cites ${u}, which is no signal of this run`);
      c.text(`issues[${n}].correction.new_factor.text`, nf.text, { evidence });
      c.text(`issues[${n}].correction.new_factor.basis`, nf.basis, { evidence });
    } else {
      const target = k.factor ? byId.get(k.factor) || added.get(k.factor) : null;
      if (!target) { c.refuse("unknown_factor", `${who} corrects ${k.factor ?? "no factor"}`); return; }
      if ((k.kind === "rerate" || k.kind === "rehorizon")) {
        if (!k.ratings) c.fail("correction", `${who} re-rates without ratings`);
        else checkRatings(c, `the new ratings of ${who}`, { ...k.ratings, direction: target.direction }, { needsDirection: false });
      }
      if (k.kind === "move") {
        if (!DIMENSIONS.includes(k.dimension)) c.fail("correction", `${who} moves the factor to "${k.dimension}"`);
        else if (k.dimension !== target.dimension) {
          counts[k.dimension] += 1;
          counts[target.dimension] -= 1;
          if (counts[k.dimension] > MAX_PER_DIMENSION) c.refuse("dimension_full", `${who} moves a factor to ${k.dimension}, which then holds ${counts[k.dimension]}`);
        }
      }
      if (k.kind === "mark_outdated" && !String(k.outdated_reason || "").trim()) c.fail("correction", `${who} marks a factor out of date without its reason`);
      if (k.kind === "link") {
        if (!k.link) c.fail("correction", `${who} links without saying what to what`);
        else for (const f of [k.link.from, k.link.to]) if (!byId.has(f) && !added.has(f)) c.refuse("unknown_factor", `${who} links ${f}`);
      }
      c.text(`issues[${n}].correction.outdated_reason`, k.outdated_reason, { evidence });
      c.text(`issues[${n}].correction.link.effect`, k.link?.effect, { evidence });
    }
    c.text(`issues[${n}].title`, issue.title, { evidence });
    c.text(`issues[${n}].reason`, issue.reason, { evidence });
  });
  return done(c);
}

// ---- Analyst -------------------------------------------------------------------------------------------

/** The Analyst's impacts against every factor after the challenge (out of date ones included). */
export function checkImpacts(answer, { factors, sector, evidence }) {
  const c = collector();
  const a = lowerEnums(answer);
  c.schema(a, REQUESTS.Impacts);
  if (!a || !Array.isArray(a.impacts)) return done(c);
  const byId = new Map(factors.map((f) => [f.id, f]));
  const kpiIds = new Set(kpisFor(sector).map((k) => k.id));
  const covered = new Set();
  a.impacts.forEach((imp, n) => {
    if (!imp || typeof imp !== "object") return;
    const f = byId.get(imp.factor);
    if (!f) { c.refuse("unknown_factor", `an impact names ${imp.factor}`); return; }
    if (covered.has(imp.factor)) c.fail("count", `the factor ${imp.factor} has two impacts; it has one`);
    covered.add(imp.factor);
    const who = `the impact of "${f.text}"`;
    if (f.direction === "threat") {
      const ranged = imp.eur_year_low !== null && imp.eur_year_high !== null;
      if (!ranged && !String(imp.not_monetisable || "").trim()) c.fail("range", `${who} gives neither a euro range nor the reason for none`);
      if (ranged && (imp.eur_year_low < 0 || imp.eur_year_low > imp.eur_year_high)) c.fail("range", `${who}: low ${imp.eur_year_low} is above high ${imp.eur_year_high} or below zero`);
      if (list(imp.kpis).length < 1 || list(imp.kpis).length > 3) c.fail("count", `${who} has ${list(imp.kpis).length} KPI effects; a threat has one to three`);
    } else if (!imp.upside) {
      c.fail("range", `${who} has no upside; an opportunity gives one`);
    }
    if (imp.upside && (imp.upside.eur_year_low < 0 || imp.upside.eur_year_low > imp.upside.eur_year_high)) c.fail("range", `${who}: the upside's low ${imp.upside.eur_year_low} is above its high ${imp.upside.eur_year_high} or below zero`);
    list(imp.kpis).forEach((k, j) => {
      if (!k || typeof k !== "object") return;
      if (k.change_low > k.change_high) c.fail("range", `${who}: the change of ${k.id} goes from ${k.change_low} down to ${k.change_high}`);
      if (!kpiIds.has(k.id) && !k.new_kpi) c.fail("kpi", `${who} names the KPI ${k.id}, which is not in the list; give new_kpi with its definition`);
      c.text(`impacts[${n}].kpis[${j}].basis`, k.basis, { evidence });
      if (k.new_kpi) { c.text(`impacts[${n}].kpis[${j}].new_kpi.name`, k.new_kpi.name, { evidence }); c.text(`impacts[${n}].kpis[${j}].new_kpi.definition`, k.new_kpi.definition, { evidence }); }
    });
    c.text(`impacts[${n}].basis`, imp.basis, { evidence });
    c.text(`impacts[${n}].not_monetisable`, imp.not_monetisable, { evidence });
  });
  for (const f of factors) if (!covered.has(f.id)) c.fail("count", `the factor ${f.id} ("${f.text}") has no impact; price every factor`);
  return done(c);
}

// ---- Strategist ----------------------------------------------------------------------------------------

/** The Strategist's responses against every factor after the challenge and their impacts. */
export function checkResponses(answer, { factors, impacts, evidence }) {
  const c = collector();
  const a = lowerEnums(answer);
  c.schema(a, REQUESTS.Responses);
  if (!a || !Array.isArray(a.responses)) return done(c);
  const byId = new Map(factors.map((f) => [f.id, f]));
  const impactOf = new Map((impacts || []).map((i) => [i.factor, i]));
  const ids = new Set();
  const per = new Map();
  a.responses.forEach((r, n) => {
    if (!r || typeof r !== "object") return;
    if (ids.has(r.id)) c.fail("id", `the response id ${r.id} is used twice`);
    ids.add(r.id);
    const f = byId.get(r.factor);
    if (!f) { c.refuse("unknown_factor", `the response "${r.title}" names ${r.factor}`); return; }
    per.set(r.factor, [...(per.get(r.factor) || []), r]);
    const who = `the response "${r.title}"`;
    if (f.direction === "opportunity" && r.kind === "mitigate") c.fail("kind", `${who} mitigates an opportunity; use it or watch it`);
    if (r.kind === "mitigate") {
      const m = r.mitigate;
      if (!m) c.fail("fields", `${who} mitigates without its figures`);
      else {
        const imp = impactOf.get(r.factor);
        if (!ok1to5(m.readiness)) c.refuse("readiness_range", `${who} reaches ${m.readiness}`);
        if (m.residual_likelihood > f.likelihood) c.refuse("residual", `${who} leaves likelihood ${m.residual_likelihood}, above the threat's ${f.likelihood}`);
        if (m.residual_eur_year_low < 0 || m.residual_eur_year_low > m.residual_eur_year_high) c.fail("range", `${who}: the residual low ${m.residual_eur_year_low} is above its high ${m.residual_eur_year_high} or below zero`);
        else if (imp && Number.isFinite(imp.eur_year_low) && Number.isFinite(imp.eur_year_high)) {
          if (m.residual_eur_year_high > imp.eur_year_high) c.refuse("residual", `${who} leaves up to ${m.residual_eur_year_high} a year, above the original ${imp.eur_year_high}`);
          else if (ok1to5(m.residual_likelihood) && ok1to5(f.likelihood) && expected(m.residual_eur_year_low, m.residual_eur_year_high, m.residual_likelihood) > expected(imp.eur_year_low, imp.eur_year_high, f.likelihood)) {
            c.refuse("residual", `${who} leaves more at stake a year than the threat's own range and likelihood`);
          }
        }
      }
    }
    if (r.kind === "advantage") {
      if (!r.advantage) c.fail("fields", `${who} is an advantage without its upside`);
      else if (r.advantage.eur_year_low < 0 || r.advantage.eur_year_low > r.advantage.eur_year_high) c.fail("range", `${who}: the upside's low ${r.advantage.eur_year_low} is above its high ${r.advantage.eur_year_high} or below zero`);
    }
    if (r.kind === "monitor" && !(String(r.monitor?.signal || "").trim() && String(r.monitor?.trigger || "").trim())) c.refuse("monitor", who);
    for (const [k, v] of [["title", r.title], ["first_step", r.first_step], ["owner", r.owner]]) c.text(`responses[${n}].${k}`, v, { evidence });
    if (r.monitor) for (const k of ["signal", "trigger", "where", "how_often"]) c.text(`responses[${n}].monitor.${k}`, r.monitor[k], { evidence });
  });
  // Every factor, those marked out of date too, so undoing a correction needs no other request.
  for (const f of factors) {
    const list = per.get(f.id) || [];
    if (!list.length) { c.fail("count", `the factor ${f.id} ("${f.text}") has no response`); continue; }
    if (list.length > 2) c.fail("count", `the factor ${f.id} has ${list.length} responses; one or two`);
    const rec = list.filter((r) => r.recommended).length;
    if (rec !== 1) c.fail("recommended", `the factor ${f.id} has ${rec} recommended responses; exactly one`);
  }
  return done(c);
}

// ---- Writer --------------------------------------------------------------------------------------------

/** The Writer's summary: its counts, then the audit with the engine's fact keys as the only figures. */
export function checkSummary(answer, { facts, evidence }) {
  const c = collector();
  c.schema(answer, REQUESTS.SummaryRequest);
  const s = answer?.summary;
  if (!s || typeof s !== "object" || !Array.isArray(s.findings) || !Array.isArray(s.assumptions)) return done(c);
  if (s.findings.length !== 3) c.fail("count", `${s.findings.length} findings; exactly three`);
  if (s.assumptions.length < 3 || s.assumptions.length > 5) c.fail("count", `${s.assumptions.length} assumptions; three to five`);
  const ctx = { facts, evidence };
  c.text("summary.headline", s.headline, ctx);
  c.text("summary.situation", s.situation, ctx);
  s.findings.forEach((t, i) => c.text(`summary.findings[${i}]`, t, ctx));
  c.text("summary.recommendation", s.recommendation, ctx);
  s.assumptions.forEach((t, i) => c.text(`summary.assumptions[${i}]`, t, ctx));
  return done(c);
}

/** The problems and audit findings of an answer, as the lines of the repair message. */
export function repairLines({ problems, audit }) {
  return [
    ...problems.map((p) => p.message),
    ...audit.map((a) => (a.unknown?.length
      ? `${a.path} cites unknown fact keys: ${a.unknown.join(", ")}; use only the keys given`
      : `${a.path} writes figures in its text (${a.tokens.join(", ")}); remove them, or put them in the numeric fields`)),
  ];
}
