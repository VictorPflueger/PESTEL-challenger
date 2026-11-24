# Review

Three parts: what this tool took from Victor's other prototypes (part 1), the independent review of
release 1.0.0 by an agent that did not build it (part 2), and the Steve Jobs review and Vici's partner
review of the running tool (part 3).

## Part 1. Files taken from other prototypes

Brief §5.1: every file copied or adapted from another of Victor's prototypes, with the commit it came
from and what changed. A copied file is byte for byte the source; an adapted file says so in its header.

| File | Verdict | Source | What changed and why |
|---|---|---|---|
| `vici/**` | copy | ViciDesign `3b58694` | Vici's `dist/`, fonts, portrait, marks and licence, unchanged; `vici/README.md` names the commit, which holds the report this tool added first (ViciDesign#40) and its fixes for 1.0.0 (ViciDesign#42, #44 and #47) |
| `data/kpis.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part the SWOT Challenger merged first (brief §4.1) |
| `js/risk.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part; `js/engine.js` uses its bands, expected values and money format |
| `schemas/strategy-challenge-1.json` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: the shared handoff schema, which keeps its parts under `$defs` |
| `js/schema.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Only the header comment, which now names this tool's files; the validator's code is unchanged |
| `js/i18n/index.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key `pestel.lang`, the log prefix, no Diagnostics, and the meta description follows the language; from 0.4.0 `inLang()` lends a run's language to its report |
| `js/lang.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key, and no loading screen |
| `js/facts.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Dates in every common form, the run's evidence URLs and names with digits set aside; none of that tool's ids |
| `js/format.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Money from the shared `js/risk.js`, euro ranges, KPI changes and dates; no shares or deltas |
| `js/scenario_check.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | From its runs_check.js: this tool's scenario format, its fact audit, guardrails, frozen figures and three plays |
| `js/dom.js` | adapt | Data Quality Agent 2.2.0, `831f050` | Only `h()` and `clear()`, and no option that writes markup as text |
| `js/clock.js` | copy | Data Quality Agent 2.2.0, `831f050` | Unchanged: today for the scenario's age, which a test can pin |
| `js/run.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its run_model.js: the six steps of this method, the factors at each step, the person's choices and, from 0.3.0, their edits |
| `js/presenter.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its app.js: this tool's steps, Play, Your turn, the ring and the address of a step; from 0.3.0 the live run, which has no address; from 0.4.0 the report's three downloads |
| `js/views/common.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its steps_view.js: the heading, the button, Your turn and the foot of each step; from 0.4.0 the download buttons |
| `js/kpis.js` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's four key figures, worked out by the engine from the run, recorded or live, and from 0.4.0 the same values for the report |
| `js/plain.js` | adapt | Data Quality Agent 2.2.0, `831f050` | This method's dimensions, horizons, issue types, responses and sectors in words |
| `js/anthropic.js` | copy | Prototype Ideator 0.2.0, `532e0f5` | Unchanged: the set's shared client (streaming, retries, the free key check), which the Prototype Ideator merged first (brief §4.1) |
| `js/sse.js` | copy | Prototype Ideator 0.2.0, `532e0f5` | Unchanged: the shared reader of the API's server-sent events |
| `js/cost.js` | copy | Prototype Ideator 0.2.0, `532e0f5` | Unchanged: the shared cost model; the meter and the estimate price tokens with it |
| `js/keystore.js` | copy | Prototype Ideator 0.2.0, `532e0f5` | Unchanged: the shared memory-only key store; its header names the Sovereignty Assessment it was adapted from |
| `js/session.js` | adapt | Prototype Ideator 0.2.0, `532e0f5` | This tool's form, live run, decisions and settings; "Clear everything" keeps the last run's measured cost |
| `js/api_messages.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | 400 for credit and for spend limits, 403 and 404 for a model the key may not use, a next step with every message, in both languages |
| `js/guards.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This method's refusals (brief §6.7), the checks of each agent's answer, and the fact audit on structured fields |
| `js/agents/scout.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | From its evidence.js and agent.js: the address registry and pause_turn, for one strict tool call instead of a research loop |
| `tests/lib/fake-claude.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | One request per agent with a structured answer, the Scout's search, planted faults and holds, and the checks every request must pass |
| `js/live_dialog.js` | adapt | Data Quality Agent 2.2.0, `831f050` | Vici's `.vc-live` markup (ViciDesign#36), the three settings, research, the cap, the warning and the estimate |
| `js/estimate.js` | adapt | Data Quality Agent 2.2.0, `831f050` | One request per step rather than a tool loop, no prompt caching, and a range from the recorded runs |
| `tests/hygiene.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; it reads the private list from `HYGIENE_TERMS`, `HYGIENE_TERMS_FILE` or `../.hygiene-terms` |
| `tests/lib/harness.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's paths and `PESTEL_TEST_OUT`, Chromium without its sandbox when the tests run as root, and the shared `openTool()` and `report()` |
| `tests/vici.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's page, key figures, strings in both languages, data ids and documents; from 0.4.0 Vici's report check on the Summary |
| `tests/policy.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | The brief's policy, this tool's storage modules, Vici's new `policyProblems()` and `storageProblems()`, and the addresses a link may open |
| `tests/vici-files.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | Compares `vici/` with ViciDesign at the exact commit through git, rather than by version number |
| `tests/i18n.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's strings and guides, and the storage keys left after switching language |
| `tests/guide-behaviour.mjs` | adapt | Duty Radar 2.1.0, `c93498e` | Runs Vici's guide check on this tool's two guides |
| `tests/access.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | From its tests/presenter.mjs: the keyboard pass and the reduced-motion sampler, for this tool's steps, guide and dialogs; the focus comparison by pixels and the checks of names and ids are new |
| `css/app.css` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The header, key figures and the strip under them; the stage and the live screens are new |
| `index.html` | adapt | Data Quality Agent 2.2.0, `831f050` | The frame: header, tiles, sentence, byline, guide and, from 0.3.0, the live-run dialog; everything inside is this tool's own |
| `tests/tokens.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; this tool's colour pairs are in `tests/lib/prototype.mjs` |
| `tests/hexagon.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; the tour of this tool's page is in `tests/lib/prototype.mjs` |
| `tests/lib/prototype.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's name, colour pairs, tour and page icon |
| `tests/page-icon.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | No loading screen, since the page is drawn before any script runs; the website's card is compared once it exists |
| `tests/run-all.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's suites; every flag goes to every suite; "ALL SUITES OK" only when all have run |
| `tests/live_site.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's files and first screen; a scenario played to its end joins in 0.2.0 |
| `.github/workflows/tests.yml` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | ViciDesign at `3b58694`, and the website, the siblings and the sources cloned beside the tool |
| `.github/workflows/live-site.yml` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Only its header comment |

Not taken: the sisters' `js/theme.js`. Its job, applying the theme before the first paint without an
inline script, now belongs to Vici as `vici/dist/vici-theme.js` (ViciDesign#25), so the next tools copy
nothing for it.

New in this tool: `js/config.js`, `js/main.js`, `js/engine.js`, `js/schemas.js` (written by
`tools/sync-schemas.mjs`), the agents' schemas in `schemas/`, `favicon.svg`, and the suites `engine`,
`schemas`, `kpis`, `layout`, `docs`, `unit` and `parity`. From 0.2.0: the three scenarios in
`data/scenarios/`, their sources in `data/sources.js`, `js/simulation.js`, the ring and factor lists in
`js/hexagon.js`, the risk matrix and horizon strip in `js/matrix.js`, `js/method.js`,
`js/guide_figures.js`, the views in `js/views/`, `tools/check-scenarios.mjs`, and the suites
`scenarios`, `audit`, `presenter` and `views`. From 0.3.0: the agents' prompts in `js/prompts.js`, the
live run in `js/pipeline.js`, the private-data warning in `js/privacy.js`, "Save run as simulation" in
`js/live_save.js`, the live views `js/views/live_start.js` and `js/views/live_work.js`, the stand-in's
answers in `tests/lib/turns.mjs`, the live suites' moves in `tests/lib/live.mjs`, and the suites `guards`,
`estimate`, `live-dialog`, `live-requests`, `live-repair`, `live-budget`, `live-errors`, `live-research`,
`live-scan`, `live-flow` and `storage`. From 0.4.0: the report in `js/report.js` and `css/report.css`, the
handoff file in `js/handoff.js`, and the suites `handoff`, `report`, `report-files` and `report-figures`.
From 1.0.0: the note a page opened from a file shows, in `index.html` and `css/app.css`, and the suite
`from-file`.
This tool first built its own KPI library, money format
and handoff schema; when the SWOT Challenger merged its versions first, it took theirs, as brief §4.1
asks, and the Business Model Canvas Challenger did the same.

## Part 2. Independent review

On 24 November 2026 a fresh agent without the builder's context reviewed release candidate `907b1c7`, read
only, against the brief, the standing requirements and the plan. It ran all thirty-seven suites (ALL SUITES
OK), probed the modules in Node and the page in Chromium (live runs against the tests' stand-in only, no
call to the real API), read the PDF, HTML and JSON files and looked at the screens at 1280 × 720 and
1920 × 1080. Its verdict was "not ready": two high, three medium and twelve low findings. Each, and what
became of it:

| ID | Severity | What | Where | State |
|---|---|---|---|---|
| R1 | high | A negative euro figure from an agent passed every check, then stopped the engine: a live run stuck between Assess and Respond without a message | `js/guards.js`, `js/risk.js`, `js/presenter.js` | fixed in `48c0630`: the Analyst's and the Strategist's checks refuse a euro figure below zero and a residual that leaves more at stake than the threat's own range, so the answer goes back once and the run stops if the repair keeps it; `tests/guards.mjs` plants each |
| R2 | high | At a live run's Scan the person could retype an AI factor's words with no "Public information only" there, and the private-data warning did not run on them | `js/hexagon.js`, `js/views/scan.js` | fixed in `48c0630`: the editor says it under the wording, tied to the field, and warns as the live-run dialog does; `tests/live-scan.mjs` checks both |
| R3 | medium | The tiles disagreed with Scan's title in a recorded run, meant another thing in a live run, and on a stop at the Writer the ring disagreed with the tiles | `js/kpis.js`, `js/views/scan.js`, `js/views/live_work.js` | fixed in `48c0630`, with Scan's "at first sight" from `7a07025`: a live run's pressure tile says after which step it stands, and after Adopt the ring shows what the tiles show; `tests/live-repair.mjs` stops at the Writer |
| R4 | medium | Targets under 40 px: the scenario chooser, the disclosures, the dialog's setting, switch and slider; the layout suite measured buttons and links only | `tests/layout.mjs`, Start, Scan, Assess, the live-run dialog | fixed in `48c0630`: Vici's controls reach 40 px (ViciDesign#47), and so do the tool's disclosures and the Accept option; the layout suite measures every kind of target, with a planted segmented option |
| R5 | medium | Mitigating a threat without a euro figure made it count in money, so what was left could exceed what was at stake | `js/engine.js`, `js/guards.js` | fixed in `48c0630`: such a threat stays out of the money, its option and the report say it counts in readiness, and the handoff file gives it no residual; `tests/engine.mjs` and `tests/handoff.mjs` plant it |
| R6 | low | A run that had used its ten requests still offered "Go on", which could not work | `js/pipeline.js`, `js/views/live_work.js` | fixed in `48c0630`: no Go on then, and the stop says what to do; `tests/live-repair.mjs` uses all ten |
| R7 | low | "Run it live" lies below the first view at 1280 × 720 | `js/views/start.js` | kept: brief §7 puts it after the steps, the Start panel scrolls to it and the guide's first chapter names it; moving it into the first view changes the brief's layout, which is Victor's call (TECH_NOTES section 8) |
| R8 | low | The private-data warning read European dates as phone numbers and "internal combustion" as a private word | `js/privacy.js` | fixed in `48c0630`: neither counts; `tests/live-dialog.mjs` adds both to its clean texts |
| R9 | low | Text shaped like an API key, pasted into the form, raised no warning, went into the prompts and into "Save run as simulation" | `js/presenter.js`, `js/privacy.js`, `js/pipeline.js` | fixed in `48c0630`: the dialog names it, the run redacts it before a prompt reads it, and the saved run redacts it; `tests/live-flow.mjs` checks the requests and the file |
| R10 | low | "Clear everything" left a copy of the checked key in the live-run dialog | `js/live_dialog.js` | fixed in `48c0630`: the dialog keeps no copy; the key lives in `js/keystore.js` alone |
| R11 | low | Spending could pass the cap in edge cases: a cut-off stream adds nothing to the meter, a retry does not check the cap again, and the Scout's search size is assumed | `js/pipeline.js`, `js/anthropic.js` | kept: a cut-off stream's usage needs a change to the shared client of all four tools, a retry follows an error that bills nothing, and Victor's first research run measures the Scout (TECH_NOTES section 8) |
| R12 | low | In the handoff file some opportunities' likelihood did not go with their expected value, and with no threat the score was 0 | `js/handoff.js` | fixed in `48c0630`: an opportunity carries the likelihood of the Analyst's upside, and the score is 100 then; `tests/handoff.mjs` checks every issue's expected value |
| R13 | low | A long company name ran out of the ring's centre and broke inside a word | `js/hexagon.js` | fixed in `48c0630`: the centre steps a long name down in three sizes and leaves out the sector, so the form's 80 characters stay inside the cell at 1280 × 720 |
| R14 | low | German PDFs print the footer in German, where standing requirement 8 quotes the English words | `js/i18n/de.js` | kept: decided in 0.4.0, as Vici's byline speaks the page's language, and every English report carries the English words; Victor confirms (TECH_NOTES section 8) |
| R15 | low | The storage suite's change of a choice timed out unseen, so that run never changed a choice | `tests/storage.mjs` | fixed in `48c0630`: it clicks the option's label and checks the choice changed |
| R16 | low | The README stated as fact how Firefox and Safari print, which nobody tested | `README.md` | fixed in `48c0630`: it says their print is untested |
| R17 | low | Polish: the report's old money lost its qualifier, "≈" wrapped away from its figure, the method's impact scale differed from the agents', a German "wo" for "als", and AI text without a lilac mark | `js/report.js`, `index.html`, `js/i18n/en.js`, `js/i18n/de.js`, `js/views/challenge.js`, `js/views/respond.js` | fixed in `48c0630`: each of the five, with a lilac AI tag on the Red team's cards, the Strategist's options and the Writer's headline |

## Part 3. Steve Jobs review and partner review

Both ran on 24 November 2026 on the running tool at `907b1c7`, opened cold in Chromium at 1280 × 720 and
1920 × 1080, in both themes and languages: the guide as it opens, every step of Auental Energie, a choice
changed at Respond, the Summary and its report, the empty live form, the live-run dialog, a live run that
stops on a rejected key and on a busy service (against the tests' stand-in), and the page opened from a
file. The layout suite's screenshots of every step are in each CI run's `test-screenshots` artefact.

### Design review: PESTEL Challenger 1.0.0

**Verdict:** INSANELY GREAT (10 of 10), after the one fix below. At `907b1c7` it was NOT DONE (9 of 10):
one row of the diagnostic failed, a screen where two numbers seemed to disagree.

**The One Thing:** show which outside forces a company isn't ready for and what they put at stake: for
Auental Energie €3.8m a year, cut to €2.2m by the responses chosen.

**Keeps its promise?** Yes. The tiles show €3.8m, 3 of 6 and readiness 51 before anything plays; the
Red team moves the heat plan to now and two more dimensions come under pressure; the risk matrix puts gas
prices first; Adopt strikes the old figures through beside €2.2m, 1 of 6 and 72; the report repeats them.

**Cut list:** nothing on the main path. Each step carries the case: Scan the AI's completion with its
dated signals, Challenge the corrections the tool is named for, Assess the evidence behind the euro
figure, Respond the decision. This cycle removed the light slab behind the report's sheets in the dark
theme (ViciDesign#44), an English region label on the German file note and "Work in progress" on the
website's card (VIP#10).

**Fix list:**

1. Done in `7a07025`. Scan's title said "1 of 6 dimensions under pressure" under a tile that says
   "3 of 6": the tile answers first, with the count after the challenge. The title now says "at first
   sight 1 of 6", so the step reads as the first look that the Red team then corrects.

**Back of the fence:** the empty live form says which field is missing; the live-run dialog shows its
estimate and cap at 1280 × 720; a rejected key and a busy service each stop with a plain message, what
the run spent and a way on; the page opened from a file says what to do in its language; the report's
sheets stay white in the dark theme. Nothing there is plywood.

### Partner review: PESTEL Challenger 1.0.0

**Verdict:** ready.

**The One Thing:** which outside forces Auental Energie isn't ready for and what they put at stake:
€3.8m a year, €2.2m after the chosen responses.

**Keeps its promise:** yes. Cold at 1280 × 720 the guide opens and its first sentence says what the tool
does; its How it works chapter gives each of the four key figures a row with its value before and after.
Closing it, the tiles already show what is at stake, and "Your turn" says what to press.

Every step, with what it does, what it is worth and which figure moved:

| Step | Doing | Worth | Key figure |
|---|---|---|---|
| Start | The team's three outside forces | €3.8m at stake on the tiles | None yet: they answer first |
| Scan | Nine AI factors from seven dated signals | The first look: 1 of 6 under pressure | The ring turns economic coral |
| Challenge | Five corrections, each with its reason and Undo | The heat plan is due by 31 December 2026 | The ring: 1 to 3 of 6, as the tile says |
| Assess | Risk matrix and horizon strip | Gas prices first, the heat plan second | The title repeats €3.8m |
| Respond | Three options per force, the recommended chosen | Watch on gas prices: €2.9m, readiness 66 | The bar moves with each choice |
| Summary | The report, page by page | €2.2m left, readiness 72, 1 of 6 | Every tile strikes the old value through |

Steps until a key figure first moves: the tiles move at Adopt, after four steps, as Vici's "answer
first" rule intends; on the way the ring and the bar move with the story, so no step is waiting to be
cut. The case survives: every figure comes from the engine, the numbers behind the matrix and the strip
are one click away, and the company is marked fictional with illustrative figures on every step.

The three things: the byline in the strip under the header, with both links; the talk track, which opens
on start, explains every key figure and ends with five timed steps; four key figures at the top right.

The screens nobody demos: the empty live form, the live-run dialog, a stop on a rejected key and on a busy
service, the dark theme, 1920 × 1080, German, and the page opened from a file: each says what happened and
what to do.

With a timer, along the guide's script: the five steps fit their five minutes, with three to five clicks
each; every figure the script quotes appears on screen as it says (€3.8m, 51, three of six; seven signals
and nine factors; five cards; gas prices first; €2.9m and 66 on Watch; €2.2m and 72 after Adopt).

**Cut list:** none; see the design review.

**Fix list:** empty. The Scan title, the one item, was fixed in `7a07025`.

**Keep list:** the byline, the talk track, the four key figures, the ring, the Red team's cards with
Undo, the risk matrix and horizon strip with their tables, the recommended responses with the bar that
moves, and the report with its footer on every page.
