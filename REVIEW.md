# Files taken from other prototypes

Brief §5.1: every file copied or adapted from another of Victor's prototypes, with the commit it came
from and what changed. A copied file is byte for byte the source; an adapted file says so in its header.

| File | Verdict | Source | What changed and why |
|---|---|---|---|
| `vici/**` | copy | ViciDesign `ca9c552` | Vici's `dist/`, fonts, portrait, marks and licence, unchanged; `vici/README.md` names the commit |
| `data/kpis.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part the SWOT Challenger merged first (brief §4.1) |
| `js/risk.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part; `js/engine.js` uses its bands, expected values and money format |
| `schemas/strategy-challenge-1.json` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: the shared handoff schema, which keeps its parts under `$defs` |
| `js/schema.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Only the header comment, which now names this tool's files; the validator's code is unchanged |
| `js/i18n/index.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key `pestel.lang`, the log prefix, no Diagnostics, and the meta description follows the language |
| `js/lang.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key, and no loading screen |
| `js/facts.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Dates in every common form, the run's evidence URLs and names with digits set aside; none of that tool's ids |
| `js/format.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Money from the shared `js/risk.js`, euro ranges, KPI changes and dates; no shares or deltas |
| `js/scenario_check.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | From its runs_check.js: this tool's scenario format, its fact audit, guardrails, frozen figures and three plays |
| `js/dom.js` | adapt | Data Quality Agent 2.2.0, `831f050` | Only `h()` and `clear()`, and no option that writes markup as text |
| `js/clock.js` | copy | Data Quality Agent 2.2.0, `831f050` | Unchanged: today for the scenario's age, which a test can pin |
| `js/run.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its run_model.js: the six steps of this method, the factors at each step, the person's choices and, from 0.3.0, their edits |
| `js/presenter.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its app.js: this tool's steps, Play, Your turn, the ring and the address of a step; from 0.3.0 the live run, which has no address |
| `js/views/common.js` | adapt | Data Quality Agent 2.2.0, `831f050` | From its steps_view.js: the heading, the button, Your turn and the foot of each step |
| `js/kpis.js` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's four key figures, worked out by the engine from the run, recorded or live |
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
| `tests/vici.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's page, key figures, strings in both languages, data ids and documents |
| `tests/policy.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | The brief's policy, this tool's storage modules, and Vici's new `policyProblems()` and `storageProblems()` |
| `tests/vici-files.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | Compares `vici/` with ViciDesign at the exact commit through git, rather than by version number |
| `tests/i18n.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's strings and guides, and the storage keys left after switching language |
| `tests/guide-behaviour.mjs` | adapt | Duty Radar 2.1.0, `c93498e` | Runs Vici's guide check on this tool's two guides |
| `css/app.css` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The header, key figures and the strip under them; the stage and the live screens are new |
| `index.html` | adapt | Data Quality Agent 2.2.0, `831f050` | The frame: header, tiles, sentence, byline, guide and, from 0.3.0, the live-run dialog; everything inside is this tool's own |
| `tests/tokens.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; this tool's colour pairs are in `tests/lib/prototype.mjs` |
| `tests/hexagon.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; the tour of this tool's page is in `tests/lib/prototype.mjs` |
| `tests/lib/prototype.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's name, colour pairs, tour and page icon |
| `tests/page-icon.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | No loading screen, since the page is drawn before any script runs; the website's card is compared once it exists |
| `tests/run-all.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's suites; every flag goes to every suite; "ALL SUITES OK" only when all have run |
| `tests/live_site.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's files and first screen; a scenario played to its end joins in 0.2.0 |
| `.github/workflows/tests.yml` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | ViciDesign at `ca9c552`, and the website, the siblings and the sources cloned beside the tool |
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
`live-scan`, `live-flow` and `storage`. This tool first built its own KPI library, money format
and handoff schema; when the SWOT Challenger merged its versions first, it took theirs, as brief §4.1
asks, and the Business Model Canvas Challenger did the same.
