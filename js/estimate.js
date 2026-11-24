// What a run costs and how long it takes, before it runs (brief §5.5 and §5.6). The estimate rebuilds each
// agent's request from its real prompt (js/prompts.js), its format and the answer sizes of the recorded
// scenarios, at about three characters a token, and prices it at the list prices the cost meter uses
// (js/cost.js). Two places read it:
//   - the simulation's Session cost tile: what the scenario on screen would cost on the Balanced setting,
//     its own answers counted, labelled "Estimated, simulated run";
//   - the live-run dialog: what a run on the person's own company would cost with the setting chosen and
//     research on or off, as a range: from the smallest recorded run to the largest plus one repair, with
//     the time each takes at the assumed speed of the model.
// The assumptions (ASSUMPTIONS) are stated in the guide. Victor's first live runs measure what each step
// really uses; their figures go into MEASURED, and from then on the dialog quotes them instead. After a
// live run in this tab, the dialog also shows what that run cost and took.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/estimate.js: single requests per step rather than a
// tool loop, no prompt caching (every request carries the state, not the conversation), and a range.

import { FX_USD_EUR, SIM_SETTING, ANTHROPIC, settingOf } from "./config.js";
import { usageCostUsd } from "./cost.js";
import { REQUESTS } from "./schemas.js";
import { SCENARIOS, localise, runFromScenario, freshState } from "./simulation.js";
import * as P from "./prompts.js";
import * as R from "./run.js";

export const ASSUMPTIONS = Object.freeze({
  /**
   * Characters a token, for English and German text and JSON alike. The 5.5 models' tokenizer counts the
   * same text as about 30 percent more tokens than Claude Haiku 4.5's (the Haiku 5.5 model page, read on
   * 24 November 2026), so the old rule of about four characters a token becomes about three.
   */
  charsPerToken: 3,
  /** With thinking on, each answer counts once more, for the tokens the model thinks first; Fast turns it off. */
  thinking: 1,
  /** The Scout's searches, and the result text each adds to its input. */
  searches: ANTHROPIC.webSearchTool.max_uses,
  searchTokens: 4000,
  /** Seconds a search takes. */
  searchSeconds: 2,
  /**
   * Output tokens a second and seconds before the first token, fast end and slow end, per model: assumed
   * until Victor's first live runs measure them (TECH_NOTES.md).
   */
  speed: Object.freeze({
    "claude-haiku-5-5": Object.freeze({ tps: [180, 80], first: [1, 3] }),
    "claude-sonnet-5-5": Object.freeze({ tps: [100, 40], first: [2, 5] }),
  }),
});

/**
 * What Victor's first live runs measured, by preset and research (TECH_NOTES.md logs each run): the cost in
 * euros and the time in seconds of a whole run, lowest and highest. Empty until then.
 */
export const MEASURED = Object.freeze({});

/** The rating the person's factors carry while the estimate sizes the later requests. */
const STAND_IN_RATING = Object.freeze({ direction: "threat", likelihood: 3, impact: 3, horizon: "1_3_years", readiness: 2 });

const tokens = (value) => Math.ceil((typeof value === "string" ? value : JSON.stringify(value ?? null)).length / ASSUMPTIONS.charsPerToken);
const promptTokens = (p) => tokens(p.system) + tokens(p.user);

/** The Scout's tools as a request sends them: the web search and the strict submit_signals. */
const SCOUT_TOOLS = [ANTHROPIC.webSearchTool, { name: "submit_signals", description: "Report the signals you found.", strict: true, input_schema: REQUESTS.Signals }];

/** The company and factors a prompt reads, from a run. */
function inputsOf(run) {
  return {
    company: { name: run.company.name, sector: run.company.sector || null, country: run.company.country, what: run.company.what },
    factors: (run.team || []).map((f) => ({ id: f.id, dimension: f.dimension, text: f.text, ...(f.rated ? { rated: f.rated } : {}) })),
  };
}

/**
 * Each agent's request for a run as the pipeline would send it, and its answer: { agent, input, output,
 * searches } in tokens. The run supplies the state each agent reads (a scenario's recorded answers, or
 * those with the person's company and factors in place) and the answers.
 */
export function requestsOf(run, answers, lang) {
  const inputs = inputsOf(run);
  const list = [];
  if (run.research) {
    const p = P.scoutPrompt({ inputs, lang, today: run.as_of });
    list.push({ agent: "scout", input: promptTokens(p) + tokens(SCOUT_TOOLS) + ASSUMPTIONS.searches * ASSUMPTIONS.searchTokens, output: tokens(answers.scout), searches: ASSUMPTIONS.searches });
  }
  const signals = run.signals || [];
  const scanned = R.scannedFactors(run);
  const challenged = R.challengedFactors(run);
  const sector = run.company.sector || "general";
  list.push({ agent: "scanner", input: promptTokens(P.scannerPrompt({ inputs, signals, lang })) + tokens(REQUESTS.Scan), output: tokens(answers.scanner), searches: 0 });
  list.push({ agent: "red_team", input: promptTokens(P.redTeamPrompt({ inputs, factors: scanned, signals, lang })) + tokens(REQUESTS.Issues), output: tokens(answers.red_team), searches: 0 });
  list.push({ agent: "analyst", input: promptTokens(P.analystPrompt({ inputs, factors: challenged, sector, lang })) + tokens(REQUESTS.Impacts), output: tokens(answers.analyst), searches: 0 });
  list.push({ agent: "strategist", input: promptTokens(P.strategistPrompt({ inputs, factors: challenged, issues: run.issues, impacts: run.impacts, lang })) + tokens(REQUESTS.Responses), output: tokens(answers.strategist), searches: 0 });
  const facts = R.runFacts({ ...run, decided: true }, lang);
  const chosen = R.engineDecisions(run).map((d) => ({ factor: d.factor, kind: d.kind }));
  list.push({ agent: "writer", input: promptTokens(P.writerPrompt({ inputs, factors: challenged, issues: run.issues, chosen, facts: Object.keys(facts), lang })) + tokens(REQUESTS.SummaryRequest), output: tokens(answers.writer), searches: 0 });
  return list;
}

/** Usage and cost of a list of requests on a model: output counted once more when the model thinks. */
function price(requests, model, { thinks }) {
  let input = 0;
  let output = 0;
  let searches = 0;
  for (const r of requests) {
    input += r.input;
    output += r.output * (thinks ? 1 + ASSUMPTIONS.thinking : 1);
    searches += r.searches;
  }
  const usd = usageCostUsd(model, { input_tokens: input, output_tokens: output, server_tool_use: { web_search_requests: searches } });
  return { requests: requests.length, inTokens: input, outTokens: output, searches, usd, eur: usd * FX_USD_EUR };
}

/** Seconds the requests take one after another at one end of the model's assumed speed (0 fast, 1 slow). */
function seconds(requests, model, { thinks, end }) {
  const sp = ASSUMPTIONS.speed[model] || ASSUMPTIONS.speed["claude-haiku-5-5"];
  return requests.reduce((s, r) => s + sp.first[end] + (r.output * (thinks ? 1 + ASSUMPTIONS.thinking : 1)) / sp.tps[end] + r.searches * ASSUMPTIONS.searchSeconds, 0);
}

/**
 * The estimate for a scenario in a language: tokens, searches and the cost in dollars and euros, on the
 * Balanced setting's model or another (the guide quotes Thorough, on Sonnet 5.5).
 */
export function estimateScenario(sc, lang = "en", { model = SIM_SETTING.model } = {}) {
  const run = runFromScenario(sc, lang, freshState());
  const answers = localise(sc.answers, lang);
  return price(requestsOf(run, answers, lang), model, { thinks: true });
}

/**
 * The estimate for a live run before it starts: inputs { company, factors } as the person entered them,
 * the setting (preset, and the model and effort under Advanced), research on or off. Each recorded scenario
 * stands in for the agents' answers, with the person's company and factors in place; the range runs from
 * the smallest to the largest, and its top allows one repair of the largest request. Returns { eur, usd,
 * seconds } as { low, high }, the requests, and the basis: "assumed" until MEASURED holds this setting,
 * then "measured". A run in this tab (last: { eur, ms }) comes back as measured figures beside it.
 */
export function estimateLive({ inputs, lang = "en", preset, model = null, effort = null, research = false, measured = MEASURED, last = null }) {
  const setting = settingOf({ preset, model, effort });
  const thinks = !setting.thinking;
  const known = measured?.[setting.preset]?.[research ? "research" : "plain"];
  const lastRun = last ? { eur: last.eur, seconds: last.ms / 1000 } : null;
  if (known && setting.model === (measured[setting.preset].model || setting.model)) {
    return { basis: "measured", setting, research, eur: { low: known.eur[0], high: known.eur[1] }, usd: { low: known.eur[0] / FX_USD_EUR, high: known.eur[1] / FX_USD_EUR }, seconds: { low: known.seconds[0], high: known.seconds[1] }, requests: known.requests || null, last: lastRun };
  }
  const runs = SCENARIOS.map((sc) => {
    const base = runFromScenario(sc, lang, freshState());
    const run = {
      ...base,
      company: { ...base.company, name: inputs.company.name || base.company.name, sector: inputs.company.sector || base.company.sector, country: inputs.company.country || base.company.country, what: inputs.company.what || base.company.what },
      // The person's factors with a middling rating in place of the Scanner's, which only sizes the requests.
      team: inputs.factors.length ? inputs.factors.map((f) => ({ id: f.id, dimension: f.dimension, text: f.text, rated: STAND_IN_RATING })) : base.team,
      research,
      signals: research ? (base.signals.length ? base.signals : localise(SCENARIOS.find((x) => x.research).answers.scout.signals, lang)) : [],
    };
    const answers = localise(sc.answers, lang);
    if (research && !answers.scout) answers.scout = localise(SCENARIOS.find((x) => x.research).answers.scout, lang);
    return requestsOf(run, answers, lang);
  });
  const priced = runs.map((reqs) => ({ reqs, cost: price(reqs, setting.model, { thinks }) }));
  priced.sort((a, b) => a.cost.usd - b.cost.usd);
  const small = priced[0];
  const large = priced[priced.length - 1];
  const repair = large.reqs.reduce((a, b) => (a.input + a.output >= b.input + b.output ? a : b));
  // A repair sends the request again with the problems; a search already run is not run again.
  const top = [...large.reqs, { ...repair, searches: 0 }];
  const high = price(top, setting.model, { thinks });
  return {
    basis: "assumed",
    setting,
    research,
    usd: { low: small.cost.usd, high: high.usd },
    eur: { low: small.cost.eur, high: high.eur },
    seconds: { low: seconds(small.reqs, setting.model, { thinks, end: 0 }), high: seconds(top, setting.model, { thinks, end: 1 }) },
    requests: { low: small.reqs.length, high: top.length },
    last: lastRun,
  };
}
