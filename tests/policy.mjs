// The page's security policy, what it loads and where it keeps things (AC-01, brief §5.1 and §5.9),
// checked in the files without a browser:
//   policy    index.html carries exactly the brief's policy in one meta tag, before any stylesheet or script;
//   loads     every script, stylesheet, font and image comes from this site; code names no host but
//             api.anthropic.com, this site, the Console's key page and LinkedIn; only the shared client calls fetch;
//   inline    no inline script, style or handler in index.html, and no code that writes markup, a style
//             attribute or a handler as text, or evaluates text;
//   storage   local and session storage appear only in the modules allowed them, under the keys allowed:
//             pestel.lang, Vici's vc-theme and its vc-guide: note; IndexedDB, the Cache API and cookies
//             nowhere. Vici's own checks (policyProblems, storageProblems) run too when a ViciDesign
//             checkout sits beside the repository (always on GitHub Actions).
// Each scanner first proves on planted examples that it catches what it looks for.
// Adapted from the Data Quality Agent 2.2.0 (831f050): the brief's policy, this tool's storage modules, and
// Vici's new policyProblems() and storageProblems().
// Usage: node tests/policy.mjs [--require-vici]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, viciDir, report } from "./lib/harness.mjs";
import { POLICY, STORAGE } from "../js/config.js";

// The policy as brief §5.1 states it, character for character; js/config.js must say the same.
const BRIEF_POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";
// The modules allowed to touch local or session storage, and why: the language choice, and Vici's own.
const STORAGE_MODULES = ["js/lang.js", "js/i18n/index.js", "vici/dist/vici.js", "vici/dist/vici-theme.js"];
// Hosts the code names: the one it connects to, this site, the Claude Console, which the live dialog links to
// for a key, and LinkedIn, which the report's byline links to (links the person opens, never a request).
const HOSTS = ["api.anthropic.com", "victorpflueger.github.io", "platform.claude.com", "www.linkedin.com"];

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const read = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8");
function walk(dir, ext) {
  const abs = path.join(APP_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`, ext) : e.name.endsWith(ext) ? [`${dir}/${e.name}`] : []));
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

// ---- the scanners ----------------------------------------------------------------------------------
const ABS = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
function htmlLoads(html) {
  const out = [];
  for (const m of html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*?\s(src|href|data)\s*=\s*["']([^"']+)["']/gi)) {
    if (m[1].toLowerCase() === "link" && !/rel=["'](stylesheet|icon|preload|modulepreload|manifest)["']/i.test(m[0])) continue;
    if (ABS.test(m[3])) out.push(m[3]);
  }
  return out;
}
const cssLoads = (css) => [...stripComments(css).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1] || m[2]).filter((u) => ABS.test(u) && !u.startsWith("data:"));
const jsImports = (js) => [...stripComments(js).matchAll(/(?:^|[\s;])import\s*(?:[^'"()]*?from\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] || m[2]).filter((u) => ABS.test(u));
const hostsIn = (js) => [...stripComments(js).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase());
function inlineIn(html) {
  const out = [];
  const markup = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (!/\bsrc\s*=/.test(m[1]) && m[2].trim()) out.push("an inline script");
  if (/<style\b/i.test(markup)) out.push("a style element");
  for (const tag of markup.match(/<[a-z][^>]*>/gi) || []) for (const m of tag.matchAll(/\s(style|on[a-z]+)\s*=/gi)) out.push(`a ${m[1]} attribute`);
  return out;
}
const WRITES = [
  [/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/, "writes markup as text"],
  [/setAttribute\(\s*["'](style|on[a-z]+)["']/, "sets a style or handler attribute"],
  [/\beval\s*\(|\bnew\s+Function\s*\(|document\.write\s*\(/, "evaluates or writes text as code"],
  [/\bset(Timeout|Interval)\(\s*["'`]/, "runs a string as code"],
];
const jsWrites = (js) => WRITES.filter(([re]) => re.test(stripComments(js))).map(([, what]) => what);

// ---- the scanners can fail ---------------------------------------------------------------------------
check(htmlLoads('<script src="https://cdn.example.org/x.js"></script><link rel="stylesheet" href="//fonts.example.org/a.css"><a href="https://example.org/">link</a>').length === 2, "control: a script and a stylesheet from another site are caught, a link is not");
check(cssLoads("@import 'https://fonts.example.org/a.css'; a { background: url(https://x.example.org/b.png) } b { background: url(data:image/png;base64,AA) }").length === 2, "control: a CSS import and url() from another site are caught, a data address is not");
check(jsImports('import x from "https://cdn.example.org/m.js"; import("https://e.example.org/n.js"); import y from "./local.js";').length === 2, "control: imports from another site are caught, a local one is not");
check(inlineIn('<script>alert(1)</script><style>a{}</style><p style="color:red" onclick="x()"></p><script src="a.js"></script>').length === 4, "control: an inline script, a style element and style and onclick attributes are caught");
check(jsWrites('el.innerHTML = s; el.setAttribute("onclick", "x()"); eval("1"); setTimeout("x()", 1);').length === 4, "control: markup, handler, eval and string timers are caught");

// ---- policy -----------------------------------------------------------------------------------------
const html = read("index.html");
const metas = [...html.matchAll(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/g)].map((m) => m[1]);
check(metas.length === 1, `index.html has exactly one policy meta tag (${metas.length})`);
check(metas[0] === BRIEF_POLICY, `the policy is exactly the brief's${metas[0] === BRIEF_POLICY ? "" : `: ${metas[0]}`}`);
check(POLICY === BRIEF_POLICY, "js/config.js states the same policy");
check(/<head>[\s\S]*?<meta charset="utf-8">[\s\S]*?http-equiv="Content-Security-Policy"[\s\S]*?<link rel="stylesheet"/.test(html) && html.indexOf("Content-Security-Policy") < html.indexOf("<script"), "the policy comes before any stylesheet or script");

// ---- loads ------------------------------------------------------------------------------------------
const htmlOut = htmlLoads(html);
check(!htmlOut.length, `index.html loads nothing from another site${htmlOut.length ? `: ${htmlOut.join(", ")}` : ""}`);
const css = walk("css", ".css");
const cssOut = css.flatMap((f) => cssLoads(read(f)).map((u) => `${f}: ${u}`));
check(css.length && !cssOut.length, `${css.length} stylesheet(s) of the tool load nothing from another site${cssOut.length ? `: ${cssOut.join(", ")}` : ""}`);
const viciCss = cssLoads(read("vici/dist/vici.min.css"));
check(!viciCss.length, `Vici's stylesheet loads its fonts and icons from this site${viciCss.length ? `: ${viciCss.slice(0, 3).join(", ")}` : ""}`);
const code = [...walk("js", ".js"), ...walk("data", ".js")];
const jsOut = code.flatMap((f) => jsImports(read(f)).map((u) => `${f}: ${u}`));
check(!jsOut.length, `no module imports from another site (${code.length} modules)${jsOut.length ? `: ${jsOut.join(", ")}` : ""}`);
// js/schemas.js is generated data: its $schema names json-schema.org as an identifier, never a place to go.
const strangers = walk("js", ".js").filter((f) => f !== "js/schemas.js").flatMap((f) => hostsIn(read(f)).filter((h) => !HOSTS.includes(h)).map((h) => `${h} (${f})`));
check(!strangers.length, `code names no host but ${HOSTS.join(" and ")}${strangers.length ? `; also ${strangers.join(", ")}` : ""}`);
const fetches = code.filter((f) => /\bfetch\s*\(/.test(stripComments(read(f))));
check(fetches.length === 1 && fetches[0] === "js/anthropic.js", `only the shared client calls fetch (${fetches.join(", ") || "no module"})`);

// ---- inline -----------------------------------------------------------------------------------------
const inl = inlineIn(html);
check(!inl.length, `index.html has no inline script, style or handler${inl.length ? `: ${inl.join(", ")}` : ""}`);
const writers = code.flatMap((f) => jsWrites(read(f)).map((w) => `${f} ${w}`));
check(!writers.length, `no module writes markup, a style or a handler as text, or evaluates text${writers.length ? `: ${writers.join("; ")}` : ""}`);

// ---- storage ----------------------------------------------------------------------------------------
check(STORAGE.prefix === "pestel" && STORAGE.lang === "pestel.lang", `the tool keeps its language under "${STORAGE.lang}"`);
const langScript = read("js/lang.js");
const literalKeys = [...stripComments(langScript).matchAll(/(?:local|session)Storage\.(?:get|set|remove)Item\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
check(literalKeys.length && literalKeys.every((k) => k === STORAGE.lang), `js/lang.js reads the same key as js/config.js (${literalKeys.join(", ")})`);
check(/"vc-guide:"\s*\+/.test(langScript), "js/lang.js marks the guide as seen under Vici's vc-guide: key only");
const touching = [...code, "vici/dist/vici.js", "vici/dist/vici-theme.js"].filter((f) => /\b(localStorage|sessionStorage)\b/.test(stripComments(read(f))));
const stray = touching.filter((f) => !STORAGE_MODULES.includes(f));
check(!stray.length, `local and session storage appear only in ${STORAGE_MODULES.join(", ")}${stray.length ? `; also in ${stray.join(", ")}` : ` (found in ${touching.join(", ")})`}`);
const never = code.filter((f) => /\bindexedDB\b|\bcaches\s*\.\s*(open|match|keys|delete|has)\b|document\s*\.\s*cookie\b|\bcookieStore\b/.test(stripComments(read(f))));
check(!never.length, `no module uses IndexedDB, the Cache API or cookies${never.length ? `: ${never.join(", ")}` : ""}`);

// ---- Vici's own checks ------------------------------------------------------------------------------
const dir = viciDir();
if (!dir) {
  check(!REQUIRE_VICI, `${REQUIRE_VICI ? "FAIL" : "SKIP"}: no ViciDesign checkout beside the repository, so Vici's policy and storage checks did not run`);
} else {
  const lib = async (file) => import(pathToFileURL(path.join(dir, "scripts", "lib", file)).href);
  const { policyProblems } = await lib("policy.mjs");
  const { storageProblems } = await lib("storage.mjs");
  check(policyProblems('<html><head></head><body><p style="x">a</p></body></html>').length > 0, "control: Vici's policyProblems catches a page without a policy");
  check(storageProblems({ "js/run.js": "localStorage.setItem('run', x)" }, { allow: [] }).length > 0, "control: Vici's storageProblems catches storage in a module not allowed it");
  const p = policyProblems(html);
  check(!p.length, `Vici's policyProblems finds nothing in index.html${p.length ? `: ${p.join("; ")}` : ""}`);
  const sources = Object.fromEntries([...code, "index.html", "vici/dist/vici.js", "vici/dist/vici-theme.js"].map((f) => [f, read(f)]));
  const s = storageProblems(sources, { allow: STORAGE_MODULES });
  check(!s.length, `Vici's storageProblems finds nothing in ${Object.keys(sources).length} files${s.length ? `: ${s.join("; ")}` : ""}`);
}

report(results, "POLICY OK");
