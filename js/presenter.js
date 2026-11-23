// The presenter: the step bar, the stage and the four key figures for the recorded runs. The key figures
// answer first: the engine works out the scenario's analysis before anything plays. Play walks the steps
// by itself, each for as long as its words take to read (7 to 14 seconds), and stops wherever the person
// acts: Start the agents, Challenge this analysis, Adopt these responses. Space plays or pauses; a step
// chosen by click, arrow key, clicker (PageDown and PageUp) or ?step= pauses Play. ?scenario=s1&step=4
// plays the run up to that step, with the recommended responses chosen.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/app.js: this tool's steps and its run model, and
// no event bus, since the simulation has no agent to wait for.

import { h, clear } from "./dom.js";
import { t, getLang, onLang } from "./i18n/index.js";
import { DIMENSIONS } from "./engine.js";
import * as R from "./run.js";
import { SCENARIOS, DEFAULT_SCENARIO, scenarioById, runFromScenario, freshState } from "./simulation.js";
import { renderKpis } from "./kpis.js";
import { estimateScenario } from "./estimate.js";
import { appToday } from "./clock.js";
import { startView } from "./views/start.js";
import { scanView } from "./views/scan.js";
import { challengeView } from "./views/challenge.js";
import { assessView } from "./views/assess.js";
import { respondView } from "./views/respond.js";
import { summaryView } from "./views/summary.js";
import { fillGuides } from "./guide_figures.js";

const VIEWS = [startView, scanView, challengeView, assessView, respondView, summaryView];
const LAST = R.STEPS.length - 1;

export function initPresenter() {
  const params = new URLSearchParams(location.search);
  const stage = document.getElementById("stage");
  const stepsEl = document.getElementById("steps");
  const back = document.getElementById("btn-back");
  const next = document.getElementById("btn-next");
  const playBtn = document.getElementById("btn-play");
  const announce = document.getElementById("announce");

  const state = {
    scenarioId: scenarioById(params.get("scenario"))?.id || DEFAULT_SCENARIO,
    step: 0,
    reached: 0, // 0 idle, 1 scanned, 4 challenge to respond ready, 5 decided
    person: freshState(),
    ui: { dim: "political", factor: 0 },
    attention: false,
    estimates: new Map(),
  };
  /** Play: on, the frame it asked for, the time spent reading the step, the step it timed, the last frame. */
  const P = { on: false, raf: 0, at: 0, step: -1, last: 0 };

  const scenario = () => scenarioById(state.scenarioId);
  const run = () => runFromScenario(scenario(), getLang(), state.person);
  const estimate = () => {
    if (!state.estimates.has(state.scenarioId)) state.estimates.set(state.scenarioId, estimateScenario(scenario(), "en"));
    return state.estimates.get(state.scenarioId);
  };

  /** The dimension the list shows when a step opens: the first under pressure, else the first with factors. */
  function defaultDim(step) {
    const states = R.dimensionStates(run(), step);
    return DIMENSIONS.find((d) => states[d].status === "pressure") || DIMENSIONS.find((d) => states[d].count) || "political";
  }

  // ---- the step bar ---------------------------------------------------------------------------------
  const stepButtons = R.STEPS.map((id, n) => {
    const name = h("span", { class: "vc-step__name" });
    const hint = h("span", { class: "vc-step__hint" });
    const b = h("button", { type: "button", class: "vc-step__button", dataset: { step: String(n) }, on: { click: () => go(n) } },
      h("span", { class: "vc-step__marker", "aria-hidden": "true" }, String(n)),
      h("span", { class: "vc-step__label" }, name, hint));
    const li = h("li", { class: "vc-step", dataset: { step: id } }, b);
    stepsEl.append(li);
    return { li, b, name, hint };
  });

  const waits = () => (state.step === 0 && state.reached === 0) || (state.step === 1 && state.reached === 1) || (state.step === 4 && !state.person.decided);
  const finished = () => state.step === LAST && state.person.decided;
  const covered = () => !!document.querySelector("dialog[open]");

  function renderStepBar() {
    stepButtons.forEach(({ li, b, name, hint }, n) => {
      const current = n === state.step;
      li.classList.toggle("vc-step--current", current);
      li.classList.toggle("vc-step--done", n < state.step);
      if (current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.disabled = n > state.reached;
      name.textContent = t(`step.${R.STEPS[n]}`);
      const turn = (n === 0 && state.reached === 0) || (n === 1 && state.reached === 1) || (n === 4 && state.reached >= 4 && !state.person.decided);
      li.dataset.turn = turn ? "yours" : "";
      hint.textContent = turn ? t("step.yourTurn") : "";
    });
    back.disabled = state.step === 0;
    next.disabled = state.step >= state.reached && !(state.step === 0 && state.reached === 0);
    drawPlay();
  }

  // ---- rendering --------------------------------------------------------------------------------------
  const handlers = {
    go: (n) => go(n, { keep: true }),
    start: () => begin(1),
    challenge: () => { state.reached = Math.max(state.reached, 4); go(2, { keep: true }); },
    adopt: () => { state.person.decided = true; state.reached = LAST; go(LAST, { keep: true }); },
    undo: (id) => {
      if (state.person.undone.has(id)) state.person.undone.delete(id); else state.person.undone.add(id);
      announce.textContent = t(state.person.undone.has(id) ? "p.announce.undone" : "p.announce.redone");
      render();
    },
    choose: (factor, choice) => {
      state.person.choices.set(factor, choice);
      if (state.person.decided) { state.person.decided = false; state.reached = 4; }
      render();
    },
    setDim: (d) => { state.ui.dim = d; render(); document.querySelector(`.vc-ring__cell[data-dim="${d}"]`)?.focus({ preventScroll: true }); },
    setFactor: (i) => { state.ui.factor = i; render(); document.getElementById("decide-title")?.scrollIntoView?.({ block: "nearest" }); },
    chooseScenario: (id) => chooseScenario(id),
  };

  let lastStep = -1;
  function render() {
    renderStepBar();
    const r = run();
    const ctx = { run: r, step: state.step, reached: state.reached, ui: state.ui, handlers, lang: getLang(), today: appToday().toISOString().slice(0, 10), play: { on: P.on, attention: state.attention } };
    const view = VIEWS[state.step](ctx);
    // Keep focus, open items and scroll across a re-render of the same step.
    const active = document.activeElement;
    const focusKey = active && stage.contains(active) ? keyOf(active) : null;
    const same = lastStep === state.step;
    const scroll = same ? stage.querySelector(".panel")?.scrollTop ?? 0 : 0;
    const open = same ? new Set([...stage.querySelectorAll("details[open]")].map(detailsKey)) : new Set();
    clear(stage);
    stage.dataset.step = R.STEPS[state.step];
    stage.dataset.layout = view.layout || "split";
    const story = h("section", { class: "story", "aria-labelledby": "step-title" }, view.story);
    // From Scan on, whose company it is and that it is fictional stand above every title; Start shows both
    // among its own tags.
    if (state.step > 0) story.querySelector(".story-head")?.prepend(h("p", { class: "story-eyebrow" },
      h("span", { class: "story-company" }, r.company.name),
      r.mode === "simulation" ? h("span", { class: "vc-tag vc-tag--sm fictional" }, h("span", { class: "vc-icon vc-icon--info", "aria-hidden": "true" }), t("start.fictional")) : null));
    stage.append(story);
    if (view.side) stage.append(h("aside", { class: "side", "aria-label": t("ring.aside") }, view.side));
    for (const d of stage.querySelectorAll("details")) if (open.has(detailsKey(d))) d.open = true;
    if (same) { const p = stage.querySelector(".panel"); if (p) p.scrollTop = scroll; }
    if (focusKey) {
      const target = findByKey(focusKey);
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }
    lastStep = state.step;
    renderKpis(r, { estimate: estimate() });
    fill(P.on && !waits() ? P.at / readMs() : 0);
    drawFoot();
  }

  const detailsKey = (d) => `${d.closest("[data-id]")?.dataset.id || ""}|${d.className}|${[...d.parentElement.children].indexOf(d)}`;
  const keyOf = (el) => (el.id ? `#${el.id}` : el.name && el.value ? `input|${el.name}|${el.value}` : el.dataset?.dim ? `dim|${el.dataset.dim}` : el.closest("[data-id]") && el.classList.contains("issue-undo") ? `undo|${el.closest("[data-id]").dataset.id}` : null);
  const findByKey = (key) => {
    if (key.startsWith("#")) return document.getElementById(key.slice(1));
    const [kind, a, b] = key.split("|");
    if (kind === "input") return stage.querySelector(`input[name="${a}"][value="${b}"]`);
    if (kind === "dim") return stage.querySelector(`.vc-ring__cell[data-dim="${a}"]`);
    if (kind === "undo") return stage.querySelector(`[data-id="${a}"] .issue-undo`);
    return null;
  };

  // ---- Play -------------------------------------------------------------------------------------------
  /** How long Play stays on a step: the time to read its title and lead, between 7 and 14 seconds. */
  function readMs() {
    const title = document.getElementById("step-title")?.textContent || "";
    const lead = [...stage.querySelectorAll("[data-read]")].map((e) => e.textContent).join(" ");
    const words = `${title} ${lead}`.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    return Math.min(14000, Math.max(7000, 3000 + 230 * words));
  }

  function play() {
    if (state.reached === 0) { begin(1); }
    else if (finished()) { replay(); }
    P.on = true;
    P.last = 0;
    calm();
    render();
    if (!P.raf) P.raf = requestAnimationFrame(playFrame);
  }

  function pause() {
    if (!P.on) return;
    P.on = false;
    cancelAnimationFrame(P.raf);
    P.raf = 0;
    render();
    armAttention();
  }

  function playFrame(now) {
    P.raf = 0;
    if (!P.on) return;
    const dt = P.last ? Math.min(now - P.last, 100) : 0;
    P.last = now;
    if (P.step !== state.step) Object.assign(P, { step: state.step, at: 0 });
    const total = readMs();
    if (waits()) {
      P.at = 0;
    } else if (finished()) {
      fill(0);
      pause();
      return;
    } else if (state.step < state.reached && !covered()) {
      P.at += dt;
      if (P.at >= total) {
        go(state.step + 1, { focus: false, keep: true });
        P.raf = requestAnimationFrame(playFrame);
        return;
      }
    }
    fill(waits() ? 0 : P.at / total);
    drawFoot(total);
    P.raf = requestAnimationFrame(playFrame);
  }

  /** How far the step is read: the rail to the next step and the bar along the step's action fill with it. */
  function fill(p) {
    const v = Math.max(0, Math.min(1, p)).toFixed(4);
    stepButtons.forEach(({ li }, n) => li.style.setProperty("--vc-step-fill", n === state.step ? v : "0"));
    document.getElementById("btn-cta")?.style.setProperty("--fill", v);
  }

  /** Play, Pause or Replay on the one button before the steps. */
  function drawPlay() {
    const st = P.on ? "pause" : finished() ? "replay" : "play";
    playBtn.dataset.state = st;
    playBtn.querySelector(".vc-icon").className = `vc-icon vc-icon--${st === "pause" ? "pause" : st === "replay" ? "refresh" : "play"}`;
    document.getElementById("play-text").textContent = t(`play.${st}`);
  }

  /** Beside the step's action, in words: when Play moves on, or that the move is the person's. */
  function drawFoot(total = readMs()) {
    const note = document.getElementById("foot-note");
    if (!note) return;
    const words = P.on ? (state.step < state.reached && !waits() ? t("foot.playsOn", { s: Math.max(1, Math.ceil((total - P.at) / 1000)) }) : "") : t("foot.yourMove");
    if (note.textContent !== words) note.textContent = words;
    note.dataset.tone = P.on ? "" : "move";
  }

  // Paused, the step's action draws the eye (Vici's vc-attention) after six seconds without a click, a key
  // or a scroll; any of them calms it again.
  const QUIET_MS = 6000;
  let quiet = 0;
  function calm() {
    state.attention = false;
    document.getElementById("btn-cta")?.classList.remove("vc-attention");
  }
  function armAttention() {
    clearTimeout(quiet);
    calm();
    quiet = setTimeout(() => {
      const cta = document.getElementById("btn-cta");
      if (P.on || !cta || cta.disabled || covered()) return;
      state.attention = true;
      cta.classList.add("vc-attention");
    }, QUIET_MS);
  }
  for (const type of ["pointerdown", "keydown", "wheel"]) document.addEventListener(type, () => { if (!P.on) armAttention(); }, { capture: true, passive: true });
  playBtn.addEventListener("click", () => (P.on ? pause() : play()));

  // ---- navigation -------------------------------------------------------------------------------------
  /** Shows step n. A step chosen by the presenter pauses Play; keep: Next and Play itself go on playing. */
  function go(n, { focus = true, keep = false } = {}) {
    if (!keep) pause();
    if (state.reached === 0 && n > 0) { begin(n); return; }
    const target = Math.max(0, Math.min(state.reached, n));
    const changed = target !== state.step;
    state.step = target;
    if (changed && target >= 1) state.ui.dim = defaultDim(target);
    if (P.step !== state.step) Object.assign(P, { step: state.step, at: 0 });
    syncUrl();
    render();
    announce.textContent = t("p.announce.step", { n: state.step, total: LAST, title: document.getElementById("step-title")?.textContent || "" });
    if (!P.on) armAttention();
    if (focus) document.getElementById("step-title")?.focus({ preventScroll: true });
  }
  back.addEventListener("click", () => go(state.step - 1));
  next.addEventListener("click", () => {
    if (state.step === 0 && state.reached === 0) { begin(1); return; }
    go(state.step + 1, { keep: true });
  });
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]")) return;
    const el = e.target;
    if (el && el.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === " ") {
      if (el?.closest?.("button, a, summary, [role=button], label")) return;
      e.preventDefault();
      if (!e.repeat) (P.on ? pause() : play());
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(state.step + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(state.step - 1); }
  });

  function syncUrl() {
    const u = new URL(location.href);
    u.searchParams.set("scenario", state.scenarioId);
    if (state.step > 0) u.searchParams.set("step", String(state.step)); else u.searchParams.delete("step");
    history.replaceState(null, "", u);
  }

  // ---- runs ---------------------------------------------------------------------------------------------
  /** Starts the run: the agents' first step, or straight to a later step with the recommended choices. */
  function begin(toStep = 1) {
    state.person = freshState();
    state.reached = toStep >= LAST ? LAST : toStep >= 2 ? 4 : 1;
    if (toStep >= LAST) state.person.decided = true;
    state.ui.factor = 0;
    state.step = Math.max(1, Math.min(toStep, LAST));
    state.ui.dim = defaultDim(state.step);
    Object.assign(P, { step: state.step, at: 0 });
    syncUrl();
    render();
    announce.textContent = t("p.announce.step", { n: state.step, total: LAST, title: document.getElementById("step-title")?.textContent || "" });
    document.getElementById("step-title")?.focus({ preventScroll: true });
  }

  /** Replay: the scenario again from the scan, its decision open again. */
  function replay() {
    begin(1);
  }

  function chooseScenario(id) {
    if (!scenarioById(id) || id === state.scenarioId) return;
    pause();
    state.scenarioId = id;
    state.person = freshState();
    state.reached = 0;
    state.step = 0;
    state.ui = { dim: "political", factor: 0 };
    syncUrl();
    render();
    announce.textContent = t("p.announce.scenario", { company: scenario().company.name });
    stage.querySelector(`input[name="scenario"][value="${id}"]`)?.focus({ preventScroll: true });
  }

  onLang(() => { render(); fillGuides(); });

  // ---- start --------------------------------------------------------------------------------------------
  fillGuides();
  const asked = Number(params.get("step"));
  if (Number.isInteger(asked) && asked >= 1 && asked <= LAST) begin(asked);
  else { syncUrl(); render(); }
  armAttention();

  return { state, go, play, pause, begin, get playing() { return P.on; } };
}
