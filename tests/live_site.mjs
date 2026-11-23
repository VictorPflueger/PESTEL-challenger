// The published site: GitHub Pages serves exactly the files of this checkout, and the page starts there
// with no error and no request to any other host. Run after a Pages build (the "live site" workflow does
// this on every Pages build) or by hand.
//   files   the page, its styles, scripts, strings, data and Vici's files as served equal this checkout
//           (Pages caches for up to ten minutes, so it retries for up to twelve);
//   start   the page opens in English and in German with its name, its four key figures waiting for
//           0.2.0, and the guide opening by itself on a first visit; api.anthropic.com is refused, so this
//           check never calls the real API (up to three tries a minute apart, for a deployment the CDN is
//           still taking up). From 0.2.0 it also plays a scenario to its end.
// In GitHub Actions every problem is also printed as an annotation (::error / ::warning).
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this tool's files and first screen.
// Usage: node tests/live_site.mjs [url]   (default: the address in js/config.js; LIVE_URL)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser } from "./lib/harness.mjs";

const { APP } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
const URL_BASE = (process.argv[2] || process.env.LIVE_URL || APP.url).replace(/\/?$/, "/");
const FILES = [
  "index.html", "favicon.svg", "css/app.css", "js/config.js", "js/main.js", "js/lang.js", "js/i18n/index.js",
  "js/i18n/en.js", "js/i18n/de.js", "js/risk.js", "js/engine.js", "js/schema.js", "js/schemas.js", "data/kpis.js",
  "vici/dist/vici.min.css", "vici/dist/vici.js", "vici/dist/vici-theme.js"
];
const WAIT_MS = Number(process.env.LIVE_WAIT_MS || 12 * 60 * 1000);
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const problems = [];

// 1. The files as served equal this checkout.
const deadline = Date.now() + WAIT_MS;
let stale = FILES;
while (true) {
  stale = [];
  for (const f of FILES) {
    try {
      const r = await fetch(`${URL_BASE}${f}?t=${Date.now()}`, { cache: "no-store" });
      const body = Buffer.from(await r.arrayBuffer());
      if (!r.ok || sha(body) !== sha(fs.readFileSync(path.join(APP_ROOT, f)))) stale.push(`${f} (${r.status})`);
    } catch (e) {
      stale.push(`${f} (${String(e.message || e).slice(0, 60)})`);
    }
  }
  if (!stale.length || Date.now() > deadline) break;
  console.log(`waiting for the site to serve this checkout: ${stale.join(", ")}`);
  await new Promise((r) => setTimeout(r, 30000));
}
if (stale.length) problems.push(`the site does not serve this checkout: ${stale.join(", ")}`);
else console.log(`PASS  files: ${FILES.length} files as served equal this checkout`);

// 2. The page starts there, in both languages.
async function startCheck() {
  const found = [];
  const browser = await launchBrowser();
  const hosts = new Set();
  const errors = [];
  try {
    for (const [lang, waits, guide] of [["en", "from version 0.2.0", "#guide-en[open]"], ["de", "ab Version 0.2.0", "#guide-de[open]"]]) {
      // A fresh context each time: a first visit, so the guide opens by itself.
      const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
      // Never the real API from a test.
      await context.route(/^https:\/\/api\.anthropic\.com\//, (route) => route.abort("blockedbyclient"));
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(String(e.message || e)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("request", (r) => { try { hosts.add(new URL(r.url()).host); } catch { /* data: URLs */ } });
      await page.goto(`${URL_BASE}?lang=${lang}`, { waitUntil: "load" });
      await page.waitForSelector('html[data-ready="true"]', { timeout: 30000 });
      const name = (await page.locator(".app-header .brand-name").innerText()).trim();
      if (name !== APP.name) found.push(`the ${lang} page is named "${name}"`);
      if ((await page.getAttribute("html", "data-lang")) !== lang) found.push(`?lang=${lang} did not open the page in that language`);
      const notes = await page.locator(".kpi .kpi-note").allInnerTexts();
      if (notes.length !== 4 || notes.some((n) => n.trim() !== waits)) found.push(`the ${lang} key figures read ${JSON.stringify(notes)}`);
      if (!(await page.waitForSelector(guide, { timeout: 10000 }).then(() => true, () => false))) found.push(`the ${lang} guide did not open by itself on a first visit`);
      await context.close();
    }
  } catch (e) {
    found.push(`the page did not start: ${String(e.message || e).split("\n")[0]}`);
  }
  const own = new URL(URL_BASE).host;
  const other = [...hosts].filter((h) => h !== own);
  if (other.length) found.push(`requests to other hosts: ${other.join(", ")}`);
  if (errors.length) found.push(`page errors: ${errors.slice(0, 3).join(" | ")}`);
  await browser.close();
  return found;
}

// In GitHub Actions each problem also becomes an annotation, readable without the job log.
const annotate = (level, text) => { if (process.env.GITHUB_ACTIONS === "true") console.log(`::${level} title=live site::${text.replace(/\r?\n/g, " ")}`); };

if (!stale.length) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const found = await startCheck();
    if (!found.length) { console.log(`PASS  start: the page opens in English and German on the published site, its figures waiting and its guide opening by itself${attempt > 1 ? ` (try ${attempt})` : ""}`); break; }
    if (attempt === 3) { problems.push(...found); break; }
    for (const f of found) { console.log(`WARN  try ${attempt}: ${f}`); annotate("warning", `try ${attempt}: ${f}`); }
    await new Promise((r) => setTimeout(r, 60000));
  }
}

for (const p of problems) annotate("error", p);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(`${URL_BASE}: ${problems.length} problem${problems.length === 1 ? "" : "s"}.`);
if (!problems.length) console.log("LIVE SITE OK");
process.exit(problems.length ? 1 : 0);
