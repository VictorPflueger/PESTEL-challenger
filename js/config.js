// What the whole tool shares: its name and version, the keys it may keep in the browser and the security
// policy index.html carries. The models, prices and the live run's settings join in M3.

export const APP = Object.freeze({
  name: "PESTEL Challenger",
  version: "0.1.0",
  url: "https://victorpflueger.github.io/PESTEL-challenger/",
});

/**
 * The only keys this tool keeps in the browser (brief §5.9): the language under its own prefix, since all
 * of Victor's sites share one origin. Vici keeps the theme (vc-theme) and its note that the guide has
 * opened in this tab (vc-guide:…). Nothing a person enters, no key and no result is ever stored.
 */
export const STORAGE = Object.freeze({ prefix: "pestel", lang: "pestel.lang" });

/** The security policy of brief §5.1, exactly as index.html's meta tag carries it. */
export const POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

/**
 * Prices in US dollars per million tokens, read on 23 November 2026 at
 * https://platform.claude.com/docs/en/about-claude/pricing (TECH_NOTES.md logs the reading). Haiku 5.5
 * prompts over 100,000 tokens cost more, so no request comes near that. Web search costs $10 per 1,000.
 */
export const PRICES = Object.freeze({
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  search: 0.01,
});

/** The fixed rate the tool converts dollars at (brief §5.5), stated in the method dialog. */
export const USD_TO_EUR = 0.894;

/** The setting a simulation's cost is estimated on: Balanced, Haiku 5.5 at medium effort, thinking adaptive. */
export const SIM_SETTING = Object.freeze({ model: "claude-haiku-5-5", effort: "medium", searches: 5 });
