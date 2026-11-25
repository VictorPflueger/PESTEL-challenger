// Runs every suite in order and prints a summary. The tool itself needs none of this.
// Usage: node tests/run-all.mjs                  (all suites)
//        node tests/run-all.mjs engine layout    (only the named suites)
//        node tests/run-all.mjs --require-vici   (fail, rather than skip, without a ViciDesign checkout)
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this tool's suites, every flag passed to every
// suite, and "ALL SUITES OK" once every suite has run and passed.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

const SUITES = [
  { id: "engine", what: "golden cases P0 to P2 within 1e-9, every display string in both languages", file: "tests/engine.mjs", browser: false },
  { id: "unit", what: "validator, money at the edge of each scale, strings, the language picker", file: "tests/unit.mjs", browser: false },
  { id: "schemas", what: "every schema valid and within the grammar limits; the module equals the JSON; the handoff example", file: "tests/schemas.mjs", browser: false },
  { id: "scenarios", what: "the scenario checker passes the three scenarios, catches a planted defect of each kind, any choice agrees with the engine", file: "tests/scenarios.mjs", browser: false },
  { id: "audit", what: "the fact audit: no figure outside a placeholder, dates, counts in words and names with digits allowed", file: "tests/audit.mjs", browser: false },
  { id: "handoff", what: "the handoff file of every scenario, language and choice: the shared schema, watch entries, the engine's figures, the Ideator reads it", file: "tests/handoff.mjs", browser: false },
  { id: "kpis", what: "the sector KPI library: ids, both languages, units, directions, dated sources", file: "tests/kpis.mjs", browser: false },
  { id: "policy", what: "the exact security policy, nothing loaded from elsewhere, no inline code, storage only where allowed", file: "tests/policy.mjs", browser: false },
  { id: "tokens", what: "the colour pairs on Vici's tokens, light and dark: contrast, colour-blind separation", file: "tests/tokens.mjs", browser: false },
  { id: "page-icon", what: "the page icon: favicon and header cell, as on the website's card once it exists", file: "tests/page-icon.mjs", browser: false },
  { id: "vici-files", what: "vici/ holds exactly the files its README lists, byte for byte Vici's at the named commit", file: "tests/vici-files.mjs", browser: false },
  { id: "parity", what: "the shared parts equal the sibling that merged each first", file: "tests/parity.mjs", browser: false },
  { id: "guards", what: "each refusal of brief §6.7 with its message, the fact audit, the recorded answers pass", file: "tests/guards.mjs", browser: false },
  { id: "estimate", what: "the estimate from the real prompts: the tile, the dialog's range, measured figures", file: "tests/estimate.mjs", browser: false },
  { id: "hygiene", what: "no client, prospect, contact or meeting named in any published file", file: "tests/hygiene.mjs", browser: false },
  { id: "docs", what: "the documents' length, sections, facts with dates, paths, and what REVIEW.md lists", file: "tests/docs.mjs", browser: false },
  { id: "vici", what: "Vici's own checks on the page, every text, every scenario and every rendered step: guide, byline, writing, AI notice, record ids, framework, risk matrix", file: "tests/vici.mjs", browser: true },
  { id: "i18n", what: "both languages: the same keys, English first, ?lang=de, the switch without a reload, two guides", file: "tests/i18n.mjs", browser: true },
  { id: "guide", what: "both guides in Chromium: open by themselves once, from the header, chapters, the talk track", file: "tests/guide-behaviour.mjs", browser: true },
  { id: "presenter", what: "every scenario offline in both languages: key figures first, Play, Your turn, keys, links, the decision", file: "tests/presenter.mjs", browser: true },
  { id: "views", what: "the ring, the factor lists, the risk matrix and the horizon strip on every screen, with their tables", file: "tests/views.mjs", browser: true },
  { id: "hexagon", what: "nothing round: the tool's files, and the rendered page in both themes", file: "tests/hexagon.mjs", browser: true },
  { id: "layout", what: "1920 × 1080 and 1280 × 720, both themes and languages, and 1600 × 900 and 1366 × 768: fit, no cut text, targets, contrast", file: "tests/layout.mjs", browser: true },
  { id: "access", what: "the keyboard alone through a scenario and a live run, a visible focus at every stop, reduced motion, names and ids", file: "tests/access.mjs", browser: true },
  { id: "from-file", what: "opened from a file the page says what to do in its language; served, the note never shows", file: "tests/from-file.mjs", browser: true },
  { id: "report", what: "the report: Vici's rule, Save as PDF alone with the footer on every page in both languages, Ctrl+P, a capped run's notice", file: "tests/report.mjs", browser: true },
  { id: "report-files", what: "the HTML file self-contained and offline, the handoff file valid, their names, a live run's files", file: "tests/report-files.mjs", browser: true },
  { id: "report-figures", what: "the report and the handoff file carry the tiles' figures and the watch list, along any choice", file: "tests/report-figures.mjs", browser: true },
  { id: "live-dialog", what: "Run it live, the form, Vici's live-run dialog, the key check, the frame, the private-data warning", file: "tests/live-dialog.mjs", browser: true },
  { id: "live-requests", what: "every request on each setting: model, effort, thinking, headers, format or tools, max_tokens, language", file: "tests/live-requests.mjs", browser: true },
  { id: "live-repair", what: "one repair then stop, Unchecked after the audit twice, the run's two repairs, Abort", file: "tests/live-repair.mjs", browser: true },
  { id: "live-budget", what: "the meter to 1e-9 at 0.894, no request past the cap, max_tokens dropped, the stop", file: "tests/live-budget.mjs", browser: true },
  { id: "live-errors", what: "401, 403, 404, 400 credit and spend limit, 429, 529, 500 and the network: messages and retries", file: "tests/live-errors.mjs", browser: true },
  { id: "live-research", what: "addresses from the search results only, pause_turn, a missing report, search switched off, the cutoff", file: "tests/live-research.mjs", browser: true },
  { id: "live-scan", what: "the person's factors untouched, AI factors kept, edited or removed, each correction with its reason and Undo", file: "tests/live-scan.mjs", browser: true },
  { id: "live-flow", what: "a live run from Start to Summary: the wait, the figures, Save run as simulation, the leave-page warning, Clear everything", file: "tests/live-flow.mjs", browser: true },
  { id: "storage", what: "after a live run: only the allowed keys, no database, cache or cookie, the key nowhere", file: "tests/storage.mjs", browser: true }
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const unknown = only.filter((id) => !SUITES.some((s) => s.id === id));
if (unknown.length) {
  console.error(`No such suite: ${unknown.join(", ")}. The suites: ${SUITES.map((s) => s.id).join(", ")}.`);
  process.exit(1);
}
const chosen = SUITES.filter((s) => !only.length || only.includes(s.id));
const summary = [];
// In GitHub Actions a failed suite also becomes an annotation with its FAIL lines, readable in the run's
// summary and through the API without the full log.
const CI = process.env.GITHUB_ACTIONS === "true";
const annotate = (s, out) => {
  const lines = out.split("\n").filter((l) => l.trim());
  const picked = lines.filter((l) => /^(FAIL|Error|AssertionError|TypeError)|failed|exceeded/i.test(l.trim())).map((l) => l.trim());
  const text = (picked.length ? picked : lines.slice(-12).map((l) => l.trim())).join(" ⏎ ").slice(0, 6000);
  console.log(`::error title=${s.id} suite failed::${text}`);
};
for (const s of chosen) {
  console.log(`\n=== ${s.id}: ${s.what} ===`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(APP_ROOT, s.file), ...flags], { cwd: APP_ROOT, stdio: CI ? ["inherit", "pipe", "pipe"] : "inherit", env: process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (CI) {
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) annotate(s, `${r.stdout || ""}\n${r.stderr || ""}`);
  }
  summary.push({ ...s, ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - started) / 1000) });
  if (r.status === 2 && s.browser) {
    console.log("Playwright is missing; the browser suites are not run. TECH_NOTES.md section 7 says how to install it.");
    break;
  }
}

console.log("\n=== Summary ===");
for (const s of summary) console.log(`${s.ok ? "PASS" : "FAIL"}  ${s.id.padEnd(10)} ${String(s.seconds).padStart(4)} s  ${s.what}`);
const notRun = chosen.length - summary.length;
if (notRun) console.log(`(${notRun} suite${notRun === 1 ? "" : "s"} not run)`);
const allPassed = summary.length === chosen.length && summary.every((s) => s.ok);
// The success line names a run of every suite; a partial run says only that its suites passed.
if (allPassed && !only.length) console.log(`ALL SUITES OK (${summary.length} of ${SUITES.length})`);
else if (allPassed) console.log(`${summary.length} named suite${summary.length === 1 ? "" : "s"} passed`);
process.exit(allPassed ? 0 : 1);
