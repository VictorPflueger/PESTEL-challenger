// Risk bands, likelihood as a probability, expected value and money formats: the part of the method the
// three challengers share, identical in all of them (brief §4.1); the Prototype Ideator imports the money
// formats. Values stay at full precision. Display rounds once: first to 1e-9, then half away from zero,
// on the exact decimal digits, so 6,450,000 shows as €6.5m and never as €6.4m (brief §6.5).

/** Risk = impact × likelihood, from 1 to 25, in four bands (brief §6.5). */
export const BANDS = Object.freeze([
  Object.freeze({ id: "low", min: 1, max: 4 }),
  Object.freeze({ id: "medium", min: 5, max: 9 }),
  Object.freeze({ id: "high", min: 10, max: 15 }),
  Object.freeze({ id: "critical", min: 16, max: 25 }),
]);
const ORDER = BANDS.map((b) => b.id);

/** Likelihood 1 (rare) to 5 (almost certain) within the horizon, as a probability (brief §6.3). */
export const PROBABILITY = Object.freeze({ 1: 0.1, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9 });

/** Whether n is a level of a 1-to-5 scale. */
export function isLevel(n) {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

function level(n, what) {
  if (!isLevel(n)) throw new RangeError(`${what} is a whole number from 1 to 5, not ${JSON.stringify(n)}`);
  return n;
}

/** Impact × likelihood. */
export function riskScore(impact, likelihood) {
  return level(impact, "impact") * level(likelihood, "likelihood");
}

/** The band of a risk score: low, medium, high or critical. */
export function band(score) {
  const b = BANDS.find((x) => score >= x.min && score <= x.max);
  if (!b) throw new RangeError(`a risk score runs from 1 to 25, not ${JSON.stringify(score)}`);
  return b.id;
}

/** Whether band a is at least band b ("high" is at least "medium"). */
export function bandAtLeast(a, b) {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) && ORDER.includes(a) && ORDER.includes(b);
}

/** The probability of a likelihood level. */
export function probability(likelihood) {
  return PROBABILITY[level(likelihood, "likelihood")];
}

/** Rounds to 1e-9, the precision every figure keeps before display. */
export function round9(x) {
  return Number.isFinite(x) ? Number(x.toFixed(9)) || 0 : x;
}

/** The expected euros a year of a range at a likelihood: the midpoint times the probability. */
export function expectedValue(low, high, likelihood) {
  if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) {
    throw new RangeError(`a euro range runs from low to high, both 0 or more: ${low} to ${high}`);
  }
  return round9(((low + high) / 2) * probability(likelihood));
}

/**
 * x rounded to `decimals` places (negative: to tens, hundreds…), half away from zero, on the exact
 * decimal digits of x rounded to 1e-9. roundHalfAway(4345000, -5) is 4300000; roundHalfAway(64.5, 0) is 65.
 */
export function roundHalfAway(x, decimals = 0) {
  if (!Number.isFinite(x)) return x;
  if (!Number.isInteger(decimals) || decimals > 9) throw new RangeError("decimals is a whole number up to 9");
  const [whole, frac] = Math.abs(x).toFixed(9).split(".");
  const scaled = BigInt(whole + frac); // |x| × 1e9, exact
  const unit = 10n ** BigInt(9 - decimals);
  let q = scaled / unit;
  if ((scaled % unit) * 2n >= unit) q += 1n;
  if (q === 0n) return 0;
  const magnitude = decimals > 0 ? Number(q) / 10 ** decimals : Number(q) * 10 ** -decimals;
  return x < 0 ? -magnitude : magnitude;
}

const LOCALES = { en: "en-GB", de: "de-DE" };
const numberFormats = new Map();
function number(value, decimals, lang) {
  const key = `${lang}|${decimals}`;
  if (!numberFormats.has(key)) {
    numberFormats.set(key, new Intl.NumberFormat(LOCALES[lang] || LOCALES.en, { maximumFractionDigits: decimals }));
  }
  return numberFormats.get(key).format(value);
}

/**
 * The scale a euro amount shows in: billions and millions to one decimal, thousands whole from €10k and
 * to one decimal below, euros whole. An amount moves up a scale only when its rounding on the scale below
 * would reach a full unit of the next: €999,499 shows as €999k and €999,500 as €1m, €950,000 as €950k.
 * The amount shown is rounded once, from the exact value.
 */
function scaled(value) {
  const abs = Math.abs(round9(value));
  if (roundHalfAway(abs, -5) >= 1e9) return { n: roundHalfAway(abs, -8) / 1e9, unit: "bn" };
  if (roundHalfAway(abs, -3) >= 1e6) return { n: roundHalfAway(abs, -5) / 1e6, unit: "m" };
  if (roundHalfAway(abs, 0) >= 1e3) return { n: roundHalfAway(abs, abs >= 9950 ? -3 : -2) / 1e3, unit: "k" };
  return { n: roundHalfAway(abs, 0), unit: "" };
}

const SUFFIX = {
  en: { bn: "bn", m: "m", k: "k", "": "" },
  de: { bn: " Mrd. €", m: " Mio. €", k: " Tsd. €", "": " €" },
};

/**
 * A euro amount as the challengers show it: "€6.5m", "€750k", "€2.5k", "€950" in English; "6,5 Mio. €",
 * "750 Tsd. €", "2,5 Tsd. €", "950 €" in German. A negative amount starts with a minus sign.
 */
export function formatEur(value, lang = "en") {
  if (!Number.isFinite(value)) throw new RangeError(`not an amount: ${value}`);
  const l = lang === "de" ? "de" : "en";
  const { n, unit } = scaled(value);
  const sign = n !== 0 && value < 0 ? "−" : "";
  const digits = number(n, unit ? 1 : 0, l);
  return l === "en" ? `${sign}€${digits}${SUFFIX.en[unit]}` : `${sign}${digits}${SUFFIX.de[unit]}`;
}

/**
 * A euro range: "€3m–€5m" or "€500k–€1m" in English; "3–5 Mio. €" in German, or "500 Tsd. € – 1 Mio. €"
 * when its ends differ in scale.
 */
export function formatEurRange(low, high, lang = "en") {
  const a = formatEur(low, lang);
  const b = formatEur(high, lang);
  if (lang !== "de") return `${a}–${b}`;
  const unitA = scaled(low).unit;
  const unitB = scaled(high).unit;
  if (unitA === unitB && low >= 0) return `${a.slice(0, a.length - SUFFIX.de[unitA].length)}–${b}`;
  return `${a} – ${b}`;
}
