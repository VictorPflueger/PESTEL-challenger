// The views in Chromium (AC-17), on every screen of the three scenarios in both languages:
//   ring      the six dimensions sit around the company as Vici's ring of hexagon cells, the centre first,
//             and every state a cell has shows a mark and a word (Vici's ringProblems);
//   items     every factor list keeps Vici's framework rules: each item's source and state with a mark and
//             a word, each area its title and state (frameworkProblems);
//   matrix    the risk matrix and the horizon strip keep Vici's rules (riskMatrixProblems,
//             horizonProblems), and each has a table of its numbers one click away, a row per threat;
//   click     at Scan and Challenge a click on a cell lists that dimension's factors, as the run model holds
//             them, with their states, and marks the cell pressed;
// and each Vici check first fails on a planted control made from a rendered screen.
// The functions come from a ViciDesign checkout (VICI_DIR, or ../ViciDesign); without one the suite says
// so and passes, unless --require-vici is given or it runs on GitHub Actions.
// Usage: node tests/views.mjs [--require-vici]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, viciDir, launchBrowser, serveStatic, report } from "./lib/harness.mjs";
import { eachScreen, STEP_NAMES } from "./lib/screens.mjs";

const dir = viciDir();
if (!dir) {
  console.log(`${REQUIRE_VICI ? "FAIL" : "SKIP"}  no ViciDesign checkout in VICI_DIR or next to this repository (../ViciDesign)`);
  process.exit(REQUIRE_VICI ? 1 : 0);
}
const lib = async (file) => import(pathToFileURL(path.join(dir, "scripts", "lib", file)).href);
const { ringProblems } = await lib("ring.mjs");
const { horizonProblems } = await lib("horizon.mjs");
const { riskMatrixProblems } = await lib("risk.mjs");
const { frameworkProblems } = await lib("framework.mjs");

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const server = await serveStatic(APP_ROOT);
const browser = await launchBrowser();

// ---- every screen ------------------------------------------------------------------------------------------
const found = { ring: [], framework: [], matrix: [], horizon: [] };
const seen = { ring: 0, framework: 0, matrix: 0, horizon: 0, tables: 0 };
const tables = [];
let sample = null;
const errors = await eachScreen(browser, server.base, async ({ page, sc, lang, name, html }) => {
  const where = `${sc} ${lang} ${name}`;
  if (/\bvc-ring\b/.test(html)) { seen.ring += 1; for (const p of ringProblems(html)) found.ring.push(`${where}: ${p}`); }
  if (/\bvc-framework__area\b/.test(html)) { seen.framework += 1; for (const p of frameworkProblems(html)) found.framework.push(`${where}: ${p}`); }
  if (/\bvc-risk__grid\b/.test(html)) { seen.matrix += 1; for (const p of riskMatrixProblems(html)) found.matrix.push(`${where}: ${p}`); }
  if (/\bvc-horizon\b/.test(html)) { seen.horizon += 1; for (const p of horizonProblems(html)) found.horizon.push(`${where}: ${p}`); }
  if (name === "assess") {
    // One click away: the summary of each figure's details opens a table with a row per numbered threat.
    const m = await page.evaluate(async () => {
      const out = [];
      for (const fig of document.querySelectorAll("#stage .matrix, #stage .strip")) {
        const d = fig.querySelector("details");
        d.open = false;
        d.querySelector("summary").click();
        await new Promise((r) => requestAnimationFrame(r));
        const table = d.querySelector("table");
        const markers = new Set([...fig.querySelectorAll(".vc-risk__marker:not(.vc-risk__marker--residual)")].map((x) => x.textContent.trim()));
        out.push({ fig: fig.classList.contains("matrix") ? "risk matrix" : "horizon strip", open: d.open, shown: !!table && table.getClientRects().length > 0, rows: table ? table.tBodies[0].rows.length : 0, markers: markers.size });
      }
      return out;
    });
    for (const x of m) {
      seen.tables += 1;
      if (!(x.open && x.shown && x.rows === x.markers && x.rows > 0)) tables.push(`${where}: the ${x.fig}'s table ${x.shown ? `has ${x.rows} rows for ${x.markers} threats` : "does not open with one click"}`);
    }
  }
  if (sc === "s3" && lang === "en" && name === "challenge") sample = html;
});
check(seen.ring >= 24 && !found.ring.length, `ring: Vici's ring rules hold on ${seen.ring} screens${found.ring.length ? `; ${found.ring.slice(0, 3).join("; ")}` : ""}`);
check(seen.framework >= 18 && !found.framework.length, `items: Vici's framework rules hold on ${seen.framework} screens with factor lists${found.framework.length ? `; ${found.framework.slice(0, 3).join("; ")}` : ""}`);
check(seen.matrix >= 6 && !found.matrix.length, `matrix: Vici's risk-matrix rules hold on ${seen.matrix} screens${found.matrix.length ? `; ${found.matrix.slice(0, 3).join("; ")}` : ""}`);
check(seen.horizon >= 6 && !found.horizon.length, `matrix: Vici's horizon-strip rules hold on ${seen.horizon} screens${found.horizon.length ? `; ${found.horizon.slice(0, 3).join("; ")}` : ""}`);
check(seen.tables >= 12 && !tables.length, `matrix: on all ${seen.tables / 2} Assess screens the risk matrix and the horizon strip each open a table of their numbers with one click, a row per threat${tables.length ? `; ${tables.slice(0, 3).join("; ")}` : ""}`);
check(!errors.length, `no page error on any screen${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`);

// ---- controls: each check fails on a planted mistake in a rendered screen -----------------------------------------
if (sample) {
  check(ringProblems(sample.replace(/<span class="vc-ring__state">[\s\S]*?<\/span><\/span>/, "</span>")).length > 0 || ringProblems(sample.replace(/class="vc-ring__state"/, 'class="state-gone"')).length > 0, "control: ringProblems catches a cell under pressure that lost its word");
  check(frameworkProblems(sample.replace(/vc-item__state--source/g, "gone")).length > 0, "control: frameworkProblems catches AI items that lost their tag");
} else check(false, "control: the challenge screen of S3 was captured");
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${server.base}?guide=0&scenario=s3&step=3`);
  await page.waitForSelector('#stage[data-step="assess"]');
  const html = await page.$eval("#stage", (s) => s.outerHTML);
  check(riskMatrixProblems(html.replace(/<details class="vc-risk__numbers"[\s\S]*?<\/details>/, "")).length > 0, "control: riskMatrixProblems catches a matrix without its table");
  check(horizonProblems(html.replace(/(<li class="vc-horizon__lane"[^>]*>[\s\S]*?)<span class="vc-horizon__label">[\s\S]*?<\/span>(\s*<span)/, "$1$2").replace(/class="vc-horizon__label"/, 'class="gone"')).length > 0, "control: horizonProblems catches a lane that no longer names its span");
  await ctx.close();
}

// ---- click: a cell lists its dimension's factors ------------------------------------------------------------
for (const [sc, lang, step] of [["s3", "en", 1], ["s3", "de", 2], ["s1", "en", 2], ["s2", "de", 1]]) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=${sc}&step=${step}`);
  await page.waitForSelector(`#stage[data-step="${STEP_NAMES[step]}"]`);
  const wrong = [];
  for (const dim of ["political", "economic", "social", "technological", "environmental", "legal"]) {
    await page.click(`.vc-ring__cell[data-dim="${dim}"]`);
    await page.waitForTimeout(60);
    const m = await page.evaluate(async ({ sc, lang, step, dim }) => {
      const S = await import("/js/simulation.js");
      const R = await import("/js/run.js");
      const P = await import("/js/plain.js");
      const run = S.runFromScenario(S.scenarioById(sc), lang, S.freshState());
      const want = R.factorsAt(run, step).filter((f) => f.dimension === dim).map((f) => f.text);
      const area = document.querySelector("#stage .dim-panel .vc-framework__area, #stage .vc-framework__area");
      const title = area?.querySelector(".vc-framework__title")?.textContent ?? "";
      const items = [...(area?.querySelectorAll(".vc-item") ?? [])];
      // The page keeps "65 %" on one line with a no-break space; the run model writes a plain one.
      const plain = (x) => x.replace(/\u00a0/g, " ").trim();
      const got = items.map((i) => plain([...i.querySelector(".vc-item__text").childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("")));
      want.splice(0, want.length, ...want.map(plain));
      const pressed = [...document.querySelectorAll(".vc-ring__cell[aria-pressed='true']")].map((c) => c.dataset.dim);
      const states = items.every((i) => i.querySelector(".vc-item__mark") && i.querySelector(".vc-item__state")?.textContent.trim());
      return { want, got, title, name: P.dimName(dim, lang), pressed, states };
    }, { sc, lang, step, dim });
    const same = m.want.length === m.got.length && m.want.every((t) => m.got.includes(t));
    if (!same || !m.title.includes(m.name) || m.pressed.join() !== dim || !m.states) wrong.push(`${dim}: ${m.got.length} of ${m.want.length} factors, title "${m.title}", pressed [${m.pressed}]${m.states ? "" : ", an item without its mark or word"}`);
  }
  check(!wrong.length, `click (${sc} ${lang} ${STEP_NAMES[step]}): each of the six cells lists its dimension's factors with their states and is marked pressed${wrong.length ? `; ${wrong.slice(0, 3).join("; ")}` : ""}`);
  await ctx.close();
}

await browser.close();
await server.close();
report(results, "VIEWS OK");
