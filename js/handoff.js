// The handoff file (brief §4.3, schemas/strategy-challenge-1.json, the same file in all four tools): the run's
// result as JSON for the Prototype Ideator, which reads it without a model call. Code builds it from the
// run's state, as the report does, so both carry the engine's figures and the tiles' (AC-20). It is checked
// against the schema before it downloads (AC-21), and it carries no key, no prompt and no thinking.
//
// How a PESTEL run maps onto the shared shape: the six dimensions are the framework's areas and the factors
// their items; every force that still counts is an issue (a threat or an opportunity, numbered threats first
// by what they put at stake, as the risk matrix numbers them); every option the Strategist offered is a
// response, the chosen ones marked, with each watch response's signal and trigger as a watch entry in its
// changes; an accepted force gets an "accept" response once the person adopted. The horizons become the
// schema's now, 1_to_3_years and over_3_years, the readiness score is the score, named readiness.
// An opportunity's euro range is the Analyst's upside, so the issue carries the likelihood that goes with
// it, and its expected value is that range at that likelihood, as js/risk.js reads an issue. A threat
// without a euro figure has no residual range: it counts in readiness, not in money. With no threat the
// page says so where readiness would stand; the schema needs a number, and the file writes 100, since
// there is nothing to be unready for.

import { validate, describeErrors } from "./schema.js";
import { SCHEMAS } from "./schemas.js";
import * as R from "./run.js";
import { DIMENSIONS, priced } from "./engine.js";
import { band as bandOf, expected } from "./risk.js";
import { inLang, t } from "./i18n/index.js";
import { dimName, kpiName, kindName } from "./plain.js";
import { renderFacts } from "./facts.js";
import { numberedThreats } from "./matrix.js";
import { APP, modelById } from "./config.js";

const SCHEMA = SCHEMAS["strategy-challenge-1"];
const HORIZON = Object.freeze({ now: "now", "1_3_years": "1_to_3_years", later: "over_3_years" });
const round = (x) => Math.round(x * 1e9) / 1e9;

/** Short names people type that the region names don't hold. */
const ALIASES = Object.freeze({ usa: "US", "u s": "US", "u s a": "US", "united states of america": "US", uk: "GB", "u k": "GB", "great britain": "GB", england: "GB", scotland: "GB", wales: "GB", holland: "NL", "the netherlands": "NL", "vereinigte staaten": "US", "vereinigte staaten von amerika": "US", grossbritannien: "GB", "großbritannien": "GB" });

/** A country as its two-letter code: given as one, or named in English or German; "ZZ" when unknown. */
export function countryCode(text) {
  const s = String(text || "").trim();
  const want = s.toLocaleLowerCase("en").replace(/[^\p{L}]+/gu, " ").trim();
  if (ALIASES[want]) return ALIASES[want];
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  if (!want || typeof Intl.DisplayNames !== "function") return "ZZ";
  const names = ["en", "de"].map((l) => new Intl.DisplayNames([l], { type: "region", fallback: "none" }));
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      // Retired codes (DD, YU, …) name the country that replaced them: only a code that stays itself counts.
      try { if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue; } catch { continue; }
      for (const n of names) {
        const name = n.of(code);
        if (name && name.toLocaleLowerCase("en").replace(/[^\p{L}]+/gu, " ").trim() === want) return code;
      }
    }
  }
  return "ZZ";
}

/** A source in the schema's shape, or null when it has no date read. */
const sourceOf = (url, title, readOn) => (url && /^https?:\/\//.test(url) && readOn ? { url, title: title || url, read_on: readOn } : null);

/** The run's sources once each: its signals, then the facts the scenario's author checked. */
function allSources(run) {
  const seen = new Set();
  const out = [];
  const add = (s) => { if (s && !seen.has(s.url)) { seen.add(s.url); out.push(s); } };
  for (const s of run.signals || []) add(sourceOf(s.url, s.title, s.read_on));
  for (const list of Object.values(run.checked || {})) for (const s of list) add(sourceOf(s.url, `${s.publisher}: ${s.title}`, s.read_on));
  return out;
}

/**
 * The handoff file of a run: the object, ready for JSON.stringify. opts: lang (the run's or the page's
 * language, as the report speaks it) and now (the time it is made).
 */
export function handoffOf(run, { lang = "en", now = new Date() } = {}) {
  return inLang(lang, () => build(run, lang, now));
}

function build(run, lang, now) {
  const live = run.mode === "live";
  const factors = R.assessedFactors(run);
  const counted = factors.filter((f) => !f.outdated);
  const result = R.figures(run, { decided: false });
  const after = R.figures(run);
  const values = R.runFacts(run, lang);
  const fill = (s) => renderFacts(String(s ?? ""), values).replace(/\{\{fact:[^}]+\}\}/g, t("fig.none"));

  // Issues: the threats in the matrix's order, then the opportunities in the order of the dimensions.
  const threats = numberedThreats(run).map((x) => x.f);
  const opportunities = counted.filter((f) => f.direction === "opportunity").sort((a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension));
  const ordered = [...threats, ...opportunities];
  const issueId = new Map(ordered.map((f, i) => [f.id, `I${i + 1}`]));
  const issues = ordered.map((f) => {
    const est = f.impact_estimate || null;
    const fig = result.before.perFactor[f.id] || {};
    const opp = f.direction === "opportunity";
    const range = opp ? est?.upside || null : (Number.isFinite(f.eur_year_low) && Number.isFinite(f.eur_year_high) ? { eur_year_low: f.eur_year_low, eur_year_high: f.eur_year_high } : null);
    const likelihood = opp && est?.upside ? est.upside.likelihood : f.likelihood;
    const evidence = [
      ...(f.evidence || []).map((e) => sourceOf(e.url, e.title, e.read_on)),
      ...(run.checked?.[f.id] || []).map((s) => sourceOf(s.url, `${s.publisher}: ${s.title}`, s.read_on)),
    ].filter(Boolean);
    return {
      id: issueId.get(f.id),
      title: f.text,
      type: f.direction,
      description: [f.basis, est?.basis].filter(Boolean).join(" "),
      areas: [f.dimension],
      items: [f.id],
      impact: f.impact,
      likelihood,
      band: bandOf(f.impact, likelihood),
      horizon: HORIZON[f.horizon] || "now",
      kpis: (est?.kpis || []).filter((k) => /^[a-z_]+\.[a-z0-9_]+$/.test(k.id) && k.unit).map((k) => ({
        id: k.id, name: kpiName(k), unit: k.unit, direction: k.direction, change_low: k.change_low, change_high: k.change_high, basis: k.basis || "",
      })),
      eur_year_low: range ? range.eur_year_low : null,
      eur_year_high: range ? range.eur_year_high : null,
      eur_year_expected: opp ? (range ? round(expected(range.eur_year_low, range.eur_year_high, likelihood)) : null) : fig.expected ?? null,
      eur_basis: est ? (est.not_monetisable || est.basis || "") : "",
      evidence,
      confidence: est?.confidence || f.confidence || "medium",
    };
  });

  // Responses: every option offered, the chosen ones marked; an accepted force once the person adopted.
  const decisions = R.engineDecisions(run);
  const chosen = new Set(run.decided ? decisions.map((d) => d.response).filter(Boolean) : []);
  const byId = new Map(factors.map((f) => [f.id, f]));
  const responses = [];
  for (const r of run.responses || []) {
    if (!issueId.has(r.factor)) continue;
    const f = byId.get(r.factor);
    const residual = r.kind === "mitigate" && r.mitigate && priced(f) ? {
      impact: f.impact,
      likelihood: r.mitigate.residual_likelihood,
      band: bandOf(f.impact, r.mitigate.residual_likelihood),
      eur_year_low: r.mitigate.residual_eur_year_low,
      eur_year_high: r.mitigate.residual_eur_year_high,
      eur_year_expected: round(expected(r.mitigate.residual_eur_year_low, r.mitigate.residual_eur_year_high, r.mitigate.residual_likelihood)),
    } : null;
    const upside = r.kind === "advantage" && r.advantage ? {
      likelihood: r.advantage.likelihood,
      eur_year_low: r.advantage.eur_year_low,
      eur_year_high: r.advantage.eur_year_high,
      eur_year_expected: round(expected(r.advantage.eur_year_low, r.advantage.eur_year_high, r.advantage.likelihood)),
    } : null;
    responses.push({
      id: "",
      issue: issueId.get(r.factor),
      kind: r.kind,
      chosen: chosen.has(r.id),
      title: r.title,
      first_step: r.first_step,
      owner: r.owner,
      changes: r.kind === "monitor" && r.monitor ? [{ action: "watch", item: r.factor, signal: r.monitor.signal, trigger: r.monitor.trigger }] : [],
      residual,
      upside,
      effort: r.effort,
      time_to_impact: r.time_to_impact,
    });
  }
  if (run.decided) {
    for (const d of decisions) {
      if (d.kind !== "accept" || !issueId.has(d.factor)) continue;
      responses.push({ id: "", issue: issueId.get(d.factor), kind: "accept", chosen: true, title: kindName("accept"), first_step: "", owner: "", changes: [], residual: null, upside: null, effort: "S", time_to_impact: "" });
    }
  }
  const order = (x) => Number(x.issue.slice(1));
  responses.sort((a, b) => order(a) - order(b));
  responses.forEach((x, i) => { x.id = `R${i + 1}`; });

  const s = run.summary;
  const text = s ? [fill(s.situation), ...s.findings.map(fill), fill(s.recommendation), ...s.assumptions.map(fill)].join("\n\n") : "";
  return {
    schema: "strategy-challenge/1",
    tool: { id: "pestel-challenger", name: APP.name, version: APP.version, url: APP.url },
    created: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    language: lang,
    mode: live ? "live" : "simulation",
    model: live ? (modelById(run.setting?.model)?.id || run.setting?.model || null) : null,
    company: {
      name: run.company.name,
      sector: /^[a-z_]+$/.test(run.company.sector || "") ? run.company.sector : "general",
      country: countryCode(run.company.country),
      description: run.company.what || "",
      fictional: !live,
    },
    framework: {
      type: "pestel",
      areas: DIMENSIONS.map((d) => ({
        id: d,
        label: dimName(d),
        items: counted.filter((f) => f.dimension === d).map((f) => {
          const item = { id: f.id, text: f.text, source: f.origin === "team" ? "user" : "ai" };
          if (item.source === "ai" && f.confidence) item.confidence = f.confidence;
          if (item.source === "ai" && f.basis) item.basis = f.basis;
          return item;
        }),
      })),
    },
    issues,
    responses,
    figures: {
      at_stake_eur_year: result.before.atStake,
      left_eur_year: run.decided ? after.after.atStake : result.before.atStake,
      upside_eur_year: run.decided ? after.upside : 0,
      score: { name: "readiness", scale: "0-100", before: result.before.readiness ?? 100, after: (run.decided ? after.after.readiness : result.before.readiness) ?? 100 },
      pressure: { label: t("kpi.pressure"), before: result.before.pressure.length, after: (run.decided ? after.after.pressure : result.before.pressure).length, of: DIMENSIONS.length },
    },
    summary: { headline: s ? fill(s.headline) : t("report.title", { company: run.company.name }), text },
    sources: allSources(run),
    disclaimer: t("handoff.disclaimer"),
  };
}

/** The file against the shared schema, and what a schema can't say: unique ids, responses that name an issue. */
export function handoffProblems(json) {
  const v = validate(json, SCHEMA, SCHEMA.$defs);
  const problems = v.valid ? [] : describeErrors(v.errors).split("\n");
  const ids = (json.issues || []).map((i) => i.id);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (twice.length) problems.push(`issue ids appear twice: ${[...new Set(twice)].join(", ")}`);
  for (const r of json.responses || []) if (!ids.includes(r.issue)) problems.push(`response ${r.id} names issue ${r.issue}, which the file doesn't have`);
  return problems;
}

/** Whether a run can hand off: the Analyst has priced the forces, so the file carries figures. */
export const canHandOff = (run) => !!run && !!run.impacts;
