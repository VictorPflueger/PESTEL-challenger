// The Scout (brief §5.7 and PLAN.md section 6): with research on, it searches the web before the Scanner
// starts and reports what it found through one strict client tool, submit_signals. Code keeps the rules
// the search tool needs and the ones that keep the evidence honest:
//   - only addresses from this request's own search results count; a signal citing another is refused
//     with is_error, once, and dropped if the Scout cites it again;
//   - a pause_turn goes back unchanged, the assistant's turn appended and nothing else;
//   - a turn that holds a search and the client tool is answered with tool results only;
//   - an organisation with web search switched off (HTTP 400) continues without research and says so;
//   - a turn that ends without submit_signals gets one repair, which counts against the run's two.
// At most three requests: the first, one continuation and one round after refused addresses or a repair.
// Signals beyond eight, or with a date that is no date, are trimmed by code rather than sent back.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): js/evidence.js (the address registry, its
// normalised addresses) and js/agent.js (pause_turn), for one tool call instead of a research loop.

import { ANTHROPIC } from "../config.js";
import { isWebSearchDisabled } from "../anthropic.js";
import { REQUESTS } from "../schemas.js";
import { DIMENSIONS } from "../engine.js";
import { scoutPrompt } from "../prompts.js";

export const MAX_SCOUT_REQUESTS = 3;
const MAX_SIGNALS = 8;

/** The client tool the Scout reports through: strict, so its input follows the Signals format. */
export const SUBMIT_SIGNALS = Object.freeze({
  name: "submit_signals",
  description: "Report the signals you found, once, after your searches. Use each url exactly as a search result gave it.",
  strict: true,
  input_schema: REQUESTS.Signals,
});

/** An address for comparison: lower-case scheme and host, fragment removed. */
export function normaliseUrl(url) {
  const raw = String(url ?? "").trim();
  try {
    const u = new URL(raw);
    u.hash = "";
    return u.href;
  } catch {
    return raw.replace(/#.*$/, "");
  }
}

/** The addresses the search results of a list of content blocks returned: normalised address → result. */
export function resultsIn(content, registry = new Map()) {
  for (const b of content || []) {
    if (b?.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
    for (const r of b.content) if (r?.type === "web_search_result" && r.url) registry.set(normaliseUrl(r.url), { url: r.url, title: r.title || "", page_age: r.page_age || null });
  }
  return registry;
}

/** The searches a response ran, by its server tool calls. */
const searchesIn = (content) => (content || []).filter((b) => b?.type === "server_tool_use" && b.name === "web_search").length;

/** A signal as the run keeps it, or null when it cannot be used. */
function cleanSignal(s, registry, today) {
  if (!s || typeof s !== "object") return null;
  const hit = registry.get(normaliseUrl(s.url));
  const title = String(s.title ?? "").trim();
  const summary = String(s.summary ?? "").trim();
  if (!hit || !title || !summary) return null;
  const published = typeof s.published === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.published) ? s.published : null;
  const dimensions = [...new Set((Array.isArray(s.dimensions) ? s.dimensions : []).map((d) => String(d).toLowerCase()).filter((d) => DIMENSIONS.includes(d)))];
  return { title, summary, url: hit.url, published, dimensions, read_on: today };
}

/**
 * Runs the Scout. send(body, { searches }) is the pipeline's request function (budget, retries, meter);
 * repairs: { left() , use() } the run's repairs. Returns { signals, requests, refused, searchOff, missing }.
 */
export async function runScout({ send, inputs, lang, today, setting, maxTokens, repairs }) {
  const prompt = scoutPrompt({ inputs, lang, today });
  const tools = [ANTHROPIC.webSearchTool, SUBMIT_SIGNALS];
  const messages = [{ role: "user", content: prompt.user }];
  const registry = new Map();
  let requests = 0;
  // max_uses counts the searches of one turn: a request after pause_turn, or one that sends only a tool_result,
  // continues the turn; the repair's new instruction starts another, in which five searches may run again.
  let turnSearched = 0;
  let refusedRound = false;
  let repaired = false;
  let refused = 0;
  while (requests < MAX_SCOUT_REQUESTS) {
    const body = {
      model: setting.model,
      max_tokens: maxTokens,
      system: prompt.system,
      messages,
      tools,
      tool_choice: { type: "auto" },
      output_config: { effort: setting.effort },
      ...(setting.thinking ? { thinking: setting.thinking } : {}),
    };
    let message;
    try {
      message = await send(body, { searches: Math.max(0, ANTHROPIC.webSearchTool.max_uses - turnSearched), repair: repaired && requests > 0 });
    } catch (e) {
      if (isWebSearchDisabled(e)) return { signals: [], requests: requests + 1, refused, searchOff: true, missing: false };
      throw e;
    }
    requests += 1;
    turnSearched += searchesIn(message.content);
    resultsIn(message.content, registry);

    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const call = (message.content || []).find((b) => b?.type === "tool_use" && b.name === SUBMIT_SIGNALS.name);
    if (call) {
      // A call cut off at the token limit holds no usable list; it gets the same one round as foreign addresses.
      const cut = message.stop_reason === "max_tokens" || !Array.isArray(call.input?.signals);
      const given = cut ? [] : call.input.signals;
      const foreign = given.filter((s) => !registry.has(normaliseUrl(s?.url)));
      if ((cut || foreign.length) && !refusedRound && requests < MAX_SCOUT_REQUESTS) {
        refusedRound = true;
        refused += foreign.length;
        messages.push({ role: "assistant", content: message.content });
        messages.push({ role: "user", content: [{
          type: "tool_result",
          tool_use_id: call.id,
          is_error: true,
          content: cut
            ? "Your call was cut off at the token limit. Call submit_signals again with fewer signals and shorter summaries."
            : `These urls came from no search result of this request: ${foreign.map((s) => s?.url).join(", ")}. Call submit_signals again with urls from your search results only, exactly as they were given.`,
        }] });
        continue;
      }
      if (foreign.length) refused += foreign.length;
      const signals = given.map((s) => cleanSignal(s, registry, today)).filter(Boolean).slice(0, MAX_SIGNALS);
      return { signals, requests, refused, searchOff: false, missing: false };
    }
    // The turn ended without the report: one repair, if the run has one left.
    if (!repaired && requests < MAX_SCOUT_REQUESTS && repairs.left() > 0) {
      repaired = true;
      repairs.use("scout");
      turnSearched = 0;
      messages.push({ role: "assistant", content: message.content });
      messages.push({ role: "user", content: "Call submit_signals now, once, with the news your searches found. Use only urls from your search results." });
      continue;
    }
    return { signals: [], requests, refused, searchOff: false, missing: true };
  }
  return { signals: [], requests, refused, searchOff: false, missing: true };
}
