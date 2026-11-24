// The run, step by step: what the team entered, what each agent answered and what the person decided.
// The simulation fills it with a scenario's recorded answers (js/simulation.js), a live run (0.3.0) with the
// agents' answers as they arrive; both read the factors and figures from here, so a scenario tests the
// live path. Every function is pure: it reads the run and returns new objects, so a step can be shown
// again after the person goes back, and the checker can play a run without a page.
//
//   start      the team's factors, as entered
//   scan       the team's factors with their ratings, and the factors the Scanner added (source "ai")
//   challenge  each correction of the Red team applied, unless the person undid it
//   assess     each factor with the Analyst's euro range or its reason for none
//   respond    the person's choice per factor: a response or accept; the engine figures before and after
//   summary    the Writer's text with the engine's figures in place of its placeholders
//
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/run_model.js: the steps of this method, and plain
// functions in place of its event reducer.

import { DIMENSIONS, run as engineRun, facts as engineFacts } from "./engine.js";

export const STEPS = Object.freeze(["start", "scan", "challenge", "assess", "respond", "summary"]);

/** A factor in the shape of schemas/factor.json, plus what the views need to tell its story. */
function factorOf(f, extra = {}) {
  return {
    id: f.id,
    dimension: f.dimension,
    text: f.text,
    direction: f.direction ?? null,
    likelihood: f.likelihood ?? null,
    impact: f.impact ?? null,
    horizon: f.horizon ?? null,
    readiness: f.direction === "opportunity" ? null : f.readiness ?? null,
    source: f.source,
    confidence: f.confidence ?? null,
    basis: f.basis ?? null,
    evidence: f.evidence ?? [],
    outdated: false,
    outdated_reason: null,
    eur_year_low: null,
    eur_year_high: null,
    not_monetisable: null,
    // For the views: where the factor came from (team, scan or challenge), which issues changed it and
    // how it read before, the links the challenge found, the Analyst's estimate.
    origin: extra.origin ?? (f.source === "user" ? "team" : "scan"),
    issues: [],
    was: null,
    links: [],
    impact_estimate: null,
  };
}

/** The signals by their address, so a factor's evidence shows the signal's title and date. */
function signalIndex(run) {
  return new Map((run.signals || []).map((s) => [s.url, s]));
}

/** A factor's evidence as sources: each URL a signal gave, with its title, date published and date read. */
function sourcesOf(urls, run) {
  const index = signalIndex(run);
  return (urls || []).map((url) => {
    const s = index.get(url);
    return s ? { url, title: s.title, published: s.published, read_on: s.read_on } : { url, title: url, published: null, read_on: null };
  });
}

/** The team's factors as entered, before any agent: text and dimension, ratings where the team gave them. */
export function teamFactors(run) {
  return (run.team || []).map((t) => factorOf({ id: t.id, dimension: t.dimension, text: t.text, source: "user", ...(t.rated || {}) }, { origin: "team" }));
}

/** The factors after the Scanner: the team's with their ratings (the team's own, else the Scanner's), then the AI's. */
export function scannedFactors(run) {
  if (!run.scan) return teamFactors(run);
  const ratings = new Map((run.scan.ratings || []).map((r) => [r.factor, r]));
  const team = (run.team || []).map((t) => {
    const r = t.rated || ratings.get(t.id) || {};
    const f = factorOf({ id: t.id, dimension: t.dimension, text: t.text, source: "user", ...r }, { origin: "team" });
    if (!t.rated && ratings.has(t.id)) f.rated_by = "ai";
    return f;
  });
  const ai = (run.scan.factors || []).map((f) => ({ ...factorOf({ ...f, source: "ai" }, { origin: "scan" }), evidence: sourcesOf(f.evidence, run) }));
  return [...team, ...ai].filter((f) => !run.removed?.has(f.id));
}

const RATING_KEYS = ["likelihood", "impact", "horizon", "readiness"];

/**
 * The factors after the challenge: the Red team's corrections in their order, each unless the person
 * undid it. Every changed factor keeps how it read before (was) and the issues that changed it.
 */
export function challengedFactors(run) {
  const factors = scannedFactors(run).map((f) => ({ ...f, issues: [...f.issues], links: [...f.links] }));
  const byId = new Map(factors.map((f) => [f.id, f]));
  for (const issue of run.issues || []) {
    if (run.undone?.has(issue.id)) continue;
    const c = issue.correction;
    const target = c.factor ? byId.get(c.factor) : null;
    if (c.kind === "add_factor" && c.new_factor) {
      if (byId.has(c.new_factor.id)) continue;
      const added = { ...factorOf({ ...c.new_factor, source: "ai" }, { origin: "challenge" }), evidence: sourcesOf(c.new_factor.evidence, run), issues: [issue.id] };
      factors.push(added);
      byId.set(added.id, added);
      continue;
    }
    if (!target) continue;
    target.issues.push(issue.id);
    if ((c.kind === "rerate" || c.kind === "rehorizon") && c.ratings) {
      target.was = target.was || Object.fromEntries(RATING_KEYS.map((k) => [k, target[k]]));
      for (const k of RATING_KEYS) if (c.ratings[k] !== undefined) target[k] = target.direction === "opportunity" && k === "readiness" ? null : c.ratings[k];
    } else if (c.kind === "move" && c.dimension && DIMENSIONS.includes(c.dimension)) {
      target.was = target.was || { dimension: target.dimension };
      target.was.dimension = target.was.dimension ?? target.dimension;
      target.dimension = c.dimension;
    } else if (c.kind === "mark_outdated") {
      target.outdated = true;
      target.outdated_reason = c.outdated_reason;
    } else if (c.kind === "link" && c.link) {
      const other = byId.get(c.link.to === target.id ? c.link.from : c.link.to);
      target.links.push({ issue: issue.id, from: c.link.from, to: c.link.to, effect: c.link.effect });
      if (other && other !== target) {
        other.issues.push(issue.id);
        other.links.push({ issue: issue.id, from: c.link.from, to: c.link.to, effect: c.link.effect });
      }
    }
  }
  return factors;
}

/** The factors with the Analyst's estimates: a euro range a year, or the reason there is none. */
export function assessedFactors(run) {
  const impacts = new Map((run.impacts || []).map((i) => [i.factor, i]));
  return challengedFactors(run).map((f) => {
    const i = impacts.get(f.id);
    if (!i) return f;
    return {
      ...f,
      eur_year_low: f.direction === "threat" ? i.eur_year_low : null,
      eur_year_high: f.direction === "threat" ? i.eur_year_high : null,
      not_monetisable: f.direction === "threat" ? i.not_monetisable : null,
      impact_estimate: i,
    };
  });
}

/** The factors as the step shows them. */
export function factorsAt(run, step) {
  const n = typeof step === "number" ? step : STEPS.indexOf(step);
  if (n <= 0) return teamFactors(run);
  if (n === 1) return scannedFactors(run);
  if (n === 2) return challengedFactors(run);
  return assessedFactors(run);
}

/** The responses the Strategist proposed for a factor, the recommended one first. */
export function optionsFor(run, factorId) {
  return (run.responses || []).filter((r) => r.factor === factorId).sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

/** The factors the person decides on: every threat and opportunity that counts, under pressure first. */
export function decisionFactors(run) {
  const factors = assessedFactors(run).filter((f) => !f.outdated);
  const result = engineRun(factors, []);
  const pressing = (f) => f.direction === "threat" && result.before.pressure.includes(f.dimension) && result.before.perFactor[f.id]
    && ["medium", "high", "critical"].includes(result.before.perFactor[f.id].band) && f.readiness <= 3;
  const weight = (f) => (pressing(f) ? 0 : f.direction === "threat" ? 1 : 2);
  const order = (f) => DIMENSIONS.indexOf(f.dimension);
  return factors
    .map((f, i) => ({ f, i }))
    .sort((a, b) => weight(a.f) - weight(b.f) || (result.before.perFactor[b.f.id]?.risk ?? 0) - (result.before.perFactor[a.f.id]?.risk ?? 0) || order(a.f) - order(b.f) || a.i - b.i)
    .map(({ f }) => ({ ...f, pressing: pressing(f) }));
}

/** The recommended choice for every factor the person decides on: the default the page preselects. */
export function recommendedChoices(run) {
  const out = new Map();
  for (const f of decisionFactors(run)) {
    const rec = optionsFor(run, f.id).find((r) => r.recommended);
    out.set(f.id, rec ? rec.id : "accept");
  }
  return out;
}

/** The person's choice for a factor, the recommended one until they change it. */
export function choiceFor(run, factorId) {
  return run.choices?.get(factorId) ?? recommendedChoices(run).get(factorId) ?? "accept";
}

/** The engine's decisions from the choices: each response with the fields the engine reads, or accept. */
export function engineDecisions(run) {
  const responses = new Map((run.responses || []).map((r) => [r.id, r]));
  return decisionFactors(run).map((f) => {
    const id = choiceFor(run, f.id);
    const r = responses.get(id);
    if (!r || r.factor !== f.id) return { factor: f.id, kind: "accept", response: null };
    if (r.kind === "mitigate" && r.mitigate) {
      return {
        factor: f.id, kind: "mitigate", response: r.id, readiness: r.mitigate.readiness,
        residual: { likelihood: r.mitigate.residual_likelihood, eur_year_low: r.mitigate.residual_eur_year_low, eur_year_high: r.mitigate.residual_eur_year_high },
      };
    }
    if (r.kind === "advantage" && r.advantage) return { factor: f.id, kind: "advantage", response: r.id, upside: { ...r.advantage } };
    return { factor: f.id, kind: r.kind, response: r.id };
  });
}

/**
 * The engine's figures for the run as it stands: before any decision, and after the person's choices
 * once they adopted them (or as a preview while they choose).
 */
export function figures(run, { decided = run.decided, preview = false } = {}) {
  const factors = assessedFactors(run);
  return engineRun(factors, decided || preview ? engineDecisions(run) : []);
}

/** The fact keys of the run in a language: what the Writer's placeholders may name. */
export function runFacts(run, lang, opts) {
  return engineFacts(figures(run, opts), lang);
}

/**
 * Each dimension's state at a step, as the ring shows it: pressure, watch or nothing, and after the
 * decision "addressed" for a dimension that was under pressure and is no longer. Counts the factors that
 * still count.
 */
export function dimensionStates(run, step) {
  const n = typeof step === "number" ? step : STEPS.indexOf(step);
  const factors = factorsAt(run, n);
  const counted = factors.filter((f) => !f.outdated);
  const rated = n >= 1 && counted.every((f) => f.direction && f.likelihood && f.impact && (f.direction === "opportunity" || f.readiness));
  const result = rated && counted.length ? engineRun(counted, n >= 5 && run.decided ? engineDecisions(run) : []) : null;
  return Object.fromEntries(DIMENSIONS.map((d) => {
    const count = counted.filter((f) => f.dimension === d).length;
    let status = null;
    if (result) {
      const before = result.before.dimensions[d].state;
      const after = result.after.dimensions[d].state;
      const now = n >= 5 && run.decided ? after : before;
      status = now === "pressure" ? "pressure" : n >= 5 && run.decided && before === "pressure" ? "addressed" : now === "watch" ? "watch" : null;
    }
    return [d, { count, status, threats: result ? result.before.dimensions[d].threats : 0 }];
  }));
}

/** The watch list: a row for every chosen monitor response, built by code (brief §6.6). */
export function watchList(run) {
  const responses = new Map((run.responses || []).map((r) => [r.id, r]));
  return engineDecisions(run)
    .filter((d) => d.kind === "monitor")
    .map((d) => {
      const r = responses.get(d.response);
      return { factor: d.factor, response: r.id, ...r.monitor };
    });
}
