import { createHash } from "node:crypto";
import { rawNiUri } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";
import {
  canonical,
  isJsonRecord,
  isJsonValue,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/json-file-codec-service";

export const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema" as const;

/** The exact vocabulary this bounded evaluator implements. */
export const SUPPORTED_VOCABULARY = Object.freeze([
  "$schema", "$id", "$ref", "$defs", "$comment", "$comment-absences",
  "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly",
  "type", "enum", "const",
  "required", "properties", "additionalProperties", "propertyNames", "minProperties", "maxProperties",
  "items", "minItems", "maxItems", "uniqueItems", "contains",
  "minLength", "maxLength", "pattern", "format",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
] as const);

const supported = new Set<string>(SUPPORTED_VOCABULARY);
const knownVocabulary = new Set<string>([
  ...SUPPORTED_VOCABULARY,
  "$anchor", "$dynamicRef", "$dynamicAnchor", "$vocabulary",
  "patternProperties", "dependentRequired", "dependentSchemas",
  "prefixItems", "minContains", "maxContains", "unevaluatedItems", "unevaluatedProperties",
  "contentEncoding", "contentMediaType", "contentSchema",
]);

export type Schema = Readonly<JsonRecord>;
export type SchemaNode = Schema | boolean;
export type Violation = Readonly<{ pointer: string; keyword: string; message: string }>;
export type Validation = Readonly<{ ok: boolean; errors: readonly Violation[] }>;
export type IdentityReceipt = Readonly<{
  id: string;
  schemaId: string;
  eavtEntity: null;
  filepath: null;
  canonicalBytes: string;
  sha256: string;
  ni: string;
  rmn: null;
  status: "sxc-ready-not-settled";
}>;
export type SchemaReceipt = Readonly<{ schema: Schema; identity: IdentityReceipt }>;

const immutable = <T,>(value: T): T => Object.freeze(value);
const escapePointer = (part: string): string => part.replaceAll("~", "~0").replaceAll("/", "~1");
const instancePointer = (parts: readonly (string | number)[]): string =>
  parts.length === 0 ? "" : `/${parts.map((part) => escapePointer(String(part))).join("/")}`;

function hash(bytes: string): { hex: string; ni: string } {
  const hex = createHash("sha256").update(bytes, "utf8").digest("hex");
  const ni = rawNiUri(bytes);
  return { hex, ni };
}

function immutableJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableJson));
  if (isJsonRecord(value)) {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutableJson(child)])));
  }
  return value;
}

function schemaNode(value: JsonValue, what: string): SchemaNode {
  if (typeof value === "boolean") return value;
  if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object or boolean schema`);
  return value;
}

function schemaRecord(value: JsonValue, what: string): Schema {
  if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object`);
  return value;
}

function childSchemas(schema: Schema): readonly [string, JsonValue][] {
  const out: [string, JsonValue][] = [];
  for (const key of ["$defs", "properties"]) {
    const group = schema[key];
    if (group === undefined) continue;
    if (!isJsonRecord(group)) throw new TypeError(`${key} must be an object`);
    for (const [name, child] of Object.entries(group)) out.push([`${key}/${escapePointer(name)}`, child]);
  }
  for (const key of ["items", "contains", "propertyNames", "not", "if", "then", "else", "additionalProperties"]) {
    const child = schema[key];
    if (child === undefined) continue;
    if (key === "additionalProperties" && typeof child === "boolean") continue;
    if (typeof child !== "boolean" && !isJsonRecord(child)) throw new TypeError(`${key} must be a JSON object or boolean schema`);
    out.push([key, child]);
  }
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    const children = schema[key];
    if (children === undefined) continue;
    if (!Array.isArray(children)) throw new TypeError(`${key} must be an array`);
    children.forEach((child, index) => out.push([`${key}/${index}`, child]));
  }
  return out;
}

function admitSchema(node: SchemaNode, at: string, seen: Set<JsonValue>, allowUnknownAnnotations: boolean): void {
  if (typeof node === "boolean") return;
  if (seen.has(node)) return;
  seen.add(node);
  for (const key of Object.keys(node)) {
    if (!supported.has(key) && (knownVocabulary.has(key) || !allowUnknownAnnotations)) {
      throw new TypeError(`${at}: unsupported Draft 2020-12 keyword ${key}`);
    }
  }
  const dialect = node["$schema"];
  if (dialect !== undefined && dialect !== DRAFT_2020_12) {
    throw new TypeError(`${at}: unsupported dialect ${JSON.stringify(dialect)}`);
  }
  const pattern = node.pattern;
  if (pattern !== undefined) {
    if (typeof pattern !== "string") throw new TypeError(`${at}/pattern must be a string`);
    try { new RegExp(pattern, "u"); } catch (error) {
      throw new TypeError(`${at}/pattern is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (node.format !== undefined && node.format !== "date" && node.format !== "date-time") {
    throw new TypeError(`${at}/format: unsupported format ${JSON.stringify(node.format)}`);
  }
  for (const [path, child] of childSchemas(node)) {
    admitSchema(schemaNode(child, `schema at ${at}/${path}`), `${at}/${path}`, seen, allowUnknownAnnotations);
  }
}

/** Canonicalize and admit one fixed-dialect schema without ambient authority. */
export function createSchema(input: unknown, id?: string, options: Readonly<{ allowUnknownAnnotations?: boolean }> = {}): SchemaReceipt {
  const value = requireJsonValue(input, "schema");
  const raw = schemaRecord(value, "schema");
  const claimed = raw["$id"];
  const chosen = id ?? (typeof claimed === "string" ? claimed : undefined);
  if (!chosen) throw new TypeError("schema requires a non-empty $id");
  if (claimed !== undefined && claimed !== chosen) throw new TypeError("schema $id disagrees with requested identity");
  if (raw["$schema"] !== undefined && raw["$schema"] !== DRAFT_2020_12) {
    throw new TypeError(`unsupported dialect ${JSON.stringify(raw["$schema"])}`);
  }
  const schema = schemaRecord(immutableJson({ ...raw, "$schema": DRAFT_2020_12, "$id": chosen }), "schema");
  admitSchema(schema, "$", new Set<JsonValue>(), options.allowUnknownAnnotations === true);
  const canonicalBytes = canonical(schema);
  const digest = hash(canonicalBytes);
  return immutable({
    schema,
    identity: immutable({
      id: chosen,
      schemaId: chosen,
      eavtEntity: null,
      filepath: null,
      canonicalBytes,
      sha256: digest.hex,
      ni: digest.ni,
      rmn: null,
      status: "sxc-ready-not-settled",
    }),
  });
}

/** Resolve an RFC 6901 JSON Pointer or URI-fragment spelling. */
export function resolvePointer(document: JsonValue, fragment: string): JsonValue | undefined {
  if (fragment === "" || fragment === "#") return document;
  let pointer = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  try { pointer = decodeURIComponent(pointer); } catch { return undefined; }
  if (!pointer.startsWith("/")) return undefined;
  let current: JsonValue | undefined = document;
  for (const escaped of pointer.slice(1).split("/")) {
    const part = escaped.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(part)) return undefined;
      current = current[Number(part)];
    } else if (isJsonRecord(current)) current = current[part];
    else return undefined;
  }
  return current;
}

export const resolveJsonPointer = resolvePointer;

export interface SchemaCorpus {
  readonly byId: ReadonlyMap<string, Schema>;
  readonly register: (schema: Schema) => void;
  readonly resolve: (ref: string, base: Schema) => SchemaNode | undefined;
}

export function schemaCorpus(initial: readonly Schema[] = []): SchemaCorpus {
  const byId = new Map<string, Schema>();
  const register = (schema: Schema): void => {
    const id = schema["$id"];
    if (typeof id !== "string" || id === "") throw new TypeError("schema corpus requires $id");
    if (byId.has(id)) throw new TypeError(`duplicate schema $id ${id}`);
    byId.set(id, schema);
  };
  initial.forEach(register);
  const resolve = (ref: string, base: Schema): SchemaNode | undefined => {
    if (ref.startsWith("#")) {
      const found = resolvePointer(base, ref);
      return found === undefined ? undefined : schemaNode(found, `ref ${ref}`);
    }
    const hashAt = ref.indexOf("#");
    const id = hashAt < 0 ? ref : ref.slice(0, hashAt);
    if (/^(?:https?|file|node):/iu.test(id) || id.startsWith("//")) return undefined;
    const target = byId.get(id);
    if (!target) return undefined;
    const found = hashAt < 0 ? target : resolvePointer(target, ref.slice(hashAt));
    return found === undefined ? undefined : schemaNode(found, `ref ${ref}`);
  };
  return immutable({ byId, register, resolve });
}

function typeOf(value: JsonValue): string {
  return value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
}

function typeMatches(expected: string, value: JsonValue): boolean {
  const actual = typeOf(value);
  return expected === "number" ? actual === "number" || actual === "integer" : actual === expected;
}

const same = (left: JsonValue, right: JsonValue): boolean => canonical(left) === canonical(right);

function formatMatches(format: string, value: string): boolean | undefined {
  if (format === "date") {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (!matched) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  if (format === "date-time") {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
      && Number.isFinite(Date.parse(value));
  }
  return undefined;
}

function validateNode(
  value: JsonValue,
  schema: SchemaNode,
  root: Schema,
  corpus: SchemaCorpus,
  errors: Violation[],
  at: readonly (string | number)[],
  stack: Set<Schema>,
): void {
  const pointer = instancePointer(at);
  const add = (keyword: string, message: string): void => {
    errors.push(immutable({ pointer, keyword, message }));
  };
  if (schema === true) return;
  if (schema === false) { add("false", "boolean false schema rejects every instance"); return; }
  if (stack.has(schema)) { add("$ref", "cyclic schema evaluation refused"); return; }
  stack.add(schema);

  for (const key of Object.keys(schema)) {
    if (knownVocabulary.has(key) && !supported.has(key)) add(key, "keyword is not implemented by this bounded evaluator");
  }

  const ref = schema["$ref"];
  if (typeof ref === "string") {
    const target = corpus.resolve(ref, root);
    if (target === undefined) add("$ref", `unresolved or external reference ${ref}`);
    else {
      const targetRoot = ref.startsWith("#") ? root : corpus.byId.get(ref.split("#", 1)[0]!) ?? root;
      validateNode(value, target, targetRoot, corpus, errors, at, new Set(stack));
    }
  }

  const declaredType = schema.type;
  if (typeof declaredType === "string") {
    if (!typeMatches(declaredType, value)) add("type", `expected ${declaredType}, got ${typeOf(value)}`);
  } else if (Array.isArray(declaredType)) {
    const types = declaredType.filter((entry): entry is string => typeof entry === "string");
    if (!types.some((entry) => typeMatches(entry, value))) add("type", `expected ${types.join(" or ")}, got ${typeOf(value)}`);
  }
  if (schema.const !== undefined && !same(value, schema.const)) add("const", "value differs from const");
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => same(item, value))) add("enum", "value is not enumerated");

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && [...value].length < schema.minLength) add("minLength", "string too short");
    if (typeof schema.maxLength === "number" && [...value].length > schema.maxLength) add("maxLength", "string too long");
    if (typeof schema.pattern === "string") {
      try { if (!new RegExp(schema.pattern, "u").test(value)) add("pattern", "string does not match pattern"); }
      catch { add("pattern", "schema pattern is not a valid regular expression"); }
    }
    if (typeof schema.format === "string") {
      const matches = formatMatches(schema.format, value);
      if (matches === undefined) add("format", `unsupported format ${schema.format}`);
      else if (!matches) add("format", `string does not match ${schema.format}`);
    }
  }

  if (typeof value === "number") {
    const failures: readonly [string, boolean][] = [
      ["minimum", typeof schema.minimum === "number" && value < schema.minimum],
      ["maximum", typeof schema.maximum === "number" && value > schema.maximum],
      ["exclusiveMinimum", typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum],
      ["exclusiveMaximum", typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum],
      ["multipleOf", typeof schema.multipleOf === "number" && value % schema.multipleOf !== 0],
    ];
    for (const [keyword, failed] of failures) if (failed) add(keyword, "numeric constraint failed");
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) add("minItems", "array too short");
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) add("maxItems", "array too long");
    if (schema.uniqueItems === true && new Set(value.map(canonical)).size !== value.length) add("uniqueItems", "array items are not unique");
    if (schema.items !== undefined && (typeof schema.items === "boolean" || isJsonRecord(schema.items))) {
      const child = schemaNode(schema.items, "items");
      value.forEach((item, index) => validateNode(item, child, root, corpus, errors, [...at, index], new Set(stack)));
    }
    if (schema.contains !== undefined && (typeof schema.contains === "boolean" || isJsonRecord(schema.contains))) {
      const child = schemaNode(schema.contains, "contains");
      const found = value.some((item, index) => {
        const inner: Violation[] = [];
        validateNode(item, child, root, corpus, inner, [...at, index], new Set(stack));
        return inner.length === 0;
      });
      if (!found) add("contains", "no array item matches contains");
    }
  }

  if (isJsonRecord(value)) {
    const keys = Object.keys(value);
    if (typeof schema.minProperties === "number" && keys.length < schema.minProperties) add("minProperties", "object has too few properties");
    if (typeof schema.maxProperties === "number" && keys.length > schema.maxProperties) add("maxProperties", "object has too many properties");
    const properties = isJsonRecord(schema.properties) ? schema.properties : {};
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      if (typeof key === "string" && !(key in value)) {
        errors.push(immutable({ pointer: instancePointer([...at, key]), keyword: "required", message: "property is required" }));
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) validateNode(value[key] as JsonValue, schemaNode(child, `properties/${key}`), root, corpus, errors, [...at, key], new Set(stack));
    }
    if (schema.propertyNames !== undefined && (typeof schema.propertyNames === "boolean" || isJsonRecord(schema.propertyNames))) {
      const child = schemaNode(schema.propertyNames, "propertyNames");
      for (const key of keys) validateNode(key, child, root, corpus, errors, [...at, key], new Set(stack));
    }
    if (schema.additionalProperties !== undefined) {
      for (const key of keys) {
        if (key in properties) continue;
        if (schema.additionalProperties === false) {
          errors.push(immutable({ pointer: instancePointer([...at, key]), keyword: "additionalProperties", message: "property is not allowed" }));
        } else if (isJsonRecord(schema.additionalProperties)) {
          validateNode(value[key] as JsonValue, schema.additionalProperties, root, corpus, errors, [...at, key], new Set(stack));
        }
      }
    }
  }

  const isValid = (child: JsonValue): boolean => {
    const inner: Violation[] = [];
    validateNode(value, schemaNode(child, "subschema"), root, corpus, inner, at, new Set(stack));
    return inner.length === 0;
  };
  if (Array.isArray(schema.allOf)) {
    for (const child of schema.allOf) validateNode(value, schemaNode(child, "allOf"), root, corpus, errors, at, new Set(stack));
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some(isValid)) add("anyOf", "matches no branch");
  if (Array.isArray(schema.oneOf) && schema.oneOf.filter(isValid).length !== 1) add("oneOf", "must match exactly one branch");
  if (schema.not !== undefined && isValid(schema.not)) add("not", "matches forbidden branch");
  if (schema.if !== undefined) {
    const branch = isValid(schema.if) ? schema.then : schema.else;
    if (branch !== undefined) validateNode(value, schemaNode(branch, "conditional"), root, corpus, errors, at, new Set(stack));
  }
  stack.delete(schema);
}

/** A non-monotone instance judgment with no filesystem or remote resolution. */
export function validateInstance(instance: unknown, schema: SchemaNode, corpus?: SchemaCorpus): Validation {
  const value = requireJsonValue(instance, "instance");
  if (typeof schema === "boolean") {
    const errors: Violation[] = [];
    if (!schema) errors.push(immutable({ pointer: "", keyword: "false", message: "boolean false schema rejects every instance" }));
    return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }
  const bounded = corpus ?? schemaCorpus([schema]);
  const errors: Violation[] = [];
  validateNode(value, schema, schema, bounded, errors, [], new Set<Schema>());
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

/** Pure policy inspection recovered from the node-local schema writer. */
export function inspectSchema(schema: unknown, poolIds: ReadonlySet<string> = new Set()): Validation {
  const errors: Violation[] = [];
  const add = (pointer: string, keyword: string, message: string): void => { errors.push(immutable({ pointer, keyword, message })); };
  if (!isJsonRecord(schema)) return immutable({ ok: false, errors: Object.freeze([immutable({ pointer: "", keyword: "schema", message: "schema must be a JSON object" })]) });
  if (schema["$schema"] !== DRAFT_2020_12) add("", "$schema", `dialect must be ${DRAFT_2020_12}`);
  if (typeof schema["$id"] !== "string" || schema["$id"] === "") add("", "$id", "schema requires a non-empty $id");
  if (schema.type === undefined) add("", "type", "schema pool requires a root type");
  const structural = ["type", "required", "properties", "enum", "const", "oneOf", "anyOf", "allOf", "$defs", "items"];
  if (!structural.some((key) => key in schema)) add("", "structure", "schema states no structure");

  const visit = (node: SchemaNode, pointer: string, root: Schema): void => {
    if (typeof node === "boolean") return;
    for (const key of Object.keys(node)) {
      if (knownVocabulary.has(key) && !supported.has(key)) add(pointer, key, "keyword is not implemented by this bounded evaluator");
    }
    if (node.additionalProperties === false && Array.isArray(node.required)) {
      const properties = isJsonRecord(node.properties) ? node.properties : {};
      for (const key of node.required) {
        if (typeof key === "string" && !(key in properties)) add(pointer, "required", `required key ${key} is not declared while additionalProperties is false`);
      }
    }
    if (typeof node["$ref"] === "string") {
      const ref = node["$ref"];
      if (ref.startsWith("#")) {
        if (resolvePointer(root, ref) === undefined) add(pointer, "$ref", `local reference ${ref} does not resolve`);
      } else {
        const externalId = ref.split("#", 1)[0]!;
        if (/^(?:https?|file|node):/iu.test(externalId) || !poolIds.has(externalId)) {
          add(pointer, "$ref", `reference ${ref} does not resolve in the bounded pool`);
        }
      }
    }
    if (node.type !== undefined && typeof node.type !== "string" && !Array.isArray(node.type)) add(pointer, "type", "type must be a string or string array");
    if (node.enum !== undefined && (!Array.isArray(node.enum) || node.enum.length === 0)) add(pointer, "enum", "enum must be a non-empty array");
    if (typeof node.pattern === "string") {
      try { new RegExp(node.pattern, "u"); } catch { add(pointer, "pattern", "pattern is not a valid regular expression"); }
    }
    if (node.format !== undefined && node.format !== "date" && node.format !== "date-time") {
      add(pointer, "format", `unsupported format ${String(node.format)}`);
    }
    for (const [path, child] of childSchemas(node)) visit(schemaNode(child, `schema at ${pointer}/${path}`), `${pointer}/${path}`, root);
  };
  visit(schema, "", schema);
  for (const name of Object.keys(isJsonRecord(schema["$defs"]) ? schema["$defs"] : {})) {
    if (!canonical(schema).includes(JSON.stringify(`#/$defs/${name}`))) add(`/$defs/${escapePointer(name)}`, "$defs", "definition is never referenced");
  }
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export type SchemaAssertion = Readonly<{ e: string; a: string; v: JsonValue; t: string }>;
export type SchemaContradiction = Readonly<{
  e: string;
  a: string;
  values: readonly JsonValue[];
  assertions: readonly SchemaAssertion[];
}>;
export type SchemaCohereResult = Readonly<{ schema: Schema | null; contradictions: readonly SchemaContradiction[] }>;

export function assertSchemaAssertion(value: unknown): SchemaAssertion {
  if (!isJsonRecord(value)) throw new TypeError("schema assertion must be a JSON object");
  const { e, a, v, t } = value;
  if (typeof e !== "string" || e === "") throw new TypeError("schema assertion e must be a non-empty string");
  if (typeof a !== "string" || a === "") throw new TypeError("schema assertion a must be a non-empty string");
  if (!isJsonValue(v)) throw new TypeError("schema assertion v must be a JSON value");
  if (typeof t !== "string" || t === "") throw new TypeError("schema assertion t must be a non-empty string");
  return immutable({ e, a, v, t });
}

export function schemaAssertionId(assertion: SchemaAssertion): string {
  return hash(canonical(assertSchemaAssertion(assertion) as unknown as JsonValue)).hex;
}

export function parseSchemaAssertions(content: string): SchemaAssertion[] {
  const out: SchemaAssertion[] = [];
  for (const [index, line] of content.split("\n").entries()) {
    if (line.trim() === "") continue;
    try { out.push(assertSchemaAssertion(JSON.parse(line) as unknown)); }
    catch (error) {
      throw new TypeError(`line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return out;
}

export function serializeSchemaAssertions(assertions: readonly SchemaAssertion[]): string {
  return assertions.length === 0 ? "" : `${assertions.map((row) => canonical(assertSchemaAssertion(row) as unknown as JsonValue)).join("\n")}\n`;
}

export function mergeSchemaAssertions(...traces: readonly (readonly SchemaAssertion[])[]): SchemaAssertion[] {
  const rows = new Map<string, SchemaAssertion>();
  for (const row of traces.flat().map(assertSchemaAssertion)) rows.set(schemaAssertionId(row), row);
  return [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, row]) => row);
}

/** Unfold a schema into the historical EAVT pointer-cell representation. */
export function unfoldSchema(schema: unknown, options: { readonly base?: string; readonly t: string } | string, legacyBase = ""): readonly SchemaAssertion[] {
  const opts = typeof options === "string" ? { base: legacyBase, t: options } : options;
  if (!opts.t) throw new TypeError("unfoldSchema: assertion time is required");
  const admitted = schemaRecord(requireJsonValue(schema, "schema"), "schema");
  const rows: SchemaAssertion[] = [];
  const walk = (node: JsonValue, pointer: string): void => {
    if (node === null || typeof node !== "object") return;
    const entries: readonly (readonly [string, JsonValue])[] = Array.isArray(node)
      ? node.map((item, index) => [String(index), item] as const)
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key === "") throw new TypeError("unfoldSchema: object keys must be non-empty");
      const container = item !== null && typeof item === "object";
      const carried: JsonValue = Array.isArray(item) ? [] : container ? {} : item;
      rows.push(immutable({ e: `${opts.base ?? ""}#${pointer}`, a: key, v: carried, t: opts.t }));
      if (container) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(admitted, "");
  return Object.freeze(rows);
}

function pointerOf(entity: string): string {
  const hashAt = entity.indexOf("#");
  return hashAt < 0 ? entity : entity.slice(hashAt + 1);
}

export function foldSchema(assertions: readonly SchemaAssertion[]): Schema {
  const nodes = new Map<string, JsonValue>([["", {}]]);
  const depth = (pointer: string): number => pointer === "" ? 0 : pointer.split("/").length - 1;
  const rows = assertions.map(assertSchemaAssertion).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of rows) {
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new TypeError(`foldSchema: no node at pointer ${JSON.stringify(pointer)}`);
    let materialized = row.v;
    if (row.v !== null && typeof row.v === "object") {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    if (Array.isArray(parent)) parent[Number(row.a)] = materialized;
    else (parent as Record<string, JsonValue>)[row.a] = materialized;
  }
  return schemaRecord(immutableJson(requireJsonValue(nodes.get("") ?? {}, "folded schema")), "folded schema");
}

export function cohereSchemaAssertions(assertions: readonly SchemaAssertion[]): SchemaCohereResult {
  const cells = new Map<string, SchemaAssertion[]>();
  for (const row of assertions.map(assertSchemaAssertion)) {
    const key = `${canonical(row.e)}\0${row.a}`;
    cells.set(key, [...(cells.get(key) ?? []), row]);
  }
  const accepted: SchemaAssertion[] = [];
  const contradictions: SchemaContradiction[] = [];
  for (const rows of cells.values()) {
    const values = new Map(rows.map((row) => [canonical(row.v), row.v]));
    if (values.size > 1) {
      contradictions.push(immutable({
        e: rows[0]!.e,
        a: rows[0]!.a,
        values: Object.freeze([...values.values()]),
        assertions: Object.freeze([...rows]),
      }));
    } else accepted.push(rows.reduce((left, right) => left.t >= right.t ? left : right));
  }
  contradictions.sort((left, right) => `${left.e}\0${left.a}`.localeCompare(`${right.e}\0${right.a}`));
  return immutable({
    schema: contradictions.length === 0 ? foldSchema(accepted) : null,
    contradictions: Object.freeze(contradictions),
  });
}

export const foldSchemaAssertions = cohereSchemaAssertions;

export function projectSchemaAssertions(assertions: readonly SchemaAssertion[], options: { readonly id: string }): SchemaCohereResult {
  const result = cohereSchemaAssertions(assertions);
  if (result.schema === null) return result;
  const claimed = result.schema["$id"];
  if (typeof claimed === "string" && claimed !== options.id) {
    throw new TypeError(`projectSchemaAssertions: claimed $id ${JSON.stringify(claimed)} does not match ${JSON.stringify(options.id)}`);
  }
  const { ["$schema"]: _dialect, ["$id"]: _id, ...rest } = result.schema;
  return immutable({
    schema: schemaRecord(immutableJson({ "$schema": DRAFT_2020_12, "$id": options.id, ...rest }), "projected schema"),
    contradictions: Object.freeze([]),
  });
}

export function schemaAssertionTriple(assertion: SchemaAssertion): Readonly<{ s: JsonValue; p: JsonValue; o: JsonValue }> {
  const row = assertSchemaAssertion(assertion);
  return immutable({ s: row.e, p: row.a, o: row.v });
}

export function schemaAssertionEavt(assertion: SchemaAssertion): readonly [JsonValue, JsonValue, JsonValue, JsonValue] {
  const row = assertSchemaAssertion(assertion);
  return Object.freeze([row.e, row.a, row.v, row.t]);
}

export function schemaAssertionEavtId(assertion: SchemaAssertion): string {
  return hash(canonical(assertSchemaAssertion(assertion))).hex;
}
