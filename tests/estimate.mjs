// The estimate (brief §5.6, PLAN.md G14), in Node: it rebuilds each agent's request from the real prompt
// and format (js/prompts.js, js/schemas.js) and prices it at the meter's list prices (js/cost.js):
//   - for the simulation's tile, each scenario's own answers, Thorough dearer than Balanced, five searches
//     for a scenario with research;
//   - for the live dialog, a range for the person's company: low not above high, Fast below Balanced below
//     Thorough, research adding its searches, time in a range, and one repair at the top;
//   - once Victor's runs fill MEASURED, the measured figures replace the assumptions; a run in this tab
//     comes back beside them.
// The live dialog's text with these figures, and with the last run, is checked in tests/live-flow.mjs.
// Usage: node tests/estimate.mjs
import { report } from "./lib/harness.mjs";
import { estimateScenario, estimateLive, requestsOf, ASSUMPTIONS } from "../js/estimate.js";
import { SCENARIOS, localise, runFromScenario, freshState } from "../js/simulation.js";
import { scannerPrompt } from "../js/prompts.js";
import { REQUESTS } from "../js/schemas.js";
import { usageCostUsd } from "../js/cost.js";
import { FX_USD_EUR } from "../js/config.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);

// ---- the simulation's tile ---------------------------------------------------------------------------
for (const sc of SCENARIOS) {
  const b = estimateScenario(sc, "en");
  const th = estimateScenario(sc, "en", { model: "claude-sonnet-5-5" });
  const searches = sc.research ? ASSUMPTIONS.searches : 0;
  // Sonnet 5.5's token prices are twenty times Haiku 5.5's; the searches cost the same on both.
  const tokensOnly = (x) => x.usd - x.searches * 0.01;
  check(b.eur > 0 && th.eur > b.eur && Math.abs(tokensOnly(th) / tokensOnly(b) - 20) < 1e-9 && b.searches === searches, `${sc.id}: Balanced ≈ €${b.eur.toFixed(3)}, Thorough ≈ €${th.eur.toFixed(3)} (its tokens twenty times dearer), ${searches} searches`);
  const byHand = usageCostUsd("claude-haiku-5-5", { input_tokens: b.inTokens, output_tokens: b.outTokens, server_tool_use: { web_search_requests: b.searches } });
  check(Math.abs(b.usd - byHand) < 1e-12 && Math.abs(b.eur - byHand * FX_USD_EUR) < 1e-12, `${sc.id}: priced at the meter's list prices and rate`);
}

// ---- the real prompts ------------------------------------------------------------------------------------------
{
  const sc = SCENARIOS.find((s) => s.id === "s3");
  const run = runFromScenario(sc, "en", freshState());
  const reqs = requestsOf(run, localise(sc.answers, "en"), "en");
  const p = scannerPrompt({ inputs: { company: run.company, factors: run.team }, signals: run.signals, lang: "en" });
  // Three characters a token: the 5.5 models' tokenizer counts about 30 percent more tokens than the old rule
  // of four (the Haiku 5.5 model page, read on 24 November 2026); written out here, not read from the module.
  const promptTokens = Math.ceil(p.system.length / 3) + Math.ceil(p.user.length / 3) + Math.ceil(JSON.stringify(REQUESTS.Scan).length / 3);
  const scanner = reqs.find((r) => r.agent === "scanner");
  check(ASSUMPTIONS.charsPerToken === 3 && scanner.input === promptTokens, `the Scanner's input is its real prompt and format at three characters a token (${scanner.input} tokens)`);
  check(reqs.map((r) => r.agent).join(" ") === "scout scanner red_team analyst strategist writer", "one request per agent, the Scout's with research");
}

// ---- the live dialog's range ------------------------------------------------------------------------------------
const inputs = { company: { name: "Nordhafen Logistik", sector: "", country: "Germany", what: "Container terminal on the North Sea coast" }, factors: [{ id: "u1", dimension: "economic", text: "Freight rates fall" }, { id: "u2", dimension: "legal", text: "New port fees" }] };
const e = (preset, research = false, extra = {}) => estimateLive({ inputs, lang: "en", preset, research, ...extra });
const fast = e("fast");
const balanced = e("balanced");
const thorough = e("thorough");
const research = e("balanced", true);
check([fast, balanced, thorough, research].every((x) => x.eur.low > 0 && x.eur.low <= x.eur.high && x.seconds.low <= x.seconds.high && x.basis === "assumed"), "each estimate is a range, low not above high, in money and in time, on assumptions");
check(fast.eur.high < balanced.eur.high && balanced.eur.high < thorough.eur.low, `Fast (≤ €${fast.eur.high.toFixed(3)}) is below Balanced (≤ €${balanced.eur.high.toFixed(3)}), below Thorough (≥ €${thorough.eur.low.toFixed(3)})`);
check(research.eur.low - balanced.eur.low >= ASSUMPTIONS.searches * 0.01 * FX_USD_EUR - 1e-9, "research adds its five searches at $0.01 each");
check(balanced.requests.low === 5 && balanced.requests.high === 6 && research.requests.low === 6, "the top of the range allows one repair");
check(e("fast", false, { model: "claude-sonnet-5-5" }).eur.low > fast.eur.high, "a model changed under Advanced changes the estimate");
const de = estimateLive({ inputs, lang: "de", preset: "balanced" });
check(de.eur.low > 0 && de.eur.low !== balanced.eur.low, "the estimate reads the prompts in the page's language");

// ---- measured figures, and the last run in this tab --------------------------------------------------------------
const MEASURED = { balanced: { model: "claude-haiku-5-5", plain: { eur: [0.011, 0.019], seconds: [70, 150], requests: { low: 5, high: 6 } } } };
const m = e("balanced", false, { measured: MEASURED });
check(m.basis === "measured" && m.eur.low === 0.011 && m.seconds.high === 150, "once measured, the measured figures replace the assumptions");
check(e("balanced", true, { measured: MEASURED }).basis === "assumed", "a setting not yet measured stays on assumptions");
check(e("balanced", false, { measured: MEASURED, model: "claude-sonnet-5-5" }).basis === "assumed", "and so does a model changed under Advanced");
const last = e("balanced", false, { last: { eur: 0.0123, ms: 81000 } });
check(last.last?.eur === 0.0123 && last.last?.seconds === 81, "a live run in this tab comes back as its cost and time");

report(results, "ESTIMATE OK");
