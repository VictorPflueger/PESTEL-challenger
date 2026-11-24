// The presenter in Chromium (AC-05 and AC-07), at 1280 × 720 unless said:
//   offline   every scenario plays from Start to Summary in English and German without a key, by the
//             "Your turn" buttons and Next, with no request to any host but the page's own and no error;
//   honest    SIMULATION stands in the header and the fictional-company label on every step;
//   first     before anything runs, the key figures show the engine's analysis of the scenario: money at
//             stake, dimensions under pressure and readiness, and the session cost as an estimate;
//   decision  adopting the responses strikes the old values through beside the engine's new ones;
//   choice    another choice than the recommended one gives tiles and a "Your turn" sentence that agree
//             with the engine for those choices;
//   respond   at Respond every option of every factor shows in full above the "Your turn" bar;
//   play      Play stops where the person acts (Start, Scan, Respond), and holds each other step as long as
//             its words take to read, 7 to 14 seconds;
//   keys      the arrow keys and a clicker's PageDown and PageUp move between steps, Space plays and pauses,
//             and the address follows the step;
//   links     ?scenario=&step= opens a scenario at a step, with the recommended responses adopted at Summary;
//   update    on day 91 after a scenario's facts were read, Start shows "Check for updates"; on day 90 not.
// Usage: node tests/presenter.mjs
import { APP_ROOT, launchBrowser, serveStatic, report, NETWORK_NOISE } from "./lib/harness.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const server = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const foreign = [];
const STEPS = ["start", "scan", "challenge", "assess", "respond", "summary"];
const SCENARIOS = ["s1", "s2", "s3"];

async function open(query, { width = 1280, height = 720 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-GB" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => { foreign.push(route.request().url()); return route.abort("blockedbyclient"); });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(`console: ${m.text().slice(0, 160)}`); });
  await page.goto(`${server.base}${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
  return { context, page, errors };
}

const stepOf = (page) => page.$eval("#stage", (s) => s.dataset.step);
const waitStep = (page, name, timeout = 5000) => page.waitForSelector(`#stage[data-step="${name}"]`, { timeout });

/** The four tiles as they read: value without its tail, the tail, the struck value, the tile's state. */
const tiles = (page) => page.evaluate(() => Object.fromEntries(["stake", "pressure", "readiness", "cost"].map((k) => {
  const el = document.getElementById(`kpi-${k}`);
  const v = el.querySelector(".kpi-value");
  const tail = v.querySelector(".kpi-tail")?.textContent ?? "";
  const was = el.querySelector(".kpi-was");
  return [k, { value: v.textContent.slice(0, v.textContent.length - tail.length).trim(), tail: tail.trim(), was: was.hidden ? null : was.textContent, state: el.dataset.state }];
})));

/** What the engine gives for a scenario, a language and a set of choices (the recommended ones by default). */
const engine = (page, { sc, lang, choices = {} }) => page.evaluate(async ({ sc, lang, choices }) => {
  const S = await import("/js/simulation.js");
  const R = await import("/js/run.js");
  const E = await import("/js/engine.js");
  const F = await import("/js/format.js");
  const I = await import("/js/i18n/index.js");
  const state = S.freshState();
  for (const [k, v] of Object.entries(choices)) state.choices.set(k, v);
  state.decided = true;
  const r = R.figures(S.runFromScenario(S.scenarioById(sc), lang, state));
  const pick = (x) => ({ stake: F.money(x.atStake, lang), pressure: I.t("fig.pressure", { n: x.pressure.length }, lang), readiness: E.readinessText(x.readiness, lang) });
  return { before: pick(r.before), after: pick(r.after) };
}, { sc, lang, choices });

/** Both labels a step must show: SIMULATION in the header, the fictional company on the stage. */
const labels = (page) => page.evaluate(() => {
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  return { sim: shown(document.getElementById("mode-tag")), fictional: shown(document.querySelector("#stage .fictional")) };
});

/** At Respond: every option of every factor, in turn, sits above the "Your turn" bar and is not cut. */
async function optionsAbove(page) {
  const n = await page.$$eval(".decide-item", (els) => els.length);
  const bad = [];
  for (let i = 0; i < n; i += 1) {
    await page.click(`.decide-item >> nth=${i}`);
    await page.waitForTimeout(60);
    const m = await page.evaluate(() => {
      const bar = document.querySelector(".turn-bar").getBoundingClientRect();
      const box = document.querySelector(".decide").getBoundingClientRect();
      return [...document.querySelectorAll(".option")].map((o) => { const r = o.getBoundingClientRect(); return { text: o.querySelector(".option-kind").textContent, ok: r.bottom <= Math.min(bar.top, box.bottom) + 0.5 && r.top >= box.top - 0.5 && o.scrollHeight <= o.clientHeight + 1 }; });
    });
    for (const o of m) if (!o.ok) bad.push(`factor ${i + 1}: ${o.text}`);
  }
  return { n, bad };
}

// ---- offline, honest, first, decision, respond: every scenario in both languages ------------------------
for (const sc of SCENARIOS) {
  for (const lang of ["en", "de"]) {
    const where = `${sc} ${lang}`;
    const { context, page, errors } = await open(`?guide=0&scenario=${sc}&lang=${lang}`);
    try {
      const want = await engine(page, { sc, lang });
      const t0 = await tiles(page);
      check(t0.stake.value === want.before.stake && t0.pressure.value === want.before.pressure && t0.readiness.value === want.before.readiness && t0.stake.state === "ready",
        `first (${where}): before anything runs the tiles show the engine's analysis: ${t0.stake.value} ${t0.stake.tail}, ${t0.pressure.value}, readiness ${t0.readiness.value}`);
      check(t0.cost.state === "estimate" && /^≈ /.test(t0.cost.value), `first (${where}): the session cost is an estimate: ${t0.cost.value}`);
      const seen = [];
      const honest = [];
      const visit = async () => { const s = await stepOf(page); seen.push(s); const l = await labels(page); if (!l.sim || !l.fictional) honest.push(`${s}${l.sim ? "" : " without SIMULATION"}${l.fictional ? "" : " without the fictional label"}`); };
      await visit();
      await page.click("#btn-cta"); await waitStep(page, "scan"); await visit();
      await page.click("#btn-cta"); await waitStep(page, "challenge"); await visit();
      await page.click("#btn-next"); await waitStep(page, "assess"); await visit();
      await page.click("#btn-next"); await waitStep(page, "respond"); await visit();
      const above = await optionsAbove(page);
      check(!above.bad.length, `respond (${where}): every option of all ${above.n} factors shows in full above the "Your turn" bar${above.bad.length ? `; not: ${above.bad.slice(0, 4).join(", ")}` : ""}`);
      await page.click("#btn-cta"); await waitStep(page, "summary"); await visit();
      check(seen.join(",") === STEPS.join(","), `offline (${where}): plays from Start to Summary by "Your turn" and Next: ${seen.join(" → ")}`);
      check(!honest.length, `honest (${where}): SIMULATION and the fictional-company label on every step${honest.length ? `; missing at ${honest.join(", ")}` : ""}`);
      const t1 = await tiles(page);
      const ok = t1.stake.value === want.after.stake && t1.stake.was === want.before.stake
        && t1.pressure.value === want.after.pressure && t1.pressure.was === want.before.pressure
        && t1.readiness.value === want.after.readiness && t1.readiness.was === want.before.readiness;
      check(ok, `decision (${where}): adopting strikes the old values through beside the engine's new ones: ${t1.stake.was} → ${t1.stake.value}, ${t1.pressure.was} → ${t1.pressure.value}, ${t1.readiness.was} → ${t1.readiness.value}`);
      check(!errors.length, `offline (${where}): no page error${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`);
    } catch (e) {
      check(false, `offline (${where}): the walk stopped: ${String(e.message).split("\n")[0]}`);
    }
    await context.close();
  }
}

// ---- choice: other responses than the recommended ones ------------------------------------------------------
for (const [sc, lang] of [["s3", "en"], ["s1", "de"]]) {
  const { context, page, errors } = await open(`?guide=0&scenario=${sc}&lang=${lang}&step=4`);
  try {
    await waitStep(page, "respond");
    // For the first two factors, the first option that is not chosen yet; for the third, Accept.
    const picked = {};
    for (let i = 0; i < 3; i += 1) {
      await page.click(`.decide-item >> nth=${i}`);
      const choice = await page.evaluate((last) => {
        const radios = [...document.querySelectorAll(".options input[type=radio]")];
        const target = last ? radios.find((r) => r.value === "accept") : radios.find((r) => !r.checked && r.value !== "accept");
        if (!target) return null;
        target.closest("label").click();
        return { factor: target.name.replace(/^choice-/, ""), value: target.value };
      }, i === 2);
      if (choice) picked[choice.factor] = choice.value;
    }
    const want = await engine(page, { sc, lang, choices: picked });
    const sentence = await page.$eval(".turn-bar .vc-callout__body", (b) => b.textContent);
    check(sentence.includes(want.after.stake) && sentence.includes(want.after.readiness), `choice (${sc} ${lang}): with ${JSON.stringify(picked)} the "Your turn" sentence shows the engine's ${want.after.stake} and readiness ${want.after.readiness}: "${sentence.replace(/\s+/g, " ").trim().slice(0, 120)}"`);
    await page.click("#btn-cta");
    await waitStep(page, "summary");
    const t1 = await tiles(page);
    check(Object.keys(picked).length === 3 && t1.stake.value === want.after.stake && t1.pressure.value === want.after.pressure && t1.readiness.value === want.after.readiness,
      `choice (${sc} ${lang}): the tiles after adopting agree with the engine: ${t1.stake.value}, ${t1.pressure.value}, readiness ${t1.readiness.value}`);
    check(!errors.length, `choice (${sc} ${lang}): no page error${errors.length ? `: ${errors[0]}` : ""}`);
  } catch (e) {
    check(false, `choice (${sc} ${lang}): stopped: ${String(e.message).split("\n")[0]}`);
  }
  await context.close();
}

// ---- play and keys -------------------------------------------------------------------------------------------
{
  const { context, page, errors } = await open("?guide=0&scenario=s3&lang=en");
  const fillOf = () => page.$eval("#btn-cta", (b) => b.style.getPropertyValue("--fill") || "0");
  const expectedMs = () => page.evaluate(() => {
    const title = document.getElementById("step-title")?.textContent || "";
    const lead = [...document.querySelectorAll("#stage [data-read]")].map((e) => e.textContent).join(" ");
    const words = `${title} ${lead}`.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    return Math.min(14000, Math.max(7000, 3000 + 230 * words));
  });
  try {
    await page.click("#btn-play");
    await waitStep(page, "scan");
    await page.waitForTimeout(2500);
    check((await stepOf(page)) === "scan" && Number(await fillOf()) === 0, "play: started at Start, Play runs the agents and stops at Scan, where the person challenges the analysis");
    await page.click("#btn-cta");
    await waitStep(page, "challenge");
    for (const [from, to] of [["challenge", "assess"], ["assess", "respond"]]) {
      const want = await expectedMs();
      const started = Date.now();
      await waitStep(page, to, 16000);
      const took = Date.now() - started;
      check(took >= 6800 && took <= 14500 && Math.abs(took - want) <= 900, `play: holds ${from} ${(took / 1000).toFixed(1)} s (its words take ${(want / 1000).toFixed(1)} s; 7 to 14 s), then moves to ${to}`);
    }
    await page.waitForTimeout(2500);
    check((await stepOf(page)) === "respond" && Number(await fillOf()) === 0 && (await page.$eval("#btn-play", (b) => b.dataset.state)) === "pause",
      "play: stops at Respond, where the person adopts the responses, and waits there");
    await page.keyboard.press("Space");
    check((await page.$eval("#btn-play", (b) => b.dataset.state)) === "play", "keys: Space pauses Play");
    const moves = [];
    for (const [key, to] of [["ArrowLeft", "assess"], ["PageUp", "challenge"], ["ArrowRight", "assess"], ["PageDown", "respond"], ["ArrowRight", "respond"]]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const s = await stepOf(page);
      moves.push(`${key} → ${s}${s === to ? "" : ` (expected ${to})`}`);
    }
    check(moves.every((m) => !m.includes("expected")), `keys: the arrow keys and the clicker keys move between the steps reached: ${moves.join(", ")}`);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(120);
    check(/[?&]scenario=s3(&|$)/.test(page.url()) && /[?&]step=3(&|$)/.test(page.url()), `keys: the address follows the step: ${page.url().replace(server.base, "/")}`);
    await page.keyboard.press("Space");
    check((await page.$eval("#btn-play", (b) => b.dataset.state)) === "pause", "keys: Space plays again");
    await page.keyboard.press("Space");
    check(!errors.length, `play: no page error${errors.length ? `: ${errors[0]}` : ""}`);
  } catch (e) {
    check(false, `play: stopped: ${String(e.message).split("\n")[0]}`);
  }
  await context.close();
}

// ---- links ---------------------------------------------------------------------------------------------------
for (const [sc, step] of [["s1", 4], ["s2", 5], ["s3", 2], ["s2", 3]]) {
  const { context, page, errors } = await open(`?guide=0&scenario=${sc}&step=${step}`);
  try {
    await waitStep(page, STEPS[step]);
    const current = await page.$eval('#steps [aria-current="step"]', (b) => Number(b.dataset.step));
    const company = await page.$eval(".story-company", (e) => e.textContent);
    const want = await engine(page, { sc, lang: "en" });
    const t = await tiles(page);
    const decided = t.stake.was !== null;
    const right = step === 5 ? decided && t.stake.value === want.after.stake : !decided && t.stake.value === want.before.stake;
    check(current === step && right && !errors.length, `links: ?scenario=${sc}&step=${step} opens ${company} at ${STEPS[step]}, ${step === 5 ? "with the recommended responses adopted" : "before the decision"}`);
  } catch (e) {
    check(false, `links: ?scenario=${sc}&step=${step}: ${String(e.message).split("\n")[0]}`);
  }
  await context.close();
}

// ---- update: the 90-day rule on the page -------------------------------------------------------------------------
{
  const { context, page, errors } = await open("?guide=0&scenario=s3&lang=en");
  const tagAt = async (day) => {
    await page.evaluate(async (d) => { (await import("/js/clock.js")).pinToday(d); }, day);
    // A language switch there and back draws the page again with the pinned day.
    await page.click('.lang-option[data-lang="de"]');
    await page.click('.lang-option[data-lang="en"]');
    await page.waitForTimeout(100);
    return page.evaluate(() => [...document.querySelectorAll("#stage .company-tags .vc-tag")].map((x) => x.textContent.trim()).join(" | "));
  };
  const asOf = await page.evaluate(async () => (await import("/js/simulation.js")).scenarioById("s3").as_of);
  const add = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  const day90 = await tagAt(add(asOf, 90));
  const day91 = await tagAt(add(asOf, 91));
  check(!day90.includes("Check for updates") && day91.includes("Check for updates") && !errors.length, `update: read on ${asOf}, the scenario asks for an update on day 91 ("${day91}") and not on day 90`);
  await context.close();
}

check(!foreign.length, `offline: no request to another host${foreign.length ? `: ${[...new Set(foreign)].slice(0, 3).join(", ")}` : ""}`);
await browser.close();
await server.close();
report(results, "PRESENTER OK");
