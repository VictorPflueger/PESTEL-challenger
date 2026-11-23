// Assess as one picture (PLAN section 8): Vici's risk matrix with one numbered hexagon per threat, likelihood
// across and impact up, and under it the horizon strip with the same numbers in the lane of when each
// threat arrives. Both offer their numbers as a table one click away. A threat is numbered by what it puts
// at stake, the largest first, so "1" is the one to talk about.

import { h } from "./dom.js";
import { t, getLang } from "./i18n/index.js";
import { band as bandOf, riskScore } from "./risk.js";
import * as R from "./run.js";
import { bandName, horizonName, horizonSpan, dimName } from "./plain.js";
import { money, moneyRange } from "./format.js";

const HORIZONS = ["now", "1_3_years", "later"];

/** The threats that count, numbered by what they put at stake, with their figures before the decision. */
export function numberedThreats(run) {
  const result = R.figures(run, { decided: false });
  const threats = R.assessedFactors(run).filter((f) => f.direction === "threat" && !f.outdated);
  return threats
    .map((f) => ({ f, fig: result.before.perFactor[f.id] }))
    .sort((a, b) => (b.fig.expected ?? -1) - (a.fig.expected ?? -1) || b.fig.risk - a.fig.risk)
    .map((x, i) => ({ ...x, n: i + 1 }));
}

/** A marker's size by its expected euros (Vici's vc-risk__marker--sm and --lg): thirds of the largest. */
function sizeOf(expected, largest) {
  if (expected === null || !largest) return "";
  if (expected >= (2 * largest) / 3) return "lg";
  if (expected < largest / 3) return "sm";
  return "";
}

function marker(x, largest, { residual = false, horizon = true } = {}) {
  const size = residual ? "" : sizeOf(x.fig.expected, largest);
  const words = residual
    ? t("matrix.residual", { n: x.n, text: x.f.text })
    : t("matrix.marker", { n: x.n, text: x.f.text, band: bandName(x.fig.band), horizon: horizonName(x.f.horizon) });
  return h("span", {
    class: ["vc-risk__marker", size ? `vc-risk__marker--${size}` : "", residual ? "vc-risk__marker--residual" : ""],
    role: "img",
    "aria-label": horizon ? words : words,
    title: words,
    "data-impact": String(residual ? x.residual.impact : x.f.impact),
    "data-likelihood": String(residual ? x.residual.likelihood : x.f.likelihood),
  }, String(x.n));
}

/** The risk matrix of the threats, with the hollow marker of what is left after a mitigation once decided. */
export function riskMatrix(run) {
  const lang = getLang();
  const list = numberedThreats(run);
  const largest = Math.max(0, ...list.map((x) => x.fig.expected ?? 0));
  const residuals = [];
  if (run.decided) {
    for (const d of R.engineDecisions(run)) {
      if (d.kind !== "mitigate") continue;
      const x = list.find((y) => y.f.id === d.factor);
      if (x) residuals.push({ ...x, residual: { impact: x.f.impact, likelihood: d.residual.likelihood } });
    }
  }
  const rows = [];
  for (let impact = 5; impact >= 1; impact--) {
    rows.push(h("span", { class: "vc-risk__tick" }, String(impact)));
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const here = list.filter((x) => x.f.impact === impact && x.f.likelihood === likelihood);
      const left = residuals.filter((x) => x.residual.impact === impact && x.residual.likelihood === likelihood);
      rows.push(h("div", { class: "vc-risk__cell", "data-impact": String(impact), "data-likelihood": String(likelihood), "data-band": bandOf(impact, likelihood) },
        h("span", { class: "vc-risk__score" }, String(riskScore(impact, likelihood))),
        here.map((x) => marker(x, largest)),
        left.map((x) => marker(x, largest, { residual: true }))));
    }
  }
  rows.push(h("span", { class: "vc-risk__tick", "aria-hidden": "true" }));
  for (let l = 1; l <= 5; l++) rows.push(h("span", { class: "vc-risk__tick" }, String(l)));

  const sizes = list.some((x) => x.fig.expected !== null);
  const key = h("ul", { class: "vc-risk__key" },
    ["low", "medium", "high", "critical"].map((b) => h("li", { "data-band": b }, t(`matrix.band.${b}`))),
    sizes ? [h("li", { "data-size": "sm" }, t("matrix.size.sm", { money: money(largest / 3, lang) })), h("li", { "data-size": "lg" }, t("matrix.size.lg", { money: money((2 * largest) / 3, lang) }))] : null,
    residuals.length ? h("li", { class: "key-residual" }, t("matrix.key.residual")) : null);

  const table = h("details", { class: "vc-risk__numbers" },
    h("summary", {}, t("matrix.numbers")),
    h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact" },
      h("thead", {}, h("tr", {}, ["matrix.col.threat", "matrix.col.dim", "matrix.col.likelihood", "matrix.col.impact", "matrix.col.score", "matrix.col.band", "matrix.col.horizon", "matrix.col.range", "matrix.col.expected"].map((k) => h("th", { scope: "col" }, t(k))))),
      h("tbody", {}, list.map((x) => h("tr", {},
        h("th", { scope: "row" }, `${x.n}. ${x.f.text}`),
        h("td", {}, dimName(x.f.dimension)),
        h("td", { class: "num" }, String(x.f.likelihood)),
        h("td", { class: "num" }, String(x.f.impact)),
        h("td", { class: "num" }, String(x.fig.risk)),
        h("td", {}, bandName(x.fig.band)),
        h("td", {}, horizonName(x.f.horizon)),
        h("td", { class: "num ai-figure" }, x.f.not_monetisable ? t("matrix.noRange") : moneyRange(x.f.eur_year_low, x.f.eur_year_high, lang)),
        h("td", { class: "num" }, x.fig.expected === null ? t("fig.none") : money(x.fig.expected, lang))))))));

  return h("figure", { class: "vc-risk matrix", "aria-labelledby": "matrix-title" },
    h("figcaption", {},
      h("p", { class: "vc-chart__title", id: "matrix-title" }, t("matrix.title", { n: list.length })),
      h("p", { class: "vc-chart__subtitle" }, t("matrix.subtitle"))),
    h("div", { class: "vc-risk__plot" },
      h("p", { class: "vc-risk__axis vc-risk__axis--impact" }, t("matrix.impact")),
      h("div", { class: "vc-risk__grid" }, rows),
      h("p", { class: "vc-risk__axis vc-risk__axis--likelihood" }, t("matrix.likelihood"))),
    key,
    table);
}

/** The horizon strip: the same numbered threats in the lane of when they arrive. */
export function horizonStrip(run) {
  const lang = getLang();
  const list = numberedThreats(run);
  const largest = Math.max(0, ...list.map((x) => x.fig.expected ?? 0));
  const lanes = HORIZONS.map((hz) => {
    const here = list.filter((x) => x.f.horizon === hz);
    return h("li", { class: "vc-horizon__lane", "data-horizon": hz },
      h("p", { class: "vc-horizon__label" }, t(`strip.lane.${hz}`), h("span", { class: "vc-horizon__span" }, horizonSpan(hz))),
      here.length
        ? h("ul", { class: "vc-horizon__markers" }, here.map((x) => h("li", {}, marker(x, largest))))
        : h("p", { class: "vc-horizon__empty" }, t("strip.none")));
  });
  const sizes = list.some((x) => x.fig.expected !== null);
  return h("figure", { class: "vc-horizon strip", "aria-labelledby": "strip-title" },
    h("figcaption", {}, h("p", { class: "vc-chart__title", id: "strip-title" }, t("strip.title"))),
    h("ol", { class: "vc-horizon__lanes" }, lanes),
    sizes ? h("ul", { class: "vc-risk__key strip-key vc-visually-hidden" },
      h("li", { "data-size": "sm" }, t("matrix.size.sm", { money: money(largest / 3, lang) })),
      h("li", { "data-size": "lg" }, t("matrix.size.lg", { money: money((2 * largest) / 3, lang) }))) : null,
    h("details", { class: "vc-risk__numbers" },
      h("summary", {}, t("strip.numbers")),
      h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact" },
        h("thead", {}, h("tr", {}, ["matrix.col.threat", "strip.col.when", "matrix.col.band", "matrix.col.expected"].map((k) => h("th", { scope: "col" }, t(k))))),
        h("tbody", {}, list.map((x) => h("tr", {},
          h("th", { scope: "row" }, `${x.n}. ${x.f.text}`),
          h("td", {}, horizonName(x.f.horizon)),
          h("td", {}, bandName(x.fig.band)),
          h("td", { class: "num" }, x.fig.expected === null ? t("fig.none") : money(x.fig.expected, lang)))))))));
}
