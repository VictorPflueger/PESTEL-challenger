// What the Claude API refuses in a schema although a JSON Schema validator would take it, shared by the
// schema suite (tests/schemas.mjs) and the API stand-in (tests/lib/fake-claude.mjs), so that neither the
// audit nor a scripted run accepts a schema the API turns down.
//
// An enum under a type list. A live run on 2026-11-25 stopped at the Scanner with "The API refused the
// request (400): output_config.format.schema: Invalid schema: Enum value 1 does not match declared type
// '['integer', 'null']'": the API reads each enum value against the declared type as one word, so an enum
// under ["integer", "null"] fails even where every value fits. A nullable enum is therefore written as an
// anyOf of the typed enum and { "type": "null" } (TECH_NOTES §2 and §6).

/** Whether a value has a JSON Schema type. */
const ofType = (v, t) => (t === "null" ? v === null : t === "integer" ? Number.isInteger(v) : t === "number" ? typeof v === "number" : typeof v === t);

/** The type list as the API writes it in its message: ['integer', 'null']. */
const listed = (type) => `[${type.map((t) => `'${t}'`).join(", ")}]`;

/**
 * The enums of a schema the API would refuse, in document order: [{ where, type, value, message }].
 * An enum sits under one declared type that each of its values has, and holds only strings, numbers,
 * booleans or null. An empty list means the enums pass.
 */
export function enumProblems(schema) {
  const found = [];
  const walk = (node, where) => {
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${where}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.enum)) {
      const first = node.enum[0];
      if (Array.isArray(node.type)) {
        found.push({ where, message: `${where}: an enum under the type list ${JSON.stringify(node.type)}`, api: `Enum value ${JSON.stringify(first)} does not match declared type '${listed(node.type)}'` });
      } else if (typeof node.type === "string" && !node.enum.every((v) => ofType(v, node.type))) {
        const odd = node.enum.find((v) => !ofType(v, node.type));
        found.push({ where, message: `${where}: the enum value ${JSON.stringify(odd)} is no ${node.type}`, api: `Enum value ${JSON.stringify(odd)} does not match declared type '${node.type}'` });
      } else if (!node.enum.every((v) => v === null || ["string", "number", "boolean"].includes(typeof v))) {
        found.push({ where, message: `${where}: an enum holds an object or an array`, api: "Enum values must be strings, numbers, booleans or null" });
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "properties" && v && typeof v === "object") for (const [p, s] of Object.entries(v)) walk(s, `${where}.${p}`);
      else if (k !== "enum" && typeof v === "object") walk(v, `${where}.${k}`);
    }
  };
  walk(schema, "$");
  return found;
}

/**
 * The 400 message the API would give a Messages request for its first refused enum, or null when it would
 * take them all. The format's wording is the one the live run read; the stand-in words a strict tool's the
 * same way under its own field name, which no live run has shown yet.
 */
export function schemaRefusal(req) {
  const format = req?.output_config?.format;
  if (format?.type === "json_schema") {
    const [p] = enumProblems(format.schema);
    if (p) return `output_config.format.schema: Invalid schema: ${p.api}`;
  }
  for (const [i, tool] of (Array.isArray(req?.tools) ? req.tools : []).entries()) {
    if (!tool?.strict || !tool.input_schema) continue;
    const [p] = enumProblems(tool.input_schema);
    if (p) return `tools.${i}.input_schema: Invalid schema: ${p.api}`;
  }
  return null;
}
