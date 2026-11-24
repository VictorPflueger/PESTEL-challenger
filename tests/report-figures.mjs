// The report and the handoff file carry the tiles' figures (AC-20), in Chromium, for every scenario: along the
// recorded choices, and after the person changes one response at Respond and adopts again.
//   - the report's four key figures, before and after, read exactly as the tiles do, the tiles striking the old
//     values through;
//   - the handoff file's at stake, left, readiness and dimensions under pressure, formatted as the tiles format
//     them, read as the tiles do;
//   - every chosen watch response is a row of the report's watch list and a watch entry of the handoff file,
//     and a changed choice moves all three together; the figures follow brief §6.5 as the engine computes them.
// Usage: node tests/report-figures.mjs
import { readFile } from "node:fs/promises";
import { launchBrowser, serveStatic, APP_ROOT, report } from "./lib/harness.mjs";
import { SCENARIOS, runFromScenario, freshState } from "../js/simulation.js";
import * as R from "../js/run.js";
import { money } from "../js/format.js";
import { readinessText, moneyText } from "../js/engine.js";
import { kpiValues } from "../js/kpis.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const squash = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** The tiles as the page shows them, and the report's figures table and watch list. */
async function shown(page) {
  return page.evaluate(() => {
    const tile = (id) => {
      const el = document.getElementById(id);
      const was = el.querySelector(".kpi-was");
      return { value: el.querySelector(".kpi-value").textContent.trim(), was: was && !was.hidden ? was.textContent.trim() : null, struck: was && !was.hidden ? getComputedStyle(was).textDecorationLine : null };
    };
    const row = (k) => [...document.querySelectorAll(`#report .report-figures tr[data-kpi="${k}"] td`)].map((td) => td.textContent.trim());
    return {
      tiles: { stake: tile("kpi-stake"), pressure: tile("kpi-pressure"), readiness: tile("kpi-readiness"), cost: tile("kpi-cost") },
      table: { stake: row("stake"), pressure: row("pressure"), readiness: row("readiness"), cost: row("cost") },
      watch: [...document.querySelectorAll("#report .report-watch tbody tr")].map((tr) => tr.dataset.factor),
    };
  });
}

/** The handoff file, as the Summary's button downloads it. */
async function handoff(page) {
  const [d] = await Promise.all([page.waitForEvent("download"), page.click("#btn-save-json")]);
  return JSON.parse(await readFile(await d.path(), "utf8"));
}

function compare(where, s, file, run) {
  // The report's table: before, then after, as the tiles show them (the tile's "was" is the old value). The
  // table has room for the old money's qualifier, such as "on 7 of 8 threats", which the tile leaves out.
  for (const k of ["stake", "pressure", "readiness"]) {
    const tile = s.tiles[k];
    const [before, after] = s.table[k];
    const was = k === "stake" && tile.was ? moneyText(R.figures(run, { decided: false }).before, "en") : tile.was ?? tile.value;
    check(squash(after) === squash(tile.value) && squash(before) === squash(was) && (!tile.was || squash(before).startsWith(squash(tile.was))),
      `${where}: the report's ${k}, ${before} → ${after}, reads as the tile (${tile.was ?? "…"} → ${tile.value})`);
    check(tile.was === null || tile.struck === "line-through", `${where}: the ${k} tile strikes its old value through`);
  }
  check(squash(s.table.cost[0]).startsWith(squash(s.tiles.cost.value)), `${where}: the report's session cost reads as the tile (${s.tiles.cost.value})`);
  // The handoff file's figures, formatted as the tiles format them.
  const f = file.figures;
  check(money(f.at_stake_eur_year, "en") === s.tiles.stake.was && money(f.left_eur_year, "en") === s.tiles.stake.value.replace(/\s.*$/, ""), `${where}: the handoff file's at stake ${money(f.at_stake_eur_year, "en")} and left ${money(f.left_eur_year, "en")} read as the tile`);
  check(readinessText(f.score.before, "en") === s.tiles.readiness.was && readinessText(f.score.after, "en") === s.tiles.readiness.value, `${where}: the handoff file's readiness ${readinessText(f.score.before, "en")} → ${readinessText(f.score.after, "en")} reads as the tile`);
  check(`${f.pressure.before} of 6` === s.tiles.pressure.was && `${f.pressure.after} of 6` === s.tiles.pressure.value, `${where}: the handoff file's dimensions under pressure ${f.pressure.before} → ${f.pressure.after} read as the tile`);
  // The engine, in Node, with the same choices: the tiles are its figures.
  const v = kpiValues(run, { lang: "en" });
  check(v.stake.value === s.tiles.stake.value.replace(/\s.*$/, "") && v.readiness.value === s.tiles.readiness.value && v.pressure.value === s.tiles.pressure.value, `${where}: the engine, run on the same choices, gives the tiles' figures (${v.stake.value}, ${v.readiness.value}, ${v.pressure.value})`);
  // The watch list: the chosen watch responses, in the report and in the file.
  const expected = R.watchList(run).map((w) => w.factor);
  const entries = file.responses.filter((r) => r.chosen && r.kind === "monitor").map((r) => r.changes[0]?.item);
  check(JSON.stringify(s.watch) === JSON.stringify(expected), `${where}: the report's watch list holds the ${expected.length} chosen watch responses (${s.watch.join(", ")})`);
  check(JSON.stringify([...entries].sort()) === JSON.stringify([...expected].sort()), `${where}: the handoff file carries the same ${entries.length} watch entries`);
}

const { base, close } = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: "en-GB", acceptDownloads: true });
await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort("blockedbyclient"));
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

for (const sc of SCENARIOS) {
  // Along the recorded choices.
  {
    const person = freshState();
    person.decided = true;
    const run = runFromScenario(sc, "en", person);
    await page.goto(`${base}?guide=0&lang=en&scenario=${sc.id}&step=5`);
    await page.waitForSelector("#report");
    compare(`${sc.id} recorded`, await shown(page), await handoff(page), run);
  }
  // One response changed at Respond: a recommended mitigation becomes the watch response it was offered beside,
  // or is accepted where there is none; then adopted again.
  {
    const base0 = runFromScenario(sc, "en", freshState());
    const factors = R.decisionFactors(base0);
    const i = factors.findIndex((f) => R.optionsFor(base0, f.id)[0]?.kind === "mitigate");
    const f = factors[i];
    const watch = R.optionsFor(base0, f.id).find((o) => o.kind === "monitor");
    const choice = watch ? watch.id : "accept";
    const person = freshState();
    person.choices.set(f.id, choice);
    person.decided = true;
    const run = runFromScenario(sc, "en", person);
    await page.goto(`${base}?guide=0&lang=en&scenario=${sc.id}&step=4`);
    await page.waitForSelector('#stage[data-step="respond"]');
    await page.click(`.decide-list li:nth-child(${i + 1}) .decide-item`);
    await page.locator(`input[name="choice-${f.id}"][value="${choice}"]`).check({ force: true });
    await page.click("#btn-cta");
    await page.waitForSelector("#report");
    const where = `${sc.id} with "${f.text}" ${watch ? "watched" : "accepted"}`;
    const s = await shown(page);
    compare(where, s, await handoff(page), run);
    const recorded = runFromScenario(sc, "en", Object.assign(freshState(), { decided: true }));
    check(R.figures(run).after.atStake > R.figures(recorded).after.atStake, `${where}: more stays at stake than along the recorded choices, as brief §6.5 says for a threat no longer mitigated`);
    if (watch) check(s.watch.includes(f.id), `${where}: the force joins the watch list`);
  }
}
check(!errors.length, `no page error${errors.length ? `: ${errors.slice(0, 3).join("; ")}` : ""}`);
await context.close();
await browser.close();
await close();
report(results, "REPORT FIGURES OK");
