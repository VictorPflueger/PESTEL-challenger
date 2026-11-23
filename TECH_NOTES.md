# Technical notes

How the PESTEL Challenger is built and what it rests on, with the date each fact was read. PLAN.md holds
the plan Victor approved on 23 November 2026; this file records what the build found and decided since.

## 1. Version

Version 0.2.0 (M2 Simulation): three recorded runs on fictional companies play step by step in English
and German without a key: the six dimensions around the company as Vici's ring, the factor lists with
their states, the risk matrix and the horizon strip with their tables, the steps with Play and the "Your
turn" bar, key figures that answer first, the method dialog, the guide with its talk track, and the
scenario checker. It builds on 0.1.0 (M1 Foundations): the frame, the strings, the engine with its golden
cases, the schemas, the KPI library, the security policy and CI. Nothing calls a model yet: the live run
follows in 0.3.0, the report in 0.4.0.

## 2. API facts, verified at source

Read on 23 November 2026 in the documentation, or probed from this workspace the same day (PLAN.md
section 2 has every probe). What needs a key waits for Victor's console snippet (PLAN.md section 16).

| Topic | Fact | Read or probed |
|---|---|---|
| Models | `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`; knowledge reliable to June 2026 | 2026-11-23, models overview |
| Prices | Per million tokens, input and output: Haiku 5.5 $0.10 and $0.50 (above 100,000 prompt tokens $0.50 and $2.50), Sonnet 5.5 $2 and $10, Opus 5.5 $4 and $20. Cache writes (5 minutes) $0.125, $2.50 and $5; cache reads $0.01, $0.10 and $0.20. Web search $10 per 1,000 searches; a failed search is not billed | 2026-11-23, pricing page |
| Browser access | A keyless call with `anthropic-dangerous-direct-browser-access: true` answers 401 with `access-control-allow-origin: *`; without the header the browser blocks it | 2026-11-23, probed |
| Token counting | `POST /v1/messages/count_tokens` is free and reachable from a page | 2026-11-23, probed keyless |
| Structured outputs | `output_config.format` with a JSON schema; per request at most 24 optional and 16 union-typed parameters; `minimum`, `maximum`, `minLength` and `maxLength` unsupported | 2026-11-23, structured outputs page |
| Effort and thinking | `output_config.effort` low to max, sent on every request; Haiku 5.5 takes `thinking: disabled` at high effort or below, Sonnet 5.5 takes `between_tools` instead | 2026-11-23, effort and thinking pages |
| Web search | `web_search_20250305` with `max_uses`; `pause_turn` is sent again unchanged | 2026-11-23, web search tool page |
| JSON modules | `import … with { type: "json" }` is blocked by `connect-src` under the page's policy, so the schemas ship as a module | 2026-11-23, probed in Chrome 153 |
| Print footer | Chromium prints `@page` margin boxes with page numbers; Firefox and Safari have none (MDN data, not probed), so a fixed footer takes over there | 2026-11-23, probed in Chromium |

The prices were read again on 24 November 2026, unchanged, before the simulation's cost estimate came to
rest on them; they are read again before M3's cost meter does.

## 3. Decisions in use

The brief gives each decision a default so the build never waits (brief §14). Victor approved the plan's
recommendations with PLAN.md on 23 November 2026.

| ID | Decision | In use |
|---|---|---|
| D1 | Name and subtitle | "PESTEL Challenger"; the page title says "outside forces, put to the test" |
| D2 | Icon | Vici's radar icon in a lilac hexagon, in the header and the page icon |
| D3 | Languages | English and German from version 0.1.0 |
| D4 | Default setting and cap | Balanced and €0.50 (from 0.3.0) |
| D5 | Web research | Off by default, with a visible switch that recommends it (from 0.3.0) |
| D6 | PDF | The browser's Save as PDF, no library (from 0.4.0) |
| D7 | Handing over to the Ideator | Download and link (from 0.4.0) |
| D8 | Scenario names | Tidewell Lines, Arvento Drives and Auental Energie |
| D9 | Readiness | As brief §6.5 defines it, shown with its rule and called this tool's own measure |
| D10 | Research in the scenarios | S1 and S3 with a recorded research step, S2 without |
| D11 | Depth | Up to eight issues, no Quick or Deep |
| N1 | S3's story | Retold around the heat plan due on 31 December 2026 (from 0.2.0) |
| N2 | Requests per run | At most ten (from 0.3.0) |
| N3 | Upload | None |

Decided while building 0.2.0, each within the brief and the plan:

| What | Decision |
|---|---|
| The fictional company | "Fictional company, illustrative figures" stands among Start's tags and with every later step's title, beside the header's SIMULATION tag, which is the simulation's tape (AC-05) |
| Facts from the agents' own knowledge | Each scenario's `checked` lists, per factor, the address its author read for a fact the agents state without a signal; the factor shows it as "checked at source by the scenario's author". S2, without research, also shows the note that the model's knowledge ends in June 2026 |
| German words | A threat is a "Risiko", an opportunity a "Chance", readiness the "Vorbereitungsgrad"; the steps are Start, Scan, Prüfung, Bewertung, Antworten and Zusammenfassung |
| Assess | The whole stage: the risk matrix, the horizon strip and the three threats that put most at stake by their numbers, so the room reads what "1" is. At 1280 × 720 the matrix's key stands beside its grid, the step's button under the strip, the three names run as one paragraph and the lead gives way to them, so all of it is in view |
| A dimension's state | "Under pressure", "On watch" or "Addressed" ("Unter Druck", "Im Blick", "Angegangen"), so a state never reads like the response "Watch it" |
| Marker sizes | Thirds of the largest expected loss: smaller below a third, larger from two thirds, with Vici's `vc-risk__marker--sm` and `--lg` (ViciDesign#29); the key names each size in euros |
| The session cost of a simulation | An estimate on Balanced, said on the tile: each agent's request rebuilt from what it reads and answers at about four characters a token, a 1,500-token prompt, each answer counted twice for thinking, five searches of 4,000 tokens with research, the prices above and €0.894 to the dollar (`js/estimate.js`) |
| The talk track | The brief's draft (§8): five steps in five minutes, with action labels and figures from the engine. Its last step shows the PDF from 0.4.0; until then it shows the summary and the watch list |
| The guide's chapters | Six: the brief's four (What it does, How it works, What is real, How to present) and two a stranger needs to play it alone (The six steps, The cost estimate); each fits at 1280 × 720 |
| Check for updates | A scenario whose facts were read more than 90 days ago says so on Start (`needsUpdate()` in `js/format.js`) |
| Vici | The ring (ViciDesign#30), the horizon strip (#31) and square radios in the segmented control (#33) went into Vici first; `vici/` copies its main at the commit `vici/README.md` names |

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
runs all twenty suites and ends with "ALL SUITES OK"; `node tests/run-all.mjs engine layout` runs only
the suites named. From 0.2.0 the suites `scenarios` and `audit` prove the scenario checker and the fact
audit, `presenter` plays every scenario in both languages, `views` checks the ring, the lists, the matrix
and the strip on every screen, and `layout`, `hexagon`, `vici` and `i18n` look at every step.
`node tools/check-scenarios.mjs` runs the checker alone; `--frozen` prints the figures to freeze after a
deliberate change. Vici's checks need a ViciDesign checkout beside this repository at the commit
`vici/README.md` names; `--require-vici` makes its absence a failure, as it always is on GitHub Actions.
Checkouts of the website (VIP), the three siblings and the prototypes `REVIEW.md` names, beside this
repository, let the page-icon, parity and docs suites compare with them; without one, that part is skipped
and says so. `tests/hygiene.mjs` reads its private term list from the `HYGIENE_TERMS` secret, a
`HYGIENE_TERMS_FILE`, or `../.hygiene-terms`.

The tests workflow does all of this on every push and pull request and keeps the layout suite's
screenshots of every step as the run's `test-screenshots` artefact. After each Pages build the live-site
workflow runs `tests/live_site.mjs`: the published files equal the commit, the page starts in both
languages, and the default scenario plays to its end in each.

## 8. Deviations and open issues

- **Hygiene without the private list in CI.** Victor has not set the `HYGIENE_TERMS` secret yet. CI runs
  `tests/hygiene.mjs` in its generic mode ("HYGIENE GENERIC OK"); the build session runs it with its own
  list before every push, which must print "HYGIENE OK".
- **Not yet run against the real API.** Nothing in 0.2.0 calls a model. The recorded runs were written
  in the agents' answer formats and pass the checks a live answer will pass; the probes that need a key
  wait for Victor's console snippet before M3.
- **Firefox and Safari print** without page numbers in the footer; checked by hand in M4.
- **Shared parts taken from the SWOT Challenger.** This tool first built its own KPI library, money
  format and handoff schema; the SWOT Challenger merged its versions first (`617b122`), so this tool took
  them unchanged, as brief §4.1 asks. Three things this tool's versions had are proposals for a change
  agreed in all four tools: a billions scale (the shared format shows €1,234,567,890 as €1234.6m), a
  standard source for the seven KPIs a standard body defines (net promoter score, CO2 per unit, CO2 per
  container-kilometre, grid outage minutes, CET1 ratio, liquidity coverage ratio, solvency ratio), and a
  range format for the factor view of 0.2.0.
- **What the guide promises ahead.** The guide names the live run (0.3.0) and the report (0.4.0) as
  coming, and Start says what this version holds. The talk track's last step shows the summary until the
  PDF arrives.
- **The cost estimate is an assumption** until Victor's first live runs measure what each step costs; the
  tile and the method dialog say it is an estimate and what it rests on.
