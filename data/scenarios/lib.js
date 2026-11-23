// Helpers for writing a scenario by hand: every text in both languages, and the agents' answers in the
// shapes their schemas define (schemas/requests/*.json), with null where a field does not apply. The
// checker (tools/check-scenarios.mjs) validates the result in each language, so a helper can only save
// typing, never bend the format.

/** A text in English and German. */
export const L = (en, de) => ({ en, de });

/** A correction of the Red team, with every field its schema requires. */
export function correction(kind, { factor = null, new_factor = null, ratings = null, dimension = null, outdated_reason = null, link = null } = {}) {
  return { kind, factor, new_factor, ratings, dimension, outdated_reason, link };
}

/** A KPI effect from the library (new_kpi null) or a new KPI the Analyst defines. */
export function kpi(id, change_low, change_high, unit, direction, basis, new_kpi = null) {
  return { id, new_kpi, change_low, change_high, unit, direction, basis };
}

/** An impact on a threat: a euro range a year, or a reason there is none. */
export function threatImpact(factor, kpis, [low, high] = [null, null], basis, confidence, not_monetisable = null) {
  return { factor, kpis, eur_year_low: low, eur_year_high: high, not_monetisable, upside: null, basis, confidence };
}

/** An impact on an opportunity: its upside a year and how likely it comes. */
export function opportunityImpact(factor, kpis, [low, high, likelihood], basis, confidence) {
  return { factor, kpis, eur_year_low: null, eur_year_high: null, not_monetisable: null, upside: { eur_year_low: low, eur_year_high: high, likelihood }, basis, confidence };
}

const base = (id, factor, kind, title, first_step, owner, effort, time_to_impact, recommended) =>
  ({ id, factor, kind, title, first_step, owner, effort, time_to_impact, recommended, mitigate: null, advantage: null, monitor: null });

/** Mitigate: the new readiness level and what is left of the threat. */
export function mitigate(id, factor, { title, first_step, owner, effort, time, recommended = false }, [readiness, residual_likelihood, low, high]) {
  return { ...base(id, factor, "mitigate", title, first_step, owner, effort, time, recommended), mitigate: { readiness, residual_likelihood, residual_eur_year_low: low, residual_eur_year_high: high } };
}

/** Turn into an advantage: the upside a year and how likely it comes. */
export function advantage(id, factor, { title, first_step, owner, effort, time, recommended = false }, [low, high, likelihood]) {
  return { ...base(id, factor, "advantage", title, first_step, owner, effort, time, recommended), advantage: { eur_year_low: low, eur_year_high: high, likelihood } };
}

/** Watch it: the signal, the trigger, where to look and how often. */
export function monitor(id, factor, { title, first_step, owner, effort, time, recommended = false }, { signal, trigger, where, how_often }) {
  return { ...base(id, factor, "monitor", title, first_step, owner, effort, time, recommended), monitor: { signal, trigger, where, how_often } };
}

/** A recorded choice: the person chose this response for the factor, or accept. */
export const chose = (factor, choice, at) => ({ factor, choice, at, by: "you" });
