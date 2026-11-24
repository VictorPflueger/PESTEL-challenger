// What is usually private, found before a live run (brief §5.10): e-mail addresses, phone numbers, IBANs
// and the words "confidential", "internal", "vertraulich" and "intern", and anything shaped like an API key
// (brief §5.3), which the run also redacts before a prompt reads it. The live-run dialog lists what it
// finds and where, and asks the person to remove it or confirm it is public. It warns; it does not block.
// The patterns err towards silence on ordinary business text: years, dates, ranges of dates, amounts and
// percentages never count as phone numbers, and an IBAN counts only when its check digits add up.

/** The words that usually mark a document as not public, in English and German, with their endings. */
// "internal combustion" names an engine, not a document.
const WORDS = /\b(confidential(?:ly)?|internal(?:ly)?(?!\s+combustion)|vertraulich(?:e[nrms]?)?|intern(?:e[nrms]?)?)\b/giu;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// A run of digits with the separators phone numbers use, starting with + or 00 (international) or 0 (a
// trunk prefix); a match counts with 8 to 15 digits.
const PHONE = /(?:\+|\b00)[1-9][\d ()./-]{6,}\d|\b0[1-9][\d ()./-]{5,}\d/g;
// An Anthropic API key pasted into the form by mistake: the key belongs in the dialog's key field only.
const KEY = /sk-ant-[A-Za-z0-9_-]{8,}/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g;
// Dates, day first with dots, slashes or hyphens (01.01.2027, 1/7/26) or as ISO (2026-07-01): never a phone.
// A date stands alone: no digit group runs on before or after it, as one does in 01.23.45.67.89.
const DATE = /(?<![\d./-])(?:0?[1-9]|[12]\d|3[01])([./-])(?:0?[1-9]|1[0-2])\1(?:\d{4}|\d{2})(?![./-]?\d)|(?<![\d-])\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?![-\d])/g;
// A range of two dates joined by a hyphen or a dash, whose digits run on (01.01.26-31.12.26, 01/01/26-31/12/26,
// 01.01.-31.12.2027, 2026-01-01-2026-12-31): both are dates, never a phone number. It is read before DATE.
const RANGE = /(?<![\d./-])(?:0?[1-9]|[12]\d|3[01])([./])(?:0?[1-9]|1[0-2])\1(?:\d{4}|\d{2})? ?[-\u2013] ?(?:0?[1-9]|[12]\d|3[01])([./])(?:0?[1-9]|1[0-2])\2(?:\d{4}|\d{2})(?![./-]?\d)|(?<![\d-])\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]) ?[-\u2013/] ?\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?![-\d])/g;

/** True when an IBAN's check digits are right (ISO 13616, mod 97). */
export function ibanValid(raw) {
  const s = String(raw).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/**
 * Every occurrence of what is usually private in one text, in the order the warning names them:
 * [{ kind, word?, value }], value written one way (a phone number as its digits, a word in lower case).
 */
export function privateMatches(text) {
  const s = String(text ?? "");
  const out = [];
  for (const m of s.match(KEY) || []) out.push({ kind: "key", value: m });
  for (const m of s.match(EMAIL) || []) out.push({ kind: "email", value: m.toLowerCase() });
  // An IBAN's digits, and an address's, must not count again as a phone number.
  const ibans = (s.match(IBAN) || []).filter(ibanValid);
  for (const m of ibans) out.push({ kind: "iban", value: m.replace(/\s+/g, "").toUpperCase() });
  const rest = ibans.reduce((x, m) => x.replace(m, " "), s).replace(EMAIL, " ").replace(RANGE, " ").replace(DATE, " ");
  for (const m of rest.match(PHONE) || []) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) out.push({ kind: "phone", value: digits });
  }
  for (const m of s.matchAll(WORDS)) out.push({ kind: "word", word: m[1].toLowerCase(), value: m[1].toLowerCase() });
  return out;
}

/** Each kind, and each word, once: [{ kind, word? }]. */
function once(matches) {
  const seen = new Set();
  return matches.filter((m) => { const k = `${m.kind}|${m.word ?? ""}`; return !seen.has(k) && seen.add(k); })
    .map((m) => (m.word ? { kind: m.kind, word: m.word } : { kind: m.kind }));
}

/** What one text holds that is usually private: [{ kind, word? }], each kind and word once. */
export function findPrivate(text) {
  return once(privateMatches(text));
}

/**
 * What a text holds that its earlier version did not, occurrence by occurrence: a second "internal", or a
 * phone number in place of another, counts; the earlier version's own do not. [{ kind, word? }] once each.
 */
export function findAdded(text, before) {
  const left = new Map();
  for (const m of privateMatches(before)) left.set(`${m.kind}|${m.value}`, (left.get(`${m.kind}|${m.value}`) || 0) + 1);
  return once(privateMatches(text).filter((m) => {
    const k = `${m.kind}|${m.value}`;
    const n = left.get(k) || 0;
    if (n) left.set(k, n - 1);
    return !n;
  }));
}

/**
 * What the live form holds that is usually private, field by field: [{ kind, word?, field, dimension? }].
 * inputs: { company: { name, country, what }, factors: [{ id, dimension, text }] }.
 */
export function privateFindings(inputs) {
  const fields = [
    ["name", inputs.company?.name], ["country", inputs.company?.country], ["what", inputs.company?.what],
    ...(inputs.factors || []).map((f) => [`factor:${f.id}`, f.text, f.dimension]),
  ];
  return fields.flatMap(([field, text, dimension]) => findPrivate(text).map((x) => ({ ...x, field, ...(dimension ? { dimension } : {}) })));
}
