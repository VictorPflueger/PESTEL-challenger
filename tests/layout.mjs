// Every step on a presenter's screen (the layout part of AC-14): at 1920 × 1080 and 1280 × 720, in the
// light and the dark theme, in English and German, on each of the six steps of the default scenario (the
// other two scenarios in the light theme), and at 1600 × 900 and 1366 × 768 between them (the default
// scenario, light, both languages), as it opens and again with every closed part of the stage opened
// (factor items, signals, the tables behind the risk matrix and the horizon strip),
//   fit       no sideways scroll, and the page fits the screen without scrolling (a long list scrolls
//             inside its panel); no panel scrolls sideways, and the risk matrix and the horizon strip keep
//             to their own width with their numbers open;
//   whole     no text is cut to an ellipsis or clipped by its box;
//   header    the brand, the actions and the four figures don't overlap, every figure keeps its name, the
//             actions keep one row, every figure's value keeps one line, and at 1920 the four figures
//             stand at the top right, beside the name and its actions;
//   targets   every button, link, disclosure and control is at least 40 px high and wide (a segmented
//             option's radio, a switch, a slider, a checkbox and a choice at Respond counted by their target);
//   contrast  every piece of text reaches 4.5:1 against its background (3:1 when large);
//   assess    the risk matrix, its key and the horizon strip are in view without scrolling;
//   respond   at 1280 × 720 every option of every factor shows in full above the "Your turn" bar;
//   guide     every chapter of the How it works guide fits its dialog without scrolling, in both languages;
//   summary   Save as PDF, the two files and the Ideator link stand in the window, the report's sheets
//             stay white in either theme, and no table runs past its sheet, also with hyphenation off;
//   live      a live run's form, its dialog (in the window, the start button and notice in view), the wait,
//             editing at Scan and a stop meet the same checks, against the stand-in; a stop's downloads come
//             into view without the page scrolling;
// and saves a screenshot of each step as it opens, for a person to look at. A planted overflow proves the
// checks can fail.
// Usage: node tests/layout.mjs
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, openTool, outDir, report } from "./lib/harness.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const server = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const shots = await outDir("layout");

/** Everything this suite measures on the page as it stands; in an open dialog only, when asked. */
const measure = (page, { dialog = false } = {}) => page.evaluate((inDialog) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("dialog:not([open]), [hidden]"); };
  // The page's parts, or the open dialog's: what a check looks at is one or the other.
  const outside = (el) => (inDialog ? !el.closest("dialog[open]") : !!el.closest("dialog"));
  const doc = document.documentElement;
  const out = { sideways: doc.scrollWidth > doc.clientWidth, tall: doc.scrollHeight > doc.clientHeight + 1, cut: [], overlap: [], small: [], faint: [] };
  // a panel that scrolls sideways, or a figure laid out wider than itself (a table it holds must scroll in its wrap)
  out.wide = [...document.querySelectorAll("#stage .panel, #stage .vc-risk, #stage .vc-horizon")].filter((e) => visible(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `${[...e.classList].join(".")} ${e.scrollWidth}px in ${e.clientWidth}px`);
  // whole: an ellipsis, a line clamp, or text wider or taller than a box that hides its overflow
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || !el.textContent.trim() || outside(el)) continue;
    const s = getComputedStyle(el);
    const hides = ["hidden", "clip"].includes(s.overflowX) || ["hidden", "clip"].includes(s.overflowY);
    if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth) out.cut.push(`ellipsis: ${el.textContent.trim().slice(0, 40)}`);
    if (s.webkitLineClamp && s.webkitLineClamp !== "none") out.cut.push(`line clamp: ${el.textContent.trim().slice(0, 40)}`);
    if (hides && !el.classList.contains("vc-visually-hidden") && !el.closest(".vc-visually-hidden") && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && el.children.length === 0) out.cut.push(`clipped: ${el.textContent.trim().slice(0, 40)}`);
  }
  // header: the three parts and the four tiles never overlap
  const parts = [".brand", ".header-actions", ...[...document.querySelectorAll(".kpi")].map((k) => `#${k.id}`)].map((sel) => [sel, document.querySelector(sel).getBoundingClientRect()]);
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const [a, ra] = parts[i]; const [b, rb] = parts[j];
    if (ra.left < rb.right - 0.5 && rb.left < ra.right - 0.5 && ra.top < rb.bottom - 0.5 && rb.top < ra.bottom - 0.5) out.overlap.push(`${a} and ${b}`);
  }
  // targets: buttons, links, disclosures and the controls Vici draws smaller than their target (a segmented
  // option's radio, a switch, a slider, a checkbox), 40 px each way
  for (const el of document.querySelectorAll("button, a[href], summary, .vc-segmented input, .vc-switch, .vc-slider, .vc-checkbox, select, input.vc-input, textarea, label.option")) {
    if (!visible(el) || outside(el) || el.classList.contains("vc-skip-link")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 39.5 || r.height < 39.5) out.small.push(`${el.textContent.trim() || el.getAttribute("aria-label") || el.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  // contrast: each text node against the first opaque background behind it
  const rgb = (c) => { const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/) || c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); if (!m) return null; const f = c.startsWith("color(") ? 255 : 1; return { r: m[1] * f, g: m[2] * f, b: m[3] * f, a: m[4] === undefined ? 1 : Number(m[4]) }; };
  const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  // The first opaque fill behind a text: a pseudo-element that covers its box and paints under its text
  // (a risk marker's or a ring cell's hexagon: ::after over ::before), else the box's own background.
  const covering = (e, pseudo) => {
    const ps = getComputedStyle(e, pseudo);
    if (ps.content === "none" || ps.content === "normal" || ps.position !== "absolute") return null;
    // It covers the box when every inset is small next to the box: a hexagon's face sits a few pixels
    // inside its edge.
    const r = e.getBoundingClientRect();
    const most = Math.min(12, 0.2 * Math.min(r.width, r.height));
    if (!["top", "right", "bottom", "left"].every((k) => parseFloat(ps[k]) <= most)) return null;
    const c = rgb(ps.backgroundColor);
    return c && c.a > 0.95 ? c : null;
  };
  const background = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = covering(e, "::after") || covering(e, "::before") || rgb(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.95) return c;
    }
    return rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !visible(el) || outside(el) || el.closest(".vc-visually-hidden, .vc-tooltip, [aria-hidden='true']")) continue;
    const s = getComputedStyle(el);
    const fg = rgb(s.color);
    if (!fg) continue;
    const bg = background(el);
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5) - 0.01) out.faint.push(`${n.textContent.trim().slice(0, 30)} ${ratio.toFixed(2)}:1`);
  }
  out.tiles = [...document.querySelectorAll(".kpi .vc-stat__label")].map((l) => l.textContent.trim());
  // header: the actions stand in one row (items whose middles lie within 12 px of each other share a row)
  const middles = [...document.querySelectorAll(".header-actions > *")].filter(visible).map((e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; }).sort((a, b) => a - b);
  out.actionRows = middles.reduce((n, m, i) => n + (i && m - middles[i - 1] > 12 ? 1 : 0), middles.length ? 1 : 0);
  // and each figure's value keeps one line: the old value beside the new one, the new one on a single line
  out.wrapped = [...document.querySelectorAll(".kpi")].filter((k) => {
    const was = k.querySelector(".kpi-was"); const now = k.querySelector(".kpi-value");
    const lines = new Set([...now.getClientRects()].map((r) => Math.round(r.top))).size > 1;
    return lines || (!was.hidden && was.getBoundingClientRect().bottom <= now.getBoundingClientRect().top + 1);
  }).map((k) => k.querySelector(".vc-stat__label").textContent.trim());
  // where the four figures stand: beside the name and its actions (top right) or in a row of their own
  const kpis = document.querySelector(".kpis").getBoundingClientRect();
  const left = Math.max(document.querySelector(".brand").getBoundingClientRect().right, document.querySelector(".header-actions").getBoundingClientRect().right);
  out.topRight = kpis.left >= left - 0.5 && kpis.top < document.querySelector(".brand").getBoundingClientRect().bottom && Math.abs(doc.clientWidth - kpis.right) < 40;
  // An open dialog: inside the window, its body not scrolling sideways, its footer (the start button and the
  // AI notice) in view.
  const open = document.querySelector("dialog[open]");
  if (open) {
    const r = open.getBoundingClientRect();
    const body = open.querySelector(".vc-dialog__body");
    const foot = open.querySelector(".vc-dialog__footer")?.getBoundingClientRect();
    out.dialog = { inside: r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5, sideways: body ? body.scrollWidth > body.clientWidth + 1 : false, footer: !!foot && foot.bottom <= innerHeight + 0.5 && foot.top >= 0 };
  }
  return out;
}, dialog);

/**
 * The report's last bar: Save as PDF, the two files and the Ideator link in the window; and the report's
 * sheets stay white in either theme, as paper does.
 */
async function summaryProblems(page) {
  const s = await page.evaluate(() => {
    const inView = (q) => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5; };
    return { out: ["#btn-cta", "#btn-save-html", "#btn-save-json", "#link-ideator"].filter((q) => !inView(q)),
      sheets: [...new Set([...document.querySelectorAll("#report .vc-report__page")].map((p) => getComputedStyle(p).backgroundColor))] };
  });
  // A browser without German hyphenation (Chromium on Linux, as on GitHub Actions) must not push a table past
  // its sheet either: measured once more with hyphenation switched off.
  const plain = await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(".report, .report * { hyphens: manual !important; }");
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    const wide = [...document.querySelectorAll("#stage .panel, #report .vc-report__page, #report .vc-risk, #report .vc-horizon")]
      .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${[...e.classList].join(".")} ${e.scrollWidth}px in ${e.clientWidth}px`);
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== sheet);
    return wide;
  });
  return {
    fit: [...(s.out.length ? [`summary: out of the window: ${s.out.join(", ")}`] : []), ...plain.map((w) => `summary without hyphenation: ${w}`)],
    faint: s.sheets.join() !== "rgb(255, 255, 255)" ? [`summary: the report's sheets are ${s.sheets.join(", ") || "missing"}, not white`] : [],
  };
}

// ---- the checks can fail ----------------------------------------------------------------------------
{
  const { context, page } = await openTool(browser, { base: server.base, query: "?guide=0" });
  await page.evaluate(() => {
    const p = document.querySelector(".story-lead");
    p.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px";
    document.querySelector(".lang-option").style.cssText = "min-width:0;height:20px;padding:0;--_h:20px";
    document.querySelector(".brand").style.cssText = "position:relative;left:1500px";
    // A segmented option back to its 32 px label: its radio no longer reaches into the control's padding.
    document.querySelector(".vc-segmented input").style.setProperty("inset", "0", "important");
  });
  const m = await measure(page);
  check(m.cut.length > 0 && m.small.length > 1 && m.small.some((x) => /×3\d$/.test(x) && !/^EN|^DE/.test(x)) && m.sideways, `control: a planted ellipsis, a small button, a segmented option without its reach and an overflow are caught (${m.cut[0]}; ${m.small.join("; ")})`);
  await context.close();
}
{
  // A wider action and a narrow figure: the actions take a second row and a value a second line.
  const { context, page } = await openTool(browser, { base: server.base, query: "?guide=0&step=5" });
  await page.waitForSelector('#stage[data-step="summary"]');
  await page.evaluate(() => {
    document.querySelector(".mode-tag").style.minWidth = "900px";
    const k = document.querySelector("#kpi-stake"); k.style.maxWidth = "190px"; k.style.minWidth = "0";
    k.querySelector(".vc-stat__value").style.whiteSpace = "normal";
  });
  const m = await measure(page);
  check(m.actionRows > 1 && m.wrapped.length > 0, `control: actions pushed onto two rows and a squeezed figure are caught (${m.actionRows} rows; ${m.wrapped.join(", ")})`);
  await context.close();
}

{
  // The Summary in the dark theme: a clean one passes; a sheet that follows the theme and a link pushed out
  // of the window are caught.
  const init = { fn: () => { try { localStorage.setItem("vc-theme", "dark"); } catch { /* blocked */ } }, arg: null };
  const { context, page } = await openTool(browser, { base: server.base, query: "?guide=0&step=5", init });
  await page.waitForSelector("#report .vc-report__cover");
  const clean = await summaryProblems(page);
  await page.evaluate(() => {
    document.getElementById("report").setAttribute("data-theme", "dark");
    document.getElementById("link-ideator").style.cssText = "position:fixed;left:-400px";
    // A word no column can hold, which only hyphenation could break.
    const cell = document.querySelector("#report .report-watch tbody td:last-child, #report .report-steps tbody td:last-child");
    cell.textContent = "Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichenhersteller";
    cell.style.cssText = "hyphens:auto;overflow-wrap:normal";
  });
  const planted = await summaryProblems(page);
  const unhyphenated = planted.fit.some((x) => x.startsWith("summary without hyphenation"));
  check(!clean.fit.length && !clean.faint.length && planted.fit.some((x) => x.includes("out of the window")) && unhyphenated && planted.faint.length === 1, `control: the Summary's check passes a clean report in the dark theme and catches a dark sheet, a link out of the window and a word that only hyphenation would break (${[...planted.fit, ...planted.faint].join("; ").slice(0, 300)})`);
  await context.close();
}

// ---- every step, size, theme and language -------------------------------------------------------------
const STEP_NAMES = ["start", "scan", "challenge", "assess", "respond", "summary"];
const RUNS = [];
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme, lang, sc: "s3" });
  for (const sc of ["s1", "s2"]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme: "light", lang, sc });
}
// Two common laptop and office screens between the two ends.
for (const [width, height] of [[1600, 900], [1366, 768]]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme: "light", lang, sc: "s3" });
for (const { width, height, theme, lang, sc } of RUNS) {
  // The theme as a visitor left it, and a record of every transition that starts while the page loads.
  const init = { fn: (dark) => {
    if (dark) { try { localStorage.setItem("vc-theme", "dark"); } catch { /* blocked */ } }
    window.__transitions = [];
    document.addEventListener("transitionrun", (e) => window.__transitions.push(`${e.target.className || e.target.tagName}: ${e.propertyName}`), true);
  }, arg: theme === "dark" };
  const { context, page, errors } = await openTool(browser, { base: server.base, query: `?guide=0&lang=${lang}&scenario=${sc}`, width, height, init });
  await page.evaluate(() => document.fonts.ready);
  // What a visitor sees once the page has settled: no transition still running.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 5000 });
  const run = `${width} × ${height} ${theme} ${lang} ${sc}`;
  if (sc === "s3") {
    const pressed = await page.evaluate(() => [...document.querySelectorAll(".lang-option")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.lang).join());
    check(pressed === lang, `${run}: the language switch shows ${lang} pressed (${pressed})`);
    const flashes = await page.evaluate(() => window.__transitions.filter((t) => /lang-option|vc-button|kpi|guide-open/.test(t)));
    check(!flashes.length, `${run}: no control in the header animates while the page starts${flashes.length ? `: ${flashes.slice(0, 3).join("; ")}` : ""}`);
    check(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === theme, `${run}: the ${theme} theme`);
  }
  const bad = { fit: [], cut: [], overlap: [], small: [], faint: [], header: [] };
  for (let step = 0; step < STEP_NAMES.length; step += 1) {
    if (step) {
      await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=${sc}&step=${step}`);
      await page.waitForSelector(`#stage[data-step="${STEP_NAMES[step]}"]`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(80);
    }
    const name = STEP_NAMES[step];
    for (const state of ["as it opens", "with everything open"]) {
      if (state !== "as it opens") await page.evaluate(() => { for (const d of document.querySelectorAll("#stage details")) d.open = true; });
      const m = await measure(page);
      const at = `${name} ${state}`;
      if (m.sideways || m.tall) bad.fit.push(at);
      for (const w of m.wide) bad.fit.push(`${at}: ${w}`);
      for (const c of m.cut) bad.cut.push(`${at}: ${c}`);
      if (m.overlap.length || m.tiles.length !== 4 || !m.tiles.every(Boolean)) bad.overlap.push(`${at}: ${m.overlap.join(", ")}`);
      for (const x of m.small) bad.small.push(`${at}: ${x}`);
      for (const x of m.faint) bad.faint.push(`${at}: ${x}`);
      if (m.actionRows !== 1) bad.header.push(`${at}: the actions take ${m.actionRows} rows`);
      if (m.wrapped.length) bad.header.push(`${at}: ${m.wrapped.join(", ")} breaks its value`);
      if (width === 1920 && !m.topRight) bad.header.push(`${at}: the figures are not at the top right`);
    }
    if (name === "assess") {
      // One picture: the matrix with its key and the horizon strip in view, before anything is opened.
      await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=${sc}&step=3`);
      await page.waitForSelector('#stage[data-step="assess"]');
      const inView = await page.evaluate(() => {
        const panel = document.querySelector(".assess-panel").getBoundingClientRect();
        return [".matrix .vc-risk__grid", ".matrix .vc-risk__key", ".strip .vc-horizon__lanes"].every((q) => { const r = document.querySelector(q).getBoundingClientRect(); return r.top >= panel.top - 0.5 && r.bottom <= panel.bottom + 0.5; });
      });
      if (!inView) bad.fit.push("assess: the matrix, its key or the horizon strip lies outside the view");
    }
    if (name === "summary") {
      const s = await summaryProblems(page);
      bad.fit.push(...s.fit);
      bad.faint.push(...s.faint);
    }
    if (theme === "light" && sc === "s3") await page.screenshot({ path: path.join(shots, `${width}x${height}-${lang}-${step}-${name}.png`) });
    if (name === "respond" && width === 1280) {
      const n = await page.$$eval(".decide-item", (els) => els.length);
      for (let i = 0; i < n; i += 1) {
        await page.click(`.decide-item >> nth=${i}`);
        const below = await page.evaluate(() => {
          const bar = document.querySelector(".turn-bar").getBoundingClientRect().top;
          return [...document.querySelectorAll(".option")].filter((o) => o.getBoundingClientRect().bottom > bar + 0.5).map((o) => o.querySelector(".option-kind").textContent.trim());
        });
        for (const b of below) bad.fit.push(`respond, factor ${i + 1}: ${b} lies under the bar`);
      }
    }
  }
  check(!bad.fit.length, `${run}: every step fits the screen${bad.fit.length ? `; not: ${bad.fit.slice(0, 4).join("; ")}` : ""}`);
  check(!bad.cut.length, `${run}: no text cut on any step${bad.cut.length ? `: ${bad.cut.slice(0, 4).join("; ")}` : ""}`);
  check(!bad.overlap.length, `${run}: header parts and the four figures stand apart on every step${bad.overlap.length ? `: ${bad.overlap.slice(0, 2).join("; ")}` : ""}`);
  check(!bad.header.length, `${run}: the actions keep one row and every figure one line${width === 1920 ? ", top right," : ""} on every step${bad.header.length ? `; not: ${bad.header.slice(0, 3).join("; ")}` : ""}`);
  check(!bad.small.length, `${run}: every target at least 40 px on every step${bad.small.length ? `: ${bad.small.slice(0, 4).join("; ")}` : ""}`);
  check(!bad.faint.length, `${run}: every text reaches its contrast on every step${bad.faint.length ? `: ${bad.faint.slice(0, 4).join("; ")}` : ""}`);
  check(!errors.length, `${run}: no page or console error${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await context.close();
}
// ---- a live run's screens: the form, the dialog, the wait, editing at Scan, a stop --------------------------
const live = await import("./lib/live.mjs");
const liveSuite = { base: server.base, browser };
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const theme of ["light", "dark"]) {
    for (const lang of ["en", "de"]) {
      const run = `live ${width} × ${height} ${theme} ${lang}`;
      const t = await live.livePage(liveSuite, { lang, width, height, theme, standIn: { faults: [{ agent: "red_team", attempt: 1, error: { status: 401, type: "authentication_error", message: "invalid x-api-key" } }] } });
      const p = t.page;
      const bad = { fit: [], cut: [], small: [], faint: [], header: [], dialog: [] };
      const look = async (at, opts = {}) => {
        await p.evaluate(() => document.fonts.ready);
        // A dialog grows in as it opens: measure it once it has settled.
        await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 5000 }).catch(() => {});
        await p.waitForTimeout(60);
        const m = await measure(p, opts);
        if (!opts.dialog) {
          if (m.sideways || m.tall) bad.fit.push(at);
          for (const w of m.wide) bad.fit.push(`${at}: ${w}`);
          if (m.actionRows !== 1) bad.header.push(`${at}: the actions take ${m.actionRows} rows`);
          if (m.wrapped.length) bad.header.push(`${at}: ${m.wrapped.join(", ")} breaks its value`);
        } else if (!m.dialog || !m.dialog.inside || m.dialog.sideways || !m.dialog.footer) bad.dialog.push(`${at}: ${JSON.stringify(m.dialog)}`);
        for (const c of m.cut) bad.cut.push(`${at}: ${c}`);
        for (const x of m.small) bad.small.push(`${at}: ${x}`);
        for (const x of m.faint) bad.faint.push(`${at}: ${x}`);
        if (theme === "light") await p.screenshot({ path: path.join(shots, `live-${width}x${height}-${lang}-${at.replace(/\W+/g, "-")}.png`) });
      };
      try {
        await p.click("#btn-run-live");
        await p.waitForSelector("#live-name");
        await look("form");
        await p.click("#btn-cta");
        await look("form with errors");
        await live.fillForm(p, { lang });
        await p.click("#btn-cta");
        await p.waitForSelector("#live-dialog[open]");
        await look("dialog", { dialog: true });
        // Vici's live-run dialog: every part shows without scrolling, the estimate too, while no warning shows.
        await p.check("#live-research");
        const fit = await p.evaluate(() => {
          const body = document.querySelector("#live-dialog .vc-live__body").getBoundingClientRect();
          const parts = [...document.querySelectorAll("#live-dialog .vc-live__body > *")].filter((e) => e.offsetParent && !e.hidden);
          return parts.filter((e) => e.getBoundingClientRect().bottom > body.bottom + 0.5).map((e) => e.id || e.className.split(" ").pop());
        });
        if (fit.length) bad.dialog.push(`dialog with research on: out of view without scrolling: ${fit.join(", ")}`);
        await p.uncheck("#live-research");
        await p.click("#live-advanced > summary");
        await look("dialog with Advanced open", { dialog: true });
        await p.keyboard.press("Escape");
        const release = t.net.holdAt(0);
        await live.startRun(p, { waitFor: null });
        await t.net.held(0);
        await p.waitForSelector(".work-card");
        await look("the wait");
        release();
        await live.waitIdle(p);
        await look("scan");
        const first = await p.$eval(".dim-panel .vc-item[data-source='ai']", (e) => e.closest("[data-id]").dataset.id).catch(() => null);
        if (first) {
          await p.click(`[data-id="${first}"] > details > summary`);
          await look("scan with an AI factor open");
          await p.click(`[data-id="${first}"] .item-edit`);
          await look("scan editing a factor");
          await p.click(`[data-id="${first}"] .item-cancel`);
        }
        await live.challenge(p);
        await look("a stop on an error");
        // A stop offers what is done: the PDF and the HTML file in the window, or in view once its panel
        // scrolls to them, as a person would.
        const offer = await p.evaluate(() => {
          const ids = ["#btn-save-pdf", "#btn-save-html"].map((q) => document.querySelector(`.stop-downloads ${q}`));
          if (ids.some((e) => !e)) return "missing";
          ids[0].scrollIntoView({ block: "nearest" });
          const out = ids.filter((e) => { const r = e.getBoundingClientRect(); return !(r.width > 0 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5); });
          return out.length ? `out of the window: ${out.map((e) => e.id).join(", ")}` : (document.documentElement.scrollTop ? "the page scrolled to show them" : "");
        });
        if (offer) bad.fit.push(`the stop's downloads: ${offer}`);
        await look("a stop at its downloads");
      } catch (e) {
        bad.fit.push(`the run failed: ${e.message.split("\n")[0]}`);
      }
      check(!bad.fit.length, `${run}: every live screen fits${bad.fit.length ? `; not: ${bad.fit.slice(0, 4).join("; ")}` : ""}`);
      check(!bad.dialog.length, `${run}: the dialog stays in the window with its start button and notice in view, and with research on every part shows without scrolling${bad.dialog.length ? `; not: ${bad.dialog.slice(0, 2).join("; ")}` : ""}`);
      check(!bad.cut.length, `${run}: no text cut on a live screen${bad.cut.length ? `: ${bad.cut.slice(0, 4).join("; ")}` : ""}`);
      check(!bad.header.length, `${run}: the actions keep one row and every figure one line${bad.header.length ? `; not: ${bad.header.slice(0, 3).join("; ")}` : ""}`);
      check(!bad.small.length, `${run}: every target at least 40 px on the live screens and in the dialog${bad.small.length ? `: ${bad.small.slice(0, 4).join("; ")}` : ""}`);
      check(!bad.faint.length, `${run}: every text reaches its contrast on the live screens and in the dialog${bad.faint.length ? `: ${bad.faint.slice(0, 4).join("; ")}` : ""}`);
      const problems = (await live.pageProblems(t)).filter((x) => !/^console: Failed to load resource/.test(x));
      check(!problems.length, `${run}: no page error${problems.length ? `: ${problems.slice(0, 2).join(" | ")}` : ""}`);
      await t.context.close();

      // A whole live run, with research, to its summary: Challenge as the run opens it, then the summary with
      // the run's own table and Save run as simulation, which no recorded run shows.
      const t2 = await live.livePage(liveSuite, { lang, width, height, theme });
      const q = t2.page;
      const bad2 = { fit: [], cut: [], small: [], faint: [], header: [] };
      const look2 = async (at) => {
        await q.evaluate(() => document.fonts.ready);
        await q.waitForTimeout(60);
        const m = await measure(q);
        if (m.sideways || m.tall) bad2.fit.push(at);
        for (const w of m.wide) bad2.fit.push(`${at}: ${w}`);
        if (m.actionRows !== 1) bad2.header.push(`${at}: the actions take ${m.actionRows} rows`);
        if (m.wrapped.length) bad2.header.push(`${at}: ${m.wrapped.join(", ")} breaks its value`);
        for (const c of m.cut) bad2.cut.push(`${at}: ${c}`);
        for (const x of m.small) bad2.small.push(`${at}: ${x}`);
        for (const x of m.faint) bad2.faint.push(`${at}: ${x}`);
        if (theme === "light") await q.screenshot({ path: path.join(shots, `live-${width}x${height}-${lang}-${at.replace(/\W+/g, "-")}.png`) });
      };
      try {
        await live.fillForm(q, { lang });
        await live.startRun(q, { research: true });
        await live.challenge(q);
        await look2("challenge after the agents");
        await live.adopt(q);
        await q.evaluate(() => { const d = document.querySelector("details.used"); if (d) d.open = true; });
        await look2("summary with what the run used");
        await q.evaluate(() => document.getElementById("btn-save-run")?.scrollIntoView({ block: "nearest" }));
        await look2("summary at Save run as simulation");
      } catch (e) {
        bad2.fit.push(`the run failed: ${e.message.split("\n")[0]}`);
      }
      const all = [...bad2.fit, ...bad2.cut, ...bad2.small, ...bad2.faint, ...bad2.header];
      check(!all.length, `${run}: a whole run's Challenge and summary fit, with no text cut, targets of 40 px and every text at its contrast${all.length ? `; not: ${all.slice(0, 4).join("; ")}` : ""}`);
      await t2.context.close();
    }
  }
}

// ---- the guide: every chapter fits its dialog without scrolling, at both sizes and in both languages ----
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const lang of ["en", "de"]) {
    const { context, page } = await openTool(browser, { base: server.base, query: `?guide=0&lang=${lang}`, width, height });
    await page.click(`[data-vc-guide-open="guide-${lang}"]`);
    await page.waitForSelector(`#guide-${lang}[open]`);
    const scrolled = [];
    const chapters = await page.$$eval(`#guide-${lang} .vc-guide__chapter`, (c) => c.length);
    for (let i = 0; i < chapters; i++) {
      if (i) await page.click(`#guide-${lang} [data-vc-guide-next]`);
      await page.waitForTimeout(120);
      const s = await page.evaluate((id) => {
        const d = document.getElementById(id);
        const el = [d, ...d.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 1 && ["auto", "scroll"].includes(getComputedStyle(e).overflowY));
        return el ? `chapter ${d.querySelector(".vc-guide__chapter:not([hidden]) h3")?.textContent.trim()}: ${el.scrollHeight - el.clientHeight} px more than its box` : null;
      }, `guide-${lang}`);
      if (s) scrolled.push(s);
    }
    check(!scrolled.length, `${width} × ${height} ${lang}: every chapter of the guide fits without scrolling${scrolled.length ? `: ${scrolled.join("; ")}` : ""}`);
    await context.close();
  }
}
console.log(`Screenshots: ${shots}`);

await browser.close();
await server.close();
report(results, "LAYOUT OK");
