# Technical notes

How the PESTEL Challenger is built and what it rests on, with the date each fact was read. PLAN.md holds
the plan Victor approved on 23 November 2026; this file records what the build found and decided since.

## 1. Version

Version 1.0.0 (M5 Release), 24 November 2026: the release of the four milestones before it, tested for
layout at four screen sizes, the keyboard alone and reduced motion, with the note a page opened from a
file shows, the documents complete, and the reviews of section 9 behind it. 0.4.0 (M4 Report) ended every
run in a report: page by page in the Summary, saved as PDF with the footer on every page, as an HTML file
of its own and as the handoff file the Prototype Ideator reads. 0.3.0 (M3 Live) runs the agents on a
person's own company with their own Claude API key in the tab; 0.2.0 (M2 Simulation) plays three recorded
runs on fictional companies step by step in English and German without a key; and 0.1.0 (M1 Foundations)
laid the frame, the strings, the engine with its golden cases, the schemas, the KPI library, the security
policy and CI.

## 2. API facts, verified at source

Read in the documentation on 23 November 2026, or probed from this workspace the same day (PLAN.md
section 2 has every probe), and read again on 24 November 2026 where the row says so. What needs a key
waits for Victor's first live runs (section 8).

| Topic | Fact | Read or probed |
|---|---|---|
| Models | `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`; knowledge reliable to June 2026; their tokenizer counts the same text as about 30 percent more tokens than Claude Haiku 4.5's | 2026-11-24, the three model pages |
| Prices | Per million tokens, input and output: Haiku 5.5 $0.10 and $0.50 (above 100,000 prompt tokens $0.50 and $2.50), Sonnet 5.5 $2 and $10, Opus 5.5 $4 and $20. Cache writes (5 minutes) $0.125, $2.50 and $5; cache reads $0.01, $0.10 and $0.20. Web search $10 per 1,000 searches; a failed search is not billed | 2026-11-24, pricing page |
| Browser access | A keyless call with `anthropic-dangerous-direct-browser-access: true` answers 401 with `access-control-allow-origin: *`; without the header the browser blocks it | 2026-11-23, probed |
| Token counting | `POST /v1/messages/count_tokens` is free and reachable from a page | 2026-11-23, probed keyless |
| Structured outputs | `output_config.format` with a JSON schema; per request at most 24 optional and 16 union-typed parameters; `minimum`, `maximum`, `minLength` and `maxLength` unsupported | 2026-11-23, structured outputs page |
| Effort and thinking | `output_config.effort` low to max, sent on every request; Haiku 5.5 takes `thinking: disabled` at high effort or below, Sonnet 5.5 takes `between_tools` instead | 2026-11-23, effort and thinking pages |
| Web search | `web_search_20250305` with `max_uses`; `pause_turn` is sent again unchanged; a client tool called beside a search ends the turn with `tool_use`; an organisation with search switched off gets 400 `invalid_request_error` | 2026-11-23, web search tool page |
| Errors | A spend limit you set returns 400 `invalid_request_error`, "You have reached your specified API usage limits"; no credit returns "Your credit balance is too low to access the Anthropic API"; 529 is overload | 2026-11-23, rate limits and API credits pages |
| API version | `anthropic-version: 2023-06-01`, as the sister prototypes send it; `2026-10-21` is the newest | 2026-11-23, migration page |
| Claude plans | A Claude plan does not pay for API use by itself: Max, Ultra and Team plans include monthly API credits once a Console organisation is linked; Free, Pro and Enterprise plans do not | 2026-11-24, support.claude.com article 17154008 |
| JSON modules | `import … with { type: "json" }` is blocked by `connect-src` under the page's policy, so the schemas ship as a module | 2026-11-23, probed in Chrome 153 |
| Print footer | Chromium prints `@page` margin boxes with page numbers; Firefox and Safari have none (MDN data, not probed), so a fixed footer takes over there | 2026-11-23, probed in Chromium |

The prices were read again on 24 November 2026, unchanged, before the simulation's estimate came to rest
on them, and again that day for the live cost meter. The Japanese edition of the pricing page gives Sonnet
5.5's cache reads as $0.20, not $0.10. This tool sets no cache control, so a run should read nothing from
the cache; should it, the meter prices the tokens at the English page's $0.10, a difference of $0.10 per
million tokens.

## 3. Decisions in use

The brief gives each decision a default so the build never waits (brief §14). Victor approved the plan's
recommendations with PLAN.md on 23 November 2026.

| ID | Decision | In use |
|---|---|---|
| D1 | Name and subtitle | "PESTEL Challenger"; the page title says "outside forces, put to the test" |
| D2 | Icon | Vici's radar icon in a lilac hexagon, in the header and the page icon |
| D3 | Languages | English and German from version 0.1.0 |
| D4 | Default setting and cap | Balanced and €0.50 |
| D5 | Web research | Off by default, with a visible switch that recommends it |
| D6 | PDF | The browser's Save as PDF, no library |
| D7 | Handing over to the Ideator | The handoff file downloads, and a link opens the Ideator in a new tab |
| D8 | Scenario names | Tidewell Lines, Arvento Drives and Auental Energie |
| D9 | Readiness | As brief §6.5 defines it, shown with its rule and called this tool's own measure |
| D10 | Research in the scenarios | S1 and S3 with a recorded research step, S2 without |
| D11 | Depth | Up to eight issues, no Quick or Deep |
| N1 | S3's story | Retold around the heat plan due on 31 December 2026 (from 0.2.0) |
| N2 | Requests per run | At most ten: five agents, three for the Scout and two repairs |
| N3 | Upload | None |

Decided while building 0.2.0, each within the brief and the plan:

| What | Decision |
|---|---|
| The fictional company | "Fictional company, illustrative figures" stands among Start's tags and with every later step's title, beside the header's SIMULATION tag, which is the simulation's tape (AC-05) |
| Facts from the agents' own knowledge | Each scenario's `checked` lists, per factor, the address its author read for a fact the agents state without a signal; the factor shows it as "checked at source by the scenario's author". S2, without research, also shows the note that the model's knowledge ends in June 2026 |
| German words | A threat is a "Risiko", an opportunity a "Chance", readiness the "Vorbereitungsgrad"; the steps are Start, Scan, Prüfung, Bewertung, Antworten and Zusammenfassung |
| Assess | The whole stage: the risk matrix, the horizon strip and the three threats that put most at stake by their numbers, so the room reads what "1" is. At 1280 × 720 the matrix's key stands beside its grid, the step's button under the strip, the three names run as one paragraph and the lead gives way to them, so all of it is in view |
| A dimension's state | "Under pressure", "On watch" or "Addressed" ("Unter Druck", "Im Blick", "Angegangen"), so a state never reads like the response "Watch it" |
| The header | From 1,900 px the actions stand under the name and the figures at the top right, one band of 114 px; below, the figures take a row of their own, sized to their lines. In German at 1920 the actions used to wrap onto a second row, and in both languages after a decision; the layout suite now checks one row of actions and one line per value on every step |
| Marker sizes | Thirds of the largest expected loss: smaller below a third, larger from two thirds, with Vici's `vc-risk__marker--sm` and `--lg` (ViciDesign#29); the key names each size in euros |
| The session cost of a simulation | An estimate on Balanced, said on the tile: each agent's request rebuilt from what it reads and answers at about four characters a token, a 1,500-token prompt, each answer counted twice for thinking, five searches of 4,000 tokens with research, the prices above and €0.894 to the dollar (`js/estimate.js`) |
| The talk track | The brief's draft (§8): five steps in five minutes, with action labels and figures from the engine. Its last step adopts the responses and saves the report as PDF |
| The guide's chapters | Six: the brief's four (What it does, How it works, What is real, How to present) and two a stranger needs to play it alone (The six steps, The cost estimate); each fits at 1280 × 720 |
| Check for updates | A scenario whose facts were read more than 90 days ago says so on Start (`needsUpdate()` in `js/format.js`) |
| Vici | The ring (ViciDesign#30), the horizon strip (#31), square radios in the segmented control (#33) and a fix that keeps the risk matrix and the horizon strip to their width once their numbers open (#34) went into Vici first; `vici/` copies its main at the commit `vici/README.md` names |

Decided while building 0.3.0, each within the brief and the plan:

| What | Decision |
|---|---|
| The shared client | `js/anthropic.js`, `js/sse.js`, `js/cost.js` and `js/keystore.js` are the Prototype Ideator's at `532e0f5`, unchanged (brief §4.1). This tool puts its errors into plain words in `js/api_messages.js` and decides there whether a request may run again, so credit and spend limits never retry, whatever the status |
| The settings | Fast: Haiku 5.5 at low effort, thinking disabled. Balanced: Haiku 5.5 at medium effort, thinking left to the model. Thorough: Sonnet 5.5 at medium effort. Advanced offers Haiku 5.5 and Sonnet 5.5 at low to high effort; Opus 5.5 is left out, since it always thinks and costs forty times Haiku's price (PLAN.md section 15) |
| One request per agent | Each request carries the analysis so far as JSON and the step's format, never the conversation, so a step replays exactly and no prompt cache is needed. The prompts are in English; the agents write in the page's language |
| The Scout | `web_search_20250305` with at most five searches and one strict client tool, `submit_signals`, in at most three requests: the first, one continuation after `pause_turn` and one repair. Only addresses from its own search results count; a signal citing another is refused once with `is_error`, then dropped |
| Checks and the repair | Each answer passes its schema, the refusals of brief §6.7 and the fact audit (`js/guards.js`). A failing answer goes back once with its problems; a second failure stops the run at that step. An answer that fails only the audit twice stays, its texts tagged "Unchecked". A run sends two repairs at most |
| Names with digits | The fact audit lets names such as CO2, 5G, Scope 3, NIS2 or ISO 14001 stand in the agents' prose (`NAMES_WITH_DIGITS` in `js/guards.js`), so a standard's name is not taken for an invented figure |
| Out-of-date factors | The Analyst prices and the Strategist answers every factor, those the Red team marks out of date too, so undoing a correction needs no new request |
| max_tokens | 8,000 for every step until Victor's runs measure what each needs (brief §5.4); near the cap a request drops to its step's minimum, 1,500 to 3,000, and the step says so |
| The budget's worst case | A request's input at two characters a token plus 6,000 tokens for each search, and max_tokens in full as output, at list price. No request starts whose worst case would take the run past the cap |
| The estimate | Each request rebuilt from its real prompt and the recorded runs' answer sizes at about three characters a token, since the 5.5 tokenizer counts about 30 percent more tokens than the old rule of four; each answer counted twice with thinking on; five searches of 4,000 tokens. The dialog gives a range, from the smallest recorded run to the largest plus one repair, and a time range at 80 to 180 output tokens a second on Haiku 5.5 and 40 to 100 on Sonnet 5.5, after one to three and two to five seconds. All of it is assumed until Victor's runs measure it |
| The live screens | A live run has no address, so a reload ends it and Play stays off. While an agent works, its step shows the agent's role, what it does, the time, the spend against the cap, the requests and Abort. When the Red team, the Analyst and the Strategist are done, the run opens at Challenge, so the corrections and their Undo come before Assess and the decision (brief §6.2). A stop says why, keeps what is done, and offers to go on, with Thorough after a failed check, or back to the simulation; a key the API rejected is forgotten then, and the dialog asks for another. The dialog warns when the cap lies below the estimate's top, and more plainly below its bottom |
| The dialog at 1280 × 720 | Every part shows without scrolling, the estimate too, until a warning appears, as Vici's live-run dialog asks since ViciDesign#39: the link to the Console sits beside the key's label, the setting's legend beside its choice, and research's note takes one line. The note on Claude plans moved to the message for an account without credit, and to the README; the layout suite checks the fit at both sizes |
| The person's edits | At Scan the person keeps, edits or removes each factor the Scanner added; removed ones stay listed under their dimension with Put back. The Scanner never changes a factor the person entered (brief §6.7) |
| Clear everything | Empties the key, the form, the run and the decisions. Only the last run's measured cost and time stay in memory, so the dialog can say what a run in this tab cost |
| Save run as simulation | Downloads the run in the scenario format without the key, a prompt, a thinking block or the request log. The company keeps its name, marked as not fictional, and the other language stays empty, so the scenario checker lists what curation still owes |
| The private-data warning | E-mail addresses, phone numbers, IBANs whose check digits add up, and the words confidential, internal, vertraulich and intern. It warns and does not block (brief §5.10) |
| The stand-in | `tests/lib/fake-claude.mjs` answers the browser suites with scenario S3's recorded answers, streamed as the API streams them, plants faults and holds, and checks every request against what a live run must send |
| Vici | The live-run dialog is Vici's `.vc-live`, which the SWOT Challenger added (ViciDesign#36). `vici/` copies Vici's main at the commit `vici/README.md` names, which also holds the Prototype Ideator's fixes for callouts, table figures and the dialog's fit at 1280 × 720 (ViciDesign#35, #37, #38 and #39) |

Decided while building 0.4.0, each within the brief and the plan:

| What | Decision |
|---|---|
| The report | Vici's report (ViciDesign#40), which this tool added to Vici first: `.vc-report` with a cover and pages, light sheets on screen in either theme, A4 in print. `js/report.js` builds it from the run's state, as brief §9.1 lists it: cover, management summary, the six dimensions, the factors, the corrections, the risk matrix and horizon strip with their tables, the responses, the watch list, method with the decision log and the sources, and About this report. No model writes its layout |
| Its language | A live run's report speaks the run's language, whatever the page shows; a simulation's the page's. `inLang()` in `js/i18n/index.js` lends every formatter that language while the report is built, and tells no view |
| The footer | In the page's margin boxes: "Created with PESTEL Challenger" and the address on the left, "Built by Victor Pflüger · page x of y" on the right. A German report says "Erstellt mit …" and "Erstellt von Victor Pflüger · Seite x von y", as Vici's byline does on a German page; AC-13 names the English words, which every English report carries |
| Browsers | Chrome and Edge print margin boxes from version 131 (read on caniuse.com on 24 November 2026); CSS asks for them with `@supports at-rule(@bottom-left)` from Chrome 148, and `Vici.report.prepare()` marks the print copy itself for 131 to 147. Firefox and Safari have none, so they print the report's fixed footer, without page numbers (R6) |
| Save as PDF | The button prints the report alone through a copy at the end of `body` and names the page after the report's file, which Chrome offers as the PDF's name. Ctrl+P on the Summary does the same; on other steps it prints the page as it is |
| The last bar | Its one primary action is "Save as PDF", as brief §9 names it, with the hint "Choose Save as PDF as the printer."; §8's draft label "Download the report" would hide that the PDF comes from the print dialog. The HTML file, the handoff file and "Turn this report into prototype ideas" stand beside it as secondary actions |
| Unchecked text | Whatever the screens tag Unchecked (brief §6.7) keeps the tag in the report: a factor, its estimate, a correction, a response or the summary, and the method page says once what the tag means |
| The HTML file | `Vici.report.html()`, so the four tools share one writer rather than each adapting the Sovereignty Assessment 1.0.0's export.js, as PLAN.md section 9 planned. It holds the report's markup with the title as its h1, its pictures drawn to data, the style rules of the page that reach the report, the footer's words on the root, its own policy `default-src 'none'; style-src 'unsafe-inline'; img-src data:`, no script. The web fonts stay out, since the page's policy lets it read no file of its own, so the file falls back to the reader's fonts. About 150 KB |
| The handoff file | `js/handoff.js`: every force that counts is an issue, threats numbered as the risk matrix numbers them, then the opportunities; every option the Strategist offered is a response, the chosen ones marked, an accepted force adds an "accept" response, and each watch response carries its signal and trigger as a watch entry. Horizons map to now, 1_to_3_years and over_3_years; a country typed as a name becomes its two-letter code, "ZZ" when unknown; the readiness score keeps the engine's exact value. Offered from Assess on, since it carries figures |
| File names | `pestel-challenger-<company>-<YYYY-MM-DD>-<lang>.<ext>`, the report's date and language, umlauts written out (`reportName()` in `js/live_save.js`) |
| The decision log | Built from the run's state rather than a separate event log: the AI factors kept, edited or removed, the corrections undone, and each force's chosen response, marked as recommended or the person's own |
| The live-run dialog's source | This tool merged `js/live_dialog.js` first (0.3.0, 24 November 2026 at 10:17), before the Prototype Ideator and the Business Model Canvas Challenger (12:21 the same day). Brief §4.1 shares the dialog "apart from each tool's own settings", and each tool's file holds its own presets, cap and estimate, so `tests/parity.mjs` names this tool as the source and notes a sibling's different copy rather than asking for the same bytes |
| Long tables in print | The responses, the watch list and the risk tables run on over page breaks row by row, rather than leaving half a page empty; a row stays whole. In a narrow column a short value stays whole and a long word hyphenates in the report's language (`hyphens: auto`, words of ten letters or more); only the cells that hold sentences may break inside a word, so a table keeps to its sheet in a browser without German hyphenation, such as Chromium on Linux, which the layout suite checks |

Decided while building 1.0.0, each within the brief and the plan:

| What | Decision |
|---|---|
| The version on screen | The start screen says "Version 1.0.0" and that every run ends in a report, from `APP.version` in `js/config.js`. `tests/docs.mjs` fails when the page's words, README, DESIGN, DATA_SOURCES or a demo script name another version or promise one to come |
| Opened from a file | Chrome and Edge run no module script from a file, so the page would stay blank. `index.html` holds a note in the stage, in both languages, which a CSS animation shows after two seconds and the program removes as it starts: open the web address, or serve the folder with `python3 -m http.server 8000`. Served, the note never shows (`tests/from-file.mjs`) |
| The keyboard and the focus | `tests/access.mjs` runs a scenario and a live run with the keyboard alone and compares every stop of the Tab order focused and not, pixel by pixel. It found two faults in Vici's dialog, fixed there first (ViciDesign#42): with reduced motion the backdrop still faded in, and a body that scrolls and holds only text, such as the method dialog's, showed only the top edge of its focus ring |
| Window sizes | AC-14 runs from 1920 × 1080 to 1280 × 720: the layout suite checks both ends in both themes and languages, and 1600 × 900 and 1366 × 768 between them |
| The report in the dark theme | The white sheets lie on the page's dark background. Vici's report painted the light canvas behind them, a light slab on a dark page; fixed in Vici first (ViciDesign#44) |
| Vici | `vici/` copies Vici's main at `3b58694`, which holds the SWOT Challenger's fit of the live-run dialog up to 1920 × 1080 (ViciDesign#41) and its report that prints in the light scheme (#46), the Prototype Ideator's honeycomb fix (#45), and this tool's #42, #44 and #47 |
| Firefox and Safari print | Victor decided on 24 November 2026 not to print the report in them by hand ("assume it works"). Only Chromium's print is tested; section 8 keeps the risk |
| Euro figures from the agents | The Analyst's and the Strategist's checks refuse a euro figure below zero, and a residual that leaves more at stake than the threat's own range at its likelihood, each message naming the one case that applies. The format cannot forbid them, and the engine refuses such a range, so the answer goes back once and the run stops at that step if the repair keeps it (independent review R1, N5) |
| What a mitigation leaves | Never more than the threat as it stands now: after an Undo the threat may stand lower than the Strategist saw it, so `residualOf()` in `js/run.js` keeps the response's readiness at least the threat's, its likelihood at most the threat's, and its euros at most what the threat puts at stake, as `js/risk.js` reads what is left. The engine, the options, the report and the handoff file all read it (O1) |
| A threat without a euro figure | It stays without one after a mitigation: it counts in readiness, not in money, whatever residual range the Strategist gives. Its option shows no money left, the report says it counts in readiness, and the handoff file gives it no residual range (R5) |
| The handoff file's opportunities and score | An opportunity's euro range is the Analyst's upside, so the issue carries the likelihood that goes with it, and its expected value is its range at that likelihood, as js/risk.js reads an issue. With no threat at all the page says so where readiness would stand; the schema needs a number, and the file writes 100, since there is nothing to be unready for (R12) |
| Typing at Scan | The editor of an AI factor opens with its wording and, under it, "Public information only" and the line on where the words go (brief §5.10), in view. It warns, as the live-run dialog does, of what the person brings in that looks private, occurrence by occurrence: the AI's own words never count, a second "internal" does. The warning stays in view as it grows, with the field, at 1280 × 720 in both languages, and does not block. Text shaped like an API key is redacted as the edit is saved (R2, N1, N3, N6, N7, N11) |
| The private-data warning | A date that stands alone (01.01.2027, 1/7/26, 2026-09-30) or a range of two dates (01.01.26-31.12.26, 01.01.-31.12.2027) never counts as a phone number, while digits in dotted pairs (01.23.45.67.89) still do, and "internal combustion" is no keyword. Text shaped like an API key counts: the dialog names it, the run redacts it before a prompt reads it, and "Save run as simulation" redacts it as the other files do (R8, R9, N2, N10) |
| The key in memory | The live-run dialog keeps no copy of a checked key: a key typed now is checked, and the key in js/keystore.js passed that check when it was set, so "Clear everything" leaves none behind (R10) |
| A live run's tiles | A live run cannot answer first: until the Analyst is done, the pressure and readiness tiles say after which step their figures stand ("after the scan", "after the challenge"). After Adopt, a stop or a wait shows the ring after the decision, as the tiles do (R3, N4) |
| A request cut off or aborted under way | The API may bill a request cut off after its stream began, or aborted while under way, but the shared client reports no usage for it. The run holds each such attempt's worst case against the cap (`run.unmetered`), the last of the shared client's three attempts too, and a retry, or any request after it with Go on, goes only if it still fits. The stops it shapes and Go on's dialog say so, and a stream that broke off says that rather than "could not reach the API". The meter shows what the API reported (R11, N8) |
| A run out of requests | Once a run has used its ten requests, its stop offers no "Go on", which could not work, and says to take what is done or start again with Clear everything (R6) |
| Long company names | The ring's centre steps a long name down in three sizes and leaves out the sector, so up to the form's 80 characters stay inside the cell at 1280 × 720. A name from a German-speaking country, however the form names it ("DE", "Bundesrepublik Deutschland", "Schweiz"), is marked German, so a browser with German hyphenation breaks its long words at a syllable, on an English page too (R13, O3) |
| Targets of 40 px | Every target takes 40 px each way, measured by the layout suite on buttons, links, disclosures and controls: Vici's segmented options, switches, sliders and the numbers' summary first fell short, fixed in Vici first (ViciDesign#47), and the tool's own disclosures and the Accept option reach 40 px the same way (R4) |
| AI marks | A lilac AI tag stands on each of the Red team's cards, on each option the Strategist wrote (the recommended one carries "Recommended" in lilac) and beside the Summary's title, the Writer's headline; each says in its title what the agent wrote. Every AI figure says what it rests on: what a mitigation leaves reads "AI estimate from the range above", the Analyst's range over the options, and an advantage's upside "AI estimate from the factor and figures above"; the report says "from the Analyst's range" and "from the factor and the Analyst's figures" (R17, N9) |
| The mode tag | The header's SIMULATION or LIVE tag takes focus only so the keyboard reaches its tooltip, which screen readers also read through `aria-describedby`. It starts nothing, so the 40 px rule for targets does not bind it; at 125 × 30 px it is above the 24 px of WCAG 2.5.8, and it keeps Vici's large tag (O4) |

## 4. Security policy and what is kept

`index.html` carries the brief's policy in one meta tag: everything from this site, connections only to
api.anthropic.com, no inline script or style. Vici's theme line, which its starter used to inline, now
comes from `vici/dist/vici-theme.js`; this build added that file and a policy-clean blank starter to Vici
first (ViciDesign#25). `<html data-vc-theme-default="light">` keeps the page light until a visitor
chooses dark, since it is mostly shown on projectors in lit rooms.

Nothing a person enters is kept (brief §5.9). Three keys may persist: `pestel.lang` for the language,
Vici's `vc-theme` and Vici's `vc-guide:` note that the guide has opened in this tab. Local and session
storage appear only in `js/lang.js`, `js/i18n/index.js` and Vici's two scripts. Vici now states this rule
on Build a prototype, with `storageProblems()` and `storedKeyProblems()` to check it (ViciDesign#24);
`tests/policy.mjs` runs both and `tests/i18n.mjs` reads the browser's storage after switching language.

From 0.3.0 the key lives in `js/keystore.js`, the set's shared store, as one module variable, and the
rest of a live run in `js/session.js`: in memory, and gone with a reload. The key goes to api.anthropic.com
alone, through `js/anthropic.js`, the one module that calls `fetch`; it shows masked, and an error that
quotes the API has anything shaped like a key taken out. While a result has not been downloaded, the
browser asks before the page is left. `tests/storage.mjs` runs a whole live run against the stand-in and
then finds only the three allowed keys, no database, cache or cookie, and the key in no download, address
or console message.

## 5. The engine

`js/engine.js` computes every figure of the method (brief §6.5) with the bands, expected values and money
format of the shared `js/risk.js`. Values stay at full precision; display rounds once, first to 1e-9 and
then half away from zero, on the exact decimal digits (`roundHalfAway()`), so 6,450,000 shows as €6.5m.
Money shows as €6.5m, €750k and €950 in English and as 6,5 Mio. €, 750 Tsd. € and 950 € in German, with
no-break spaces so a figure never splits from its unit. The unit follows the rounded value: €999,500
shows as €1.0m, €999,499 as €999k. Readiness without any threat is "no threats", never 0 or 100. A
threat without a euro range counts in readiness and the money says so: "€6.4m on 4 of 5 threats".
`tests/engine.mjs` holds the golden cases P0 to P2 of brief §11, written into
`tests/fixtures/golden.json` before the engine.

## 6. Schemas

`schemas/*.json` is the source. `tools/sync-schemas.mjs` writes `js/schemas.js`, the module the page
imports, with each agent's request format written out without `$ref` (`REQUESTS`). Request formats close
every object and require every field, with `null` for "not applicable", so no request has an optional
parameter; ranges, lengths and counts are checked in code. `schemas/strategy-challenge-1.json` is the
handoff file of brief §4.3, shared by all four tools; it keeps its parts under `$defs`, so it is
validated with those as the registry.

## 7. Running the tests

The tests need Node 22 and, for the browser suites, Playwright with Chromium: `npm install -g playwright`
and `npx playwright install chromium`, then `NODE_PATH="$(npm root -g)" node tests/run-all.mjs`, which
runs all thirty-seven suites and ends with "ALL SUITES OK"; `node tests/run-all.mjs engine layout` runs only
the suites named. From 0.2.0 the suites `scenarios` and `audit` prove the scenario checker and the fact
audit, `presenter` plays every scenario in both languages, `views` checks the ring, the lists, the matrix
and the strip on every screen, and `layout`, `hexagon`, `vici` and `i18n` look at every step. From 0.3.0 `guards` and `estimate` check
the agents' checks and the estimate, and nine browser suites (`live-dialog`, `live-requests`,
`live-repair`, `live-budget`, `live-errors`, `live-research`, `live-scan`, `live-flow` and `storage`) run
live runs against the stand-in, which answers every request to api.anthropic.com inside the browser. From
0.4.0 `handoff` builds the handoff file of every scenario, language and choice and has the Prototype
Ideator read it; `report` prints every scenario's report in Chromium and reads each PDF page for the footer,
and a capped live run's for its notice; `report-files` opens the HTML file offline and checks both files'
names and contents; and `report-figures` holds the report and the handoff file to the tiles. From 1.0.0
`access` runs a scenario and a live run with the keyboard alone, looks for the focus at every stop, asks
for reduced motion and checks names and ids, and `from-file` opens the page from a file in both languages.
No automated test calls the real API, and none needs a key.
`node tools/check-scenarios.mjs` runs the checker alone; `--frozen` prints the figures to freeze after a
deliberate change. Vici's checks need a ViciDesign checkout beside this repository at the commit
`vici/README.md` names; `--require-vici` makes its absence a failure, as it always is on GitHub Actions.
Checkouts of the website (VIP), the three siblings and the prototypes `REVIEW.md` names, beside this
repository, let the page-icon, parity, docs and handoff suites compare with them; without one, that part is
skipped and says so. `tests/hygiene.mjs` reads its private term list from the `HYGIENE_TERMS` secret, a
`HYGIENE_TERMS_FILE`, or `../.hygiene-terms`.

The tests workflow does all of this on every push and pull request and keeps the layout suite's
screenshots of every step as the run's `test-screenshots` artefact. After each Pages build the live-site
workflow runs `tests/live_site.mjs`: the published files equal the commit, the page starts in both
languages, and the default scenario plays to its end in each.

## 8. Deviations and open issues

- **Hygiene without the private list in CI.** Victor has not set the `HYGIENE_TERMS` secret yet. CI runs
  `tests/hygiene.mjs` in its generic mode ("HYGIENE GENERIC OK"); the build session runs it with its own
  list before every push, which must print "HYGIENE OK".
- **Not yet run with a real key.** Every live suite runs against the stand-in. Victor's first runs on
  Fast, Balanced and Thorough measure each step's tokens, cost and time ("What this run used" on the
  summary); then each step's max_tokens is set from what it used, and the estimate quotes the measured
  figures (`MEASURED` in `js/estimate.js`). The probes of PLAN.md section 16 wait for the same session.
- **Firefox and Safari print** the report's fixed footer, without page numbers, since neither has margin
  boxes. Only Chromium's print is tested: Victor decided on 24 November 2026 not to print a report in them
  by hand. An HTML file printed in Chrome 131 to 147, which has no script to mark it, shows both footers.
- **Shared parts taken from the SWOT Challenger.** This tool first built its own KPI library, money
  format and handoff schema; the SWOT Challenger merged its versions first (`617b122`), so this tool took
  them unchanged, as brief §4.1 asks. Three things this tool's versions had are proposals for a change
  agreed in all four tools: a billions scale (the shared format shows €1,234,567,890 as €1234.6m), a
  standard source for the seven KPIs a standard body defines (net promoter score, CO2 per unit, CO2 per
  container-kilometre, grid outage minutes, CET1 ratio, liquidity coverage ratio, solvency ratio), and a
  range format for the factor view of 0.2.0.
- **The cost estimate is an assumption** until Victor's first live runs measure what each step costs; the
  tile, the dialog and the guide say it is an estimate and what it rests on. Its three characters a token
  follows the model pages' 30 percent and has not been counted on this tool's own prompts, since the free
  token count needs a key.
- **Streams cut off and the meter.** A stream cut off after it started, or aborted while under way, may be
  billed for its input and what it wrote, but the shared client (`js/anthropic.js`, unchanged from the Prototype
  Ideator) returns no usage then. The cap holds against them, since the run counts every such attempt at its
  worst case, the last one and an Abort too (section 3), but the meter shows only what the API reported. Reporting a cut
  stream's usage needs a change to the shared client, for all four tools. The Scout's worst case assumes 6,000
  input tokens a search; were a search's results larger, its one request could pass the cap by the difference.
  Victor's first research run on Thorough measures it (independent review R11, N8).
- **Run it live on smaller screens.** Brief §7 puts "Run it live" after the steps. On the Start panel it
  shows without scrolling from 1920 × 1080; at smaller sizes the panel scrolls to it, and the guide's first
  chapter names it. Moving it into the first view changes the brief's layout, which is Victor's call (R7).
- **The German footer.** A German report prints "Erstellt mit …" and "Erstellt von Victor Pflüger · Seite x
  von y" (section 3, 0.4.0); standing requirement 8 quotes the English words, which every English report
  carries. Victor confirms (R14).
- **Respond on mid-size windows.** Between 961 and 1,100 px wide and under 770 px high, some or all
  options sit under the "Your turn" bar until the panel is scrolled. They scroll into view; at 1280 × 720,
  the size the layout suite checks, every option shows in full.

## 9. Verification log

What was checked for 1.0.0, on 24 November 2026.

- **The suites.** All thirty-seven pass in one run with Vici's checks required, here in Chromium 157 and
  on GitHub Actions in Chromium 141 (Playwright 1.56).
- **Screens, by eye.** Every step of Auental Energie at 1920 × 1080, 1600 × 900, 1366 × 768 and
  1280 × 720 in both languages, and both themes at the two ends; the guide, the Method dialog, the empty
  live form, the live-run dialog, a live run that stops on a rejected key and on a busy service (against
  the stand-in), and the page opened from a file.
- **The PDF.** Auental Energie's report saved as PDF in English (17 pages) and German (18 pages), every
  page read: the footer with "page x of n" on each, "Public information only" on the cover and in About
  this report, "Created with PESTEL Challenger 1.0.0", and no table past its sheet.
- **Design passes.** Impeccable's critique of what 1.0.0 adds (the version line, the note for a page
  opened from a file, the focus ring in dialogs); ux-heuristics on the keyboard paths, where the focus
  moves to the step's title after each step, to the first field with an error and to the key field when
  the live-run dialog opens, with no finding of severity 3 or 4; humanizer on every new string and the
  documents. They changed three things: the file note said all browsers refuse a file, now this browser;
  its region label stayed English on a German page, now gone; Scan's count reads as a first look.
- **Reviews.** The independent review, the Steve Jobs review and Vici's partner review are in REVIEW.md,
  parts 2 and 3. The independent review found two high, three medium and twelve low findings. A first
  confirming look found two of the fixes incomplete and five new findings, one of them medium; a second
  confirmed every high and medium fix and found six more low findings, which a third round fixed. Every high and
  medium finding is fixed; two low findings and one observation stay, with their reasons in sections 3 and 8.
  REVIEW.md part 2 names the commit each confirming look read and what it found.
- **Not checked.** Printing in Firefox and Safari, by Victor's decision, and a run with a real key, which
  is Victor's (section 8).
