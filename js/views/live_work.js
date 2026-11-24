// A live step while its agent works, and where a live run stopped (brief §5.5 and §5.8; PLAN.md section 8).
// While an agent works, the step shows the agent's role, one sentence on what it does, the time so far,
// what the run has spent against the cap, and Abort; the key figures say what they wait for. A request
// that waits to be tried again or an answer sent back for repair says so under the figures. When a run
// stops (the cap, an answer that failed its checks twice, an error after the retries, an Abort), the
// step says why in plain words, that what is done stays, and the next step: go on, or back to the
// simulation.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { head, icon, withNotice, downloads } from "./common.js";
import { ring } from "../hexagon.js";
import { apiMessage } from "../api_messages.js";
import { fmtCost, fmtClock } from "../format.js";
import { MAX_REQUESTS } from "../config.js";

/** The agents of each action, in the order they run. */
export const SEQUENCE = Object.freeze({
  scan: ["scout", "scanner"],
  challenge: ["red_team", "analyst", "strategist"],
  summarise: ["writer"],
});

const STEP_KEYS = ["start", "scan", "challenge", "assess", "respond", "summary"];
const AGENT_STEP = { scout: 1, scanner: 1, red_team: 2, analyst: 3, strategist: 4, writer: 5 };

/** The agents of the action in flight, each done, working or waiting; none when one agent works alone. */
function progress(run, agent) {
  const action = Object.entries(SEQUENCE).find(([, list]) => list.includes(agent))?.[0];
  const list = SEQUENCE[action].filter((a) => a !== "scout" || run.research || run.signals.length);
  if (list.length < 2) return null;
  const at = list.indexOf(agent);
  return h("ol", { class: "work-steps", "aria-label": t("work.steps") }, list.map((a, i) => {
    const state = i < at ? "done" : i === at ? "working" : "waiting";
    return h("li", { dataset: { state } },
      h("span", { class: "work-mark", "aria-hidden": "true" }, icon(state === "done" ? "check" : state === "working" ? "sparkle" : "clock")),
      h("span", {}, t(`agent.${a}`)),
      h("span", { class: "vc-visually-hidden" }, t(`work.state.${state}`)));
  }));
}

/** The figures that change while the agent works: the time so far, the spend against the cap, requests. */
export function workFigures(run, now = Date.now()) {
  const seconds = run.working ? (now - run.working.since) / 1000 : 0;
  return h("dl", { class: "work-figures" },
    h("div", {}, h("dt", {}, t("work.time")), h("dd", { class: "work-time" }, fmtClock(seconds))),
    h("div", {}, h("dt", {}, t("work.spent")), h("dd", { class: "work-spent" }, t("work.spent.of", { spent: fmtCost(run.spend.eur), cap: fmtCost(run.cap) }))),
    h("div", {}, h("dt", {}, t("work.requests")), h("dd", {}, t("work.requests.of", { n: run.requests, max: MAX_REQUESTS }))));
}

export function workView(ctx) {
  const { run, handlers, live } = ctx;
  const agent = run.working.agent;
  const step = AGENT_STEP[agent];
  return {
    story: [
      head(t(`work.title.${agent}`, { company: run.company.name }), t(`work.${agent}`)),
      h("div", { class: "panel work" },
        h("section", { class: "work-card", "aria-labelledby": "work-agent" },
          h("p", { class: "work-agent", id: "work-agent" },
            h("span", { class: "vc-cell vc-cell--lilac vc-cell--sm work-cell", "aria-hidden": "true" }, icon("sparkle")),
            h("span", { class: "work-role" }, t(`agent.${agent}`)),
            h("span", { class: "vc-tag vc-tag--sm vc-tag--feature" }, t("item.ai"))),
          workFigures(run),
          h("p", { class: "work-note", id: "work-note", "aria-live": "polite" }, live.note || "")),
        progress(run, agent),
        h("p", { class: "work-hint" }, icon("info"), h("span", {}, t("work.hint")))),
      h("div", { class: "story-foot" },
        h("button", { type: "button", class: "vc-button vc-button--secondary work-abort", id: "btn-abort", on: { click: handlers.abort } }, icon("stop"), t("work.abort"))),
    ],
    // Once the person has adopted the responses, the ring shows where they leave the company, as the tiles do.
    side: ring(run, run.decided ? 5 : Math.max(0, step - 1), { selected: null }),
  };
}

/** Why the run stopped, in the page's language: { title, message, tone }. */
export function stopWords(run) {
  const s = run.stopped;
  const stepName = (n) => t(`step.${STEP_KEYS[n]}`);
  const at = stepName(s.agent ? AGENT_STEP[s.agent] : 1);
  const after = s.after && s.after !== "start" ? t(`step.${s.after}`) : null;
  // A request that broke off, went unanswered or was aborted under way counts against the cap at its worst case:
  // every stop says so while the run holds one.
  const held = run.unmetered > 0 ? t("stop.unmetered") : null;
  if (s.reason === "cap") {
    // "Before the first request" only while none was sent; after one, no step was done yet.
    const message = s.retry ? t("stop.cap.retry") : after ? t("stop.cap", { step: after }) : t(run.requests > 0 ? "stop.cap.noStep" : "stop.cap.first");
    return { tone: "warning", title: t("stop.cap.title"), message, next: held };
  }
  if (s.reason === "aborted") return { tone: "warning", title: t("stop.aborted.title"), message: t("stop.aborted", { step: at }), next: held };
  if (s.reason === "checks") return { tone: "danger", title: t(s.repaired === false ? "stop.checks.noRepair.title" : "stop.checks.title"), message: t(s.repaired === false ? "stop.checks.noRepair" : "stop.checks", { agent: t(`agent.${s.agent}`), step: at }), next: [t("stop.checks.next"), held] };
  if (s.reason === "requests") return { tone: "danger", title: t("stop.requests.title"), message: t("stop.requests", { step: at }), next: held };
  // A stream that broke off mid-answer reached the API: the shared client calls it a network error, which reads as
  // if nothing had been sent, whatever the stream's own error said. An overload said inside the stream is still
  // the busy service.
  const m = s.error?.midStream ? { key: s.error.type === "overloaded_error" ? "api.overloaded" : "stop.error.cut", vars: null } : apiMessage(s.error || {});
  return { tone: "danger", title: t("stop.error.title"), message: t(m.key, m.vars), next: held };
}

export function stopView(ctx) {
  const { run, handlers } = ctx;
  const w = stopWords(run);
  const s = run.stopped;
  const step = s.agent ? AGENT_STEP[s.agent] : 1;
  const final = run.requests >= MAX_REQUESTS;
  return {
    story: [
      head(w.title, t(run.scan || run.signals?.length ? "stop.lead" : "stop.lead.none")),
      h("div", { class: "panel stop" },
        h("div", { class: `vc-alert vc-alert--${w.tone} stop-alert`, role: "alert" },
          icon(w.tone === "danger" ? "error" : "warning"),
          h("div", { class: "stop-body" },
            h("p", { class: "stop-message" }, w.message),
            [].concat(w.next || []).filter(Boolean).map((x) => h("p", {}, x)),
            s.problems?.length ? h("details", { class: "stop-problems" },
              h("summary", {}, t("stop.problems")),
              h("ul", {}, s.problems.map((p) => h("li", {}, p)))) : null)),
        // A run that has used all its requests cannot go on: what is done leaves with the person, or a new run
        // starts from the form.
        h("p", { class: "stop-kept" }, t(final ? "stop.kept.final" : "stop.kept", { spent: fmtCost(run.spend.eur) })),
        // What is done leaves as a report that says on every page where the run stopped (brief §5.5).
        ctx.report?.can ? (() => {
          const { pdf, files } = downloads(handlers, { handoff: ctx.report.handoff, primary: false });
          return h("div", { class: "stop-downloads" }, h("p", { class: "stop-downloads-title" }, t("stop.download")), h("p", { class: "report-file-actions" }, pdf), files);
        })() : null),
      h("div", { class: "story-foot stop-actions" },
        h("button", { type: "button", class: "vc-button vc-button--ghost", id: "btn-back-sim", on: { click: handlers.backToSimulation } }, icon("chevron-left"), t("live.back")),
        final ? null : withNotice(h("button", { type: "button", class: "vc-button cta", id: "btn-cta", on: { click: handlers.goOn } }, t(s.reason === "checks" ? "stop.goOn.thorough" : "stop.goOn"), icon("chevron-right")))),
    ],
    // Once the person has adopted the responses, the ring shows where they leave the company, as the tiles do.
    side: ring(run, run.decided ? 5 : Math.max(0, step - 1), { selected: null }),
  };
}
