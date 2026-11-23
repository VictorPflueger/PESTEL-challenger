// The How it works guides behave as Vici's standard says (components/guide.html), in each language:
//   en       Vici's own scripts/check-guide-render.mjs, run on this page over http: opens once per tab
//            with focus on Next, chapter moves, the rail, Escape, reopening, the last button Start,
//            no reopening after a reload, ?guide=0 and ?guide=present, full screen on a phone
//   de       the same in German (?lang=de, a German browser): the German guide opens by itself, the
//            English one stays closed and its header button hidden, "1 von 4", "Kapitel", Weiter,
//            Zurück, Starten; one guide in two languages, so a reload after switching doesn't reopen it
//   fit      at 1280 × 720 and 1920 × 1080 every chapter of both guides fits without scrolling
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
