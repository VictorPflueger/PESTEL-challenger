// The report's files (brief §9, AC-13), in Chromium: the HTML file and the handoff file the Summary's last bar
// downloads, under the report's file names.
//   - The HTML file is self-contained: the report's markup with the title as its h1 and Vici's report rule
//     kept, its pictures as data, its own policy that loads nothing, no script and no web font. Opened with
//     scripts off and the network shut, it asks for nothing and shows every page; printed, every page carries
//     the footer (in the margin boxes where the file holds them, else its fixed footer).
//   - The handoff file validates against schemas/strategy-challenge-1.json and the Prototype Ideator reads it.
//   - Neither holds anything shaped like a key, and a live run's files carry its language and its model.
// Needs a ViciDesign checkout beside the repository for the PDF reader and the report rule.
// Usage: node tests/report-files.mjs [--require-vici]
import path from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { launchBrowser, serveStatic, APP_ROOT, viciDir, REQUIRE_VICI, report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf, MOCK_KEY } from "./lib/live.mjs";
import { handoffProblems } from "../js/handoff.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const vici = viciDir();
if (!vici) {
  console.log("No ViciDesign checkout beside the repository: this suite needs its PDF reader and report rule.");
  if (REQUIRE_VICI) { check(false, "a ViciDesign checkout sits beside the repository"); report(results, "REPORT FILES OK"); }
  process.exit(0);
}
const { pdfPageTexts } = await import(pathToFileURL(path.join(vici, "scripts/lib/pdf.mjs")).href);
const { reportProblems } = await import(pathToFileURL(path.join(vici, "scripts/lib/report.mjs")).href);
const ideatorDir = path.resolve(APP_ROOT, "..", "PrototypeIdeator");
const ideator = existsSync(path.join(ideatorDir, "js", "handoff.js")) ? await import(pathToFileURL(path.join(ideatorDir, "js", "handoff.js")).href) : null;
if (!ideator) check(!REQUIRE_VICI, "the Prototype Ideator's checkout sits beside this repository");

const squeeze = (s) => String(s).replace(/\s+/g, "").normalize("NFKC");
const KEYISH = /sk-ant-[A-Za-z0-9_-]{8,}/;
const POLICY = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`;

/** Downloads what a button gives: { name, text }. */
async function download(page, selector) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click(selector)]);
  return { name: d.suggestedFilename(), text: await readFile(await d.path(), "utf8") };
}

/** The HTML file, opened with scripts off and every request refused, then printed. */
async function openFile(browser, html) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const asked = [];
  await context.route("**/*", (route) => { asked.push(route.request().url()); route.abort(); });
  const p = await context.newPage();
  await p.setContent(html, { waitUntil: "load" });
  const seen = await p.evaluate(() => ({
    pages: document.querySelectorAll(".vc-report__page").length,
    h1: [...document.querySelectorAll("h1")].map((x) => x.className),
    sheet: getComputedStyle(document.querySelector(".vc-report__page")).backgroundColor,
    broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length,
    images: document.images.length,
    fixed: document.querySelector(".vc-report__footer > span")?.textContent || "",
  }));
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  await context.close();
  return { asked, seen, pages: pdfPageTexts(pdf).map(squeeze) };
}

function fileChecks(where, file, shownPages, lang, browserOut, { live = false } = {}) {
  const html = file.text;
  check(new RegExp(`^pestel-challenger-[a-z0-9-]+-\\d{4}-\\d{2}-\\d{2}-${lang}\\.html$`).test(file.name), `${where}: the HTML file is named ${file.name}`);
  check(html.startsWith("<!DOCTYPE html>") && html.includes(POLICY) && !/<script\b/i.test(html) && !/@font-face/i.test(html), `${where}: one file with its own policy that loads nothing, no script and no web font`);
  check(!/\bsrc="(?!data:)/i.test(html) && !/url\((?!["']?data:)/i.test(html), `${where}: every picture is in the file as data`);
  check(!KEYISH.test(html), `${where}: nothing in it is shaped like a key`);
  const rule = reportProblems(html);
  check(!rule.length, `${where}: the file keeps Vici's report rule${rule.length ? `: ${rule.join("; ")}` : ""}`);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  check(kb < 600, `${where}: the file weighs ${kb} KB`);
  const o = browserOut;
  check(!o.asked.length, `${where}: opened offline, it asks for nothing${o.asked.length ? ` (${o.asked.slice(0, 2).join(", ")})` : ""}`);
  check(o.seen.pages === shownPages && o.seen.h1.length === 1 && o.seen.h1[0].includes("vc-report__title") && o.seen.sheet === "rgb(255, 255, 255)",
    `${where}: it shows the ${shownPages} pages on white sheets, the title as its one h1`);
  check(o.seen.images >= 2 && !o.seen.broken, `${where}: the byline's portrait and mark show (${o.seen.images} pictures, ${o.seen.broken} broken)`);
  const start = squeeze(`${lang === "de" ? "Erstellt mit" : "Created with"} PESTEL Challengerhttps://victorpflueger.github.io/PESTEL-challenger/`);
  const boxes = /@bottom-right/.test(html);
  const missing = o.pages.map((text, n) => (boxes ? text.includes(start) && text.includes(squeeze(`${lang === "de" ? "Seite" : "page"} ${n + 1} ${lang === "de" ? "von" : "of"} ${o.pages.length}`)) : text.includes(squeeze(o.seen.fixed))) ? null : n + 1).filter(Boolean);
  check(o.pages.length >= 3 && !missing.length, `${where}: printed, all ${o.pages.length} pages carry the footer ${boxes ? "in the margin boxes" : "fixed, since this browser writes no margin rules out"}${missing.length ? `; missing on ${missing.join(", ")}` : ""}`);
  if (live) check(/data-mode="live"/.test(html), `${where}: the file is a live run's report`);
}

function handoffChecks(where, file, lang, { live = false, model = null } = {}) {
  check(new RegExp(`^pestel-challenger-[a-z0-9-]+-\\d{4}-\\d{2}-\\d{2}-${lang}\\.json$`).test(file.name), `${where}: the handoff file is named ${file.name}`);
  let json = null;
  try { json = JSON.parse(file.text); } catch { /* checked below */ }
  check(json, `${where}: the handoff file is JSON`);
  if (!json) return;
  const problems = handoffProblems(json);
  check(!problems.length, `${where}: it validates against strategy-challenge-1${problems.length ? `: ${problems.slice(0, 3).join("; ")}` : ""}`);
  check(json.language === lang && json.mode === (live ? "live" : "simulation") && json.model === model, `${where}: language ${json.language}, mode ${json.mode}, model ${json.model}`);
  check(!KEYISH.test(file.text) && !file.text.includes(MOCK_KEY), `${where}: nothing in it is shaped like a key`);
  if (ideator) {
    const read = ideator.readHandoff(json, { file: file.name });
    check(read.ok, `${where}: the Prototype Ideator reads it${read.ok ? ` (${read.issues.length} issues)` : `: ${read.problems.slice(0, 3).join("; ")}`}`);
  }
}

// ---- the simulation, in both languages ---------------------------------------------------------------------
{
  const { base, close } = await serveStatic(APP_ROOT);
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "en-GB", acceptDownloads: true });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  for (const [sc, lang] of [["s1", "en"], ["s2", "de"], ["s3", "en"]]) {
    const where = `${sc} ${lang}`;
    await page.goto(`${base}?guide=0&lang=${lang}&scenario=${sc}&step=5`);
    await page.waitForSelector("#report");
    const shownPages = await page.$$eval("#report .vc-report__page", (x) => x.length);
    const file = await download(page, "#btn-save-html");
    fileChecks(where, file, shownPages, lang, await openFile(browser, file.text));
    handoffChecks(where, await download(page, "#btn-save-json"), lang);
    const ideatorLink = await page.$eval("#link-ideator", (a) => ({ href: a.href, target: a.target, rel: a.rel }));
    check(ideatorLink.href === "https://victorpflueger.github.io/PrototypeIdeator/" && ideatorLink.target === "_blank" && /noopener/.test(ideatorLink.rel), `${where}: "Turn this report into prototype ideas" opens the Prototype Ideator in a new tab`);
  }
  await context.close();
  await browser.close();
  await close();
}

// ---- a live run, in German: its own language, its model, the leave-page warning lifted ----------------------------
{
  const suite = await liveSuite();
  const t = await livePage(suite, { lang: "de" });
  await fillForm(t.page, { lang: "de" });
  await startRun(t.page);
  await challenge(t.page);
  await adopt(t.page);
  const run = await runOf(t.page);
  const where = "live de";
  check(run?.summary && run?.lang === "de", `${where}: the run reached the summary in German`);
  await t.page.waitForSelector("#report");
  const shownPages = await t.page.$$eval("#report .vc-report__page", (x) => x.length);
  const file = await download(t.page, "#btn-save-html");
  fileChecks(where, file, shownPages, "de", await openFile(suite.browser, file.text), { live: true });
  handoffChecks(where, await download(t.page, "#btn-save-json"), "de", { live: true, model: run.setting.model });
  const asks = await t.page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); dispatchEvent(e); return e.defaultPrevented; });
  check(!asks, `${where}: once the report is downloaded, leaving the page asks nothing`);
  await t.context.close();
  await suite.done();
}

report(results, "REPORT FILES OK");
