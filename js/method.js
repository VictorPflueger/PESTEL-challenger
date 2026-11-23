// The method dialog (brief §8; PLAN section 8): the six dimensions and their questions, the scales the
// agents rate on, the rules the engine follows with a worked example, the sector's KPIs, the fixed rate
// and what the figures are not. It is written in the page's language each time it opens, so it never
// lags behind a language switch.

import { h, clear } from "./dom.js";
import { t, getLang, onLang } from "./i18n/index.js";
import { DIMENSIONS } from "./engine.js";
import { kpisFor } from "../data/kpis.js";
import { dimName, sectorName } from "./plain.js";
import { USD_TO_EUR } from "./config.js";

/** The sector of the scenario on screen, read from the address, else the default scenario's. */
let currentSector = () => "energy_utilities";
export function setSectorSource(fn) { currentSector = fn; }

function section(title, ...children) {
  return h("section", { class: "method-section" }, h("h3", {}, title), children);
}

export function renderMethod() {
  const body = document.getElementById("method-body");
  if (!body) return;
  const lang = getLang();
  const sector = currentSector();
  clear(body);
  body.append(
    h("p", { class: "method-lead" }, t("method.lead")),
    section(t("method.dims"),
      h("dl", { class: "method-dims" }, DIMENSIONS.map((d) => [h("dt", {}, dimName(d)), h("dd", {}, t(`dim.${d}.q`))]))),
    section(t("method.scales"),
      h("dl", { class: "method-scales" },
        h("dt", {}, t("method.likelihood")), h("dd", {}, t("method.likelihood.text")),
        h("dt", {}, t("method.impact")), h("dd", {}, t("method.impact.text")),
        h("dt", {}, t("method.horizon")), h("dd", {}, t("method.horizon.text")),
        h("dt", {}, t("method.readiness")), h("dd", {}, t("method.readiness.text")))),
    section(t("method.engine"),
      h("ul", { class: "method-rules" }, ["risk", "bands", "gap", "score", "pressure", "stake", "after"].map((k) => h("li", {}, t(`method.rule.${k}`))))),
    section(t("method.example"), h("p", {}, t("method.example.text"))),
    section(t("method.kpis", { sector: sectorName(sector, lang) }),
      h("p", {}, t("method.kpis.text")),
      h("ul", { class: "method-kpis" }, kpisFor(sector).filter((k) => k.sector === sector).map((k) => h("li", {}, h("strong", {}, k.name[lang === "de" ? "de" : "en"]), `: ${k.definition[lang === "de" ? "de" : "en"]}`)))),
    section(t("method.money"), h("p", {}, t("method.money.text", { rate: USD_TO_EUR.toLocaleString(lang === "de" ? "de-DE" : "en-GB") }))),
    section(t("method.not"), h("p", {}, t("method.not.text"))));
}

export function initMethod() {
  const dialog = document.getElementById("method");
  if (!dialog) return;
  document.querySelector(".method-open")?.addEventListener("click", renderMethod, { capture: true });
  onLang(() => { if (dialog.open) renderMethod(); });
  renderMethod();
}
