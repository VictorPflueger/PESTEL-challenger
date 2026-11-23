// Fact keys, placeholders and the fact audit (brief §6.5 and §6.7; PLAN.md sections 4 and 7).
//
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea) js/facts.js: dates of every common form, the
// run's evidence URLs and names with digits, and no ids of that tool's own.
//
// The agents never write a figure the page shows as fact. Prose cites the engine's figures through
// placeholders, {{fact:<key>}}, with keys the engine returned for this run (js/engine.js facts()), and
// code renders them in the run's language. The fact audit runs on every text an agent writes and finds
// every number or proportion written outside those placeholders. In this order, on the text with its
// whitespace normalised (non-breaking spaces included):
//   1. placeholders are resolved; an unknown key is an error;
//   2. the run's evidence URLs are set aside, so a source can be linked;
//   3. quoted text that appears verbatim in the run's evidence is set aside („…“, “…”, "…", »…«, «…», ‚…‘);
//   4. dates are set aside: ISO dates (2026-12-31), a day with its month ("31 December 2026", "4 December",
//      "31. Dezember 2026", "4. Dezember"), a month with its year ("December 2026"), and years from 1900
//      to 2099 on their own;
//   5. legal references (§ or Art. with its number) that appear in the run's evidence are set aside;
//   6. blocked words and fractions are reported, once each, as written: "%", percent, per cent, Prozent,
//      half and halves (not "half-"), a third, one third, two thirds, a quarter, one quarter, three
//      quarters (except before party, parties, country or countries, and in "once a quarter"), thirds,
//      quarters, Hälfte, Drittel and Viertel with their inflected forms, and cardinal number words above
//      twelve in English and German, compounds included: counts up to twelve are written in words;
//   7. every other number token is reported (a run of digits with "." or "," between digits and any
//      letters joined to it: "2.0", "C5", "CO2", "14083"), unless it is a name with digits written as the
//      run's evidence writes it: a token with letters on its own ("CO2"), or a number with the word
//      directly before it ("MEPC 85", "ISO 14083").
// The run's evidence: the titles and summaries of the signals, the titles of the sources the factors cite,
// the company's name and what the person entered.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this tool's fact keys come rendered from
// js/engine.js, dates and years are allowed (brief §6.7), and its own ids (B-nn, L1 to L3) are gone.

/** A placeholder: {{fact:at_stake}}. */
export const FACT_RE = /\{\{fact:([A-Za-z0-9_.-]+)\}\}/g;

/**
 * The text with every {{fact:key}} replaced by its rendered value. values: the engine's facts() for the
 * run's language, key to display text. An unknown key stays as written, so a test finds it.
 */
export function renderFacts(text, values) {
  return String(text ?? "").replace(FACT_RE, (m, key) => (values && Object.hasOwn(values, key) ? values[key] : m));
}

/** Whitespace normalised: every run of white space (non-breaking spaces included) becomes one space. */
export function normalise(text) {
  return String(text ?? "").replace(/\s+/gu, " ").trim();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const L = "[\\p{L}\\p{N}]";
const NOT_BEFORE = `(?<!${L})`;
const NOT_AFTER = `(?!${L})`;

/**
 * The run's evidence as the audit reads it. evidence: { titles, quotes, texts, urls }. Returns helpers
 * over the normalised strings.
 */
export function evidenceCorpus(evidence = {}) {
  const strings = [...(evidence.titles || []), ...(evidence.quotes || []), ...(evidence.texts || [])].map(normalise).filter(Boolean);
  const urls = (evidence.urls || []).map((u) => String(u).trim()).filter(Boolean);
  return {
    strings,
    urls,
    /** The text occurs verbatim in a piece of evidence. */
    contains: (s) => strings.some((e) => e.includes(s)),
    /** The phrase occurs in a piece of evidence as whole words. */
    containsWords: (s) => {
      const re = new RegExp(`${NOT_BEFORE}${esc(s)}${NOT_AFTER}`, "u");
      return strings.some((e) => re.test(e));
    },
  };
}

// Dates (step 4): a day with its month and maybe its year, a month with its year.
const MONTHS_EN = "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTHS_DE = "Januar|Jänner|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember";
const DATES = [
  `${NOT_BEFORE}(?:[1-9]|[12]\\d|3[01]) (?:${MONTHS_EN})(?: (?:19|20)\\d{2})?${NOT_AFTER}`,
  `${NOT_BEFORE}(?:[1-9]|[12]\\d|3[01])\\. ?(?:${MONTHS_DE})(?: (?:19|20)\\d{2})?${NOT_AFTER}`,
  `${NOT_BEFORE}(?:${MONTHS_EN}|${MONTHS_DE}) (?:19|20)\\d{2}${NOT_AFTER}`,
  `${NOT_BEFORE}\\d{4}-\\d{2}-\\d{2}${NOT_AFTER}`,
  `${NOT_BEFORE}(?:19|20)\\d{2}${NOT_AFTER}`,
];

// Blocked words and fractions (step 6), each a pattern on the normalised text, case ignored.
const EXCEPT = `(?![ -](?:party|parties|country|countries)${NOT_AFTER})`;
const FRACTIONS = [
  `${NOT_BEFORE}(?:two)[ -]thirds${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:three)[ -]quarters${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:a|one)[ -]third${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?<!once )(?:a)[ -]quarter${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:one)[ -]quarter${NOT_AFTER}${EXCEPT}`,
];
const WORDS = [
  `${NOT_BEFORE}thirds${NOT_AFTER}`,
  `${NOT_BEFORE}quarters${NOT_AFTER}`,
  `${NOT_BEFORE}half${NOT_AFTER}(?!-)`,
  `${NOT_BEFORE}halves${NOT_AFTER}`,
  `${NOT_BEFORE}(?:percent|per cent|prozent)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:hälfte|hälften)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:drittel|drittels|dritteln)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:viertel|viertels|vierteln)${NOT_AFTER}`,
  `%`,
];
// English cardinal number words above twelve, with their compounds ("seventy-two") and plurals.
const EN_BIG = `${NOT_BEFORE}(?:thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)s?(?:-(?:one|two|three|four|five|six|seven|eight|nine))?(?![\\p{L}\\p{N}-])`;
// German number words, compounds included: a word made only of number parts that is above twelve.
const DE_PARTS = /^(?:ein|eins|eine|zwei|drei|vier|fünf|sechs|sech|sieben|sieb|acht|neun|zehn|elf|zwölf|und|zwanzig|dreißig|dreissig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)+$/u;
const DE_BIG = /(?:zwanzig|ßig|ssig|zig|hundert|tausend)/u;
const DE_TEEN = /(?:drei|vier|fünf|sech|sieb|acht|neun)zehn$/u;
const DE_LARGE = /^(?:millionen?|milliarden?|billionen?)$/u;

/**
 * The fact audit. text: an agent's text; facts: the keys the engine returned for this run (array or
 * Set); evidence: { titles, quotes, texts, urls }. Returns { pass, tokens, unknownFacts }: the blocked
 * tokens once each, as written, in the order they appear.
 */
export function auditText(text, { facts = [], evidence = {} } = {}) {
  const known = facts instanceof Set ? facts : new Set(facts);
  const corpus = evidenceCorpus(evidence);
  const src = normalise(text);
  let w = src;
  const hits = [];
  const unknownFacts = [];
  const mask = (start, length) => { w = w.slice(0, start) + " ".repeat(length) + w.slice(start + length); };
  const each = (re, fn) => { for (const m of [...w.matchAll(re)]) fn(m); };

  // 1. Placeholders: resolved against the run's facts; an unknown key is an error.
  each(new RegExp(FACT_RE.source, "g"), (m) => {
    if (!known.has(m[1]) && !unknownFacts.includes(m[1])) unknownFacts.push(m[1]);
    mask(m.index, m[0].length);
  });

  // 2. Evidence URLs, so a source can be linked.
  for (const url of corpus.urls) {
    let i = w.indexOf(url);
    while (i >= 0) { mask(i, url.length); i = w.indexOf(url, i + url.length); }
  }

  // 3. Quoted text that appears verbatim in the run's evidence.
  const QUOTES = [/„([^“”„]*)[“”]/gu, /“([^”“]*)”/gu, /»([^«»]*)«/gu, /«([^«»]*)»/gu, /‚([^‘‚]*)‘/gu, /"([^"]*)"/gu];
  for (const re of QUOTES) {
    each(re, (m) => {
      const inner = normalise(m[1]);
      if (inner && corpus.contains(inner)) mask(m.index, m[0].length);
    });
  }

  // 4. Dates and years.
  for (const source of DATES) each(new RegExp(source, "gu"), (m) => mask(m.index, m[0].length));

  // 5. Legal references that appear in the run's evidence: § 41a, §§ 9a, Art. 3, with Abs., Satz or Nr.
  const LEGAL = /(§§?|Art\.|Article) ?(\d+[a-z]?(?:\(\d+\))?(?: (?:Abs\.|Absatz|Satz|S\.|Nr\.|lit\.) ?\d+[a-z]?)*)(?![\p{L}\p{N}])/gu;
  each(LEGAL, (m) => {
    const ref = new RegExp(`${esc(m[1])} ?${m[2].split(" ").map(esc).join(" ?")}(?![\\p{L}\\p{N}])`, "u");
    if (corpus.strings.some((e) => ref.test(e))) mask(m.index, m[0].length);
  });

  // 6. Blocked words and fractions, reported as written.
  for (const source of [...FRACTIONS, ...WORDS, EN_BIG]) {
    each(new RegExp(source, "giu"), (m) => { hits.push({ index: m.index, token: m[0] }); mask(m.index, m[0].length); });
  }
  each(/\p{L}+/gu, (m) => {
    const word = m[0].toLowerCase();
    if ((DE_PARTS.test(word) && (DE_BIG.test(word) || DE_TEEN.test(word))) || DE_LARGE.test(word)) {
      hits.push({ index: m.index, token: m[0] });
      mask(m.index, m[0].length);
    }
  });

  // 7. Number tokens, unless names with digits as the run's evidence writes them.
  const NUMBER = /(?<![\p{L}\p{N}])(?=[\p{L}\p{N}]*\p{N})[\p{L}\p{N}]+(?:(?<=\p{N})[.,](?=\p{N})[\p{L}\p{N}]+)*/gu;
  each(NUMBER, (m) => {
    const token = m[0];
    if (/\p{L}/u.test(token)) {
      if (corpus.containsWords(token)) return;
    } else {
      const before = src.slice(0, m.index).trimEnd();
      const prev = (before.match(/(\S+)$/) || [])[1]?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (prev && corpus.containsWords(`${prev} ${token}`)) return;
    }
    hits.push({ index: m.index, token });
  });

  hits.sort((a, b) => a.index - b.index);
  const tokens = [];
  for (const h of hits) if (!tokens.includes(h.token)) tokens.push(h.token);
  return { pass: tokens.length === 0 && unknownFacts.length === 0, tokens, unknownFacts };
}
