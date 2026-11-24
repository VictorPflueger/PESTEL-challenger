// The engine against the golden cases of brief §11 (AC-16): P0 to P2 within 1e-9 of their exact values,
// and every display string in English and German. The fixture was written before the engine. Controls
// first prove that the comparison can fail: a wrong gap, a wrong rounding and a wrong band each miss.
// Usage: node tests/engine.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT, report } from "./lib/harness.mjs";
import { riskScore, band, roundHalfAway, money, expected } from "../js/risk.js";
import { assess, run, facts, gap, DIMENSIONS } from "../js/engine.js";

const golden = JSON.parse(readFileSync(path.join(APP_ROOT, "tests/fixtures/golden.json"), "utf8"));
const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const exact = (fraction) => { const [n, d = "1"] = String(fraction).split("/"); return Number(n) / Number(d); };
const near = (a, b) => typeof a === "number" && Math.abs(a - b) <= 1e-9;
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---- the comparison can fail ------------------------------------------------------------------------
{
  const p1 = golden.P1;
  const wrongGap = (r) => (5 - r) / 5;
  const threats = p1.factors;
  const sum = threats.reduce((s, f) => s + riskScore(f.impact, f.likelihood), 0);
  const wrong = 100 * (1 - threats.reduce((s, f) => s + riskScore(f.impact, f.likelihood) * wrongGap(f.readiness), 0) / sum);
  check(!near(wrong, exact(p1.expected.before.readiness)), `control: a gap of (5 − r) / 5 misses P1's readiness (${wrong} against ${p1.expected.before.readiness})`);
  const bankers = (x) => { const f = Math.floor(x); const d = x - f; return d > 0.5 || (d === 0.5 && f % 2 === 1) ? f + 1 : f; };
  check(bankers(64.5) !== roundHalfAway(64.5, 0) && roundHalfAway(64.5, 0) === 65 && roundHalfAway(-64.5, 0) === -65, "control: half to even (64) and half away from zero (65, −65) differ, and the engine rounds away from zero");
  check(band(3, 3) !== "high" && band(2, 5) === "high", "control: a score of 9 is not high and 10 is");
}

// ---- P0: bands --------------------------------------------------------------------------------------
for (const row of golden.P0) {
  const score = riskScore(row.impact, row.likelihood);
  check(score === row.score && band(row.impact, row.likelihood) === row.band, `P0: impact ${row.impact} × likelihood ${row.likelihood} = ${score}, ${band(row.impact, row.likelihood)} (expected ${row.score}, ${row.band})`);
}
check((() => { try { riskScore(0, 3); return false; } catch { return true; } })() && (() => { try { gap(6); return false; } catch { return true; } })(), "P0: a level outside 1 to 5 is refused, never scored");

// ---- P1: before and after the decision --------------------------------------------------------------
{
  const p1 = golden.P1;
  const e = p1.expected;
  const r = run(p1.factors, p1.decisions);
  for (const f of p1.factors) {
    const got = r.before.perFactor[f.id];
    check(got.risk === e.risk[f.id] && got.band === e.band[f.id], `P1 ${f.id}: risk ${got.risk}, ${got.band}`);
    check(near(got.expected, exact(e.factor_expected[f.id])), `P1 ${f.id}: expected ${got.expected} a year (exactly ${e.factor_expected[f.id]})`);
  }
  for (const when of ["before", "after"]) {
    const got = r[when];
    const want = e[when];
    check(near(got.sumRisk, exact(want.sum_risk)) && near(got.sumRiskGap, exact(want.sum_risk_gap)), `P1 ${when}: Σ risk ${got.sumRisk}, Σ risk × gap ${got.sumRiskGap} (exactly ${want.sum_risk} and ${want.sum_risk_gap})`);
    check(near(got.readiness, exact(want.readiness)), `P1 ${when}: readiness ${got.readiness} (exactly ${want.readiness})`);
    check(same(got.pressure, want.pressure), `P1 ${when}: under pressure ${got.pressure.join(", ")} (expected ${want.pressure.join(", ")})`);
    check(near(got.atStake, exact(want.at_stake)), `P1 ${when}: at stake ${got.atStake} (exactly ${want.at_stake})`);
  }
  check(same(r.watch, e.watch), `P1: the watch list holds ${r.watch.join(", ")}`);
  const states = Object.fromEntries(DIMENSIONS.map((d) => [d, r.before.dimensions[d].state]));
  check(states.legal === "pressure" && states.economic === "pressure" && states.political === "pressure" && states.environmental === "watch" && states.technological === "watch" && states.social === "clear",
    `P1 before: each dimension's state (${DIMENSIONS.map((d) => `${d} ${states[d]}`).join(", ")})`);
  for (const lang of ["en", "de"]) {
    const want = e.display[lang];
    const got = facts(r, lang);
    for (const [key, text] of Object.entries(want)) check(got[key] === text, `P1 ${lang}: ${key} shows "${got[key]}" (expected "${text}")`);
  }
}

// ---- P2: a factor out of date -----------------------------------------------------------------------
{
  const p2 = golden.P2;
  const factors = golden.P1.factors.map((f) => (p2.outdated.includes(f.id) ? { ...f, outdated: true } : f));
  const a = assess(factors);
  const e = p2.expected;
  check(near(a.sumRisk, exact(e.sum_risk)) && near(a.sumRiskGap, exact(e.sum_risk_gap)), `P2: Σ risk ${a.sumRisk}, Σ risk × gap ${a.sumRiskGap} (exactly ${e.sum_risk} and ${e.sum_risk_gap})`);
  check(near(a.readiness, exact(e.readiness)), `P2: readiness ${a.readiness} (exactly ${e.readiness})`);
  check(near(a.atStake, exact(e.at_stake)), `P2: at stake ${a.atStake} (exactly ${e.at_stake})`);
  const r = run(factors, []);
  for (const lang of ["en", "de"]) {
    const got = facts(r, lang);
    for (const [key, text] of Object.entries(e.display[lang])) check(got[key] === text, `P2 ${lang}: ${key} shows "${got[key]}" (expected "${text}")`);
  }
}

// ---- beyond the golden cases: money on part of the threats, an advantage, an empty analysis ----------
{
  const factors = golden.P1.factors.map((f) => (f.id === "F5" ? { ...f, not_monetisable: true, eur_year_low: null, eur_year_high: null } : f));
  const r = run(factors, []);
  check(r.before.readiness === 50 && r.before.monetised === 4 && r.before.threats === 5, "a threat without a euro range still counts in readiness, not in money");
  check(facts(r, "en").at_stake === "€6.4m on 4 of 5 threats" && facts(r, "de").at_stake === "6,4 Mio. € aus 4 von 5 Risiken", `money on part of the threats says so: "${facts(r, "en").at_stake}", "${facts(r, "de").at_stake}"`);
  // A mitigation of that threat keeps it out of the money, whatever residual range the Strategist gives.
  const unready = factors.map((f) => (f.id === "F5" ? { ...f, readiness: 2 } : f));
  const m = run(unready, [{ factor: "F5", kind: "mitigate", readiness: 4, residual: { eur_year_low: 1000000, eur_year_high: 5000000, likelihood: 1 } }]);
  check(m.after.monetised === 4 && m.after.threats === 5 && near(m.after.atStake, m.before.atStake) && m.after.readiness > m.before.readiness,
    `mitigating a threat without a euro range changes its readiness, not the money: left ${facts(m, "en").left} against ${facts(m, "en").at_stake}, readiness ${facts(m, "en")["readiness.before"]} to ${facts(m, "en")["readiness.after"]}`);
  const withOpportunity = [...golden.P1.factors, { id: "O1", dimension: "economic", direction: "opportunity", impact: 3, likelihood: 4, readiness: null, source: "ai" }];
  const r2 = run(withOpportunity, [{ factor: "O1", kind: "advantage", upside: { eur_year_low: 400000, eur_year_high: 800000, likelihood: 3 } }]);
  check(near(r2.upside, 300000) && facts(r2, "en").upside === "€300k" && facts(r2, "de").upside === "300 Tsd. €", `an advantage adds its upside: ${facts(r2, "en").upside}`);
  check(near(r2.before.readiness, 50) && r2.before.threats === 5 && r2.factorsAdded === 1, "an opportunity counts in neither readiness nor pressure");
  const empty = run([], []);
  check(empty.before.readiness === null && facts(empty, "en")["readiness.before"] === "no threats" && facts(empty, "de")["readiness.before"] === "keine Risiken", "no threats: readiness says so rather than 0 or 100");
}

// ---- money in the shared format of js/risk.js, at its edges ----------------------------------------------
{
  const de = (t) => t.replace(/ /g, "\u00a0");
  const cases = [
    [6450000, "€6.5m", de("6,5 Mio. €")], [999500, "€1.0m", de("1,0 Mio. €")], [999499, "€999k", de("999 Tsd. €")], [949999, "€950k", de("950 Tsd. €")],
    [9949, "€10k", de("10 Tsd. €")], [999.5, "€1k", de("1 Tsd. €")], [950, "€950", de("950 €")], [0, "€0", de("0 €")], [-2500, "−€3k", de("−3 Tsd. €")],
  ];
  for (const [v, en, d] of cases) check(money(v, "en") === en && money(v, "de") === d, `${v} shows as "${money(v, "en")}" and "${money(v, "de")}"`);
  check(near(expected(200000, 600000, 2), 120000), "expected value: midpoint × probability, €400k × 0.3 = €120k");
}

report(results, "ENGINE OK");
