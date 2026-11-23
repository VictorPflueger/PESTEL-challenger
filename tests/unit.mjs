// Unit checks of the small modules, in Node without a browser:
//   validator   js/schema.js refuses an extra field in a closed object, a missing required field, a wrong
//               type, a value outside an enum and a broken $ref target, says where, and passes a valid value;
//   money       the shared js/risk.js shows amounts at the edges of each scale in both languages, the unit
//               following the rounded value, half away from zero, German on one line; a non-amount is
//               refused;
//   strings     t() fills placeholders, leaves a missing one visible, returns an unknown key as itself and
//               records it; tn() picks the plural form by the language's rules;
//   language    js/lang.js, run in a stand-in page: English on a first visit (a German browser too), ?lang=
//               wins over the stored choice, an unknown ?lang= is ignored, blocked storage falls back to
//               English, only the guide in the page's language opens by itself, and the guide's
//               opened-once note carries over to the other language;
//   theme       the page starts light unless the visitor chose dark (Vici's vici-theme.js with the page's
//               data-vc-theme-default). Version 0.1.0 shows no dates; their format joins with the scenarios.
// Usage: node tests/unit.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
import { APP_ROOT, report } from "./lib/harness.mjs";

const load = (f) => import(pathToFileURL(path.join(APP_ROOT, f)).href);
const { validate, describeErrors } = await load("js/schema.js");
const { money, roundHalfAway } = await load("js/risk.js");
const i18n = await load("js/i18n/index.js");
const { STORAGE, APP } = await load("js/config.js");

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const eq = (got, want, what) => check(got === want, `${what}: ${JSON.stringify(got)}${got === want ? "" : `, expected ${JSON.stringify(want)}`}`);

// ---- validator -----------------------------------------------------------------------------------------
{
  const level = { type: "integer", enum: [1, 2, 3, 4, 5] };
  const factor = {
    type: "object", additionalProperties: false, required: ["id", "dimension", "impact", "note"],
    properties: {
      id: { type: "string" },
      dimension: { type: "string", enum: ["political", "economic", "social", "technological", "environmental", "legal"] },
      impact: level,
      note: { type: ["string", "null"] }
    }
  };
  const list = { type: "object", additionalProperties: false, required: ["factors"], properties: { factors: { type: "array", items: { $ref: "factor.json" } } } };
  const registry = { factor };
  const good = { factors: [{ id: "F1", dimension: "legal", impact: 5, note: null }] };
  const r0 = validate(good, list, registry);
  check(r0.valid && r0.errors.length === 0, "validator: a valid list of factors passes");
  const bad = { factors: [{ id: "F1", dimension: "legal", impact: 5, note: null }, { id: "F2", dimension: "cosmic", impact: 7, note: 3, extra: true }] };
  const r1 = validate(bad, list, registry);
  const text = describeErrors(r1.errors);
  check(!r1.valid, "validator: a list with a broken second factor fails");
  check(/factors\[1\]\.extra|factors\[1\]/.test(text) && /extra/.test(text), `validator: the extra field in a closed object is named with its path (${text.split("\n").find((l) => /extra/.test(l)) || "not named"})`);
  check(/dimension/.test(text) && /impact/.test(text) && /note/.test(text), "validator: the enum, the range of levels and the wrong type are each reported");
  const r2 = validate({ factors: [{ id: "F1", dimension: "legal", impact: 3 }] }, list, registry);
  check(!r2.valid && /note/.test(describeErrors(r2.errors)), "validator: a missing required field (note, which may be null but must be there) is refused");
  const r3 = validate({ factors: [{}] }, { type: "object", properties: { factors: { type: "array", items: { $ref: "nowhere.json" } } } }, registry);
  check(!r3.valid, "validator: a $ref to a schema the registry lacks is an error, not a pass");
  check(validate(null, { type: ["object", "null"] }).valid && !validate(4, { type: ["object", "null"] }).valid, "validator: a union with null takes null and refuses a number");
}

// ---- money: the shared format of js/risk.js ---------------------------------------------------------------
{
  const de = (t) => t.replace(/ /g, "\u00a0");
  const cases = [
    [0, "€0", "0 €"],
    [950, "€950", "950 €"],
    [999.4, "€999", "999 €"],
    [999.5, "€1k", "1 Tsd. €"],
    [2449, "€2k", "2 Tsd. €"],
    [2500, "€3k", "3 Tsd. €"],
    [120000, "€120k", "120 Tsd. €"],
    [950000, "€950k", "950 Tsd. €"],
    [999499, "€999k", "999 Tsd. €"],
    [999500, "€1.0m", "1,0 Mio. €"],
    [6450000, "€6.5m", "6,5 Mio. €"],
    [4345000, "€4.3m", "4,3 Mio. €"],
    [-2500, "−€3k", "−3 Tsd. €"],
    [0.1 + 0.2, "€0", "0 €"]
  ];
  const wrong = cases.filter(([v, en, d]) => money(v) !== en || money(v, "de") !== de(d)).map(([v, en, d]) => `${v}: ${money(v)} / ${money(v, "de")} (expected ${en} / ${d})`);
  check(!wrong.length, `money: ${cases.length} amounts at the edges of each scale, in English and German${wrong.length ? `; wrong: ${wrong.join("; ")}` : ""}`);
  check(money(6450000, "de").includes("\u00a0Mio.\u00a0€"), "money: German keeps the figure, Mio. and € on one line (no-break spaces)");
  eq(roundHalfAway(2.5), 3, "money: 2.5 rounds half away from zero");
  eq(roundHalfAway(-2.5), -3, "money: −2.5 rounds half away from zero");
  eq(roundHalfAway(1.005, 2), 1.01, "money: 1.005 to two places is 1.01 on its exact decimal digits, not 1.00 as binary floats give");
  eq(roundHalfAway(0.1 + 0.2, 9), 0.3, "money: 0.1 + 0.2 is 0.3 once rounded to 1e-9");
  let refused = 0;
  for (const v of [NaN, Infinity, undefined]) { try { money(v); } catch { refused += 1; } }
  check(refused === 3, `money: NaN, Infinity and undefined are refused, never shown (${refused} of 3)`);
}

// ---- strings -----------------------------------------------------------------------------------------
{
  const { t, tn, missingKeys, dictionary } = i18n;
  eq(t("fig.pressure", { n: 3 }), "3 of 6", "strings: a placeholder filled in English");
  eq(t("fig.pressure", { n: 3 }, "de"), "3 von 6", "strings: the same in German");
  eq(t("fig.moneyPart", { money: "€6.4m", n: 4 }), "€6.4m on 4 of {total} threats", "strings: a placeholder without a value stays visible");
  eq(t("no.such.key"), "no.such.key", "strings: an unknown key shows as itself");
  check(missingKeys().includes("no.such.key"), "strings: an unknown key is recorded for the tests");
  eq(tn("x.items", 1), "x.items.one", "strings: tn() picks the singular for 1");
  eq(tn("x.items", 2, {}, "de"), "x.items.other", "strings: tn() picks the plural for 2 in German");
  const en = Object.keys(dictionary("en")).sort();
  const de = Object.keys(dictionary("de")).sort();
  check(en.length > 30 && JSON.stringify(en) === JSON.stringify(de), `strings: both dictionaries hold the same ${en.length} keys`);
  check(STORAGE.lang === `${STORAGE.prefix}.lang` && STORAGE.prefix === "pestel", `strings: the language choice is stored under this tool's prefix (${STORAGE.lang})`);
  check(/^\d+\.\d+\.\d+$/.test(APP.version), `config: the version is a version number (${APP.version})`);
}

// ---- the language picker, in a stand-in page ------------------------------------------------------------
{
  const code = readFileSync(path.join(APP_ROOT, "js/lang.js"), "utf8");
  check(!/navigator\b/.test(code), "language: js/lang.js never asks for the browser's language");
  /** Runs js/lang.js once and returns what it set. */
  function pick({ search = "", stored = null, blocked = false, seen = [] } = {}) {
    const attrs = {};
    const el = (id) => ({ id, attrs: { "data-vc-guide-auto": "" }, removeAttribute(n) { delete this.attrs[n]; } });
    const guides = { "guide-en": el("guide-en"), "guide-de": el("guide-de") };
    const openers = { "guide-en": { hidden: false }, "guide-de": { hidden: true } };
    const button = (l) => ({ attrs: { "data-lang": l, "aria-pressed": l === "en" ? "true" : "false" }, getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; } });
    const buttons = [button("en"), button("de")];
    const session = new Map(seen.map((k) => [k, "1"]));
    const storage = blocked ? { getItem() { throw new Error("blocked"); } } : { getItem: (k) => (k === "pestel.lang" ? stored : null) };
    const sessionStorage = blocked ? { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } : { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v) };
    const window = { location: { search, pathname: "/PESTEL-challenger/" }, localStorage: storage, sessionStorage };
    const document = {
      documentElement: { setAttribute: (n, v) => { attrs[n] = v; } },
      getElementById: (id) => guides[id] || null,
      querySelector: (sel) => openers[(sel.match(/guide-(en|de)/) || [])[0]] || null,
      querySelectorAll: (sel) => (sel.startsWith(".lang-option") ? buttons : [])
    };
    vm.runInNewContext(code, { window, document, URLSearchParams });
    return { lang: attrs["data-lang"], htmlLang: attrs.lang, auto: Object.keys(guides).filter((g) => "data-vc-guide-auto" in guides[g].attrs), shown: Object.keys(openers).filter((o) => !openers[o].hidden), pressed: buttons.filter((b) => b.attrs["aria-pressed"] === "true").map((b) => b.attrs["data-lang"]).join(), session };
  }
  const first = pick();
  check(first.lang === "en" && first.htmlLang === "en-GB" && first.auto.join() === "guide-en" && first.shown.join() === "guide-en", `language: a first visit opens in English, with only the English guide opening by itself (${JSON.stringify(first)})`);
  const asked = pick({ search: "?lang=de" });
  check(asked.lang === "de" && asked.htmlLang === "de" && asked.auto.join() === "guide-de" && asked.shown.join() === "guide-de", "language: ?lang=de opens in German, with the German guide and its button");
  check(first.pressed === "en" && asked.pressed === "de", `language: the switch shows the page's language pressed before anything else runs (${first.pressed}, ${asked.pressed})`);
  check(pick({ stored: "de" }).lang === "de", "language: the stored choice opens German on the next visit");
  check(pick({ search: "?lang=en", stored: "de" }).lang === "en", "language: ?lang=en wins over a stored German");
  check(pick({ search: "?lang=fr" }).lang === "en" && pick({ search: "?lang=fr", stored: "de" }).lang === "de", "language: an unknown ?lang= is ignored");
  check(pick({ stored: "xx" }).lang === "en", "language: a stored value that is not a language is ignored");
  check(pick({ blocked: true }).lang === "en", "language: blocked storage falls back to English without an error");
  const carried = pick({ search: "?lang=de", seen: ["vc-guide:/PESTEL-challenger/#guide-en"] });
  check(carried.session.get("vc-guide:/PESTEL-challenger/#guide-de") === "1", "language: once the English guide has opened in this tab, the German one does not open again on a reload in German");
  const fresh = pick({ search: "?lang=de" });
  check(!fresh.session.has("vc-guide:/PESTEL-challenger/#guide-de"), "language: without that note the German guide still opens by itself");
}

// ---- the theme at start, in a stand-in page ----------------------------------------------------------
{
  const html = readFileSync(path.join(APP_ROOT, "index.html"), "utf8");
  check(/<html [^>]*data-vc-theme-default="light"/.test(html), "theme: the page names light as its default theme");
  const code = readFileSync(path.join(APP_ROOT, "vici/dist/vici-theme.js"), "utf8");
  /** Runs Vici's theme starter once and returns the theme it set, or null. */
  function start({ stored = null, blocked = false, fallback = "light" } = {}) {
    const attrs = { "data-vc-theme-default": fallback };
    const localStorage = blocked ? { getItem() { throw new Error("blocked"); } } : { getItem: (k) => (k === "vc-theme" ? stored : null) };
    const document = { documentElement: { getAttribute: (n) => attrs[n] ?? null, setAttribute: (n, v) => { attrs[n] = v; } } };
    vm.runInNewContext(code, { window: { localStorage }, document });
    return attrs["data-theme"] ?? null;
  }
  check(start() === "light", "theme: without a choice the page starts light, whatever the operating system prefers");
  check(start({ stored: "dark" }) === "dark", "theme: a visitor's dark choice applies before the first paint");
  check(start({ stored: "purple" }) === "light", "theme: a stored value that is not a theme is ignored");
  check(start({ blocked: true }) === "light", "theme: blocked storage starts light without an error");
  check(start({ fallback: null }) === null, "control: without a default the starter leaves the theme to the operating system");
}

report(results, "UNIT OK");
