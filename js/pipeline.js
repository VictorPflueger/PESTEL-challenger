// The live run (brief §5.2 to §5.8, PLAN.md section 6): the agents one after another, each a single
// request with the state as JSON and the step's format, its answer checked by code before the next step
// reads it. The run pauses where the person acts:
//   scan()        the Scout (with research on), then the Scanner; then the person keeps, edits or removes
//   challenge()   the Red team, the Analyst and the Strategist in one go; then the person chooses
//   summarise()   the Writer, once the person has adopted their responses
// Around every request: the budget cap (no request starts whose worst case would pass it; max_tokens drops
// to the step's minimum first), the shared client's retries (never for credit or a spend limit), the cost
// meter, at most ten requests a run and two repairs. A failing answer goes back once with its problems; a
// second failure stops the run at that step and keeps what is done, unless only the fact audit failed, in
// which case the texts stay with an "Unchecked" tag. Abort stops the run at any point and keeps what is
// done. Nothing here touches storage: the run lives in js/session.js.

import { MAX_TOKENS, MIN_TOKENS, MAX_REQUESTS, FX_USD_EUR, ANTHROPIC } from "./config.js";
import { streamMessage, withRetry, ApiError } from "./anthropic.js";
import { usageCostUsd } from "./cost.js";
import { REQUESTS } from "./schemas.js";
import { SECTORS } from "../data/kpis.js";
import * as P from "./prompts.js";
import * as G from "./guards.js";
import * as R from "./run.js";
import { runScout } from "./agents/scout.js";
import { mayRetry } from "./api_messages.js";
import { redactSecrets } from "./keystore.js";

/** The step each agent's work shows on. */
export const AGENT_STEP = Object.freeze({ scout: 1, scanner: 1, red_team: 2, analyst: 3, strategist: 4, writer: 5 });
/** Repairs a run may send: with five agents and up to three requests for the Scout, ten requests at most. */
export const MAX_REPAIRS = 2;
/**
 * Characters a token for the budget's worst case: fewer than the estimate's three, since JSON and German text
 * can tokenise denser than prose, so the cap errs safe. Output dominates the worst case: max_tokens in full.
 */
const CHARS_PER_TOKEN_WORST = 2;
/** Input tokens a search's results may add to the request that ran it. */
const SEARCH_TOKENS_WORST = 6000;

/** Why a run stopped: cap, checks, error, aborted or requests, with the agent and what was done. */
export class RunStop extends Error {
  constructor(reason, { agent = null, after = null, error = null, problems = [], repaired = true } = {}) {
    super(reason);
    this.name = "RunStop";
    this.reason = reason;
    this.agent = agent;
    this.after = after;
    this.error = error;
    this.problems = problems;
    this.repaired = repaired;
  }
}

/** Wraps an error the shared client would retry but brief §5.8 forbids retrying (a spend limit as a 429). */
class NoRetry extends Error {
  constructor(cause) { super(cause.message); this.name = "NoRetry"; this.cause = cause; }
}

/** A new live run from the form: the company, the person's factors in entry order, the setting and cap. */
export function createLiveRun({ inputs, lang, today, setting, research, cap }) {
  const sector = inputs.company.sector && SECTORS.some((s) => s.id === inputs.company.sector) ? inputs.company.sector : null;
  return {
    mode: "live",
    scenario: null,
    as_of: today,
    source: "live",
    lang,
    // Anything shaped like an API key, typed into the form by mistake, is redacted before a prompt reads it
    // (brief §5.3); the warning in the live-run dialog has already named it.
    company: { name: redactSecrets(inputs.company.name.trim()), sector, country: redactSecrets(inputs.company.country.trim()), what: redactSecrets(inputs.company.what.trim()), chosen: !!sector },
    team: inputs.factors.filter((f) => f.text.trim()).map((f) => ({ id: f.id, dimension: f.dimension, text: redactSecrets(f.text.trim()) })),
    research: !!research,
    signals: [],
    scan: null,
    issues: null,
    impacts: null,
    responses: null,
    summary: null,
    checked: {},
    recorded: new Map(),
    setting,
    cap,
    working: null,       // { agent, since } while a request runs
    stopped: null,       // { reason, agent, after, key, vars, problems } when the run stopped
    notices: [],         // i18n keys of what the person should know: research switched off, no signals
    unchecked: new Set(),// ids whose texts failed the fact audit twice
    log: [],             // per request: agent, repair, max_tokens, tokens, searches, ms, stop reason
    spend: { usd: 0, eur: 0 },
    unmetered: 0,        // euros held against the cap for attempts cut off mid-stream, which report no usage
    requests: 0,
    repairs: 0,
    ms: 0,               // time spent waiting for the agents
    searchOff: false,
  };
}

/** The company and factors every prompt reads. */
function inputsOf(run) {
  return {
    company: { name: run.company.name, sector: run.company.chosen ? run.company.sector : null, country: run.company.country, what: run.company.what },
    factors: run.team.map((f) => ({ id: f.id, dimension: f.dimension, text: f.text })),
  };
}

/** The worst case of a request in euros: its input at two characters a token, max_tokens out, its searches. */
export function worstCaseEur(body, { searches = 0 } = {}) {
  const sent = { system: body.system, messages: body.messages, tools: body.tools ?? null, format: body.output_config?.format ?? null };
  const input = Math.ceil(JSON.stringify(sent).length / CHARS_PER_TOKEN_WORST) + searches * SEARCH_TOKENS_WORST;
  return usageCostUsd(body.model, { input_tokens: input, output_tokens: body.max_tokens, server_tool_use: { web_search_requests: searches } }) * FX_USD_EUR;
}

/** The text of a response: its text blocks joined. */
const textOf = (message) => (message?.content || []).filter((b) => b?.type === "text").map((b) => b.text).join("");

/** The answer as JSON, or the problem that goes back with the repair. */
function parseAnswer(text, stop) {
  if (stop === "max_tokens") return { problem: "your answer was cut off at the token limit: send it again shorter, with fewer and shorter texts" };
  if (stop === "refusal") return { problem: "you declined to answer; answer the task as asked, on the analysis given" };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { problem: "your answer is not valid JSON in the format asked" };
  }
}

/** The ids whose texts the audit flagged, from the paths it gives ("factors[2].basis" → that factor's id). */
function flaggedIds(agent, answer, audit) {
  const ids = new Set();
  for (const { path } of audit) {
    const m = path.match(/^(\w+)\[(\d+)\]/);
    const item = m ? answer?.[m[1]]?.[Number(m[2])] : null;
    if (agent === "writer") ids.add("summary");
    else if (agent === "scanner") ids.add(m?.[1] === "ratings" ? item?.factor : item?.id);
    else if (agent === "red_team") { ids.add(item?.id); if (/new_factor/.test(path)) ids.add(item?.correction?.new_factor?.id); }
    else if (agent === "analyst") ids.add(`impact:${item?.factor}`);
    else if (agent === "strategist") ids.add(item?.id);
  }
  ids.delete(undefined);
  return ids;
}

/**
 * The pipeline of one live run. run: the run it fills (from createLiveRun); view(): the run with the
 * person's state (removed and edited factors, undone corrections, choices), read where a step depends on
 * what the person did; key: the API key; hooks.onEvent(event) for the page; stream and clock for tests.
 */
export function createPipeline({ run, view = () => run, key, hooks = {}, stream = streamMessage, clock = () => performance.now() }) {
  const controller = new AbortController();
  const emit = (event) => { try { hooks.onEvent?.(event); } catch (e) { console.error(e); } };
  const repairs = {
    left: () => MAX_REPAIRS - run.repairs,
    use: (agent) => { run.repairs += 1; emit({ type: "repair", agent }); },
  };
  let done = run.summary ? "summary" : run.responses ? "respond" : run.impacts ? "assess" : run.issues ? "challenge" : run.scan ? "scan" : "start";

  /** Lowers max_tokens to the step's minimum when the worst case would pass the cap; stops when even that does. */
  function fit(agent, body, searches) {
    const spent = run.spend.eur + (run.unmetered || 0);
    if (spent + worstCaseEur(body, { searches }) <= run.cap) return;
    body.max_tokens = Math.min(body.max_tokens, MIN_TOKENS[agent]);
    if (spent + worstCaseEur(body, { searches }) <= run.cap) { emit({ type: "tokens", agent, max_tokens: body.max_tokens }); return; }
    throw new RunStop("cap", { agent, after: done });
  }

  /** One request: the cap, the request limit, the retries, the meter and the log. */
  async function send(agent, body, { searches = 0, repair = false } = {}) {
    if (controller.signal.aborted) throw new RunStop("aborted", { agent, after: done });
    if (run.requests >= MAX_REQUESTS) throw new RunStop("requests", { agent, after: done });
    fit(agent, body, searches);
    run.requests += 1;
    const started = clock();
    emit({ type: "request", agent, repair, n: run.requests, max_tokens: body.max_tokens });
    let res;
    try {
      res = await withRetry(async () => {
        try {
          return await stream({ key, body, signal: controller.signal });
        } catch (e) {
          if (e instanceof ApiError && e.retryable && !mayRetry(e)) throw new NoRetry(e);
          throw e;
        }
      }, { signal: controller.signal, onRetry: ({ attempt, waitMs, error }) => {
        // An attempt cut off mid-stream was billed for its input and what it wrote, which the shared client
        // cannot report: its worst case is held against the cap from here on, and the retry goes only if it
        // still fits (fit() stops the run otherwise). An error before the stream bills nothing.
        if (error?.midStream) run.unmetered = (run.unmetered || 0) + worstCaseEur(body, { searches });
        fit(agent, body, searches);
        emit({ type: "retry", agent, attempt, waitMs, status: error.status });
      } });
    } catch (e) {
      const err = e instanceof NoRetry ? e.cause : e;
      run.ms += clock() - started;
      if (err?.name === "AbortError" || controller.signal.aborted) throw new RunStop("aborted", { agent, after: done });
      throw err;
    }
    const message = res.message;
    // The meter (brief §5.5): each response's usage at the list price, $0.01 a search, at the fixed rate.
    // It adds to what the run spent before, so a step tried again after a stop counts on from there.
    const usd = run.spend.usd + usageCostUsd(body.model, message.usage);
    run.spend = { usd, eur: usd * FX_USD_EUR };
    const ms = clock() - started;
    run.ms += ms;
    run.log.push({
      agent, repair, model: body.model, max_tokens: body.max_tokens, input_tokens: message.usage?.input_tokens ?? 0, output_tokens: message.usage?.output_tokens ?? 0,
      searches: message.usage?.server_tool_use?.web_search_requests ?? 0, ms: Math.round(ms), stop_reason: message.stop_reason,
      usd: usageCostUsd(body.model, message.usage),
    });
    emit({ type: "cost", spend: run.spend, usage: message.usage });
    return message;
  }

  /** One agent's structured answer: one repair if a check fails, then a stop or, for the audit alone, Unchecked. */
  async function ask(agent, { prompt, format, check }) {
    const messages = [{ role: "user", content: prompt.user }];
    let parsed = null;
    let result = null;
    let repaired = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const body = {
        model: run.setting.model,
        max_tokens: MAX_TOKENS[agent],
        system: prompt.system,
        messages,
        output_config: { effort: run.setting.effort, format: { type: "json_schema", schema: format } },
        ...(run.setting.thinking ? { thinking: run.setting.thinking } : {}),
      };
      const message = await send(agent, body, { repair: attempt > 0 });
      const text = textOf(message);
      parsed = parseAnswer(text, message.stop_reason);
      result = parsed.problem ? { problems: [{ code: "format", message: parsed.problem }], audit: [] } : check(parsed.value);
      if (!result.problems.length && !result.audit.length) return { answer: G.lowerEnums(parsed.value), flagged: new Set() };
      if (attempt === 0 && repairs.left() > 0) {
        repairs.use(agent);
        repaired = true;
        messages.push({ role: "assistant", content: text || "{}" }, { role: "user", content: P.repairMessage(G.repairLines(result)) });
        continue;
      }
      break;
    }
    if (result.problems.length) throw new RunStop("checks", { agent, after: done, problems: G.repairLines(result), repaired });
    return { answer: G.lowerEnums(parsed.value), flagged: flaggedIds(agent, parsed.value, result.audit) };
  }

  const working = (agent) => {
    run.working = agent ? { agent, since: Date.now() } : null;
    emit({ type: "working", agent });
  };

  /** Ends a step: what is done so far, or why the run stopped. */
  function settle(error) {
    const agent = run.working?.agent ?? null;
    working(null);
    if (!error) return true;
    if (error instanceof RunStop) {
      run.stopped = { reason: error.reason, agent: error.agent, after: error.after, problems: error.problems, repaired: error.repaired };
    } else {
      run.stopped = { reason: "error", agent, after: done, error: { status: error.status ?? 0, type: error.type ?? "", message: redactSecrets(String(error.message || "")), details: error.details ?? null } };
    }
    emit({ type: "stopped", stopped: run.stopped });
    return false;
  }

  const evidence = () => G.liveEvidence({ inputs: inputsOf(run), signals: run.signals, sector: run.company.sector });

  /** Scan: the Scout with research on, then the Scanner. */
  async function scan() {
    run.stopped = null;
    try {
      const inputs = inputsOf(run);
      if (run.research && !run.signals.length) {
        working("scout");
        const r = await runScout({ send: (body, o) => send("scout", body, o), inputs, lang: run.lang, today: run.as_of, setting: run.setting, maxTokens: MAX_TOKENS.scout, repairs });
        run.signals = r.signals;
        if (r.searchOff) { run.research = false; run.searchOff = true; run.notices.push("live.notice.searchOff"); }
        else if (!r.signals.length) run.notices.push("live.notice.noSignals");
        emit({ type: "signals", count: r.signals.length, refused: r.refused });
      }
      working("scanner");
      const { answer, flagged } = await ask("scanner", {
        prompt: P.scannerPrompt({ inputs, signals: run.signals, lang: run.lang }),
        format: REQUESTS.Scan,
        check: (a) => G.checkScan(a, { inputs, signals: run.signals, evidence: evidence() }),
      });
      run.scan = { factors: answer.factors, ratings: answer.ratings, sector: answer.sector ?? null };
      if (!run.company.chosen) run.company.sector = SECTORS.some((s) => s.id === answer.sector) ? answer.sector : "general";
      for (const id of flagged) run.unchecked.add(id);
      done = "scan";
      emit({ type: "step", step: 1 });
      return settle();
    } catch (e) {
      return settle(e);
    }
  }

  /** Challenge, Assess and Respond in one go, on the factors as the person left them at Scan. */
  async function challenge() {
    run.stopped = null;
    try {
      const inputs = inputsOf(run);
      if (!run.issues) {
        working("red_team");
        const factors = R.scannedFactors(view());
        const { answer, flagged } = await ask("red_team", {
          prompt: P.redTeamPrompt({ inputs, factors, signals: run.signals, lang: run.lang }),
          format: REQUESTS.Issues,
          check: (a) => G.checkIssues(a, { factors, signals: run.signals, evidence: evidence() }),
        });
        run.issues = answer.issues;
        for (const id of flagged) run.unchecked.add(id);
        done = "challenge";
        emit({ type: "step", step: 2 });
      }
      // The Analyst and the Strategist read every factor after the corrections, those marked out of date
      // too, with no correction undone, so an Undo later needs no other request.
      const all = R.challengedFactors({ ...view(), undone: new Set() });
      const sector = run.company.sector || "general";
      if (!run.impacts) {
        working("analyst");
        const { answer, flagged } = await ask("analyst", {
          prompt: P.analystPrompt({ inputs, factors: all, sector, lang: run.lang }),
          format: REQUESTS.Impacts,
          check: (a) => G.checkImpacts(a, { factors: all, sector, evidence: evidence() }),
        });
        run.impacts = answer.impacts;
        for (const id of flagged) run.unchecked.add(id);
        done = "assess";
        emit({ type: "step", step: 3 });
      }
      if (!run.responses) {
        working("strategist");
        const { answer, flagged } = await ask("strategist", {
          prompt: P.strategistPrompt({ inputs, factors: all, issues: run.issues, impacts: run.impacts, lang: run.lang }),
          format: REQUESTS.Responses,
          check: (a) => G.checkResponses(a, { factors: all, impacts: run.impacts, evidence: evidence() }),
        });
        run.responses = answer.responses;
        for (const id of flagged) run.unchecked.add(id);
        done = "respond";
        emit({ type: "step", step: 4 });
      }
      return settle();
    } catch (e) {
      return settle(e);
    }
  }

  /** Summary: the Writer, with the engine's fact keys for the responses the person adopted. */
  async function summarise() {
    run.stopped = null;
    try {
      const v = { ...view(), decided: true };
      const facts = R.runFacts(v, run.lang);
      const factors = R.challengedFactors(v);
      const byId = new Map(factors.map((f) => [f.id, f]));
      const responses = new Map((run.responses || []).map((r) => [r.id, r]));
      const chosen = R.engineDecisions(v).map((d) => ({ factor: byId.get(d.factor)?.text ?? d.factor, kind: d.kind, response: responses.get(d.response)?.title ?? null }));
      const issues = (run.issues || []).filter((i) => !v.undone?.has(i.id));
      working("writer");
      const { answer, flagged } = await ask("writer", {
        prompt: P.writerPrompt({ inputs: inputsOf(run), factors, issues, chosen, facts, lang: run.lang }),
        format: REQUESTS.SummaryRequest,
        check: (a) => G.checkSummary(a, { facts: Object.keys(facts), evidence: evidence() }),
      });
      run.summary = answer.summary;
      for (const id of flagged) run.unchecked.add(id);
      done = "summary";
      emit({ type: "step", step: 5 });
      return settle();
    } catch (e) {
      return settle(e);
    }
  }

  return {
    scan,
    challenge,
    summarise,
    /** Stops the request in flight and the run with it; what is done stays. */
    abort() { controller.abort(); },
    get aborted() { return controller.signal.aborted; },
  };
}

/** The searches a research run may pay for, for the meter's note: five at most. */
export const SEARCHES = ANTHROPIC.webSearchTool.max_uses;
