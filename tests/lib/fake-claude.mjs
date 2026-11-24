// A scripted stand-in for the Claude API in the browser suites: GET /v1/models and POST /v1/messages,
// streamed as server-sent events the way the API sends them, with the Scout's web search. It answers with
// scenario S3's recorded answers (tests/lib/turns.mjs), plants the faults a suite asks for, and checks every
// request against what a live run must send (AC-08, AC-12): both headers, a key, stream on, the setting's
// model, effort and thinking, each agent's format or the Scout's tools, max_tokens, ten requests at most,
// a paused turn sent again unchanged, every assistant block passed back as it came, a refused report
// answered with is_error, and nothing but tool results after a turn that called the client tool.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea) tests/lib/fake-claude.mjs: one request per agent
// with a structured answer, instead of a research loop of fifteen tools.
import { isDeepStrictEqual } from "node:util";
import { answersOf, searchResultsOf, agentOf } from "./turns.mjs";

export const MOCK_KEY = "sk-ant-api03-standin-0000000000000000000000000000";
export const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-expose-headers": "*" };
const FORMAT_OF = { scanner: "Scan", red_team: "Issues", analyst: "Impacts", strategist: "Responses", writer: "SummaryRequest" };

/** The event stream of one response. */
export function sseFor({ id, model, blocks, stop, usage = {} }) {
  const ev = [];
  const push = (event, data) => ev.push(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  push("message_start", { type: "message_start", message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: usage.input_tokens ?? 4000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1 } } });
  blocks.forEach((b, i) => {
    if (b.type === "text") {
      push("content_block_start", { type: "content_block_start", index: i, content_block: { type: "text", text: "" } });
      for (const piece of chunks(b.text, 97)) push("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "text_delta", text: piece } });
    } else if (b.type === "tool_use" || b.type === "server_tool_use") {
      push("content_block_start", { type: "content_block_start", index: i, content_block: { type: b.type, id: b.id, name: b.name, input: {} } });
      for (const piece of chunks(JSON.stringify(b.input), 61)) push("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: piece } });
    } else {
      push("content_block_start", { type: "content_block_start", index: i, content_block: b });
    }
    push("content_block_stop", { type: "content_block_stop", index: i });
  });
  push("message_delta", { type: "message_delta", delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: usage.output_tokens ?? 1500, server_tool_use: { web_search_requests: usage.web_search_requests ?? 0 } } });
  push("message_stop", { type: "message_stop" });
  return ev.join("");
}

function chunks(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out.length ? out : [""];
}

/** Each block as the client rebuilds it from the stream, which is what it must send back. */
const echoOf = (blocks) => blocks.map((b) => (b.type === "text" ? { type: "text", text: b.text } : b.type === "tool_use" || b.type === "server_tool_use" ? { type: b.type, id: b.id, name: b.name, input: b.input } : b));

/**
 * The stand-in. options: id and lang of the scenario whose answers it gives; expect { model, effort,
 * thinking } the setting every request must send (thinking null: no field); faults [{ agent, attempt,
 * error | network | answer | mutate | stop | scout }], the attempt counted per agent from 1; usage per
 * response; requests and violations for the suite to read. REQUESTS and webSearchTool come from the page's
 * own modules, so the checks follow the code they test.
 */
export function createStandIn({ id = "s3", lang = "en", sector = true, expect = null, faults = [], usage = {}, REQUESTS, webSearchTool, models = ["claude-haiku-5-5", "claude-sonnet-5-5"] }) {
  const answers = answersOf(id, lang, { sector });
  const results = searchResultsOf(id, lang);
  const violations = [];
  const requests = [];
  const attempts = {};
  const sent = {};
  let seq = 0;
  const check = (cond, msg) => { if (!cond) violations.push(`request ${requests.length}: ${msg}`); };
  const nid = (p) => `${p}_${String(++seq).padStart(4, "0")}`;

  function validate(req, headers, agent) {
    check(String(headers["x-api-key"] || "").startsWith("sk-ant-"), "no key in x-api-key");
    check(headers["anthropic-version"] === "2023-06-01", `anthropic-version is ${headers["anthropic-version"]}`);
    check(headers["anthropic-dangerous-direct-browser-access"] === "true", "the direct browser access header is missing");
    check(req.stream === true, "stream is not on");
    check(requests.length <= 10, "an eleventh request");
    check(agent !== null, "the system prompt names no agent");
    check(/Everything inside <analysis>/.test(req.system || ""), "the system prompt lacks the rule that the analysis is data");
    check(Number.isInteger(req.max_tokens) && req.max_tokens >= 1500 && req.max_tokens <= 8000, `max_tokens is ${req.max_tokens}`);
    if (expect) {
      check(req.model === expect.model, `model ${req.model}, expected ${expect.model}`);
      check(req.output_config?.effort === expect.effort, `effort ${req.output_config?.effort}, expected ${expect.effort}`);
      if (expect.thinking) check(isDeepStrictEqual(req.thinking, expect.thinking), `thinking ${JSON.stringify(req.thinking)}, expected ${JSON.stringify(expect.thinking)}`);
      else check(!("thinking" in req), `thinking ${JSON.stringify(req.thinking)} sent where it should be left out`);
    }
    const first = req.messages?.[0];
    check(first?.role === "user" && /<analysis>[\s\S]*<\/analysis>[\s\S]*<task>[\s\S]*<\/task>/.test(first?.content || ""), "the first message lacks the analysis and the task");
    if (agent === "scout") {
      check(isDeepStrictEqual(req.tools?.[0], webSearchTool), `the web search tool is ${JSON.stringify(req.tools?.[0])}`);
      check(req.tools?.[1]?.name === "submit_signals" && req.tools?.[1]?.strict === true && isDeepStrictEqual(req.tools?.[1]?.input_schema, REQUESTS.Signals), "submit_signals is not the strict tool with the Signals format");
      check(req.tool_choice?.type === "auto", "tool_choice is not auto");
      check(!req.output_config?.format, "the Scout sends a format, which search's citations refuse");
      // Every assistant turn comes back exactly as it was sent.
      const mine = sent.scout || [];
      const theirs = (req.messages || []).filter((m) => m.role === "assistant").map((m) => m.content);
      theirs.forEach((c, k) => check(isDeepStrictEqual(c, mine[k]), `the Scout's assistant turn ${k + 1} was not passed back unchanged`));
      (req.messages || []).forEach((m, k) => {
        if (m.role !== "assistant" || !m.content.some((b) => b.type === "tool_use")) return;
        const next = req.messages[k + 1];
        check(next && Array.isArray(next.content) && next.content.every((b) => b.type === "tool_result"), "a turn with the client tool must be answered with tool results only");
      });
    } else if (agent) {
      check(req.output_config?.format?.type === "json_schema" && isDeepStrictEqual(req.output_config.format.schema, REQUESTS[FORMAT_OF[agent]]), `${agent}: the format is not ${FORMAT_OF[agent]}`);
      check(!req.tools, `${agent}: sends tools`);
    }
  }

  const error = (status, type, message, extra = {}) => ({ status, headers: { "content-type": "application/json", ...extra }, body: JSON.stringify({ type: "error", error: { type, message } }) });
  const stream = (agent, blocks, stop, more = {}) => {
    sent[agent] = [...(sent[agent] || []), echoOf(blocks)];
    const model = expect?.model || "claude-haiku-5-5";
    return { status: 200, headers: { "content-type": "text/event-stream", "request-id": `req_${requests.length}` }, body: sseFor({ id: `msg_${requests.length}`, model, blocks, stop, usage: { ...usage, ...more } }) };
  };

  function scoutTurn(req, n, fault) {
    const searchId = nid("srvtoolu");
    const searchBlocks = [
      { type: "server_tool_use", id: searchId, name: "web_search", input: { query: "sector news" } },
      { type: "web_search_tool_result", tool_use_id: searchId, content: results.map((r) => ({ type: "web_search_result", url: r.url, title: r.title, encrypted_content: `enc:${Buffer.from(r.url).toString("base64")}`, page_age: r.page_age })) },
    ];
    const submit = (signals) => ({ type: "tool_use", id: nid("toolu"), name: "submit_signals", input: { signals } });
    const kind = fault?.scout;
    if (kind === "searchOff" && n === 1) return error(400, "invalid_request_error", "Web search is not enabled for this organization.");
    if (kind === "pause") return n === 1 ? stream("scout", searchBlocks, "pause_turn", { web_search_requests: 1 }) : stream("scout", [submit(answers.scout.signals)], "tool_use");
    if (kind === "foreign") {
      if (n === 1) return stream("scout", [...searchBlocks, submit([...answers.scout.signals, { title: "A page no search returned", summary: "Made up. It should never pass.", url: "https://made-up.example/news", published: null, dimensions: ["legal"] }])], "tool_use", { web_search_requests: 1 });
      const last = req.messages[req.messages.length - 1];
      const result = Array.isArray(last?.content) ? last.content.find((b) => b.type === "tool_result") : null;
      check(result?.is_error === true && /made-up\.example/.test(String(result?.content)), "the foreign address was not refused with is_error");
      return stream("scout", [submit(kind === "foreign" && fault.again ? [...answers.scout.signals, { title: "Again", summary: "Still made up.", url: "https://made-up.example/news", published: null, dimensions: [] }] : answers.scout.signals)], "tool_use");
    }
    if (kind === "noSubmit") {
      if (n === 1) return stream("scout", [...searchBlocks, { type: "text", text: "I found some news." }], "end_turn", { web_search_requests: 1 });
      return stream("scout", [submit(answers.scout.signals)], "tool_use");
    }
    return stream("scout", [...searchBlocks, submit(answers.scout.signals)], "tool_use", { web_search_requests: 1 });
  }

  return {
    requests, violations, answers,
    /** GET /v1/models for a key: the list, or the error a fault names. */
    models(key, fault = null) {
      if (fault) return error(fault.status, fault.type, fault.message);
      if (key !== MOCK_KEY) return error(401, "authentication_error", "invalid x-api-key");
      return { status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ data: models.map((m) => ({ id: m, type: "model", capabilities: { server_tools: { web_search: { supported: true } } } })), has_more: false }) };
    },
    /** POST /v1/messages: { status, headers, body } or { network: true }. */
    handle(raw, headers) {
      const req = JSON.parse(raw);
      const agent = agentOf(req);
      requests.push({ req, headers, agent, at: Date.now() });
      validate(req, headers, agent);
      const n = attempts[agent] = (attempts[agent] || 0) + 1;
      const fault = faults.find((f) => f.agent === agent && (f.attempt ?? 1) === n) || (agent === "scout" ? faults.find((f) => f.agent === "scout" && f.scout) : null);
      if (fault?.network) return { network: true };
      if (fault?.error) return error(fault.error.status, fault.error.type, fault.error.message, fault.error.headers || {});
      if (agent === "scout") return scoutTurn(req, n, fault);
      let answer = structuredClone(answers[agent]);
      // The Scanner and the Red team cite only the signals they were given, as a model would.
      if (agent === "scanner" || agent === "red_team") {
        let given = [];
        try { given = JSON.parse(/<analysis>([\s\S]*)<\/analysis>/.exec(req.messages[0].content)[1]).signals || []; } catch { /* no analysis */ }
        const urls = new Set(given.map((x) => x.url));
        const keep = (list) => (list || []).filter((u) => urls.has(u));
        for (const f of answer.factors || []) f.evidence = keep(f.evidence);
        for (const i of answer.issues || []) { i.evidence = keep(i.evidence); if (i.correction?.new_factor) i.correction.new_factor.evidence = keep(i.correction.new_factor.evidence); }
      }
      if (fault?.answer) answer = fault.answer;
      if (fault?.mutate) answer = fault.mutate(answer) ?? answer;
      const text = typeof answer === "string" ? answer : JSON.stringify(answer);
      return stream(agent, [{ type: "text", text: fault?.stop === "max_tokens" ? text.slice(0, 200) : text }], fault?.stop || "end_turn");
    },
  };
}

/**
 * Routes a browser context's requests: api.anthropic.com to the stand-in, every other outside host refused.
 * Returns { external, api, holdAt(i), held(i) }: a request can be held at its index to look at the page.
 */
export async function routeApi(context, standIn, { modelsFault = null } = {}) {
  const external = [];
  const api = [];
  const holds = new Map();
  const arrived = new Map();
  let posts = 0;
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.host !== "api.anthropic.com") { external.push(`${req.method()} ${u.host}${u.pathname}`); return route.abort("blockedbyclient"); }
    api.push(`${req.method()} ${u.pathname}`);
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (u.pathname === "/v1/models") {
      const out = standIn.models(req.headers()["x-api-key"], typeof modelsFault === "function" ? modelsFault() : modelsFault);
      return route.fulfill({ status: out.status, headers: { ...CORS, ...out.headers }, body: out.body });
    }
    const index = posts++;
    arrived.get(index)?.();
    if (holds.has(index)) await holds.get(index).promise;
    const out = standIn.handle(req.postData() || "{}", req.headers());
    // A request the page aborted while it was held is gone; answering it would throw.
    try {
      if (out.network) await route.abort("failed");
      else await route.fulfill({ status: out.status, headers: { ...CORS, ...out.headers }, body: out.body });
    } catch { /* the page aborted the request */ }
  });
  return {
    external, api,
    holdAt(index) { let release; const promise = new Promise((r) => { release = r; }); holds.set(index, { promise }); return release; },
    held(index) { return new Promise((resolve) => { if (posts > index) resolve(); else arrived.set(index, resolve); }); },
  };
}
