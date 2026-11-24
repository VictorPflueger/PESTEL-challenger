// Start: which company, what its team entered, and the person's first move. The key figures already show
// what the recorded run will find (js/kpis.js); this screen says whose list it is and hands it to the
// agents. "Run it live" switches to the same steps on the person's own company.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { head, cta, yourTurn, icon, storyFoot, withNotice } from "./common.js";
import { ring, factorItem } from "../hexagon.js";
import { SCENARIOS } from "../simulation.js";
import * as R from "../run.js";
import { fmtDate, needsUpdate } from "../format.js";

export function startView(ctx) {
  const { run, handlers, today } = ctx;
  const team = R.teamFactors(run);
  const old = needsUpdate(run.as_of, today);
  const chooser = h("div", { class: "vc-segmented scenario-choice", role: "radiogroup", "aria-label": t("start.choose") },
    SCENARIOS.map((sc) => h("label", {},
      h("input", { type: "radio", name: "scenario", value: sc.id, checked: sc.id === run.scenario, on: { change: () => handlers.chooseScenario(sc.id) } }),
      h("span", {}, sc.company.name))));
  const company = h("div", { class: "company" },
    h("p", { class: "company-tags" },
      h("span", { class: "vc-tag vc-tag--sm fictional" }, icon("info"), t("start.fictional")),
      h("span", { class: "as-of" }, t("start.asOf", { date: fmtDate(run.as_of) })),
      old ? h("span", { class: "vc-tag vc-tag--sm vc-tag--warning" }, icon("clock"), t("start.update")) : null,
      run.research ? null : h("span", { class: "vc-tag vc-tag--sm" }, t("start.noResearch"))),
    h("p", { class: "company-what" }, run.company.what));
  const list = h("div", { class: "team-list vc-framework vc-framework--1" },
    h("section", { class: "vc-framework__area", "aria-labelledby": "team-title" },
      h("header", { class: "vc-framework__head" },
        h("h2", { class: "vc-framework__title", id: "team-title" }, tn("start.team", team.length))),
      h("ul", { class: "vc-framework__items" }, team.map((f) => factorItem(f, run, 0, { dimLabel: true })))));
  const action = ctx.reached === 0
    ? yourTurn(t("start.turn"), cta(t("start.cta"), handlers.start, { attention: !ctx.play.on }))
    : storyFoot(ctx.play, cta(t("next.scan"), () => handlers.go(1)));
  return {
    story: [
      head(t("start.title", { company: run.company.name }), t("start.lead")),
      h("div", { class: "panel" }, chooser, company, list,
        // "Run it live": the same steps on the person's own company, with their own Claude key.
        h("div", { class: "live-entry" },
          withNotice(h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-run-live", on: { click: handlers.runLive } }, icon("zap"), t("start.live"))),
          h("p", { class: "live-entry-note" }, t("start.live.note"))),
        h("p", { class: "version-note" }, icon("info"), h("span", {}, t("start.version")))),
      action,
    ],
    side: ring(run, 0, { selected: null }),
  };
}
