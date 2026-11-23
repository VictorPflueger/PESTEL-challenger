// The How it works guides behave as Vici's standard says (components/guide.html), in each language:
//   en       Vici's own scripts/check-guide-render.mjs, run on this page over http: opens once per tab
//            with focus on Next, chapter moves, the rail, Escape, reopening, the last button Start,
//            no reopening after a reload, ?guide=0 and ?guide=present, full screen on a phone
//   de       the same in German (?lang=de, a German browser): the German guide opens by itself, the
//            English one stays closed and its header button hidden, "1 von 4", "Kapitel", Weiter,
//            Zurück, Starten; one guide in two languages, so a reload after switching doesn't reopen it
//   fit      at 1280 × 720 and 1920 × 1080 every chapter of both guides fits without scrolling
//   figures  in each language the How it works chapter has a row for every key figure, and every figure in
//            the guide (data-fig) carries the engine's value for the default scenario: before the decision
//            the same as the tiles show, after it the same as the tiles show once the recorded responses
//            are adopted; the talk track has three to seven timed steps, each with a sentence to say, and
//            its minutes add up to what its title promises
// Adapted from Duty Radar 2.1.0: Vici's script does the English guide, this file the rest.
// Usage: node tests/guide-behaviour.mjs [--require-vici]
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { APP_ROOT, REQUIRE_VICI, viciDir, launchBrowser, serveStatic, report } from "./lib/harness.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const server = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const errors = [];

// ---- en: Vici's own guide check ---------------------------------------------------------------------
const dir = viciDir();
if (!dir) {
  check(!REQUIRE_VICI, `${REQUIRE_VICI ? "FAIL" : "SKIP"}: no ViciDesign checkout beside the repository, so Vici's guide check did not run`);
} else {
  try {
    // Asynchronously, so this process keeps serving the page while Vici's script loads it.
    const { stdout: out } = await promisify(execFile)(process.execPath, [path.join(dir, "scripts", "check-guide-render.mjs"), server.base], { encoding: "utf8", env: process.env, timeout: 120000 });
    check(/GUIDE BEHAVIOUR OK/.test(out), `en: Vici's guide check passes on the English guide (${out.trim().split("\n")[0]})`);
  } catch (e) {
    check(false, `en: Vici's guide check failed: ${String(e.stderr || e.stdout || e.message).trim().split("\n").slice(0, 6).join(" | ")}`);
  }
}

// ---- de: the German guide ---------------------------------------------------------------------------
const state = (page, id) => page.evaluate((gid) => {
  const d = document.getElementById(gid);
  const shown = [...d.querySelectorAll(".vc-guide__chapter")].filter((c) => !c.hidden);
  return {
    open: d.open, chapters: d.querySelectorAll(".vc-guide__chapter").length, shown: shown.map((c) => c.dataset.vcChapter),
    count: d.querySelector(".vc-guide__count").textContent.trim(), next: d.querySelector("[data-vc-guide-next]").textContent.trim(),
    back: d.querySelector("[data-vc-guide-back]").textContent.trim(), rail: d.querySelector(".vc-guide__rail")?.getAttribute("aria-label") || "",
    focusNext: !!document.activeElement?.matches("[data-vc-guide-next]"),
  };
}, id);
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "de-DE" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${server.base}?lang=de`);
  await page.waitForTimeout(400);
  let de = await state(page, "guide-de");
  const en = await state(page, "guide-en");
  check(de.open && !en.open, "de: in a new tab the German guide opens by itself and the English one stays closed");
  check(de.shown.join() === "what" && de.focusNext, "de: it opens on its first chapter with focus on Weiter");
  check(de.count === `1 von ${de.chapters}` && de.back === "Zurück" && de.next === "Weiter", `de: count, Zurück and Weiter in German ("${de.count}", "${de.back}", "${de.next}")`);
  check(await page.evaluate(() => document.querySelector('[data-vc-guide-open="guide-en"]').hidden && !document.querySelector('[data-vc-guide-open="guide-de"]').hidden), "de: only the German guide's header button shows");
  await page.click("#guide-de .vc-guide__rail .vc-step__button >> nth=-1");
  await page.waitForTimeout(150);
  de = await state(page, "guide-de");
  check(de.shown.join() === "present" && de.next === "Starten", `de: the rail jumps to the talk track, whose button reads Starten ("${de.next}")`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(!(await state(page, "guide-de")).open, "de: Escape closes it");
  await page.click('[data-vc-guide-open="guide-de"]');
  await page.waitForTimeout(150);
  de = await state(page, "guide-de");
  check(de.open && de.shown.join() === "what", "de: the header button reopens it at its first chapter");
  for (let i = 0; i < de.chapters; i++) await page.click("#guide-de [data-vc-guide-next]");
  await page.waitForTimeout(150);
  check(!(await state(page, "guide-de")).open, "de: Starten on the last chapter closes it");
  await page.reload();
  await page.waitForTimeout(400);
  check(!(await state(page, "guide-de")).open, "de: a reload in the same tab doesn't open it again");
  await page.goto(`${server.base}?lang=en`);
  await page.waitForTimeout(400);
  check(!(await state(page, "guide-en")).open, "en after de: one guide in two languages, so the English one doesn't open in the same tab");
  const p2 = await ctx.newPage();
  await p2.goto(`${server.base}?lang=de&guide=0`);
  await p2.waitForTimeout(300);
  check(!(await state(p2, "guide-de")).open, "de: ?guide=0 keeps it closed");
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "de-DE" });
  const p3 = await ctx2.newPage();
  await p3.goto(`${server.base}?lang=de&guide=present`);
  await p3.waitForTimeout(400);
  const present = await state(p3, "guide-de");
  check(present.open && present.shown.join() === "present", "de: ?guide=present opens the German talk track");
  await ctx.close();
  await ctx2.close();
}

// ---- figures: the guide's figures are the engine's ----------------------------------------------------------
for (const lang of ["en", "de"]) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=s3`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const tile = () => page.evaluate(() => Object.fromEntries(["stake", "pressure", "readiness", "cost"].map((k) => {
    const v = document.querySelector(`#kpi-${k} .kpi-value`);
    const tail = v.querySelector(".kpi-tail")?.textContent ?? "";
    return [k, v.textContent.slice(0, v.textContent.length - tail.length).trim()];
  })));
  const figs = () => page.evaluate((l) => {
    const out = {};
    for (const el of document.querySelectorAll(`#guide-${l} [data-fig]`)) (out[el.dataset.fig] ??= new Set()).add(el.textContent.trim());
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
  }, lang);
  const before = await tile();
  const f = await figs();
  const one = (k) => (f[k] && f[k].length === 1 ? f[k][0] : `(${(f[k] || []).join(" / ")})`);
  const rows = await page.evaluate((l) => {
    const table = document.querySelector(`#guide-${l} [data-vc-chapter="how"] table`);
    return [...table.tBodies[0].rows].map((r) => r.cells[0].textContent.trim());
  }, lang);
  const labels = await page.evaluate((l) => [...document.querySelectorAll("[data-vc-kpi]")].map((k) => (l === "de" ? k.dataset.vcKpiDe : k.dataset.vcKpi)), lang);
  check(labels.length === 4 && labels.every((x) => rows.includes(x)), `figures (${lang}): the How it works chapter has a row for each of the ${labels.length} key figures (${rows.join(", ")})`);
  check(one("stake.before") === before.stake && one("pressure.before") === before.pressure && one("readiness.before") === before.readiness && one("cost.balanced") === before.cost,
    `figures (${lang}): before the decision the guide's figures are the tiles' (${one("stake.before")}, ${one("pressure.before")}, ${one("readiness.before")}, ${one("cost.balanced")})`);
  // Adopt the recorded (recommended) responses and read the tiles again.
  await page.goto(`${server.base}?guide=0&lang=${lang}&scenario=s3&step=5`);
  await page.waitForSelector('#stage[data-step="summary"]');
  const after = await tile();
  check(one("stake.after") === after.stake && one("pressure.after") === after.pressure && one("readiness.after") === after.readiness,
    `figures (${lang}): after the decision the guide's figures are the tiles' (${one("stake.after")}, ${one("pressure.after")}, ${one("readiness.after")})`);
  const empty = Object.entries(f).filter(([, v]) => v.some((x) => !x || x === "…")).map(([k]) => k);
  check(!empty.length, `figures (${lang}): every figure in the guide is filled${empty.length ? `; empty: ${empty.join(", ")}` : ""}`);
  const track = await page.evaluate((l) => {
    const ch = document.querySelector(`#guide-${l} [data-vc-chapter="present"]`);
    const steps = [...ch.querySelectorAll("ol.vc-guide__path > li")].map((li) => ({
      min: Number((li.querySelector(".vc-guide__time")?.textContent.match(/[\d.,]+/) || ["0"])[0].replace(",", ".")),
      say: /[“"„][^“”"„]{3,}[”"“]/.test(li.textContent),
    }));
    return { title: ch.querySelector("h3").textContent, steps };
  }, lang);
  const total = track.steps.reduce((n, x) => n + x.min, 0);
  const promised = { five: 5, fünf: 5, six: 6, sechs: 6, seven: 7, sieben: 7, four: 4, vier: 4 }[(track.title.match(/\b(four|five|six|seven|vier|fünf|sechs|sieben)\b/i) || [])[1]?.toLowerCase()];
  check(track.steps.length >= 3 && track.steps.length <= 7 && track.steps.every((x) => x.min > 0 && x.say) && total === promised,
    `figures (${lang}): the talk track has ${track.steps.length} timed steps, each with a sentence to say, adding up to ${total} minutes as "${track.title}" promises`);
  await ctx.close();
}

// ---- fit: every chapter of both guides without scrolling ---------------------------------------------
for (const [width, height] of [[1280, 720], [1920, 1080]]) {
  for (const lang of ["en", "de"]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto(`${server.base}?lang=${lang}`);
    await page.waitForTimeout(400);
    const id = `guide-${lang}`;
    const chapters = await page.evaluate((gid) => document.getElementById(gid).querySelectorAll(".vc-guide__chapter").length, id);
    const overflow = [];
    for (let i = 0; i < chapters; i++) {
      await page.click(`#${id} .vc-guide__rail .vc-step__button >> nth=${i}`);
      await page.waitForTimeout(120);
      const m = await page.evaluate((gid) => {
        const d = document.getElementById(gid);
        const scrollers = [d, ...d.querySelectorAll("*")].filter((el) => el.scrollHeight > el.clientHeight + 1 && ["auto", "scroll"].includes(getComputedStyle(el).overflowY));
        const r = d.getBoundingClientRect();
        return { scrollers: scrollers.length, fits: r.bottom <= innerHeight + 0.5 && r.top >= -0.5, chapter: [...d.querySelectorAll(".vc-guide__chapter")].find((c) => !c.hidden)?.dataset.vcChapter };
      }, id);
      if (m.scrollers || !m.fits) overflow.push(m.chapter);
    }
    check(!overflow.length, `fit ${width} × ${height} ${lang}: all ${chapters} chapters fit without scrolling${overflow.length ? `; scrolls: ${overflow.join(", ")}` : ""}`);
    await ctx.close();
  }
}

check(!errors.length, `no page or console error${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
await server.close();
report(results, "GUIDE BEHAVIOUR OK");
