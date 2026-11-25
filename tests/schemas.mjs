// The data contracts (brief §10): every schema accepts a well-formed sample and refuses a broken one; each
// agent's request format keeps to what structured outputs accept (no unsupported keyword, every object
// closed and every field required, at most 24 optional and 16 union-typed parameters per request, PLAN.md
// P5, and every enum under one type its values all have, tests/lib/api-rules.mjs: the API refused an enum
// under a type list in a live run, so a nullable enum is an anyOf of the typed enum and null); every schema
// the tool sends is one of those formats; js/schemas.js equals the JSON; and the handoff example of brief
// §4.3 validates while a broken copy of it does not. Usage: node tests/schemas.mjs
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT, report } from "./lib/harness.mjs";
import { enumProblems, schemaRefusal } from "./lib/api-rules.mjs";
import { validate, describeErrors } from "../js/schema.js";
import { SCHEMAS, REQUESTS } from "../js/schemas.js";

const results = [];
const check = (ok, what) => results.push([!!ok, what]);
const ok = (value, schema) => validate(value, schema, SCHEMAS);
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---- the module copy equals the JSON ----------------------------------------------------------------
try {
  const out = execFileSync(process.execPath, [path.join(APP_ROOT, "tools/sync-schemas.mjs"), "--check"], { encoding: "utf8" });
  check(true, `js/schemas.js equals schemas/*.json (${out.trim()})`);
} catch (e) {
  check(false, `js/schemas.js differs from schemas/*.json: ${String(e.stderr || e.message).trim()}`);
}

// ---- request formats: what structured outputs accept -------------------------------------------------
const UNSUPPORTED = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "pattern", "format",
  "minItems", "maxItems", "uniqueItems", "$ref", "$defs", "definitions", "if", "then", "else", "not", "allOf", "oneOf", "patternProperties", "const"];
function audit(schema) {
  const found = { unsupported: [], open: [], optional: 0, unions: 0, enums: enumProblems(schema).map((p) => p.message) };
  const walk = (node, where) => {
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${where}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    for (const k of Object.keys(node)) if (UNSUPPORTED.includes(k)) found.unsupported.push(`${where}.${k}`);
    if (Array.isArray(node.type) && node.type.length > 1) found.unions++;
    if (node.anyOf) found.unions++;
    if (node.type === "object" || node.properties) {
      if (node.additionalProperties !== false) found.open.push(where);
      const required = new Set(node.required || []);
      found.optional += Object.keys(node.properties || {}).filter((p) => !required.has(p)).length;
    }
    for (const [k, v] of Object.entries(node)) if (k === "properties") for (const [p, s] of Object.entries(v)) walk(s, `${where}.${p}`); else if (typeof v === "object") walk(v, `${where}.${k}`);
  };
  walk(schema, "$");
  return found;
}
for (const [name, schema] of Object.entries(REQUESTS)) {
  const a = audit(schema);
  check(!a.unsupported.length, `${name}: no keyword structured outputs refuse${a.unsupported.length ? `: ${a.unsupported.join(", ")}` : ""}`);
  check(!a.open.length, `${name}: every object is closed (additionalProperties false)${a.open.length ? `; open: ${a.open.join(", ")}` : ""}`);
  check(!a.enums.length, `${name}: every enum sits under one type that all its values have${a.enums.length ? `; not: ${a.enums.join(", ")}` : ""}`);
  check(a.optional <= 24 && a.unions <= 16, `${name}: ${a.optional} optional and ${a.unions} union-typed parameters (limits 24 and 16)`);
  check(a.optional === 0, `${name}: every field is required, with null for "not applicable"`);
}
{
  // The audit can fail: a format with a minimum, an open object and 17 unions is caught.
  const bad = { type: "object", additionalProperties: true, properties: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`f${i}`, { type: ["string", "null"] }])), required: [] };
  bad.properties.n = { type: "integer", minimum: 1 };
  const a = audit(bad);
  check(a.unsupported.length === 1 && a.open.length === 1 && a.unions === 17 && a.optional === 18, "control: the audit catches an unsupported keyword, an open object, 17 unions and optional fields");
  // The enum rule can fail: the readiness the Scanner sent in 0.4.0, a value of another type, and an object.
  const enums = audit({ type: "object", additionalProperties: false, required: ["a", "b", "c", "d"], properties: {
    a: { type: ["integer", "null"], enum: [1, 2, 3, 4, 5, null] },
    b: { type: "integer", enum: [1, "2"] },
    c: { enum: [{ x: 1 }] },
    d: { anyOf: [{ type: "integer", enum: [1, 2, 3, 4, 5] }, { type: "null" }] },
  } });
  check(enums.enums.length === 3 && !enums.enums.some((e) => e.startsWith("$.d")), `control: the audit catches an enum under a type list, a value of another type and an object, and passes a typed enum beside null (${enums.enums.join("; ")})`);
  // The stand-in answers such a request as the live run read it, for a format and for a strict tool alike.
  const planted = { type: "object", additionalProperties: false, required: ["r"], properties: { r: { type: ["integer", "null"], enum: [1, 2, null] } } };
  const said = schemaRefusal({ output_config: { format: { type: "json_schema", schema: planted } } });
  check(said === "output_config.format.schema: Invalid schema: Enum value 1 does not match declared type '['integer', 'null']'", `control: the stand-in refuses the format in the API's words (${said})`);
  check(/^tools\.1\.input_schema: Invalid schema: Enum value 1 /.test(schemaRefusal({ tools: [{ type: "web_search_20250305", name: "web_search" }, { name: "t", strict: true, input_schema: planted }] }) || ""), "control: the stand-in refuses a strict tool's schema too");
  check(Object.values(REQUESTS).every((schema) => schemaRefusal({ output_config: { format: { type: "json_schema", schema } } }) === null), "the stand-in takes every request format the tool sends");
}

// ---- what reaches the API: every schema the tool sends is one of the formats audited above ----------
{
  const { SUBMIT_SIGNALS } = await import("../js/agents/scout.js");
  check(SUBMIT_SIGNALS.strict === true && SUBMIT_SIGNALS.input_schema === REQUESTS.Signals, "the Scout's strict tool sends the Signals format the audit covers");
  const pipeline = readFileSync(path.join(APP_ROOT, "js/pipeline.js"), "utf8");
  const wrapped = [...pipeline.matchAll(/format: \{ type: "json_schema", schema: (\w+) \}/g)].map((m) => m[1]);
  const passed = [...pipeline.matchAll(/^\s+format: ([^,\n]+),$/gm)].map((m) => m[1]);
  const named = passed.map((v) => /^REQUESTS\.(\w+)$/.exec(v)?.[1]);
  check(wrapped.length === 1 && wrapped[0] === "format" && named.length === 5 && named.every((n) => n && REQUESTS[n]) && new Set(named).size === 5,
    `the pipeline sends as output format only the request formats the audit covers (${passed.join(", ")})`);
}

// ---- samples: each request accepts a good answer and refuses a broken one ----------------------------
const factor = { id: "A1", dimension: "legal", text: "Heat plan due by 31 December 2026", direction: "threat", likelihood: 5, impact: 4, horizon: "now", readiness: 2, confidence: "high", basis: "State law sets the date", evidence: [] };
const samples = {
  Scan: { sector: null, factors: [factor], ratings: [{ factor: "U1", direction: "threat", likelihood: 4, impact: 3, horizon: "now", readiness: 3, confidence: "medium", basis: "Gas prices above €80/MWh" }] },
  Issues: { issues: [{ id: "I1", type: "wrong_horizon", factors: ["A1"], dimensions: ["legal"], title: "Rated a later matter, due now", reason: "The deadline is this year.", evidence: [], confidence: "high",
    correction: { kind: "rehorizon", factor: "A1", new_factor: null, ratings: { likelihood: 5, impact: 4, horizon: "now", readiness: 2 }, dimension: null, outdated_reason: null, link: null } }] },
  Impacts: { impacts: [{ factor: "A1", kpis: [{ id: "energy_utilities.cost_to_serve", new_kpi: null, change_low: 2, change_high: 5, unit: "percent", direction: "up", basis: "Planning staff and consultants" }],
    eur_year_low: 300000, eur_year_high: 900000, not_monetisable: null, upside: null, basis: "A town of 60,000", confidence: "medium" }] },
  Responses: { responses: [{ id: "R1", factor: "A1", kind: "monitor", title: "Watch the state's guidance", first_step: "Name an owner this month", owner: "Strategy", effort: "S", time_to_impact: "0-3 months", recommended: true,
    mitigate: null, advantage: null, monitor: { signal: "Guidance published", trigger: "Deadline moves", where: "State ministry", how_often: "Monthly" } }] },
  SummaryRequest: { summary: { headline: "Two forces put {{fact:at_stake}} a year at risk", situation: "…", findings: ["a", "b", "c"], recommendation: "…", assumptions: ["x", "y", "z"] } },
  Signals: { signals: [{ title: "Gas tops €100/MWh", summary: "Two sentences.", url: "https://example.org/a", published: "2026-10-28", dimensions: ["economic"] }] },
};
const broken = {
  Scan: (s) => { s.factors[0].likelihood = 6; },
  Issues: (s) => { s.issues[0].type = "Wrong horizon"; },
  Impacts: (s) => { delete s.impacts[0].upside; },
  Responses: (s) => { s.responses[0].kind = "accept"; },
  SummaryRequest: (s) => { s.summary.extra = "x"; },
  Signals: (s) => { s.signals[0].dimensions = ["fiscal"]; },
};
for (const [name, sample] of Object.entries(samples)) {
  const good = ok(sample, REQUESTS[name]);
  check(good.valid, `${name}: a well-formed answer validates${good.valid ? "" : `: ${describeErrors(good.errors)}`}`);
  const bad = clone(sample);
  broken[name](bad);
  check(!ok(bad, REQUESTS[name]).valid, `${name}: a broken answer is refused (${describeErrors(ok(bad, REQUESTS[name]).errors).split("\n")[0]})`);
}
check(Object.keys(samples).every((n) => REQUESTS[n]) && Object.keys(REQUESTS).every((n) => samples[n]), `every request format has its samples (${Object.keys(REQUESTS).join(", ")})`);
// The nullable enums keep their meaning in the anyOf form: null and a listed value pass, any other value fails.
{
  const scan = (readiness) => { const s = clone(samples.Scan); s.ratings[0].readiness = readiness; return ok(s, REQUESTS.Scan).valid; };
  const move = (dimension) => { const s = clone(samples.Issues); Object.assign(s.issues[0].correction, { kind: "move", dimension }); return ok(s, REQUESTS.Issues).valid; };
  check(scan(null) && scan(5) && !scan(6) && !scan(2.5) && !scan("2"), "Scan: a readiness of null or 1 to 5 passes, 6, 2.5 and \"2\" fail");
  check(move(null) && move("social") && !move("fiscal"), "Issues: a correction's dimension of null or a PESTEL dimension passes, another word fails");
}

// ---- the run's own records ---------------------------------------------------------------------------
const records = {
  factor: { ...factor, id: "F1", source: "ai", evidence: [{ url: "https://example.org/a", title: "A source", read_on: "2026-11-23" }], outdated: false, eur_year_low: 300000, eur_year_high: 900000 },
  signal: { title: "Gas tops €100/MWh", summary: "Two sentences.", url: "https://example.org/a", published: null, dimensions: ["economic"], read_on: "2026-11-23" },
  "watch-item": { factor: "F1", signal: "Guidance published", trigger: "Deadline moves", where: "State ministry", how_often: "Monthly" },
  decision: { factor: "F1", choice: "R1", at: "2026-11-23T19:30:00Z", by: "you" },
  "run-event": { type: "step_end", at: "2026-11-23T19:30:00Z", step: "scan", agent: "scanner", text: "The Scanner added 9 factors." },
  "audit-event": { at: "2026-11-23T19:30:00Z", by: "you", action: "removed", target: "A4", detail: null },
  correction: samples.Issues.issues[0].correction,
  issue: samples.Issues.issues[0],
  impact: samples.Impacts.impacts[0],
  response: samples.Responses.responses[0],
  summary: samples.SummaryRequest.summary,
  "factor-new": factor,
  scenario: { id: "s3", as_of: "2026-11-23", source: "authored", company: { name: "Auental Energie", sector: "energy_utilities", country: "DE", fictional: true }, texts: { en: {}, de: {} }, team: [],
    answers: { scanner: {}, red_team: {}, analyst: {}, strategist: {}, writer: {} }, choices: [{ factor: "F1", choice: "R1", at: "2026-11-23T19:30:00Z", by: "you" }], frozen: {} },
};
const breakRecord = {
  factor: (r) => { r.text = "x".repeat(91); }, signal: (r) => { r.read_on = "23 November 2026"; }, "watch-item": (r) => { r.trigger = ""; },
  decision: (r) => { r.by = "agent"; }, "run-event": (r) => { r.step = "decide"; }, "audit-event": (r) => { r.by = "Victor"; },
  correction: (r) => { r.kind = "delete"; }, issue: (r) => { r.confidence = "certain"; }, impact: (r) => { r.kpis = "churn"; },
  response: (r) => { r.effort = "XL"; }, summary: (r) => { delete r.findings; }, "factor-new": (r) => { r.dimension = "fiscal"; },
  scenario: (r) => { r.company.fictional = false; },
};
for (const name of Object.keys(SCHEMAS).filter((n) => n !== "strategy-challenge-1")) {
  const sample = records[name];
  if (!sample) { check(false, `${name}: no sample`); continue; }
  const good = ok(sample, SCHEMAS[name]);
  check(good.valid, `${name}: a well-formed record validates${good.valid ? "" : `: ${describeErrors(good.errors)}`}`);
  const bad = clone(sample);
  breakRecord[name](bad);
  check(!ok(bad, SCHEMAS[name]).valid, `${name}: a broken record is refused`);
}

// ---- the handoff file of brief §4.3 -----------------------------------------------------------------
{
  const example = JSON.parse(readFileSync(path.join(APP_ROOT, "tests/fixtures/handoff-example.json"), "utf8"));
  const schema = SCHEMAS["strategy-challenge-1"];
  // The shared schema keeps its parts under $defs and refers to them as "#/$defs/<name>".
  const handoff = (value) => validate(value, schema, schema.$defs);
  const v = handoff(example);
  check(v.valid, `the brief's handoff example validates against strategy-challenge-1${v.valid ? "" : `: ${describeErrors(v.errors)}`}`);
  const variants = {
    "a figure written as text": (x) => { x.figures.at_stake_eur_year = "€9.5m"; },
    "an API key at the top": (x) => { x.api_key = "sk-ant-…"; },
    "another schema name": (x) => { x.schema = "strategy-challenge/2"; },
    "an unknown response kind": (x) => { x.responses[0].kind = "ignore"; },
    "a watch entry without a trigger": (x) => { x.responses[0].changes = [{ action: "watch", item: "legal-1", signal: "Guidance" }]; },
    "a likelihood of 6": (x) => { x.issues[0].likelihood = 6; },
  };
  for (const [what, change] of Object.entries(variants)) {
    const x = clone(example);
    change(x);
    check(!handoff(x).valid, `the handoff schema refuses ${what}`);
  }
  const pestel = clone(example);
  pestel.tool = { id: "pestel-challenger", name: "PESTEL Challenger", version: "0.1.0", url: "https://victorpflueger.github.io/PESTEL-challenger/" };
  pestel.framework = { type: "pestel", areas: [{ id: "legal", label: "Legal", items: [{ id: "F1", text: "Heat plan due by 31 December 2026", source: "ai", confidence: "high", basis: "State law" }] }] };
  pestel.responses[0] = { ...pestel.responses[0], kind: "monitor", residual: null, changes: [{ action: "watch", item: "F1", signal: "Guidance published", trigger: "Deadline moves" }] };
  pestel.figures.score = { name: "readiness", scale: "0-100", before: 50, after: 70 };
  pestel.figures.pressure = { label: "Dimensions under pressure", before: 3, after: 1, of: 6 };
  const p = handoff(pestel);
  check(p.valid, `a PESTEL handoff with a watch entry and readiness validates${p.valid ? "" : `: ${describeErrors(p.errors)}`}`);
}

report(results, "SCHEMAS OK");
