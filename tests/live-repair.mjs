// One repair, then stop (brief §5.2, AC-08 and AC-19), in Chromium against the stand-in:
//   - an answer that breaks a refusal goes back once with its problems listed, and the run goes on;
//   - an answer that fails twice stops the run at that step, keeps what is done and offers Thorough;
//   - an answer cut off at the token limit gets the same one repair;
//   - a third failing answer, after the run's two repairs, stops at once and says so;
//   - an answer whose only fault is a figure in its text, twice, stays with an "Unchecked" tag;
//   - Abort during a request stops the run there and keeps what is done.
// Usage: node tests/live-repair.mjs
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, pageProblems, waitIdle } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const agents = (t) => t.standIn.requests.map((r) => r.agent);
const count = (t, a) => agents(t).filter((x) => x === a).length;

async function scenario(name, standIn, body) {
  const t = await livePage(suite, { standIn });
  try { await body(t); } catch (e) { check(false, `${name}: ${e.message.split("\n")[0]}`); }
  const problems = await pageProblems(t);
  check(!problems.length, `${name}: no page error, policy violation or protocol fault${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
  await t.context.close();
}

// One repair, and the run goes on.
await scenario("repair", { faults: [{ agent: "scanner", attempt: 1, mutate: (a) => { a.factors[0].readiness = 7; return a; } }] }, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  const second = t.standIn.requests.filter((r) => r.agent === "scanner")[1]?.req;
  check(count(t, "scanner") === 2, `a refused answer gets exactly one repair (${count(t, "scanner")} Scanner requests)`);
  check(second?.messages?.length === 3 && second.messages[1].role === "assistant" && /a readiness level outside 1 to 5/.test(second.messages[2].content), "the repair sends the answer back with the refusal's message");
  const run = await runOf(t.page);
  check(run.repairs === 1 && run.log.filter((x) => x.repair).length === 1 && run.scan && !run.stopped, `the repaired answer is used and the run waits at Scan (repairs ${run.repairs})`);
  check(/Your turn/.test(await text(t.page, ".turn")), "the person's turn comes at Scan after the repair");
});

// Twice: the run stops at that step, keeps the scan and offers Thorough.
const unknown = (a) => { a.issues[0].correction.factor = "zz9"; a.issues[0].factors = ["zz9"]; return a; };
await scenario("stop", { faults: [{ agent: "red_team", attempt: 1, mutate: unknown }, { agent: "red_team", attempt: 2, mutate: unknown }] }, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  await challenge(t.page);
  check(count(t, "red_team") === 2 && !agents(t).includes("analyst"), `a second failure stops the run: no third try, no next agent (${agents(t).join(" ")})`);
  check(/failed its checks twice/.test(await text(t.page, ".stop-alert")), `the step says the answer failed its checks twice: "${await text(t.page, ".stop-alert")}"`);
  check(/Thorough/.test(await text(t.page, "#btn-cta")), "the next step offers the Thorough setting");
  check(!!(await t.page.$("#btn-back-sim")), "and the way back to the simulation");
  const run = await runOf(t.page);
  check(run.stopped?.reason === "checks" && run.scan && !run.issues, "what was done, the scan, stays; the issues are not taken");
  await t.page.click('.vc-step[data-step="scan"] .vc-step__button');
  check(/agents add/.test(await text(t.page, "#step-title")), "the scan can still be opened");
});

// Cut off at the token limit: the same one repair.
await scenario("cut", { faults: [{ agent: "analyst", attempt: 1, stop: "max_tokens" }] }, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  await challenge(t.page);
  const second = t.standIn.requests.filter((r) => r.agent === "analyst")[1]?.req;
  check(count(t, "analyst") === 2 && /cut off at the token limit/.test(second?.messages?.[2]?.content || ""), "an answer cut off at max_tokens is sent back once, saying so");
  check((await runOf(t.page)).responses, "and the run reaches Respond");
});

// After two repairs, a third failure stops at once.
const badRange = (a) => { const x = a.impacts.find((y) => y.eur_year_low !== null); [x.eur_year_low, x.eur_year_high] = [x.eur_year_high + 1, x.eur_year_low]; return a; };
await scenario("repairs used", { faults: [
  { agent: "scanner", attempt: 1, mutate: (a) => { a.factors[0].readiness = 7; return a; } },
  { agent: "red_team", attempt: 1, mutate: unknown },
  { agent: "analyst", attempt: 1, mutate: badRange },
] }, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  await challenge(t.page);
  check(count(t, "analyst") === 1 && t.standIn.requests.length === 5, `with both repairs used, the third failure gets none (${agents(t).join(" ")})`);
  check(/used its two repairs/.test(await text(t.page, ".stop-alert")), `and the step says so: "${await text(t.page, ".stop-alert")}"`);
});

// The audit alone, twice: the text stays, tagged Unchecked.
const digits = (a) => { a.summary.situation = "Prices rose by 12 % last year."; return a; };
await scenario("unchecked", { faults: [{ agent: "writer", attempt: 1, mutate: digits }, { agent: "writer", attempt: 2, mutate: digits }] }, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  await challenge(t.page);
  await adopt(t.page);
  const run = await runOf(t.page);
  check(count(t, "writer") === 2 && run.summary && !run.stopped && run.unchecked.includes("summary"), "a text that writes a figure twice is kept, not stopped");
  check(/Unchecked/.test(await text(t.page, ".summary-unchecked")), "and shows with the Unchecked tag and why");
});

// Abort during a request: the run stops there and keeps what is done.
await scenario("abort", {}, async (t) => {
  await fillForm(t.page);
  await startRun(t.page);
  const release = t.net.holdAt(2);
  await t.page.click("#btn-cta");
  await t.net.held(2);
  await t.page.waitForSelector(".work-card");
  check(/Analyst/.test(await text(t.page, ".work-role")), "while the request waits, the step shows the agent at work");
  await t.page.click("#btn-abort");
  release();
  await waitIdle(t.page);
  check(/aborted/.test(await text(t.page, ".stop-alert")), `Abort stops the run: "${await text(t.page, ".stop-alert")}"`);
  const run = await runOf(t.page);
  check(run.stopped?.reason === "aborted" && run.issues && !run.impacts, "the issues stay; nothing after them is taken");
  await t.page.click('.vc-step[data-step="challenge"] .vc-step__button');
  check(/Red team finds/.test(await text(t.page, "#step-title")), "the challenge can still be opened");
});

await suite.done();
report(results, "LIVE REPAIR OK");
