// The shared parts of the set of four (brief §4.1) are the same files in every tool that has them: each
// part this repository holds is compared, byte for byte, with the first sibling checkout beside it that
// holds it too, in the set's order (the canvas, SWOT, then the Ideator). A part no sibling has yet is
// skipped and says so; whoever builds a part first, the others copy it unchanged. The tests workflow
// clones the three siblings beside the app; locally, any checkout of them beside this repository counts.
// A planted difference proves the comparison can fail.
// Usage: node tests/parity.mjs
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

/** The shared parts and the tools that carry them (brief §4.1). */
const PARTS = [
  { file: "data/kpis.js", in: "all four" },
  { file: "schemas/strategy-challenge-1.json", in: "all four" },
  { file: "js/risk.js", in: "the three challengers; the Ideator imports its money formats" },
  { file: "js/anthropic.js", in: "all four (the live client)" },
  { file: "js/sse.js", in: "all four (the live client)" },
  { file: "js/cost.js", in: "all four (the live client)" },
  { file: "js/keystore.js", in: "all four (the key held in memory)" },
  { file: "js/live_dialog.js", in: "all four (the live-run dialog)" }
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
  const owner = checkouts.find((c) => c.dir && existsSync(path.join(c.dir, part.file)));
  if (!existsSync(ours)) {
    if (owner) notes.push(`${part.file}: ${owner.name} has it and this tool does not yet; copy it unchanged when this tool needs it`);
    continue;
  }
  if (!owner) { notes.push(`${part.file}: no sibling has it yet, so this tool's copy is the one to take (${part.in})`); continue; }
  const r = compare(readFileSync(ours), readFileSync(path.join(owner.dir, part.file)));
  compared += 1;
  check(r.equal, `${part.file} equals ${owner.name}'s${owner.head ? ` (${owner.head})` : ""}${r.equal ? "" : `; first difference at line ${r.line}`}`);
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
  console.error(`\n${failed} shared part(s) differ from a sibling. Copy the sibling's file, or agree the change in both.`);
  process.exit(1);
}
console.log(`\n${compared} shared part(s) compared with a sibling; the rest wait for one.`);
console.log("PARITY OK");
