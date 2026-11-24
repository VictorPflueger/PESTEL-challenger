// Accessibility (AC-14, brief §12), in Chromium at 1280 × 720. Adapted from the Data Quality Agent 2.2.0's
// tests/presenter.mjs (its keyboard pass and its reduced-motion checks), for this tool's steps and dialogs:
//   keyboard   with the keyboard alone a scenario runs from its guide to the Summary: Escape closes the
//              guide, Tab and Enter press each step's action, the arrow keys change a choice at Respond,
//              and the report leaves as PDF and as an HTML file; a live run goes the same way against the
//              stand-in, from Run it live through the form (typed), the live-run dialog (the key typed, the
//              box ticked with Space) and the agents to its Summary;
//   focus      on every step of both runs, in the guide, the method and the live-run dialog, every stop of
//              the Tab order is a visible control and shows that it has the focus: the control looks
//              different focused than not (a pixel comparison of its box, so a ring drawn by an outline, a
//              shadow or a pseudo-element counts alike), and a text field also changes its border, outline
//              or shadow;
//   motion     with reduced motion asked for, no animation or transition runs for a millisecond or more
//              while the guide opens and closes, on any step, as the key figures change after Adopt, in the
//              method dialog, or in the live-run dialog and the agents' wait (Vici shortens them to 0.01 ms,
//              and keeps only a spinner's slow sweep, the one cue that work is happening);
//   names      on every screen, every control has a name, every id is unique, every id a label or an aria
//              attribute points to exists, every picture has its alt text and every dialog its name.
// Each rule fails first on a planted mistake.
// Usage: node tests/access.mjs
import { launchBrowser, serveStatic, APP_ROOT, report } from "./lib/harness.mjs";
import { livePage, MOCK_KEY, runOf, waitIdle } from "./lib/live.mjs";
import { formOf } from "./lib/turns.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const STEPS = ["start", "scan", "challenge", "assess", "respond", "summary"];

const { base, close } = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const suite = { base, browser };

// ---- helpers --------------------------------------------------------------------------------------------

/** Tab until the focus is on `selector`; the number of presses, or null. */
async function tabTo(page, selector, max = 80) {
  for (let i = 1; i <= max; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement?.matches(sel), selector)) return i;
  }
  return null;
}

const stepOf = (page) => page.evaluate(() => document.getElementById("stage")?.dataset.step);

/** The focused control: what it is, whether a person can see it, and its box. */
const focused = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { none: true };
  const st = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  const hidden = !!e.closest("[hidden], dialog:not([open]), [inert]") || st.visibility === "hidden" || st.display === "none";
  const text = e.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select");
  const label = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || e.id || e.tagName).trim().replace(/\s+/g, " ").slice(0, 48);
  // Each control once: repeated controls (every factor's Undo) share their markup, so each gets a number.
  if (!e.__tabKey) e.__tabKey = (window.__tabSeq = (window.__tabSeq || 0) + 1);
  return { none: false, key: e.__tabKey, label, text, hidden, visible: r.width > 0 && r.height > 0 && !hidden,
    box: { x: r.left, y: r.top, w: r.width, h: r.height }, ring: [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|") };
});

/**
 * Whether the focus shows: the control's box, with 6 px around it, looks different focused than blurred, and
 * a text field changes its outline, shadow or border too (a caret alone does not count). The focus goes back
 * where it was, so the Tab order goes on from it.
 */
async function focusShows(page, f) {
  const vw = page.viewportSize();
  const x = Math.max(0, Math.floor(f.box.x - 6));
  const y = Math.max(0, Math.floor(f.box.y - 6));
  const clip = { x, y, width: Math.max(1, Math.min(vw.width - x, Math.ceil(f.box.w + 12))), height: Math.max(1, Math.min(vw.height - y, Math.ceil(f.box.h + 12))) };
  if (clip.width < 2 || clip.height < 2 || y >= vw.height || x >= vw.width) return { shows: false, why: "outside the window" };
  const on = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  const ringOn = f.ring;
  const ringOff = await page.evaluate(() => {
    const e = document.activeElement;
    window.__refocus = e;
    e.blur();
    const st = getComputedStyle(e);
    return [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|");
  });
  const off = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  await page.evaluate(() => { window.__refocus?.focus(); window.__refocus = null; });
  let differs = !on.equals(off);
  if (!differs) {
    // Once more after a frame: a ring is sometimes painted a frame after the focus moves.
    await page.waitForTimeout(120);
    const again = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
    await page.evaluate(() => { const e = window.__refocus = document.activeElement; e.blur(); });
    const offAgain = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
    await page.evaluate(() => { window.__refocus?.focus(); window.__refocus = null; });
    differs = !again.equals(offAgain);
  }
  if (!differs) return { shows: false, why: "looks the same focused and not" };
  if (f.text && ringOn === ringOff) return { shows: false, why: "a text field whose border, outline and shadow stay the same" };
  return { shows: true };
}

/**
 * One full round of the Tab order from where the focus is: every stop, until the first comes round again.
 * Returns the problems: a stop on something hidden, a stop whose focus does not show.
 */
async function tabRound(page, where, { max = 90 } = {}) {
  const problems = [];
  const seen = new Set();
  let stops = 0;
  let first = null;
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const f = await focused(page);
    if (f.none) continue; // the browser's own controls, between the end of the page and its start
    if (first === null) first = f.key;
    else if (f.key === first) break;
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    stops += 1;
    if (!f.visible) { problems.push(`${where}: the focus lands on something hidden (${f.label})`); continue; }
    const s = await focusShows(page, f);
    if (!s.shows) problems.push(`${where}: "${f.label}" ${s.why}`);
  }
  return { stops, problems };
}

/**
 * What runs with motion: animations and transitions that play now for a millisecond or more. Vici's reduced
 * motion shortens every animation and transition to 0.01 ms, which ends within the frame, and keeps a
 * spinner's slow sweep, the only cue that work is happening; neither counts.
 */
const moving = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === "running" || a.playState === "pending")
  .map((a) => ({ a, t: a.effect?.getComputedTiming?.() || {} }))
  .filter(({ a, t }) => (t.duration || 0) >= 1 && !a.effect?.target?.closest?.(".vc-spinner"))
  .map(({ a }) => `${a.animationName || a.transitionProperty || a.constructor.name} on ${a.effect?.target?.tagName?.toLowerCase()}.${[...(a.effect?.target?.classList || [])].slice(0, 2).join(".")}`));

/** Samples motion right after a move and a little later, since a transition may start a frame late. */
async function motionAfter(page, where, out) {
  for (const wait of [0, 40, 160]) {
    if (wait) await page.waitForTimeout(wait);
    for (const m of await moving(page)) out.add(`${where}: ${m}`);
  }
}

/** Names, ids, references, pictures and dialogs on the page as it stands: the problems, or none. */
const nameProblems = (page) => page.evaluate(() => {
  const out = [];
  const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[hidden], dialog:not([open])"); };
  const byId = (id) => document.getElementById(id);
  const textOf = (e) => (e?.textContent || "").replace(/\s+/g, " ").trim();
  const nameOf = (e) => {
    const lb = e.getAttribute("aria-labelledby");
    if (lb) return lb.split(/\s+/).map((id) => textOf(byId(id))).join(" ").trim();
    if (e.getAttribute("aria-label")?.trim()) return e.getAttribute("aria-label").trim();
    if (e.matches("input, select, textarea")) {
      if (e.id) { const l = document.querySelector(`label[for="${CSS.escape(e.id)}"]`); if (l && textOf(l)) return textOf(l); }
      const wrap = e.closest("label"); if (wrap && textOf(wrap)) return textOf(wrap);
      return (e.getAttribute("title") || e.getAttribute("placeholder") || "").trim();
    }
    const alt = [...e.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ");
    return (textOf(e) || alt || e.getAttribute("title") || "").trim();
  };
  // A print copy carries suffixed ids of its own; it is not on screen.
  const live = (e) => !e.closest("body > [data-vc-print]");
  for (const e of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1']), [role=button], [role=tab], [role=radio], [role=checkbox]")) {
    if (!live(e) || !shown(e)) continue;
    if (!nameOf(e)) out.push(`a ${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.className ? `.${String(e.className).split(" ")[0]}` : ""} has no name`);
  }
  const ids = new Map();
  for (const e of document.querySelectorAll("[id]")) if (live(e)) ids.set(e.id, (ids.get(e.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) out.push(`the id "${id}" is used ${n} times`);
  for (const e of document.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], label[for]")) {
    if (!live(e)) continue;
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "for"]) {
      for (const id of (e.getAttribute(attr) || "").split(/\s+/).filter(Boolean)) if (!byId(id)) out.push(`${attr}="${id}" on a ${e.tagName.toLowerCase()} points to nothing`);
    }
  }
  for (const img of document.querySelectorAll("img")) if (live(img) && !img.hasAttribute("alt")) out.push(`a picture without alt text (${img.getAttribute("src")})`);
  for (const d of document.querySelectorAll("dialog[open]")) if (!nameOf(d) && !d.getAttribute("aria-labelledby")) out.push(`an open dialog without a name (${d.id})`);
  if (!document.documentElement.lang) out.push("the page names no language");
  return out;
});

// ---- controls: each rule fails on a planted mistake first ------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${base}?guide=0&scenario=s3`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  // Focus: a button whose focus ring is taken away, through the CSS object model the page's policy allows.
  await page.evaluate(() => {
    const b = document.getElementById("btn-play");
    b.style.setProperty("outline", "none", "important");
    b.style.setProperty("box-shadow", "none", "important");
  });
  const toPlay = await tabTo(page, "#btn-play");
  const planted = toPlay ? await focusShows(page, await focused(page)) : { shows: true };
  const toCta = await tabTo(page, "#btn-cta");
  const clean = toCta ? await focusShows(page, await focused(page)) : { shows: false };
  check(toPlay && toCta && !planted.shows && clean.shows, `control: a control without its focus ring is caught (${planted.why || "missed"}), one with it passes`);
  // Names: a button without a name, a second id, a reference to nothing and a picture without alt text.
  await page.evaluate(() => {
    const extra = document.createElement("div");
    extra.id = "planted";
    const b = document.createElement("button"); b.type = "button"; b.className = "vc-button"; b.append(document.createElement("span"));
    const dup = document.createElement("span"); dup.id = "btn-cta"; dup.textContent = "x";
    const dangling = document.createElement("button"); dangling.type = "button"; dangling.textContent = "y"; dangling.setAttribute("aria-describedby", "nowhere");
    const img = document.createElement("img"); img.src = "favicon.svg"; img.width = 20; img.height = 20;
    extra.append(b, dup, dangling, img);
    document.getElementById("stage").prepend(extra);
  });
  const names = await nameProblems(page);
  const caught = ["has no name", 'id "btn-cta"', "points to nothing", "without alt text"].filter((x) => names.some((p) => p.includes(x)));
  check(caught.length === 4, `control: a nameless button, a second id, a reference to nothing and a picture without alt text are caught (${caught.length} of 4)`);
  await ctx.close();
}
{
  // Motion: without reduced motion, the guide's entrance and the step's call to act do move, and are seen.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto(`${base}?scenario=s3`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const seen = new Set();
  await motionAfter(page, "the guide opening", seen);
  await page.keyboard.press("Escape");
  await page.click("#btn-cta");
  await motionAfter(page, "after Start", seen);
  check(seen.size > 0, `control: without reduced motion the sampler sees what moves (${[...seen].slice(0, 2).join("; ")})`);
  await ctx.close();
}

// ---- keyboard and focus: a scenario from its guide to the Summary ----------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce", acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}?scenario=s3`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await page.waitForSelector("dialog[open]");
  const problems = [];
  const counts = [];
  // The guide that opens by itself: its own Tab round, then Escape.
  {
    const r = await tabRound(page, "the guide");
    problems.push(...r.problems); counts.push(`guide ${r.stops}`);
    problems.push(...(await nameProblems(page)).map((p) => `the guide: ${p}`));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  }
  const path = [];
  for (let s = 0; s < STEPS.length; s += 1) {
    const step = await stepOf(page);
    path.push(step);
    const r = await tabRound(page, step);
    problems.push(...r.problems); counts.push(`${step} ${r.stops}`);
    problems.push(...(await nameProblems(page)).map((p) => `${step}: ${p}`));
    if (step === "summary") break;
    if (step === "respond") {
      // Change the first factor's choice with the arrow keys, then adopt.
      const toRadio = await tabTo(page, ".options input[type=radio]");
      const before = await page.evaluate(() => document.activeElement.value);
      await page.keyboard.press("ArrowDown");
      const after = await page.evaluate(() => [...document.querySelectorAll(".options input[type=radio]:checked")].map((x) => x.value));
      path.push(`choice ${before} to ${after[0]} in ${toRadio} Tabs`);
      if (await tabTo(page, "#btn-cta") === null) { problems.push("respond: Tab never reaches Adopt"); break; }
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => /Next|Weiter|summary|Zusammenfassung/i.test(document.getElementById("btn-cta")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
    }
    if (await tabTo(page, "#btn-cta") === null) { problems.push(`${step}: Tab never reaches the step's action`); break; }
    await page.keyboard.press("Enter");
    await page.waitForFunction((was) => document.getElementById("stage")?.dataset.step !== was, step, { timeout: 8000 }).catch(() => {});
  }
  const atSummary = (await stepOf(page)) === "summary";
  const yourChoice = await page.evaluate(() => [...document.querySelectorAll("#report .report-log li")].some((li) => /, your choice\.$/.test(li.textContent.trim())));
  check(atSummary && yourChoice, `keyboard: a scenario runs from its guide to the Summary with Escape, Tab, Enter and an arrow key, a choice changed at Respond (${path.join(" → ")})`);
  // Save as PDF and the HTML file, by keyboard.
  await page.evaluate(() => { window.__printed = null; window.print = () => { dispatchEvent(new Event("beforeprint")); window.__printed = !!document.querySelector("body > [data-vc-print] .vc-report"); dispatchEvent(new Event("afterprint")); }; });
  const toPdf = await tabTo(page, "#btn-cta");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__printed !== null, null, { timeout: 5000 }).catch(() => {});
  const printed = await page.evaluate(() => window.__printed);
  const toHtml = await tabTo(page, "#btn-save-html");
  const download = toHtml ? await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), page.keyboard.press("Enter")]).then(([d]) => d) : null;
  check(toPdf && printed === true && download && /\.html$/.test(download.suggestedFilename()), `keyboard: Enter on Save as PDF prints the report alone, and on HTML file downloads ${download?.suggestedFilename() || "nothing"}`);
  check(!problems.filter((p) => !/has no name|is used|points to|alt text|dialog without|no language/.test(p)).length, `focus: every stop of the Tab order shows its focus, in the guide and on every step (${counts.join(", ")})${problems.length ? `; ${problems.filter((p) => !/has no name|is used|points to|alt text|dialog without|no language/.test(p)).slice(0, 4).join("; ")}` : ""}`);
  const named = problems.filter((p) => /has no name|is used|points to|alt text|dialog without|no language/.test(p));
  check(!named.length, `names: every control has a name, every id is unique and every reference resolves, in the guide and on every step${named.length ? `; ${named.slice(0, 4).join("; ")}` : ""}`);
  // The method dialog: its own Tab round.
  const toMethod = await tabTo(page, "#btn-method, [aria-controls='method'], button[data-vc-dialog-open='method'], .header-actions button:has(.vc-icon--book)");
  if (toMethod) {
    await page.keyboard.press("Enter");
    await page.waitForSelector("dialog[open]", { timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(300);
  const methodOpen = await page.evaluate(() => document.querySelector("dialog[open]")?.id || null);
  const mr = methodOpen ? await tabRound(page, "the method dialog") : { stops: 0, problems: ["the method dialog did not open by keyboard"] };
  const mn = methodOpen ? await nameProblems(page) : [];
  check(methodOpen && !mr.problems.length && !mn.length, `focus: the method dialog opens by keyboard and every stop shows its focus (${mr.stops} stops)${[...mr.problems, ...mn].length ? `; ${[...mr.problems, ...mn].slice(0, 3).join("; ")}` : ""}`);
  check(!errors.length, `keyboard: no page error${errors.length ? `: ${errors[0]}` : ""}`);
  await ctx.close();
}

// ---- keyboard and focus: a live run against the stand-in ------------------------------------------------
{
  const t = await livePage(suite, {});
  const page = t.page;
  await page.emulateMedia({ reducedMotion: "reduce" });
  const problems = [];
  const counts = [];
  const way = [];
  const form = formOf("s3", "en");
  try {
    if (await tabTo(page, "#btn-run-live") === null) throw new Error("Tab never reaches Run it live");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#live-name");
    {
      const r = await tabRound(page, "the live form");
      problems.push(...r.problems); counts.push(`form ${r.stops}`);
      problems.push(...(await nameProblems(page)).map((p) => `the live form: ${p}`));
    }
    // The form, typed.
    const typeInto = async (sel, text) => { if (await tabTo(page, sel) === null) throw new Error(`Tab never reaches ${sel}`); await page.keyboard.type(text); };
    await typeInto("#live-name", form.company.name);
    if (await tabTo(page, "#live-sector") === null) throw new Error("Tab never reaches the sector");
    const sectorLabel = await page.$eval("#live-sector", (s, v) => [...s.options].find((o) => o.value === v)?.textContent.trim() || "", form.company.sector);
    await page.keyboard.type(sectorLabel.slice(0, 6));
    const sector = await page.$eval("#live-sector", (s) => s.value);
    await typeInto("#live-country", form.company.country);
    await typeInto("#live-what", form.company.what);
    const byDim = {};
    for (const x of form.factors) (byDim[x.dimension] ||= []).push(x.text);
    for (const [d, lines] of Object.entries(byDim)) await typeInto(`#live-lines-${d}`, lines.join("\n"));
    way.push(`form typed (sector ${sector})`);
    // Start the agents: the live-run dialog, by keyboard.
    if (await tabTo(page, "#btn-cta") === null) throw new Error("Tab never reaches Start the agents");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#live-dialog[open]");
    await page.waitForTimeout(300);
    {
      const r = await tabRound(page, "the live-run dialog");
      problems.push(...r.problems); counts.push(`dialog ${r.stops}`);
      problems.push(...(await nameProblems(page)).map((p) => `the live-run dialog: ${p}`));
    }
    await typeInto("#live-key", MOCK_KEY);
    if (await tabTo(page, "#live-ack") === null) throw new Error("Tab never reaches the box");
    await page.keyboard.press("Space");
    if (await tabTo(page, "#live-start") === null) throw new Error("Tab never reaches Start the live run");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector("#live-dialog[open]"), null, { timeout: 10000 });
    await waitIdle(page);
    way.push("dialog: key typed, box ticked, started");
    // The steps: each step's action, by Tab and Enter, until the Summary.
    for (let i = 0; i < 10; i += 1) {
      const step = await stepOf(page);
      const run = await runOf(page);
      if (step === "summary" && run?.summary) break;
      const r = await tabRound(page, `live ${step}`);
      problems.push(...r.problems); counts.push(`${step} ${r.stops}`);
      problems.push(...(await nameProblems(page)).map((p) => `live ${step}: ${p}`));
      if (await tabTo(page, "#btn-cta") === null) throw new Error(`Tab never reaches the action at ${step}`);
      const label = await page.evaluate(() => document.activeElement.textContent.trim());
      way.push(`${step}: ${label}`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      await waitIdle(page).catch(() => {});
    }
  } catch (e) {
    problems.push(`the live run stopped: ${e.message.split("\n")[0]}`);
  }
  const run = await runOf(page);
  const step = await stepOf(page);
  // A live run keeps the decision beside the run, not in it: the report says it was adopted.
  const adopted = await page.evaluate(() => [...document.querySelectorAll("#report .report-log li")].some((li) => li.textContent.trim() === "Adopted these responses."));
  if (step === "summary") {
    const r = await tabRound(page, "live summary");
    problems.push(...r.problems); counts.push(`summary ${r.stops}`);
    problems.push(...(await nameProblems(page)).map((p) => `live summary: ${p}`));
  }
  check(step === "summary" && !!run?.summary && adopted && !run?.stopped, `keyboard: a live run goes from Run it live through the typed form and the live-run dialog to its adopted Summary (${way.join(" → ")}${step === "summary" && adopted ? "" : `; ends at ${step}, summary ${!!run?.summary}, adopted ${adopted}, stopped ${JSON.stringify(run?.stopped || null)}`})`);
  const focusP = problems.filter((p) => !/has no name|is used|points to|alt text|dialog without|no language/.test(p));
  const nameP = problems.filter((p) => /has no name|is used|points to|alt text|dialog without|no language/.test(p));
  check(!focusP.length, `focus: every stop of the Tab order shows its focus in the live run (${counts.join(", ")})${focusP.length ? `; ${focusP.slice(0, 4).join("; ")}` : ""}`);
  check(!nameP.length, `names: every control of the live run has a name, every id is unique and every reference resolves${nameP.length ? `; ${nameP.slice(0, 4).join("; ")}` : ""}`);
  await t.context.close();
}

// ---- motion: nothing moves with reduced motion ----------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const seen = new Set();
  await page.goto(`${base}?scenario=s3`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await motionAfter(page, "the guide opening", seen);
  await page.keyboard.press("Escape");
  await motionAfter(page, "the guide closing", seen);
  for (let s = 0; s < STEPS.length - 1; s += 1) {
    const step = await stepOf(page);
    if (step === "respond") {
      await page.evaluate(() => { const r = [...document.querySelectorAll(".options input[type=radio]")].find((x) => !x.checked && x.value !== "accept"); r?.closest("label")?.click(); });
      await motionAfter(page, "a choice at Respond", seen);
    }
    await page.click("#btn-cta");
    await motionAfter(page, `after ${step}`, seen);
    if (step === "respond") { await page.click("#btn-cta").catch(() => {}); await motionAfter(page, "on to the Summary", seen); }
  }
  await page.click(".header-actions button:has(.vc-icon--book)").catch(() => {});
  await motionAfter(page, "the method dialog", seen);
  await page.keyboard.press("Escape");
  await motionAfter(page, "the method dialog closing", seen);
  await ctx.close();
  // The live-run dialog and the agents' wait.
  const t = await livePage(suite, {});
  await t.page.emulateMedia({ reducedMotion: "reduce" });
  await t.page.click("#btn-run-live");
  await t.page.waitForSelector("#live-name");
  await motionAfter(t.page, "the live form", seen);
  const { fillForm } = await import("./lib/live.mjs");
  await fillForm(t.page);
  await t.page.click("#btn-cta");
  await t.page.waitForSelector("#live-dialog[open]");
  await motionAfter(t.page, "the live-run dialog", seen);
  await t.page.fill("#live-key", MOCK_KEY);
  await t.page.check("#live-ack");
  const release = t.net.holdAt(0);
  await t.page.click("#live-start");
  await t.net.held(0);
  await t.page.waitForSelector(".work-card");
  await motionAfter(t.page, "the agents' wait", seen);
  release();
  await waitIdle(t.page);
  await motionAfter(t.page, "the scan drawn", seen);
  await t.context.close();
  check(!seen.size, `motion: with reduced motion nothing moves: the guide, every step, a choice and the key figures after Adopt, the method dialog, the live form and dialog, the agents' wait${seen.size ? `; ${[...seen].slice(0, 4).join("; ")}` : ""}`);
}

await browser.close();
await close();
report(results, "ACCESS OK");
