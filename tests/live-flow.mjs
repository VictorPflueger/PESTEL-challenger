// A live run as a person goes through it (brief §5.3, §5.9 and §13; PLAN.md section 8), in Chromium
// against the stand-in:
//   - before anything runs, the key figures say what they wait for; after the scan, pressure and readiness
//     answer and the money waits for Assess; the session cost is the spend against the cap;
//   - while an agent works, its step shows the agent's role, what it does, the time and the spend so far,
//     and Abort; Play is off in a live run;
//   - the run goes from Start to Summary; "Save run as simulation" appears after a live run only and
//     downloads the run in the scenario format, which the scenario checker reads, curation aside;
//   - the browser's leave-page warning stands while a result is not downloaded, and not after;
//   - "Back to the simulation" keeps the run in this tab; "Clear everything" empties the session.
// Usage: node tests/live-flow.mjs
import { readFile } from "node:fs/promises";
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, pageProblems, waitIdle } from "./lib/live.mjs";
import { checkScenario } from "../js/scenario_check.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const tile = async (page, id) => ({ value: await text(page, `#kpi-${id} .kpi-value`), note: await text(page, `#kpi-${id} .kpi-note`) });

const t = await livePage(suite);
const p = t.page;
try {
  // The simulation's summary has no "Save run as simulation".
  await p.goto(`${suite.base}?guide=0&scenario=s3&step=5`);
  await p.waitForFunction(() => document.documentElement.dataset.ready === "true");
  check(!(await p.$("#btn-save-run")), "the simulation's summary offers no Save run as simulation");
  await p.click('.vc-step[data-step="start"] .vc-step__button');

  // Run it live from a Start scrolled down to its button: the form opens at its top, the notice in view.
  await p.$eval(".panel", (el) => { el.scrollTop = el.scrollHeight; });
  await p.click("#btn-run-live");
  await p.waitForSelector("#live-name");
  const top = await p.$eval(".panel", (el) => el.scrollTop);
  const notice = await p.$eval(".panel .public-note", (el) => { const r = el.getBoundingClientRect(); const pr = el.closest(".panel").getBoundingClientRect(); return r.top >= pr.top - 1; }).catch(() => false);
  check(top === 0 && notice, `the form opens at its top with the notice in view (scrolled ${top} px)`);

  await fillForm(p);
  const stake = await tile(p, "stake");
  const pressure = await tile(p, "pressure");
  const cost = await tile(p, "cost");
  check(stake.value === "…" && /after Assess/.test(stake.note) && pressure.value === "…" && /after the scan/.test(pressure.note), `before the run the figures say what they wait for ("${stake.note}", "${pressure.note}")`);
  check(/^€0\.00$/.test(cost.value) && /spent of your €0\.50 cap/.test(cost.note), `the session cost starts at nothing against the cap ("${cost.value}", "${cost.note}")`);
  check(await p.$eval("#btn-play", (b) => b.disabled), "Play is off in a live run");

  // The wait, held at the Scanner.
  const release = t.net.holdAt(0);
  await p.click("#btn-cta");
  await p.waitForSelector("#live-dialog[open]");
  await p.fill("#live-key", (await import("./lib/live.mjs")).MOCK_KEY);
  await p.check("#live-ack");
  await p.click("#live-start");
  await t.net.held(0);
  await p.waitForSelector(".work-card");
  const sent = await text(p, ".work-figures > div:nth-child(3) dd");
  check(sent === "1 of at most 10", `the request counts as soon as it goes out ("${sent}")`);
  check(!(await p.$(".work-steps")), "with one agent at work, no list of agents repeats its name");
  const role = await text(p, ".work-role");
  const lead = await text(p, ".story-lead");
  const t0 = await text(p, ".work-time");
  await p.waitForTimeout(2100);
  const t1 = await text(p, ".work-time");
  check(role === "Scanner" && /completes each of the six headings/.test(lead), `while the Scanner works, the step names it and says what it does ("${lead.slice(0, 60)}…")`);
  check(t0 !== t1 && /^\d+:\d\d$/.test(t1), `the time so far counts up (${t0} → ${t1})`);
  check(/of your €0\.50 cap/.test(await text(p, ".work-spent")) && !!(await p.$("#btn-abort")), "with the spend against the cap, and Abort");
  check((await tile(p, "stake")).value === "…", "the figures keep waiting");
  release();
  await waitIdle(p);
  const after = { stake: await tile(p, "stake"), pressure: await tile(p, "pressure"), readiness: await tile(p, "readiness") };
  check(after.pressure.value !== "…" && after.readiness.value !== "…" && after.stake.value === "…", `after the scan, pressure and readiness answer, the money waits (${after.pressure.value}, ${after.readiness.value}, ${after.stake.value})`);
  check(await p.$eval('.vc-step[data-step="assess"] .vc-step__button', (b) => b.disabled), "the steps not yet run stay closed");

  await challenge(p);
  check(/Challenge/.test(await text(p, ".vc-step--current")) && (await p.$$(".issue")).length > 0, "after the agents, the run opens at Challenge with the corrections");
  check((await tile(p, "stake")).value !== "…", "after Assess, the money at stake answers");
  await adopt(p);
  check(/Summary/.test(await text(p, ".vc-step--current")) && !!(await runOf(p)).summary, "the run reaches its summary");

  // The leave-page warning, before the download.
  const asked = await p.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  check(asked, "with a result not downloaded, leaving the page asks first");

  // Save run as simulation.
  check(/Save run as simulation/.test(await text(p, "#btn-save-run")), "after a live run, Save run as simulation is offered");
  const [download] = await Promise.all([p.waitForEvent("download"), p.click("#btn-save-run")]);
  const name = download.suggestedFilename();
  const sc = JSON.parse(await readFile(await download.path(), "utf8"));
  check(/^pestel-challenger-auental-energie-\d{4}-\d{2}-\d{2}-en-run\.json$/.test(name), `the file is named for the company, the date and the language (${name})`);
  const problems = checkScenario(sc).problems;
  // The German texts are left empty, so their placeholders differ from the English ones until curated.
  const curation = (m) => /is empty in German|different placeholders in English and German|^scenario id|^scenario company\.fictional|^texts\.de\.\w+ is (empty|missing)|^de: |\(de\): /.test(m);
  check(sc.source === "recorded" && sc.answers.scanner && sc.answers.writer && sc.choices.length > 0 && sc.frozen?.before, "it holds the run in the scenario format: the answers, the choices and the frozen figures");
  check(problems.length > 0 && problems.every(curation), `the scenario checker asks only for curation: a fictional name, the German texts (${problems.filter((m) => !curation(m)).slice(0, 3).join("; ") || `${problems.length} curation items`})`);
  const asked2 = await p.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
  check(!asked2, "once downloaded, leaving the page asks nothing");

  // Back to the simulation keeps the run; Run it live returns to it.
  await p.click('.vc-step[data-step="start"] .vc-step__button');
  await p.click("#btn-back-sim");
  check((await text(p, "#mode-tag")) === "SIMULATION" && !!(await p.$("#btn-run-live")), "Back to the simulation shows the recorded runs");
  await p.click("#btn-run-live");
  check(/Summary/.test(await text(p, ".vc-step--current")) && !!(await runOf(p))?.summary, "Run it live returns to the run this tab holds");

  // Clear everything.
  await p.click('.vc-step[data-step="start"] .vc-step__button');
  await p.click("#btn-clear");
  check(/Clear now/.test(await text(p, "#btn-clear")) && (await runOf(p)) !== null, "Clear everything asks once before it clears");
  await p.click("#btn-clear");
  check((await runOf(p)) === null && (await p.$eval("#live-name", (e) => e.value)) === "" && !(await p.$eval("#live-name", (e) => e.disabled)), "a second press empties the form and the run");
  await fillForm(p);
  await p.click("#btn-cta");
  await p.waitForSelector("#live-dialog[open]");
  check(await p.$eval("#live-current", (e) => e.hidden), "and forgets the key");
  check(/Your last run in this tab: €0\.\d\d in under a minute/.test(await text(p, "#live-estimate")), `the estimate shows what the last run cost and took ("${await text(p, "#live-estimate")}")`);
} catch (e) {
  check(false, `live flow: ${e.message.split("\n")[0]}`);
}
const problems = await pageProblems(t);
check(!problems.length, `no page error, policy violation or protocol fault${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
await t.context.close();
await suite.done();
report(results, "LIVE FLOW OK");
