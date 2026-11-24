// Two languages (brief §5.11, AC-03):
//   keys      en.js and de.js have identical keys and no empty value; every key index.html names exists;
//             placeholders match between the languages
//   first     a first visit opens in English, even in a German browser
//   address   ?lang=de opens German, ?lang=en English
//   switch    EN | DE changes every string on the page in place, without a reload, title and description
//             included; each language shows its own guide's button; nothing English is left in German
//   remember  the choice is kept under pestel.lang, so the next tab opens in it, and the browser keeps no
//             other key than the three allowed (Vici's storedKeyProblems when a checkout is beside)
//   scenarios every text of the three scenarios exists in English and German, neither empty, with the same
//             placeholders in both
//   steps     on every step of a run, EN | DE switches every word of the stage and the tiles without a
//             reload and keeps the run where it was: the step, the corrections undone and the choices made
// Adapted from the Sovereignty Assessment 2.0.0: this tool's strings and guides.
// Usage: node tests/i18n.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { APP_ROOT, viciDir, launchBrowser, serveStatic, openTool, report } from "./lib/harness.mjs";
import EN from "../js/i18n/en.js";
import DE from "../js/i18n/de.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const html = readFileSync(path.join(APP_ROOT, "index.html"), "utf8");

// ---- keys -------------------------------------------------------------------------------------------
const en = Object.keys(EN).sort();
const de = Object.keys(DE).sort();
check(en.join() === de.join(), `en.js and de.js have the same ${en.length} keys${en.join() === de.join() ? "" : `; only in en: ${en.filter((k) => !DE[k]).join(", ")}; only in de: ${de.filter((k) => !EN[k]).join(", ")}`}`);
const empty = [...Object.entries(EN), ...Object.entries(DE)].filter(([, v]) => typeof v !== "string" || !v.trim()).map(([k]) => k);
check(!empty.length, `no empty value${empty.length ? `: ${empty.join(", ")}` : ""}`);
const named = [...new Set([...html.matchAll(/data-i18n="([^"]+)"/g), ...html.matchAll(/data-i18n-attr="[^"]*?:([^";]+)"/g)].map((m) => m[1].trim()))];
const unknown = named.filter((k) => !(k in EN) || !(k in DE));
check(named.length >= 20 && !unknown.length, `every one of the ${named.length} keys index.html names exists in both languages${unknown.length ? `; missing: ${unknown.join(", ")}` : ""}`);
const holes = (s) => [...s.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort().join();
const mismatched = en.filter((k) => DE[k] && holes(EN[k]) !== holes(DE[k]));
check(!mismatched.length, `placeholders match between the languages${mismatched.length ? `: ${mismatched.join(", ")}` : ""}`);
const statics = [...html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)].filter(([, k, text]) => text.trim() && EN[k] && text.trim() !== EN[k].trim());
check(!statics.length, `index.html's static texts are the English strings${statics.length ? `: ${statics.map(([, k]) => k).join(", ")}` : ""}`);

// ---- scenarios --------------------------------------------------------------------------------------
{
  const { SCENARIOS } = await import(pathToFileURL(path.join(APP_ROOT, "js/simulation.js")).href);
  // A text: { en, de } with a string in each. (texts holds one object per language instead; its what is
  // checked on its own below.)
  const isText = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).sort().join() === "de,en" && typeof v.en !== "object";
  const facts = (t) => [...String(t).matchAll(/\{\{fact:([^}]+)\}\}/g)].map((m) => m[1]).sort().join();
  for (const sc of SCENARIOS) {
    let n = 0;
    const bad = [];
    const walk = (v, where) => {
      if (isText(v)) {
        n += 1;
        if (typeof v.en !== "string" || typeof v.de !== "string" || !v.en.trim() || !v.de.trim()) bad.push(`${where} is empty in a language`);
        else if (facts(v.en) !== facts(v.de)) bad.push(`${where} has other placeholders in German`);
        return;
      }
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, where ? `${where}.${k}` : k);
    };
    walk(sc, "");
    const what = sc.texts?.en?.what && sc.texts?.de?.what;
    check(n >= 100 && !bad.length && what, `scenarios: all ${n} texts of ${sc.id} ${sc.company.name} exist in English and German with the same placeholders${bad.length ? `; ${bad.slice(0, 3).join("; ")}` : ""}${what ? "" : "; what the company does is missing in a language"}`);
  }
}

// ---- in the browser ---------------------------------------------------------------------------------
const server = await serveStatic(APP_ROOT);
const browser = await launchBrowser();
const texts = (page) => page.evaluate(() => [...document.querySelectorAll("[data-i18n]")].map((el) => [el.dataset.i18n, el.textContent.trim()]));
const pressed = (page) => page.evaluate(() => [...document.querySelectorAll(".lang-option")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.lang).join());

{
  const { context, page, errors } = await openTool(browser, { base: server.base, query: "?guide=0", locale: "de-DE" });
  check(await page.evaluate(() => document.documentElement.lang) === "en-GB" && await pressed(page) === "en", "first: a German browser's first visit opens in English (lang en-GB, EN pressed)");
  const before = await texts(page);
  check(before.every(([k, t]) => t === EN[k].trim()), `first: all ${before.length} strings on the page are English`);
  await page.evaluate(() => { window.__noReload = true; });
  await page.click('.lang-option[data-lang="de"]');
  await page.waitForTimeout(200);
  const after = await texts(page);
  check(await page.evaluate(() => window.__noReload === true), "switch: no reload");
  check(after.every(([k, t]) => t === DE[k].trim()), `switch: every one of the ${after.length} strings is German now${after.every(([k, t]) => t === DE[k].trim()) ? "" : `; not: ${after.filter(([k, t]) => t !== DE[k].trim()).map(([k]) => k).join(", ")}`}`);
  const leftover = after.filter(([k, t]) => EN[k] !== DE[k] && t === EN[k].trim()).map(([k]) => k);
  check(!leftover.length, `switch: nothing English is left${leftover.length ? `: ${leftover.join(", ")}` : ""}`);
  check(await page.evaluate(() => document.documentElement.lang) === "de" && await pressed(page) === "de", "switch: <html lang> is de and DE is pressed");
  check(await page.title() === DE["app.title"] && await page.evaluate(() => document.querySelector('meta[name="description"]').content) === DE["app.description"], "switch: the title and the description follow");
  check(await page.evaluate(() => document.querySelector('[data-vc-guide-open="guide-en"]').hidden && !document.querySelector('[data-vc-guide-open="guide-de"]').hidden), "switch: the header button opens the German guide");
  check(await page.evaluate(() => [...document.querySelectorAll("[data-i18n-attr]")].every((el) => el.getAttribute(el.dataset.i18nAttr.split(":")[0].trim()) !== null)) &&
    await page.evaluate(() => document.querySelector(".lang-switch").getAttribute("aria-label")) === DE["p.lang"], "switch: attributes follow too (the language group's name)");
  check(new URL(page.url()).searchParams.get("lang") === "de", "switch: the address carries ?lang=de for a shared link");
  await page.click('[data-vc-guide-open="guide-de"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.getElementById("guide-de").open && !document.getElementById("guide-en").open), "switch: the German guide opens from the header");
  await page.keyboard.press("Escape");

  // remember: a new tab in the same browser opens in German, from pestel.lang
  const tab = await context.newPage();
  await tab.goto(`${server.base}?guide=0`);
  await tab.waitForFunction(() => document.documentElement.dataset.ready === "true");
  check(await tab.evaluate(() => document.documentElement.lang) === "de" && (await texts(tab)).every(([k, t]) => t === DE[k].trim()), "remember: the next tab opens in German");
  const stored = await tab.evaluate(async () => ({
    local: Object.keys(localStorage), session: Object.keys(sessionStorage),
    databases: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
    caches: "caches" in window ? await caches.keys() : [], cookie: document.cookie,
    lang: localStorage.getItem("pestel.lang"),
  }));
  check(stored.lang === "de", `remember: pestel.lang holds "${stored.lang}"`);
  const allowed = (k) => ["vc-theme", "pestel.lang"].includes(k);
  check(stored.local.every(allowed) && stored.session.every((k) => k.startsWith("vc-guide:")) && !stored.databases.length && !stored.caches.length && !stored.cookie,
    `remember: the browser keeps only the allowed keys (${[...stored.local, ...stored.session].join(", ")})`);
  const dir = viciDir();
  if (dir) {
    const { storedKeyProblems } = await import(pathToFileURL(path.join(dir, "scripts", "lib", "storage.mjs")).href);
    const p = storedKeyProblems(stored, { prefix: "pestel" });
    check(!p.length, `remember: Vici's storedKeyProblems finds nothing${p.length ? `: ${p.join("; ")}` : ""}`);
  }
  check(!errors.length, `no page or console error${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await context.close();
}
{
  const { context, page } = await openTool(browser, { base: server.base, query: "?guide=0&lang=de", locale: "en-GB" });
  check((await texts(page)).every(([k, t]) => t === DE[k].trim()), "address: ?lang=de opens German in an English browser");
  await page.goto(`${server.base}?guide=0&lang=en`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  check((await texts(page)).every(([k, t]) => t === EN[k].trim()) && await pressed(page) === "en", "address: ?lang=en opens English");
  await context.close();
}

// ---- steps: the switch on every step keeps the run -------------------------------------------------------
{
  const { context, page, errors } = await openTool(browser, { base: server.base, query: "?guide=0&scenario=s3", locale: "en-GB" });
  const stageText = () => page.evaluate(() => `${document.getElementById("stage").innerText}\n${document.querySelector(".kpis").innerText}`);
  // Words that only the English page uses: every English string longer than one word, shown on the stage.
  const englishOnly = Object.entries(EN).filter(([k, v]) => DE[k] && DE[k] !== v && /\s/.test(v) && !/[{}]/.test(v)).map(([, v]) => v);
  await page.evaluate(() => { window.__noReload = true; });
  const steps = [];
  // Start, then the agents; undo the first correction at Challenge and change a choice at Respond, so the
  // run holds something of the person's that a reload or a rebuild would lose.
  const act = {
    0: async () => {},
    1: async () => page.click("#btn-cta"),
    2: async () => { await page.click("#btn-cta"); await page.click(".issue-undo >> nth=0"); },
    3: async () => page.click("#btn-next"),
    4: async () => { await page.click("#btn-next"); await page.evaluate(() => { const r = [...document.querySelectorAll(".options input[type=radio]")].find((x) => !x.checked && x.value !== "accept"); r.closest("label").click(); }); },
    5: async () => page.click("#btn-cta"),
  };
  for (let step = 0; step <= 5; step += 1) {
    await act[step]();
    await page.waitForTimeout(150);
    const lang = await page.evaluate(() => document.documentElement.lang);
    const to = lang === "de" ? "en" : "de";
    const before = await page.evaluate(() => ({ step: document.getElementById("stage").dataset.step, undone: document.querySelectorAll('.issue[data-undone="true"]').length, checked: [...document.querySelectorAll(".options input:checked")].map((r) => r.value).join() }));
    await page.click(`.lang-option[data-lang="${to}"]`);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ step: document.getElementById("stage").dataset.step, undone: document.querySelectorAll('.issue[data-undone="true"]').length, checked: [...document.querySelectorAll(".options input:checked")].map((r) => r.value).join(), lang: document.documentElement.lang }));
    const text = await stageText();
    const left = to === "de" ? englishOnly.filter((v) => text.includes(v)) : [];
    const kept = before.step === after.step && before.undone === after.undone && before.checked === after.checked;
    steps.push({ step: before.step, ok: kept && after.lang.startsWith(to) && !left.length, why: `${kept ? "" : "the run changed; "}${left.length ? `English left: ${left.slice(0, 2).join(" | ")}` : ""}` });
  }
  const noReload = await page.evaluate(() => window.__noReload === true);
  const bad = steps.filter((x) => !x.ok);
  check(noReload && steps.length === 6 && !bad.length, `steps: on each of the six steps EN | DE switches the stage and the tiles without a reload and keeps the run${noReload ? "" : "; the page reloaded"}${bad.length ? `; ${bad.map((x) => `${x.step}: ${x.why}`).join("; ")}` : ""}`);
  check(!errors.length, `steps: no page error${errors.length ? `: ${errors[0]}` : ""}`);
  await context.close();
}

await browser.close();
await server.close();
report(results, "I18N OK");
