// Summary: the report of the run, page by page (js/report.js), with the downloads in the last "Your turn" bar
// (brief §9): Save as PDF opens the print dialog on the report alone, the HTML file is the same report as one
// file of its own, and the handoff file is the JSON the Prototype Ideator reads. A link opens the Ideator.
// After a live run, "Save run as simulation" stays under the downloads.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { head, yourTurn, icon, downloads } from "./common.js";
import { ring } from "../hexagon.js";
import { renderFacts } from "../facts.js";
import * as R from "../run.js";
import { reportDocument, reportLang } from "../report.js";

export function summaryView(ctx) {
  const { run, handlers } = ctx;
  const lang = reportLang(run, ctx.lang);
  const values = R.runFacts(run, lang);
  const live = run.mode === "live";
  const headline = run.summary ? renderFacts(run.summary.headline, values).replace(/\{\{fact:[^}]+\}\}/g, t("fig.none")) : t("summary.title.none");
  const report = reportDocument(run, { lang, today: ctx.today, estimate: ctx.estimate, id: "report", level: 2 });
  const { pdf, files } = downloads(handlers);
  const bar = yourTurn(h("span", { id: "pdf-hint" }, t(live ? "summary.turn.live" : "summary.turn")), pdf, [
    files,
    live ? h("p", { class: "live-save" },
      h("button", { type: "button", class: "vc-button vc-button--ghost", id: "btn-save-run", "aria-describedby": "save-run-note", on: { click: handlers.saveRun } }, icon("download"), t("summary.save")),
      h("span", { class: "vc-help", id: "save-run-note" }, t("summary.save.note"))) : null,
  ]);
  bar.classList.add("report-turn");
  return {
    story: [
      head(headline, t("summary.lead")),
      h("div", { class: "panel summary report-panel" }, report),
      bar,
    ],
    side: ring(run, 5, { selected: ctx.ui.dim, onSelect: null }),
  };
}
