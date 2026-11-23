// The fact audit (js/facts.js; brief §6.5 and §6.7), in Node without a browser. What an agent writes may
// carry no figure of its own: the engine's figures arrive through {{fact:key}} placeholders.
//   refuses   a number outside a placeholder in English and German, decimals and thousands separators,
//             "%", per cent and Prozent, halves, thirds and quarters, number words above twelve
//             (compounds included), a name with digits the evidence does not write, an unknown
//             placeholder;
//   allows    the run's own placeholders, years, ISO dates, a day with its month in both languages, a month
//             with its year, counts in words up to twelve, names with digits as the evidence writes them
//             ("MEPC 85", "CO2"), a legal reference the evidence holds, an evidence URL, and a quotation
//             the evidence holds word for word;
//   renders   renderFacts() fills the run's values and leaves an unknown key visible.
// Usage: node tests/audit.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, report } from "./lib/harness.mjs";

const { auditText, renderFacts } = await import(pathToFileURL(path.join(APP_ROOT, "js/facts.js")).href);

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const FACTS = ["at_stake", "left", "readiness.before", "readiness.after"];
const EVIDENCE = {
  titles: ["IMO: MEPC 85 resumes the Net-Zero Framework", "Smart meters: CO2 price stays in its corridor", "Every supplier offers a dynamic tariff (§ 41a EnWG)"],
  texts: ["The Machinery Regulation (EU) 2023/1230 applies from 20 January 2027.", "Industry figures: heat pump sales rose sharply"],
  quotes: [],
  urls: ["https://www.example.org/report-2026.pdf"],
};
const audit = (text) => auditText(text, { facts: FACTS, evidence: EVIDENCE });

// ---- refuses ---------------------------------------------------------------------------------------------
const REFUSED = [
  ["en", "It would cost 4.5 million euros a year.", ["4.5", "million"]],
  ["en", "Costs rise by 30 % next winter.", ["30", "%"]],
  ["en", "About 12,500 customers are affected.", ["12,500"]],
  ["en", "Prices rose thirty per cent.", ["thirty", "per cent"]],
  ["en", "Roughly half of the fleet runs on fuel oil.", ["half"]],
  ["en", "Two thirds of exports go to one market.", ["Two thirds"]],
  ["en", "A quarter of the technicians retire soon.", ["A quarter"]],
  ["en", "Seventy-two sites need a new plan.", ["Seventy-two"]],
  ["en", "Thirteen factors were rated.", ["Thirteen"]],
  ["en", "The B42 rule applies.", ["B42"]],
  ["en", "The figure is {{fact:nowhere}}.", []],
  ["de", "Das kostet 4,5 Millionen Euro im Jahr.", ["4,5", "Millionen"]],
  ["de", "Die Preise steigen um 30 Prozent.", ["30", "Prozent"]],
  ["de", "Rund die Hälfte der Kunden heizt mit Gas.", ["Hälfte"]],
  ["de", "Ein Drittel der Anlagen ist veraltet.", ["Drittel"]],
  ["de", "Dreizehn Faktoren sind bewertet.", ["Dreizehn"]],
  ["de", "Einundzwanzig Standorte brauchen einen Plan.", ["Einundzwanzig"]],
  ["de", "Etwa 12.500 Kunden sind betroffen.", ["12.500"]],
];
for (const [lang, text, tokens] of REFUSED) {
  const r = audit(text);
  const unknown = /\{\{fact:nowhere\}\}/.test(text);
  const ok = !r.pass && (unknown ? r.unknownFacts.includes("nowhere") : tokens.every((t) => r.tokens.includes(t)));
  check(ok, `refuses (${lang}) "${text}": ${unknown ? `unknown key ${JSON.stringify(r.unknownFacts)}` : `${JSON.stringify(r.tokens)}`}`);
}

// ---- allows ----------------------------------------------------------------------------------------------
const ALLOWED = [
  ["en", "At stake a year: {{fact:at_stake}}; readiness rises from {{fact:readiness.before}} to {{fact:readiness.after}}."],
  ["en", "The heat plan is due by 31 December 2026, and the rule changed in July 2026."],
  ["en", "The session resumes on 4 December; the report is dated 2026-11-23."],
  ["en", "In 2027 the second emissions trading system starts; the plan looks to 2030."],
  ["en", "Three of the six dimensions are under pressure, and twelve factors count."],
  ["en", "MEPC 85 resumes the talks, and the CO2 price stays in its corridor."],
  ["en", "Every supplier must offer a dynamic tariff under § 41a EnWG."],
  ["en", "See https://www.example.org/report-2026.pdf for the details."],
  ["en", "The rule applies from 20 January 2027, as \"The Machinery Regulation (EU) 2023/1230 applies from 20 January 2027.\" says."],
  ["de", "Der Wärmeplan ist bis zum 31. Dezember 2026 fällig; die Regel gilt seit Juli 2026."],
  ["de", "Die Sitzung geht am 4. Dezember weiter."],
  ["de", "Drei von sechs Dimensionen stehen unter Druck, zwölf Faktoren zählen."],
  ["de", "Auf dem Spiel stehen {{fact:at_stake}}, es bleiben {{fact:left}}."],
  ["de", "Der CO2-Preis bleibt im Korridor, MEPC 85 berät weiter."],
];
for (const [lang, text] of ALLOWED) {
  const r = audit(text);
  check(r.pass, `allows (${lang}) "${text.slice(0, 80)}"${r.pass ? "" : `: refused ${JSON.stringify([...r.tokens, ...r.unknownFacts])}`}`);
}

// ---- a quotation counts only when the evidence holds it word for word ----------------------------------------
{
  const r = audit("The page says \"The Machinery Regulation (EU) 2023/1231 applies from 20 January 2027.\"");
  check(!r.pass && r.tokens.includes("1231"), `refuses a quotation the evidence does not hold, so its number counts: ${JSON.stringify(r.tokens)}`);
}

// ---- renders ---------------------------------------------------------------------------------------------
{
  const out = renderFacts("At stake: {{fact:at_stake}}; unknown: {{fact:nowhere}}.", { at_stake: "€3.8m" });
  check(out === "At stake: €3.8m; unknown: {{fact:nowhere}}.", `renderFacts fills the run's values and leaves an unknown key visible: ${JSON.stringify(out)}`);
}

report(results, "AUDIT OK");
