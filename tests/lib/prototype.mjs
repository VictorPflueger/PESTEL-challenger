// What differs between the prototypes in the shared Vici tests (tests/tokens.mjs, tests/hexagon.mjs and
// tests/page-icon.mjs). Those files are the same in the Sovereignty Assessment and its siblings; this file
// is the one place that is not. Everything here is the PESTEL Challenger's.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this tool's name, colours, tour and icon.

/** The prototype's name, as on its page and on its card on Victor's website. */
export const NAME = "PESTEL Challenger";

/**
 * Colour pairs only this prototype draws (the shared shell's pairs are in tests/tokens.mjs):
 * [what, foreground token, background token, kind]. kind "text" needs 4.5:1, "mark" (a line, an icon,
 * a control's border, a bar) 3:1 (WCAG 2.2, 1.4.3 and 1.4.11). Tokens are Vici's, without "--vc-".
 * Version 0.1.0 draws the frame and the list of six dimensions; the hexagon, the matrix and the factor
 * states join in 0.2.0. The six letters sit in Vici's lilac cells, whose palette colours are the same in
 * both themes; tests/layout.mjs measures them as rendered. The list's frame and dividers are decoration
 * (each dimension is told apart by its letter, name and question), so they are not held to 3:1.
 */
export const COLOUR_PAIRS = [
  ["The strip under the header: the sentence and \"Built by\"", "text-muted", "surface", "text"],
  ["The stage: title, lead and the six names on the page", "text", "bg", "text"],
  ["The stage: the version note and each dimension's question", "text-muted", "bg", "text"],
  ["A key figure that waits: its \"…\" and what it waits for", "text-muted", "surface", "text"],
  ["The pressed language: its word on the soft merlot tint", "on-accent-soft", "accent-soft", "text"],
  ["The mode tag: SIMULATION on its plain tint", "neutral-text", "neutral-bg", "text"]
];

/**
 * Colours that must stay apart, beyond the shared ones in tests/tokens.mjs: [what, token, token]. The test
 * reports how far apart they stay under colour-vision deficiency; it does not fail on them. From 0.2.0 a
 * dimension under pressure (coral), one to watch (honey) and a factor responded to (sage) also carry a mark
 * and a word (DESIGN.md, Colour).
 */
export const SEPARATIONS = [
  ["Under pressure (danger) vs to watch (warning)", "danger-solid", "warning-text"],
  ["Under pressure vs responded to (success)", "danger-solid", "success-solid"],
  ["The AI (lilac) vs you (merlot)", "feature-solid", "accent"]
];

/**
 * The hexagon test's tour of the page (tests/hexagon.mjs): the guide that opens by itself and each of its
 * six chapters, the first screen, the method dialog, then every step of the default scenario in English and
 * German with every closed part of the stage opened (factor items, signals, the tables behind the risk
 * matrix and the horizon strip), and the German guide. The page has just been opened, without ?guide=0, so
 * the guide opens by itself. visit(name, { settle }) checks the page as it is, settle ms (250) after the step.
 */
/** The steps in order, as #stage's data-step names them (js/run.js STEPS). */
export const STEP_NAMES = ["start", "scan", "challenge", "assess", "respond", "summary"];

export async function hexagonTour(page, visit) {
  await page.waitForSelector('html[data-ready="true"]', { timeout: 20000 });
  await page.waitForSelector("#guide-en[open]", { timeout: 10000 });
  await visit("the guide, opened by itself: What it does");
  for (const chapter of ["How it works", "The six steps", "The cost estimate", "What is real", "How to present"]) {
    await page.click("#guide-en [data-vc-guide-next]");
    await visit(`the guide: ${chapter}`, { settle: 200 });
  }
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 5000 });
  await visit("the first screen");
  await page.click('[data-vc-open="method"]');
  await page.waitForSelector("#method[open]", { timeout: 5000 });
  await visit("the method dialog");
  await page.keyboard.press("Escape");
  const base = page.url().split("?")[0];
  for (const lang of ["en", "de"]) {
    for (let step = 0; step <= 5; step += 1) {
      await page.goto(`${base}?guide=0&lang=${lang}&scenario=s3&step=${step}`);
      await page.waitForSelector('html[data-ready="true"]', { timeout: 20000 });
      await page.waitForSelector(`#stage[data-step="${STEP_NAMES[step]}"]`, { timeout: 10000 });
      await page.evaluate(() => { for (const d of document.querySelectorAll("#stage details")) d.open = true; });
      await visit(`${lang}, step ${step} with everything open`, { settle: 300 });
    }
  }
  await page.click('[data-vc-guide-open="guide-de"]');
  await page.waitForSelector("#guide-de[open]", { timeout: 5000 });
  await visit("the German guide");
  await page.keyboard.press("Escape");
}

/**
 * The page icon (tests/page-icon.mjs): the icon and kind of this prototype's card on Victor's website
 * (VictorPflueger/VIP, data/prototypes.js; the card arrives with 1.0.0), the colour of that kind's cell
 * (Vici's lilac for a prototype), and favicon.svg exactly: the card's cell drawn for small sizes.
 */
export const PAGE_ICON = {
  icon: "radar",
  kind: "prototype",
  tone: "lilac",
  favicon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 103.92">
  <!-- PESTEL Challenger's page icon: Vici's radar icon in a lilac hexagon cell, as on the tool's card on
       Victor Pflüger's website (kind "prototype"). Vici's lilac 100 (#f2e9fd) and lilac 900 (#372544); the
       icon is drawn larger and bolder than on the card so that it still reads at 16 px. -->
  <polygon points="120,51.96 90,103.92 30,103.92 0,51.96 30,0 90,0" fill="#f2e9fd"/>
  <g transform="translate(18 9.96) scale(3.5)" fill="none" stroke="#372544" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12 L16.5 19.79 L7.5 19.79 L3 12 L7.5 4.21 L16.5 4.21 Z"/>
    <path d="M16.5 12 L14.25 15.9 L9.75 15.9 L7.5 12 L9.75 8.1 L14.25 8.1 Z"/>
    <path d="M12 12 L16 5.07"/>
  </g>
</svg>
`
};
