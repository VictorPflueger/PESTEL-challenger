// The sector KPI library (brief §6.4), the shared data/kpis.js: thirteen sectors, 8 to 12 KPIs each and
// the ten named general ones; every KPI with its id, both languages, a unit, a direction and a source; no
// benchmark values; the starting points the brief names for the scenario sectors; and every URL source,
// if the library has any, listed in DATA_SOURCES.md with the date it was read. The checker first fails on
// a planted bad library.
// Usage: node tests/kpis.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT, report } from "./lib/harness.mjs";
import { SECTORS, KPIS, kpisFor, kpiById } from "../data/kpis.js";

const COMMON_PRACTICE = "common practice";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);

const SECTOR_IDS = ["telecom", "transport_logistics", "automotive_mobility", "industrial_manufacturing", "energy_utilities", "retail_consumer",
  "banking", "insurance", "health_life_sciences", "public_sector", "software_digital", "chemicals_materials", "general"];
const GENERAL = ["revenue", "ebit_margin", "gross_margin", "free_cash_flow", "customer_churn", "net_promoter_score", "customer_acquisition_cost",
  "customer_lifetime_value", "staff_turnover", "co2_per_unit"];
// Words that would turn a definition into a benchmark or a judgement.
const BENCHMARK = /\b(typical(ly)?|benchmark|best[- ]in[- ]class|healthy|industry average|should be|aim for|world[- ]class)\b/i;

/** Every problem of one KPI; an empty list means it keeps the library's rules. */
function kpiProblems(k, sectors) {
  const p = [];
  if (!/^[a-z_]+\.[a-z0-9_]+$/.test(k.id || "") || !k.id.startsWith(`${k.sector}.`)) p.push(`id "${k.id}" is not <sector>.<name>`);
  if (!sectors.includes(k.sector)) p.push(`sector "${k.sector}" is not in the library`);
  for (const l of ["en", "de"]) {
    if (!String(k.name?.[l] || "").trim()) p.push(`no ${l} name`);
    const def = String(k.definition?.[l] || "").trim();
    if (!def) p.push(`no ${l} definition`);
    else if (!/[.)]$/.test(def)) p.push(`${l} definition is not a sentence`);
    if (BENCHMARK.test(def)) p.push(`${l} definition reads as a benchmark: ${def.match(BENCHMARK)[0]}`);
  }
  if (!String(k.unit || "").trim()) p.push("no unit");
  if (!["higher", "lower"].includes(k.better)) p.push(`better is "${k.better}", not higher or lower`);
  if (k.source !== COMMON_PRACTICE && !/^https:\/\/[^\s]+$/.test(k.source || "")) p.push(`source "${k.source}" is neither an address nor common practice`);
  return p;
}

// ---- the checker can fail ---------------------------------------------------------------------------
{
  const bad = { id: "energy.churn", sector: "energy", name: { en: "Churn", de: "" }, unit: "", better: "up", definition: { en: "Typically 8% a year", de: "Wechsel" }, source: "a website" };
  const p = kpiProblems(bad, SECTOR_IDS);
  check(p.length >= 7, `control: a planted bad KPI shows ${p.length} problems (${p.join("; ")})`);
}

// ---- sectors and counts -----------------------------------------------------------------------------
check(SECTORS.map((s) => s.id).join() === SECTOR_IDS.join(), `the thirteen sectors of the brief, in order (${SECTORS.length})`);
check(SECTORS.every((s) => s.name.en && s.name.de), "every sector has an English and a German name");
for (const s of SECTOR_IDS.filter((id) => id !== "general")) {
  const n = KPIS.filter((k) => k.sector === s).length;
  check(n >= 8 && n <= 12, `${s}: ${n} KPIs (8 to 12)`);
}
const general = KPIS.filter((k) => k.sector === "general").map((k) => k.id.split(".")[1]);
check(general.join() === GENERAL.join(), `general holds exactly the ten the brief names (${general.join(", ")})`);

// ---- every KPI --------------------------------------------------------------------------------------
const ids = KPIS.map((k) => k.id);
check(new Set(ids).size === ids.length, `${ids.length} KPIs, every id unique`);
const problems = KPIS.flatMap((k) => kpiProblems(k, SECTOR_IDS).map((p) => `${k.id}: ${p}`));
check(!problems.length, `every KPI has its id, both languages, a unit, a direction and a source, and no benchmark${problems.length ? `: ${problems.join("; ")}` : ""}`);
check(KPIS.every((k) => Object.isFrozen(k) && Object.isFrozen(k.name) && Object.isFrozen(k.definition)), "the library cannot be changed at run time");
// A figure in a definition belongs to the definition (9 or 10 out of 10, 90 days past due), never to a
// benchmark: no definition gives a value as a level or a share to reach.
const asTarget = KPIS.filter((k) => /\b\d+(?:[.,]\d+)?\s*(?:%|per cent|Prozent)\b(?![^.]*\b(?:of|der|des)\b)/i.test(k.definition.en) && BENCHMARK.test(k.definition.en));
check(!asTarget.length, `no definition sets a level to reach${asTarget.length ? `: ${asTarget.map((k) => k.id).join(", ")}` : ""}`);

// ---- the brief's starting points for the scenario sectors -------------------------------------------
const STARTING = {
  transport_logistics: ["cost per container moved", "average freight rate", "schedule reliability", "vessel utilisation", "fuel cost per container", "co2 per container-kilometre", "cost of moving empty containers"],
  industrial_manufacturing: ["order intake", "book-to-bill ratio", "share of service revenue", "share of recurring revenue", "on-time delivery", "share of the installed base that is connected", "warranty cost", "technician utilisation"],
  energy_utilities: ["churn", "cost to serve per customer", "gross margin per megawatt hour", "minutes of grid outage per customer a year", "share of smart meters installed", "bad debt", "heat customers connected"],
};
for (const [sector, names] of Object.entries(STARTING)) {
  const have = KPIS.filter((k) => k.sector === sector).map((k) => k.name.en.toLowerCase());
  const missing = names.filter((n) => !have.some((h) => h.includes(n)));
  check(!missing.length, `${sector} has the brief's starting points${missing.length ? `; missing: ${missing.join(", ")}` : ` (${names.length})`}`);
}
check(kpiById("transport_logistics.cost_per_teu")?.name.en === "Cost per container moved", "the handoff example's KPI id names the same measure");
check(kpisFor("energy_utilities").length === KPIS.filter((k) => ["energy_utilities", "general"].includes(k.sector)).length && kpisFor("energy_utilities")[0].sector === "energy_utilities",
  "kpisFor gives the sector's KPIs first, then the general ones");

// ---- every URL source is in DATA_SOURCES.md with its date ---------------------------------------------
const sources = readFileSync(path.join(APP_ROOT, "DATA_SOURCES.md"), "utf8").split("\n");
const urls = [...new Set(KPIS.filter((k) => k.source !== COMMON_PRACTICE).map((k) => k.source))];
const undated = urls.filter((u) => !sources.some((line) => line.includes(u) && /\b20\d\d-\d\d-\d\d\b/.test(line)));
check(!undated.length, `${urls.length ? `${urls.length} standard definitions, each` : "no KPI cites an address; any that does must be"} in DATA_SOURCES.md with the date read${undated.length ? `; missing: ${undated.join(", ")}` : ""}`);
check(KPIS.length === new Set(KPIS.map((k) => k.id)).size && KPIS.every((k) => k.source === COMMON_PRACTICE || /^https:/.test(k.source)), `every source is common practice or an address (${KPIS.filter((k) => k.source === COMMON_PRACTICE).length} of ${KPIS.length} common practice)`);

report(results, "KPIS OK");
