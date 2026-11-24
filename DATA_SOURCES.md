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

Every fact the scenarios state about the world, with its source, its publication date where the source
gives one, and the date it was read. The scenarios cite these addresses through their signals (S1 and S3
ran a research step) or through the author's checks of what the agents state from their own knowledge.
`data/sources.js` holds the same addresses with the words the page shows, and `tools/check-scenarios.mjs`
fails on an address missing from either.

### S1 Tidewell Lines

| Fact | Source | Published | Read on |
|---|---|---|---|
| By late October 2026 carriers had moved 63 % of Far East to Europe capacity back to the Suez Canal (Alphaliner) | <https://shipandbunker.com/news/emea/932812-container-lines-shift-63-of-far-east-europe-capacity-back-to-suez-canal-alphaliner> | 2026-10-21 | 2026-11-23 |
| A full return of container carriers to Suez is expected by the first quarter of 2027 | <https://www.seatrade-maritime.com/containers/full-suez-return-for-container-carriers-expected-by-q1-2027> | 2026-10-14 | 2026-11-23 |
| Drewry's World Container Index fell 3 % to $4,176 per 40 ft container on 19 November 2026, its fourth weekly fall, and stays 126 % above a year earlier | <https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry> | 2026-11-19 | 2026-11-23 |
| The US trade representative proposes to keep port fees on Chinese-built, owned or operated ships suspended until January 2027 | <https://gcaptain.com/ustr-proposes-extending-china-ship-port-fee-suspension-through-january-2027/> | 2026-10-23 | 2026-11-23 |
| The IMO's environment committee will resume its second extraordinary session on the Net-Zero Framework on Friday 4 December 2026, subject to confirmation by MEPC 85 (30 November to 3 December) | <https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-progresses-work-on-ship-emissions-pollution-and-ocean-protection.aspx> | not given | 2026-11-23 |
| 1,942 ships able to burn alternative fuels were on order in January 2026, 47 % of the orderbook by tonnage; LNG bunkering is available at 222 ports, methanol at 25 (Lloyd's Register) | <https://gcaptain.com/alternative-fuel-ship-orders-outpace-port-bunkering-infrastructure-lloyds-register-warns/> | 2026-11-02 | 2026-11-23 |
| Shipowners warn the fuel transition could slip beyond 2030 as methanol demand remains uncertain | <https://www.spglobal.com/energy/en/news-research/latest-news/refined-products/102026-shipowners-warn-fuel-transition-could-slip-beyond-2030-as-methanol-demand-remains-uncertain> | 2026-10-20 | 2026-11-23 |
| In the FIT Alliance's 2026 survey, 51.1 % of respondents use electronic bills of lading at least in part, up from 49.2 % in 2024 | <https://www.ajot.com/news/electronic-bill-of-lading-adoption-grows-as-focus-shifts-to-interoperability> | not given | 2026-11-23 |
| The EU ETS covers shipping since 1 January 2024; companies surrender allowances for 40 % of 2024 emissions (in 2025), 70 % of 2025 emissions (in 2026) and 100 % from 2026 emissions (in 2027) | <https://www.emsa.europa.eu/reducing-emissions/extension-ets.html> | not given | 2026-11-23 |
| FuelEU Maritime applies from 1 January 2025 and lowers the greenhouse gas intensity of the energy used on board in steps (−2 % in 2025 to −80 % in 2050); container ships use shore power in the main EU ports from 2030 | <https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en> | not given | 2026-11-23 |
| Parliament adopted CountEmissionsEU on 28 April 2026, with EN ISO 14083:2023 as the method for anyone who publishes the emissions of a transport | <https://oeil.europarl.europa.eu/oeil/en/procedure-document-summary/pdf?id=1899808> | 2026-04-28 | 2026-11-23 |
| Bunker prices jumped in 2026; a benchmark grade averaged $461.95 a tonne in January and February 2026 | <https://www.argusmedia.com/en/news-and-insights/market-opinion-and-analysis-blog/bunker-fuel-shipping-energy-shift> | not given | 2026-11-23 |

### S2 Arvento Drives

| Fact | Source | Published | Read on |
|---|---|---|---|
| Since 1 January 2026 producing businesses pay the EU minimum electricity tax for good; a €6.5bn federal grant lowers transmission grid fees in 2026; the gas storage levy is abolished | <https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Dossier/2026-wird-energie-spuerbar-guenstiger.html> | not given | 2026-11-23 |
| The European Commission approved a subsidised industrial power price for 2026 to 2028 on 16 April 2026, for potentially several thousand companies | <https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Pressemitteilungen/2026/04/20260416-industriestrompreis-wird-eingefuehrt.html> | 2026-04-16 | 2026-11-23 |
| The US Supreme Court ruled some of the President's tariffs unlawful on 20 February 2026, and they were lifted; tariffs of up to 50 % on steel, aluminium and their derivatives still apply | <https://www.gtai.de/de/trade/usa/branchen/trade-1029242> | not given | 2026-11-23 |
| About 40 % of the VDMA members' machinery exports to the US are hit by the steel and aluminium derivative tariffs | <https://www.vdma.eu/en/office-usa> | not given | 2026-11-23 |
| Germany's 2025 shortage analysis counts 157 occupations with a shortage of skilled workers (163 in 2024) | <https://statistik.arbeitsagentur.de/DE/Statischer-Content/Statistiken/Themen-im-Fokus/Fachkraeftebedarf/Fachkraefteengpassanalyse/Fachkraefteengpassanalyse.html> | not given | 2026-11-23 |
| Cyber Resilience Act: since 11 September 2026 manufacturers report actively exploited vulnerabilities and severe incidents (early warning within 24 hours, notification within 72 hours); full application on 11 December 2027 | <https://digital-strategy.ec.europa.eu/en/policies/cra-reporting> | not given | 2026-11-23 |
| ENISA launched the CRA single reporting platform on 11 September 2026 | <https://www.enisa.europa.eu/news/the-cra-single-reporting-platform-is-launched> | 2026-09-11 | 2026-11-23 |
| The Data Act applies since 12 September 2025; connected products placed on the market after 12 September 2026 must give users their data by design (Article 3(1)); industrial machinery is in scope | <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R2854> | not given | 2026-11-23 |
| The Commission's Data Act page confirms the dates | <https://digital-strategy.ec.europa.eu/en/policies/data-act> | not given | 2026-11-23 |
| The Machinery Regulation (EU) 2023/1230 applies from 20 January 2027 and replaces Directive 2006/42/EC | <https://single-market-economy.ec.europa.eu/sectors/mechanical-engineering/machinery_en> | not given | 2026-11-23 |

### S3 Auental Energie

| Fact | Source | Published | Read on |
|---|---|---|---|
| Bundestag and Bundesrat passed the Building Modernisation Act (GModG) on 10 July 2026; it replaces the Buildings Energy Act and drops the 65 % renewables rule for new heating | <https://www.bdew.de/energie/gebaeudemodernisierungsgesetz-ist-beschlossen/> | 2026-07-10 | 2026-11-23 |
| 194,500 heat pumps were sold in the first half of 2026 (+40 %) and 134,000 gas boilers (+1 %) | <https://www.bdh-industrie.de/fileadmin/user_upload/Downloads/PresseMeldungen/PM_BDH_Heizungsmarkt_legt_zu_11082026.pdf> | 2026-08-11 | 2026-11-23 |
| The Dutch TTF gas price passed €100/MWh intraday on 28 October 2026, for the first time since December 2022 | <https://www.spglobal.com/energy/en/news-research/latest-news/natural-gas/102826-european-gas-price-tops-100mwh-intraday-ice> | 2026-10-28 | 2026-11-23 |
| The CO2 price on heating and transport fuels stays in its corridor of €55 to €65 a tonne in 2027, as the EU's second emissions trading system moves to 2028 | <https://www.bundestag.de/presse/hib/kurzmeldungen-1210950> | 2026-09-08 | 2026-11-23 |
| Grid operators must enable energy sharing within their balancing area from 1 June 2026 (§ 42c EnWG), in neighbouring areas from June 2028 | <https://www.bundestag.de/presse/hib/kurzmeldungen-1184968> | 2026-06-16 | 2026-11-23 |
| Smart meters were installed at 5.5 % of metering points at the end of 2025 | <https://www.bundestag.de/1216244> | 2026-09-17 | 2026-11-23 |
| In a VKU survey published on 24 August 2026, 147 of 448 water suppliers answered; most found summer 2026 considerably more demanding than usual, nearly 70 % reported a strained supply and about 16 % had temporary bottlenecks | <https://www.vku.de/fileadmin/user_upload/Verbandsseite/Themen/Preise_und_Gebuehren/Auswertung_Blitzumfrage_Hitzesommer_2026.pdf> | 2026-08-24 | 2026-11-23 |
| In Lower Saxony, regional and middle-order centres must finish their heat plan by 31 December 2026 (cities over 100,000 by 30 June 2026) | <https://www.umwelt.niedersachsen.de/download/224422> | not given | 2026-11-23 |
| A €6.5bn federal grant lowers transmission grid fees in 2026 | <https://www.bundesregierung.de/breg-de/aktuelles/niedrigere-netzentgelte-2382396> | not given | 2026-11-23 |
| Since 1 January 2025 every electricity supplier must offer a dynamic tariff (§ 41a(2) EnWG); it needs a smart meter | <https://lexetius.com/EnWG/41a/lastvariable-tageszeitabhangige-oder-dynamische-und-sonstige-stromtarife> | not given | 2026-11-23 |

### What was checked and left out

Phase 0 listed four themes it could not verify: digital forwarders and booking platforms (S1), low-cost
drive makers (S2), named rivals in solar and heat pumps (S3) and an occupation-level figure for service
technicians (S2). None of them is used. S1 speaks of electronic bills of lading instead, backed by the FIT
Alliance survey; S2 speaks of the skills shortage as the shortage analysis states it, without an occupation
figure. The IMO session date and the Drewry index, which Phase 0 read from secondary sources, were confirmed
at source on 23 November 2026.
