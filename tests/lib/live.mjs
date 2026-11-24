// What the live suites share: a page with the stand-in in front of the API, and the moves a person makes in
// a live run, as a presenter would make them: Run it live, the form, Start the agents, the key and the box,
// Start the live run; then Challenge this analysis and Adopt these responses.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE } from "./harness.mjs";
import { createStandIn, routeApi, MOCK_KEY } from "./fake-claude.mjs";
import { formOf } from "./turns.mjs";

export { MOCK_KEY };
const mod = (f) => import(pathToFileURL(path.join(APP_ROOT, f)).href);
export const { REQUESTS } = await mod("js/schemas.js");
export const CONFIG = await mod("js/config.js");

/** A browser and the site, served once per suite. */
export async function liveSuite() {
  const { base, close } = await serveStatic(APP_ROOT);
  const browser = await launchBrowser();
  return { base, browser, async done() { await browser.close(); await close(); } };
}

/** A fresh page with the stand-in: options for createStandIn, the page's language, viewport and theme. */
export async function livePage(suite, { lang = "en", width = 1280, height = 720, theme = null, standIn = {}, modelsFault = null, query = "" } = {}) {
  const context = await suite.browser.newContext({ viewport: { width, height }, locale: "en-GB", acceptDownloads: true });
  await context.addInitScript((t) => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`.trim()));
    if (t) try { localStorage.setItem("vc-theme", t); } catch { /* storage blocked */ }
  }, theme);
  const s = createStandIn({ lang, REQUESTS, webSearchTool: CONFIG.ANTHROPIC.webSearchTool, ...standIn });
  const net = await routeApi(context, s, { modelsFault });
  const page = await context.newPage();
  const log = { pageErrors: [], consoleErrors: [], console: [] };
  page.on("pageerror", (e) => log.pageErrors.push(String(e.message || e)));
  page.on("console", (m) => { log.console.push(m.text()); if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) log.consoleErrors.push(m.text()); });
  await page.goto(`${suite.base}?lang=${lang}&guide=0${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
  return { context, page, log, standIn: s, net };
}

/** "Run it live", then the form filled with S3's company and the team's factors (or what a test gives). */
export async function fillForm(page, { lang = "en", form = null, sector = true } = {}) {
  if (await page.$("#btn-run-live")) await page.click("#btn-run-live");
  await page.waitForSelector("#live-name");
  const f = form || formOf("s3", lang, { sector });
  await page.fill("#live-name", f.company.name);
  await page.selectOption("#live-sector", f.company.sector || "");
  await page.fill("#live-country", f.company.country);
  await page.fill("#live-what", f.company.what);
  const byDim = {};
  for (const x of f.factors) (byDim[x.dimension] ||= []).push(x.text);
  for (const [d, lines] of Object.entries(byDim)) await page.fill(`#live-lines-${d}`, lines.join("\n"));
  return f;
}

/** Start the agents, the key and the box, then Start the live run, with a setting and research as asked. */
export async function startRun(page, { key = MOCK_KEY, preset = "balanced", research = false, cap = null, advanced = null, waitFor = "scan" } = {}) {
  await page.click("#btn-cta");
  await page.waitForSelector("#live-dialog[open]");
  await page.fill("#live-key", key);
  await page.check(`input[name="live-setting"][value="${preset}"]`);
  if (research) await page.check("#live-research");
  if (advanced) {
    await page.click("#live-advanced > summary");
    if (advanced.model) await page.selectOption("#live-model", advanced.model);
    if (advanced.effort) await page.selectOption("#live-effort", advanced.effort);
  }
  if (cap !== null) await page.$eval("#live-cap", (el, v) => { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, cap);
  await page.check("#live-ack");
  await page.click("#live-start");
  if (waitFor === "scan") {
    await page.waitForFunction(() => !document.querySelector("#live-dialog[open]"), null, { timeout: 10000 });
    await waitIdle(page);
  }
}

/** Until a run exists and no agent works, and the page has drawn what it holds. */
export async function waitIdle(page, timeout = 20000) {
  await page.waitForFunction(() => { const r = window.__pestel?.run(); return !!r && !r.working && !document.querySelector(".work-card"); }, null, { timeout, polling: 50 });
  await page.waitForTimeout(50);
}

/** The run as the page holds it, for the suites to read: no key in it. */
export const runOf = (page) => page.evaluate(() => window.__pestel?.run?.() ?? null);

/** Challenge this analysis, then wait until the Red team, the Analyst and the Strategist are done. */
export async function challenge(page) {
  await page.click("#btn-cta");
  await waitIdle(page);
}

/** On to Respond through the step bar, then Adopt these responses, and wait for the summary. */
export async function adopt(page) {
  if (!(await page.$('.vc-step[data-step="respond"].vc-step--current'))) await page.click('.vc-step[data-step="respond"] .vc-step__button');
  await page.waitForSelector('.vc-step[data-step="respond"].vc-step--current');
  await page.click("#btn-cta");
  await waitIdle(page);
}

/** The problems a page left: page errors, console errors, policy violations, requests to other hosts. */
export async function pageProblems(t) {
  const csp = await t.page.evaluate(() => window.__csp || []).catch(() => ["<page gone>"]);
  return [...t.log.pageErrors.map((e) => `page error: ${e}`), ...t.log.consoleErrors.map((e) => `console: ${e}`), ...csp.map((c) => `policy: ${c}`), ...t.net.external.map((x) => `outside host: ${x}`), ...t.standIn.violations.map((v) => `protocol: ${v}`)];
}
