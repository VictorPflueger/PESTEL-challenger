#!/usr/bin/env node
// Checks the three recorded runs in data/scenarios/ (brief §7) with js/scenario_check.js and prints every
// problem it finds; exits 1 if there is one. `--frozen` prints each scenario's figures as the engine
// computes them now, to record in its frozen block after a deliberate change.
//   node tools/check-scenarios.mjs [--frozen]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkScenario } from "../js/scenario_check.js";
import { SCENARIOS } from "../js/simulation.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataSources = readFileSync(`${root}DATA_SOURCES.md`, "utf8");
const showFrozen = process.argv.includes("--frozen");

let failed = 0;
for (const sc of SCENARIOS) {
  const { problems, figures } = checkScenario(sc, { dataSources });
  if (showFrozen) console.log(`${sc.id} frozen: ${JSON.stringify(figures)}`);
  if (problems.length) {
    failed += problems.length;
    console.error(`${sc.id} ${sc.company.name}: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
  } else {
    console.log(`${sc.id} ${sc.company.name}: schemas in both languages, ids, guardrails, fact audit, sources, frozen figures and three sets of choices hold.`);
  }
}
if (failed) {
  console.error(`CHECK SCENARIOS FAILED: ${failed} problem(s)`);
  process.exit(1);
}
console.log("CHECK SCENARIOS OK");
