// The live-run dialog (brief §5.3 after PLAN.md section 15's cuts; Vici's .vc-live, ViciDesign#36): the
// key, the setting, research, Advanced (model and effort), the budget cap, the acknowledgement, what the
// page found that is usually private, the estimate, and "Start the live run" with the AI notice. The
// markup sits in index.html; this module gives it its behaviour:
//   - the key goes in a password field with show and hide, is held in memory only (js/keystore.js through
//     js/session.js), is checked first with the free GET /v1/models call, which also says whether the
//     chosen model is available, shows masked once held, and "Forget key" clears it; the field is emptied
//     as soon as the key is held or the dialog closes;
//   - the box is unticked at every opening, and the start button stays disabled until the key looks right
//     and the box is ticked;
//   - the dialog refuses to work inside another page's frame;
//   - the warning lists what is usually private in the form (js/privacy.js); it warns, it does not block;
//   - the estimate (js/estimate.js) follows every choice, and after a live run in this tab shows what
//     that run cost and took.
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/live_dialog.js: Vici's markup, the setting,
// research, the cap, the warning and the estimate.

import { t, getLang } from "./i18n/index.js";
import { checkKey } from "./anthropic.js";
import { apiMessage } from "./api_messages.js";
import { getKey, hasKey, setKey, forgetKey, looksLikeKey, maskKey, session, updateSession } from "./session.js";
import { privateFindings } from "./privacy.js";
import { estimateLive } from "./estimate.js";
import { settingOf, CAP, FX_USD_EUR, ANTHROPIC } from "./config.js";
import { fmtCost, fmtCostRange, fmtMinutes } from "./format.js";
import { dimName } from "./plain.js";

const $ = (id) => document.getElementById(id);

/** True when the page runs inside another page's frame, where a key must never be typed. */
export function framed(win = window) {
  try { return win.top !== win.self; } catch { return true; }
}

/**
 * The settings the dialog shows: the setting, research, the cap, and the model and effort only where the
 * person changed them under Advanced; until then Advanced follows the setting.
 */
function readChoices(dialog) {
  const preset = document.querySelector('input[name="live-setting"]:checked')?.value || "balanced";
  const base = settingOf({ preset });
  const touched = !!dialog.dataset.advancedTouched;
  const model = $("live-model").value;
  const effort = $("live-effort").value;
  return {
    preset,
    research: $("live-research").checked,
    model: touched && model !== base.model ? model : null,
    effort: touched && effort !== base.effort ? effort : null,
    cap: Math.min(CAP.max, Math.max(CAP.min, Number($("live-cap").value) || CAP.default)),
  };
}

/** Where a finding sits, in words. */
function whereOf(f) {
  if (f.field.startsWith("factor:")) return t("privacy.where.factor", { dim: dimName(f.dimension) });
  return t(`privacy.where.${f.field}`);
}

/**
 * Wires the dialog. onStart(choices) runs once the key is held and checked; the dialog is closed by then.
 * Returns { open({ continuing, preset }) }.
 */
export function initLiveDialog({ onStart }) {
  const dialog = $("live-dialog");
  if (!dialog) return { open() {} };
  const keyField = $("live-key");
  const show = $("live-key-show");
  const status = $("live-key-status");
  const start = $("live-start");
  const ack = $("live-ack");
  let checking = false;
  let continuing = false;

  const isFramed = framed();

  function drawKey() {
    const held = hasKey();
    $("live-current").hidden = !held;
    $("live-masked").textContent = held ? maskKey() : "";
  }

  function drawSetting() {
    const c = readChoices(dialog);
    $("live-setting-help").textContent = t(`dlg.setting.help.${c.preset}`);
    $("live-lang").textContent = t("dlg.lang", { lang: t(`lang.name.${getLang()}`) });
    // Advanced follows the setting until the person changes it there.
    if (!dialog.dataset.advancedTouched) {
      const base = settingOf({ preset: c.preset });
      $("live-model").value = base.model;
      $("live-effort").value = base.effort;
    }
    const searches = ANTHROPIC.webSearchTool.max_uses;
    $("live-research-help").textContent = t("dlg.research.help", { money: fmtCost((searches * ANTHROPIC.webSearchUsdPer1000 / 1000) * FX_USD_EUR), n: searches });
  }

  function drawWarning() {
    const found = privateFindings(session().inputs);
    const box = $("live-warning");
    const list = $("live-warning-list");
    while (list.firstChild) list.removeChild(list.firstChild);
    for (const f of found) {
      const li = document.createElement("li");
      li.textContent = t(`privacy.${f.kind}`, { where: whereOf(f), word: f.word ?? "" });
      list.append(li);
    }
    box.hidden = !found.length;
  }

  function drawEstimate() {
    const c = readChoices(dialog);
    const s = session();
    const e = estimateLive({ inputs: s.inputs, lang: getLang(), preset: c.preset, model: c.model, effort: c.effort, research: c.research, last: s.last });
    const el = $("live-estimate");
    while (el.firstChild) el.removeChild(el.firstChild);
    const strong = (text) => Object.assign(document.createElement("strong"), { textContent: text });
    const parts = t(e.basis === "measured" ? "dlg.estimate.measured" : "dlg.estimate", { cost: "\u0001", time: "\u0002" }).split(/(\u0001|\u0002)/);
    for (const p of parts) el.append(p === "\u0001" ? strong(fmtCostRange(e.eur.low, e.eur.high)) : p === "\u0002" ? strong(fmtMinutes(e.seconds.low, e.seconds.high)) : document.createTextNode(p));
    if (c.cap < e.eur.high) el.append(document.createTextNode(` ${t(c.cap < e.eur.low ? "dlg.estimate.capLow" : "dlg.estimate.cap")}`));
    if (e.last) el.append(document.createTextNode(` ${t("dlg.estimate.last", { cost: fmtCost(e.last.eur), time: fmtMinutes(e.last.seconds, e.last.seconds) })}`));
    if (continuing && s.run) el.append(document.createTextNode(` ${t("dlg.estimate.spent", { cost: fmtCost(s.run.spend.eur) })}`));
    // Requests that broke off, went unanswered or were aborted under way report no usage: their worst case counts
    // against the cap.
    if (continuing && s.run?.unmetered > 0) el.append(document.createTextNode(` ${t("dlg.estimate.held", { cost: fmtCost(s.run.unmetered) })}`));
  }

  function drawStart() {
    const typed = keyField.value.trim();
    const keyOk = typed ? looksLikeKey(typed) : hasKey();
    start.disabled = isFramed || checking || !keyOk || !ack.checked;
  }

  function setStatus(text, tone = "") {
    status.textContent = text;
    status.classList.toggle("vc-help--error", tone === "error");
  }

  function drawAll() {
    drawKey();
    drawSetting();
    drawWarning();
    drawEstimate();
    drawStart();
  }

  // ---- events ---------------------------------------------------------------------------------------
  keyField.addEventListener("input", () => {
    keyField.removeAttribute("aria-invalid");
    const typed = keyField.value.trim();
    setStatus(typed && !looksLikeKey(typed) ? t("dlg.key.format") : "", typed && !looksLikeKey(typed) ? "error" : "");
    drawStart();
  });
  show.addEventListener("click", () => {
    const visible = keyField.type === "text";
    keyField.type = visible ? "password" : "text";
    show.setAttribute("aria-pressed", String(!visible));
    show.setAttribute("aria-label", t(visible ? "dlg.key.show" : "dlg.key.hide"));
    show.querySelector(".vc-icon").className = `vc-icon vc-icon--${visible ? "eye" : "eye-off"}`;
  });
  $("live-forget").addEventListener("click", () => {
    forgetKey();
    setStatus(t("dlg.key.forgotten"));
    drawKey();
    drawStart();
    keyField.focus();
  });
  for (const r of document.querySelectorAll('input[name="live-setting"]')) r.addEventListener("change", () => { delete dialog.dataset.advancedTouched; drawSetting(); drawEstimate(); });
  for (const id of ["live-model", "live-effort"]) $(id).addEventListener("change", () => { dialog.dataset.advancedTouched = "true"; drawEstimate(); });
  $("live-research").addEventListener("change", drawEstimate);
  $("live-cap").addEventListener("input", drawEstimate);
  ack.addEventListener("change", drawStart);
  dialog.addEventListener("close", () => {
    // The key never lingers in the field: held in memory, or gone.
    keyField.value = "";
    keyField.type = "password";
    show.setAttribute("aria-pressed", "false");
    show.querySelector(".vc-icon").className = "vc-icon vc-icon--eye";
    setStatus("");
  });

  start.addEventListener("click", async () => {
    if (start.disabled) return;
    const typed = keyField.value.trim();
    const key = typed || getKey();
    const choices = readChoices(dialog);
    const model = settingOf(choices).model;
    // A key typed now is checked first; the key held in memory passed that check when it was set, so the
    // dialog keeps no copy of it (js/keystore.js holds the one).
    if (typed) {
      checking = true;
      drawStart();
      setStatus(t("dlg.key.checking"));
      const r = await checkKey(key);
      checking = false;
      if (!r.ok) {
        const m = apiMessage(r);
        setStatus(t(m.key, m.vars), "error");
        keyField.setAttribute("aria-invalid", "true");
        drawStart();
        keyField.focus();
        return;
      }
      if (r.missing?.includes(model)) {
        setStatus(t("dlg.key.missing", { model: model === "claude-sonnet-5-5" ? "Sonnet 5.5" : "Haiku 5.5" }), "error");
        drawStart();
        return;
      }
    }
    setKey(key);
    keyField.value = "";
    updateSession({ settings: { ...session().settings, ...choices } });
    dialog.close();
    onStart(choices);
  });

  return {
    /** Opens the dialog: at every opening the box is unticked and the key field empty. */
    open({ continuing: going = false, preset = null } = {}) {
      continuing = going;
      const s = session().settings;
      const p = preset || s.preset;
      for (const r of document.querySelectorAll('input[name="live-setting"]')) r.checked = r.value === p;
      delete dialog.dataset.advancedTouched;
      const base = settingOf({ preset: p });
      if (!preset && (s.model || s.effort)) {
        $("live-model").value = s.model || base.model;
        $("live-effort").value = s.effort || base.effort;
        dialog.dataset.advancedTouched = "true";
      }
      $("live-research").checked = !!s.research;
      // Research runs before the Scanner; once the scan is done it cannot be switched on for this run.
      $("live-research").disabled = !!session().run?.scan;
      const cap = $("live-cap");
      cap.value = String(s.cap);
      cap.dispatchEvent(new Event("input", { bubbles: true }));
      ack.checked = false;
      keyField.value = "";
      $("live-frame").hidden = !isFramed;
      // A key the API rejected during the run is of no further use: it is forgotten, and the field asks for
      // another with the reason beside it.
      const stopped = session().run?.stopped;
      const rejected = going && stopped?.reason === "error" && stopped.error?.status === 401 && hasKey();
      if (rejected) forgetKey();
      for (const el of dialog.querySelectorAll("input, select, details, .vc-live__forget")) if (isFramed) el.setAttribute("disabled", "");
      setStatus(rejected ? t("api.unauthorized") : "", rejected ? "error" : "");
      if (rejected) keyField.setAttribute("aria-invalid", "true"); else keyField.removeAttribute("aria-invalid");
      drawAll();
      if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
      (hasKey() ? ack : keyField).focus();
    },
    /** Redraws the words in the page's language after a switch. */
    redraw() { if (dialog.open) drawAll(); },
  };
}
