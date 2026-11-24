// The handoff file (brief §4.3, AC-21), checked without a browser: for every scenario, in both languages and
// along the recorded choices and others, the file validates against schemas/strategy-challenge-1.json, every
// chosen watch response carries its signal and trigger as a watch entry and matches the watch list, the score
// is readiness, the figures are the engine's, and nothing in it is a key, a prompt or thinking. The Prototype
// Ideator's own reader takes each file when its checkout sits beside this repository (always on GitHub
// Actions). A planted defect of each kind is refused, so the check can fail. Also: country names become their
// two-letter codes, and the report's file names write umlauts out.
// Usage: node tests/handoff.mjs [--require-vici]
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, report } from "./lib/harness.mjs";
import { SCENARIOS, runFromScenario, freshState } from "../js/simulation.js";
import { handoffOf, handoffProblems, countryCode, canHandOff } from "../js/handoff.js";
import { reportName, slugOf } from "../js/live_save.js";
import * as R from "../js/run.js";
import { APP } from "../js/config.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const NOW = new Date("2026-11-24T09:30:00Z");
const clone = (v) => JSON.parse(JSON.stringify(v));

/** A run of a scenario with the person's choices: recorded (the recommended ones), all accepted, or the first option offered. */
function runWith(sc, lang, how) {
  const person = freshState();
  const base = runFromScenario(sc, lang, person);
  if (how === "accept") for (const f of R.decisionFactors(base)) person.choices.set(f.id, "accept");
  if (how === "first") for (const f of R.decisionFactors(base)) { const o = R.optionsFor(base, f.id); person.choices.set(f.id, o.length ? o[o.length - 1].id : "accept"); }
  if (how === "watch") for (const f of R.decisionFactors(base)) { const m = R.optionsFor(base, f.id).find((o) => o.kind === "monitor"); if (m) person.choices.set(f.id, m.id); }
  person.decided = how !== "open";
  return runFromScenario(sc, lang, person);
}

/** Every key and every text in a value, for the scan that nothing secret or internal leaves. */
function walk(v, visit, key = "") {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit, key));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { visit(k, null); walk(x, visit, k); }
  else visit(key, v);
}

// The Prototype Ideator's reader, when its checkout sits beside this repository.
const ideatorDir = [path.resolve(APP_ROOT, "..", "PrototypeIdeator")].find((d) => existsSync(path.join(d, "js", "handoff.js")));
const ideator = ideatorDir ? await import(pathToFileURL(path.join(ideatorDir, "js", "handoff.js")).href) : null;
if (!ideator) check(!REQUIRE_VICI, "the Prototype Ideator's checkout sits beside this repository, so its reader can take the files");

let files = 0;
for (const sc of SCENARIOS) {
  for (const lang of ["en", "de"]) {
    for (const how of ["recorded", "accept", "first", "watch", "open"]) {
      const run = runWith(sc, lang, how);
      const where = `${sc.id} ${lang} ${how}`;
      check(canHandOff(run), `${where}: the run has its figures, so it can hand off`);
      const file = handoffOf(run, { lang, now: NOW });
      files += 1;
      const problems = handoffProblems(file);
      check(!problems.length, `${where}: validates against strategy-challenge-1${problems.length ? `: ${problems.slice(0, 4).join("; ")}` : ""}`);
      check(file.schema === "strategy-challenge/1" && file.tool.id === "pestel-challenger" && file.tool.version === APP.version && file.tool.url === APP.url, `${where}: names the tool, its version ${APP.version} and its address`);
      check(file.language === lang && file.mode === "simulation" && file.model === null && file.company.fictional === true && file.company.country === "DE", `${where}: a simulation in ${lang}, no model, a fictional company in DE`);
      check(file.created === "2026-11-24T09:30:00Z", `${where}: created at the time given, to the second`);
      check(file.framework.type === "pestel" && file.framework.areas.map((a) => a.id).join() === "political,economic,social,technological,environmental,legal", `${where}: the six dimensions are the areas, in PESTEL's order`);

      // The engine's figures, unchanged.
      const before = R.figures(run, { decided: false }).before;
      const after = R.figures(run);
      const f = file.figures;
      const decided = how !== "open";
      check(f.at_stake_eur_year === before.atStake && f.left_eur_year === (decided ? after.after.atStake : before.atStake) && f.upside_eur_year === (decided ? after.upside : 0),
        `${where}: at stake ${f.at_stake_eur_year}, left ${f.left_eur_year} and upside ${f.upside_eur_year} are the engine's`);
      check(f.score.name === "readiness" && f.score.scale === "0-100" && f.score.before === before.readiness && f.score.after === (decided ? after.after.readiness : before.readiness),
        `${where}: the score is readiness, 0-100, ${f.score.before} before and ${f.score.after} after`);
      check(f.pressure.of === 6 && f.pressure.before === before.pressure.length && f.pressure.after === (decided ? after.after.pressure.length : before.pressure.length),
        `${where}: dimensions under pressure ${f.pressure.before} of 6 before, ${f.pressure.after} after`);

      // Issues and responses: ids, references, one chosen response a force once adopted, the watch list.
      const ids = file.issues.map((i) => i.id);
      check(ids.every((id, n) => id === `I${n + 1}`) && file.responses.every((r, n) => r.id === `R${n + 1}`), `${where}: issues I1 to I${ids.length} and responses R1 to R${file.responses.length}, in order`);
      const counted = R.assessedFactors(run).filter((x) => !x.outdated);
      check(ids.length === counted.length, `${where}: every force that counts is an issue (${ids.length} of ${counted.length})`);
      const chosen = file.responses.filter((r) => r.chosen);
      check(decided ? new Set(chosen.map((r) => r.issue)).size === chosen.length && chosen.length === R.decisionFactors(run).length : chosen.length === 0,
        decided ? `${where}: one chosen response for each of the ${chosen.length} forces decided` : `${where}: nothing chosen before the decision`);
      const watchList = decided ? R.watchList(run) : [];
      const watched = chosen.filter((r) => r.kind === "monitor");
      check(watched.length === watchList.length && watched.every((r) => r.changes.length === 1 && r.changes[0].action === "watch" && watchList.some((w) => w.factor === r.changes[0].item && w.signal === r.changes[0].signal && w.trigger === r.changes[0].trigger)),
        `${where}: each of the ${watchList.length} chosen watch responses carries its signal and trigger as a watch entry, as the watch list has them`);
      check(file.responses.filter((r) => r.kind !== "monitor").every((r) => !r.changes.length), `${where}: only watch responses carry changes`);
      check(file.responses.filter((r) => r.kind === "mitigate").every((r) => r.residual && r.residual.eur_year_expected <= (file.issues.find((i) => i.id === r.issue).eur_year_expected ?? Infinity) + 1e-9), `${where}: every mitigation's residual is no more than what the force put at stake`);

      // Nothing secret, internal or unfilled leaves.
      const bad = [];
      walk(file, (k, v) => {
        if (k && /^(prompt|system|thinking|key|api_key|messages)$/i.test(k)) bad.push(`key "${k}"`);
        if (typeof v === "string" && (/sk-ant-/i.test(v) || /\{\{fact:/.test(v))) bad.push(`text "${v.slice(0, 40)}"`);
      });
      check(!bad.length, `${where}: holds no key, prompt, thinking or placeholder${bad.length ? `: ${bad.slice(0, 3).join(", ")}` : ""}`);

      // The Prototype Ideator reads it.
      if (ideator) {
        const read = ideator.readHandoff(clone(file), { file: `pestel-challenger-${sc.id}.json` });
        check(read.ok && read.issues.length === file.issues.length && read.company.name === file.company.name,
          `${where}: the Prototype Ideator reads it: ${read.ok ? `${read.issues.length} issues of ${read.company.name}` : read.problems.slice(0, 3).join("; ")}`);
      }
    }
  }
}

// ---- planted defects: the check can fail ------------------------------------------------------------------
{
  const good = handoffOf(runWith(SCENARIOS[0], "en", "recorded"), { lang: "en", now: NOW });
  const planted = {
    "a missing disclaimer": (j) => { delete j.disclaimer; },
    "a horizon in this tool's own words": (j) => { j.issues[0].horizon = "1_3_years"; },
    "a country by name": (j) => { j.company.country = "Germany"; },
    "a score named something else": (j) => { j.figures.score.name = "resilience_index"; },
    "a figure as text": (j) => { j.figures.at_stake_eur_year = "€53.9m"; },
    "a watch entry without its trigger": (j) => { const r = j.responses.find((x) => x.kind === "monitor"); delete r.changes[0].trigger; },
    "a response that names no issue of the file": (j) => { j.responses[0].issue = "I99"; },
    "an issue id twice": (j) => { j.issues[1].id = j.issues[0].id; },
    "a source without the date read": (j) => { j.sources[0].read_on = ""; },
  };
  for (const [what, plant] of Object.entries(planted)) {
    const j = clone(good);
    plant(j);
    check(handoffProblems(j).length > 0, `the check refuses ${what}`);
  }
}

// ---- countries and file names -------------------------------------------------------------------------------
const countries = { Germany: "DE", Deutschland: "DE", de: "DE", "Österreich": "AT", Switzerland: "CH", USA: "US", "United Kingdom": "GB", UK: "GB", Niederlande: "NL", Atlantis: "ZZ", "": "ZZ" };
for (const [text, code] of Object.entries(countries)) check(countryCode(text) === code, `the country "${text}" is ${code} (${countryCode(text)})`);
check(slugOf("Müller & Söhne Großhandel") === "mueller-soehne-grosshandel" && slugOf("Café Ñandú") === "cafe-nandu", `umlauts are written out and marks dropped in a file name (${slugOf("Müller & Söhne Großhandel")}, ${slugOf("Café Ñandú")})`);
check(reportName({ company: { name: "Auental Energie" } }, { date: "2026-11-24", lang: "de", ext: "pdf" }) === "pestel-challenger-auental-energie-2026-11-24-de.pdf", "a report's file name: pestel-challenger-<company>-<date>-<lang>.<ext>");

console.log(`${files} handoff files built: ${SCENARIOS.length} scenarios, both languages, five ways to decide.`);
report(results, "HANDOFF OK");
