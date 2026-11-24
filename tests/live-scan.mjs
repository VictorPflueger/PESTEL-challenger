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

  // Every AI factor's editor opens with its field focused and the notice in view, above the "Your turn" bar,
  // at 1280 × 720: in a short list the field alone would scroll to the list's edge and leave the notice below.
  const noticeInView = (id, part = "public") => p.evaluate(([id, part]) => {
    const note = document.getElementById(`edit-${id}-${part}`);
    const field = document.getElementById(`edit-${id}-text`);
    if (!note || !field) return { ok: false, why: "no editor" };
    let box = note.parentElement;
    while (box && box !== document.body && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
    const area = (box && box !== document.body ? box : document.documentElement).getBoundingClientRect();
    const bar = document.querySelector(".turn-bar")?.getBoundingClientRect();
    const bottom = Math.min(area.bottom, bar ? bar.top : innerHeight, innerHeight);
    const n = note.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    return { ok: document.activeElement === field && n.top >= area.top - 1 && n.bottom <= bottom + 1 && f.top >= area.top - 1, why: `${part} ${Math.round(n.top)} to ${Math.round(n.bottom)}, view ${Math.round(area.top)} to ${Math.round(bottom)}` };
  }, [id, part]);
  const hidden = [];
  for (const f of run.scan.factors) {
    await p.click(`.vc-ring__cell[data-dim="${f.dimension}"]`);
    await p.click(`[data-id="${f.id}"] > details > summary`);
    await p.click(`[data-id="${f.id}"] .item-edit`);
    const seen = await noticeInView(f.id);
    if (!seen.ok) hidden.push(`${f.id} (${seen.why})`);
    await p.click(`[data-id="${f.id}"] .item-cancel`);
  }
  check(!hidden.length, `each of the ${run.scan.factors.length} AI factors' editors opens with the field focused and "Public information only" in view${hidden.length ? `; not: ${hidden.slice(0, 3).join("; ")}` : ""}`);

  // Edit one, remove one, put one back.
  const [first, second, third] = run.scan.factors;
  await p.click(`.vc-ring__cell[data-dim="${first.dimension}"]`);
  await p.click(`[data-id="${first.id}"] > details > summary`);
  await p.click(`[data-id="${first.id}"] .item-edit`);
  // Where the person types, the page says what may go in, and warns when the words look private.
  const editor = async () => p.evaluate((id) => {
    const field = document.getElementById(`edit-${id}-text`);
    const note = document.getElementById(`edit-${id}-public`);
    const warn = document.getElementById(`edit-${id}-warning`);
    const seen = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
    return { notice: seen(note) ? note.textContent.trim() : null, warning: seen(warn) ? warn.textContent.trim() : null, described: field.getAttribute("aria-describedby") || "" };
  }, first.id);
  const opened = await editor();
  check(opened.notice === "Public information only: never enter confidential, personal or otherwise protected data." && opened.described.includes(`edit-${first.id}-public`) && !opened.warning,
    `the editor says "Public information only" under the wording, tied to the field, and warns of nothing yet (${opened.notice})`);
  await p.fill(`#edit-${first.id}-text`, "Internal memo: call 030 1234 5678");
  const warned = await editor();
  check(/internal/.test(warned.warning || "") && /phone number/.test(warned.warning || "") && warned.described.includes(`edit-${first.id}-warning`),
    `typing private-looking words warns in the editor, without blocking (${warned.warning})`);
  const warnSeen = await noticeInView(first.id, "warning");
  check(warnSeen.ok, `and the warning comes into view with the field (${warnSeen.why})`);
  await p.fill(`#edit-${first.id}-text`, "Edited by the person: a steeper CO2 price path");
  check(!(await editor()).warning, "and the warning goes once the words are public again");
  // A key pasted into the editor by mistake: the warning names it, and the saved words hold it redacted.
  const keyLike = ["sk", "ant", "api03", "Zq7xEditorPaste000000000"].join("-");
  await p.fill(`#edit-${first.id}-text`, `CO2 path ${keyLike}`);
  check(/API key/.test((await editor()).warning || ""), "a key-shaped text in the editor is named in its warning");
  await p.fill(`#edit-${first.id}-text`, `Steeper CO2 path ${keyLike}`);
  await p.click(`[data-id="${first.id}"] .item-save`);
  const savedText = await text(p, `[data-id="${first.id}"] summary`);
  check(!savedText.includes(keyLike) && /sk-ant-\[REDACTED\]/.test(savedText), `and the saved words hold it redacted ("${savedText.slice(0, 80)}")`);
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

// The editor warns only of what the person brings in: an AI factor's own "internal" raises nothing, a
// "confidential" the person types does.
{
  const own = "EU internal market rules for heat change";
  const t2 = await livePage(suite, { standIn: { faults: [{ agent: "scanner", attempt: 1, mutate: (a) => { a.factors[0].text = own; return a; } }] } });
  const q = t2.page;
  try {
    await fillForm(q);
    // A long German company name: the ring's centre takes a smaller size and marks the name German, so the
    // browser breaks its long words at a syllable.
    await q.fill("#live-name", "Stadtwerke Musterstadt Versorgungs- und Verkehrsgesellschaft mbH");
    await startRun(q);
    const centre = await q.$eval(".ring .vc-ring__centre", (el) => ({ size: el.dataset.name, lang: el.querySelector(".vc-ring__name").getAttribute("lang") }));
    check(centre.size === "longer" && centre.lang === "de", `a 64-character German company name steps down and is marked German in the ring (${JSON.stringify(centre)})`);
    const f = (await runOf(q)).scan.factors[0];
    await q.click(`.vc-ring__cell[data-dim="${f.dimension}"]`);
    await q.click(`[data-id="${f.id}"] > details > summary`);
    await q.click(`[data-id="${f.id}"] .item-edit`);
    const shown = () => q.$eval(`#edit-${f.id}-warning`, (el) => (el.hidden ? "" : el.textContent.trim()));
    check(!(await shown()), `an AI factor's own words ("${own}") open the editor without a warning`);
    await q.fill(`#edit-${f.id}-text`, `${own}, confidential draft`);
    const said = await shown();
    check(/confidential/.test(said) && !/internal/.test(said), `a word the person adds is named, the AI's own is not ("${said}")`);
  } catch (e) {
    check(false, `editor warning: ${e.message.split("\n")[0]}`);
  }
  await t2.context.close();
}
await suite.done();
report(results, "LIVE SCAN OK");
