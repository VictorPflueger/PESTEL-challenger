// The four key figures, top right (brief §8): at stake a year, dimensions under pressure, readiness and
// the session cost. They answer first: from the first screen they show the scenario's analysis before
// any decision, worked out by the engine from the recorded run, so the room sees what is at stake before
// anything plays. Once the person adopts their responses, the old value stands struck through beside the
// new one. The simulation's session cost is an estimate on the Balanced setting and says so.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/kpis.js: this tool's four figures.

import { t, getLang } from "./i18n/index.js";
import * as R from "./run.js";
import { readinessText } from "./engine.js";
import { money } from "./format.js";
import { fmtCost } from "./format.js";

const tiles = {
  stake: () => document.getElementById("kpi-stake"),
  pressure: () => document.getElementById("kpi-pressure"),
  readiness: () => document.getElementById("kpi-readiness"),
  cost: () => document.getElementById("kpi-cost"),
};

function put(tile, { value, tail = "", was = null, note, state = "ready" }) {
  const el = tile();
  if (!el) return;
  el.dataset.state = state;
  const v = el.querySelector(".kpi-value");
  const w = el.querySelector(".kpi-was");
  const n = el.querySelector(".kpi-note");
  v.removeAttribute("data-i18n");
  n.removeAttribute("data-i18n");
  v.textContent = value;
  // A figure on part of the threats says so in its value, in smaller type after the amount.
  if (tail) v.append(Object.assign(document.createElement("span"), { className: "kpi-tail", textContent: ` ${tail}` }));
  n.textContent = note;
  if (w) {
    w.hidden = was === null || was === value;
    w.textContent = was === null ? "" : was;
  }
}

/** Fills the tiles from the run: before the decision, or after it with the old values struck through. */
export function renderKpis(run, { estimate = null } = {}) {
  const lang = getLang();
  const r = R.figures(run);
  const decided = !!run.decided;
  const pressure = (x) => t("fig.pressure", { n: x.pressure.length }, lang);
  const tail = (x) => (x.monetised < x.threats ? t("fig.moneyTail", { n: x.monetised, total: x.threats }, lang) : "");
  put(tiles.stake, decided
    ? { value: money(r.after.atStake, lang), tail: tail(r.after), was: money(r.before.atStake, lang), note: r.upside > 0 ? t("kpi.note.left.upside", { money: money(r.upside, lang) }) : t("kpi.note.left") }
    : { value: money(r.before.atStake, lang), tail: tail(r.before), note: t("kpi.note.before") });
  put(tiles.pressure, decided
    ? { value: pressure(r.after), was: pressure(r.before), note: t("kpi.note.after") }
    : { value: pressure(r.before), note: t("kpi.note.before") });
  put(tiles.readiness, decided
    ? { value: readinessText(r.after.readiness, lang), was: readinessText(r.before.readiness, lang), note: t("kpi.note.readiness") }
    : { value: readinessText(r.before.readiness, lang), note: t("kpi.note.readiness") });
  put(tiles.cost, estimate
    ? { value: `≈ ${fmtCost(estimate.eur, lang)}`, note: t("kpi.note.estimate"), state: "estimate" }
    : { value: t("kpi.wait"), note: "", state: "waiting" });
}
