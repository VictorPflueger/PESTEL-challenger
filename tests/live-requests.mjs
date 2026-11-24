// What every request of a live run sends (brief §5.2 and §5.4, AC-08), in Chromium against the stand-in,
// which checks each request as it arrives (tests/lib/fake-claude.mjs): a run on each setting sends the
// setting's model, effort and thinking (Fast: thinking off, "disabled" on Haiku 5.5 and "between_tools" on
// Sonnet 5.5; Balanced and Thorough: the field left out), both headers, stream on, each agent's own format
// or the Scout's two tools, and max_tokens of the step; one request per agent, at most ten in all; and the
// agents write in the page's language, which the run carries.
// Usage: node tests/live-requests.mjs
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, pageProblems, CONFIG } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const ORDER = ["scanner", "red_team", "analyst", "strategist", "writer"];

const RUNS = [
  { name: "Fast", preset: "fast", expect: { model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } } },
  { name: "Balanced", preset: "balanced", expect: { model: "claude-haiku-5-5", effort: "medium", thinking: null } },
  { name: "Thorough", preset: "thorough", expect: { model: "claude-sonnet-5-5", effort: "medium", thinking: null } },
  { name: "Fast on Sonnet 5.5 at high effort", preset: "fast", advanced: { model: "claude-sonnet-5-5", effort: "high" }, expect: { model: "claude-sonnet-5-5", effort: "high", thinking: { type: "between_tools" } } },
  { name: "Balanced with research, in German", preset: "balanced", research: true, lang: "de", expect: { model: "claude-haiku-5-5", effort: "medium", thinking: null } },
];

for (const r of RUNS) {
  const lang = r.lang || "en";
  const t = await livePage(suite, { lang, standIn: { expect: r.expect } });
  try {
    await fillForm(t.page, { lang });
    await startRun(t.page, { preset: r.preset, research: !!r.research, advanced: r.advanced || null });
    await challenge(t.page);
    await adopt(t.page);
    const agents = t.standIn.requests.map((x) => x.agent);
    const want = r.research ? ["scout", ...ORDER] : ORDER;
    check(JSON.stringify(agents) === JSON.stringify(want), `${r.name}: one request per agent, in order (${agents.join(" ")})`);
    check(t.standIn.requests.length <= CONFIG.MAX_REQUESTS, `${r.name}: ${t.standIn.requests.length} requests, at most ${CONFIG.MAX_REQUESTS}`);
    check(!t.standIn.violations.length, `${r.name}: every request sends ${r.expect.model}, effort ${r.expect.effort}, thinking ${r.expect.thinking ? r.expect.thinking.type : "left out"}, both headers, stream on and its format or tools${t.standIn.violations.length ? `: ${t.standIn.violations.slice(0, 3).join("; ")}` : ""}`);
    check(t.standIn.requests.every((x) => x.req.max_tokens === CONFIG.MAX_TOKENS[x.agent]), `${r.name}: each step sends its max_tokens (${t.standIn.requests.map((x) => x.req.max_tokens).join(", ")})`);
    const run = await runOf(t.page);
    const language = lang === "de" ? "German" : "English";
    check(run.lang === lang && t.standIn.requests.every((x) => x.req.system.includes(`Write every text field in ${language}`)), `${r.name}: the agents write in the page's language (${language}), and the run says so`);
    check(!!run.summary && !run.stopped, `${r.name}: the run reaches its summary`);
    const problems = await pageProblems(t);
    check(!problems.length, `${r.name}: no page error, policy violation or protocol fault${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
  } catch (e) {
    check(false, `${r.name}: ${e.message.split("\n")[0]}`);
  }
  await t.context.close();
}

// The stand-in's checks can fail: a run that expects another model reports every request.
{
  const t = await livePage(suite, { standIn: { expect: { model: "claude-sonnet-5-5", effort: "medium", thinking: null } } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "balanced" });
  check(t.standIn.violations.some((v) => /model claude-haiku-5-5, expected claude-sonnet-5-5/.test(v)), "control: a request with another model than expected is reported");
  await t.context.close();
}

await suite.done();
report(results, "LIVE REQUESTS OK");
