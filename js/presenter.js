// The presenter: the step bar, the stage and the four key figures for the recorded runs. The key figures
// answer first: the engine works out the scenario's analysis before anything plays. Play walks the steps
// by itself, each for as long as its words take to read (7 to 14 seconds), and stops wherever the person
// acts: Start the agents, Challenge this analysis, Adopt these responses. Space plays or pauses; a step
// chosen by click, arrow key, clicker (PageDown and PageUp) or ?step= pauses Play. ?scenario=s1&step=4
// plays the run up to that step, with the recommended responses chosen.
//
// A live run (0.3.0) uses the same steps and views. "Run it live" switches the page to LIVE and opens Start
// as an empty form; the agents run in js/pipeline.js and fill the run step by step, the page following
// them; while an agent works its step shows the wait, and where the run stops, why. Play is off in a live
// run, and nothing of it goes into the address. js/session.js holds the form, the run and the decisions;
// "Back to the simulation" keeps them for this tab, "Clear everything" removes them.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/app.js: this tool's steps and its run model, and
// pipeline events in place of its event bus.

import { h, clear } from "./dom.js";
import { t, getLang, onLang } from "./i18n/index.js";
import { DIMENSIONS } from "./engine.js";
import * as R from "./run.js";
import { SCENARIOS, DEFAULT_SCENARIO, scenarioById, runFromScenario, freshState } from "./simulation.js";
import { renderKpis } from "./kpis.js";
import { estimateScenario } from "./estimate.js";
import { appToday } from "./clock.js";
import { session, setInput, updateSession, markResult, markDownloaded, clearEverything, freshPerson, getKey, wouldLose } from "./session.js";
import { createLiveRun, createPipeline, AGENT_STEP } from "./pipeline.js";
import { settingOf } from "./config.js";
import { initLiveDialog } from "./live_dialog.js";
import { scenarioOf, saveName, downloadText } from "./live_save.js";
import { liveStartView, formProblems, controlOf } from "./views/live_start.js";
import { workView, stopView, workFigures } from "./views/live_work.js";
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

  /** Live: the run in flight, its notes for the wait, the factor being edited, the form's problems. */
  const L = { pipeline: null, note: "", errors: [], timer: 0, follow: true };

  const scenario = () => scenarioById(state.scenarioId);
  const isLive = () => session().mode === "live";
  /** The live run with the person's state, as the views and the engine read it. */
  function liveView() {
    const s = session();
    if (!s.run) return draftRun();
    return { ...s.run, undone: s.person.undone, removed: s.person.removed, edits: s.person.edits, choices: s.person.choices, decided: s.person.decided };
  }
  /** Before a live run starts: the form as a run, so the ring counts what the person typed. */
  function draftRun() {
    const s = session();
    const c = s.inputs.company;
    return {
      mode: "live", draft: true, lang: getLang(), as_of: appToday().toISOString().slice(0, 10),
      company: { name: c.name.trim() || t("live.yourCompany"), sector: c.sector || null, country: c.country, what: c.what },
      team: s.inputs.factors.map((f) => ({ ...f })), research: !!s.settings.research, signals: [], scan: null, issues: null, impacts: null,
      responses: null, summary: null, checked: {}, recorded: new Map(), undone: new Set(), removed: new Set(), edits: new Map(),
      choices: new Map(), decided: false, unchecked: new Set(), log: [], spend: { usd: 0, eur: 0 }, cap: s.settings.cap, requests: 0,
    };
  }
  const run = () => (isLive() ? liveView() : runFromScenario(scenario(), getLang(), state.person));
  /** How far a live run has come: 0 the form, 1 scanned, 2 challenged, 3 assessed, 4 responses, 5 summary. */
  function liveReached() {
    const s = session();
    const r = s.run;
    if (!r) return 0;
    const done = r.summary && s.person.decided ? 5 : r.responses ? 4 : r.impacts ? 3 : r.issues ? 2 : r.scan ? 1 : 0;
    const busy = r.working ? AGENT_STEP[r.working.agent] : r.stopped ? stopStep(r) : 0;
    return Math.max(done, busy);
  }
  /** The step that shows a stopped run's reason: where the agent that stopped works. */
  const stopStep = (r) => (r.stopped?.agent ? AGENT_STEP[r.stopped.agent] : r.scan ? 2 : 1);
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

  const decided = () => (isLive() ? session().person.decided : state.person.decided);
  const waits = () => (state.step === 0 && state.reached === 0) || (state.step === 1 && state.reached === 1) || (state.step === 4 && !decided());
  const finished = () => state.step === LAST && decided();
  const covered = () => !!document.querySelector("dialog[open]");

  function renderStepBar() {
    stepButtons.forEach(({ li, b, name, hint }, n) => {
      const current = n === state.step;
      li.classList.toggle("vc-step--current", current);
      li.classList.toggle("vc-step--done", n < state.step);
      if (current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.disabled = n > state.reached;
      name.textContent = t(`step.${R.STEPS[n]}`);
      const working = isLive() && session().run?.working;
      const turn = !working && ((n === 0 && state.reached === 0) || (n === 1 && state.reached === 1) || (n === 4 && state.reached >= 4 && !decided()));
      li.dataset.turn = turn ? "yours" : "";
      hint.textContent = turn ? t("step.yourTurn") : "";
    });
    back.disabled = state.step === 0;
    next.disabled = state.step >= state.reached && !(state.step === 0 && state.reached === 0 && !isLive());
    // Play walks recorded runs; a live run moves at the agents' pace and the person's.
    playBtn.disabled = isLive();
    drawPlay();
    drawMode();
  }

  /** The header's tag: SIMULATION or LIVE, with what each means. */
  function drawMode() {
    const tag = document.getElementById("mode-tag");
    if (!tag) return;
    const live = isLive();
    tag.dataset.mode = live ? "live" : "simulation";
    const word = tag.querySelector("span");
    word.removeAttribute("data-i18n");
    word.textContent = t(live ? "p.mode.live" : "p.mode.sim");
    const tip = document.getElementById("tip-mode");
    if (tip) { tip.removeAttribute("data-i18n"); tip.textContent = t(live ? "p.mode.tip.live" : "p.mode.tip"); }
  }

  // ---- rendering --------------------------------------------------------------------------------------
  const person = () => (isLive() ? session().person : state.person);
  const handlers = {
    go: (n) => go(n, { keep: true }),
    start: () => begin(1),
    challenge: () => {
      if (isLive()) { runStep("challenge"); return; }
      state.reached = Math.max(state.reached, 4); go(2, { keep: true });
    },
    adopt: () => {
      if (isLive()) {
        session().person.decided = true;
        markResult();
        if (session().run?.summary) { syncLive(); go(LAST, { keep: true }); } else runStep("summarise");
        return;
      }
      state.person.decided = true; state.reached = LAST; go(LAST, { keep: true });
    },
    undo: (id) => {
      const p = person();
      if (p.undone.has(id)) p.undone.delete(id); else p.undone.add(id);
      announce.textContent = t(p.undone.has(id) ? "p.announce.undone" : "p.announce.redone");
      if (isLive()) markResult();
      render();
    },
    choose: (factor, choice) => {
      const p = person();
      p.choices.set(factor, choice);
      if (p.decided) { p.decided = false; state.reached = 4; }
      if (isLive()) { markResult(); syncLive(); }
      render();
    },
    // ---- live ----
    runLive: () => enterLive(),
    backToSimulation: () => leaveLive(),
    input: (field, value) => { setInput(field, value); L.errors = L.errors.filter((e) => e.field !== field); clearFieldError(field); refreshSide(); },
    liveStart: () => {
      L.errors = formProblems(session().inputs);
      if (L.errors.length) {
        render();
        document.getElementById(controlOf(L.errors[0].field))?.focus();
        announce.textContent = t(L.errors[0].key, L.errors[0].vars);
        return;
      }
      dialog.open();
    },
    editFactor: (id) => { state.ui.editing = id; render(); if (id) document.getElementById(`edit-${id}-text`)?.focus(); },
    saveFactor: (id, values) => {
      session().person.edits.set(id, values);
      state.ui.editing = null;
      markResult();
      announce.textContent = t("p.announce.edited");
      render();
      stage.querySelector(`[data-id="${id}"] .item-edit`)?.focus();
    },
    removeFactor: (id) => {
      session().person.removed.add(id);
      state.ui.editing = null;
      markResult();
      announce.textContent = t("p.announce.removed");
      render();
      stage.querySelector(".item-putback")?.focus();
    },
    putBackFactor: (id) => {
      session().person.removed.delete(id);
      markResult();
      announce.textContent = t("p.announce.putBack");
      render();
      stage.querySelector(`[data-id="${id}"] summary`)?.focus();
    },
    abort: () => { L.pipeline?.abort(); },
    goOn: () => dialog.open({ continuing: true, preset: session().run?.stopped?.reason === "checks" ? "thorough" : null }),
    clear: () => confirmClear(),
    saveRun: () => {
      const v = liveView();
      downloadText(saveName(v), `${JSON.stringify(scenarioOf(v), null, 2)}\n`);
      markDownloaded();
      announce.textContent = t("p.announce.saved");
    },
    // A cell lists its dimension's factors: the list opens if it was closed and scrolls into view in its
    // panel, so the room sees what the click did; focus stays on the cell for the next one.
    setDim: (d) => {
      state.ui.dim = d;
      render();
      const details = stage.querySelector(".dim-details");
      if (details) details.open = true;
      stage.querySelector(".dim-panel")?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      document.querySelector(`.vc-ring__cell[data-dim="${d}"]`)?.focus({ preventScroll: true });
    },
    setFactor: (i) => { state.ui.factor = i; render(); document.getElementById("decide-title")?.scrollIntoView?.({ block: "nearest" }); },
    chooseScenario: (id) => chooseScenario(id),
  };

  let lastStep = -1;
  /** The view of the step on screen: the simulation's, or a live run's form, wait or stop. */
  function viewFor(ctx) {
    if (!isLive()) return VIEWS[state.step](ctx);
    const r = ctx.run;
    if (state.step === 0) return liveStartView({ ...ctx, form: { inputs: session().inputs, locked: !!session().run, errors: L.errors } });
    if (r.working && AGENT_STEP[r.working.agent] === state.step) return workView({ ...ctx, live: { note: L.note } });
    if (r.stopped && stopStep(r) === state.step) return stopView(ctx);
    return VIEWS[state.step](ctx);
  }

  function render() {
    if (isLive()) state.reached = liveReached();
    renderStepBar();
    const r = run();
    const ctx = { run: r, step: state.step, reached: state.reached, ui: state.ui, handlers, lang: getLang(), today: appToday().toISOString().slice(0, 10), play: { on: P.on, attention: state.attention } };
    const view = viewFor(ctx);
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
    // From Scan on, whose company it is and that it is fictional stand with every title, under it or, on the
    // full stage, beside it; Start shows both among its own tags. A live run says in which language its
    // agents write.
    if (state.step > 0) story.querySelector(".story-title")?.after(h("p", { class: "story-meta" },
      h("span", { class: "story-company" }, r.company.name),
      r.mode === "simulation" ? h("span", { class: "vc-tag vc-tag--sm fictional" }, h("span", { class: "vc-icon vc-icon--info", "aria-hidden": "true" }), t("start.fictional")) : null,
      r.mode === "live" ? h("span", { class: "vc-tag vc-tag--sm vc-tag--feature run-lang", title: t(`live.written.${r.lang}`) }, r.lang.toUpperCase()) : null));
    stage.append(story);
    if (view.side) stage.append(h("aside", { class: "side", "aria-label": t("ring.aside") }, view.side));
    for (const d of stage.querySelectorAll("details")) if (open.has(detailsKey(d))) d.open = true;
    if (same) { const p = stage.querySelector(".panel"); if (p) p.scrollTop = scroll; }
    if (focusKey) {
      const target = findByKey(focusKey);
      if (target && !target.disabled) target.focus({ preventScroll: true });
    }
    lastStep = state.step;
    renderKpis(r, isLive() ? { live: true } : { estimate: estimate() });
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
    if (isLive()) return;
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
    const st = P.on ? "pause" : finished() && !isLive() ? "replay" : "play";
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
    if (isLive()) state.reached = liveReached();
    if (state.reached === 0 && n > 0) { if (!isLive()) begin(n); return; }
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
    if (state.step === 0 && state.reached === 0) { if (isLive()) handlers.liveStart(); else begin(1); return; }
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
      if (!e.repeat && !isLive()) (P.on ? pause() : play());
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(state.step + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(state.step - 1); }
  });

  /** The address names the scenario and the step of the simulation; nothing of a live run goes into it. */
  function syncUrl() {
    const u = new URL(location.href);
    if (isLive()) {
      u.searchParams.delete("scenario");
      u.searchParams.delete("step");
    } else {
      u.searchParams.set("scenario", state.scenarioId);
      if (state.step > 0) u.searchParams.set("step", String(state.step)); else u.searchParams.delete("step");
    }
    history.replaceState(null, "", u);
  }

  // ---- runs ---------------------------------------------------------------------------------------------
  /** Starts the run: the agents' first step, or straight to a later step with the recommended choices. */
  function begin(toStep = 1) {
    if (isLive()) return;
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
    if (isLive() || !scenarioById(id) || id === state.scenarioId) return;
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

  // ---- live ---------------------------------------------------------------------------------------------
  const dialog = initLiveDialog({ onStart: (choices) => startLive(choices) });

  /** "Run it live": the page in LIVE, Start as the form (or the run this tab already holds). */
  function enterLive() {
    pause();
    updateSession({ mode: "live" });
    L.errors = [];
    state.reached = liveReached();
    state.step = session().run ? Math.max(1, Math.min(state.reached, LAST)) : 0;
    state.ui = { dim: "political", factor: 0, editing: null };
    syncUrl();
    // Another mode's screen: nothing of the simulation's scroll or open items carries over.
    lastStep = -1;
    render();
    announce.textContent = t("p.announce.live");
    // The form keeps its notice in view: the first field takes focus without scrolling the panel.
    if (state.step === 0) document.getElementById(controlOf("name"))?.focus({ preventScroll: true });
    else document.getElementById("step-title")?.focus({ preventScroll: true });
  }

  /** Back to the recorded runs; the live run stays in this tab's memory until Clear everything. */
  function leaveLive() {
    if (session().run?.working) L.pipeline?.abort();
    updateSession({ mode: "simulation" });
    state.reached = state.person.decided ? LAST : 0;
    state.step = 0;
    state.ui = { dim: "political", factor: 0 };
    syncUrl();
    lastStep = -1;
    render();
    announce.textContent = t("p.announce.simulation");
    document.getElementById("step-title")?.focus({ preventScroll: true });
  }

  /** "Clear everything": asked once in place, since it cannot be undone. */
  function confirmClear() {
    const btn = document.getElementById("btn-clear");
    if (btn && btn.dataset.confirm !== "yes") {
      btn.dataset.confirm = "yes";
      btn.lastChild.textContent = t(wouldLose() ? "live.clear.confirmLose" : "live.clear.confirm");
      btn.classList.add("vc-button--danger");
      announce.textContent = t("live.clear.ask");
      return;
    }
    L.pipeline?.abort();
    L.pipeline = null;
    L.errors = [];
    clearEverything();
    updateSession({ mode: "live" });
    state.step = 0;
    state.reached = 0;
    state.ui = { dim: "political", factor: 0, editing: null };
    render();
    announce.textContent = t("p.announce.cleared");
    // An empty form starts from its top, the notice in view.
    const panel = stage.querySelector(".panel");
    if (panel) panel.scrollTop = 0;
    document.getElementById(controlOf("name"))?.focus({ preventScroll: true });
  }

  /** The dialog's start: a new run from the form, or the run going on after a stop. */
  function startLive(choices) {
    const s = session();
    const setting = settingOf(choices);
    const today = appToday().toISOString().slice(0, 10);
    if (!s.run) {
      updateSession({ run: createLiveRun({ inputs: s.inputs, lang: getLang(), today, setting, research: choices.research, cap: choices.cap }), person: freshPerson() });
    } else {
      s.run.setting = setting;
      s.run.cap = choices.cap;
      if (!s.run.scan) s.run.research = choices.research;
    }
    const r = session().run;
    const action = !r.scan ? "scan" : !r.responses ? "challenge" : "summarise";
    runStep(action);
  }

  /** Runs one action of the pipeline: the page follows the agents, and settles when they stop. */
  async function runStep(action) {
    const s = session();
    if (!s.run || s.run.working) return;
    L.note = "";
    L.follow = true;
    s.run.stopped = null;
    const pipeline = createPipeline({ run: s.run, view: liveView, key: getKey(), hooks: { onEvent } });
    L.pipeline = pipeline;
    startTimer();
    await pipeline[action]();
    stopTimer();
    L.pipeline = null;
    const r = session().run;
    updateSession({ last: { eur: r.spend.eur, ms: r.ms, preset: r.setting.preset, research: r.research } });
    if (r.scan) markResult();
    if (!r.stopped) {
      // After the challenge the run opens at Challenge, so the person reads the corrections, each with its
      // Undo, before Assess and the decision (brief §6.2); the step's button leads on, as in the simulation.
      const target = action === "scan" ? 1 : action === "challenge" ? 2 : LAST;
      state.reached = liveReached();
      go(target, { keep: true });
    } else {
      state.reached = liveReached();
      go(stopStep(r), { keep: true });
    }
  }

  /** What the pipeline reports: the page moves to the step an agent works on, and shows retries and repairs. */
  function onEvent(e) {
    if (e.type === "working" && e.agent) {
      L.note = "";
      state.reached = liveReached();
      const step = AGENT_STEP[e.agent];
      if (L.follow) { state.step = step; render(); announce.textContent = t(`work.${e.agent}`); } else render();
    } else if (e.type === "step") {
      state.reached = liveReached();
      render();
    } else if (e.type === "retry") {
      L.note = t("work.retry", { s: Math.round(e.waitMs / 1000), n: e.attempt });
      drawNote();
    } else if (e.type === "repair") {
      L.note = t("work.repair", { agent: t(`agent.${e.agent}`) });
      drawNote();
    } else if (e.type === "tokens") {
      L.note = t("work.tokens");
      drawNote();
    } else if (e.type === "cost") {
      renderKpis(run(), { live: true });
      refreshWork();
    } else if (e.type === "request") {
      // The request count moves as each request goes out, not only on the next tick of the clock.
      refreshWork();
    }
  }

  function drawNote() {
    const n = document.getElementById("work-note");
    if (n) n.textContent = L.note;
  }

  /** The time so far and the spend, every second while an agent works, without rebuilding the step. */
  function refreshWork() {
    const old = stage.querySelector(".work-figures");
    const r = session().run;
    if (old && r?.working) old.replaceWith(workFigures(r));
  }
  function startTimer() { stopTimer(); L.timer = setInterval(refreshWork, 1000); }
  function stopTimer() { clearInterval(L.timer); L.timer = 0; }

  /** The ring beside the live form, redrawn as the person types, without touching the form. */
  function refreshSide() {
    if (!isLive() || state.step !== 0) return;
    const aside = stage.querySelector("aside.side");
    const view = viewFor({ run: run(), step: 0, reached: state.reached, ui: state.ui, handlers, lang: getLang(), today: appToday().toISOString().slice(0, 10), play: { on: false } });
    if (aside && view.side) { clear(aside); aside.append(view.side); }
    // Each heading says what fills it: the person's lines, or the Scanner.
    for (const d of DIMENSIONS) {
      const help = document.getElementById(`${controlOf(`lines.${d}`)}-help`);
      if (help) help.textContent = session().inputs.factors.some((f) => f.dimension === d) ? t(`dim.${d}.q`) : t("live.dim.empty");
    }
    const turnText = stage.querySelector(".turn .vc-callout__body > p:not(.vc-callout__title)");
    const count = session().inputs.factors.length;
    if (turnText && !session().run) turnText.textContent = count ? t(`live.turn.${count === 1 ? "one" : "other"}`, { n: count }) : t("live.turn.none");
  }

  /** A field the person corrects loses its error at once. */
  function clearFieldError(field) {
    const el = document.getElementById(controlOf(field));
    if (!el || el.getAttribute("aria-invalid") !== "true") return;
    el.removeAttribute("aria-invalid");
    const err = document.getElementById(`${controlOf(field)}-error`);
    if (err) { err.hidden = true; err.textContent = ""; }
    el.setAttribute("aria-describedby", (el.getAttribute("aria-describedby") || "").split(" ").filter((x) => x && x !== `${controlOf(field)}-error`).join(" "));
  }

  /** A decision changed after the summary: the Writer's text stays, the figures follow. */
  function syncLive() { state.reached = liveReached(); }

  onLang(() => { render(); fillGuides(); dialog.redraw(); });

  // ---- start --------------------------------------------------------------------------------------------
  fillGuides();
  const asked = Number(params.get("step"));
  if (Number.isInteger(asked) && asked >= 1 && asked <= LAST) begin(asked);
  else { syncUrl(); render(); }
  armAttention();

  return { state, go, play, pause, begin, get playing() { return P.on; } };
}
