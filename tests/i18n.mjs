// Two languages (brief §5.11, AC-03):
//   keys      en.js and de.js have identical keys and no empty value; every key index.html names exists;
//             placeholders match between the languages
//   first     a first visit opens in English, even in a German browser
//   address   ?lang=de opens German, ?lang=en English
//   switch    EN | DE changes every string on the page in place, without a reload, title and description
//             included; each language shows its own guide's button; nothing English is left in German
//   remember  the choice is kept under pestel.lang, so the next tab opens in it, and the browser keeps no
//             other key than the three allowed (Vici's storedKeyProblems when a checkout is beside)
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

await browser.close();
await server.close();
report(results, "I18N OK");
