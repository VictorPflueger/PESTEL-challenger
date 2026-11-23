# Files taken from other prototypes

Brief §5.1: every file copied or adapted from another of Victor's prototypes, with the commit it came
from and what changed. A copied file is byte for byte the source; an adapted file says so in its header.

| File | Verdict | Source | What changed and why |
|---|---|---|---|
| `vici/**` | copy | ViciDesign `eaebdca` | Vici's `dist/`, fonts, portrait, marks and licence, unchanged; `vici/README.md` names the commit |
| `data/kpis.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part the SWOT Challenger merged first (brief §4.1) |
| `js/risk.js` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: a shared part; `js/engine.js` uses its bands, expected values and money format |
| `schemas/strategy-challenge-1.json` | copy | SWOT Challenger 0.1.0, `617b122` | Unchanged: the shared handoff schema, which keeps its parts under `$defs` |
| `js/schema.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Only the header comment, which now names this tool's files; the validator's code is unchanged |
| `js/i18n/index.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key `pestel.lang`, the log prefix, no Diagnostics, and the meta description follows the language |
| `js/lang.js` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The storage key, and no loading screen |
| `tests/hygiene.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; it reads the private list from `HYGIENE_TERMS`, `HYGIENE_TERMS_FILE` or `../.hygiene-terms` |
| `tests/lib/harness.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's paths and `PESTEL_TEST_OUT`, Chromium without its sandbox when the tests run as root, and the shared `openTool()` and `report()` |
| `tests/vici.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | This tool's page, key figures, strings in both languages, data ids and documents |
| `tests/policy.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | The brief's policy, this tool's storage modules, and Vici's new `policyProblems()` and `storageProblems()` |
| `tests/vici-files.mjs` | adapt | Data Quality Agent 2.2.0, `831f050` | Compares `vici/` with ViciDesign at the exact commit through git, rather than by version number |
| `tests/i18n.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's strings and guides, and the storage keys left after switching language |
| `tests/guide-behaviour.mjs` | adapt | Duty Radar 2.1.0, `c93498e` | Runs Vici's guide check on this tool's two guides |
| `css/app.css` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | The header, key figures and the strip under them; the stage is new |
| `index.html` | adapt | Data Quality Agent 2.2.0, `831f050` | The frame: header, tiles, sentence, byline and guide; everything inside is this tool's own |
| `tests/tokens.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; this tool's colour pairs are in `tests/lib/prototype.mjs` |
| `tests/hexagon.mjs` | copy | Sovereignty Assessment 2.0.0, `35c0dea` | Unchanged; the tour of this tool's page is in `tests/lib/prototype.mjs` |
| `tests/lib/prototype.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's name, colour pairs, tour and page icon |
| `tests/page-icon.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | No loading screen, since the page is drawn before any script runs; the website's card is compared once it exists |
| `tests/run-all.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's suites; every flag goes to every suite; "ALL SUITES OK" only when all have run |
| `tests/live_site.mjs` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | This tool's files and first screen; a scenario played to its end joins in 0.2.0 |
| `.github/workflows/tests.yml` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | ViciDesign at `eaebdca`, and the website, the siblings and the sources cloned beside the tool |
| `.github/workflows/live-site.yml` | adapt | Sovereignty Assessment 2.0.0, `35c0dea` | Only its header comment |

Not taken: the sisters' `js/theme.js`. Its job, applying the theme before the first paint without an
inline script, now belongs to Vici as `vici/dist/vici-theme.js` (ViciDesign#25), so the next tools copy
nothing for it.

New in this tool: `js/config.js`, `js/main.js`, `js/engine.js`, `js/schemas.js` (written by
`tools/sync-schemas.mjs`), the agents' schemas in `schemas/`, `favicon.svg`, and the suites `engine`,
`schemas`, `kpis`, `layout`, `docs`, `unit` and `parity`. This tool first built its own KPI library,
money format and handoff schema; when the SWOT Challenger merged its versions first, it took theirs, as
brief §4.1 asks, and the Business Model Canvas Challenger did the same.
