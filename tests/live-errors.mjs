// Errors and retries (brief §5.8, AC-10), in Chromium against the stand-in: each failure the API can
// return shows its plain message with one next step, in English and German, and the retries follow the
// shared client: twice, after 1.5 s and 4 s or after retry-after (at most 20 s), for 429, 500 to 504, 529
// and network errors; never for a credit or spend limit, and never for 401, 403 or 404. A failure that
// clears on the retry lets the run go on.
// Usage: node tests/live-errors.mjs
import { report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, runOf, pageProblems } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");

const err = (status, type, message, headers) => ({ status, type, message, ...(headers ? { headers } : {}) });
const thrice = (fault) => [1, 2, 3].map((attempt) => ({ agent: "scanner", attempt, ...fault }));
const CASES = [
  { name: "401", faults: thrice({ error: err(401, "authentication_error", "invalid x-api-key") }), tries: 1, say: /rejected the key/, de: /hat den Schlüssel abgelehnt/ },
  { name: "403", faults: thrice({ error: err(403, "permission_error", "Your API key does not have permission to use the specified resource.") }), tries: 1, say: /may not use this model/ },
  { name: "404", faults: thrice({ error: err(404, "not_found_error", "model: claude-haiku-5-5") }), tries: 1, say: /may not use this model/ },
  { name: "400, no credit", faults: thrice({ error: err(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.") }), tries: 1, say: /no credit left/, de: /kein Guthaben mehr/ },
  { name: "400, spend limit", faults: thrice({ error: err(400, "invalid_request_error", "You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC.") }), tries: 1, say: /spend limit you set/ },
  { name: "429, spend limit", faults: thrice({ error: err(429, "rate_limit_error", "This request would exceed your organization's spend limit.") }), tries: 1, say: /spend limit you set/ },
  { name: "429, rate limit with retry-after", faults: thrice({ error: err(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit", { "retry-after": "1" }) }), tries: 3, gaps: [1000, 1000], say: /Too many requests/ },
  { name: "529", faults: thrice({ error: err(529, "overloaded_error", "Overloaded") }), tries: 3, gaps: [1500, 4000], say: /service is busy/, de: /Dienst ist ausgelastet/ },
  { name: "500", faults: thrice({ error: err(500, "api_error", "Internal server error") }), tries: 3, gaps: [1500, 4000], say: /had a fault \(500\)/ },
  { name: "network", faults: thrice({ network: true }), tries: 3, gaps: [1500, 4000], say: /could not reach the API/ },
];

for (const c of CASES) {
  for (const lang of c.de ? ["en", "de"] : ["en"]) {
    const t = await livePage(suite, { lang, standIn: { faults: c.faults } });
    try {
      await fillForm(t.page, { lang });
      await startRun(t.page);
      const tries = t.standIn.requests.length;
      const gaps = t.standIn.requests.slice(1).map((r, i) => r.at - t.standIn.requests[i].at);
      check(tries === c.tries, `${c.name} (${lang}): ${c.tries === 1 ? "not retried" : "tried three times"} (${tries} request${tries === 1 ? "" : "s"})`);
      if (c.gaps) check(gaps.length === c.gaps.length && gaps.every((g, i) => g >= c.gaps[i] - 150 && g <= c.gaps[i] + 1500), `${c.name}: waits ${c.gaps.map((g) => `${g / 1000} s`).join(" and ")} (${gaps.map((g) => `${(g / 1000).toFixed(1)} s`).join(", ")})`);
      const said = await text(t.page, ".stop-alert");
      check((lang === "de" ? c.de : c.say).test(said), `${c.name} (${lang}): the plain message shows: "${said}"`);
      const run = await runOf(t.page);
      check(run.stopped?.reason === "error" && !run.scan, `${c.name} (${lang}): the run stops on the error and keeps what is done`);
      check(/Go on|Weitermachen/.test(await text(t.page, "#btn-cta")), `${c.name} (${lang}): one next step, Go on, beside the way back to the simulation`);
      const problems = (await pageProblems(t)).filter((p) => !/^console: Failed to load resource/.test(p));
      check(!problems.length, `${c.name} (${lang}): no page error or protocol fault${problems.length ? `: ${problems.slice(0, 2).join("; ")}` : ""}`);
    } catch (e) {
      check(false, `${c.name} (${lang}): ${e.message.split("\n")[0]}`);
    }
    await t.context.close();
  }
}

// A key the API rejects during the run: Go on asks for another key, says why, and no longer holds the old one.
{
  const t = await livePage(suite, { standIn: { faults: thrice({ error: err(401, "authentication_error", "invalid x-api-key") }) } });
  try {
    await fillForm(t.page);
    await startRun(t.page);
    await t.page.click("#btn-cta");
    await t.page.waitForSelector("#live-dialog[open]");
    const status = await text(t.page, "#live-key-status");
    const field = await t.page.$eval("#live-key", (e) => ({ value: e.value, invalid: e.getAttribute("aria-invalid"), focused: document.activeElement === e }));
    const held = await t.page.$eval("#live-current", (e) => !e.hidden);
    check(/rejected the key/.test(status) && field.invalid === "true" && field.focused && !field.value && !held, `after a rejected key, Go on asks for another and says why ("${status}"), holding the old one no longer`);
  } catch (e) {
    check(false, `rejected key, Go on: ${e.message.split("\n")[0]}`);
  }
  await t.context.close();
}

// A busy service that clears on the retry: the run goes on, and the wait said why.
{
  const t = await livePage(suite, { standIn: { faults: [{ agent: "scanner", attempt: 1, error: err(529, "overloaded_error", "Overloaded") }] } });
  await fillForm(t.page);
  const notes = [];
  await t.page.exposeFunction("__note", (s) => notes.push(s));
  await t.page.evaluate(() => new MutationObserver(() => { const n = document.getElementById("work-note"); if (n?.textContent) window.__note(n.textContent); }).observe(document.body, { subtree: true, childList: true, characterData: true }));
  await startRun(t.page);
  const run = await runOf(t.page);
  check(t.standIn.requests.length === 2 && run.scan && !run.stopped, "a 529 that clears on the retry lets the run go on");
  check(notes.some((n) => /trying again in 2 s, attempt 1 of 2/.test(n)), `while it waits, the step says it tries again (${[...new Set(notes)].join(" | ") || "nothing seen"})`);
  await t.context.close();
}

await suite.done();
report(results, "LIVE ERRORS OK");
