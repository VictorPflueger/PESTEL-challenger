// The way into a live run (brief §5.3 and §5.10, AC-11), in Chromium against the stand-in:
//   - "Run it live" switches the page to LIVE and opens Start as an empty form under the notice "Public
//     information only" and the line on where a live run sends what it holds; an empty heading says the
//     Scanner fills it; a form without its company, country or line on what it does says what is missing;
//   - "Start the agents" opens Vici's live-run dialog, its parts in Vici's order (liveDialogProblems);
//   - "Start the live run" stays disabled until the key looks valid and the box, unticked at every
//     opening, is ticked; the key field is empty at every opening and after the key is held;
//   - the key is checked first with the free GET /v1/models call: a rejected key or a model the key may
//     not use is said in the dialog and starts nothing; once held, it shows masked and "Forget key" clears it;
//   - inside another page's frame the dialog refuses to work;
//   - the private-data warning fires on planted e-mail, phone, IBAN and keyword samples, not on clean text;
//   - the estimate follows the setting and research.
// Usage: node tests/live-dialog.mjs [--require-vici]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { report, viciDir, REQUIRE_VICI } from "./lib/harness.mjs";
import { liveSuite, livePage, fillForm, startRun, runOf, pageProblems, MOCK_KEY } from "./lib/live.mjs";
import { findPrivate, findAdded, privateFindings } from "../js/privacy.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const suite = await liveSuite();
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => "");
const disabled = (page) => page.$eval("#live-start", (b) => b.disabled);

// ---- the private-data finder, without a page ---------------------------------------------------------
// The sample address is put together at run time, so no published file carries one (tests/hygiene.mjs).
const MAIL = ["anna.berg", "example.org"].join("@");
const KEY_LIKE = ["sk", "ant", "api03", "Zq7xPlanted0000000000000"].join("-");
const PLANTED = [
  [`our key is ${KEY_LIKE}`, "key"], ["Tél. 01.23.45.67.89", "phone"], ["Appelez le 06.12.34.56.78", "phone"], ["Ruf 030.12.34.56 an", "phone"],
  [`write to ${MAIL}`, "email"], ["call +49 30 1234567", "phone"], ["call 030 12345678", "phone"],
  ["IBAN DE89 3704 0044 0532 0130 00", "iban"], ["This plan is confidential", "word"], ["Interne Unterlagen", "word"],
  ["vertrauliche Zahlen", "word"], ["the internal audit", "word"],
  ["Ruf (030) 1234-5678 an", "phone"], ["mobil 0171/1234567", "phone"], ["06-12-34-56-78", "phone"], ["01/23/45/67/89", "phone"],
];
const CLEAN = ["About 180 staff and €120m revenue a year", "Freight rates fell 12 % in 2025; 1,500 TEU", "Industry 4.0, CO2 at 0.45, heat plan due 31.12.2026", "international shipping and the internet", "Postcode 01067 Dresden", "IBAN DE89370400440532013001",
  "Die Pflicht gilt ab 01.01.2027", "Heat plan due 01.07.2026, report by 2026-09-30", "Diesel and internal combustion engines", "From 1/7/26 to 31.12.2026",
  // Ranges of two dates, whose digits run on: dates, not phone numbers.
  "Laufzeit 01.01.26-31.12.26", "Förderung 01.10.26-31.12.26", "Term 01/01/26-31/12/26", "Frist 01.01.-31.12.2027", "Pilot 2026-01-01-2026-12-31"];
check(PLANTED.every(([s, kind]) => findPrivate(s).some((f) => f.kind === kind)), "the warning finds every planted e-mail address, phone number, IBAN, keyword and key-shaped text");
check(CLEAN.every((s) => !findPrivate(s).length), `and nothing in clean business text (${CLEAN.filter((s) => findPrivate(s).length).join(" | ") || "none found"})`);
// What a text adds to an earlier version, occurrence by occurrence (the Scan editor's warning): a second
// "internal", or a phone number in place of another, counts; the earlier version's own do not.
const added = (now, before) => findAdded(now, before).map((x) => x.word || x.kind).join(", ");
check(added("the internal plan; see our internal memo", "the internal plan") === "internal" && added("an internal plan, reworded", "the internal plan") === ""
  && added("call 030 9876 5432", "call 030 1234 5678") === "phone" && added("call 030 1234 5678 today", "call 030 1234 5678") === "",
  "what an edit adds counts occurrence by occurrence: a second keyword or another phone number, not the words it started from");

// ---- the form ----------------------------------------------------------------------------------------
{
  const t = await livePage(suite);
  const p = t.page;
  await p.click("#btn-run-live");
  await p.waitForSelector("#live-name");
  check((await text(p, "#mode-tag")) === "LIVE", "Run it live switches the header's tag to LIVE");
  check((await p.$$eval("#stage input.vc-input, #stage textarea", (els) => els.every((e) => !e.value))), "Start opens as an empty form");
  const note = await text(p, ".public-note");
  check(note.includes("Public information only: never enter confidential, personal or otherwise protected data.") && /Anthropic's API, under your own key/.test(note), "the form stands under the public-information notice and where a live run sends it");
  check((await p.$$eval(".live-field--lines-political .vc-help", (els) => els.map((e) => e.textContent).join(" "))).includes("The Scanner fills this; you keep or remove what it adds."), "an empty heading says the Scanner fills it");
  check(/AI system/.test(await text(p, ".turn")), "Start the agents has the AI notice beside it");
  await p.click("#btn-cta");
  check(!(await p.$("#live-dialog[open]")) && (await p.$eval("#live-name", (e) => e.getAttribute("aria-invalid"))) === "true" && (await p.evaluate(() => document.activeElement?.id)) === "live-name", "a form without the company says what is missing, focuses it and opens no dialog");
  check(/Enter the company's name/.test(await text(p, "#live-name-error")), "with the error under its field");
  await fillForm(p);
  await p.fill("#live-lines-legal", "x".repeat(95));
  await p.click("#btn-cta");
  check(/over 90 characters/.test(await text(p, "#live-lines-legal-error")), "a line over 90 characters is refused with its number");
  await p.fill("#live-lines-legal", "The town's heat plan");
  await p.click("#btn-cta");
  await p.waitForSelector("#live-dialog[open]");
  check(true, "a complete form opens the dialog");

  // The dialog's parts, in Vici's order.
  const dir = viciDir();
  if (dir) {
    const { liveDialogProblems } = await import(pathToFileURL(path.join(dir, "scripts", "lib", "live.mjs")).href);
    const html = await p.$eval("#live-dialog", (d) => d.outerHTML.replace(/\sopen=""/, ""));
    const probs = liveDialogProblems(html);
    check(!probs.length, `Vici's liveDialogProblems finds nothing in the dialog${probs.length ? `: ${probs.join("; ")}` : ""}`);
    check(liveDialogProblems(html.replace("vc-live__start\" id=\"live-start\" disabled", "vc-live__start\" id=\"live-start\"")).length > 0, "control: the same dialog with its start button enabled in the markup is refused");
  } else check(!REQUIRE_VICI, "SKIP: no ViciDesign checkout, so liveDialogProblems did not run");

  // Disabled until the key looks valid and the box is ticked.
  check(await disabled(p), "Start the live run is disabled at opening");
  check(!(await p.isChecked("#live-ack")), "the box is unticked at opening");
  await p.fill("#live-key", "not-a-key");
  await p.check("#live-ack");
  check(await disabled(p) && /starts with sk-ant-/.test(await text(p, "#live-key-status")), "a value that is no key keeps it disabled and says why");
  await p.fill("#live-key", MOCK_KEY);
  await p.uncheck("#live-ack");
  check(await disabled(p), "a key without the box keeps it disabled");
  await p.check("#live-ack");
  check(!(await disabled(p)), "a key and the box enable it");
  await p.keyboard.press("Escape");
  await p.click("#btn-cta");
  await p.waitForSelector("#live-dialog[open]");
  check(!(await p.isChecked("#live-ack")) && (await p.$eval("#live-key", (e) => e.value)) === "" && (await disabled(p)), "at the next opening the box is unticked again, the key field empty and the button disabled");

  // The estimate follows the choices.
  const est = async () => text(p, "#live-estimate");
  const balanced = await est();
  await p.check('input[name="live-setting"][value="thorough"]');
  const thorough = await est();
  await p.check("#live-research");
  const research = await est();
  check(/Estimate: about €/.test(balanced) && balanced !== thorough && thorough !== research, `the estimate follows the setting and research ("${balanced}" / "${thorough}" / "${research}")`);
  const problems = await pageProblems(t);
  check(!problems.length, `the form and the dialog leave no page error${problems.length ? `: ${problems.join("; ")}` : ""}`);
  await t.context.close();
}

// ---- the key check: first, free, and what it says ------------------------------------------------------
{
  const t = await livePage(suite, { modelsFault: { status: 401, type: "authentication_error", message: "invalid x-api-key" } });
  await fillForm(t.page);
  await startRun(t.page, { waitFor: null });
  await t.page.waitForFunction(() => /rejected the key/.test(document.getElementById("live-key-status")?.textContent || ""));
  check(t.net.api.filter((x) => !x.startsWith("OPTIONS"))[0] === "GET /v1/models" && !t.standIn.requests.length, "the key is checked first with GET /v1/models; a rejected key starts no request");
  check((await t.page.$("#live-dialog[open]")) && (await t.page.$eval("#live-key", (e) => e.getAttribute("aria-invalid"))) === "true", "the dialog stays open and marks the key field");
  await t.context.close();
}
{
  const t = await livePage(suite, { standIn: { models: ["claude-haiku-5-5"] } });
  await fillForm(t.page);
  await startRun(t.page, { preset: "thorough", waitFor: null });
  await t.page.waitForFunction(() => /cannot use Sonnet 5\.5/.test(document.getElementById("live-key-status")?.textContent || ""));
  check(!t.standIn.requests.length, "a key whose list lacks the chosen model is told so and starts nothing");
  await t.context.close();
}

// ---- the key held: masked, Forget key ----------------------------------------------------------------------
{
  const t = await livePage(suite);
  await fillForm(t.page);
  await startRun(t.page);
  check(!!(await runOf(t.page))?.scan, "a held, checked key runs the scan");
  // A stop offers the dialog again: the key shows masked, and Forget key clears it.
  const release = t.net.holdAt(1);
  await t.page.click("#btn-cta");
  await t.net.held(1);
  await t.page.waitForSelector("#btn-abort");
  await t.page.click("#btn-abort");
  release();
  await t.page.waitForSelector(".stop-alert", { timeout: 15000 }).catch(() => {});
  if (await t.page.$(".stop-alert")) {
    await t.page.click("#btn-cta");
    await t.page.waitForSelector("#live-dialog[open]");
    const masked = await text(t.page, "#live-masked");
    check(!(await t.page.$eval("#live-current", (e) => e.hidden)) && /^sk-ant-…\w{4}$/.test(masked) && !masked.includes(MOCK_KEY.slice(10, 30)), `a held key shows masked (${masked})`);
    await t.page.check("#live-ack");
    check(!(await disabled(t.page)), "with the key held, the box alone enables the button");
    await t.page.click("#live-forget");
    check((await t.page.$eval("#live-current", (e) => e.hidden)) && (await disabled(t.page)), "Forget key clears it and disables the button");
  } else check(false, "the run could not be stopped to reopen the dialog");
  await t.context.close();
}

// ---- in another page's frame -------------------------------------------------------------------------------
{
  const context = await suite.browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  await page.setContent(`<iframe src="${suite.base}?guide=0" width="1260" height="760"></iframe>`);
  const frame = await (await page.waitForSelector("iframe")).contentFrame();
  await frame.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await frame.click("#btn-run-live");
  await frame.fill("#live-name", "Framed company");
  await frame.fill("#live-country", "Germany");
  await frame.fill("#live-what", "Tests a frame.");
  await frame.click("#btn-cta");
  await frame.waitForSelector("#live-dialog[open]");
  await frame.fill("#live-key", MOCK_KEY).catch(() => {});
  await frame.check("#live-ack").catch(() => {});
  check(!(await frame.$eval("#live-frame", (e) => e.hidden)) && (await frame.$eval("#live-start", (b) => b.disabled)), "inside another page's frame the dialog says so and stays disabled");
  await context.close();
}

// ---- the warning on what is usually private ------------------------------------------------------------------
{
  const t = await livePage(suite);
  await fillForm(t.page);
  await t.page.fill("#live-what", `Write to ${MAIL} or call +49 30 1234567.`);
  await t.page.fill("#live-lines-legal", "Our internal audit of IBAN DE89 3704 0044 0532 0130 00");
  await t.page.click("#btn-cta");
  await t.page.waitForSelector("#live-dialog[open]");
  const items = await t.page.$$eval("#live-warning-list li", (els) => els.map((e) => e.textContent));
  const shown = !(await t.page.$eval("#live-warning", (e) => e.hidden));
  check(shown && items.some((x) => /e-mail address in what it does/.test(x)) && items.some((x) => /phone number/.test(x)) && items.some((x) => /IBAN in the list under Legal/.test(x)) && items.some((x) => /“internal” in the list under Legal/.test(x)), `the dialog lists each planted sample and where it is (${items.join("; ")})`);
  await t.page.fill("#live-key", MOCK_KEY);
  await t.page.check("#live-ack");
  check(!(await disabled(t.page)), "it warns; it does not block");
  await t.page.keyboard.press("Escape");
  await t.page.fill("#live-what", "Municipal utility in Lower Saxony, about 180 staff.");
  await t.page.fill("#live-lines-legal", "The town's heat plan");
  await t.page.click("#btn-cta");
  await t.page.waitForSelector("#live-dialog[open]");
  check(await t.page.$eval("#live-warning", (e) => e.hidden), "clean text raises no warning");
  check(privateFindings({ company: { name: "A", country: "B", what: "C" }, factors: [{ id: "u1", dimension: "legal", text: "vertrauliche Zahlen" }] })[0]?.field === "factor:u1", "each finding names its field");
  await t.context.close();
}

await suite.done();
report(results, "LIVE DIALOG OK");
