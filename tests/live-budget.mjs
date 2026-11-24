// The budget cap and the cost meter (brief §5.5, AC-09), in Chromium against the stand-in:
//   - the meter equals each response's usage times the list price, plus $0.01 a search, converted at
//     0.894, to within 1e-9, and the Session cost tile shows the spend with the cap in its note;
//   - no request starts whose worst case would take the run past the cap: max_tokens drops to the step's
//     minimum first, and a run that still does not fit stops before the request with "Stopped at your
//     budget cap after" the last step done, or before the first request when even that does not fit.
// The worst case is the pipeline's own function (js/pipeline.js worstCaseEur), recomputed here for every
// request the stand-in received, with what the run had spent before it.
// Usage: node tests/live-budget.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { report, APP_ROOT } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, pageProblems, CONFIG } from "./lib/live.mjs";

const { worstCaseEur } = await import(pathToFileURL(path.join(APP_ROOT, "js/pipeline.js")).href);
const { usageCostUsd } = await import(pathToFileURL(path.join(APP_ROOT, "js/cost.js")).href);
const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const USAGE = { input_tokens: 12345, output_tokens: 2345 };

/** Each request with what the run had spent before it, from the usage the stand-in returned. */
function ledger(standIn, model) {
  let usd = 0;
  return standIn.requests.map((r) => {
    const searches = r.agent === "scout" ? 1 : 0;
    const before = usd * CONFIG.FX_USD_EUR;
    const usage = { ...USAGE, server_tool_use: { web_search_requests: searches } };
    usd += usageCostUsd(model, usage);
    return { ...r, before, usd };
  });
}

// ---- the meter -----------------------------------------------------------------------------------------
{
  const t = await livePage(suite, { standIn: { usage: USAGE } });
  await fillForm(t.page);
  await startRun(t.page, { research: true });
  await challenge(t.page);
  await adopt(t.page);
  const run = await runOf(t.page);
  const rows = ledger(t.standIn, "claude-haiku-5-5");
  const expectUsd = rows.at(-1).usd;
  // By hand, at the list price: Haiku 5.5 $0.10 in and $0.50 out a million tokens, $10 for 1,000 searches.
  const byHand = rows.length * (USAGE.input_tokens * 0.1 + USAGE.output_tokens * 0.5) / 1e6 + 1 * 10 / 1000;
  check(Math.abs(run.spend.usd - expectUsd) <= 1e-9 && Math.abs(expectUsd - byHand) <= 1e-9, `the meter is usage times price plus $0.01 a search: $${run.spend.usd} against $${byHand} worked out by hand`);
  check(Math.abs(run.spend.eur - expectUsd * 0.894) <= 1e-9, `and converts at 0.894 (€${run.spend.eur})`);
  const tile = await text(t.page, "#kpi-cost");
  check(/€0\.\d\d/.test(tile) && /spent of your €0\.50 cap/.test(tile), `the Session cost tile shows the spend and the cap ("${tile}")`);
  check(rows.every((r) => r.before + worstCaseEur(r.req, { searches: r.agent === "scout" ? CONFIG.ANTHROPIC.webSearchTool.max_uses : 0 }) <= 0.5 + 1e-12), "with room under the cap, no request's worst case passes it");
  const problems = await pageProblems(t);
  check(!problems.length, `the run leaves no page error or protocol fault${problems.length ? `: ${problems.join("; ")}` : ""}`);
  await t.context.close();
}

// ---- a tight cap: max_tokens drops, then the run stops ---------------------------------------------------------
{
  const cap = 0.1;
  const t = await livePage(suite, { standIn: { usage: USAGE, expect: { model: "claude-sonnet-5-5", effort: "medium", thinking: null } } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", cap });
  if ((await runOf(t.page))?.scan) await challenge(t.page);
  const run = await runOf(t.page);
  const rows = ledger(t.standIn, "claude-sonnet-5-5");
  const over = rows.filter((r) => r.before + worstCaseEur(r.req) > cap + 1e-12);
  check(rows.length > 0 && !over.length, `no request started whose worst case passed the €${cap} cap (${rows.length} sent${over.length ? `; over: ${over.map((r) => r.agent).join(", ")}` : ""})`);
  check(rows.some((r) => r.req.max_tokens === CONFIG.MIN_TOKENS[r.agent]), `max_tokens dropped to the step's minimum first (${rows.map((r) => `${r.agent} ${r.req.max_tokens}`).join(", ")})`);
  check(run.stopped?.reason === "cap", `the run stopped at the cap (${JSON.stringify(run.stopped)})`);
  const said = await text(t.page, ".stop-alert");
  check(/Stopped at your budget cap after (Scan|Challenge|Assess|Respond)\./.test(said), `the step says where: "${said}"`);
  check(run.spend.eur <= cap, `the run spent €${run.spend.eur.toFixed(4)}, within the cap`);
  check(/Go on/.test(await text(t.page, "#btn-cta")), "and offers to go on, with a higher cap");
  await t.context.close();
}

// ---- a cap below the first request: nothing is sent ---------------------------------------------------------------
{
  const t = await livePage(suite, { standIn: { usage: USAGE } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", research: true, cap: 0.05 });
  const run = await runOf(t.page);
  check(t.standIn.requests.length === 0 && run.stopped?.reason === "cap", `a cap below the Scout's worst case sends no request (${t.standIn.requests.length} sent)`);
  check(/before the first request/.test(await text(t.page, ".stop-alert")), "and the step says so");
  await t.context.close();
}

await suite.done();
report(results, "LIVE BUDGET OK");
