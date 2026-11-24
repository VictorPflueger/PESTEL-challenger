// Scan: the Scout's dated signals (when research ran) or the note that the agents know the world only up
// to June 2026, then the six dimensions completed and rated. The ring chooses the dimension the list
// shows; what the AI wrote is lilac and says "AI". The person's turn: read what the AI added, then hand
// the analysis to the Red team.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { head, cta, yourTurn, storyFoot, icon, sourceLink } from "./common.js";
import { ring, dimensionPanel, itemLegend } from "../hexagon.js";
import { dimName } from "../plain.js";
import * as R from "../run.js";
import { fmtDate } from "../format.js";

/** The Scout's signals, newest first, each with its source and dates; collapsed to save the room's eyes. */
export function signalList(run) {
  if (!run.research) {
    return h("p", { class: "cutoff-note" }, icon("info"), h("span", {}, t("scan.cutoff")));
  }
  const signals = [...(run.signals || [])].sort((a, b) => String(b.published ?? "").localeCompare(String(a.published ?? "")));
  return h("details", { class: "signals" },
    h("summary", {}, h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, icon("sparkle"), t("item.ai")), " ", tn("scan.signals", signals.length)),
    h("ol", { class: "signal-list" }, signals.map((s) => h("li", {},
      h("p", { class: "signal-title" }, sourceLink(s.url, s.title)),
      h("p", { class: "signal-summary ai-text" }, s.summary),
      h("p", { class: "src-date" }, [s.published ? t("src.published", { date: fmtDate(s.published) }) : t("src.noDate"), t("src.read", { date: fmtDate(s.read_on) })].join(", "))))));
}

export function scanView(ctx) {
  const { run, handlers, ui } = ctx;
  const factors = R.scannedFactors(run);
  const added = factors.filter((f) => f.origin === "scan").length;
  const states = R.dimensionStates(run, 1);
  const pressure = Object.values(states).filter((s) => s.status === "pressure").length;
  const dim = ui.dim;
  const title = t("scan.title", { added, pressure });
  const lead = run.research ? t("scan.lead.research", { n: (run.signals || []).length }) : t("scan.lead.none");
  const action = ctx.reached === 1
    ? yourTurn(t("scan.turn"), cta(t("scan.cta"), handlers.challenge, { attention: !ctx.play.on }))
    : storyFoot(ctx.play, cta(t("next.challenge"), () => handlers.go(2)));
  return {
    story: [
      head(title, lead),
      h("div", { class: "panel" }, signalList(run), dimensionPanel(run, 1, dim), itemLegend(1)),
      action,
    ],
    side: ring(run, 1, { selected: dim, onSelect: handlers.setDim }),
    sideLabel: t("ring.choose", { dim: dimName(dim) }),
  };
}
