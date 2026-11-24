// The report (brief §9 and §9.1, PLAN.md section 9). Code builds it from the run's state; no model writes its
// layout. It is Vici's report (vici/: .vc-report, components/report.html): a cover and pages that read as
// light sheets in the Summary step, print alone through Vici.report.print() with the footer on every page,
// and leave as an HTML file of their own through Vici.report.html(). Its words follow the run's language: a
// live run's whatever the page shows, a simulation's the page's (brief §5.11). A run stopped early gets a
// report of what was done, which says so on every page (brief §5.5, AC-09).
//
// Pages: the cover; the management summary with the four key figures before and after; the six dimensions
// around the company; the factors, dimension by dimension; what the challenge corrected; the risk matrix and
// the horizon strip with their tables; the responses; the watch list; method and assumptions with the
// decision log and the sources; about this report with the byline.

import { h } from "./dom.js";
import { t, tn, inLang } from "./i18n/index.js";
import { DIMENSIONS } from "./engine.js";
import * as R from "./run.js";
import { ring, uncheckedTag } from "./hexagon.js";
import { riskMatrix, horizonStrip } from "./matrix.js";
import { kpiValues } from "./kpis.js";
import { renderFacts } from "./facts.js";
import { dimName, ratingLine, issueType, correctionWords, kindName, effortName, confidenceName, sectorName, kpiEffect } from "./plain.js";
import { money, moneyRange, fmtDate, fmtCost, fmtInt } from "./format.js";
import { stopWords } from "./views/live_work.js";
import { APP, FX_USD_EUR, IDEATOR_URL, modelById } from "./config.js";

const PROFILE = Object.freeze({
  name: "Victor Pflüger",
  linkedin: "https://www.linkedin.com/in/victorpflueger",
  website: "https://victorpflueger.github.io/VIP/index.html",
});
const AGENTS = ["scout", "scanner", "red_team", "analyst", "strategist", "writer"];

const icon = (name) => h("span", { class: `vc-icon vc-icon--${name}`, "aria-hidden": "true" });
const aiTag = (text) => h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, icon("sparkle"), text);
const link = (url, text) => h("a", { href: url }, text);

/** The language a run's report speaks: a live run's own, else the page's. */
export function reportLang(run, pageLang) {
  return run.mode === "live" && (run.lang === "en" || run.lang === "de") ? run.lang : pageLang;
}

/** How far the run came: 5 decided with a summary, 4 responses, 3 assessed, 2 challenged, 1 scanned. */
export function reportStep(run) {
  if (run.decided && run.responses) return 5;
  if (run.responses) return 4;
  if (run.impacts) return 3;
  if (run.issues) return 2;
  return run.scan ? 1 : 0;
}

/** Whether the run has a report yet: anything an agent did. */
export const hasReport = (run) => !!run && !run.draft && reportStep(run) >= 1;

/** The notice above every page of a stopped run's report, in the report's language. */
function stopNotice(run) {
  if (!run.stopped) return null;
  const s = run.stopped;
  if (s.reason === "cap" && s.after && s.after !== "start") return t("report.notice.cap", { step: t(`step.${s.after}`) });
  return t("report.notice", { why: stopWords(run).title });
}

/**
 * The report of a run as a Vici report element. opts: lang (the report's language), today (YYYY-MM-DD,
 * the report's date), estimate (a simulation's session-cost estimate), id (the element's id, its children's
 * ids start with it) and level (the title's heading level: 2 inside the Summary step, whose title is the h1).
 */
export function reportDocument(run, { lang = "en", today, estimate = null, id = "report", level = 2 } = {}) {
  return inLang(lang, () => build(run, { lang, today, estimate, id, level }));
}

function build(run, o) {
  const { lang, id } = o;
  const H = (n, attrs, ...kids) => h(`h${Math.min(6, o.level + n)}`, attrs, ...kids);
  const live = run.mode === "live";
  const step = reportStep(run);
  const values = R.runFacts(run, lang);
  const fill = (s) => renderFacts(String(s ?? ""), values).replace(/\{\{fact:[^}]+\}\}/g, t("fig.none"));
  const factors = step >= 3 ? R.assessedFactors(run) : step >= 2 ? R.challengedFactors(run) : R.scannedFactors(run);
  const byId = new Map(factors.map((f) => [f.id, f]));
  const scanned = new Map(R.scannedFactors(run).map((f) => [f.id, f]));
  const notice = stopNotice(run);
  const page = (key, kids, extra = {}) => h("section", { class: ["vc-report__page", extra.class], "aria-labelledby": `${id}-${key}`, dataset: { page: key } },
    H(1, { id: `${id}-${key}` }, t(`report.${key}`)), kids);

  const pages = [
    cover(run, o, { H, live, notice, fill }),
    summaryPage(run, o, { page, H, live, step, fill, byId }),
    step >= 1 ? dimensionsPage(run, o, { page, step }) : null,
    step >= 1 ? factorsPage(run, o, { page, H, step, factors }) : null,
    step >= 2 ? correctionsPage(run, o, { page, scanned }) : null,
    step >= 3 ? riskPage(run, o, { page }) : null,
    step >= 4 ? responsesPage(run, o, { page, H, byId }) : null,
    step >= 4 ? watchPage(run, o, { page, byId }) : null,
    methodPage(run, o, { page, H, live, step, byId }),
    aboutPage(run, o, { page }),
  ].filter(Boolean);

  return h("article", {
    class: "vc-report report",
    id,
    lang: lang === "de" ? "de" : "en-GB",
    "data-theme": "light",
    "data-vc-footer-start": `${t("report.footer.created")}\n${APP.url}`,
    "data-vc-footer-end": t("report.footer.end"),
    "data-vc-footer-of": t("report.footer.of"),
    "data-vc-notice": notice || undefined,
    dataset: { lang, mode: run.mode },
  },
  pages,
  // Firefox and Safari have no margin boxes: this line repeats at the foot of the page there instead.
  h("footer", { class: "vc-report__footer" },
    h("span", {}, `${t("report.footer.created")} · ${APP.url}`),
    h("span", {}, `${notice ? `${notice} · ` : ""}${t("report.footer.built")}`)));
}

// ---- the cover ---------------------------------------------------------------------------------------
function cover(run, o, { H, live, notice, fill }) {
  const { lang, id } = o;
  const model = live ? modelById(run.setting?.model)?.label || run.setting?.model : null;
  const rows = [
    ["report.meta.date", fmtDate(o.today)],
    ["report.meta.mode", t(live ? "report.mode.live" : "report.mode.sim")],
    ["report.meta.model", live ? t("report.model.live", { model, setting: t(`dlg.${run.setting?.preset || "balanced"}`), effort: t(`dlg.effort.${run.setting?.effort || "medium"}`).toLowerCase() }) : t("report.model.sim")],
    ["report.meta.research", run.research ? tn("report.research.on", (run.signals || []).length) : t("report.research.off")],
    ["report.meta.sector", sectorName(run.company.sector || "general")],
    ["report.meta.country", run.company.country || t("report.none")],
    live ? null : ["report.meta.facts", fmtDate(run.as_of)],
    ["report.meta.language", t(`lang.name.${lang}`)],
  ].filter(Boolean);
  return h("section", { class: "vc-report__page vc-report__cover report-cover", "aria-labelledby": `${id}-title`, dataset: { page: "cover" } },
    h("p", { class: "vc-report__brand" }, h("span", { class: "vc-cell vc-cell--sm vc-cell--lilac", "aria-hidden": "true" }, icon("radar")), APP.name),
    h("div", { class: "vc-report__heading" },
      H(0, { class: "vc-report__title", id: `${id}-title` }, t("report.title", { company: run.company.name })),
      run.summary?.headline ? h("p", { class: "vc-report__subtitle" }, fill(run.summary.headline)) : null,
      h("p", { class: "report-tags" },
        aiTag(t("report.ai")),
        live ? null : h("span", { class: "vc-tag vc-tag--sm report-fictional" }, icon("info"), t("start.fictional")))),
    h("dl", { class: "vc-report__meta" }, rows.map(([k, v]) => [h("dt", {}, t(k)), h("dd", {}, v)])),
    notice ? h("p", { class: "report-stopped", role: "note" }, icon("warning"), h("span", {}, notice)) : null,
    h("p", { class: "report-public" }, t("live.public")));
}

// ---- the management summary -----------------------------------------------------------------------------
function summaryPage(run, o, { page, H, live, step, fill, byId }) {
  const { lang } = o;
  const s = run.summary;
  const k = kpiValues(run, { estimate: o.estimate, live, lang });
  const both = (v) => `${v.value}${v.tail ? ` ${v.tail}` : ""}`;
  const before = (v) => (v.state === "waiting" ? t("report.notReached") : v.was ?? both(v));
  const after = (v) => (v.state === "waiting" ? t("report.notReached") : run.decided ? both(v) : t("report.notDecided"));
  const row = (key, v) => h("tr", { dataset: { kpi: key } },
    h("th", { scope: "row" }, t(`kpi.${key === "stake" ? "atStake" : key}`)),
    h("td", { class: "vc-num" }, before(v)),
    h("td", { class: "vc-num" }, after(v)));
  const r = step >= 3 ? R.figures(run) : null;
  const notes = [t("report.note.readiness"), run.decided && r?.upside > 0 ? t("report.upside", { money: money(r.upside, lang) }) : null].filter(Boolean);
  const responses = new Map((run.responses || []).map((x) => [x.id, x]));
  const chosen = run.decided ? R.engineDecisions(run).filter((d) => d.kind !== "accept").map((d) => ({ d, r: responses.get(d.response), f: byId.get(d.factor) })).filter((x) => x.r && x.f) : [];
  return page("summary", [
    s ? h("p", { class: "report-headline" }, fill(s.headline)) : null,
    h("table", { class: "vc-table report-figures" },
      h("caption", {}, t("report.figures.caption")),
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("report.col.figure")), h("th", { scope: "col", class: "vc-num" }, t("report.col.before")), h("th", { scope: "col", class: "vc-num" }, t("report.col.after")))),
      h("tbody", {},
        row("stake", k.stake), row("pressure", k.pressure), row("readiness", k.readiness),
        h("tr", { dataset: { kpi: "cost" } }, h("th", { scope: "row" }, t("kpi.cost")), h("td", { class: "vc-num", colspan: "2" }, `${k.cost.value} (${k.cost.note})`)))),
    h("p", { class: "report-note" }, notes.join(" ")),
    s ? [
      h("p", { class: "report-ai-note" }, aiTag(t("item.ai")), " ", t("report.writer")),
      run.unchecked?.has("summary") ? h("p", { class: "summary-unchecked" }, uncheckedTag(), " ", t("item.unchecked.why")) : null,
      (run.undone?.size ?? 0) > 0 ? h("p", { class: "report-note" }, t(live ? "summary.changed.live" : "summary.changed")) : null,
      h("p", { class: "ai-text" }, fill(s.situation)),
      H(2, {}, t("summary.findings")),
      h("ol", { class: "ai-text" }, s.findings.map((x) => h("li", {}, fill(x)))),
      H(2, {}, t("summary.recommendation")),
      h("p", { class: "ai-text" }, fill(s.recommendation)),
    ] : h("p", { class: "report-note" }, t(step >= 4 && !run.decided ? "report.noDecision" : "report.noSummary")),
    run.decided ? [H(2, {}, t("report.nextSteps")), nextSteps(chosen)] : null,
    s ? [H(2, {}, t("summary.assumptions")), h("ul", { class: "ai-text" }, s.assumptions.map((x) => h("li", {}, fill(x))))] : null,
  ]);
}

/** The responses chosen with their next steps: the response and its force, the first step, its owner and when it works. */
function nextSteps(chosen) {
  if (!chosen.length) return h("p", {}, t("report.noSteps"));
  return h("table", { class: "vc-table vc-table--compact report-steps" },
    h("thead", {}, h("tr", {}, ["report.col.response", "report.col.step", "report.col.owner", "report.col.when"].map((key) => h("th", { scope: "col" }, t(key))))),
    h("tbody", {}, chosen.map(({ r, f }) => h("tr", { dataset: { response: r.id } },
      h("th", { scope: "row" }, h("span", { class: "report-step-title" }, r.title), h("span", { class: "report-step-force" }, `${kindName(r.kind)} · ${dimName(f.dimension)}: ${f.text}`)),
      h("td", {}, r.first_step), h("td", {}, r.owner), h("td", {}, t(`report.time.${r.time_to_impact}`))))));
}

// ---- the six dimensions ------------------------------------------------------------------------------
function dimensionsPage(run, o, { page, step }) {
  const before = R.dimensionStates(run, Math.min(step, 4));
  const after = R.dimensionStates(run, step);
  const word = (s) => (s.status ? t(`state.${s.status}`) : t("report.state.clear"));
  return page("dims", [
    h("p", { class: "report-lead" }, t(run.decided ? "report.dims.lead" : "report.dims.lead.before")),
    ring(run, step, { onSelect: null, titleId: `${o.id}-ring-title` }),
    h("table", { class: "vc-table vc-table--compact report-dims" },
      h("caption", {}, t("report.dims.caption")),
      h("thead", {}, h("tr", {}, ["report.col.dim", "report.col.factors", "report.col.threats", run.decided ? "report.col.before" : null, run.decided ? "report.col.after" : "report.col.state"].filter(Boolean).map((key, i) => h("th", { scope: "col", class: i === 1 || i === 2 ? "vc-num" : null }, t(key))))),
      h("tbody", {}, DIMENSIONS.map((d) => h("tr", {},
        h("th", { scope: "row" }, dimName(d)),
        h("td", { class: "vc-num" }, String(after[d].count)),
        h("td", { class: "vc-num" }, String(after[d].threats)),
        run.decided ? h("td", {}, word(before[d])) : null,
        h("td", {}, word(after[d])))))),
  ]);
}

// ---- the factors ---------------------------------------------------------------------------------------
function factorsPage(run, o, { page, H, step, factors }) {
  const facts = step >= 3 ? R.figures(run, { decided: false }).before.perFactor : {};
  return page("factors", [
    h("p", { class: "report-lead" }, t("report.factors.lead")),
    DIMENSIONS.map((d) => {
      const list = factors.filter((f) => f.dimension === d);
      return [
        H(2, {}, dimName(d)),
        list.length ? h("ul", { class: "report-factors" }, list.map((f) => factorEntry(run, f, facts[f.id], o))) : h("p", { class: "report-note" }, t("dim.empty")),
      ];
    }),
  ]);
}

function factorEntry(run, f, fig, o) {
  const ai = f.origin !== "team";
  const est = f.impact_estimate;
  const money1 = (() => {
    if (!est) return null;
    if (f.direction === "opportunity") return est.upside ? t("report.f.upside", { range: moneyRange(est.upside.eur_year_low, est.upside.eur_year_high), n: est.upside.likelihood }) : null;
    if (est.not_monetisable) return t("est.none", { reason: est.not_monetisable });
    return t("report.f.range", { range: moneyRange(f.eur_year_low, f.eur_year_high), expected: fig?.expected !== null && fig?.expected !== undefined ? money(fig.expected) : t("fig.none") });
  })();
  const sources = [
    ...(f.evidence || []).filter((e) => e.url).map((e) => ({ url: e.url, title: e.title, date: e.read_on ? t("src.read", { date: fmtDate(e.read_on) }) : null })),
    ...(run.checked?.[f.id] || []).map((s) => ({ url: s.url, title: `${s.publisher}: ${s.title}`, date: t("src.checked", { date: fmtDate(s.read_on) }) })),
  ];
  return h("li", { class: "report-factor", dataset: { id: f.id, source: ai ? "ai" : "team" } },
    h("p", { class: "report-factor-text" },
      ai ? [aiTag(t(f.origin === "challenge" ? "item.added" : "item.ai")), " "] : null,
      h("strong", {}, f.text),
      f.outdated ? [" ", h("span", { class: "vc-tag vc-tag--sm" }, icon("minus"), t("item.outdated"))] : null,
      run.unchecked?.has(f.id) ? [" ", uncheckedTag()] : null),
    h("p", { class: "report-factor-facts" }, ratingLine(f), f.readiness && f.direction === "threat" ? ` (${t(`report.ready.${f.readiness}`)})` : ""),
    f.outdated && f.outdated_reason ? h("p", {}, h("span", { class: "item-label" }, t("item.outdatedWhy")), " ", f.outdated_reason) : null,
    money1 ? h("p", { class: "report-factor-money" }, est ? [aiTag(t("item.aiEstimate")), " "] : null, run.unchecked?.has(`impact:${f.id}`) ? [uncheckedTag(), " "] : null, money1) : null,
    est?.kpis?.length ? h("p", { class: "report-factor-kpis ai-text" }, est.kpis.map((k) => kpiEffect(k)).join("; ")) : null,
    est?.basis ? h("p", { class: "report-factor-basis ai-text" }, h("span", { class: "item-label" }, t("report.f.estimateBasis")), " ", est.basis, est.confidence ? ` ${t("item.confidence", { c: confidenceName(est.confidence) })}` : "") : null,
    f.basis ? h("p", { class: "report-factor-basis ai-text" }, h("span", { class: "item-label" }, t("item.basis")), " ", f.basis, f.confidence ? ` ${t("item.confidence", { c: confidenceName(f.confidence) })}` : "") : null,
    sources.length ? h("p", { class: "report-factor-sources" }, h("span", { class: "item-label" }, t("report.sources.label")), " ",
      sources.map((s, i) => [i ? "; " : "", link(s.url, s.title), s.date ? ` (${s.date})` : ""])) : null);
}

// ---- the challenge's corrections ----------------------------------------------------------------------------
function correctionsPage(run, o, { page, scanned }) {
  const issues = run.issues || [];
  const signals = new Map((run.signals || []).map((s) => [s.url, s]));
  return page("corrections", [
    h("p", { class: "report-lead" }, tn("report.corrections.lead", issues.length)),
    issues.length ? h("ol", { class: "report-issues" }, issues.map((i) => {
      const undone = run.undone?.has(i.id);
      const target = i.correction.factor ? scanned.get(i.correction.factor) : null;
      const evidence = (i.evidence || []).map((u) => signals.get(u)).filter(Boolean);
      return h("li", { class: "report-issue", dataset: { id: i.id, undone: undone ? "true" : "false" } },
        h("p", {}, h("span", { class: "vc-tag vc-tag--sm" }, issueType(i.type)), " ", h("strong", {}, i.title), undone ? [" ", h("span", { class: "vc-tag vc-tag--sm report-undone" }, icon("refresh"), t("report.undone"))] : null, run.unchecked?.has(i.id) ? [" ", uncheckedTag()] : null),
        h("p", { class: "ai-text" }, h("span", { class: "item-label" }, t("report.reason")), " ", i.reason, ` ${t("issue.confidence", { c: confidenceName(i.confidence) })}`),
        h("p", {}, h("span", { class: "item-label" }, t(undone ? "issue.undone" : "issue.fix")), " ", target && i.correction.kind !== "add_factor" ? `${target.text}: ` : "", correctionWords(i, scanned)),
        evidence.length ? h("p", { class: "report-factor-sources" }, h("span", { class: "item-label" }, t("issue.evidence")), " ",
          evidence.map((s, n) => [n ? "; " : "", link(s.url, s.title), s.read_on ? ` (${t("src.read", { date: fmtDate(s.read_on) })})` : ""])) : null);
    })) : h("p", {}, t("report.noIssues")),
  ]);
}

// ---- risk and timing ------------------------------------------------------------------------------------
function riskPage(run, o, { page }) {
  return page("risk", [
    h("p", { class: "report-lead" }, t("report.risk.lead")),
    riskMatrix(run, { table: "open", idPrefix: `${o.id}-` }),
    horizonStrip(run, { table: "open", idPrefix: `${o.id}-` }),
  ], { class: "report-risk" });
}

// ---- the responses ------------------------------------------------------------------------------------
function responsesPage(run, o, { page, H, byId }) {
  const decisions = R.engineDecisions(run);
  const chosenIds = new Set(run.decided ? decisions.map((d) => d.response).filter(Boolean) : []);
  const recommended = R.recommendedChoices(run);
  const all = run.responses || [];
  const chosen = all.filter((x) => chosenIds.has(x.id));
  const others = all.filter((x) => !chosenIds.has(x.id));
  const accepted = run.decided ? decisions.filter((d) => d.kind === "accept").map((d) => byId.get(d.factor)).filter(Boolean) : [];
  const effect = (x) => {
    const f = byId.get(x.factor);
    if (x.kind === "mitigate" && x.mitigate) return t("report.r.mitigate", { a: f?.readiness ?? "?", b: x.mitigate.readiness, la: f?.likelihood ?? "?", lb: x.mitigate.residual_likelihood, range: moneyRange(x.mitigate.residual_eur_year_low, x.mitigate.residual_eur_year_high) });
    if (x.kind === "advantage" && x.advantage) return t("opt.upside", { range: moneyRange(x.advantage.eur_year_low, x.advantage.eur_year_high), n: x.advantage.likelihood });
    if (x.kind === "monitor" && x.monitor) return t("report.r.monitor", { signal: x.monitor.signal, trigger: x.monitor.trigger });
    return "";
  };
  return page("responses", [
    h("p", { class: "report-lead" }, t(run.decided ? "report.responses.lead" : "report.responses.lead.open")),
    run.decided ? [
      H(2, {}, t("report.chosen")),
      chosen.length ? h("ul", { class: "report-responses" }, chosen.map((x) => {
        const f = byId.get(x.factor);
        return h("li", { class: "report-response", dataset: { id: x.id, kind: x.kind } },
          h("p", {}, h("strong", {}, x.title), ` (${kindName(x.kind)})`, recommended.get(x.factor) === x.id ? ` · ${t("opt.recommended")}` : "", run.unchecked?.has(x.id) ? [" ", uncheckedTag()] : null),
          f ? h("p", { class: "report-factor-facts" }, `${dimName(f.dimension)}: ${f.text}`) : null,
          h("p", { class: "ai-text" }, effect(x)),
          h("p", {}, h("span", { class: "item-label" }, t("opt.firstStep")), " ", x.first_step, ` ${t("report.r.who", { owner: x.owner, effort: effortName(x.effort), when: t(`report.time.${x.time_to_impact}`) })}`));
      })) : h("p", {}, t("report.noChosen")),
      accepted.length ? h("p", {}, t("summary.accepted", { list: accepted.map((f) => f.text).join("; ") })) : null,
    ] : null,
    others.length ? [
      H(2, {}, t(run.decided ? "report.others" : "report.options")),
      h("ul", { class: "report-others" }, others.map((x) => h("li", { dataset: { id: x.id } }, `${byId.get(x.factor)?.text ?? ""}: ${x.title} (${kindName(x.kind)})`, run.unchecked?.has(x.id) ? [" ", uncheckedTag()] : null))),
    ] : null,
  ]);
}

// ---- the watch list ----------------------------------------------------------------------------------
function watchPage(run, o, { page, byId }) {
  const watch = run.decided ? R.watchList(run) : [];
  return page("watch", [
    h("p", { class: "report-lead" }, t(run.decided ? "report.watch.lead" : "report.watch.lead.open")),
    watch.length ? h("table", { class: "vc-table vc-table--compact report-watch" },
      h("thead", {}, h("tr", {}, ["watch.factor", "watch.signal", "watch.trigger", "report.col.where", "watch.often"].map((key) => h("th", { scope: "col" }, t(key))))),
      h("tbody", {}, watch.map((w) => h("tr", { dataset: { factor: w.factor } },
        h("th", { scope: "row" }, byId.get(w.factor)?.text ?? ""),
        h("td", {}, w.signal), h("td", {}, w.trigger), h("td", {}, w.where), h("td", {}, w.how_often))))) : h("p", {}, t(run.decided ? "summary.noWatch" : "report.notDecided")),
  ]);
}

// ---- method, decision log and sources -------------------------------------------------------------------
function methodPage(run, o, { page, H, live, step, byId }) {
  const rules = ["risk", "bands", "gap", "score", "pressure", "stake", "after"];
  return page("method", [
    h("p", {}, t("method.lead")),
    H(2, {}, t("method.scales")),
    h("dl", { class: "report-scales" }, ["likelihood", "impact", "horizon", "readiness"].map((k) => [h("dt", {}, t(`method.${k}`)), h("dd", {}, t(`method.${k}.text`))])),
    H(2, {}, t("method.engine")),
    h("ul", {}, rules.map((k) => h("li", {}, t(`method.rule.${k}`)))),
    H(2, {}, t("method.money")),
    h("p", {}, t("method.money.text", { rate: String(FX_USD_EUR).replace(".", o.lang === "de" ? "," : ".") })),
    H(2, {}, t("method.not")),
    h("p", {}, t("method.not.text")),
    run.unchecked?.size ? h("p", { class: "summary-unchecked" }, uncheckedTag(), " ", t("item.unchecked.why")) : null,
    H(2, {}, t("report.run")),
    runFacts(run, o, live),
    live ? usedTable(run) : null,
    H(2, {}, t("report.log")),
    decisionLog(run, byId, step),
    H(2, {}, t("summary.sources")),
    run.research ? null : h("p", { class: "cutoff-note" }, icon("info"), h("span", {}, t(live ? "scan.cutoff.live" : "scan.cutoff"))),
    sourceList(run),
  ], { class: "report-method" });
}

function runFacts(run, o, live) {
  const k = kpiValues(run, { estimate: o.estimate, live, lang: o.lang });
  const rows = [
    [t("report.meta.mode"), t(live ? "report.mode.live" : "report.mode.sim")],
    live ? [t("report.meta.model"), t("report.model.live", { model: modelById(run.setting?.model)?.label || run.setting?.model, setting: t(`dlg.${run.setting?.preset || "balanced"}`), effort: t(`dlg.effort.${run.setting?.effort || "medium"}`).toLowerCase() })] : null,
    [t("kpi.cost"), `${k.cost.value} (${k.cost.note})`],
    live ? [t("report.requests"), String(run.requests ?? 0)] : null,
    [t("report.meta.research"), run.research ? tn("report.research.on", (run.signals || []).length) : t("report.research.off")],
  ].filter(Boolean);
  return h("dl", { class: "report-scales" }, rows.map(([a, b]) => [h("dt", {}, a), h("dd", {}, b)]));
}

/** What a live run used, agent by agent, as the meter priced each response. */
function usedTable(run) {
  const rows = AGENTS.map((a) => {
    const list = (run.log || []).filter((x) => x.agent === a);
    if (!list.length) return null;
    const sum = (key) => list.reduce((n, x) => n + (x[key] || 0), 0);
    return { a, requests: list.length, repairs: list.filter((x) => x.repair).length, input: sum("input_tokens"), output: sum("output_tokens"), searches: sum("searches"), ms: sum("ms"), eur: sum("usd") * FX_USD_EUR };
  }).filter(Boolean);
  if (!rows.length) return null;
  const cols = ["used.agent", "used.requests", "used.in", "used.out", "used.searches", "used.time", "used.cost"];
  return h("table", { class: "vc-table vc-table--compact report-used" },
    h("caption", {}, t("summary.used", { cost: fmtCost(run.spend.eur), n: run.requests })),
    h("thead", {}, h("tr", {}, cols.map((key, i) => h("th", { scope: "col", class: i ? "vc-num" : null }, t(key))))),
    h("tbody", {}, rows.map((r) => h("tr", {},
      h("th", { scope: "row" }, t(`agent.${r.a}`)),
      h("td", { class: "vc-num" }, r.repairs ? tn("used.withRepair", r.repairs, { r: r.requests }) : String(r.requests)),
      h("td", { class: "vc-num" }, fmtInt(r.input)),
      h("td", { class: "vc-num" }, fmtInt(r.output)),
      h("td", { class: "vc-num" }, String(r.searches)),
      h("td", { class: "vc-num" }, t("used.seconds", { s: fmtInt(r.ms / 1000) })),
      h("td", { class: "vc-num" }, fmtCost(r.eur))))));
}

/**
 * What the person decided, from the run's state (PLAN.md section 9): the factors the agents added and the
 * person kept, edited or removed, the corrections undone, and the response chosen for each factor.
 */
function decisionLog(run, byId, step) {
  const items = [];
  const added = (run.scan?.factors || []);
  if (added.length) items.push(t("log.kept", { n: added.filter((f) => !run.removed?.has(f.id)).length, total: added.length }));
  for (const [fid, e] of run.edits || []) items.push(t("log.edited", { text: e.text ?? added.find((f) => f.id === fid)?.text ?? "" }));
  for (const fid of run.removed || []) items.push(t("log.removed", { text: added.find((f) => f.id === fid)?.text ?? "" }));
  for (const i of run.issues || []) if (run.undone?.has(i.id)) items.push(t("log.undid", { title: i.title }));
  if (step >= 4 && run.decided) {
    const recommended = R.recommendedChoices(run);
    const responses = new Map((run.responses || []).map((r) => [r.id, r]));
    for (const d of R.engineDecisions(run)) {
      const f = byId.get(d.factor);
      const r = d.response ? responses.get(d.response) : null;
      const choice = r ? `${r.title} (${kindName(r.kind)})` : kindName("accept");
      const rec = (recommended.get(d.factor) ?? "accept") === (d.response ?? "accept");
      items.push(t(rec ? "log.chose.rec" : "log.chose", { factor: f?.text ?? "", choice }));
    }
    items.push(t("log.adopted"));
  } else if (step >= 4) items.push(t("report.notDecided"));
  return items.length ? h("ul", { class: "report-log" }, items.map((x) => h("li", {}, x))) : h("p", {}, t("log.none"));
}

/** Every source of the run once: the signals, then the facts the scenario's author checked. */
function sourceList(run) {
  const seen = new Set();
  const items = [];
  for (const s of run.signals || []) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    items.push(h("li", {}, link(s.url, s.title), ` (${[s.published ? t("src.published", { date: fmtDate(s.published) }) : null, t("src.read", { date: fmtDate(s.read_on) })].filter(Boolean).join(", ")})`));
  }
  for (const list of Object.values(run.checked || {})) {
    for (const s of list) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      items.push(h("li", {}, link(s.url, `${s.publisher}: ${s.title}`), ` (${t("src.checked", { date: fmtDate(s.read_on) })})`));
    }
  }
  return items.length ? h("ul", { class: "report-sources" }, items) : h("p", {}, t("report.noSources"));
}

// ---- about this report ------------------------------------------------------------------------------------
function aboutPage(run, o, { page }) {
  return page("about", [
    h("p", {}, t("report.disclaimer")),
    h("p", {}, t("live.public")),
    h("p", {}, t("report.created", { name: APP.name, version: APP.version }), " ", link(APP.url, APP.url.replace(/^https:\/\//, "").replace(/\/$/, ""))),
    h("p", {}, t("report.ideator"), " ", link(IDEATOR_URL, IDEATOR_URL.replace(/^https:\/\//, "").replace(/\/$/, ""))),
    h("p", { class: "vc-byline" },
      h("span", { class: "vc-byline__label" }, t("byline.label")), " ",
      h("a", { class: "vc-byline__person", href: PROFILE.linkedin, rel: "author" },
        h("span", { class: "vc-avatar vc-avatar--xs" }, h("img", { src: "vici/assets/brand/portrait-96.jpg", alt: "", width: "96", height: "96" })),
        h("span", { class: "vc-byline__name" }, PROFILE.name),
        h("img", { class: "vc-platform-mark", src: "vici/assets/marks/linkedin.png", alt: "", width: "840", height: "779" }),
        h("span", { class: "vc-visually-hidden" }, t("report.onLinkedin"))),
      " ",
      h("a", { class: "vc-byline__icon", href: PROFILE.website, rel: "author", "aria-label": t("report.site") }, icon("globe-hex"))),
  ], { class: "report-about" });
}
