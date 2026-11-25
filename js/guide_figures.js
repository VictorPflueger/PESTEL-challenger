// The figures in the two guides (data-fig), filled from the default scenario as the engine computes it,
// so the talk track cannot drift from the page: the key figures before and after the recorded decision,
// the session cost on Balanced and on Thorough, and the counts the script quotes.

import { getLang, t } from "./i18n/index.js";
import * as R from "./run.js";
import { scenarioById, DEFAULT_SCENARIO, runFromScenario, freshState } from "./simulation.js";
import { estimateScenario } from "./estimate.js";
import { readinessText } from "./engine.js";
import { fmtCost, money } from "./format.js";
import { numberedThreats } from "./matrix.js";

/** The default scenario's figures in a language, by the data-fig keys the guides use. */
export function guideFigures(lang) {
  const sc = scenarioById(DEFAULT_SCENARIO);
  const state = freshState();
  const draft = runFromScenario(sc, lang, state);
  for (const [f, c] of draft.recorded) state.choices.set(f, c);
  state.decided = true;
  const run = runFromScenario(sc, lang, state);
  const r = R.figures(run);
  const balanced = estimateScenario(sc, "en");
  const thorough = estimateScenario(sc, "en", { model: "claude-sonnet-5-5" });
  const scan = Object.values(R.dimensionStates(run, 1)).filter((s) => s.status === "pressure").length;
  const top = numberedThreats(run)[0];
  return {
    company: sc.company.name,
    "stake.before": money(r.before.atStake, lang),
    "stake.after": money(r.after.atStake, lang),
    "pressure.before": t("fig.pressure", { n: r.before.pressure.length }, lang),
    "pressure.after": t("fig.pressure", { n: r.after.pressure.length }, lang),
    "pressure.scan": t("fig.pressure", { n: scan }, lang),
    "readiness.before": readinessText(r.before.readiness, lang),
    "readiness.after": readinessText(r.after.readiness, lang),
    // A no-break space keeps "≈" with its figure when the line wraps.
    "cost.balanced": `≈\u00a0${fmtCost(balanced.eur, lang)}`,
    "cost.thorough": `≈\u00a0${fmtCost(thorough.eur, lang)}`,
    "team.count": String(run.team.length),
    "issues.count": String(run.issues.length),
    "top.threat": top ? top.f.text : "",
  };
}

/** Fills every [data-fig] in both guides, each in its own language. */
export function fillGuides() {
  for (const lang of ["en", "de"]) {
    const guide = document.getElementById(`guide-${lang}`);
    if (!guide) continue;
    const figs = guideFigures(lang);
    for (const el of guide.querySelectorAll("[data-fig]")) {
      const v = figs[el.dataset.fig];
      if (v !== undefined) el.textContent = v;
    }
  }
  return getLang();
}
