/**
 * projections/schema — JSON Schema as a projected document whose claim trace is
 * EAVT tuples.
 *
 * Schema fragments unfold into append-only assertion rows (one per pointer
 * cell), rows merge by content identity, coherent rows fold back into a
 * projected JSON Schema document. This is the same event-sourced shape the
 * recorded arrival path uses, applied to the schema documents that drive `realize`,
 * OpenAPI, and MCP: a schema is a settled fold of its own assertions.
 */
import { canonicalBytes } from "../../identity/index.mjs";
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { sha256Hex } from "../../identity/index.mjs";
import { isJsonValue, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { jsonProjector } from "@red-cup-engineering/relating/codecs/text/json";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { eavtId, eavtObject, toEavt } from "../json/jsonl/eavt/row.mjs";
import { foldJson, mergeEavtLogs, unfoldJson } from "@red-cup-engineering/relating/codecs/text/json/jsonl/eavt";
import { cohereSchemaAssertions, projectSchemaAssertions } from "@red-cup-engineering/relating/writing/schema";

const basename = (path) => path.split("/").filter(Boolean).at(-1) ?? path;

export const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

/** The schema projector: JSON resources whose path ends `.schema.json`. */
export const schemaProjector = restrict(jsonProjector, {
  type: "schema",
  recognize: (resource) => basename(resource.path).endsWith(".schema.json"),
});

export function schemaAssertionId(assertion) {
  return sha256Hex(canonicalBytes(requireJsonValue(assertion, "schema value")));
}

export function assertSchemaAssertion(value) {
  const row = eavtObject(requireJsonValue(value, "schema assertion"));
  if (typeof row.e !== "string" || row.e.length === 0) throw new TypeError("schema assertion e must be a non-empty string");
  if (typeof row.a !== "string" || row.a.length === 0) throw new TypeError("schema assertion a must be a non-empty string");
  if (typeof row.t !== "string" || row.t.length === 0) throw new TypeError("schema assertion t must be a non-empty string");
  if (!isJsonValue(row.v)) throw new TypeError("schema assertion v must be a JSON value");
  return Object.freeze({ e: row.e, a: row.a, v: row.v, t: row.t });
}

export function parseSchemaAssertions(content) {
  return parseLines(content).map((value, index) => {
    try {
      return assertSchemaAssertion(value);
    } catch (error) {
      if (error instanceof Error) error.message = `line ${index + 1}: ${error.message}`;
      throw error;
    }
  });
}

export function serializeSchemaAssertions(assertions) {
  return serializeLines(assertions.map((assertion) => assertSchemaAssertion(assertion)));
}

export function mergeSchemaAssertions(...traces) {
  return mergeEavtLogs(...traces).map(assertSchemaAssertion);
}

export function unfoldSchema(schema, opts) {
  if (!opts.t) throw new TypeError("unfoldSchema: opts.t is required");
  const value = requireJsonValue(schema, "schema");
  return unfoldJson(value, { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t }).map(assertSchemaAssertion);
}

export function foldSchema(assertions) {
  const schema = foldJson(assertions);
  if (!schema || Array.isArray(schema) || typeof schema !== "object") {
    throw new TypeError("foldSchema: rows did not fold to a JSON object");
  }
  return Object.freeze(schema);
}

export function schemaAssertionTriple(assertion) {
  const asserted = assertSchemaAssertion(assertion);
  return Object.freeze({ s: asserted.e, p: asserted.a, o: asserted.v });
}

export function schemaAssertionEavt(assertion) {
  const asserted = assertSchemaAssertion(assertion);
  return toEavt({ e: asserted.e, a: asserted.a, v: asserted.v, t: asserted.t });
}

export function schemaAssertionEavtId(assertion) {
  return eavtId(schemaAssertionEavt(assertion));
}

export function resolveJsonPointer(document, fragment) {
  if (!fragment) return document;
  const pointer = fragment.startsWith("/") ? fragment : fragment.startsWith("#/") ? fragment.slice(1) : fragment;
  if (!pointer.startsWith("/")) return undefined;
  let current = document;
  for (const rawPart of pointer.slice(1).split("/")) {
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) current = current[Number(part)];
    else current = (current)[part];
  }
  return current;
}
