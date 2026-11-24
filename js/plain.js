// Ids into words for every screen: dimensions, directions, horizons, bands, issue types, corrections,
// responses, KPIs and sectors, in the active language. The views and, from 0.4.0, the report call these;
// no screen shows an id.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/plain.js: this method's ids.

import { t, getLang } from "./i18n/index.js";
import { kpiById, SECTORS } from "../data/kpis.js";
import { moneyRange, fmtChange } from "./format.js";

const lng = (lang) => lang || getLang();

export const dimName = (d, lang) => t(`dim.${d}`, null, lng(lang));
export const dirName = (d, lang) => t(`dir.${d}`, null, lng(lang));
export const horizonName = (h, lang) => t(`h.${h}`, null, lng(lang));
/** A horizon inside a sentence: "now", "later", "1 to 3 years"; German nouns keep their capital. */
export const horizonInline = (h, lang) => horizonName(h, lang).replace(/^\p{Lu}(?=\p{Ll})/u, (c) => (lng(lang) === "de" && /Jahre/.test(horizonName(h, lang)) ? c : c.toLowerCase()));
export const horizonSpan = (h, lang) => t(`h.${h}.span`, null, lng(lang));
export const bandName = (b, lang) => t(`band.${b}`, null, lng(lang));
export const issueType = (type, lang) => t(`issue.${type}`, null, lng(lang));
export const kindName = (kind, lang) => t(`kind.${kind}`, null, lng(lang));
export const effortName = (e, lang) => t(`effort.${e}`, null, lng(lang));
export const timeName = (x, lang) => t(`time.${x}`, null, lng(lang));
export const confidenceName = (c, lang) => t(`conf.${c}`, null, lng(lang));

/** A sector's name, from the KPI library. */
export function sectorName(id, lang) {
  const s = SECTORS.find((x) => x.id === id);
  return s ? s.name[lng(lang) === "de" ? "de" : "en"] : id;
}

/** A KPI's name: the library's, or the one the Analyst defined. */
export function kpiName(effect, lang) {
  if (effect.new_kpi) return effect.new_kpi.name;
  const k = kpiById(effect.id);
  return k ? k.name[lng(lang) === "de" ? "de" : "en"] : effect.id;
}

/** A KPI effect in words: "Gross margin per megawatt hour −5 to −2 €/MWh". */
export function kpiEffect(effect, lang) {
  return `${kpiName(effect, lang)} ${fmtChange(effect.change_low, effect.change_high, effect.unit, lng(lang))}`;
}

/** The ratings of a factor in one line: "Threat · likelihood 4 · impact 4 · now · readiness 3 of 5". */
export function ratingLine(f, lang) {
  const l = lng(lang);
  const parts = [dirName(f.direction, l)];
  if (f.likelihood) parts.push(t("f.likelihood", { n: f.likelihood }, l));
  if (f.impact) parts.push(t("f.impact", { n: f.impact }, l));
  if (f.horizon) parts.push(horizonInline(f.horizon, l));
  if (f.direction === "threat" && f.readiness) parts.push(t("f.readiness", { n: f.readiness }, l));
  return parts.join(" · ");
}

/** What a correction changes, in words. */
export function correctionWords(issue, factorsById, lang) {
  const l = lng(lang);
  const c = issue.correction;
  const f = c.factor ? factorsById.get(c.factor) : null;
  const was = f?.was || {};
  switch (c.kind) {
    case "add_factor":
      return t("corr.add", { dim: dimName(c.new_factor.dimension, l), text: c.new_factor.text }, l);
    case "rerate":
    case "rehorizon": {
      const r = c.ratings || {};
      const out = [];
      const from = (k) => (was[k] ?? f?.[k]);
      if (r.likelihood !== undefined && from("likelihood") !== r.likelihood) out.push(t("corr.likelihood", { a: from("likelihood"), b: r.likelihood }, l));
      if (r.impact !== undefined && from("impact") !== r.impact) out.push(t("corr.impact", { a: from("impact"), b: r.impact }, l));
      if (r.horizon !== undefined && from("horizon") !== r.horizon) out.push(t("corr.horizon", { a: horizonInline(from("horizon"), l), b: horizonInline(r.horizon, l) }, l));
      if (r.readiness !== undefined && r.readiness !== null && from("readiness") !== r.readiness) out.push(t("corr.readiness", { a: from("readiness"), b: r.readiness }, l));
      return out.length ? out.join(", ") : t("corr.same", null, l);
    }
    case "move":
      return t("corr.move", { a: dimName(was.dimension ?? f?.dimension, l), b: dimName(c.dimension, l) }, l);
    case "mark_outdated":
      return t("corr.outdated", { reason: c.outdated_reason }, l);
    case "link":
      return t("corr.link", { effect: c.link.effect }, l);
    default:
      return "";
  }
}

/** A threat's euro range as the Analyst estimated it, or its reason for none. */
export function estimateWords(f, lang) {
  const i = f.impact_estimate;
  if (!i) return "";
  if (f.direction === "opportunity" && i.upside) return t("est.upside", { range: moneyRange(i.upside.eur_year_low, i.upside.eur_year_high, lng(lang)) }, lng(lang));
  if (i.not_monetisable) return t("est.none", { reason: i.not_monetisable }, lng(lang));
  return t("est.range", { range: moneyRange(i.eur_year_low, i.eur_year_high, lng(lang)) }, lng(lang));
}
