// Challenge: the Red team's issues, the strongest first, each with its reason, its evidence and the
// correction code applied, and an Undo that puts the factor back as it was. The ring turns coral where a
// dimension is now under pressure.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { head, cta, storyFoot, icon, sourceLink } from "./common.js";
import { ring, dimensionPanel, uncheckedTag } from "../hexagon.js";
import { issueType, correctionWords, dimName, confidenceName } from "../plain.js";
import * as R from "../run.js";
import { fmtDate } from "../format.js";

function issueCard(issue, run, byId, handlers) {
  const undone = run.undone?.has(issue.id);
  const signals = new Map((run.signals || []).map((s) => [s.url, s]));
  const evidence = issue.evidence.map((u) => signals.get(u)).filter(Boolean);
  const target = issue.correction.factor ? byId.get(issue.correction.factor) : null;
  return h("li", { class: "issue", dataset: { id: issue.id, undone: undone ? "true" : "false" } },
    h("article", { class: "issue-card", "aria-labelledby": `issue-${issue.id}` },
      h("header", { class: "issue-head" },
        h("span", { class: "vc-tag vc-tag--sm issue-type" }, icon(issue.type === "missing" ? "plus" : issue.type === "outdated" ? "minus" : "warning"), issueType(issue.type)),
        h("span", { class: "issue-dims" }, issue.dimensions.map((d) => dimName(d)).join(", ")),
        h("span", { class: "issue-conf" }, t("issue.confidence", { c: confidenceName(issue.confidence) })),
        run.unchecked?.has(issue.id) ? uncheckedTag() : null),
      h("h3", { class: "issue-title", id: `issue-${issue.id}` }, issue.title),
      h("p", { class: "issue-reason ai-text" }, issue.reason),
      h("p", { class: "issue-fix" },
        h("span", { class: "item-label" }, undone ? t("issue.undone") : t("issue.fix")), " ",
        target && issue.correction.kind !== "add_factor" ? `${target.text}: ` : "",
        correctionWords(issue, byId)),
      evidence.length ? h("div", { class: "issue-sources" },
        h("p", { class: "item-label" }, t("issue.evidence")),
        h("ul", {}, evidence.map((s) => h("li", {}, sourceLink(s.url, s.title), s.published ? h("span", { class: "src-date" }, ` ${fmtDate(s.published)}`) : null)))) : null,
      h("button", { type: "button", class: "vc-button vc-button--secondary issue-undo", "aria-describedby": `issue-${issue.id}`, on: { click: () => handlers.undo(issue.id) } },
        undone ? t("issue.redo") : t("issue.undo"))));
}

export function challengeView(ctx) {
  const { run, handlers, ui } = ctx;
  const issues = run.issues || [];
  // The factors before the corrections, so each card says what changed from what.
  const scanned = new Map(R.scannedFactors(run).map((f) => [f.id, f]));
  const states = R.dimensionStates(run, 2);
  const pressure = Object.values(states).filter((s) => s.status === "pressure").length;
  const before = Object.values(R.dimensionStates(run, 1)).filter((s) => s.status === "pressure").length;
  const live = issues.filter((i) => !run.undone?.has(i.id)).length;
  return {
    story: [
      head(t(pressure > before ? "challenge.title.up" : pressure < before ? "challenge.title.down" : "challenge.title.same", { n: live, pressure, before }), t("challenge.lead")),
      h("div", { class: "panel" },
        h("ol", { class: "issues" }, issues.map((i) => issueCard(i, run, scanned, handlers))),
        h("details", { class: "dim-details" }, h("summary", {}, t("challenge.factors", { dim: dimName(ui.dim) })), dimensionPanel(run, 2, ui.dim))),
      storyFoot(ctx.play, cta(t("next.assess"), () => handlers.go(3))),
    ],
    side: ring(run, 2, { selected: ui.dim, onSelect: handlers.setDim }),
  };
}
