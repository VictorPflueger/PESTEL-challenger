// Respond: the person's decision, on the full stage. The threats under pressure come first, every factor's
// recommended response is chosen already, so "Adopt these responses" works without a change, and every
// option shows in full above the bar. As the person changes a choice, the bar shows where the key figures
// would move; adopting strikes the old values through on the tiles.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { head, cta, yourTurn, icon, withNotice, aiMark } from "./common.js";
import { uncheckedTag } from "../hexagon.js";
import { kindName, effortName, timeName, ratingLine, estimateWords, dimName } from "../plain.js";
import * as R from "../run.js";
import { money, moneyRange } from "../format.js";
import { moneyText, readinessText } from "../engine.js";

function option(f, r, chosen, onChoose, expected, unchecked = null) {
  const id = r ? r.id : "accept";
  const lines = [];
  if (r?.kind === "mitigate") {
    // What the response leaves of the threat as it stands now (R.residualOf). A threat without a euro figure
    // counts in readiness, not in money: no residual range to show.
    const left = R.residualOf(f, r.mitigate);
    const words = { a: f.readiness, b: left.readiness, la: f.likelihood, lb: left.likelihood };
    lines.push(expected !== null
      ? h("span", { class: "opt-effect" }, t("opt.mitigate", words), " ", h("span", { class: "ai-figure" }, t("opt.left", { range: moneyRange(left.eur_year_low, left.eur_year_high) })))
      : h("span", { class: "opt-effect" }, t("opt.mitigate.unpriced", words)));
  } else if (r?.kind === "advantage") {
    const a = r.advantage;
    lines.push(h("span", { class: "opt-effect ai-figure" }, t("opt.upside", { range: moneyRange(a.eur_year_low, a.eur_year_high), n: a.likelihood })));
  } else if (r?.kind === "monitor") {
    const m = r.monitor;
    lines.push(h("span", { class: "opt-watch" },
      h("span", {}, h("span", { class: "item-label" }, `${t("watch.signal")}:`), " ", m.signal),
      h("span", {}, h("span", { class: "item-label" }, `${t("watch.trigger")}:`), " ", m.trigger),
      h("span", {}, h("span", { class: "item-label" }, `${t("watch.where")}:`), " ", `${m.where}, ${m.how_often.replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase())}`)));
  } else {
    lines.push(h("span", { class: "opt-effect" }, f.direction === "threat" && expected !== null ? t("opt.accept.threat", { money: money(expected) }) : t("opt.accept.other")));
  }
  const key = `opt-${f.id}-${id}`;
  return h("label", { class: ["option", r ? "" : "option--accept"], dataset: { kind: r ? r.kind : "accept", chosen: String(chosen) } },
    h("input", { type: "radio", name: `choice-${f.id}`, value: id, checked: chosen, "aria-labelledby": `${key}-kind ${key}-title`, "aria-describedby": `${key}-body`, on: { change: () => onChoose(f.id, id) } }),
    h("span", { class: "option-body" },
      h("span", { class: "option-kind", id: `${key}-kind` }, kindName(r ? r.kind : "accept"), r?.recommended ? h("span", { class: "vc-tag vc-tag--sm vc-tag--feature rec", title: t("opt.ai") }, icon("sparkle"), t("opt.recommended")) : r ? aiMark(t("opt.ai")) : null, r && unchecked?.has(r.id) ? uncheckedTag() : null),
      h("span", { class: "option-title", id: `${key}-title` }, r ? r.title : t(f.direction === "threat" ? "opt.accept.title" : "opt.leave.title")),
      h("span", { class: "option-more", id: `${key}-body` },
      r ? h("span", { class: "option-step" }, h("span", { class: "item-label" }, t("opt.firstStep")), " ", r.first_step) : null,
      r ? h("span", { class: "option-meta" }, [r.owner, effortName(r.effort), timeName(r.time_to_impact)].join(" · ")) : null,
      lines)));
}

export function respondView(ctx) {
  const { run, handlers, ui } = ctx;
  const lang = ctx.lang;
  const factors = R.decisionFactors(run);
  const index = Math.max(0, Math.min(ui.factor, factors.length - 1));
  const f = factors[index];
  const pressing = factors.filter((x) => x.pressing).length;
  const before = R.figures(run, { decided: false }).before;
  const preview = R.figures(run, { preview: true });
  const list = h("ol", { class: "decide-list", "aria-label": t("respond.list") }, factors.map((x, i) => {
    const choice = R.choiceFor(run, x.id);
    const r = (run.responses || []).find((y) => y.id === choice);
    return h("li", {}, h("button", { type: "button", class: "decide-item", "aria-pressed": String(i === index), dataset: { pressing: String(x.pressing) }, on: { click: () => handlers.setFactor(i) } },
      h("span", { class: "decide-dim" }, x.pressing ? icon("warning") : null, dimName(x.dimension)),
      h("span", { class: "decide-text" }, x.text),
      h("span", { class: "decide-choice" }, r ? kindName(r.kind) : kindName("accept"))));
  }));
  const options = f ? [...R.optionsFor(run, f.id), null].map((r) => option(f, r, R.choiceFor(run, f.id) === (r ? r.id : "accept"), handlers.choose, before.perFactor[f.id]?.expected ?? null, run.unchecked)) : [];
  const detail = f ? h("section", { class: "decide-detail", "aria-labelledby": "decide-title" },
    h("header", { class: "decide-head" },
      h("p", { class: "decide-count" }, t("respond.count", { n: index + 1, total: factors.length }),
        h("button", { type: "button", class: "vc-icon-button", "aria-label": t("respond.prev"), disabled: index === 0, on: { click: () => handlers.setFactor(index - 1) } }, icon("chevron-left")),
        h("button", { type: "button", class: "vc-icon-button", "aria-label": t("respond.next"), disabled: index === factors.length - 1, on: { click: () => handlers.setFactor(index + 1) } }, icon("chevron-right"))),
      h("h2", { class: "decide-title", id: "decide-title" }, h("span", { class: "decide-dim" }, dimName(f.dimension)), " ", f.text),
      h("p", { class: "decide-meta" }, ratingLine(f), f.impact_estimate ? [" · ", h("span", { class: "ai-figure" }, estimateWords(f))] : null)),
    h("fieldset", { class: "options", style: { "--n": String(Math.max(1, options.length - 1)) } }, h("legend", { class: "vc-visually-hidden" }, t("respond.options", { text: f.text })), options)) : null;

  const moved = t("respond.preview", {
    left: moneyText(preview.after, lang),
    readiness: readinessText(preview.after.readiness, lang),
    pressure: t("fig.pressure", { n: preview.after.pressure.length }),
  });
  // In a live run, adopting sends the Writer's request, so the AI notice stands beside the button.
  const adopt = cta(t("respond.cta"), handlers.adopt, { attention: !ctx.play.on });
  const action = run.decided && (run.mode !== "live" || run.summary)
    ? yourTurn(t("respond.turn.done"), cta(t("next.summary"), () => handlers.go(5)))
    : yourTurn(moved, run.mode === "live" ? withNotice(adopt) : adopt);
  return {
    story: [
      head(pressing ? t("respond.title", { n: pressing }) : t("respond.title.none"), t("respond.lead")),
      h("div", { class: "panel decide" }, list, detail),
      action,
    ],
    side: null,
    layout: "full",
  };
}
