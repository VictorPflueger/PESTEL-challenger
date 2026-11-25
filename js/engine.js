// The engine: every figure the page, the report and the handoff file show, computed from the factors the
// person kept and the responses they chose (brief §6.5). The agents rate and estimate in structured
// fields; they never write a figure the page shows as fact. Readiness is this tool's own measure, not
// part of PESTEL, and the method dialog says so.
//
//   risk          impact × likelihood, in the bands of the shared js/risk.js
//   gap           (5 − readiness level) / 4: 1 for unprepared, 0 for ready
//   readiness     100 × (1 − Σ risk × gap ÷ Σ risk), over the threats not out of date
//   under pressure  a dimension holding a threat of medium band or higher with readiness 3 or lower
//   at stake      Σ midpoint × probability over the threats not out of date that have a euro range
//
// After the decision a mitigated threat counts with its new readiness level, its residual range and its
// residual likelihood; its impact stays the original, since the Strategist estimates none. A threat without
// a euro figure stays without one: it counts in readiness, not in money, whatever residual range the
// Strategist gives. An advantage adds its upside to the note; a watched or accepted threat stays as it is.

import { BANDS, riskScore, band, expected, round9, roundHalfAway, money } from "./risk.js";
import { t } from "./i18n/index.js";

/** Whether a band is the given one or higher (low < medium < high < critical). */
const bandIndex = (id) => BANDS.findIndex((b) => b.id === id);
export const bandAtLeast = (id, floor) => bandIndex(id) >= bandIndex(floor);

/** The six PESTEL dimensions, in the order of the acronym. */
export const DIMENSIONS = Object.freeze(["political", "economic", "social", "technological", "environmental", "legal"]);

/** The gap of a readiness level: 1 for unprepared (1) to 0 for ready (5). */
export function gap(readiness) {
  if (!Number.isInteger(readiness) || readiness < 1 || readiness > 5) {
    throw new RangeError(`a readiness level is a whole number from 1 to 5, not ${JSON.stringify(readiness)}`);
  }
  return (5 - readiness) / 4;
}

const isThreat = (f) => f.direction === "threat";
const counts = (f) => !f.outdated;
/** Whether a factor has a euro range: a threat without one counts in readiness, not in money. */
export const priced = (f) => !f.not_monetisable && Number.isFinite(f.eur_year_low) && Number.isFinite(f.eur_year_high);

/**
 * The figures of one state of the analysis. Each factor: { id, dimension, direction ("threat" or
 * "opportunity"), impact, likelihood, readiness (threats), eur_year_low, eur_year_high, not_monetisable,
 * outdated, source }.
 */
export function assess(factors) {
  const perFactor = {};
  const dims = Object.fromEntries(DIMENSIONS.map((d) => [d, { threats: 0, pressing: 0 }]));
  let sumRisk = 0;
  let sumRiskGap = 0;
  let atStake = 0;
  let threats = 0;
  let monetised = 0;
  for (const f of factors) {
    if (!DIMENSIONS.includes(f.dimension)) throw new RangeError(`factor ${f.id} names no PESTEL dimension: ${f.dimension}`);
    const risk = riskScore(f.impact, f.likelihood);
    const entry = { risk, band: band(f.impact, f.likelihood), expected: null, counted: counts(f) };
    if (isThreat(f)) {
      entry.gap = gap(f.readiness);
      if (counts(f)) {
        threats++;
        sumRisk += risk;
        sumRiskGap += risk * entry.gap;
        dims[f.dimension].threats++;
        if (bandAtLeast(entry.band, "medium") && f.readiness <= 3) dims[f.dimension].pressing++;
      }
    }
    if (priced(f)) {
      entry.expected = round9(expected(f.eur_year_low, f.eur_year_high, f.likelihood));
      if (isThreat(f) && counts(f)) {
        atStake += entry.expected;
        monetised++;
      }
    }
    perFactor[f.id] = entry;
  }
  const state = (d) => (dims[d].pressing ? "pressure" : dims[d].threats ? "watch" : "clear");
  const dimensions = Object.fromEntries(DIMENSIONS.map((d) => [d, { ...dims[d], state: state(d) }]));
  return {
    perFactor,
    sumRisk: round9(sumRisk),
    sumRiskGap: round9(sumRiskGap),
    readiness: sumRisk ? round9(100 * (1 - sumRiskGap / sumRisk)) : null,
    dimensions,
    pressure: DIMENSIONS.filter((d) => dimensions[d].state === "pressure"),
    atStake: round9(atStake),
    threats,
    monetised,
  };
}

/** The factors as they stand after the decisions: each mitigated threat with its residual. */
export function applyDecisions(factors, decisions = []) {
  const chosen = new Map(decisions.map((d) => [d.factor, d]));
  return factors.map((f) => {
    const d = chosen.get(f.id);
    if (!d || d.kind !== "mitigate" || !isThreat(f)) return { ...f };
    const r = d.residual || {};
    const money = priced(f);
    return {
      ...f,
      readiness: d.readiness,
      likelihood: r.likelihood,
      eur_year_low: money ? r.eur_year_low : f.eur_year_low,
      eur_year_high: money ? r.eur_year_high : f.eur_year_high,
    };
  });
}

/**
 * Before and after the decisions, the advantages' upside and the watch list. Each decision: { factor,
 * kind: "mitigate" | "advantage" | "monitor" | "accept", readiness and residual (mitigate), upside
 * { eur_year_low, eur_year_high, likelihood } (advantage) }.
 */
export function run(factors, decisions = []) {
  const before = assess(factors);
  const after = assess(applyDecisions(factors, decisions));
  const live = new Set(factors.filter(counts).map((f) => f.id));
  let upside = 0;
  for (const d of decisions) {
    if (d.kind === "advantage" && d.upside && live.has(d.factor)) {
      upside += expected(d.upside.eur_year_low, d.upside.eur_year_high, d.upside.likelihood);
    }
  }
  const kept = factors.filter(counts);
  return {
    before,
    after,
    upside: round9(upside),
    watch: decisions.filter((d) => d.kind === "monitor" && live.has(d.factor)).map((d) => d.factor),
    factorsCount: kept.length,
    factorsAdded: kept.filter((f) => f.source === "ai").length,
  };
}

/** A readiness score as the tiles show it: a whole number, half away from zero, or no score. */
export function readinessText(value, lang = "en") {
  return value === null ? t("fig.noThreats", null, lang) : String(roundHalfAway(value, 0));
}

/** The money at stake as a tile shows it, saying so when only part of the threats has a euro range. */
export function moneyText(result, lang = "en") {
  const text = money(result.atStake, lang);
  return result.monetised < result.threats ? t("fig.moneyPart", { money: text, n: result.monetised, total: result.threats }, lang) : text;
}

/**
 * The fact keys of brief §6.5 with their display text in one language: the only figures the Writer's
 * placeholders may name.
 */
export function facts(r, lang = "en") {
  const out = {
    at_stake: moneyText(r.before, lang),
    left: moneyText(r.after, lang),
    upside: money(r.upside, lang),
    "readiness.before": readinessText(r.before.readiness, lang),
    "readiness.after": readinessText(r.after.readiness, lang),
    "pressure.before": t("fig.pressure", { n: r.before.pressure.length }, lang),
    "pressure.after": t("fig.pressure", { n: r.after.pressure.length }, lang),
    "factors.count": String(r.factorsCount),
    "factors.added": String(r.factorsAdded),
    "watch.count": String(r.watch.length),
  };
  for (const [id, f] of Object.entries(r.before.perFactor)) if (f.expected !== null) out[`factor.${id}.expected`] = money(f.expected, lang);
  return out;
}
