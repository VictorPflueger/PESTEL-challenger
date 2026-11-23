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
