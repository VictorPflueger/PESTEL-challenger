// What is usually private, found before a live run (brief §5.10): e-mail addresses, phone numbers, IBANs
// and the words "confidential", "internal", "vertraulich" and "intern". The live-run dialog lists what it
// finds and where, and asks the person to remove it or confirm it is public. It warns; it does not block.
// The patterns err towards silence on ordinary business text: years, dates, amounts and percentages never
// count as phone numbers, and an IBAN counts only when its check digits add up.

/** The words that usually mark a document as not public, in English and German, with their endings. */
const WORDS = /\b(confidential(?:ly)?|internal(?:ly)?|vertraulich(?:e[nrms]?)?|intern(?:e[nrms]?)?)\b/giu;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// A run of digits with the separators phone numbers use, starting with + or 00 (international) or 0 (a
// trunk prefix); a match counts with 8 to 15 digits.
const PHONE = /(?:\+|\b00)[1-9][\d ()./-]{6,}\d|\b0[1-9][\d ()./-]{5,}\d/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g;

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

/** What one text holds that is usually private: [{ kind, word? }], each kind and word once. */
export function findPrivate(text) {
  const s = String(text ?? "");
  const out = [];
  const seen = new Set();
  const add = (kind, word = null) => {
    const k = `${kind}|${word ?? ""}`;
    if (!seen.has(k)) { seen.add(k); out.push(word ? { kind, word } : { kind }); }
  };
  if ((s.match(EMAIL) || []).length) add("email");
  // An IBAN's digits, and an address's, must not count again as a phone number.
  const ibans = (s.match(IBAN) || []).filter(ibanValid);
  if (ibans.length) add("iban");
  const rest = ibans.reduce((x, m) => x.replace(m, " "), s).replace(EMAIL, " ");
  for (const m of rest.match(PHONE) || []) {
    const digits = m.replace(/\D/g, "").length;
    if (digits >= 8 && digits <= 15) { add("phone"); break; }
  }
  for (const m of s.matchAll(WORDS)) add("word", m[1].toLowerCase());
  return out;
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
