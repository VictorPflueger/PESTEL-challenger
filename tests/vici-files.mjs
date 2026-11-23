// vici/ holds exactly the files vici/README.md lists: every file there matches a row of the README's
// table (or is the README itself), every row matches at least one file, and every file Vici's stylesheet
// loads (its fonts) is there. The files are Vici's, copied unchanged from the commit the README names: when
// a ViciDesign checkout sits next to this repository (the tests workflow checks one out), every file is
// compared byte for byte with the same path at that commit, through git. Without a checkout that part is
// skipped and says so, unless --require-vici (or GitHub Actions) asks for it. A fix belongs in Vici, not
// in this copy.
// Adapted from the Data Quality Agent 2.2.0 (831f050): it compares with the exact commit through git,
// rather than with whatever the checkout holds when its version number matches.
// Usage: node tests/vici-files.mjs [--require-vici]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT, REQUIRE_VICI, viciDir } from "./lib/harness.mjs";

const VICI = path.join(APP_ROOT, "vici");
const results = [];
const check = (ok, what) => results.push([!!ok, what]);

function files(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

const readme = readFileSync(path.join(VICI, "README.md"), "utf8");
// The table's first column: `dist/vici.min.css`, `assets/fonts/*.woff2`, …
const listed = [...readme.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]);
const pattern = (glob) => new RegExp(`^${glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`);
const present = files(VICI).sort();

check(listed.length > 0, `vici/README.md lists ${listed.length} entries`);
const commit = (readme.match(/`([0-9a-f]{40})`/) || [])[1];
const short = (readme.match(/\*\*`([0-9a-f]{7,12})`\*\*/) || [])[1];
check(commit && short && commit.startsWith(short), `vici/README.md names the commit in full and short${commit ? ` (${short}, ${commit})` : ""}`);
const unlisted = present.filter((f) => f !== "README.md" && !listed.some((g) => pattern(g).test(f)));
check(!unlisted.length, `every file in vici/ is listed in its README${unlisted.length ? `; not listed: ${unlisted.join(", ")}` : ` (${present.length} files)`}`);
const missing = listed.filter((g) => !present.some((f) => pattern(g).test(f)));
check(!missing.length, `every entry of the README is in vici/${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
check(present.includes("LICENSE"), "Vici's licence (vici/LICENSE) is there");

// Everything the stylesheet loads by url() is there (the fonts, at ../assets/fonts/ from dist/).
const css = readFileSync(path.join(VICI, "dist/vici.min.css"), "utf8");
const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(?!data:)([^'")]+)['"]?\s*\)/g)].map((m) => m[1]))];
const unresolved = urls.filter((u) => !existsSync(path.join(VICI, "dist", u)));
check(urls.length > 0 && !unresolved.length, `every file Vici's stylesheet loads is in vici/ (${urls.length} files${unresolved.length ? `; missing: ${unresolved.join(", ")}` : ""})`);

// The tests workflow checks out the same commit.
const workflow = path.join(APP_ROOT, ".github", "workflows", "tests.yml");
if (existsSync(workflow)) {
  const ref = (readFileSync(workflow, "utf8").match(/repository:\s*VictorPflueger\/ViciDesign\s*\n\s*ref:\s*([0-9a-f]{40})/) || [])[1];
  check(ref === commit, `the tests workflow checks out ViciDesign at the same commit (${ref || "none"})`);
}

// Unchanged: every file here is byte for byte the file at the same path in ViciDesign at that commit.
let skipped = null;
const checkout = viciDir();
const git = (args, encoding = null) => execFileSync("git", ["-C", checkout, ...args], { encoding, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
let known = false;
if (checkout && commit) {
  try { git(["cat-file", "-e", `${commit}^{commit}`]); known = true; } catch { /* a shallow or older checkout */ }
}
if (known) {
  const show = (ref, f) => { try { return git(["show", `${ref}:${f}`]); } catch { return null; } };
  const theirs = (f) => show(commit, f);
  theirs.at = show;
  const changed = present.filter((f) => f !== "README.md").filter((f) => {
    const t = theirs(f);
    return !t || !t.equals(readFileSync(path.join(VICI, f)));
  });
  check(!changed.length, `every file is unchanged from ViciDesign ${commit.slice(0, 7)} (${path.relative(APP_ROOT, checkout)})${changed.length ? `; changed or not in Vici: ${changed.join(", ")}` : ` (${present.length - 1} files)`}`);
  // The comparison can fail: the stylesheet with one byte changed is refused, and so is the stylesheet as
  // it stood at its previous change in Vici's history.
  const original = theirs("dist/vici.min.css");
  const altered = Buffer.from(original); altered[altered.length - 2] ^= 1;
  const changes = git(["log", "--format=%H", commit, "--", "dist/vici.min.css"], "utf8").trim().split("\n");
  const previous = changes[1] ? theirs.at(changes[1], "dist/vici.min.css") : null;
  const ours = readFileSync(path.join(VICI, "dist/vici.min.css"));
  check(!altered.equals(ours) && previous && !previous.equals(ours), `control: a copy with one byte changed, and the stylesheet of ${changes[1]?.slice(0, 7) || "an earlier commit"}, are refused`);
} else if (REQUIRE_VICI) {
  check(false, checkout ? `the ViciDesign checkout (${checkout}) does not hold commit ${commit}` : "no ViciDesign checkout next to this repository, and --require-vici asks for one");
} else {
  skipped = checkout ? `the ViciDesign checkout does not hold commit ${commit}: files not compared` : "no ViciDesign checkout next to this repository: files not compared with the commit";
}

for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
if (skipped) console.log(`SKIP  ${skipped}`);
const failed = results.filter(([ok]) => !ok).length;
if (failed) {
  console.error(`\n${failed} check(s) of vici/ failed.`);
  process.exit(1);
}
console.log("\nvici/ holds exactly the files its README lists, unchanged from Vici.");
console.log("VICI FILES OK");
