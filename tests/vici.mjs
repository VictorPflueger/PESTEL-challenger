// Vici's own rules, checked with Vici's own functions (Build a prototype, "Before you share it"; AC-01):
// the How it works guides and the key figures they explain (guideProblems), the byline (bylineProblems),
// the Writing guideline's checkable patterns (writingProblems), the AI notice of a page that can start a
// live run (aiNoticeProblems) and names rather than record ids (recordIdProblems). They run on the page,
// on every string of both languages and on the documents. Also the page's frame from Vici's brief:
// SIMULATION in the header, one sentence and the byline under it, and the four key figures in order.
// From 0.2.0 the same writing and record-id checks run on every text of the three scenarios in both
// languages and on every step's rendered screen, where Vici's framework and risk-matrix checks run too
// (tests/lib/screens.mjs renders them in Chromium).
// Each imported check first fails on a planted control. Prints VICI CONTROLS OK and VICI STANDARDS OK.
// The functions come from a ViciDesign checkout (VICI_DIR, or ../ViciDesign); without one the suite says
// so and passes, unless --require-vici is given or it runs on GitHub Actions.
// Adapted from the Data Quality Agent 2.2.0: this tool's page, strings and data.
// Usage: node tests/vici.mjs [--require-vici]
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, viciDir, launchBrowser, serveStatic } from "./lib/harness.mjs";
import { eachScreen } from "./lib/screens.mjs";
import EN from "../js/i18n/en.js";
import DE from "../js/i18n/de.js";
import { KPIS, SECTORS } from "../data/kpis.js";
import { REQUESTS } from "../js/schemas.js";

const dir = viciDir();
if (!dir) {
  console.log(`${REQUIRE_VICI ? "FAIL" : "SKIP"}  no ViciDesign checkout in VICI_DIR or next to this repository (../ViciDesign)`);
  process.exit(REQUIRE_VICI ? 1 : 0);
}
const lib = async (file) => import(pathToFileURL(path.join(dir, "scripts", "lib", file)).href);
const { guideProblems } = await lib("guide.mjs");
const { bylineProblems } = await lib("byline.mjs");
const { writingProblems } = await lib("writing.mjs");
const { aiNoticeProblems, AI_NOTICE } = await lib("ai.mjs");
const { recordIdProblems } = await lib("ids.mjs");
const { frameworkProblems } = await lib("framework.mjs");
const { riskMatrixProblems } = await lib("risk.mjs");
const { SCENARIOS } = await import(pathToFileURL(path.join(APP_ROOT, "js/simulation.js")).href);
const { SOURCES } = await import(pathToFileURL(path.join(APP_ROOT, "data/sources.js")).href);

const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");
const html = read("index.html");
const page = (paragraphs) => `<html lang="en-GB"><body>${paragraphs.map((t) => `<p>${String(t).replace(/</g, "&lt;")}</p>`).join("")}</body></html>`;
const controls = [];
const standards = [];
const control = (ok, what) => controls.push([!!ok, what]);
const check = (ok, what) => standards.push([!!ok, what]);

// The ids of the tool's data: KPI and sector ids, and every enum value with an underscore that the
// agents' answers carry. None may reach a screen. The dimension ids are English words and stay out.
const ids = new Set([...KPIS.map((k) => k.id), ...SECTORS.map((s) => s.id).filter((s) => s.includes("_"))]);
JSON.stringify(REQUESTS, (k, v) => { if (k === "enum" && Array.isArray(v)) v.filter((x) => typeof x === "string" && x.includes("_")).forEach((x) => ids.add(x)); return v; });

// ---- the checks can fail ----------------------------------------------------------------------------
control(guideProblems(html.replace(/<dialog\b[^>]*vc-guide[\s\S]*?<\/dialog>/g, "")).length > 0, "control: guideProblems catches a page without the guides");
control(guideProblems(html.replace(/data-vc-kpi="Readiness"/, 'data-vc-kpi="Resilience"')).some((p) => /Resilience/.test(p)), "control: guideProblems catches a key figure the How it works chapter never explains");
control(guideProblems(html.replace('lang="de" aria-labelledby="guide-de-title"', 'lang="en-GB" aria-labelledby="guide-de-title"')).length > 0, "control: guideProblems catches two guides in one language");
control(bylineProblems(html.replace(/href="https:\/\/victorpflueger\.github\.io\/VIP\/index\.html"/, 'href="#"')).length > 0, "control: bylineProblems catches a byline without the website link");
control(writingProblems(page(["The tiles waited for 62 days — far too long."])).length > 0 && writingProblems(page(["A seamless fix."])).length > 0, "control: writingProblems catches an em dash and a stock word");
control(aiNoticeProblems(html.split(AI_NOTICE.en).join("An assistant").split(AI_NOTICE.de).join("Ein Assistent")).length > 0, "control: aiNoticeProblems catches a page that can run live and never says it is an AI");
control(recordIdProblems("Churn moved in energy_utilities.customer_churn", ids).length > 0 && recordIdProblems("Supply customer churn moved", ids).length === 0, "control: recordIdProblems catches a KPI id on screen and passes its name");
const AREA = '<section class="vc-framework__area"><header class="vc-framework__head"><h2 class="vc-framework__title">Legal</h2></header><ul class="vc-framework__items"><li><details class="vc-item" data-source="ai"><summary class="vc-item__summary"><span class="vc-item__mark"><span class="vc-icon vc-icon--sparkle"></span></span><span class="vc-item__text">A rule</span><span class="vc-item__states">STATE</span></summary></details></li></ul></section>';
control(frameworkProblems(AREA.replace("STATE", "")).length > 0 && !frameworkProblems(AREA.replace("STATE", '<span class="vc-tag vc-tag--sm vc-item__state vc-item__state--source">AI</span>')).length, "control: frameworkProblems catches an AI item without its word and passes one with it");
control(riskMatrixProblems('<figure class="vc-risk"><figcaption>Threats</figcaption><div class="vc-risk__grid"></div></figure>').length > 0, "control: riskMatrixProblems catches a matrix without its axes, key and table");

// ---- the page ---------------------------------------------------------------------------------------
const g = guideProblems(html);
check(!g.length, `both guides follow Vici's standard, each with a row for every key figure in its language${g.length ? `: ${g.join("; ")}` : ""}`);
check(/<h2 class="vc-dialog__title" id="guide-en-title">How the prototype works<\/h2>/.test(html) && /<h2 class="vc-dialog__title" id="guide-de-title">So funktioniert der Prototyp<\/h2>/.test(html), "the guides are titled How the prototype works and So funktioniert der Prototyp");
check(/<dialog class="vc-dialog vc-guide" id="guide-en"[^>]*\bdata-vc-guide-auto\b/.test(html) && /<dialog class="vc-dialog vc-guide" id="guide-de"[^>]*\bdata-vc-guide-auto\b/.test(html), "both guides carry data-vc-guide-auto; js/lang.js keeps it on the one in the page's language");
const kpis = [...html.matchAll(/\bdata-vc-kpi="([^"]+)"/g)].map((m) => m[1]);
check(kpis.join("|") === "At stake a year|Dimensions under pressure|Readiness|Session cost", `the header marks its four key figures in order (${kpis.join(", ")})`);
const kpisDe = [...html.matchAll(/\bdata-vc-kpi-de="([^"]+)"/g)].map((m) => m[1]);
check(kpisDe.join("|") === [DE["kpi.atStake"], DE["kpi.pressure"], DE["kpi.readiness"], DE["kpi.cost"]].join("|"), `each figure names itself in German as its tile does (${kpisDe.join(", ")})`);
const b = bylineProblems(html);
check(!b.length, `the byline follows Vici's standard${b.length ? `: ${b.join("; ")}` : ""}`);
const w = writingProblems(html);
check(!w.length, `index.html keeps Vici's writing rules${w.length ? `: ${w.join("; ")}` : ""}`);
const ai = aiNoticeProblems(html);
check(!ai.length, `the page that can connect to a model says it is an AI system, in both languages${ai.length ? `: ${ai.join("; ")}` : ""}`);
check(html.includes(AI_NOTICE.en) && html.includes(AI_NOTICE.de), "the notice stands in each guide in its language");
const r = recordIdProblems(html, ids);
check(!r.length, `index.html shows no record id${r.length ? `: ${r.join("; ")}` : ""}`);

// ---- the frame of Vici's brief ----------------------------------------------------------------------
const header = (html.match(/<header class="app-header">([\s\S]*?)<\/header>\s*<div class="intro">/) || [])[1] || "";
check(/>SIMULATION</.test(header), "SIMULATION stands in the header");
check(/data-vc-guide-open="guide-en"[^>]*>[\s\S]*?How it works/.test(header) && /data-vc-theme-toggle/.test(header) && /lang-switch/.test(header), "the header holds How it works, the theme toggle and EN | DE");
check(/<div class="intro">\s*<p class="intro-text"[^>]*>[^<]+<\/p>\s*<p class="vc-byline">/.test(html), "one sentence and the byline stand right under the header");
check(EN["intro.sentence"] === "AI agents complete a PESTEL analysis, challenge it, put a figure on each outside force and propose what to do or watch. The simulation uses fictional companies; a live run uses your company and your Claude key.", "the sentence under the header is the brief's (§8)");
check(/vc-cell--lilac[^>]*><span class="vc-icon vc-icon--radar">/.test(header), "the radar icon stands in a lilac hexagon (D2)");

// ---- every string, in both languages ----------------------------------------------------------------
for (const [lang, dict] of [["en", EN], ["de", DE]]) {
  const texts = Object.values(dict);
  const ws = writingProblems(page(texts));
  check(!ws.length, `${lang}: ${texts.length} strings keep Vici's writing rules${ws.length ? `: ${ws.join("; ")}` : ""}`);
  const rs = recordIdProblems(texts.join("\n"), ids);
  check(!rs.length, `${lang}: no string shows a record id${rs.length ? `: ${rs.join("; ")}` : ""}`);
}
for (const k of KPIS) {
  const rs = recordIdProblems(`${k.name.en}. ${k.definition.en} ${k.name.de}. ${k.definition.de}`, [...ids].filter((x) => x !== k.id));
  if (rs.length) check(false, `${k.id}: its words show a record id: ${rs.join("; ")}`);
}
check(true, `${KPIS.length} KPI names and definitions show no record id`);
const kw = writingProblems(page(KPIS.flatMap((k) => [k.name.en, k.definition.en, k.name.de, k.definition.de])));
check(!kw.length, `the KPI library's words keep Vici's writing rules${kw.length ? `: ${kw.join("; ")}` : ""}`);

// ---- every scenario text and every source, in both languages ------------------------------------------
// A scenario's prose is every text it holds in both languages ({ en, de }), plus what the company does.
const isText = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && typeof v.en === "string" && typeof v.de === "string";
const proseOf = (v, lang, out = []) => { if (isText(v)) out.push(v[lang]); else if (Array.isArray(v)) v.forEach((x) => proseOf(x, lang, out)); else if (v && typeof v === "object") Object.values(v).forEach((x) => proseOf(x, lang, out)); return out; };
for (const sc of SCENARIOS) {
  for (const lang of ["en", "de"]) {
    const texts = [...proseOf(sc, lang), sc.texts?.[lang]?.what ?? ""].filter((x) => x.trim());
    const ws = writingProblems(page(texts));
    check(!ws.length, `${sc.id} ${lang}: ${texts.length} scenario texts keep Vici's writing rules${ws.length ? `: ${ws.join("; ")}` : ""}`);
    const rs = recordIdProblems(texts.join("\n"), ids);
    check(!rs.length, `${sc.id} ${lang}: no scenario text shows a record id${rs.length ? `: ${rs.join("; ")}` : ""}`);
  }
}
{
  const texts = SOURCES.flatMap((x) => [x.title.en, x.title.de, x.fact?.en, x.fact?.de]).filter(Boolean);
  const ws = writingProblems(page(texts));
  check(!ws.length, `the ${SOURCES.length} sources' titles and facts keep Vici's writing rules${ws.length ? `: ${ws.join("; ")}` : ""}`);
}

// ---- every step's rendered screen ----------------------------------------------------------------------
{
  const server = await serveStatic(APP_ROOT);
  const browser = await launchBrowser();
  const found = { writing: [], ids: [], framework: [], matrix: [] };
  let screens = 0;
  const errors = await eachScreen(browser, server.base, ({ sc, lang, name, html, text }) => {
    screens += 1;
    const where = `${sc} ${lang} ${name}`;
    for (const p of writingProblems(page(text.split(/\n+/).filter((t) => t.trim())))) found.writing.push(`${where}: ${p}`);
    for (const p of recordIdProblems(text, ids)) found.ids.push(`${where}: ${p}`);
    if (/\bvc-framework__area\b/.test(html)) for (const p of frameworkProblems(html)) found.framework.push(`${where}: ${p}`);
    if (/\bvc-risk__grid\b/.test(html)) for (const p of riskMatrixProblems(html)) found.matrix.push(`${where}: ${p}`);
  });
  await browser.close();
  await server.close();
  check(screens === 36 && !errors.length, `all ${screens} screens rendered (three scenarios, two languages, six steps) without a page error${errors.length ? `: ${errors[0]}` : ""}`);
  check(!found.writing.length, `every screen's words keep Vici's writing rules${found.writing.length ? `: ${found.writing.slice(0, 3).join("; ")}` : ""}`);
  check(!found.ids.length, `no screen shows a record id${found.ids.length ? `: ${found.ids.slice(0, 3).join("; ")}` : ""}`);
  check(!found.framework.length, `every factor list on screen keeps Vici's framework rules${found.framework.length ? `: ${found.framework.slice(0, 3).join("; ")}` : ""}`);
  check(!found.matrix.length, `every risk matrix on screen keeps Vici's rules${found.matrix.length ? `: ${found.matrix.slice(0, 3).join("; ")}` : ""}`);
}

// ---- the documents ----------------------------------------------------------------------------------
for (const doc of ["README.md", "DATA_SOURCES.md", "TECH_NOTES.md", "REVIEW.md", "DESIGN.md"]) {
  let text;
  try { text = read(doc); } catch { check(false, `${doc} exists`); continue; }
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "code").split(/\n\s*\n/);
  const dw = writingProblems(page(prose));
  check(!dw.length, `${doc} keeps Vici's writing rules${dw.length ? `: ${dw.join("; ")}` : ""}`);
}

const report = (list) => list.forEach(([ok, what]) => console.log(`${ok ? "PASS" : "FAIL"}  ${what}`));
report(controls);
if (controls.some(([ok]) => !ok)) { console.error("\nA control failed: a check cannot be trusted."); process.exit(1); }
console.log("VICI CONTROLS OK\n");
report(standards);
const failed = standards.filter(([ok]) => !ok).length;
if (failed) { console.error(`\n${failed} of ${standards.length} standard(s) failed.`); process.exit(1); }
console.log(`\n${standards.length} standards met.`);
console.log("VICI STANDARDS OK");
