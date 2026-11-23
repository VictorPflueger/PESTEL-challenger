# Data sources

Every outside fact the tool shows, with its source and the date it was read. The scenarios' own figures
(the companies' size, ratings and euro ranges) are invented and illustrative, and say so on every screen
and in every report. Nothing here comes from a client or from internal material.

## 1. The method

PESTEL has no single owner. The tool describes it as a checklist of outside forces under six headings,
as strategy textbooks do. The readiness score and its scale are this tool's own (brief §6.3 and §6.5),
and the method dialog says so wherever the score appears.

| What | Source | Read on |
|---|---|---|
| PESTEL as a frame for the macro-environment: political, economic, social, technological, environmental and legal factors | Whittington, Regnér, Angwin, Hautz, Johnson and Scholes, *Exploring Strategy*, 14th edition (Pearson, © 2027), chapter 3 "Macro-environment analysis", <https://www.pearson.com/en-gb/subject-catalog/p/exploring-strategy-text-only/P200000012998> | 2026-11-23 |

## 2. The KPI library

`data/kpis.js` is the library all four tools share (brief §4.1), taken unchanged from the SWOT
Challenger at `617b122`, which merged it first. It defines each measure in English and German and holds
no benchmark value. Every definition is common practice in its sector, so no KPI cites an address; one
that does is listed here with the date it was read, and `tests/kpis.mjs` fails until it is.

## 3. Scenario facts

The three scenarios arrive in version 0.2.0. Each fact they state about the world joins this file then,
with its source and the date it was read. From 0.2.0 `tools/check-scenarios.mjs` fails on a fact
missing here. The candidate facts checked in Phase 0 are in PLAN.md section 3.
