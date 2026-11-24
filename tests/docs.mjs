// The documents are complete for the version js/config.js names, short, and consistent with the code:
//   length     README.md at most 900 words, DESIGN.md at most 700, DATA_SOURCES.md at most 1,500 (from
//              0.2.0 it holds the dated fact table of each of the three scenarios, project requirement 13,
//              which grows with the facts and not with prose; the Business Model Canvas Challenger raised
//              its limit for the same reason), each demo script at most 700 (a word is anything between
//              spaces, table bars included);
//   sections   each carries its sections and names the version; DEMO_SCRIPT.md and DEMO_SCRIPT.de.md are
//              required from 0.2.0, when the talk track is complete (PLAN.md section 11);
//   facts      TECH_NOTES.md gives every model id and price with the date it was read, and every decision
//              (D1 to D11, N1 to N3); README.md links the live site, the three siblings, carries the
//              public-information notice word for word and the byline's two links;
//   paths      every repository path a document names in backticks exists, unless the document says the
//              version it arrives in; every section the code cites exists;
//   REVIEW     every file it lists exists; a copied file equals its source byte for byte at the commit
//              named (when that prototype's checkout sits beside this repository); an adapted file names
//              its source in its header; every file whose header names a source is listed;
//   private    the build brief and the private term list are not in the tree.
// Each rule first proves on a planted document that it can fail.
// Usage: node tests/docs.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";

const { APP } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
/** The notice the project asks for wherever a person can type or upload, word for word. */
const NOTICE = "Public information only: never enter confidential, personal or otherwise protected data.";
const [major, minor] = APP.version.split(".").map(Number);
const atLeast = (v) => { const [a, b] = v.split(".").map(Number); return major > a || (major === a && minor >= b); };

const DOCS = {
  "README.md": { max: 900, sections: ["What it will do", "What is real and what is simulated", "Running it", "Part of a set of four"], version: `Version ${APP.version}` },
  "DESIGN.md": { max: 700, numbered: 6 },
  "TECH_NOTES.md": { numbered: 8, version: `Version ${APP.version}` },
  "DATA_SOURCES.md": { max: 1500, numbered: 3 },
  "REVIEW.md": {},
  "DEMO_SCRIPT.md": { max: 700, from: "0.2.0" },
  "DEMO_SCRIPT.de.md": { max: 700, from: "0.2.0" }
};
const SOURCES = {
  "Sovereignty Assessment": "sovereigntyassessment",
  "Data Quality Agent": "PROC-data-quality",
  "Duty Radar": "dutyradar",
  "SWOT Challenger": "SWOT-challenger",
  "Prototype Ideator": "PrototypeIdeator"
};

const results = [];
const notes = [];
const check = (ok, what) => results.push([!!ok, what]);
const text = {};

// ---- the rules, as functions, so each can first fail on a planted document --------------------------
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const heads = (t) => [...t.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());
function docProblems(name, t, rule) {
  const out = [];
  if (rule.max && words(t) > rule.max) out.push(`${name} has ${words(t)} words; at most ${rule.max}`);
  for (const s of rule.sections || []) if (!heads(t).some((h) => h.startsWith(s))) out.push(`${name} lacks the section "${s}"`);
  for (let n = 1; n <= (rule.numbered || 0); n++) if (!heads(t).some((h) => h.startsWith(`${n}. `))) out.push(`${name} lacks section ${n}`);
  if (rule.version && !t.includes(rule.version)) out.push(`${name} does not name "${rule.version}"`);
  return out;
}
/** Repository paths named in backticks: start with a folder of this tool or end in a file type it has. */
const FOLDERS = /^(css|js|data|schemas|tools|tests|vici|\.github)\//;
function namedPaths(t) {
  const out = [];
  for (const line of t.split("\n")) {
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      const p = m[1].replace(/[),.;:]+$/, "");
      if (!(FOLDERS.test(p) || /^[A-Z_]+(\.de)?\.md$|^index\.html$|^favicon\.svg$/.test(p))) continue;
      if (/[*…{}<>]/.test(p)) continue; // a pattern, not a file
      out.push({ p, line });
    }
  }
  return out;
}
/** A path that does not exist is fine only when its line says the version it arrives in, or that it is another tool's. */
const missingPaths = (t) => namedPaths(t).filter(({ p, line }) => !fs.existsSync(path.join(APP_ROOT, p)) && !/\b(from|in|with) (version )?\d+\.\d+\.\d+|\bM[2-5]\b|\bsisters'|\bnot taken\b/i.test(line)).map(({ p }) => p);

// ---- planted documents: every rule can fail ----------------------------------------------------------
{
  const planted = docProblems("planted.md", "# T\n\n## Something else\n\n" + "word ".repeat(950), DOCS["README.md"]);
  const ghost = missingPaths("The engine lives in `js/ghost.js`.\nThe client `js/future.js` comes in 0.3.0.");
  check(planted.length >= 3 && ghost.length === 1 && ghost[0] === "js/ghost.js", `control: a planted README that is too long, lacks its sections and its version, and a path that does not exist, are caught (${planted.length} problems; ${ghost.join(", ")})`);
}

// ---- each document --------------------------------------------------------------------------------
for (const [name, rule] of Object.entries(DOCS)) {
  const p = path.join(APP_ROOT, name);
  const due = !rule.from || atLeast(rule.from);
  if (!fs.existsSync(p)) {
    if (due) check(false, `${name} exists`);
    else notes.push(`${name} arrives with ${rule.from} (this is ${APP.version})`);
    continue;
  }
  const t = fs.readFileSync(p, "utf8");
  text[name] = t;
  const problems = docProblems(name, t, rule);
  check(!problems.length, `${name}: ${rule.max ? `${words(t)} of at most ${rule.max} words, ` : ""}its sections${rule.version ? " and version" : ""}${problems.length ? `: ${problems.join("; ")}` : ""}`);
  const missing = missingPaths(t);
  check(!missing.length, `${name}: every path it names exists (${namedPaths(t).length} named)${missing.length ? `; missing: ${[...new Set(missing)].join(", ")}` : ""}`);
}

// ---- README: the live site, the set of four, the notice and the byline ------------------------------
if (text["README.md"]) {
  const r = text["README.md"];
  check(r.includes(APP.url), `README.md links the live site (${APP.url})`);
  const siblings = ["BMC-challenger", "SWOT-challenger", "PrototypeIdeator"].filter((s) => !r.includes(`https://github.com/VictorPflueger/${s}`));
  check(!siblings.length, `README.md links the three siblings${siblings.length ? `; missing: ${siblings.join(", ")}` : ""}`);
  check(r.replace(/\*\*/g, "").replace(/\s+/g, " ").includes(NOTICE), "README.md carries the public-information notice word for word");
  check(r.includes("https://www.linkedin.com/in/victorpflueger") && r.includes("https://victorpflueger.github.io/VIP/index.html"), "README.md ends with the byline's two links, LinkedIn and the website");
}

// ---- TECH_NOTES: the API facts with their dates, and every decision --------------------------------
if (text["TECH_NOTES.md"]) {
  const t = text["TECH_NOTES.md"].replace(/\s+/g, " ");
  const ids = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"].filter((id) => !t.includes(`\`${id}\``));
  check(!ids.length, `TECH_NOTES.md names the three model ids${ids.length ? `; missing: ${ids.join(", ")}` : ""}`);
  const row = (topic) => (text["TECH_NOTES.md"].split("\n").find((l) => l.startsWith(`| ${topic} |`)) || "");
  const prices = row("Prices");
  const wanted = ["$0.10 and $0.50", "$0.50 and $2.50", "$2 and $10", "$4 and $20", "$0.125, $2.50 and $5", "$0.01, $0.10 and $0.20", "$10 per 1,000 searches"].filter((x) => !prices.includes(x));
  check(!wanted.length && /\| 20\d\d-\d\d-\d\d, pricing page \|$/.test(prices), `TECH_NOTES.md gives every price with the date read${wanted.length ? `; missing: ${wanted.join(", ")}` : ""}`);
  const table = text["TECH_NOTES.md"].split("## 3.")[0].split("\n").filter((l) => /^\| [A-Z]/.test(l) && !/^\| Topic \|/.test(l));
  const undated = table.filter((l) => !/\| 20\d\d-\d\d-\d\d[^|]*\|$/.test(l)).map((l) => l.split("|")[1].trim());
  check(table.length >= 8 && !undated.length, `TECH_NOTES.md dates every API fact (${table.length} rows)${undated.length ? `; undated: ${undated.join(", ")}` : ""}`);
  const decisions = [...Array.from({ length: 11 }, (_, i) => `D${i + 1}`), "N1", "N2", "N3"].filter((d) => !new RegExp(`^\\| ${d} \\|`, "m").test(text["TECH_NOTES.md"]));
  check(!decisions.length, `TECH_NOTES.md records decisions D1 to D11 and N1 to N3${decisions.length ? `; missing: ${decisions.join(", ")}` : ""}`);
}

// ---- sections the code cites ----------------------------------------------------------------------
const git = (...args) => execFileSync("git", args, { cwd: APP_ROOT, encoding: "utf8" });
let tracked = [];
try { tracked = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n").filter(Boolean); } catch { tracked = []; }
const code = tracked.filter((f) => /\.(m?js|css|html|yml)$/.test(f) && !f.startsWith("vici/") && fs.existsSync(path.join(APP_ROOT, f)));
let cited = 0;
const badCites = [];
const plan = fs.existsSync(path.join(APP_ROOT, "PLAN.md")) ? fs.readFileSync(path.join(APP_ROOT, "PLAN.md"), "utf8") : null;
for (const f of [...code, ...Object.keys(text)].filter((x, i, all) => all.indexOf(x) === i)) {
  const t = fs.readFileSync(path.join(APP_ROOT, f), "utf8");
  for (const m of t.matchAll(/\b(TECH_NOTES|DATA_SOURCES|DESIGN|PLAN)(?:\.md)?(?:\]\([^)]*\))?,? (?:§ ?|section )(\d+)/g)) {
    cited += 1;
    const doc = m[1] === "PLAN" ? plan : text[`${m[1]}.md`];
    if (doc && !new RegExp(`^## ${m[2]}\\. `, "m").test(doc)) badCites.push(`${f} cites ${m[1]} section ${m[2]}`);
  }
}
check(!badCites.length, `every section the code and the documents cite exists (${cited} citations)${badCites.length ? `; not found: ${badCites.join(", ")}` : ""}`);

// ---- REVIEW: what was taken, from where ------------------------------------------------------------
if (text["REVIEW.md"]) {
  const rows = [...text["REVIEW.md"].matchAll(/^\| `([^`]+)` \| (copy|adapt) \| ([^|]+) \|/gm)].map((m) => ({ file: m[1], verdict: m[2], source: m[3].trim() }));
  check(rows.length >= 10, `REVIEW.md lists ${rows.length} copied or adapted files`);
  const glob = (g) => new RegExp(`^${g.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*\\\*|\*\*/g, ".*")}$`);
  const absent = rows.filter((r) => !(r.file.includes("*") ? tracked.some((f) => glob(r.file).test(f)) : fs.existsSync(path.join(APP_ROOT, r.file))));
  check(!absent.length, `every file REVIEW.md lists exists${absent.length ? `; missing: ${absent.map((r) => r.file).join(", ")}` : ""}`);
  // Copies: byte for byte the source at the named commit, when that prototype's checkout sits beside.
  let compared = 0;
  const differ = [];
  for (const r of rows.filter((x) => x.verdict === "copy" && !x.file.includes("*"))) {
    const name = Object.keys(SOURCES).find((s) => r.source.startsWith(s));
    const commit = (r.source.match(/`([0-9a-f]{7,40})`/) || [])[1];
    const dir = name && path.resolve(APP_ROOT, "..", SOURCES[name]);
    if (!dir || !commit || !fs.existsSync(path.join(dir, ".git"))) { notes.push(`${r.file}: no checkout of its source beside this repository, so not compared`); continue; }
    let theirs = null;
    try { theirs = execFileSync("git", ["-C", dir, "show", `${commit}:${r.file}`], { stdio: ["ignore", "pipe", "ignore"] }); } catch { /* not at that commit */ }
    compared += 1;
    if (!theirs || !theirs.equals(fs.readFileSync(path.join(APP_ROOT, r.file)))) differ.push(`${r.file} (${name} ${commit})`);
  }
  check(!differ.length, `every copied file equals its source at the named commit (${compared} compared)${differ.length ? `; differ: ${differ.join(", ")}` : ""}`);
  // Adapted files name their source in their header (the first comment block).
  const header = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8").slice(0, 1600);
  const unnamed = rows.filter((r) => r.verdict === "adapt" && !r.file.includes("*")).filter((r) => {
    const name = Object.keys(SOURCES).find((s) => r.source.startsWith(s)) || r.source.split(",")[0];
    return !/adapted from|taken from/i.test(header(r.file)) || !header(r.file).includes(name.replace(/ \d.*$/, ""));
  });
  check(!unnamed.length, `every adapted file names its source in its header${unnamed.length ? `; not: ${unnamed.map((r) => r.file).join(", ")}` : ""}`);
  // And the other way: a file whose header names a source is listed.
  const declared = code.filter((f) => /adapted from|taken from/i.test(header(f)));
  const unlisted = declared.filter((f) => !rows.some((r) => r.file === f));
  check(!unlisted.length, `every file whose header names a source is in REVIEW.md (${declared.length} such files)${unlisted.length ? `; not listed: ${unlisted.join(", ")}` : ""}`);
}

// ---- private things stay out ------------------------------------------------------------------------
const brief = tracked.filter((f) => /brief/i.test(f) && f.endsWith(".md") || (f.endsWith(".md") && fs.existsSync(path.join(APP_ROOT, f)) && fs.readFileSync(path.join(APP_ROOT, f), "utf8").startsWith("# PESTEL Challenger: build brief")));
check(!brief.length, `the build brief is not in the repository${brief.length ? `: ${brief.join(", ")}` : ""}`);
check(!tracked.some((f) => /hygiene-terms/.test(f)), "the private term list is not in the repository");

for (const n of notes) console.log(`NOTE  ${n}`);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
const failed = results.filter(([ok]) => !ok).length;
if (failed) {
  console.error(`\n${failed} documentation check(s) failed.`);
  process.exit(1);
}
console.log(`\n${results.length} checks passed.`);
console.log("DOCS OK");
