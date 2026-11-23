// Every step on a presenter's screen (the layout part of AC-14): at 1920 × 1080 and 1280 × 720, in the
// light and the dark theme, in English and German, on each of the six steps of the default scenario (the
// other two scenarios in the light theme), as it opens and again with every closed part of the stage
// opened (factor items, signals, the tables behind the risk matrix and the horizon strip),
//   fit       no sideways scroll, and the page fits the screen without scrolling (a long list scrolls
//             inside its panel);
//   whole     no text is cut to an ellipsis or clipped by its box;
//   header    the brand, the actions and the four figures don't overlap, and every figure keeps its name;
//   targets   every button and link is at least 40 px high and wide;
//   contrast  every piece of text reaches 4.5:1 against its background (3:1 when large);
//   assess    the risk matrix, its key and the horizon strip are in view without scrolling;
//   respond   at 1280 × 720 every option of every factor shows in full above the "Your turn" bar;
//   guide     every chapter of the How it works guide fits its dialog without scrolling, in both languages;
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

/** Everything this suite measures on the page as it stands. */
const measure = (page) => page.evaluate(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("dialog:not([open]), [hidden]"); };
  const doc = document.documentElement;
  const out = { sideways: doc.scrollWidth > doc.clientWidth, tall: doc.scrollHeight > doc.clientHeight + 1, cut: [], overlap: [], small: [], faint: [] };
  // whole: an ellipsis, a line clamp, or text wider or taller than a box that hides its overflow
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || !el.textContent.trim() || el.closest("dialog")) continue;
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
  // targets: buttons and links, 40 px each way
  for (const el of document.querySelectorAll("button, a[href]")) {
    if (!visible(el) || el.closest("dialog") || el.classList.contains("vc-skip-link")) continue;
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
    if (!n.textContent.trim() || !visible(el) || el.closest("dialog, .vc-visually-hidden, .vc-tooltip, [aria-hidden='true']")) continue;
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
  return out;
});

// ---- the checks can fail ----------------------------------------------------------------------------
{
  const { context, page } = await openTool(browser, { base: server.base, query: "?guide=0" });
  await page.evaluate(() => {
    const p = document.querySelector(".story-lead");
    p.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px";
    document.querySelector(".lang-option").style.cssText = "min-width:0;height:20px;padding:0;--_h:20px";
    document.querySelector(".brand").style.cssText = "position:relative;left:1500px";
  });
  const m = await measure(page);
  check(m.cut.length > 0 && m.small.length > 0 && m.sideways, `control: a planted ellipsis, a small button and an overflow are caught (${m.cut[0]}; ${m.small[0]})`);
  await context.close();
}

// ---- every step, size, theme and language -------------------------------------------------------------
const STEP_NAMES = ["start", "scan", "challenge", "assess", "respond", "summary"];
const RUNS = [];
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme, lang, sc: "s3" });
  for (const sc of ["s1", "s2"]) for (const lang of ["en", "de"]) RUNS.push({ width, height, theme: "light", lang, sc });
}
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
  const bad = { fit: [], cut: [], overlap: [], small: [], faint: [] };
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
      for (const c of m.cut) bad.cut.push(`${at}: ${c}`);
      if (m.overlap.length || m.tiles.length !== 4 || !m.tiles.every(Boolean)) bad.overlap.push(`${at}: ${m.overlap.join(", ")}`);
      for (const x of m.small) bad.small.push(`${at}: ${x}`);
      for (const x of m.faint) bad.faint.push(`${at}: ${x}`);
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
  check(!bad.small.length, `${run}: every target at least 40 px on every step${bad.small.length ? `: ${bad.small.slice(0, 4).join("; ")}` : ""}`);
  check(!bad.faint.length, `${run}: every text reaches its contrast on every step${bad.faint.length ? `: ${bad.faint.slice(0, 4).join("; ")}` : ""}`);
  check(!errors.length, `${run}: no page or console error${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await context.close();
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
