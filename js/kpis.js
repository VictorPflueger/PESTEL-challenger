// The four key figures, top right (brief §8): at stake a year, dimensions under pressure, readiness and
// the session cost. They answer first: from the first screen they show the scenario's analysis before
// any decision, worked out by the engine from the recorded run, so the room sees what is at stake before
// anything plays. Once the person adopts their responses, the old value stands struck through beside the
// new one. The simulation's session cost is an estimate on the Balanced setting and says so; a live run's
// is what it has spent, against its cap.
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

/**
 * The four figures as the tiles show them, in a language: { stake, pressure, readiness, cost }, each
 * { value, tail, was, note, state }. The tiles, the report and the tests read the same words (AC-20).
 */
export function kpiValues(run, { estimate = null, live = false, lang = getLang() } = {}) {
  const out = {};
  const waiting = (note) => ({ value: t("kpi.wait", null, lang), tail: "", was: null, note: note ? t(note, null, lang) : "", state: "waiting" });
  if (live) out.cost = { value: fmtCost(run.spend?.eur ?? 0, lang), tail: "", was: null, note: t("kpi.note.live.cost", { cap: fmtCost(run.cap, lang) }, lang), state: "live" };
  else out.cost = estimate
    ? { value: `≈ ${fmtCost(estimate.eur, lang)}`, tail: "", was: null, note: t("kpi.note.estimate", null, lang), state: "estimate" }
    : waiting("");
  if (live && !run.scan) {
    out.stake = waiting("kpi.note.afterAssess");
    out.pressure = waiting("kpi.note.afterScan");
    out.readiness = waiting("kpi.note.afterScan");
    return out;
  }
  const r = R.figures(run);
  const decided = !!run.decided;
  const pressure = (x) => t("fig.pressure", { n: x.pressure.length }, lang);
  const tail = (x) => (x.monetised < x.threats ? t("fig.moneyTail", { n: x.monetised, total: x.threats }, lang) : "");
  const ready = (x) => ({ tail: "", state: "ready", ...x });
  if (live && !run.impacts) out.stake = waiting("kpi.note.afterAssess");
  else out.stake = ready(decided
    ? { value: money(r.after.atStake, lang), tail: tail(r.after), was: money(r.before.atStake, lang), note: r.upside > 0 ? t("kpi.note.left.upside", { money: money(r.upside, lang) }, lang) : t("kpi.note.left", null, lang) }
    : { value: money(r.before.atStake, lang), tail: tail(r.before), was: null, note: t("kpi.note.before", null, lang) });
  out.pressure = ready(decided
    ? { value: pressure(r.after), was: pressure(r.before), note: t("kpi.note.after", null, lang) }
    : { value: pressure(r.before), was: null, note: t("kpi.note.before", null, lang) });
  out.readiness = ready(decided
    ? { value: readinessText(r.after.readiness, lang), was: readinessText(r.before.readiness, lang), note: t("kpi.note.readiness", null, lang) }
    : { value: readinessText(r.before.readiness, lang), was: null, note: t("kpi.note.readiness", null, lang) });
  return out;
}

/** Fills the tiles from the run: before the decision, or after it with the old values struck through. */
export function renderKpis(run, { estimate = null, live = false } = {}) {
  const v = kpiValues(run, { estimate, live });
  for (const k of ["stake", "pressure", "readiness", "cost"]) put(tiles[k], v[k]);
}
