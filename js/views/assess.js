// Assess: one picture of what could hurt most and when (PLAN section 8). The risk matrix numbers every
// threat by what it puts at stake, its horizon in its label; the horizon strip under it shows when each
// arrives. Both offer their numbers one click away. Readiness stays on its tile.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { head, cta, storyFoot } from "./common.js";
import { riskMatrix, horizonStrip, numberedThreats } from "../matrix.js";
import * as R from "../run.js";
import { money } from "../format.js";

export function assessView(ctx) {
  const { run, handlers, ui } = ctx;
  const lang = ctx.lang;
  const r = R.figures(run, { decided: false }).before;
  const list = numberedThreats(run);
  const top = list[0];
  const title = r.monetised < r.threats
    ? t("assess.title.part", { money: money(r.atStake, lang), n: r.monetised, total: r.threats })
    : t("assess.title", { money: money(r.atStake, lang) });
  const lead = top ? t("assess.lead", { top: top.f.text }) : t("assess.lead.none");
  return {
    story: [
      head(title, lead),
      h("div", { class: "panel assess-panel" }, riskMatrix(run), horizonStrip(run)),
      storyFoot(ctx.play, cta(t("next.respond"), () => handlers.go(4))),
    ],
    side: null,
    layout: "assess",
  };
}
