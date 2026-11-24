// The budget cap and the cost meter (brief §5.5, AC-09), in Chromium against the stand-in:
//   - the meter equals each response's usage times the list price, plus $0.01 a search, converted at
//     0.894, to within 1e-9, and the Session cost tile shows the spend with the cap in its note;
//   - no request starts whose worst case would take the run past the cap: max_tokens drops to the step's
//     minimum first, and a run that still does not fit stops before the request with "Stopped at your
//     budget cap after" the last step done, or before the first request when even that does not fit;
//   - an attempt cut off mid-stream, which the API bills but reports nothing for, is held against the cap at
//     its worst case, and the retry goes only if it still fits; so is every such attempt, the last one too,
//     and a request the person aborts while it is under way, or one left unanswered past the client's time
//     limit; Go on after them starts no request whose worst case, with what was spent and held before it,
//     passes the cap;
//   - every stop says what happened: an overload inside the stream is the busy service, a cap reached after a
//     request says no step was done rather than no request was sent, and while anything is held, the stop says so.
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

// ---- a stream cut mid-way: its worst case is held against the cap ------------------------------------------------
// The API bills an attempt cut off after its stream began, but reports nothing for it, so the run holds that
// attempt's worst case against the cap; the retry goes only if it still fits.
let cutWorst = 0;
{
  const t = await livePage(suite, { standIn: { faults: [{ agent: "scanner", attempt: 1, cut: true }], usage: USAGE } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", cap: 3 });
  const run = await runOf(t.page);
  const scans = t.standIn.requests.filter((r) => r.agent === "scanner");
  cutWorst = scans.length ? worstCaseEur(scans[0].req) : 0;
  check(scans.length === 2 && run.scan && !run.stopped && Math.abs(run.unmetered - cutWorst) < 1e-12 && run.requests === 1,
    `a Scanner stream cut mid-way is tried again, and its worst case, €${cutWorst.toFixed(4)}, stays held against the cap (held ${run.unmetered}, ${scans.length} attempts, ${run.requests} request counted)`);
  check(!(await pageProblems(t)).length, "no page error, policy violation or protocol fault after the cut");
  await t.context.close();
}
{
  // A cap with room for one attempt but not for a second: the run stops before the retry, and says why.
  const cap = Math.ceil((cutWorst * 1.2) / 0.05) * 0.05;
  const t = await livePage(suite, { standIn: { faults: [{ agent: "scanner", attempt: 1, cut: true }], usage: USAGE } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", cap, waitFor: "none" });
  await t.page.waitForFunction(() => window.__pestel?.run()?.stopped, null, { timeout: 15000 });
  const run = await runOf(t.page);
  const scans = t.standIn.requests.filter((r) => r.agent === "scanner").length;
  check(cap > cutWorst && cap < 2 * cutWorst && scans === 1 && run.stopped?.reason === "cap",
    `with a €${cap.toFixed(2)} cap the cut attempt's worst case leaves no room for a retry: the run stops at the cap (${scans} attempt, ${JSON.stringify(run.stopped?.reason)})`);
  check(/a request broke off or went unanswered/.test(await text(t.page, ".stop-alert")) && /counts against your cap at its worst case/.test(await text(t.page, ".stop-alert")), `and the stop says why the cap was reached: "${await text(t.page, ".stop-alert")}"`);
  await t.context.close();
}

/**
 * Each request the stand-in received, with what the run had at stake before it: the answers before it at
 * USAGE each, and the worst case of every attempt before it that was cut off or aborted (`broken`, by index).
 */
function atStake(standIn, model, broken) {
  let usd = 0;
  let held = 0;
  return standIn.requests.map((r, i) => {
    const worst = worstCaseEur(r.req);
    const before = usd * CONFIG.FX_USD_EUR + held;
    if (broken.has(i)) held += worst;
    else usd += usageCostUsd(model, USAGE);
    return { agent: r.agent, before, worst };
  });
}

/** The largest cap the dialog offers (a multiple of €0.05) that is below x. */
const capBelow = (x) => Math.round(Math.floor((x - 1e-9) / 0.05) * 5) / 100;

/** Go on from a stop with the same cap, and wait until the run stops again or the scan is done. */
async function goOn(page) {
  await page.click("#btn-cta");
  await page.waitForSelector("#live-dialog[open]");
  const estimate = await text(page, "#live-estimate");
  await page.check("#live-ack");
  await page.click("#live-start");
  await page.waitForFunction(() => { const r = window.__pestel?.run(); return r && !r.working && (r.stopped || r.scan) && !document.querySelector("#live-dialog[open]"); }, null, { timeout: 30000 });
  return estimate;
}

// ---- every attempt cut off counts, the last one too, and Go on stays within the cap ------------------------
{
  // Room for the three attempts, but less than the four worst cases that are at stake once Go on asks again.
  const cap = Math.min(3, capBelow(4 * cutWorst));
  const faults = [1, 2, 3].map((attempt) => ({ agent: "scanner", attempt, cut: true }));
  const t = await livePage(suite, { standIn: { faults, usage: USAGE } });
  try {
    await fillForm(t.page);
    await startRun(t.page, { preset: "thorough", cap, waitFor: "none" });
    await t.page.waitForFunction(() => window.__pestel?.run()?.stopped, null, { timeout: 30000 });
    const run = await runOf(t.page);
    const cut = t.standIn.requests.filter((r) => r.agent === "scanner");
    const held = cut.reduce((a, r) => a + worstCaseEur(r.req), 0);
    check(cut.length === 3 && run.stopped?.reason === "error" && Math.abs(run.unmetered - held) < 1e-12,
      `three Scanner attempts cut off mid-way each count at their worst case, the last one too (held €${run.unmetered.toFixed(4)} against €${held.toFixed(4)})`);
    check(/broke off while the answer was coming in/.test(await text(t.page, ".stop-alert")) && /counts against your cap at its worst case/.test(await text(t.page, ".stop-alert")), `and the stop says what happened and that it counts: "${await text(t.page, ".stop-alert")}"`);
    const estimate = await goOn(t.page);
    check(/more counts against your cap, for requests that broke off, went unanswered or were aborted/.test(estimate), `Go on's dialog says what is held against the cap: "${estimate}"`);
    const rows = atStake(t.standIn, "claude-sonnet-5-5", new Set([0, 1, 2]));
    const over = rows.filter((r) => r.before + r.worst > cap + 1e-12);
    check(cap >= 3 * cutWorst && cap < 4 * cutWorst && rows.length >= 3 && !over.length,
      `after Go on with the same €${cap.toFixed(2)} cap, no request started whose worst case, with what was spent and held before it, passed the cap (${rows.length} sent${over.length ? `; over: ${over.map((r) => `${r.agent} €${(r.before + r.worst).toFixed(4)}`).join(", ")}` : ""})`);
  } catch (e) {
    check(false, `three cut attempts: ${e.message.split("\n")[0]}`);
  }
  await t.context.close();
}

// ---- a request aborted under way counts at its worst case, and Go on stays within the cap --------------------
{
  // Room for the Scanner's request, but less than two of its worst cases.
  const cap = Math.min(3, capBelow(2 * cutWorst));
  const t = await livePage(suite, { standIn: { usage: USAGE } });
  try {
    await fillForm(t.page);
    const release = t.net.holdAt(0);
    await startRun(t.page, { preset: "thorough", cap, waitFor: "none" });
    await t.net.held(0);
    await t.page.waitForSelector("#btn-abort");
    await t.page.click("#btn-abort");
    release();
    await t.page.waitForFunction(() => window.__pestel?.run()?.stopped, null, { timeout: 15000 });
    await t.page.waitForTimeout(100);
    const run = await runOf(t.page);
    const w0 = t.standIn.requests[0] ? worstCaseEur(t.standIn.requests[0].req) : NaN;
    check(run.stopped?.reason === "aborted" && run.stopped.held === true && Math.abs(run.unmetered - w0) < 1e-12,
      `Abort while the Scanner's request is under way holds its worst case against the cap (held €${run.unmetered.toFixed(4)} against €${w0.toFixed(4)})`);
    check(/aborted/.test(await text(t.page, ".stop-alert")) && /counts against your cap at its worst case/.test(await text(t.page, ".stop-alert")), `and the stop says so: "${await text(t.page, ".stop-alert")}"`);
    await goOn(t.page);
    const rows = atStake(t.standIn, "claude-sonnet-5-5", new Set([0]));
    const over = rows.filter((r) => r.before + r.worst > cap + 1e-12);
    check(cap >= cutWorst && cap < 2 * cutWorst && !over.length,
      `after Go on with the same €${cap.toFixed(2)} cap, no request started past it (${rows.length} sent${over.length ? `; over: ${over.map((r) => `${r.agent} €${(r.before + r.worst).toFixed(4)}`).join(", ")}` : ""})`);
  } catch (e) {
    check(false, `abort under way: ${e.message.split("\n")[0]}`);
  }
  await t.context.close();
}

// ---- each stop says what happened ------------------------------------------------------------------------
/** Start a Thorough run with the faults and usage given, and wait for its stop. */
async function stopped(faults, { usage = USAGE, cap = 3, during = null } = {}) {
  const t = await livePage(suite, { standIn: { faults, usage } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", cap, waitFor: "none" });
  if (during) await during(t);
  await t.page.waitForFunction(() => window.__pestel?.run()?.stopped, null, { timeout: 30000 });
  await t.page.waitForTimeout(100);
  return { t, run: await runOf(t.page), words: await text(t.page, ".stop-alert") };
}
{
  // An overload the API reports inside the stream, three times: the service is busy, and the attempts count.
  const overload = { type: "overloaded_error", message: "Overloaded" };
  const { t, run, words } = await stopped([1, 2, 3].map((attempt) => ({ agent: "scanner", attempt, streamError: overload })));
  check(run.stopped?.reason === "error" && t.standIn.requests.length === 3 && run.unmetered > 0 && /service is busy/.test(words) && !/could not reach/.test(words) && /counts against your cap/.test(words),
    `an overload inside the stream, three times, reads as the busy service and its attempts count: "${words}"`);
  await t.context.close();
}
{
  // The cap reached after a request was sent and paid for, with nothing held: no step was done, but a request was.
  const usage = { input_tokens: 40000, output_tokens: 2000 };
  const { t, run, words } = await stopped([{ agent: "scanner", attempt: 1, mutate: (a) => { a.factors[0].readiness = 7; return a; } }], { usage, cap: 0.1 });
  check(run.stopped?.reason === "cap" && run.requests === 1 && !run.unmetered && /before the first step was done/.test(words) && !/before the first request/.test(words),
    `a cap reached after the first request says no step was done, not that no request was sent: "${words}"`);
  await t.context.close();
}
{
  // An Abort in the wait before a retry of a cut attempt: the stop says the cut attempt counts.
  const during = async (t) => {
    await t.page.waitForFunction(() => /trying again/.test(document.getElementById("stage")?.textContent || ""), null, { timeout: 15000 });
    await t.page.click("#btn-abort");
  };
  const { t, run, words } = await stopped([{ agent: "scanner", attempt: 1, cut: true }], { during });
  check(run.stopped?.reason === "aborted" && t.standIn.requests.length === 1 && run.unmetered > 0 && /aborted/.test(words) && /counts against your cap at its worst case/.test(words),
    `an Abort while a cut attempt waits for its retry says that the attempt counts: "${words}"`);
  await t.context.close();
}

// ---- a request left unanswered past the client's time limit counts, in Node -----------------------------------
// A proxy that buffers the event stream holds back an answer the API is writing; the shared client gives up after
// 90 s with a timeout_error and tries twice more. Each attempt's worst case is held.
{
  const { createPipeline, createLiveRun } = await import(pathToFileURL(path.join(APP_ROOT, "js/pipeline.js")).href);
  const { ApiError } = await import(pathToFileURL(path.join(APP_ROOT, "js/anthropic.js")).href);
  const { formOf } = await import("./lib/turns.mjs");
  const run = createLiveRun({ inputs: formOf("s3", "en"), lang: "en", today: "2026-11-24", setting: CONFIG.settingOf({ preset: "thorough" }), research: false, cap: 3 });
  const bodies = [];
  const stream = async ({ body }) => { bodies.push(structuredClone(body)); throw new ApiError({ status: 0, type: "timeout_error", message: "No response from the API within 90 s." }); };
  await createPipeline({ run, key: "sk-ant-api03-node-test-key-0000", stream }).scan();
  const held = bodies.reduce((a, b) => a + worstCaseEur(b), 0);
  check(bodies.length === 3 && run.stopped?.reason === "error" && Math.abs(run.unmetered - held) < 1e-12,
    `three attempts left unanswered past the time limit each count at their worst case (held €${run.unmetered.toFixed(4)} against €${held.toFixed(4)}, ${bodies.length} attempts)`);
}

await suite.done();
report(results, "LIVE BUDGET OK");
