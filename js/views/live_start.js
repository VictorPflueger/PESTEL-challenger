// Start, live: the empty form "Run it live" opens (brief §5.3 and §5.10). The company, its sector or "let
// the agents decide", its country and one line on what it does; then the outside forces the person sees,
// one per line under each of the six headings. Every input stands under the notice "Public information
// only" and the line on where a live run sends it. A heading left empty says the Scanner fills it. The
// person's turn: hand the list to the agents, which opens the live-run dialog. Once a run has the list,
// the form shows it read-only; "Clear everything" starts again.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { head, cta, yourTurn, icon, withNotice } from "./common.js";
import { ring } from "../hexagon.js";
import { DIMENSIONS } from "../engine.js";
import { SECTORS } from "../../data/kpis.js";
import { dimName } from "../plain.js";
import { factorsFromLines } from "../session.js";

export const MAX_LINE = 90;
export const MAX_LINES = 6;
const MAX_NAME = 80;
const MAX_WHAT = 300;

/** What stops the form from starting: [{ field, key, vars }], the first one to fix first. */
export function formProblems(inputs) {
  const out = [];
  const c = inputs.company;
  if (!c.name.trim()) out.push({ field: "name", key: "live.err.name" });
  if (!c.country.trim()) out.push({ field: "country", key: "live.err.country" });
  if (!c.what.trim()) out.push({ field: "what", key: "live.err.what" });
  for (const d of DIMENSIONS) {
    const lines = factorsFromLines({ [d]: inputs.lines[d] });
    if (lines.length > MAX_LINES) out.push({ field: `lines.${d}`, key: "live.err.lines", vars: { n: lines.length } });
    const long = lines.findIndex((l) => [...l.text].length > MAX_LINE);
    if (long >= 0) out.push({ field: `lines.${d}`, key: "live.err.long", vars: { n: long + 1 } });
  }
  return out;
}

const fieldId = (field) => `live-${field.replace(".", "-")}`;

/** One labelled field with its help and its error, as Vici's forms lay them out. */
function field(name, label, control, { help = null, error = null } = {}) {
  const id = fieldId(name);
  const helpId = help ? `${id}-help` : null;
  const errId = `${id}-error`;
  control.id = id;
  control.dataset.field = name;
  const described = [helpId, error ? errId : null].filter(Boolean).join(" ");
  if (described) control.setAttribute("aria-describedby", described);
  if (error) control.setAttribute("aria-invalid", "true");
  return h("div", { class: ["vc-field", "live-field", `live-field--${name.replace(".", "-")}`] },
    h("label", { class: "vc-label", for: id }, label),
    control,
    help ? h("p", { class: "vc-help", id: helpId }, help) : null,
    h("p", { class: "vc-help vc-help--error", id: errId, hidden: !error }, error || ""));
}

export function liveStartView(ctx) {
  const { run, handlers, form } = ctx;
  const inputs = form.inputs;
  const locked = form.locked;
  const errors = new Map((form.errors || []).map((p) => [p.field, t(p.key, p.vars)]));
  const on = (name) => ({ input: (e) => handlers.input(name, e.target.value) });
  const text = (name, value, max, extra = {}) => h("input", { class: "vc-input", type: "text", value, maxlength: String(max), autocomplete: "off", spellcheck: "true", disabled: locked, on: on(name), ...extra });
  const sector = h("select", { class: "vc-select", disabled: locked, on: { change: (e) => handlers.input("sector", e.target.value) } },
    h("option", { value: "", selected: !inputs.company.sector }, t("live.sector.open")),
    SECTORS.map((s) => h("option", { value: s.id, selected: inputs.company.sector === s.id }, s.name[ctx.lang === "de" ? "de" : "en"])));
  const company = h("fieldset", { class: "live-company" },
    h("legend", { class: "vc-visually-hidden" }, t("live.companyGroup")),
    field("name", t("live.company"), text("name", inputs.company.name, MAX_NAME), { error: errors.get("name") }),
    field("sector", t("live.sector"), sector),
    field("country", t("live.country"), text("country", inputs.company.country, 60), { error: errors.get("country") }),
    field("what", t("live.what"), text("what", inputs.company.what, MAX_WHAT), { help: t("live.what.help"), error: errors.get("what") }));
  const factors = h("fieldset", { class: "live-factors" },
    h("legend", { class: "live-legend" }, t("live.factors")),
    h("p", { class: "vc-help live-factors-help" }, t("live.factors.help")),
    h("div", { class: "live-dims" }, DIMENSIONS.map((d) => {
      const value = inputs.lines[d];
      const n = factorsFromLines({ [d]: value }).length;
      const area = h("textarea", { class: "vc-textarea", rows: "2", spellcheck: "true", disabled: locked, on: on(`lines.${d}`) });
      area.value = value;
      return field(`lines.${d}`, dimName(d), area, { help: n ? t(`dim.${d}.q`) : t("live.dim.empty"), error: errors.get(`lines.${d}`) });
    })));
  const notice = h("div", { class: "public-note", role: "note" },
    icon("shield"),
    h("p", {}, h("strong", {}, t("live.public")), " ", t("live.where")));
  const count = inputs.factors.length;
  const action = locked
    ? yourTurn(t("live.turn.locked"), cta(t("next.scan"), () => handlers.go(1)))
    : yourTurn(count ? tn("live.turn", count) : t("live.turn.none"), withNotice(cta(t("live.cta"), handlers.liveStart, { attention: false })));
  return {
    story: [
      head(t("live.title"), t("live.lead")),
      h("div", { class: "panel live-form" },
        notice,
        locked ? h("p", { class: "live-locked" }, icon("info"), h("span", {}, t("live.locked"))) : null,
        company,
        factors,
        h("div", { class: "live-actions" },
          h("button", { type: "button", class: "vc-button vc-button--ghost", id: "btn-back-sim", on: { click: handlers.backToSimulation } }, icon("chevron-left"), t("live.back")),
          h("button", { type: "button", class: "vc-button vc-button--ghost live-clear", id: "btn-clear", on: { click: handlers.clear } }, icon("trash"), t("live.clear")))),
      action,
    ],
    side: ring(run, 0, { selected: null }),
  };
}

/** The id of the control that holds a field, so the presenter can focus the first one to fix. */
export const controlOf = (name) => fieldId(name);
