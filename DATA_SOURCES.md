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

`data/kpis.js` defines each measure; it holds no benchmark value. Most definitions are common practice in
their sector. Where a standard body defines a measure, the KPI names that definition as its source:

| KPI | Source | Read on |
|---|---|---|
| `general.net_promoter_score` | Bain & Company, Measuring your Net Promoter Score, <https://nps.bain.com/about/measuring-your-net-promoter-score/> | 2026-11-23 |
| `general.co2_per_unit` | GHG Protocol Corporate Standard, <https://ghgprotocol.org/corporate-standard> | 2026-11-23 |
| `transport_logistics.co2_per_teu_km` | ISO 14083:2023, greenhouse gas emissions of transport chain operations, <https://www.iso.org/standard/78864.html> | 2026-11-23 |
| `energy_utilities.outage_minutes` | IEEE 1366-2022, Guide for Electric Power Distribution Reliability Indices (SAIDI), <https://standards.ieee.org/ieee/1366/7243> | 2026-11-23 |
| `banking.cet1_ratio` | Basel Framework, risk-based capital requirements (RBC20: CET1 against risk-weighted assets), <https://www.bis.org/committees/bcbs/basel-framework/standard/rbc?allChapters=true> | 2026-11-23 |
| `banking.liquidity_coverage_ratio` | Basel III: The Liquidity Coverage Ratio and liquidity risk monitoring tools, <https://www.bis.org/publ/bcbs238.htm> | 2026-11-23 |
| `insurance.solvency_ratio` | Solvency II Directive, Article 100 (eligible own funds covering the solvency capital requirement), EIOPA rulebook, <https://www.eiopa.europa.eu/rulebook/solvency-ii/article-2187_en> | 2026-11-23 |

## 3. Scenario facts

The three scenarios arrive in version 0.2.0. Each fact they state about the world joins this file then,
with its source and the date it was read. From 0.2.0 `tools/check-scenarios.mjs` fails on a fact
missing here. The candidate facts checked in Phase 0 are in PLAN.md section 3.
