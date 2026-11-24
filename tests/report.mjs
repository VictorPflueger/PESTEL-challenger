// The report (brief §9 and §9.1, AC-13, and AC-09's "a capped run's report says so on every page"), in
// Chromium:
//   - the Summary shows the report, page by page, and it keeps Vici's report rule (reportProblems): a cover,
//     every section of brief §9.1, nothing a printed page can't use, the fixed footer and the byline;
//   - Save as PDF prints the report alone, under the report's file name: in the PDF Chromium prints, every
//     page carries "Created with PESTEL Challenger", the address, "Built by Victor Pflüger" and "page x of y"
//     (a German report: "Erstellt mit …", "Erstellt von Victor Pflüger", "Seite x von y"), and none the fixed
//     footer beside them; afterwards the page is as it was;
//   - the cover names the tool, the company, the date, the mode, the model and setting, and says "AI-generated
//     analysis for discussion", a scenario's "Fictional company, illustrative figures" and the
//     public-information notice; the summary is page two; the sources carry the dates read, or the
//     knowledge-cutoff note without research; About this report carries the tool's address, the byline and
//     the disclaimer (brief §9);
//   - Ctrl+P on the Summary prints the report too;
//   - a live run's report prints the same way, its cover naming the live mode, the model and the setting;
//   - a live run stopped at its budget cap offers what is done, and every page of its report says where it
//     stopped.
// Reads the PDF with Vici's scripts/lib/pdf.mjs, so it needs a ViciDesign checkout beside the repository.
// Usage: node tests/report.mjs [--require-vici]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser, serveStatic, APP_ROOT, viciDir, REQUIRE_VICI, report } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, challenge, adopt, runOf } from "./lib/live.mjs";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const vici = viciDir();
if (!vici) {
  console.log("No ViciDesign checkout beside the repository: the report suite needs its PDF reader and report rule.");
  if (REQUIRE_VICI) { check(false, "a ViciDesign checkout sits beside the repository"); report(results, "REPORT OK"); }
  process.exit(0);
}
const { pdfPageTexts } = await import(pathToFileURL(path.join(vici, "scripts/lib/pdf.mjs")).href);
const { reportProblems } = await import(pathToFileURL(path.join(vici, "scripts/lib/report.mjs")).href);

const squeeze = (s) => String(s).replace(/\s+/g, "").normalize("NFKC");
const FOOT = {
  en: { start: "Created with PESTEL Challenger", end: (i, n) => `Built by Victor Pflüger · page ${i} of ${n}` },
  de: { start: "Erstellt mit PESTEL Challenger", end: (i, n) => `Erstellt von Victor Pflüger · Seite ${i} von ${n}` },
};
const ADDRESS = "https://victorpflueger.github.io/PESTEL-challenger/";
const SECTIONS = ["cover", "summary", "dims", "factors", "corrections", "risk", "responses", "watch", "method", "about"];
const T = {
  en: (await import(pathToFileURL(path.join(APP_ROOT, "js/i18n/en.js")).href)).default,
  de: (await import(pathToFileURL(path.join(APP_ROOT, "js/i18n/de.js")).href)).default,
};
const { MODELS } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
const { SCENARIOS } = await import(pathToFileURL(path.join(APP_ROOT, "js/simulation.js")).href);
const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((x) => [x.id, { company: x.company.name, research: !!x.research }]));
const squash = (s) => String(s).replace(/\s+/g, " ").trim();

/** What brief §9 asks of the cover, page two, the sources and the last page: problems, or none. */
function coverProblems(parts, lang, { live = false, research = false, company = "" } = {}) {
  const w = T[lang];
  const out = [];
  const cover = squash(parts.cover);
  const want = [["the tool", "PESTEL Challenger"], ["the company", company], ["the date", w["report.meta.date"]], ["the mode", w[live ? "report.mode.live" : "report.mode.sim"]],
    ["the model and setting", w["report.meta.model"]], ["the AI label", w["report.ai"]], ["the public-information notice", w["live.public"]]];
  if (!live) want.push(["the fictional label", w["start.fictional"]]);
  for (const [what, text] of want) if (!text || !cover.includes(squash(text))) out.push(`the cover lacks ${what} ("${text}")`);
  if (!/\b20\d\d\b/.test(parts.date)) out.push(`the cover's date reads "${parts.date}"`);
  if (live) {
    const model = MODELS.find((m) => parts.model.startsWith(m.label));
    if (!model || !/, \S+ (setting|Einstellung)/.test(parts.model) || !/(effort|Aufwand)/.test(parts.model)) out.push(`the cover's model and setting read "${parts.model}"`);
    if (cover.includes(squash(w["start.fictional"]))) out.push("a live run's cover calls the company fictional");
  } else if (parts.model !== w["report.model.sim"]) out.push(`a scenario's cover names a model: "${parts.model}"`);
  const about = squash(parts.about);
  if (!about.includes(squash(w["report.disclaimer"]))) out.push("About this report lacks the disclaimer");
  if (!parts.address) out.push(`About this report does not link the tool's address ${ADDRESS}`);
  if (research) {
    if (!parts.sources.length || parts.sources.some((x) => !/\b20\d\d\b/.test(x))) out.push(`a run with research lists ${parts.sources.length} sources, not each with its date (${parts.sources.find((x) => !/\b20\d\d\b/.test(x)) || "none"})`);
  } else if (!parts.notes.some((x) => squash(x) === squash(w[live ? "scan.cutoff.live" : "scan.cutoff"]))) out.push("a run without research does not say where the model's knowledge ends");
  return out;
}

// The rule can fail: a clean set of parts passes, and each planted gap is caught.
{
  const w = T.en;
  const clean = {
    cover: ["PESTEL Challenger", "Kestrel Valves", w["report.ai"], w["start.fictional"], w["report.meta.date"], "24 November 2026", w["report.meta.mode"], w["report.mode.sim"], w["report.meta.model"], w["report.model.sim"], w["live.public"]].join(" "),
    date: "24 November 2026", model: w["report.model.sim"], sources: ["A source (read on 23 November 2026)"], notes: [],
    about: `${w["report.about"]} ${w["report.disclaimer"]}`, address: true,
  };
  const ok = coverProblems(clean, "en", { research: true, company: "Kestrel Valves" });
  const planted = {
    "a cover without the AI label": [{ ...clean, cover: clean.cover.replace(w["report.ai"], "") }, {}],
    "a scenario's cover without the fictional label": [{ ...clean, cover: clean.cover.replace(w["start.fictional"], "") }, {}],
    "a cover without the notice": [{ ...clean, cover: clean.cover.replace(w["live.public"], "") }, {}],
    "a live cover without its model": [{ ...clean, cover: clean.cover.replace(w["report.mode.sim"], w["report.mode.live"]).replace(w["start.fictional"], "") }, { live: true }],
    "a last page without the disclaimer": [{ ...clean, about: w["report.about"] }, {}],
    "a last page without the address": [{ ...clean, address: false }, {}],
    "a source without its date": [{ ...clean, sources: ["A source"] }, {}],
    "no cutoff note without research": [clean, { research: false }],
  };
  const missed = Object.entries(planted).filter(([, [parts, o]]) => !coverProblems(parts, "en", { research: true, company: "Kestrel Valves", ...o }).length).map(([name]) => name);
  check(!ok.length && !missed.length, `control: the cover rule passes a clean report and catches ${Object.keys(planted).length - missed.length} of ${Object.keys(planted).length} planted gaps${ok.length ? `; the clean one fails: ${ok.join("; ")}` : ""}${missed.length ? `; missed: ${missed.join(", ")}` : ""}`);
}

/** The cover's, the method page's and the last page's parts, as the Summary shows them. */
const reportParts = (page) => page.evaluate((address) => {
  const r = document.getElementById("report");
  const cover = r.querySelector('[data-page="cover"]');
  const dd = (i) => cover.querySelectorAll(".vc-report__meta dd")[i]?.textContent || "";
  const method = r.querySelector('[data-page="method"]');
  return {
    cover: cover.textContent, date: dd(0), model: dd(2),
    sources: [...method.querySelectorAll(".report-sources li")].map((li) => li.textContent),
    notes: [...method.querySelectorAll(".report-note, .cutoff-note")].map((p) => p.textContent),
    about: r.querySelector('[data-page="about"]').textContent,
    address: !!r.querySelector(`[data-page="about"] a[href="${address}"]`),
  };
}, ADDRESS);

/** The footer on every page of a PDF, in a language: problems, or none. notice: the words every page must hold. */
function footerProblems(pdf, lang, { notice = null, fixed = null } = {}) {
  const pages = pdfPageTexts(pdf).map(squeeze);
  const out = [];
  const start = squeeze(`${FOOT[lang].start}${ADDRESS}`);
  pages.forEach((text, n) => {
    const where = `page ${n + 1} of ${pages.length}`;
    if (text.split(start).length - 1 !== 1) out.push(`${where} lacks "${FOOT[lang].start}" with the address, once`);
    if (!text.includes(squeeze(FOOT[lang].end(n + 1, pages.length)))) out.push(`${where} lacks "${FOOT[lang].end(n + 1, pages.length)}"`);
    if (notice && !text.includes(squeeze(notice))) out.push(`${where} lacks the notice "${notice}"`);
    if (fixed && text.includes(squeeze(fixed))) out.push(`${where} prints the fixed footer beside the margin boxes`);
  });
  return { pages: pages.length, problems: out, texts: pages };
}

/**
 * Presses a print button with the browser's dialog stood in for: the stand-in fires beforeprint, notes what the
 * print would take (the copy and the title) and stops there, so page.pdf() prints the page in that state.
 */
async function pressPrint(page, selector) {
  await page.evaluate(() => {
    window.__print = null;
    window.print = () => {
      dispatchEvent(new Event("beforeprint"));
      const box = document.querySelector("body > [data-vc-print]");
      window.__print = { copy: !!box?.querySelector(".vc-report"), title: document.title };
    };
  });
  await page.click(selector);
  await page.waitForFunction(() => window.__print !== null, null, { timeout: 10000 });
  const printed = await page.evaluate(() => window.__print);
  // In print, the copy alone shows: every other child of body is hidden by the print styles.
  await page.emulateMedia({ media: "print" });
  printed.alone = await page.evaluate(() => { const box = document.querySelector("body > [data-vc-print]"); return !!box && getComputedStyle(box).display !== "none" && [...document.body.children].every((el) => el === box || getComputedStyle(el).display === "none"); });
  await page.emulateMedia({ media: null });
  return printed;
}

/** The print ends: afterprint, as the browser fires it; the copy goes and the title comes back. */
async function endPrint(page) {
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  return page.evaluate(() => ({ copy: !!document.querySelector("[data-vc-print]"), title: document.title }));
}

const { base, close } = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "en-GB" });
await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort("blockedbyclient"));
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

for (const sc of ["s1", "s2", "s3"]) {
  for (const lang of ["en", "de"]) {
    const where = `${sc} ${lang}`;
    await page.goto(`${base}?guide=0&lang=${lang}&scenario=${sc}&step=5`);
    await page.waitForSelector("#report .vc-report__cover");
    const shown = await page.evaluate(() => {
      const r = document.getElementById("report");
      return { html: r.outerHTML, lang: r.getAttribute("lang"), pages: [...r.querySelectorAll(".vc-report__page")].map((p) => p.dataset.page), title: document.title,
        figures: r.querySelectorAll(".report-figures tbody tr").length, inPanel: !!r.closest(".report-panel") };
    });
    const rule = reportProblems(shown.html);
    check(!rule.length, `${where}: the report keeps Vici's report rule${rule.length ? `: ${rule.join("; ")}` : ""}`);
    check(shown.inPanel && SECTIONS.every((s) => shown.pages.includes(s)) && shown.pages[0] === "cover" && shown.pages.at(-1) === "about",
      `${where}: the Summary shows the report with every section of brief §9.1, cover first and About last (${shown.pages.join(", ")})`);
    check(shown.lang === (lang === "de" ? "de" : "en-GB") && shown.figures === 4, `${where}: the report speaks ${lang} and shows the four key figures`);
    const run = SCENARIO_BY_ID[sc];
    const cp = coverProblems(await reportParts(page), lang, { research: run.research, company: run.company });
    check(!cp.length, `${where}: the cover, the sources and About this report carry what brief §9 asks${run.research ? " (sources dated)" : " (the cutoff note)"}${cp.length ? `: ${cp.join("; ")}` : ""}`);

    // Save as PDF: the report alone, under its file name, the footer on every page.
    const printed = await pressPrint(page, "#btn-cta");
    check(printed.copy && printed.alone, `${where}: Save as PDF prints the report alone`);
    check(new RegExp(`^pestel-challenger-[a-z-]+-\\d{4}-\\d{2}-\\d{2}-${lang}$`).test(printed.title), `${where}: the print takes the report's file name, which Save as PDF offers ("${printed.title}")`);
    const fixed = await page.evaluate(() => document.querySelector("body > [data-vc-print] .vc-report__footer > span")?.textContent || "");
    const heads = await page.evaluate(() => [...document.querySelectorAll("body > [data-vc-print] .vc-report__page:not(.vc-report__cover) > :first-child")].map((h) => h.textContent));
    // page.pdf() fires beforeprint and afterprint itself, as a browser's print does: the copy goes after it.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const f = footerProblems(pdf, lang, { fixed });
    check(f.pages >= 10 && !f.problems.length, `${where}: all ${f.pages} pages carry the footer with their number${f.problems.length ? `: ${f.problems.slice(0, 4).join("; ")}` : ""}`);
    const all = f.texts.join("");
    check(heads.length >= 9 && heads.every((h) => all.includes(squeeze(h))), `${where}: the PDF holds every page's heading (${heads.length})`);
    check(f.texts[1]?.includes(squeeze(T[lang]["report.summary"])) && !f.texts[0].includes(squeeze(T[lang]["report.summary"])), `${where}: the management summary opens page two of the PDF`);
    const after = await endPrint(page);
    check(!after.copy && after.title === shown.title, `${where}: after printing the copy is gone and the page has its title back`);
  }
}

// Ctrl+P on the Summary: the browser fires beforeprint itself.
{
  await page.goto(`${base}?guide=0&lang=en&scenario=s2&step=5`);
  await page.waitForSelector("#report");
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  const copy = await page.evaluate(() => !!document.querySelector("body > [data-vc-print] .vc-report"));
  const f = footerProblems(await page.pdf({ preferCSSPageSize: true }), "en");
  const after = await endPrint(page);
  check(copy && !f.problems.length && !after.copy, `Ctrl+P on the Summary prints the report alone, the footer on all ${f.pages} pages, and leaves no copy`);
  // On another step, Ctrl+P prints the page as it is: nothing is copied.
  await page.goto(`${base}?guide=0&lang=en&scenario=s2&step=3`);
  await page.waitForSelector('#stage[data-step="assess"]');
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  check(!(await page.evaluate(() => !!document.querySelector("[data-vc-print]"))), "Ctrl+P on another step copies no report");
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
}
check(!errors.length, `no page error${errors.length ? `: ${errors.slice(0, 3).join("; ")}` : ""}`);
await context.close();
await browser.close();
await close();

// ---- a live run to its end: the same report, its cover naming the live mode, the model and the setting ------------
{
  const suite = await liveSuite();
  const t = await livePage(suite);
  await fillForm(t.page);
  await startRun(t.page);
  await challenge(t.page);
  await adopt(t.page);
  const run = await runOf(t.page);
  check(run?.summary && !run?.stopped, `the live run reached the summary (${run?.stopped ? JSON.stringify(run.stopped) : "not stopped"})`);
  await t.page.waitForSelector("#report .vc-report__cover");
  const html = await t.page.evaluate(() => document.getElementById("report").outerHTML);
  const rule = reportProblems(html);
  check(!rule.length && /data-mode="live"/.test(html), `live: the report keeps Vici's report rule${rule.length ? `: ${rule.join("; ")}` : ""}`);
  const cp = coverProblems(await reportParts(t.page), "en", { live: true, research: !!run?.research, company: run?.company?.name });
  check(!cp.length, `live: the cover names the live mode, the model and the setting, and the sources and About this report carry what brief §9 asks${cp.length ? `: ${cp.join("; ")}` : ""}`);
  const printed = await pressPrint(t.page, "#btn-cta");
  const f = footerProblems(await t.page.pdf({ preferCSSPageSize: true }), "en");
  check(printed.copy && printed.alone && f.pages >= 8 && !f.problems.length, `live: Save as PDF prints the report alone, the footer on all ${f.pages} pages${f.problems.length ? `: ${f.problems.slice(0, 3).join("; ")}` : ""}`);
  await endPrint(t.page);
  await t.context.close();
  await suite.done();
}

// ---- a live run stopped at its budget cap: what is done, and where it stopped on every page ----------------------
{
  const suite = await liveSuite();
  const t = await livePage(suite, { standIn: { usage: { input_tokens: 6000, output_tokens: 3000 } } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", cap: 0.1 });
  if ((await runOf(t.page))?.scan && !(await runOf(t.page))?.stopped) await challenge(t.page);
  const run = await runOf(t.page);
  check(run?.stopped?.reason === "cap", `the live run stopped at its cap (${JSON.stringify(run?.stopped)})`);
  const offers = await t.page.evaluate(() => ({ pdf: !!document.querySelector(".stop-downloads #btn-save-pdf"), html: !!document.querySelector(".stop-downloads #btn-save-html"), json: !!document.querySelector(".stop-downloads #btn-save-json"), hint: document.getElementById("pdf-hint")?.textContent || "" }));
  check(offers.pdf && offers.html && /Save as PDF/.test(offers.hint), `the stopped run offers what is done as PDF and HTML, with the printer hint${offers.json ? ", and the handoff file" : ""}`);
  check(offers.json === !!run?.impacts, `the handoff file is offered only once the Analyst priced the forces (${offers.json ? "offered" : "not offered"}, impacts ${run?.impacts ? "in" : "missing"})`);
  const printed = await pressPrint(t.page, "#btn-save-pdf");
  const notice = await t.page.evaluate(() => document.querySelector("body > [data-vc-print] .vc-report")?.getAttribute("data-vc-notice") || "");
  check(printed.copy && /^Stopped at your budget cap after (Scan|Challenge|Assess|Respond): this report shows what was done\.$/.test(notice), `the stopped run's report carries the notice "${notice}"`);
  const f = footerProblems(await t.page.pdf({ preferCSSPageSize: true }), "en", { notice });
  check(f.pages >= 3 && !f.problems.length, `every one of its ${f.pages} pages says where the run stopped, beside the footer${f.problems.length ? `: ${f.problems.slice(0, 3).join("; ")}` : ""}`);
  await endPrint(t.page);
  await t.context.close();
  await suite.done();
}

report(results, "REPORT OK");
