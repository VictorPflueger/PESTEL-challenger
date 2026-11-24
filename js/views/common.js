// What every step shares: its title and lead, the bar under the story that says what happens next, and
// Vici's merlot "Your turn" callout where the person acts. js/presenter.js updates the bar's words and its
// fill while Play runs, and adds vc-attention to the step's action after a few quiet seconds.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/steps_view.js.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { IDEATOR_URL } from "../config.js";

export const icon = (name) => h("span", { class: `vc-icon vc-icon--${name}`, "aria-hidden": "true" });

/** A link to a source, opened in a new tab: a 40 px target, since a presenter clicks it on a projector. */
export const sourceLink = (url, text) => h("a", { class: "src-link", href: url, target: "_blank", rel: "noopener" }, text);

/** The step's title and lead: the title answers one question, the lead says what the step shows. */
export function head(title, lead) {
  return h("header", { class: "story-head" },
    h("h1", { class: "story-title", id: "step-title", tabindex: "-1" }, title),
    lead ? h("p", { class: "story-lead", "data-read": "" }, lead) : null);
}

/** The step's one primary action. It carries vc-attention where the person must act. */
export function cta(label, onClick, { attention = false, id = "btn-cta", disabled = false } = {}) {
  return h("button", { type: "button", class: ["vc-button", "cta", attention ? "vc-attention" : ""], id, disabled, on: { click: onClick } }, label, icon("chevron-right"));
}

/** The note beside the action: when Play moves on, or that the move is the person's. */
export function footNote(play) {
  return h("p", { class: "foot-note", id: "foot-note", dataset: { tone: play?.on ? "" : "move" } }, play?.on ? "" : t("foot.yourMove"));
}

/** Vici's merlot callout: whose turn it is and, in one sentence, what to do, with the action beside it. */
export function yourTurn(text, action, extra = null) {
  return h("div", { class: "vc-callout turn turn-bar", role: "status" },
    h("span", { class: "vc-callout__cell", "aria-hidden": "true" }, icon("hand")),
    h("div", { class: "vc-callout__body" },
      h("p", { class: "vc-callout__title" }, t("turn.title")),
      h("p", {}, text),
      extra),
    action);
}

/** The bar under a step's story when the person need not act: what happens next and the way there. */
export function storyFoot(play, action) {
  return h("div", { class: "story-foot" }, footNote(play), action);
}

/**
 * The AI notice in Vici's lilac tag, in the fixed words (standing requirement 11): beside every control
 * that starts a live run or sends the next request of one.
 */
export function aiTag() {
  return h("span", { class: "vc-tag vc-tag--feature ai-notice" }, icon("sparkle"), t("ai.notice"));
}

/** A live control with the AI notice beside it, the notice first so the eye meets it before the button. */
export function withNotice(button) {
  return h("div", { class: "with-notice" }, aiTag(), button);
}

/**
 * The report's downloads (brief §9): Save as PDF, which opens the print dialog on the report alone, then the
 * HTML file and the handoff file for the Prototype Ideator, and the link to the Ideator. handoff: false before
 * the Analyst has priced the forces, since the file carries figures. primary: Save as PDF is the step's one
 * primary action (the Summary's last bar); otherwise it is a secondary button (a stopped run).
 */
export function downloads(handlers, { handoff = true, primary = true } = {}) {
  const pdf = h("button", { type: "button", class: ["vc-button", primary ? "cta" : "vc-button--secondary"], id: primary ? "btn-cta" : "btn-save-pdf", "aria-describedby": "pdf-hint", on: { click: handlers.savePdf } }, icon("download"), t("summary.pdf"));
  // In the last bar the bar's sentence carries the hint (id pdf-hint); elsewhere it stands under the button.
  const files = h("div", { class: "report-files" },
    primary ? null : h("p", { class: "vc-help report-pdf-hint", id: "pdf-hint" }, t("summary.pdf.hint")),
    h("p", { class: "report-file-actions" },
      h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-save-html", on: { click: handlers.saveHtml } }, icon("download"), t("summary.html")),
      handoff ? h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-save-json", on: { click: handlers.saveJson } }, icon("download"), t("summary.json")) : null,
      // The Ideator reads the handoff file the person drops into it: the link says so to a screen reader, and the
      // report's last page says so in print.
      handoff ? h("a", { class: "vc-button vc-button--ghost report-ideator", id: "link-ideator", href: IDEATOR_URL, target: "_blank", rel: "noopener", "aria-describedby": "ideator-hint" }, t("summary.ideator"), icon("external")) : null,
      handoff ? h("span", { class: "vc-visually-hidden", id: "ideator-hint" }, t("summary.ideator.hint")) : null));
  return { pdf, files };
}
