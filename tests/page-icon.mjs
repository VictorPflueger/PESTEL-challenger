// The page icon: a prototype's mark is the icon its card shows on Victor's website, a Vici icon in a
// hexagon cell in the colour of the card's kind (lilac for a prototype, teal for a tech-showcase).
//   favicon   favicon.svg is exactly the card's cell drawn for small sizes (byte for byte);
//   page      the header shows that cell with Vici's classes, hidden from screen readers, beside the name;
//   website   when a checkout of the website (VictorPflueger/VIP) sits next to this repository and its
//             data/prototypes.js lists this prototype, the card gives it the same icon and kind. The card
//             arrives with 1.0.0 (brief §13); until then that part is skipped and says so. If the card
//             changes, the page icon changes with it.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this tool has no loading screen, since its page
// is drawn before any script runs, and its card on the website is still to come.
// Usage: node tests/page-icon.mjs
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { APP_ROOT } from "./lib/harness.mjs";
import { NAME, PAGE_ICON } from "./lib/prototype.mjs";

const results = [];
const check = (ok, what) => results.push([ok, what]);
const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");

// favicon.svg, byte for byte.
const favicon = read("favicon.svg");
check(favicon === PAGE_ICON.favicon, `favicon.svg is exactly the ${PAGE_ICON.tone} cell with the ${PAGE_ICON.icon} icon${favicon === PAGE_ICON.favicon ? "" : ` (${favicon.length} bytes, expected ${PAGE_ICON.favicon.length})`}`);
check(/<polygon points="120,51\.96 90,103\.92 30,103\.92 0,51\.96 30,0 90,0" fill="#f2e9fd"\/>/.test(favicon) && /stroke="#372544"/.test(favicon), "favicon.svg draws a flat-top hexagon in Vici's lilac 100 with the icon in lilac 900");
const html = read("index.html");
check(/<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/.test(html), "index.html names favicon.svg as the page's icon");

/** The page's hexagon cells in a stretch of markup: [{ classes, icon, hidden }]. */
function cells(markup) {
  const out = [];
  for (const m of markup.matchAll(/<span\b([^>]*)>\s*<span class="vc-icon vc-icon--([a-z0-9-]+)"><\/span>\s*<\/span>/g)) {
    const attrs = m[1];
    const classes = ((attrs.match(/\bclass="([^"]*)"/) || [])[1] || "").split(/\s+/).filter(Boolean);
    if (classes.includes("vc-cell")) out.push({ classes, icon: m[2], hidden: /\baria-hidden="true"/.test(attrs) });
  }
  return out;
}
const brand = (html.match(/<div class="brand">[\s\S]*?<\/div>/) || [])[0] || "";
const want = (c) => c.icon === PAGE_ICON.icon && c.hidden && c.classes.length === 2 && c.classes.includes("vc-cell") && c.classes.includes(`vc-cell--${PAGE_ICON.tone}`);
const inHeader = cells(brand);
check(inHeader.length === 1 && want(inHeader[0]), `the header's brand shows the cell: vc-cell vc-cell--${PAGE_ICON.tone} with vc-icon--${PAGE_ICON.icon}, hidden from screen readers (${JSON.stringify(inHeader)})`);
check(new RegExp(`class="brand-name">${NAME}<`).test(brand), `the header keeps the name "${NAME}" beside the cell`);

// The negative control: the same checks on a planted header with the wrong icon and a visible cell fail.
const planted = cells('<div class="brand"><span class="vc-cell vc-cell--teal"><span class="vc-icon vc-icon--honeycomb"></span></span></div>');
check(planted.length === 1 && !want(planted[0]), "control: a header cell with another icon, tone or no aria-hidden is refused");

// The website's card, when its checkout sits next to this repository and lists this prototype.
const site = ["VIP", "vip"].map((d) => path.resolve(APP_ROOT, "..", d, "data", "prototypes.js")).find((f) => existsSync(f));
let skipped = null;
if (site) {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(site, "utf8"), context, { filename: site });
  const card = (context.window.PROTOTYPES || []).find((p) => p.name === NAME);
  if (card) {
    const kind = (card.kind || "prototype").trim().toLowerCase();
    check(card.icon === PAGE_ICON.icon, `the website's card shows the icon "${PAGE_ICON.icon}" (it shows "${card.icon}")`);
    check(kind === PAGE_ICON.kind, `the website's card is a ${PAGE_ICON.kind} (it is a ${kind})`);
  } else {
    skipped = `the website (${path.relative(APP_ROOT, site)}) does not list ${NAME} yet; its card comes with 1.0.0`;
  }
} else {
  skipped = "no checkout of the website (VIP) next to this repository: its card was not compared";
}

for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
if (skipped) console.log(`SKIP  ${skipped}`);
const failed = results.filter(([ok]) => !ok).length;
if (failed) {
  console.error(`\n${failed} page-icon check(s) failed.`);
  process.exit(1);
}
console.log(`\nThe page icon is ${NAME}'s radar cell${skipped ? " (the website's card not compared)" : ", as on its card on the website"}.`);
console.log("PAGE ICON OK");
