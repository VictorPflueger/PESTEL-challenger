// Numbers, dates and money in the active language (en-GB or de-DE), for every screen and the report.
// Money comes from the shared js/risk.js (€6.5m, 6,5 Mio. €); this file adds the euro range, the KPI
// changes the Analyst estimates and the dates of sources. Computed values stay at full precision; only
// these functions round, for display.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): no shares or deltas, and money from risk.js.

import { locale, getLang, t } from "./i18n/index.js";
import { money as riskMoney, fixed } from "./risk.js";

const NBSP = " ";
const MINUS = "−";
const cache = new Map();
function nf(lang, opts) {
  const key = `${lang}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale(lang), opts));
  return cache.get(key);
}
const has = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

/** A whole number with the language's grouping: 1,122 or 1.122. */
export function fmtInt(value, lang = getLang()) {
  return has(value) ? nf(lang, { maximumFractionDigits: 0 }).format(Math.round(Number(value))) : "";
}

/** A euro amount in the active language: €6.5m, €750k, 6,5 Mio. €. */
export const money = (eur, lang = getLang()) => riskMoney(eur, lang);

/** A range of euros a year as the agents estimate it: "€1.2m to €2.5m", "1,2 Mio. € bis 2,5 Mio. €". */
export function moneyRange(low, high, lang = getLang()) {
  if (!has(low) || !has(high)) return "";
  if (low === high) return money(low, lang);
  return `${money(low, lang)} ${t("fmt.to", null, lang)} ${money(high, lang)}`;
}

/**
 * A number with up to one decimal, the sign written as a real minus: 2, −1.5, 0,8. Signs are left to
 * the caller, so a range reads "−2 to −4".
 */
function num(value, lang, sign = false) {
  const v = Number(value);
  const a = Math.abs(v);
  const text = Number.isInteger(a) ? fmtInt(a, lang) : fixed(a, 1, lang);
  if (!sign || v === 0) return v < 0 ? `${MINUS}${text}` : text;
  return `${v < 0 ? MINUS : "+"}${text}`;
}

/**
 * The change the Analyst expects in a KPI, signed and with its unit: "−2 to −4 %", "+1 to +3 days",
 * "−0.5 to −1.5 pp". The unit is the agent's ("%", "pp", "days", "€"); "%" and "pp" keep a no-break
 * space before them in both languages, as the page writes "55 %".
 */
export function fmtChange(low, high, unit, lang = getLang()) {
  if (!has(low) || !has(high)) return "";
  const u = String(unit ?? "").trim();
  const tail = !u ? "" : u === "€" ? `${NBSP}€` : `${NBSP}${u}`;
  if (u === "€") return low === high ? money(low, lang) : `${money(low, lang)} ${t("fmt.to", null, lang)} ${money(high, lang)}`;
  const a = num(low, lang, true);
  const b = num(high, lang, true);
  return low === high ? `${a}${tail}` : `${a} ${t("fmt.to", null, lang)} ${b}${tail}`;
}

/**
 * A date with the month written out: "19 November 2026" or "19. November 2026". A bare ISO date is read
 * as that day where the browser is, not as midnight UTC.
 */
export function fmtDate(iso, lang = getLang()) {
  const text = String(iso ?? "");
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale(lang), { day: "numeric", month: "long", year: "numeric" });
}

/** A month and year: "November 2026", "November 2026". */
export function fmtMonth(iso, lang = getLang()) {
  const text = String(iso ?? "");
  const d = new Date(/^\d{4}-\d{2}(-\d{2})?$/.test(text) ? `${text.slice(0, 7)}-15T12:00:00` : text);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale(lang), { month: "long", year: "numeric" });
}

/** Whole days between two ISO dates, b minus a. */
export function daysBetween(a, b) {
  const da = Date.UTC(...String(a).split("-").map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  const db = Date.UTC(...String(b).split("-").map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  return Math.round((db - da) / 86400000);
}

/** An amount in euros with cents for the cost meter: "€0.03", "0,03 €"; under a cent "< €0.01". */
export function fmtCost(eur, lang = getLang()) {
  if (!has(eur)) return "";
  const v = Number(eur);
  if (v > 0 && v < 0.005) return lang === "de" ? `<${NBSP}0,01${NBSP}€` : `<${NBSP}€0.01`;
  const text = nf(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  return lang === "de" ? `${text}${NBSP}€` : `€${text}`;
}
