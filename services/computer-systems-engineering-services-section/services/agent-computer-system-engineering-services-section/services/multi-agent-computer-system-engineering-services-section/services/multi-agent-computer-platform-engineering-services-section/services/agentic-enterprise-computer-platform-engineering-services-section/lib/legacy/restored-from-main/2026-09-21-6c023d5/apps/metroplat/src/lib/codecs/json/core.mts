/**
 * codecs/text/json - the JSON representation boundary.
 *
 * JSON is the wire form for everything passed *between* scripts. This boundary
 * validates JSON membership, canonicalizes (object keys sorted, stable bytes so
 * idempotence is detectable across a pipe), and projects JSON-line documents.
 * Free data enters or leaves only through here; core code works over admitted JSON values.
 */
import { define, type Projector, type Resource } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/typed-resource-classification-kernel-service/src/index.mjs";
import { canonicalBytes } from "../../identity/index.mts";

/** A JSON value: the closed universe of JSON. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
/** A JSON object. */
export type JsonRecord = { readonly [key: string]: JsonValue };

/** Whether a value inhabits the JSON universe (finite numbers only, plain objects). */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

/** Whether a value is a JSON object (not null, not an array). */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Admit a value as JSON or throw — the free-data gate. */
export function requireJsonValue(value: unknown, context: string): JsonValue {
  if (!isJsonValue(value)) throw new TypeError(`${context}: not a JSON value`);
  return value;
}

/** Parse JSON text and validate the result as a JSON value. */
export function parse(text: string): JsonValue {
  return requireJsonValue(JSON.parse(text), "json");
}

/** Admit an arbitrary runtime value as a JSON resource by round-tripping it
 *  through JSON and checking membership. This is the boundary gate for frozen
 *  class instances and other runtime values whose enumerable shape is JSON. */
export function jsonResource(value: unknown, context = "json resource"): JsonValue {
  return requireJsonValue(JSON.parse(JSON.stringify(value)) as unknown, context);
}

/** The non-blank lines of a document. */
export const nonBlankLines = (content: string): string[] =>
  content.split("\n").filter((line) => line.trim() !== "");

/** Parse newline-delimited JSON, skipping blank lines; each line validated. A
 *  line that fails to parse throws naming its position among the document's
 *  non-blank lines, not just the bare JSON syntax error. */
export function parseLines(content: string): JsonValue[] {
  const out: JsonValue[] = [];
  let nonBlankIndex = 0;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    nonBlankIndex += 1;
    try {
      out.push(parse(trimmed));
    } catch (error) {
      throw new TypeError(`line ${nonBlankIndex}: ${error instanceof Error ? error.message : "invalid JSON"}`);
    }
  }
  return out;
}

/** Serialize values as newline-delimited canonical JSON (trailing newline). */
export function serializeLines(values: readonly JsonValue[]): string {
  return values.length === 0 ? "" : `${values.map(canonicalBytes).join("\n")}\n`;
}

/** The JSON projector: recognizes any content that parses as JSON; reads it as a
 *  single carried value; writes one canonical document. */
export const jsonProjector: Projector<JsonValue> = define<JsonValue>({
  type: "json",
  corner: "data",
  rung: "identity",
  recognize: (resource: Resource) => {
    try {
      JSON.parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => [parse(resource.content)],
  write: (items) => (items.length === 0 ? "" : `${canonicalBytes(items[0] as JsonValue)}\n`),
});

/** The JSON-lines projector: its own root, NOT a restriction of `json` — a
 *  multi-line JSONL document is not a JSON document, so mounting it under the
 *  JSON recognizer would refuse every real log. Reads each line as a carried
 *  value. */
export const jsonlProjector: Projector<JsonValue> = define<JsonValue>({
  type: "jsonl",
  corner: "data",
  rung: "identity",
  recognize: (resource: Resource) => {
    try {
      parseLines(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => parseLines(resource.content),
  write: (items) => serializeLines(items),
});
