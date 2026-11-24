// The person's say over what the AI adds (brief §6.2, AC-18), in Chromium against the stand-in:
//   - the Scanner never changes or removes a factor the person entered: their words stand as typed;
//   - every AI factor shows "AI", its basis and its confidence;
//   - before the challenge the person keeps, edits or removes each AI factor, and the Red team reads the
//     factors as the person left them; a removed factor can be put back;
//   - once the challenge has run, Scan no longer offers to change anything;
//   - every correction of the challenge shows its reason and can be undone, and the figures follow.
// The page keeps "65 %" on one line with a no-break space; the comparison reads it as a space.
// Usage: node tests/live-scan.mjs
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, runOf, pageProblems } from "./lib/live.mjs";
import { DIMENSIONS } from "../js/engine.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");

const t = await livePage(suite);
const p = t.page;
try {
  const form = await fillForm(p);
  await startRun(p);
  const run = await runOf(p);

  // The person's factors, word for word.
  const seen = [];
  const ai = [];
  for (const d of DIMENSIONS) {
    await p.click(`.vc-ring__cell[data-dim="${d}"]`);
    const items = await p.$$eval(".dim-panel .vc-item", (els) => els.map((e) => ({
      id: e.closest("[data-id]").dataset.id, source: e.dataset.source, text: [...e.querySelector(".vc-item__text").childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim().replace(/\u00a0/g, " "),
      tag: e.querySelector(".vc-item__state--source")?.textContent ?? "",
    })));
    for (const it of items) (it.source === "entered" ? seen : ai).push(it);
    // Open each AI item: its basis and its confidence.
    for (const it of items.filter((x) => x.source === "ai")) {
      await p.click(`[data-id="${it.id}"] > details > summary`);
      it.body = await text(p, `[data-id="${it.id}"] .vc-item__body`);
      await p.click(`[data-id="${it.id}"] > details > summary`);
    }
  }
  check(form.factors.every((f) => seen.some((s) => s.text === f.text)) && seen.length === form.factors.length, `the person's ${form.factors.length} factors stand as typed (${seen.map((s) => s.text).join(" | ")})`);
  check(run.team.every((f, i) => f.text === form.factors[i].text), "the run keeps them word for word");
  check(ai.length === run.scan.factors.length && ai.every((x) => x.tag === "AI"), `every AI factor says "AI" (${ai.length})`);
  check(ai.every((x) => /Why:/.test(x.body) && /Confidence: (low|medium|high)\./.test(x.body)), "and shows its basis and its confidence");

  // Edit one, remove one, put one back.
  const [first, second, third] = run.scan.factors;
  await p.click(`.vc-ring__cell[data-dim="${first.dimension}"]`);
  await p.click(`[data-id="${first.id}"] > details > summary`);
  await p.click(`[data-id="${first.id}"] .item-edit`);
  await p.fill(`#edit-${first.id}-text`, "Edited by the person: a steeper CO2 price path");
  await p.selectOption(`#edit-${first.id}-impact`, "5");
  await p.click(`[data-id="${first.id}"] .item-save`);
  check(/Edited by you/.test(await text(p, `[data-id="${first.id}"] summary`)) && /steeper CO2 price path/.test(await text(p, `[data-id="${first.id}"] summary`)), "an edited AI factor shows the new words and says it was edited");
  await p.click(`.vc-ring__cell[data-dim="${second.dimension}"]`);
  await p.click(`[data-id="${second.id}"] > details > summary`);
  await p.click(`[data-id="${second.id}"] .item-remove`);
  check(!(await p.$(`[data-id="${second.id}"]`)) && (await text(p, ".removed")).includes(second.text), "a removed AI factor leaves the list and stands under Removed by you");
  await p.click(`.vc-ring__cell[data-dim="${third.dimension}"]`);
  await p.click(`[data-id="${third.id}"] > details > summary`);
  await p.click(`[data-id="${third.id}"] .item-remove`);
  await p.click(".item-putback");
  check(!!(await p.$(`[data-id="${third.id}"]`)), "Put back returns it");

  await challenge(p);
  const red = t.standIn.requests.find((r) => r.agent === "red_team")?.req;
  const sent = JSON.parse(/<analysis>([\s\S]*)<\/analysis>/.exec(red.messages[0].content)[1]).factors;
  const firstSent = sent.find((f) => f.id === first.id);
  check(firstSent?.text === "Edited by the person: a steeper CO2 price path" && firstSent?.impact === 5, "the Red team reads the edited words and rating");
  check(!sent.some((f) => f.id === second.id) && sent.some((f) => f.id === third.id), "and not the removed factor; the one put back is there");
  check(form.factors.every((f) => sent.some((s) => s.text === f.text && s.source === "user")), "the person's own factors reach it unchanged");

  // Once challenged, Scan changes nothing more.
  await p.click('.vc-step[data-step="scan"] .vc-step__button');
  check(!(await p.$(".item-edit")) && !(await p.$(".item-remove")), "after the challenge, Scan offers no edit or remove");

  // Each correction: its reason, and Undo.
  await p.click('.vc-step[data-step="challenge"] .vc-step__button');
  const cards = await p.$$eval(".issue", (els) => els.map((e) => ({ id: e.dataset.id, reason: e.querySelector(".issue-reason")?.textContent.trim(), undo: !!e.querySelector(".issue-undo") })));
  check(cards.length === (await runOf(p)).issues.length && cards.every((c) => c.reason && c.undo), `every correction shows its reason and an Undo (${cards.length})`);
  const before = await text(p, "#kpi-pressure .kpi-value");
  const title = await text(p, "#step-title");
  await p.click('.issue[data-id="i1"] .issue-undo');
  const after = await text(p, "#step-title");
  check(/Undone/.test(await text(p, '.issue[data-id="i1"] .issue-fix')) && (after !== title || (await text(p, "#kpi-pressure .kpi-value")) !== before), `Undo puts the factor back and the figures follow ("${title}" → "${after}")`);
  await p.click('.issue[data-id="i1"] .issue-undo');
  check((await text(p, "#step-title")) === title, "Apply again restores it");
} catch (e) {
  check(false, `live scan: ${e.message.split("\n")[0]}`);
}
const problems = await pageProblems(t);
check(!problems.length, `no page error, policy violation or protocol fault${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
await t.context.close();
await suite.done();
report(results, "LIVE SCAN OK");
