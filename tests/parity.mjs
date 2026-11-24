// The shared parts of the set of four (brief §4.1) are the same files in every tool that has them. The first
// tool to merge a part into its main branch is the part's source, and the others copy it unchanged
// (PLAN.md section 10): each part this repository holds is compared, byte for byte, with its source
// sibling's copy beside it, and must equal it. A third tool whose copy has drifted from the source is named
// in a note, since aligning it is that tool's change, not this one's. A part no sibling has yet is skipped
// and says so: this tool's copy is then the one to take. REVIEW.md names the commit each part came from. The
// tests workflow clones the three siblings beside the tool; locally, any checkout of them beside this
// repository counts. A planted difference proves the comparison can fail.
// Usage: node tests/parity.mjs
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

/**
 * The shared parts, the tools that carry them (brief §4.1) and their source: the sibling that merged each
 * first (REVIEW.md). The SWOT Challenger merged the KPI library, the risk maths and the handoff schema in
 * its 0.1.0; the Prototype Ideator merged the live client and the key held in memory in its 0.1.0.
 */
const PARTS = [
  { file: "data/kpis.js", in: "all four", source: "SWOT-challenger" },
  { file: "schemas/strategy-challenge-1.json", in: "all four", source: "SWOT-challenger" },
  { file: "schemas/strategy-challenge-1.js", in: "the tools that import the handoff schema as a module", source: "SWOT-challenger" },
  { file: "js/risk.js", in: "the three challengers; the Ideator imports its money formats", source: "SWOT-challenger" },
  { file: "js/anthropic.js", in: "all four (the live client)", source: "PrototypeIdeator" },
  { file: "js/sse.js", in: "all four (the live client)", source: "PrototypeIdeator" },
  { file: "js/cost.js", in: "all four (the live client)", source: "PrototypeIdeator" },
  { file: "js/keystore.js", in: "all four (the key held in memory)", source: "PrototypeIdeator" },
  { file: "js/live_dialog.js", in: "all four (the live-run dialog)", source: null }
];
const SIBLINGS = ["BMC-challenger", "SWOT-challenger", "PrototypeIdeator"];

const results = [];
const notes = [];
const check = (ok, what) => results.push([!!ok, what]);

const checkouts = SIBLINGS.map((name) => {
  const dir = [name, name.toLowerCase()].map((d) => path.resolve(APP_ROOT, "..", d)).find((d) => existsSync(path.join(d, ".git")));
  let head = null;
  if (dir) { try { head = execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* no commit checked out */ } }
  return { name, dir, head };
});
for (const c of checkouts) notes.push(c.dir ? `${c.name}: ${path.relative(APP_ROOT, c.dir)} at ${c.head || "no commit checked out"}` : `${c.name}: no checkout beside this repository`);

/** Same bytes, or the first difference: { equal, line }. */
function compare(a, b) {
  if (a.equals(b)) return { equal: true };
  const x = a.toString("utf8").split("\n");
  const y = b.toString("utf8").split("\n");
  const i = x.findIndex((l, n) => l !== y[n]);
  return { equal: false, line: (i < 0 ? Math.min(x.length, y.length) : i) + 1 };
}

let compared = 0;
for (const part of PARTS) {
  const ours = path.join(APP_ROOT, part.file);
  const holders = checkouts.filter((c) => c.dir && existsSync(path.join(c.dir, part.file)));
  if (!existsSync(ours)) {
    if (holders.length) notes.push(`${part.file}: ${holders.map((c) => c.name).join(" and ")} ${holders.length > 1 ? "have" : "has"} it and this tool does not yet; copy it unchanged when this tool needs it`);
    continue;
  }
  const source = holders.find((c) => c.name === part.source);
  if (!source) {
    if (part.source) {
      const c = checkouts.find((x) => x.name === part.source);
      check(!c?.dir, `${part.file}: its source ${part.source} is checked out beside this repository and holds it`);
      if (!c?.dir) notes.push(`${part.file}: its source ${part.source} is not checked out here, so it is not compared`);
    } else if (!holders.length) {
      notes.push(`${part.file}: no sibling has it yet, so this tool's copy is the one to take (${part.in})`);
    } else {
      check(false, `${part.file}: ${holders.map((c) => c.name).join(" and ")} merged it, so name the first as its source and copy it`);
    }
    continue;
  }
  const mine = readFileSync(ours);
  const theirs = readFileSync(path.join(source.dir, part.file));
  const r = compare(mine, theirs);
  compared += 1;
  check(r.equal, `${part.file} equals its source, ${source.name}'s${source.head ? ` (${source.head})` : ""}${r.equal ? "" : `; first difference at line ${r.line}`}`);
  for (const other of holders.filter((c) => c !== source)) {
    const d = compare(theirs, readFileSync(path.join(other.dir, part.file)));
    if (!d.equal) notes.push(`${part.file}: ${other.name}'s copy${other.head ? ` (${other.head})` : ""} differs from the source at line ${d.line}; aligning it is that tool's change`);
  }
}

// The comparison can fail: a copy of this tool's KPI library with one character changed differs.
const sample = readFileSync(path.join(APP_ROOT, "data/kpis.js"));
const planted = Buffer.from(sample.toString("utf8").replace("export", "exporT"));
const c = compare(sample, planted);
check(!c.equal && c.line >= 1, `control: a shared file with one character changed is refused (first difference at line ${c.line})`);

for (const n of notes) console.log(`NOTE  ${n}`);
for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
const failed = results.filter(([ok]) => !ok).length;
if (failed) {
  console.error(`\n${failed} shared part(s) differ from their source. Copy the source sibling's file, or agree the change with it.`);
  process.exit(1);
}
console.log(`\n${compared} part(s) compared with their source; the parts no sibling has yet wait for one.`);
console.log("PARITY OK");
