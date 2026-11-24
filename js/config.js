// What the whole tool shares: its name and version, the keys it may keep in the browser, the security
// policy index.html carries, the models and their prices, and the live run's settings. The shared live
// client (js/anthropic.js and js/cost.js, copied unchanged from the Prototype Ideator) reads ANTHROPIC,
// MODELS, APP and FX_USD_EUR under these names.

export const APP = Object.freeze({
  id: "pestel",
  name: "PESTEL Challenger",
  version: "0.4.0",
  url: "https://victorpflueger.github.io/PESTEL-challenger/",
});

/** The Prototype Ideator, which reads the handoff file (brief §4.1); the report and the last bar link to it. */
export const IDEATOR_URL = "https://victorpflueger.github.io/PrototypeIdeator/";

/**
 * The only keys this tool keeps in the browser (brief §5.9): the language under its own prefix, since all
 * of Victor's sites share one origin. Vici keeps the theme (vc-theme) and its note that the guide has
 * opened in this tab (vc-guide:…). Nothing a person enters, no key and no result is ever stored.
 */
export const STORAGE = Object.freeze({ prefix: "pestel", lang: "pestel.lang" });

/** The security policy of brief §5.1, exactly as index.html's meta tag carries it. */
export const POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

/** Where the live client talks to, and how (TECH_NOTES.md section 2 has each fact and the date it was read). */
export const ANTHROPIC = Object.freeze({
  messagesUrl: "https://api.anthropic.com/v1/messages",
  modelsUrl: "https://api.anthropic.com/v1/models?limit=100",
  countTokensUrl: "https://api.anthropic.com/v1/messages/count_tokens",
  // The sister prototypes' version; 2026-10-21 is the newest, and all prototypes switch together.
  apiVersion: "2023-06-01",
  // Without this header the browser blocks the call (probed on 23 November 2026).
  browserHeader: "anthropic-dangerous-direct-browser-access",
  // The Scout's search: five searches at most, as PLAN.md section 15 fixes it.
  webSearchTool: Object.freeze({ type: "web_search_20250305", name: "web_search", max_uses: 5 }),
  webSearchUsdPer1000: 10,
  keysUrl: "https://platform.claude.com/settings/keys",
});

/**
 * The models a live run may use, with their list prices in US dollars per million tokens, read on 23
 * November 2026 and again on 24 November 2026 at https://platform.claude.com/docs/en/about-claude/pricing
 * (TECH_NOTES.md logs each reading). Haiku 5.5 prompts over 100,000 tokens cost more, so no request comes
 * near that. Opus 5.5 is left out: it always thinks and costs forty times Haiku's price (PLAN.md section 15).
 */
export const MODELS = Object.freeze([
  {
    id: "claude-haiku-5-5", label: "Haiku 5.5",
    price: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01,
      longPrompt: { thresholdTokens: 100000, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 } },
  },
  {
    id: "claude-sonnet-5-5", label: "Sonnet 5.5",
    price: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  },
]);
export const modelById = (id) => MODELS.find((m) => m.id === id) || null;

/** The fixed rate the tool converts dollars at (brief §5.5), stated in the method dialog. */
export const FX_USD_EUR = 0.894;

/**
 * The three settings of brief §5.4. Fast turns thinking off: "disabled" on Haiku 5.5, which Sonnet 5.5
 * refuses, so Fast switched to Sonnet under Advanced sends "between_tools" instead. Balanced and Thorough
 * leave the field out, so the models think as they see fit.
 */
export const PRESETS = Object.freeze({
  fast: Object.freeze({ model: "claude-haiku-5-5", effort: "low", thinking: "off" }),
  balanced: Object.freeze({ model: "claude-haiku-5-5", effort: "medium", thinking: "adaptive" }),
  thorough: Object.freeze({ model: "claude-sonnet-5-5", effort: "medium", thinking: "adaptive" }),
});
export const PRESET_ORDER = Object.freeze(["fast", "balanced", "thorough"]);
export const DEFAULT_PRESET = "balanced";
export const EFFORTS = Object.freeze(["low", "medium", "high"]);

/** The budget cap a person sets for one run, in euros (brief §5.3). */
export const CAP = Object.freeze({ min: 0.05, max: 3, step: 0.05, default: 0.5 });

/**
 * Output tokens per request. Every step starts at 8,000 (brief §5.4) until Victor's first live runs measure
 * what each one needs; when the budget cap is tight, a request may drop to its step's minimum, below which
 * an answer would not fit.
 */
export const MAX_TOKENS = Object.freeze({ scout: 8000, scanner: 8000, red_team: 8000, analyst: 8000, strategist: 8000, writer: 8000 });
export const MIN_TOKENS = Object.freeze({ scout: 2000, scanner: 3000, red_team: 3000, analyst: 3000, strategist: 3000, writer: 1500 });

/** The models' reliable knowledge cutoff, which a run without research states (brief §5.7). */
export const KNOWLEDGE_CUTOFF = "2026-06";

/** At most this many requests in one run: five agents, three for the Scout and two repairs (PLAN.md N2). */
export const MAX_REQUESTS = 10;

/** The setting a simulation's cost is estimated on: Balanced, Haiku 5.5 at medium effort, thinking adaptive. */
export const SIM_SETTING = Object.freeze({ preset: "balanced", model: "claude-haiku-5-5", effort: "medium", searches: 5 });

/** The model, effort and thinking a run sends for a setting and the person's Advanced choices. */
export function settingOf({ preset = DEFAULT_PRESET, model = null, effort = null } = {}) {
  const p = PRESETS[preset] || PRESETS[DEFAULT_PRESET];
  const m = modelById(model)?.id || p.model;
  const e = EFFORTS.includes(effort) ? effort : p.effort;
  const thinking = p.thinking === "off" ? (m === "claude-sonnet-5-5" ? { type: "between_tools" } : { type: "disabled" }) : null;
  return { preset: PRESETS[preset] ? preset : DEFAULT_PRESET, model: m, effort: e, thinking };
}
