// Every screen of the simulation, rendered in Chromium: each scenario, each language and each step, with
// every closed part of the stage opened (factor items, signals, the tables behind the risk matrix and the
// horizon strip), so a check reads all a person can bring into view. Shared by tests/views.mjs and
// tests/vici.mjs.

export const SCENARIO_IDS = ["s1", "s2", "s3"];
/** The steps in order, as #stage's data-step names them (js/run.js STEPS). */
export const STEP_NAMES = ["start", "scan", "challenge", "assess", "respond", "summary"];

/**
 * Calls visit({ page, sc, lang, step, name, html, text }) for every screen: html is the stage's markup,
 * text what it reads (the key figures included). Requests to any other host are refused. Returns the page
 * errors seen on the way.
 */
export async function eachScreen(browser, base, visit, { width = 1600, height = 900, langs = ["en", "de"], scenarios = SCENARIO_IDS } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-GB" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  for (const sc of scenarios) {
    for (const lang of langs) {
      for (let step = 0; step < STEP_NAMES.length; step += 1) {
        await page.goto(`${base}?guide=0&lang=${lang}&scenario=${sc}&step=${step}`);
        await page.waitForSelector(`#stage[data-step="${STEP_NAMES[step]}"]`, { timeout: 15000 });
        await page.evaluate(() => { for (const d of document.querySelectorAll("#stage details")) d.open = true; });
        const shot = await page.evaluate(() => ({
          html: document.getElementById("stage").outerHTML,
          text: `${document.querySelector(".kpis").innerText}\n${document.getElementById("stage").innerText}`,
        }));
        await visit({ page, sc, lang, step, name: STEP_NAMES[step], ...shot });
      }
    }
  }
  await context.close();
  return errors;
}
