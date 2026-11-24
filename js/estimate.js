// What a recorded run would cost on the Balanced setting, for the Session cost tile of the simulation
// (brief §5.5 and §5.6). The estimate rebuilds each agent's request from what it reads and what it
// answered in the scenario, at about four characters a token, and prices it:
//   input   a prompt of about 1,500 tokens, plus the state the agent reads as compact JSON
//   output  the agent's answer as JSON, doubled as an allowance for adaptive thinking at medium effort
//   search  five searches for the Scout, each adding about 4,000 tokens of results to its input
// The prompts arrive with the live run in 0.3.0; until Victor's first live runs replace these assumptions
// with measured values, the tile says "Estimated" and the guide states them.

import { PRICES, USD_TO_EUR, SIM_SETTING } from "./config.js";
import { localise } from "./simulation.js";
import { kpisFor } from "../data/kpis.js";

export const ASSUMPTIONS = Object.freeze({ charsPerToken: 4, promptTokens: 1500, thinking: 1, searchTokens: 4000 });

const tokens = (value) => Math.ceil(JSON.stringify(value ?? null).length / ASSUMPTIONS.charsPerToken);

/**
 * The estimate for a scenario in a language: tokens, searches and the cost in dollars and euros, on the
 * Balanced setting's model or another (the guide quotes Thorough, on Sonnet 5.5).
 */
export function estimateScenario(sc, lang = "en", { model = SIM_SETTING.model } = {}) {
  const a = localise(sc.answers, lang);
  const company = { name: sc.company.name, sector: sc.company.sector, country: sc.company.country, what: sc.texts[lang]?.what };
  const team = localise(sc.team, lang);
  const signals = a.scout?.signals ?? [];
  const factors = [...team, ...(a.scanner?.factors ?? [])];
  const requests = [];
  if (sc.research) requests.push({ agent: "scout", input: tokens(company) + SIM_SETTING.searches * ASSUMPTIONS.searchTokens, output: tokens(a.scout), searches: SIM_SETTING.searches });
  requests.push({ agent: "scanner", input: tokens({ company, team, signals }), output: tokens(a.scanner), searches: 0 });
  requests.push({ agent: "red_team", input: tokens({ company, factors, signals }), output: tokens(a.red_team), searches: 0 });
  requests.push({ agent: "analyst", input: tokens({ company, factors, issues: a.red_team, kpis: kpisFor(sc.company.sector) }), output: tokens(a.analyst), searches: 0 });
  requests.push({ agent: "strategist", input: tokens({ company, factors, issues: a.red_team, impacts: a.analyst }), output: tokens(a.strategist), searches: 0 });
  requests.push({ agent: "writer", input: tokens({ company, factors, issues: a.red_team, impacts: a.analyst, responses: a.strategist }), output: tokens(a.writer), searches: 0 });
  const price = PRICES[model];
  let inTok = 0;
  let outTok = 0;
  let searches = 0;
  for (const r of requests) {
    inTok += ASSUMPTIONS.promptTokens + r.input;
    outTok += r.output * (1 + ASSUMPTIONS.thinking);
    searches += r.searches;
  }
  const usd = (inTok * price.input + outTok * price.output) / 1e6 + searches * PRICES.search;
  return { requests: requests.length, inTokens: inTok, outTokens: outTok, searches, usd, eur: usd * USD_TO_EUR };
}
