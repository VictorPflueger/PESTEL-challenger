// Nothing is kept (brief §5.9, AC-02), in Chromium against the stand-in: after a full live run with
// research, its decisions and its download, the browser holds only what may persist (the language under
// pestel.lang, Vici's vc-theme and its vc-guide: note), with no database, cache or cookie; and the key is in
// no download, console message, address, storage value or page text, and an error that quotes it shows it
// redacted. Vici's own storedKeyProblems runs on the keys when a ViciDesign checkout sits beside the tool.
// Usage: node tests/storage.mjs [--require-vici]
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { report, viciDir, REQUIRE_VICI } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, pageProblems, MOCK_KEY } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();

{
  const t = await livePage(suite, { theme: "dark" });
  const p = t.page;
  await p.click('.lang-option[data-lang="de"]');
  await p.click('.lang-option[data-lang="en"]');
  await fillForm(p);
  await startRun(p, { research: true });
  await challenge(p);
  await p.click('.vc-step[data-step="respond"] .vc-step__button');
  await p.click(".decide-list li:nth-child(2) .decide-item");
  // The person changes a choice: the option's label takes the click, as a person's does.
  const before = await p.$eval(".option[data-chosen='true'] .option-title", (el) => el.textContent);
  await p.click(".option:not([data-chosen='true'])");
  const after = await p.$eval(".option[data-chosen='true'] .option-title", (el) => el.textContent);
  check(after !== before, `the run holds a choice the person changed ("${before}" to "${after}")`);
  await adopt(p);
  const [download] = await Promise.all([p.waitForEvent("download"), p.click("#btn-save-run")]);
  const saved = await readFile(await download.path(), "utf8");
  const state = await p.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
    session: Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])),
    dbs: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
    caches: "caches" in self ? await caches.keys() : [],
    cookie: document.cookie,
    url: location.href,
    html: document.documentElement.outerHTML,
    fields: [...document.querySelectorAll("input")].map((i) => i.value).join(" "),
  }));
  const localKeys = Object.keys(state.local);
  check(localKeys.every((k) => k === "pestel.lang" || k === "vc-theme") && localKeys.includes("pestel.lang") && localKeys.includes("vc-theme"), `local storage holds only pestel.lang and vc-theme (${localKeys.join(", ")})`);
  check(Object.keys(state.session).every((k) => k.startsWith("vc-guide:")), `session storage holds only Vici's guide note (${Object.keys(state.session).join(", ") || "nothing"})`);
  check(!state.dbs.length && !state.caches.length && state.cookie === "", `no database (${state.dbs.length}), no cache (${state.caches.length}), no cookie ("${state.cookie}")`);
  const where = [["the download", saved], ["a console message", t.log.console.join("\n")], ["the address", state.url], ["storage", JSON.stringify([state.local, state.session])], ["the page", state.html], ["a field", state.fields]];
  const leaks = where.filter(([, s]) => s.includes(MOCK_KEY) || s.includes(MOCK_KEY.slice(7, 27)));
  check(!leaks.length, `the key is in no download, console message, address, storage value, page text or field${leaks.length ? `; found in ${leaks.map(([w]) => w).join(", ")}` : ""}`);
  check(!/sk-ant-api/.test(saved) && !/"system"|"thinking"|<analysis>/.test(saved), "the download holds no key, no prompt and no thinking");
  const dir = viciDir();
  if (dir) {
    const { storedKeyProblems } = await import(pathToFileURL(path.join(dir, "scripts", "lib", "storage.mjs")).href);
    const probs = storedKeyProblems({ local: localKeys, session: Object.keys(state.session) }, { prefix: "pestel" });
    check(Array.isArray(probs) && !probs.length, `Vici's storedKeyProblems finds nothing${probs?.length ? `: ${probs.join("; ")}` : ""}`);
    check(storedKeyProblems({ local: [...localKeys, "pestel.run"], session: [] }, { prefix: "pestel" }).length > 0, "control: a run kept under the tool's prefix is refused");
  } else check(!REQUIRE_VICI, "SKIP: no ViciDesign checkout, so storedKeyProblems did not run");
  const problems = await pageProblems(t);
  check(!problems.length, `the run leaves no page error or policy violation${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
  await t.context.close();
}

// An error that quotes the key shows it redacted.
{
  const t = await livePage(suite, { standIn: { faults: [{ agent: "scanner", attempt: 1, error: { status: 400, type: "invalid_request_error", message: `Bad request for key ${MOCK_KEY}` } }] } });
  await fillForm(t.page);
  await startRun(t.page);
  const said = await t.page.$eval(".stop-alert", (e) => e.textContent);
  const held = await t.page.evaluate(() => JSON.stringify(window.__pestel.run()));
  check(/sk-ant-\[REDACTED\]/.test(said) && !said.includes(MOCK_KEY) && !held.includes(MOCK_KEY), "an error that quotes the key shows and keeps it redacted");
  await t.context.close();
}

await suite.done();
report(results, "STORAGE OK");
