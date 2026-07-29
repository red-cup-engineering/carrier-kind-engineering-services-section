import { createHash } from "node:crypto";
import { canonical, isJsonRecord, isJsonValue, requireJsonValue, type JsonRecord, type JsonValue } from "@red-cup-engineering/json-file-codec-service";

export const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema" as const;
export const SUPPORTED_VOCABULARY = Object.freeze(["$schema", "$id", "$ref", "$defs", "type", "enum", "const", "required", "properties", "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "allOf", "anyOf", "oneOf", "not", "if", "then", "else"] as const);
const supported = new Set<string>(SUPPORTED_VOCABULARY);

export type Schema = Readonly<JsonRecord>;
export type Violation = Readonly<{ pointer: string; keyword: string; message: string }>;
export type Validation = Readonly<{ ok: boolean; errors: readonly Violation[] }>;
export type IdentityReceipt = Readonly<{ id: string; schemaId: string; eavtEntity: null; filepath: null; canonicalBytes: string; sha256: string; ni: string; rmn: null; status: "sxc-ready-not-settled" }>;
export type SchemaReceipt = Readonly<{ schema: Schema; identity: IdentityReceipt }>;

function hash(bytes: string): { hex: string; ni: string } { const digest = createHash("sha256").update(bytes, "utf8"); return { hex: digest.digest("hex"), ni: `ni:///sha-256;${createHash("sha256").update(bytes, "utf8").digest("base64url")}` }; }
function ptr(parts: readonly (string | number)[]): string { return parts.length === 0 ? "" : `/${parts.map((p) => String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`; }
function record(value: JsonValue, what: string): JsonRecord { if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object`); return value; }
function immutable<T>(value: T): T { return Object.freeze(value); }
function immutableJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableJson));
  if (isJsonRecord(value)) return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutableJson(child)])));
  return value;
}

/** Canonicalize and admit one fixed-dialect schema with an exact vocabulary. */
export function createSchema(input: unknown, id?: string): SchemaReceipt {
  const raw = record(requireJsonValue(input, "schema"), "schema");
  const claimed = raw["$id"];
  const chosen = id ?? (typeof claimed === "string" ? claimed : undefined);
  if (!chosen) throw new TypeError("schema requires a non-empty $id");
  if (claimed !== undefined && claimed !== chosen) throw new TypeError("schema $id disagrees with requested identity");
  const dialect = raw["$schema"];
  if (dialect !== undefined && dialect !== DRAFT_2020_12) throw new TypeError(`unsupported dialect ${JSON.stringify(dialect)}`);
  const schema = record(immutableJson({ ...raw, "$schema": DRAFT_2020_12, "$id": chosen }), "schema");
  admitSchema(schema, "$", new Set<JsonValue>());
  const canonicalBytes = canonical(schema);
  const digest = hash(canonicalBytes);
  return immutable({ schema, identity: immutable({ id: chosen, schemaId: chosen, eavtEntity: null, filepath: null, canonicalBytes, sha256: digest.hex, ni: digest.ni, rmn: null, status: "sxc-ready-not-settled" }) });
}

function admitSchema(value: JsonValue, at: string, seen: Set<JsonValue>): void {
  if (value === true || value === false) return;
  const schema = record(value, `schema at ${at}`); if (seen.has(value)) return; seen.add(value);
  for (const key of Object.keys(schema)) if (!supported.has(key)) throw new TypeError(`${at}: unsupported Draft 2020-12 keyword ${key}`);
  const descend = (child: JsonValue, key: string): void => admitSchema(child, `${at}/${key}`, seen);
  for (const key of ["$defs", "properties"]) { const group = schema[key]; if (group !== undefined) for (const [name, child] of Object.entries(record(group, key))) descend(child, `${key}/${name}`); }
  for (const key of ["items", "not", "if", "then", "else", "additionalProperties"]) { const child = schema[key]; if (child !== undefined && typeof child !== "boolean") descend(child, key); }
  for (const key of ["allOf", "anyOf", "oneOf"]) { const list = schema[key]; if (list !== undefined) { if (!Array.isArray(list)) throw new TypeError(`${at}/${key} must be an array`); list.forEach((child, i) => descend(child, `${key}/${i}`)); } }
}

export function resolvePointer(document: JsonValue, fragment: string): JsonValue | undefined {
  if (fragment === "" || fragment === "#") return document;
  const pointer = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!pointer.startsWith("/")) return undefined;
  let current: JsonValue | undefined = document;
  for (const escaped of pointer.slice(1).split("/")) { const part = escaped.replaceAll("~1", "/").replaceAll("~0", "~"); if (Array.isArray(current)) current = current[Number(part)]; else if (isJsonRecord(current)) current = current[part]; else return undefined; }
  return current;
}

export interface SchemaCorpus { readonly byId: ReadonlyMap<string, Schema>; readonly register: (schema: Schema) => void; readonly resolve: (ref: string, base: Schema) => Schema | undefined; }
export function schemaCorpus(initial: readonly Schema[] = []): SchemaCorpus {
  const byId = new Map<string, Schema>(); const register = (schema: Schema): void => { const id = schema["$id"]; if (typeof id !== "string" || !id) throw new TypeError("schema corpus requires $id"); if (byId.has(id)) throw new TypeError(`duplicate schema $id ${id}`); byId.set(id, schema); }; initial.forEach(register);
  const resolve = (ref: string, base: Schema): Schema | undefined => { if (ref.startsWith("#")) { const found = resolvePointer(base, ref); return found === undefined ? undefined : record(found, `ref ${ref}`); } const hashAt = ref.indexOf("#"); const id = hashAt < 0 ? ref : ref.slice(0, hashAt); if (/^(?:https?|file|node):/iu.test(id) || id.startsWith("//")) return undefined; const target = byId.get(id); if (!target) return undefined; const found = hashAt < 0 ? target : resolvePointer(target, ref.slice(hashAt)); return found === undefined ? undefined : record(found, `ref ${ref}`); };
  return immutable({ byId, register, resolve });
}

function typeOf(value: JsonValue): string { return value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value; }
function same(a: JsonValue, b: JsonValue): boolean { return canonical(a) === canonical(b); }
function test(value: JsonValue, schema: Schema, corpus: SchemaCorpus, errors: Violation[], at: readonly (string | number)[], stack: Set<Schema>): void {
  if (stack.has(schema)) { errors.push(immutable({ pointer: ptr(at), keyword: "$ref", message: "cyclic schema evaluation refused" })); return; }
  stack.add(schema); const add = (keyword: string, message: string): void => { errors.push(immutable({ pointer: ptr(at), keyword, message })); };
  const ref = schema["$ref"]; if (typeof ref === "string") { const target = corpus.resolve(ref, schema); if (!target) add("$ref", `unresolved or external reference ${ref}`); else test(value, target, corpus, errors, at, stack); }
  const type = schema.type; if (typeof type === "string") { const actual = typeOf(value); if (!(type === "number" ? actual === "number" || actual === "integer" : actual === type)) add("type", `expected ${type}, got ${actual}`); }
  if (schema.const !== undefined && !same(value, schema.const)) add("const", "value differs from const");
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => same(item, value))) add("enum", "value is not enumerated");
  if (typeof value === "string") { if (typeof schema.minLength === "number" && [...value].length < schema.minLength) add("minLength", "string too short"); if (typeof schema.maxLength === "number" && [...value].length > schema.maxLength) add("maxLength", "string too long"); if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) add("pattern", "string does not match pattern"); }
  if (typeof value === "number") for (const [key, fail] of [["minimum", typeof schema.minimum === "number" && value < schema.minimum], ["maximum", typeof schema.maximum === "number" && value > schema.maximum], ["exclusiveMinimum", typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum], ["exclusiveMaximum", typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum], ["multipleOf", typeof schema.multipleOf === "number" && value % schema.multipleOf !== 0]] as const) if (fail) add(key, "numeric constraint failed");
  if (Array.isArray(value)) { if (typeof schema.minItems === "number" && value.length < schema.minItems) add("minItems", "array too short"); if (typeof schema.maxItems === "number" && value.length > schema.maxItems) add("maxItems", "array too long"); if (schema.items !== undefined) { const child = record(schema.items, "items"); value.forEach((v, i) => test(v, child, corpus, errors, [...at, i], new Set(stack))); } }
  if (isJsonRecord(value)) { const properties = schema.properties === undefined ? undefined : record(schema.properties, "properties"); for (const key of Array.isArray(schema.required) ? schema.required : []) if (typeof key === "string" && !(key in value)) errors.push(immutable({ pointer: ptr([...at, key]), keyword: "required", message: "property is required" })); if (properties) for (const [key, child] of Object.entries(properties)) if (key in value) test(value[key] as JsonValue, record(child, `properties/${key}`), corpus, errors, [...at, key], new Set(stack)); if (schema.additionalProperties === false && properties) for (const key of Object.keys(value)) if (!(key in properties)) errors.push(immutable({ pointer: ptr([...at, key]), keyword: "additionalProperties", message: "property is not allowed" })); }
  const valid = (sub: JsonValue): boolean => { const inner: Violation[] = []; test(value, record(sub, "subschema"), corpus, inner, at, new Set(stack)); return inner.length === 0; };
  if (Array.isArray(schema.allOf)) schema.allOf.forEach((s) => test(value, record(s, "allOf"), corpus, errors, at, new Set(stack)));
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some(valid)) add("anyOf", "matches no branch"); if (Array.isArray(schema.oneOf) && schema.oneOf.filter(valid).length !== 1) add("oneOf", "must match exactly one branch"); if (schema.not !== undefined && valid(schema.not)) add("not", "matches forbidden branch"); if (schema.if !== undefined) { const branch = valid(schema.if) ? schema.then : schema.else; if (branch !== undefined) test(value, record(branch, "conditional"), corpus, errors, at, new Set(stack)); }
  stack.delete(schema);
}
/** Non-monotone instance judgment. It never projects, reads files, or resolves remotely. */
export function validateInstance(instance: unknown, schema: Schema, corpus = schemaCorpus([schema])): Validation { const value = requireJsonValue(instance, "instance"); const errors: Violation[] = []; test(value, schema, corpus, errors, [], new Set()); return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) }); }

export type SchemaAssertion = Readonly<{ e: string; a: string; v: JsonValue; t: string }>;
export function unfoldSchema(schema: Schema, t: string, base = ""): readonly SchemaAssertion[] { if (!t) throw new TypeError("assertion time is required"); const out: SchemaAssertion[] = []; const visit = (value: JsonValue, path: string): void => { out.push(immutable({ e: base, a: path || "/", v: value, t })); if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${path}/${i}`)); else if (isJsonRecord(value)) for (const key of Object.keys(value).sort()) visit(value[key] as JsonValue, `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`); }; visit(schema, ""); return Object.freeze(out); }
export function foldSchemaAssertions(assertions: readonly SchemaAssertion[]): Readonly<{ schema: Schema | null; contradictions: readonly string[] }> { const cells = new Map<string, SchemaAssertion[]>(); for (const row of assertions) { if (!row.e || !row.a || !row.t || !isJsonValue(row.v)) throw new TypeError("invalid schema assertion"); const key = `${row.e}\0${row.a}`; cells.set(key, [...(cells.get(key) ?? []), row]); } const bad: string[] = []; const accepted: SchemaAssertion[] = []; for (const [key, rows] of cells) { const values = new Set(rows.map((r) => canonical(r.v))); if (values.size !== 1) { bad.push(key); continue; } accepted.push(rows.reduce((x, y) => x.t >= y.t ? x : y)); } if (bad.length) return immutable({ schema: null, contradictions: Object.freeze(bad.sort()) }); const root: Record<string, JsonValue> = {}; for (const row of accepted.sort((a, b) => a.a.localeCompare(b.a))) { if (row.a === "/") continue; const parts = row.a.slice(1).split("/").map((p) => p.replaceAll("~1", "/").replaceAll("~0", "~")); let current: Record<string, JsonValue> = root; for (const part of parts.slice(0, -1)) { const prior = current[part]; current[part] = isJsonRecord(prior) ? { ...prior } : {}; current = current[part] as Record<string, JsonValue>; } current[parts.at(-1) as string] = row.v; } return immutable({ schema: immutableJson(root) as Schema, contradictions: Object.freeze([]) }); }
