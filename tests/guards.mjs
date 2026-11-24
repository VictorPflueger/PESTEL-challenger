// The checks every agent's answer passes (brief §6.7 and §5.10, AC-19), in Node: the recorded answers of
// all three scenarios pass in both languages, as the positive control; each refusal of brief §6.7 returns
// its own message when planted; the fact audit refuses figures and unknown fact keys; an answer that is
// not even the right shape is reported, never thrown; and the repair message lists what to fix.
// Usage: node tests/guards.mjs
import { report } from "./lib/harness.mjs";
import { SCENARIOS, localise, runFromScenario, freshState } from "../js/simulation.js";
import * as G from "../js/guards.js";
import * as R from "../js/run.js";
import { repairMessage } from "../js/prompts.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const clone = (x) => structuredClone(x);

/** A scenario's answers as a live run would check them, with what each check reads. */
function setup(sc, lang) {
  const run = runFromScenario(sc, lang, freshState());
  const a = localise(sc.answers, lang);
  if (a.scout) a.scout = { signals: a.scout.signals.map(({ read_on, ...s }) => s) };
  const inputs = { company: { name: run.company.name, sector: run.company.sector, country: run.company.country, what: run.company.what }, factors: run.team.map((t) => ({ id: t.id, dimension: t.dimension, text: t.text, rated: t.rated })) };
  const evidence = G.liveEvidence({ inputs, signals: run.signals, sector: run.company.sector });
  const facts = Object.keys(R.runFacts({ ...run, decided: true }, lang));
  return { run, a, inputs, evidence, facts, scanned: R.scannedFactors(run), challenged: R.challengedFactors(run) };
}
const clean = (r) => !r.problems.length && !r.audit.length;

// ---- the positive control: every recorded answer passes --------------------------------------------------
for (const sc of SCENARIOS) {
  for (const lang of ["en", "de"]) {
    const x = setup(sc, lang);
    const all = [
      x.a.scout ? G.checkSignals(x.a.scout, { urls: new Set(x.run.signals.map((s) => s.url)) }) : { problems: [], audit: [] },
      G.checkScan(x.a.scanner, { inputs: x.inputs, signals: x.run.signals, evidence: x.evidence }),
      G.checkIssues(x.a.red_team, { factors: x.scanned, signals: x.run.signals, evidence: x.evidence }),
      G.checkImpacts(x.a.analyst, { factors: x.challenged, sector: x.run.company.sector, evidence: x.evidence }),
      G.checkResponses(x.a.strategist, { factors: x.challenged, impacts: x.a.analyst.impacts, evidence: x.evidence }),
      G.checkSummary(x.a.writer, { facts: x.facts, evidence: x.evidence }),
    ];
    const bad = all.flatMap((r) => [...r.problems.map((p) => p.message), ...r.audit.map((u) => `${u.path}: ${u.tokens.join(", ")}${u.unknown.join(", ")}`)]);
    check(!bad.length, `${sc.id} (${lang}): every recorded answer passes every check${bad.length ? `: ${bad.slice(0, 3).join("; ")}` : ""}`);
  }
}

// ---- each refusal of brief §6.7 returns its own message ---------------------------------------------------
const x = setup(SCENARIOS.find((s) => s.id === "s3"), "en");
const scan = (a) => G.checkScan(a, { inputs: x.inputs, signals: x.run.signals, evidence: x.evidence });
const has = (r, code) => r.problems.some((p) => p.code === code && p.message.startsWith(G.REFUSALS[code]));
const planted = [];

let a = clone(x.a.scanner); a.factors[0].readiness = 7;
planted.push(["readiness_range", "a readiness level of 7 on a new threat", scan(a)]);
a = clone(x.a.scanner); a.factors.find((f) => f.direction === "opportunity").readiness = 3;
planted.push(["readiness_opportunity", "a readiness level on an opportunity", scan(a)]);
a = clone(x.a.scanner); a.factors[0].direction = null;
planted.push(["direction", "a new factor without a direction", scan(a)]);
let i = clone(x.a.red_team); i.issues[0].correction.factor = "zz9";
planted.push(["unknown_factor", "a correction naming a factor that does not exist", G.checkIssues(i, { factors: x.scanned, signals: x.run.signals, evidence: x.evidence })]);
let r = clone(x.a.strategist); r.responses.find((y) => y.kind === "mitigate").mitigate.residual_likelihood = 5;
planted.push(["residual", "a residual likelihood above the original", G.checkResponses(r, { factors: x.challenged, impacts: x.a.analyst.impacts, evidence: x.evidence })]);
r = clone(x.a.strategist); { const m = r.responses.find((y) => y.kind === "mitigate"); const imp = x.a.analyst.impacts.find((y) => y.factor === m.factor); m.mitigate.residual_eur_year_high = imp.eur_year_high + 1; }
planted.push(["residual", "a residual euro range above the original", G.checkResponses(r, { factors: x.challenged, impacts: x.a.analyst.impacts, evidence: x.evidence })]);
r = clone(x.a.strategist); r.responses.find((y) => y.kind === "monitor").monitor.trigger = " ";
planted.push(["monitor", "a monitor response without a trigger", G.checkResponses(r, { factors: x.challenged, impacts: x.a.analyst.impacts, evidence: x.evidence })]);
a = clone(x.a.scanner); for (let k = 0; k < 5; k += 1) a.factors.push({ ...clone(a.factors.find((f) => f.dimension === "legal") || a.factors[0]), dimension: "legal", id: `a${60 + k}`, text: `Another legal force, number ${["one", "two", "three", "four", "five"][k]}` });
planted.push(["dimension_full", "seven factors under one heading", scan(a)]);
a = clone(x.a.scanner); a.factors[0].id = "u1";
planted.push(["user_text", "a new factor that takes the id of the person's factor", scan(a)]);
a = clone(x.a.scanner); a.factors[0].text = x.inputs.factors[0].text;
planted.push(["user_text", "a new factor that repeats the person's words", scan(a)]);
for (const [code, what, result] of planted) check(has(result, code), `refused with its message, "${G.REFUSALS[code]}": ${what}`);

// ---- the fact audit --------------------------------------------------------------------------------------
a = clone(x.a.scanner); a.factors[0].basis = "Prices rose by 12 % last year, to 4.3 million.";
const audited = scan(a);
check(audited.audit.some((u) => u.path === "factors[0].basis" && u.tokens.includes("12") && u.tokens.includes("%")), `the audit refuses a figure the run's evidence does not hold (${JSON.stringify(audited.audit)})`);
a = clone(x.a.scanner); a.factors[0].basis = "The CO2 price corridor holds in 2027, under Scope 3 rules and ISO 14083.";
check(clean(scan(a)), "the audit lets years and names with digits through (CO2, Scope 3, ISO 14083)");
let w = clone(x.a.writer); w.summary.headline = "{{fact:nonsense}} at stake";
check(G.checkSummary(w, { facts: x.facts, evidence: x.evidence }).audit.some((u) => u.unknown.includes("nonsense")), "the audit refuses a fact key the engine did not give");
w = clone(x.a.writer); w.summary.headline = "{{fact:at_stake}} a year is at stake";
check(clean(G.checkSummary(w, { facts: x.facts, evidence: x.evidence })), "a known fact key passes");

// ---- counts, ranges and coverage -------------------------------------------------------------------------
let im = clone(x.a.analyst); im.impacts.pop();
check(G.checkImpacts(im, { factors: x.challenged, sector: x.run.company.sector, evidence: x.evidence }).problems.some((p) => p.code === "count"), "an impact missing for one factor is refused: the Analyst prices every factor");
im = clone(x.a.analyst); { const t = im.impacts.find((y) => y.eur_year_low !== null); [t.eur_year_low, t.eur_year_high] = [t.eur_year_high + 10, t.eur_year_low]; }
check(G.checkImpacts(im, { factors: x.challenged, sector: x.run.company.sector, evidence: x.evidence }).problems.some((p) => p.code === "range"), "a euro range whose low is above its high is refused");
r = clone(x.a.strategist); r.responses.filter((y) => y.factor === "u2").forEach((y) => { y.factor = "zz8"; });
check(G.checkResponses(r, { factors: x.challenged, impacts: x.a.analyst.impacts, evidence: x.evidence }).problems.some((p) => /u2/.test(p.message)), "a factor marked out of date still needs its responses, so an Undo needs no other request");
w = clone(x.a.writer); w.summary.findings.pop();
check(G.checkSummary(w, { facts: x.facts, evidence: x.evidence }).problems.some((p) => p.code === "count"), "a summary with two findings is refused");

// ---- a wrong shape is reported, never thrown --------------------------------------------------------------
let threw = null;
for (const bad of [null, {}, "text", { factors: null, ratings: null }, { factors: [null, 3], ratings: [null] }]) {
  try { const out = scan(bad); if (!out.problems.length) threw = `no problem for ${JSON.stringify(bad)}`; } catch (e) { threw = e.message; }
}
for (const [fn, bad] of [[(v) => G.checkIssues(v, { factors: [], signals: [], evidence: {} }), { issues: [null, { id: "i1" }] }], [(v) => G.checkImpacts(v, { factors: [], sector: "general", evidence: {} }), { impacts: [null] }], [(v) => G.checkResponses(v, { factors: [], impacts: [], evidence: {} }), { responses: [null] }], [(v) => G.checkSummary(v, { facts: [], evidence: {} }), { summary: { findings: [1] } }]]) {
  try { fn(bad); fn(null); } catch (e) { threw = e.message; }
}
check(threw === null, `answers of the wrong shape come back as problems, never as an exception${threw ? `: ${threw}` : ""}`);

// ---- the repair message --------------------------------------------------------------------------------------
const lines = G.repairLines(planted[0][2]);
const msg = repairMessage(lines);
check(lines.length && msg.includes(lines[0]) && /Send the whole answer again/.test(msg), "the repair message lists each problem and asks for the whole answer again");

report(results, "GUARDS OK");
