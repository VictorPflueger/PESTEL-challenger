// A page opened from a file (Vici's partner review looks at it): browsers run no module from file://, so the
// page's program never starts there. index.html carries a note in the stage that js/main.js draws the steps
// over; when nothing does, the note shows after two seconds and says what to do.
//   file      opened from the file system, the note shows after two seconds in the page's language (English
//             first, German with ?lang=de), the other language's words stay hidden, it links the live site,
//             its link is a 40 px target, and the guide, which Vici's plain script runs, still opens and
//             closes with Escape;
//   served    over http the steps replace the note as the page starts: it never shows, even when the
//             program arrives a second and a half late;
//   control   before its two seconds the note is hidden, and with its animation taken away it never shows,
//             so the visibility check can fail.
// Usage: node tests/from-file.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, report } from "./lib/harness.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const LIVE = "https://victorpflueger.github.io/PESTEL-challenger/";
const fileUrl = pathToFileURL(path.join(APP_ROOT, "index.html")).href;

/** The note as a person sees it: shown or not, which language, its link and the link's box. */
const look = (page) => page.evaluate(() => {
  const note = document.querySelector("#stage .from-file");
  if (!note) return { present: false };
  const shownBlocks = [...note.querySelectorAll(".from-file-lang")].filter((b) => getComputedStyle(b).display !== "none");
  const block = shownBlocks[0];
  const link = block?.querySelector("a");
  const r = link?.getBoundingClientRect();
  const box = note.getBoundingClientRect();
  return {
    present: true,
    visible: getComputedStyle(note).visibility === "visible" && box.width > 0 && box.height > 0,
    inView: box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
    langs: shownBlocks.map((b) => b.getAttribute("lang")),
    title: block?.querySelector("h2")?.textContent.trim() ?? "",
    href: link?.getAttribute("href") ?? "",
    target: r ? Math.round(Math.min(r.width, r.height)) : 0,
    started: document.documentElement.dataset.ready === "true",
  };
});

const browser = await launchBrowser();

// ---- file: the note after two seconds, in the page's language ------------------------------------------
for (const [lang, query, title] of [["en", "", "Open the page from its web address"], ["de", "?lang=de", "Öffnen Sie die Seite über ihre Webadresse"]]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${fileUrl}${query}`);
  await page.waitForTimeout(600);
  const early = await look(page);
  // Vici's guide opens by itself here too; Escape closes it, as it does on the served page.
  const guideOpen = await page.evaluate(() => !!document.querySelector("dialog[open]"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2200);
  const late = await look(page);
  const guideClosed = await page.evaluate(() => !document.querySelector("dialog[open]"));
  check(early.present && !early.visible, `file ${lang}: in its first two seconds the note stays hidden (visible: ${early.visible})`);
  check(!late.started && late.visible && late.inView, `file ${lang}: the program never starts from a file, and after two seconds the note shows in the window`);
  check(late.langs.join() === (lang === "de" ? "de" : "en-GB") && late.title === title, `file ${lang}: it speaks ${lang} only ("${late.title}", ${late.langs.join(", ")})`);
  check(late.href === LIVE && late.target >= 40, `file ${lang}: it links the live site with a 40 px target (${late.href}, ${late.target} px)`);
  check(guideOpen && guideClosed, `file ${lang}: the guide opens by itself and Escape closes it`);
  await page.screenshot({ path: path.join(process.env.PESTEL_TEST_OUT || "/tmp", `from-file-${lang}.png`) });
  await context.close();
}

// ---- served: the steps replace the note as the page starts ------------------------------------------------
const { base, close } = await serveStatic(APP_ROOT);
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${base}?guide=0`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
  const now = await look(page);
  await page.waitForTimeout(2300);
  const later = await look(page);
  check(!now.present && !later.present, "served: the steps replace the note as the page starts, and it never comes back");
  await context.close();
}
{
  // The program a second and a half late: the note is still hidden while it waits, and gone once it starts.
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.route("**/js/main.js", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  const page = await context.newPage();
  // Not waiting for load, which waits for the late program too.
  await page.goto(`${base}?guide=0`, { waitUntil: "commit" });
  await page.waitForSelector("#stage .from-file", { state: "attached", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  const waiting = await look(page);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 15000 });
  const started = await look(page);
  check(waiting.present && !waiting.visible && !started.present, `served late: while the program loads the note stays hidden (visible: ${waiting.visible}), and the steps replace it`);
  await context.close();
}

// ---- control: without its animation the note never shows, so the check above can fail ---------------------
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(fileUrl);
  // Through the CSS object model, which the page's policy allows where it refuses a style tag.
  await page.evaluate(() => document.querySelector("#stage .from-file").style.setProperty("animation", "none", "important"));
  await page.waitForTimeout(2600);
  const planted = await look(page);
  check(planted.present && !planted.visible, "control: with its animation taken away the note stays hidden, and the check sees it");
  await context.close();
}

await browser.close();
await close();
report(results, "FROM FILE OK");
