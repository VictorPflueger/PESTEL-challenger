// Web research (brief §5.7, AC-12), in Chromium against the stand-in:
//   - with research on, the Scout's signals carry their source, the date published and the date read, and
//     only addresses from this request's own search results are kept: a foreign one is refused with
//     is_error, once, and dropped if the Scout cites it again;
//   - pause_turn is sent again unchanged (the stand-in checks every assistant turn comes back as sent);
//   - a turn that ends without the report gets one repair;
//   - an organisation with web search switched off goes on without research and is told so;
//   - without research, Scan and Summary say once that the models know the world only up to June 2026;
//   - the cap counts the searches a Scout request may still run: max_uses counts per turn, which a pause_turn
//     continues and the repair's new instruction starts again (web search tool page, read 24 November 2026).
// Usage: node tests/live-research.mjs
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, pageProblems } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const today = new Date().toISOString().slice(0, 10);
const scouts = (t) => t.standIn.requests.filter((r) => r.agent === "scout").length;

async function scenario(name, standIn, body, { research = true } = {}) {
  const t = await livePage(suite, { standIn });
  try {
    await fillForm(t.page);
    await startRun(t.page, { research });
    await body(t);
  } catch (e) { check(false, `${name}: ${e.message.split("\n")[0]}`); }
  const problems = (await pageProblems(t)).filter((p) => !/^console: Failed to load resource/.test(p));
  check(!problems.length, `${name}: no page error, policy violation or protocol fault${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
  await t.context.close();
}

await scenario("research", {}, async (t) => {
  const run = await runOf(t.page);
  const urls = new Set(t.standIn.answers.scout.signals.map((s) => s.url));
  check(run.research && run.signals.length === urls.size && run.signals.every((s) => urls.has(s.url) && s.read_on && s.title), `the Scout's ${run.signals.length} signals keep their source and the date read`);
  check(run.signals.every((s) => s.published === null || /^\d{4}-\d{2}-\d{2}$/.test(s.published)), "each signal's date published is a date or none");
  check(/7 signals from recent news/.test(await text(t.page, ".signals > summary")), "Scan lists the signals, each with its dates");
  await t.page.click(".signals > summary");
  check(/published .* 2026, read/.test(await text(t.page, ".signal-list li")), `a signal shows when it was published and read ("${(await text(t.page, ".signal-list li")).slice(0, 120)}")`);
  const cited = (run.scan.factors || []).flatMap((f) => f.evidence || []);
  check(cited.length > 0 && cited.every((u) => urls.has(u)), "the factors cite only the signals' addresses");
});

await scenario("foreign address", { faults: [{ agent: "scout", scout: "foreign" }] }, async (t) => {
  const run = await runOf(t.page);
  check(scouts(t) === 2, `a report citing an address no search returned is sent back once (${scouts(t)} Scout requests)`);
  check(!run.signals.some((s) => /made-up\.example/.test(s.url)), "and the address is not kept");
});

await scenario("foreign twice", { faults: [{ agent: "scout", scout: "foreign", again: true }] }, async (t) => {
  const run = await runOf(t.page);
  check(scouts(t) === 2 && !run.signals.some((s) => /made-up\.example/.test(s.url)) && run.signals.length > 0, "cited again, it is dropped and the rest kept, with no third round");
});

await scenario("pause_turn", { faults: [{ agent: "scout", scout: "pause" }] }, async (t) => {
  const second = t.standIn.requests.filter((r) => r.agent === "scout")[1]?.req;
  check(scouts(t) === 2 && second?.messages?.length === 2 && second.messages[1].role === "assistant", "after pause_turn the conversation goes back with the paused turn and nothing else");
  check((await runOf(t.page)).signals.length > 0, "and the Scout's report follows");
});

await scenario("no report", { faults: [{ agent: "scout", scout: "noSubmit" }] }, async (t) => {
  const run = await runOf(t.page);
  const second = t.standIn.requests.filter((r) => r.agent === "scout")[1]?.req;
  check(scouts(t) === 2 && /Call submit_signals now/.test(second?.messages?.at(-1)?.content || "") && run.repairs === 1 && run.signals.length > 0, "a turn without the report gets one repair, which counts as one of the run's two");
});

await scenario("search switched off", { faults: [{ agent: "scout", scout: "searchOff" }] }, async (t) => {
  const run = await runOf(t.page);
  const scanner = t.standIn.requests.find((r) => r.agent === "scanner")?.req;
  check(run.searchOff && !run.research && run.scan && !run.stopped, "an organisation without web search goes on without research");
  check(/Web search is switched off for your organisation/.test(await text(t.page, ".live-notice")), "and the scan says so");
  check(/only up to June 2026/.test(await text(t.page, ".cutoff-note")), "with the knowledge-cutoff note in place of signals");
  check(!/"signals":\[\{/.test(scanner?.messages?.[0]?.content || ""), "the Scanner gets no signals");
});

await scenario("no research", {}, async (t) => {
  check(scouts(t) === 0, "with research off, no Scout request");
  check(/know the world only up to June 2026/.test(await text(t.page, ".cutoff-note")), "Scan says the models know the world only up to June 2026");
  await challenge(t.page);
  await adopt(t.page);
  check(/only up to June 2026/.test(await text(t.page, ".summary .cutoff-note")), "and the summary says it once, by its sources");
}, { research: false });

// ---- the searches each Scout request may run, for the cap's worst case, in Node ------------------------------
{
  const { runScout, SUBMIT_SIGNALS } = await import("../js/agents/scout.js");
  const { settingOf, ANTHROPIC } = await import("../js/config.js");
  const { formOf } = await import("./lib/turns.mjs");
  const search = (n) => ({ type: "server_tool_use", id: `srvtoolu_${n}`, name: "web_search", input: { query: `q${n}` } });
  const found = (n) => ({ type: "web_search_tool_result", tool_use_id: `srvtoolu_${n}`, content: [{ type: "web_search_result", url: `https://example.org/${n}`, title: `t${n}`, page_age: null }] });
  const answers = [
    { stop_reason: "pause_turn", content: [search(1), found(1), search(2), found(2)] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "I searched." }] },
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "toolu_1", name: SUBMIT_SIGNALS.name, input: { signals: [] } }] },
  ];
  const asked = [];
  const send = async (body, o) => { asked.push(o.searches); return answers[asked.length - 1]; };
  const inputs = formOf("s3", "en");
  await runScout({ send, inputs: { company: inputs.company, factors: inputs.factors.map((f, i) => ({ id: `u${i + 1}`, ...f })) }, lang: "en", today: "2026-11-24", setting: settingOf({ preset: "balanced" }), maxTokens: 8000, repairs: { left: () => 1, use: () => {} } });
  const max = ANTHROPIC.webSearchTool.max_uses;
  check(JSON.stringify(asked) === JSON.stringify([max, max - 2, max]),
    `the cap counts the searches each Scout request may run: ${max}, then ${max - 2} after two in the paused turn, then ${max} again for the repair's new turn (${asked.join(", ")})`);
}

await suite.done();
report(results, "LIVE RESEARCH OK");
