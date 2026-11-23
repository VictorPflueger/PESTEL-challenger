// Assess: one picture of what could hurt most and when (PLAN section 8). The risk matrix numbers every
// threat by what it puts at stake, its horizon in its label; the horizon strip under it shows when each
// arrives. Both offer their numbers one click away. Readiness stays on its tile.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { head, cta, storyFoot } from "./common.js";
import { riskMatrix, horizonStrip, numberedThreats } from "../matrix.js";
import * as R from "../run.js";
import { money } from "../format.js";

/**
 * The three threats that put most at stake, by their numbers on the matrix: the room reads at once what
 * "1" is, without opening a table.
 */
function topThree(list, lang) {
  const top = list.filter((x) => x.fig.expected !== null).slice(0, 3);
  if (!top.length) return null;
  return h("section", { class: "top-three", "aria-labelledby": "top-title" },
    h("p", { class: "vc-chart__title", id: "top-title" }, t("assess.top")),
    h("ol", {}, top.map((x) => h("li", {},
      h("span", { class: "top-n" }, String(x.n)),
      h("span", { class: "top-text" }, x.f.text),
      h("span", { class: "top-money" }, t("assess.top.money", { money: money(x.fig.expected, lang) }))))));
}

export function assessView(ctx) {
  const { run, handlers, ui } = ctx;
  const lang = ctx.lang;
  const r = R.figures(run, { decided: false }).before;
  const list = numberedThreats(run);
  const top = list[0];
  const title = r.monetised < r.threats
    ? t("assess.title.part", { money: money(r.atStake, lang), n: r.monetised, total: r.threats })
    : t("assess.title", { money: money(r.atStake, lang) });
  const lead = top ? t("assess.lead") : t("assess.lead.none");
  return {
    story: [
      head(title, lead),
      h("div", { class: "panel assess-panel" }, riskMatrix(run), horizonStrip(run), topThree(list, lang)),
      storyFoot(ctx.play, cta(t("next.respond"), () => handlers.go(4))),
    ],
    side: null,
    layout: "assess",
  };
}
