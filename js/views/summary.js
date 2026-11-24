// Summary: the Writer's management summary with the engine's figures in place of its placeholders, the
// responses the person chose with their first steps, the watch list code builds from the chosen monitor
// responses, the assumptions to check and the sources with their dates. The downloads arrive in 0.4.0.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { head, cta, yourTurn, icon, sourceLink } from "./common.js";
import { ring } from "../hexagon.js";
import { kindName, dimName, timeName } from "../plain.js";
import { renderFacts } from "../facts.js";
import * as R from "../run.js";
import { fmtDate, fmtCost, fmtInt } from "../format.js";
import { uncheckedTag } from "../hexagon.js";
import { FX_USD_EUR } from "../config.js";

const AGENTS = ["scout", "scanner", "red_team", "analyst", "strategist", "writer"];

/**
 * What a live run used, agent by agent: requests (repairs included), tokens in and out, searches, time and
 * cost, as the meter priced each response. The figures Victor's first live runs measure (PLAN.md G28).
 */
function usedTable(run) {
  const rows = AGENTS.map((a) => {
    const list = (run.log || []).filter((x) => x.agent === a);
    if (!list.length) return null;
    const sum = (k) => list.reduce((n, x) => n + (x[k] || 0), 0);
    return { a, requests: list.length, repairs: list.filter((x) => x.repair).length, input: sum("input_tokens"), output: sum("output_tokens"), searches: sum("searches"), ms: sum("ms"), eur: sum("usd") * FX_USD_EUR, max: Math.max(...list.map((x) => x.max_tokens)) };
  }).filter(Boolean);
  if (!rows.length) return null;
  const cols = ["used.agent", "used.requests", "used.in", "used.out", "used.searches", "used.time", "used.cost"];
  return h("details", { class: "used" },
    h("summary", {}, t("summary.used", { cost: fmtCost(run.spend.eur), n: run.requests })),
    h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact used-table" },
      h("thead", {}, h("tr", {}, cols.map((k, i) => h("th", { scope: "col", class: i ? "num" : null }, t(k))))),
      h("tbody", {}, rows.map((r) => h("tr", {},
        h("th", { scope: "row" }, t(`agent.${r.a}`)),
        h("td", { class: "num" }, r.repairs ? tn("used.withRepair", r.repairs, { r: r.requests }) : String(r.requests)),
        h("td", { class: "num" }, fmtInt(r.input)),
        h("td", { class: "num" }, fmtInt(r.output)),
        h("td", { class: "num" }, String(r.searches)),
        h("td", { class: "num" }, t("used.seconds", { s: fmtInt(r.ms / 1000) })),
        h("td", { class: "num" }, fmtCost(r.eur)))))),
      h("p", { class: "src-date" }, t("used.note", { model: run.setting.model, effort: run.setting.effort }))));
}

/** Every source of the run once: the signals, then the facts the scenario's author checked. */
function sourceList(run) {
  const seen = new Set();
  const items = [];
  for (const s of run.signals || []) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    items.push(h("li", {}, sourceLink(s.url, s.title), h("span", { class: "src-date" }, ` ${[s.published ? t("src.published", { date: fmtDate(s.published) }) : null, t("src.read", { date: fmtDate(s.read_on) })].filter(Boolean).join(", ")}`)));
  }
  for (const list of Object.values(run.checked || {})) {
    for (const s of list) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      items.push(h("li", { class: "src-checked" }, sourceLink(s.url, `${s.publisher}: ${s.title}`), h("span", { class: "src-date" }, ` ${t("src.checked", { date: fmtDate(s.read_on) })}`)));
    }
  }
  return h("ul", { class: "sources" }, items);
}

export function summaryView(ctx) {
  const { run, handlers } = ctx;
  const lang = ctx.lang;
  // A live run's summary is written in the language of its run, so its figures are rendered in that language too.
  const values = R.runFacts(run, run.mode === "live" ? run.lang : lang);
  const fill = (s) => renderFacts(s, values).replace(/\{\{fact:[^}]+\}\}/g, t("fig.none"));
  const s = run.summary;
  const responses = new Map((run.responses || []).map((r) => [r.id, r]));
  const factors = new Map(R.assessedFactors(run).map((f) => [f.id, f]));
  const chosen = R.engineDecisions(run).filter((d) => d.kind !== "accept" && d.kind !== "monitor").map((d) => ({ d, r: responses.get(d.response), f: factors.get(d.factor) }));
  const accepted = R.engineDecisions(run).filter((d) => d.kind === "accept").map((d) => factors.get(d.factor));
  const watch = R.watchList(run);
  const changed = (run.undone?.size ?? 0) > 0;
  const live = run.mode === "live";
  const panel = h("div", { class: "panel summary" },
    changed ? h("p", { class: "vc-alert vc-alert--warning summary-note", role: "note" }, icon("warning"), h("span", {}, t(live ? "summary.changed.live" : "summary.changed"))) : null,
    run.unchecked?.has("summary") ? h("p", { class: "summary-unchecked" }, uncheckedTag(), " ", t("item.unchecked.why")) : null,
    h("p", { class: "summary-situation ai-text" }, fill(s.situation)),
    h("h2", { class: "summary-h" }, t("summary.findings")),
    h("ol", { class: "summary-findings ai-text" }, s.findings.map((x) => h("li", {}, fill(x)))),
    h("h2", { class: "summary-h" }, t("summary.recommendation")),
    h("p", { class: "ai-text" }, fill(s.recommendation)),
    h("h2", { class: "summary-h" }, t("summary.responses")),
    chosen.length ? h("ul", { class: "summary-responses" }, chosen.map(({ r, f }) => h("li", {},
      h("p", {}, h("span", { class: "decide-dim" }, dimName(f.dimension)), " ", h("strong", {}, r.title), ` (${kindName(r.kind)})`),
      h("p", { class: "src-date" }, `${t("opt.firstStep")} ${r.first_step} ${r.owner}, ${timeName(r.time_to_impact)}.`)))) : h("p", {}, t("summary.noResponses")),
    accepted.length ? h("p", { class: "src-date" }, t("summary.accepted", { list: accepted.map((f) => f.text).join("; ") })) : null,
    h("h2", { class: "summary-h" }, t("summary.watch")),
    watch.length ? h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact watch-table" },
      h("thead", {}, h("tr", {}, ["watch.factor", "watch.signal", "watch.trigger", "watch.where", "watch.often"].map((k) => h("th", { scope: "col" }, t(k))))),
      h("tbody", {}, watch.map((w) => h("tr", {},
        h("th", { scope: "row" }, factors.get(w.factor)?.text ?? w.factor),
        h("td", {}, w.signal), h("td", {}, w.trigger), h("td", {}, w.where), h("td", {}, w.how_often)))))) : h("p", {}, t("summary.noWatch")),
    h("h2", { class: "summary-h" }, t("summary.assumptions")),
    h("ul", { class: "ai-text" }, s.assumptions.map((x) => h("li", {}, fill(x)))),
    h("h2", { class: "summary-h" }, t("summary.sources")),
    run.research ? null : h("p", { class: "cutoff-note" }, icon("info"), h("span", {}, t(run.mode === "live" ? "scan.cutoff.live" : "scan.cutoff"))),
    sourceList(run),
    live ? usedTable(run) : null,
    live ? h("div", { class: "live-save" },
      h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-save-run", on: { click: handlers.saveRun } }, icon("download"), t("summary.save")),
      h("p", { class: "vc-help" }, t("summary.save.note"))) : null);
  return {
    story: [
      head(fill(s.headline), t("summary.lead")),
      panel,
      yourTurn(t(live ? "summary.turn.live" : "summary.turn"), cta(t("summary.cta"), () => handlers.go(4), { attention: false })),
    ],
    side: ring(run, 5, { selected: ctx.ui.dim, onSelect: null }),
  };
}
