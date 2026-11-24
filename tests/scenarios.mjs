// The scenario checker (brief §7, AC-06), in Node without a browser:
//   pass      js/scenario_check.js finds nothing in the three scenarios, with DATA_SOURCES.md as it is;
//   planted   it fails on a planted defect of each kind brief §7 lists, and of the kinds this tool adds:
//             an answer that breaks its schema, an id that does not exist, a text missing in a language,
//             placeholders that differ between the languages, an unknown placeholder, a placeholder
//             outside the Writer's summary, prose that fails the fact audit, a figure that no longer
//             matches the frozen ones, an address missing from DATA_SOURCES.md or data/sources.js,
//             evidence no signal gave, anything shaped like a key, a thinking block, a broken guardrail
//             and a factor without a recorded choice; each planted copy fails for that reason, and the
//             unplanted scenario it came from passes;
//   any choice  on every scenario, a choice other than the recorded one for each factor in turn gives the
//             figures the engine gives on factors built by hand from the Strategist's answer: what is
//             left at stake, readiness and the dimensions under pressure.
// Usage: node tests/scenarios.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, report } from "./lib/harness.mjs";

const load = (f) => import(pathToFileURL(path.join(APP_ROOT, f)).href);
const { checkScenario } = await load("js/scenario_check.js");
const { SCENARIOS, runFromScenario, freshState } = await load("js/simulation.js");
const R = await load("js/run.js");
const E = await load("js/engine.js");
const dataSources = readFileSync(path.join(APP_ROOT, "DATA_SOURCES.md"), "utf8");

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const byId = (id) => SCENARIOS.find((s) => s.id === id);

// ---- pass ----------------------------------------------------------------------------------------------
for (const sc of SCENARIOS) {
  const { problems } = checkScenario(sc, { dataSources });
  check(!problems.length, `pass: ${sc.id} ${sc.company.name} holds${problems.length ? `; ${problems.slice(0, 4).join("; ")}` : ""}`);
}

// ---- planted defects -------------------------------------------------------------------------------------
// [what, scenario, plant(copy) or { sources }, what the problem must say]
const firstSignalUrl = (sc) => sc.answers.scout.signals[0].url;
const PLANTS = [
  ["an answer that breaks its schema (an issue without its confidence)", "s3",
    (sc) => { delete sc.answers.red_team.issues[0].confidence; }, /the Red team's answer/],
  ["an id that does not exist (an issue names factor zz9)", "s3",
    (sc) => { sc.answers.red_team.issues[0].factors = ["zz9"]; }, /names factor zz9, which does not exist/],
  ["a recorded choice for a response that does not exist", "s1",
    (sc) => { sc.choices[0].choice = "r-zz9"; }, /which is no response/],
  ["a text missing in German (a Scanner factor)", "s2",
    (sc) => { delete sc.answers.scanner.factors[0].text.de; }, /is not a text in English and German/],
  ["a text empty in English (a signal's summary)", "s1",
    (sc) => { sc.answers.scout.signals[0].summary.en = " "; }, /is empty in English/],
  ["placeholders that differ between the languages (the German headline drops its figure)", "s3",
    (sc) => { const h = sc.answers.writer.summary.headline; h.de = h.de.replace(/\{\{fact:[^}]+\}\}/g, "viel"); }, /different placeholders in English and German/],
  ["an unknown placeholder in the Writer's summary", "s2",
    (sc) => { const r = sc.answers.writer.summary.recommendation; r.en += " {{fact:nowhere}}"; r.de += " {{fact:nowhere}}"; }, /cites unknown fact keys: nowhere/],
  ["a placeholder outside the Writer's summary (in an issue's reason)", "s1",
    (sc) => { const r = sc.answers.red_team.issues[0].reason; r.en += " {{fact:at_stake}}"; r.de += " {{fact:at_stake}}"; }, /only the Writer's summary cites the engine's figures/],
  ["prose that fails the fact audit (a figure in an issue's reason)", "s3",
    (sc) => { sc.answers.red_team.issues[1].reason.en += " It would cost 4.5 million euros."; }, /writes a figure the engine did not compute: 4\.5/],
  ["prose that fails the fact audit in German (a share in a response)", "s2",
    (sc) => { sc.answers.strategist.responses[0].first_step.de += " Das senkt die Kosten um 30 %."; }, /de: .*writes a figure the engine did not compute/],
  ["a figure that no longer matches the frozen ones", "s3",
    (sc) => { sc.frozen.before.at_stake += 1000; }, /frozen figures: at stake before the decision/],
  ["frozen dimensions under pressure that differ", "s1",
    (sc) => { sc.frozen.after.pressure = []; }, /frozen figures: dimensions under pressure after the decision/],
  ["an address missing from DATA_SOURCES.md", "s3",
    { sources: (sc) => dataSources.split(firstSignalUrl(sc)).join("https://example.org/gone") }, /missing from DATA_SOURCES\.md/],
  ["an address missing from data/sources.js (an author's check)", "s2",
    (sc) => { const k = Object.keys(sc.checked)[0]; sc.checked[k] = [...sc.checked[k], "https://example.org/unregistered"]; }, /missing from data\/sources\.js/],
  ["evidence that no signal of the run gave", "s1",
    (sc) => { sc.answers.red_team.issues[0].evidence = ["https://example.org/elsewhere"]; }, /which no signal of this run gave/],
  ["signals in a run without research", "s2",
    (sc) => { sc.answers.scout = { signals: [structuredClone(byId("s3").answers.scout.signals[0])] }; }, /runs without research but holds signals/],
  ["something shaped like an API key", "s3",
    (sc) => { sc.answers.scout.signals[0].summary.en += " sk-ant-api03-AbCdEfGhIjKlMnOp"; }, /shaped like an API key/],
  ["a thinking block", "s1",
    (sc) => { sc.answers.red_team.thinking = { type: "thinking", thinking: "Let me reason." }; }, /thinking block/],
  ["a readiness the scale does not have (a threat at 7): reported, not thrown", "s3",
    (sc) => { sc.answers.scanner.factors.find((f) => f.direction === "threat").readiness = 7; }, /the engine cannot compute this run: a readiness level is a whole number from 1 to 5, not 7/],
  ["a broken guardrail (a dimension with seven factors after the scan)", "s1",
    (sc) => { const f = sc.answers.scanner.factors[0]; for (let i = 0; i < 6; i += 1) sc.answers.scanner.factors.push({ ...structuredClone(f), id: `zz${i}` }); }, /holds \d+ factors; the Scanner completes each dimension to two to six/],
  ["a broken guardrail (an opportunity to mitigate)", "s2",
    (sc) => { const opp = [...sc.team, ...sc.answers.scanner.factors].find((f) => f.direction === "opportunity"); const r = sc.answers.strategist.responses.find((x) => x.kind === "mitigate"); r.factor = opp.id; }, /an opportunity is used or watched, not mitigated/],
  ["a factor without a recorded choice", "s2",
    (sc) => { sc.choices = sc.choices.slice(1); }, /no recorded choice for/],
];
for (const [what, id, plant, expect] of PLANTS) {
  const base = byId(id);
  const copy = structuredClone(base);
  let sources = dataSources;
  if (typeof plant === "function") plant(copy);
  else sources = plant.sources(copy);
  let problems;
  try {
    ({ problems } = checkScenario(copy, { dataSources: sources }));
  } catch (e) {
    problems = [`the checker threw: ${e.message}`];
  }
  const hit = problems.find((p) => expect.test(p));
  check(!!hit, `planted in ${id}: ${what}${hit ? `: "${hit.slice(0, 110)}"` : `; not caught (${problems.length} other problem(s): ${problems.slice(0, 2).join("; ")})`}`);
}

// ---- any choice: the engine on factors built by hand ----------------------------------------------------
const close = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) <= 1e-6);
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
for (const sc of SCENARIOS) {
  const draft = runFromScenario(sc, "en", freshState());
  let tried = 0;
  const wrong = [];
  for (const f of R.decisionFactors(draft)) {
    const recorded = draft.recorded.get(f.id) ?? "accept";
    const others = [...R.optionsFor(draft, f.id).map((r) => r.id), "accept"].filter((id) => id !== recorded);
    for (const other of others) {
      tried += 1;
      const state = freshState();
      for (const [k, v] of draft.recorded) state.choices.set(k, v);
      state.choices.set(f.id, other);
      state.decided = true;
      const run = runFromScenario(sc, "en", state);
      const page = R.figures(run).after;
      // By hand: every mitigated threat takes the readiness, likelihood and euro range its chosen response
      // states; everything else stays as the Analyst left it.
      const responses = new Map(sc.answers.strategist.responses.map((r) => [r.id, r]));
      const hand = R.assessedFactors(run).map((x) => {
        const choice = state.choices.get(x.id);
        const r = responses.get(choice);
        if (!r || r.kind !== "mitigate" || x.direction !== "threat" || x.outdated) return x;
        return { ...x, readiness: r.mitigate.readiness, likelihood: r.mitigate.residual_likelihood, eur_year_low: r.mitigate.residual_eur_year_low, eur_year_high: r.mitigate.residual_eur_year_high };
      });
      const want = E.assess(hand);
      if (!close(page.atStake, want.atStake) || !close(page.readiness, want.readiness) || !same(page.pressure, want.pressure)) {
        wrong.push(`${f.id} → ${other}: page ${page.atStake} / ${page.readiness} / [${page.pressure}], by hand ${want.atStake} / ${want.readiness} / [${want.pressure}]`);
      }
    }
  }
  check(tried >= 10 && !wrong.length, `any choice in ${sc.id}: ${tried} choices other than the recorded one each agree with the engine on factors built by hand${wrong.length ? `; ${wrong.slice(0, 3).join("; ")}` : ""}`);
}

report(results, "SCENARIOS OK");
