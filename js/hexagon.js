// The six dimensions around the company: Vici's ring (vc-ring), its cells as buttons that choose the
// dimension the list shows, and the list itself as a framework area with its items (vc-framework,
// vc-item). Every state carries a mark and a word: a dimension under pressure, on watch or addressed; a
// factor entered by the team, written by the AI, added by the challenge, challenged, out of date or
// addressed by a chosen response.

import { h } from "./dom.js";
import { t, tn, getLang } from "./i18n/index.js";
import { DIMENSIONS } from "./engine.js";
import * as R from "./run.js";
import { dimName, ratingLine, issueType, estimateWords, kpiEffect, confidenceName, kindName, sectorName } from "./plain.js";
import { money, fmtDate } from "./format.js";
import { sourceLink } from "./views/common.js";

const icon = (name) => h("span", { class: `vc-icon vc-icon--${name}`, "aria-hidden": "true" });
const STATE_ICON = { pressure: "warning", watch: "eye", addressed: "check" };

/**
 * The ring: the company in the centre, the six dimensions clockwise from the top in the order of PESTEL. Without
 * onSelect its cells are plain cells, as in the report, which names its ring with its own titleId.
 */
export function ring(run, step, { selected = null, onSelect = null, lang = getLang(), titleId = "ring-title" } = {}) {
  const states = R.dimensionStates(run, step);
  const statuses = new Set(Object.values(states).map((s) => s.status).filter(Boolean));
  const cell = (d) => {
    const s = states[d];
    const attrs = {
      type: "button",
      class: "vc-ring__cell",
      "data-status": s.status || undefined,
      "data-dim": d,
      "aria-pressed": onSelect ? String(d === selected) : undefined,
      on: onSelect ? { click: () => onSelect(d) } : undefined,
    };
    return h("li", {}, h(onSelect ? "button" : "div", attrs,
      h("span", { class: "vc-ring__name" }, dimName(d, lang)),
      h("span", { class: "vc-ring__note" }, tn("ring.factors", s.count, {}, lang)),
      s.status ? h("span", { class: "vc-ring__state" }, icon(STATE_ICON[s.status]), t(`state.${s.status}`, null, lang)) : null));
  };
  const legend = ["pressure", "watch", "addressed"].filter((s) => s !== "addressed" || statuses.has("addressed"));
  return h("figure", { class: "vc-ring ring", "aria-labelledby": titleId },
    h("ol", { class: "vc-ring__cells" },
      h("li", {}, h("p", { class: "vc-ring__centre" },
        h("span", { class: "vc-ring__name" }, run.company.name),
        h("span", { class: "vc-ring__note" }, sectorName(run.company.sector, lang)))),
      DIMENSIONS.map(cell)),
    h("figcaption", {},
      h("p", { class: "vc-visually-hidden", id: titleId }, t("ring.caption", { company: run.company.name }, lang)),
      step >= 1 ? h("ul", { class: "vc-framework__legend" },
        legend.map((s) => h("li", { "data-mark": s }, h("span", { class: "vc-item__mark", "aria-hidden": "true" }, icon(STATE_ICON[s])), t(`state.${s}`, null, lang)))) : null,
      onSelect ? h("p", { class: "ring-hint" }, t("ring.hint", null, lang)) : null));
}

/** How an item looks: its source (entered, ai, added) and its status (challenged, removed, addressed). */
function itemState(f, run, step) {
  const source = f.origin === "team" ? "entered" : f.origin === "challenge" ? "added" : "ai";
  let status = null;
  let statusWord = "";
  if (step >= 2 && f.outdated) { status = "removed"; statusWord = t("item.outdated"); }
  else if (step >= 2 && f.origin !== "challenge" && f.issues.length) {
    const issue = (run.issues || []).find((i) => i.id === f.issues[0]);
    status = "challenged";
    statusWord = issue ? issueType(issue.type) : t("item.challenged");
  }
  if (step >= 5 && run.decided && !f.outdated) {
    const d = R.engineDecisions(run).find((x) => x.factor === f.id);
    if (d && (d.kind === "mitigate" || d.kind === "advantage")) { status = "addressed"; statusWord = kindName(d.kind); }
  }
  return { source, status, statusWord };
}

const MARK = { ai: "sparkle", added: "plus", challenged: "warning", addressed: "check", removed: "minus" };

/** The sources a factor rests on: its signals, then the facts the scenario's author checked. */
function sources(f, run) {
  const items = [];
  for (const e of f.evidence || []) {
    items.push(h("li", {},
      sourceLink(e.url, e.title),
      h("span", { class: "src-date" }, [e.published ? t("src.published", { date: fmtDate(e.published) }) : null, e.read_on ? t("src.read", { date: fmtDate(e.read_on) }) : null].filter(Boolean).join(", "))));
  }
  for (const s of run.checked?.[f.id] || []) {
    items.push(h("li", { class: "src-checked" },
      sourceLink(s.url, `${s.publisher}: ${s.title}`),
      h("span", { class: "src-date" }, t("src.checked", { date: fmtDate(s.read_on) }))));
  }
  return items.length ? h("div", { class: "item-sources" }, h("p", { class: "item-label" }, t("item.sources")), h("ul", {}, items)) : null;
}

/**
 * The words that say a text was not checked: the fact audit refused its figures twice (brief §5.10), so it
 * shows, tagged, rather than silently.
 */
export const uncheckedTag = () => h("span", { class: "vc-tag vc-tag--sm vc-tag--warning unchecked", title: t("item.unchecked.why") }, icon("warning"), t("item.unchecked"));

/** One factor as a Vici framework item: closed, its text, ratings and state words; open, why and from where. */
export function factorItem(f, run, step, { number = null, dimLabel = false, edit = null } = {}) {
  const { source, status, statusWord } = itemState(f, run, step);
  const markIcon = MARK[status] || MARK[source];
  const words = [];
  if (source === "entered") words.push(h("span", { class: "vc-item__state vc-visually-hidden" }, t("item.entered")));
  else words.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state vc-item__state--source" }, t(source === "ai" ? "item.ai" : "item.added")));
  if (status) words.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state vc-item__state--status" }, statusWord));
  if (f.edited) words.push(h("span", { class: "vc-tag vc-tag--sm vc-item__state edited" }, t("item.edited")));
  if (run.unchecked?.has(f.id)) words.push(uncheckedTag());
  const facts = step >= 3 ? R.figures(run).before.perFactor[f.id] : null;
  const issues = (run.issues || []).filter((i) => f.issues.includes(i.id) && !run.undone?.has(i.id));
  const body = [
    f.was && step >= 2 ? h("p", {}, h("span", { class: "item-label" }, t("item.was")), " ", ratingLine({ ...f, ...f.was })) : null,
    ...issues.map((i) => h("p", {}, h("span", { class: "item-label" }, t("item.issue", { type: issueType(i.type) })), " ", i.reason)),
    f.outdated && f.outdated_reason ? h("p", {}, h("span", { class: "item-label" }, t("item.outdatedWhy")), " ", f.outdated_reason) : null,
    ...(f.links || []).map((l) => h("p", {}, h("span", { class: "item-label" }, t("item.link")), " ", l.effect)),
    f.basis ? h("p", { class: "ai-text" }, h("span", { class: "item-label" }, t("item.basis")), " ", f.basis, f.confidence ? ` ${t("item.confidence", { c: confidenceName(f.confidence) })}` : "") : null,
    f.origin === "team" && f.rated_by === "ai" ? h("p", {}, t("item.ratedByAi")) : f.origin === "team" ? h("p", {}, t("item.ratedByTeam")) : null,
    step >= 3 && f.impact_estimate ? h("div", { class: "item-estimate ai-text" },
      h("p", {}, h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, t("item.aiEstimate")), " ", run.unchecked?.has(`impact:${f.id}`) ? [uncheckedTag(), " "] : null, estimateWords(f)),
      facts && facts.expected !== null && f.direction === "threat" ? h("p", {}, t("item.expected", { money: money(facts.expected, getLang()) })) : null,
      f.impact_estimate.kpis.length ? h("ul", { class: "item-kpis" }, f.impact_estimate.kpis.map((k) => h("li", {}, kpiEffect(k), h("span", { class: "kpi-basis" }, ` (${k.basis})`)))) : null,
      h("p", { class: "item-basis" }, f.impact_estimate.basis)) : null,
    sources(f, run),
    edit ? editControls(f, edit) : null,
  ].filter(Boolean);
  return h("li", { dataset: { id: f.id } },
    h("details", { class: "vc-item", "data-source": source, "data-status": status || undefined, open: edit?.editing || undefined },
      h("summary", { class: "vc-item__summary" },
        h("span", { class: "vc-item__mark", "aria-hidden": "true" }, markIcon ? icon(markIcon) : null),
        h("span", { class: "vc-item__text", id: `ft-${f.id}` },
          dimLabel ? h("span", { class: "item-dim" }, dimName(f.dimension)) : null,
          number !== null ? h("span", { class: "item-number" }, `${number} `) : null,
          f.text,
          f.direction ? h("span", { class: "item-meta" }, ratingLine(f)) : null),
        h("span", { class: "vc-item__states" }, words)),
      body.length ? h("div", { class: "vc-item__body" }, body) : null));
}

const RATINGS = [1, 2, 3, 4, 5];

/**
 * Keep, edit or remove what the AI added, in a live run before the challenge (AC-18): the item's own
 * buttons, or, while it is edited, its words and ratings in place. edit: { editing, onEdit, onRemove,
 * onSave(values), onCancel }.
 */
function editControls(f, edit) {
  if (!edit.editing) {
    return h("p", { class: "item-edit-actions" },
      h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm item-edit", "aria-describedby": `ft-${f.id}`, on: { click: edit.onEdit } }, icon("edit"), t("edit.edit")),
      h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm item-remove", "aria-describedby": `ft-${f.id}`, on: { click: edit.onRemove } }, icon("trash"), t("edit.remove")));
  }
  const id = (k) => `edit-${f.id}-${k}`;
  const select = (k, options, value, disabled = false) => h("select", { class: "vc-select", id: id(k), disabled, dataset: { key: k } },
    options.map(([v, label]) => h("option", { value: String(v), selected: String(v) === String(value) }, label)));
  const text = h("input", { class: "vc-input", type: "text", id: id("text"), value: f.text, maxlength: "90", autocomplete: "off", dataset: { key: "text" } });
  const direction = select("direction", [["threat", t("dir.threat")], ["opportunity", t("dir.opportunity")]], f.direction);
  const readiness = select("readiness", RATINGS.map((n) => [n, String(n)]), f.readiness ?? 2, f.direction === "opportunity");
  direction.addEventListener("change", () => { readiness.disabled = direction.value === "opportunity"; });
  const box = h("div", { class: "item-editor", role: "group", "aria-label": t("edit.group", { text: f.text }) },
    h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("text") }, t("edit.text")), text),
    h("div", { class: "item-editor-row" },
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("direction") }, t("edit.direction")), direction),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("likelihood") }, t("method.likelihood")), select("likelihood", RATINGS.map((n) => [n, String(n)]), f.likelihood)),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("impact") }, t("method.impact")), select("impact", RATINGS.map((n) => [n, String(n)]), f.impact)),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("horizon") }, t("method.horizon")), select("horizon", ["now", "1_3_years", "later"].map((x) => [x, t(`h.${x}`)]), f.horizon)),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: id("readiness") }, t("method.readiness")), readiness)),
    h("p", { class: "vc-help vc-help--error item-editor-error", id: id("error"), hidden: true }),
    h("p", { class: "item-edit-actions" },
      h("button", { type: "button", class: "vc-button vc-button--sm item-save", on: { click: () => {
        const value = (k) => box.querySelector(`[data-key="${k}"]`).value;
        const words = value("text").replace(/\s+/g, " ").trim();
        const err = box.querySelector(".item-editor-error");
        if (!words) { err.textContent = t("edit.empty"); err.hidden = false; text.setAttribute("aria-invalid", "true"); text.setAttribute("aria-describedby", id("error")); text.focus(); return; }
        const dir = value("direction");
        edit.onSave({ text: words, direction: dir, likelihood: Number(value("likelihood")), impact: Number(value("impact")), horizon: value("horizon"), readiness: dir === "opportunity" ? null : Number(value("readiness")) });
      } } }, icon("check"), t("edit.save")),
      h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm item-cancel", on: { click: edit.onCancel } }, t("edit.cancel"))));
  return box;
}

/** The AI factors the person removed at Scan, each with Put back, under its dimension's list. */
function removedList(run, dimension, onPutBack) {
  const removed = (run.scan?.factors || []).filter((f) => f.dimension === dimension && run.removed?.has(f.id));
  if (!removed.length) return null;
  return h("div", { class: "removed" },
    h("p", { class: "item-label" }, t("edit.removed")),
    h("ul", { class: "removed-list" }, removed.map((f) => h("li", {},
      h("span", { class: "removed-text" }, run.edits?.get(f.id)?.text ?? f.text),
      h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm item-putback", on: { click: () => onPutBack(f.id) } }, icon("refresh"), t("edit.putBack"))))));
}

/**
 * The chosen dimension as a framework area: its question, its state and its factors. live: { editing,
 * handlers } while the person may keep, edit or remove what the AI added (a live run's Scan).
 */
export function dimensionPanel(run, step, dimension, live = null) {
  const states = R.dimensionStates(run, step);
  const s = states[dimension];
  const factors = R.factorsAt(run, step).filter((f) => f.dimension === dimension);
  const head = [
    h("h2", { class: "vc-framework__title", id: "dim-title" }, dimName(dimension)),
    h("p", { class: "vc-framework__question" }, t(`dim.${dimension}.q`)),
  ];
  if (s.status) head.push(h("p", { class: "vc-framework__states" },
    h("span", { class: "vc-tag vc-tag--sm vc-framework__state vc-framework__state--status" }, icon(STATE_ICON[s.status]), t(`state.${s.status}.long`))));
  return h("div", { class: "vc-framework vc-framework--1 dim-panel" },
    h("section", { class: "vc-framework__area", "data-status": s.status || undefined, "aria-labelledby": "dim-title" },
      h("header", { class: "vc-framework__head" }, head),
      factors.length
        ? h("ul", { class: "vc-framework__items" }, factors.map((f) => factorItem(f, run, step, { edit: live && f.origin === "scan" ? {
          editing: live.editing === f.id,
          onEdit: () => live.handlers.editFactor(f.id),
          onRemove: () => live.handlers.removeFactor(f.id),
          onSave: (values) => live.handlers.saveFactor(f.id, values),
          onCancel: () => live.handlers.editFactor(null),
        } : null })))
        : h("p", { class: "vc-framework__empty" }, t(step === 0 ? "dim.empty.team" : "dim.empty")),
      live ? removedList(run, dimension, live.handlers.putBackFactor) : null));
}

/** The legend of the item marks, once under a list. */
export function itemLegend(step) {
  const marks = [["entered", null, "item.legend.entered"], ["ai", "sparkle", "item.legend.ai"]];
  if (step >= 2) marks.push(["added", "plus", "item.legend.added"], ["challenged", "warning", "item.legend.challenged"], ["removed", "minus", "item.legend.removed"]);
  if (step >= 5) marks.push(["addressed", "check", "item.legend.addressed"]);
  return h("ul", { class: "vc-framework__legend item-legend" }, marks.map(([m, i, key]) =>
    h("li", { "data-mark": m }, h("span", { class: "vc-item__mark", "aria-hidden": "true" }, i ? icon(i) : null), t(key))));
}
