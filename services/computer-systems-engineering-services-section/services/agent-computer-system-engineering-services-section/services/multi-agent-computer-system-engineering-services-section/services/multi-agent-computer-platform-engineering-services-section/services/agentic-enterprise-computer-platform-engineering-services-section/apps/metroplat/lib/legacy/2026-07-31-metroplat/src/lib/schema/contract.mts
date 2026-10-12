/**
 * @packageDocumentation
 *
 * schema/contract - Node presentations of schema admissibility boundaries.
 *
 * A schema contract is one Node value whose schema, static type, validator,
 * wire exposure, and resource forms are implementation projections of the same
 * admissibility boundary. Its bare `$id` is the compositional address. The
 * morphism half of the category (actions, the action registry, composition)
 * lives in `src/presentation/category` — the categorical role split is
 * objects->schemas, morphisms->running.
 *
 * `$ref` resolution is an object-side concern. Local references resolve in the
 * declaring schema; cross-schema references resolve only through contracts
 * explicitly supplied at construction. Declaring a schema never mutates
 * process-global state, and an unresolved arrow fails closed.
 */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonRecord = { readonly [key: string]: JsonValue };

export type SchemaAddress = string;

/** A Node schema contract: address plus schema/validator projections of admissible material. */
export interface SchemaContract<T = unknown> {
  /** Runtime tag for schema contracts. */
  readonly kind: "metroplat.schema-contract";
  /** Bare, package-rooted schema identity. This is the composition address. */
  readonly id: SchemaAddress;
  /** JSON-Schema projection of the boundary, carrying the same `$id` as `id`. */
  readonly schema: JsonRecord & { readonly $id: SchemaAddress };
  /** Explicit cross-schema arrows this recognizer follows, transitively. */
  readonly references: readonly SchemaContract[];
  /** Runtime validator projected from the schema. */
  readonly validate: (value: unknown) => value is T;
  /** Runtime assertion projected from the schema, with useful error context. */
  readonly assert: (value: unknown, context?: string) => T;
  /** Validation errors projected without throwing. */
  readonly errors: (value: unknown) => readonly string[];
}

/** The schema of a schema contract declaration itself. */
export const SchemaContractSchema = {
  $id: "metroplat/schema/kernel/contract",
  type: "object",
  required: ["kind", "id", "schema"],
  properties: {
    kind: { const: "metroplat.schema-contract" },
    id: { type: "string", minLength: 1 },
    schema: {},
  },
  title: "SchemaContract",
  description: "A category object declared by one JSON-Schema literal and its validator.",
  additionalProperties: false,
} as const;

export type SchemaContractMaterial = FromSchema<typeof SchemaContractSchema>;

// -- schema-literal contracts ------------------------------------------------
//
// A plain JSON-Schema literal authored `as const` is the single source:
// `FromSchema<S>` interprets it at compile time, and `validateAgainst`
// interprets the same value at runtime. This is the corpus-native
// implementation form: the schema projection and runtime validator read the
// same admissibility boundary, while projection layers can expose that boundary
// as package material.

/** Collapse an intersection of property maps into one object type (display ergonomics only). */
type Simplify<T> = { readonly [K in keyof T]: T[K] } & {};

type FromTypeName<T> =
  T extends "string" ? string : T extends "integer" | "number" ? number :
  T extends "boolean" ? boolean : T extends "null" ? null : T extends "array" ? readonly unknown[] : unknown;

type RequiredKey<P, R> = R extends readonly (infer K extends keyof P)[] ? K : never;

type FromObject<S, Root> =
  S extends { readonly properties: infer P }
    ? S extends { readonly required: infer R }
      ? Simplify<
          { readonly [K in RequiredKey<P, R>]: FromSchema<P[K], Root> }
          & { readonly [K in Exclude<keyof P, RequiredKey<P, R>>]?: FromSchema<P[K], Root> }
        >
      : { readonly [K in keyof P]?: FromSchema<P[K], Root> }
    : Record<string, unknown>;

type FromTupleItems<I extends readonly unknown[], Root> =
  Readonly<{ [K in keyof I]: FromSchema<I[K], Root> }>;

/** Resolve a `$ref` at the type level: a LOCAL `#/$defs/X` looks `X` up in the root schema's `$defs`
 *  and recurses (threading the root); a cross-schema `$ref` (any other string) stays `unknown` - the
 *  loose-slot convention, since the referenced schema contract is not in scope here. */
type ResolveRef<Ref, Root> =
  Ref extends "#"
    ? unknown :
  Ref extends `#/$defs/${infer Name}`
    ? Root extends { readonly $defs: infer D }
      ? Name extends keyof D ? FromSchema<D[Name], Root> : unknown
      : unknown
    : unknown;

/**
 * Derive the TypeScript type of a plain JSON-Schema literal (authored `as const`) — the
 * dependency-free, codegen-free static interpreter. The schema literal is the single
 * source. Covers the corpus's schema vocabulary: const/enum → literals, string|integer|number|
 * boolean|null → primitives, `type: [..]` → a primitive union (nullable), array → readonly[], object →
 * required/optional properties, anyOf/oneOf → unions, local `#/$defs/X` → the resolved def. A
 * cross-schema `$ref` resolves to `unknown` (the loose-slot convention). The
 * second `Root` parameter threads the top schema for local `$defs` resolution; callers pass one type.
 */
export type FromSchema<S, Root = S> =
  S extends { readonly $ref: infer R } ? ResolveRef<R, Root> :
  S extends { readonly const: infer C } ? C :
  S extends { readonly enum: readonly (infer E)[] } ? E :
  S extends { readonly anyOf: readonly (infer U)[] } ? FromSchema<U, Root> :
  S extends { readonly oneOf: readonly (infer U)[] } ? FromSchema<U, Root> :
  S extends { readonly type: "object" } ? FromObject<S, Root> :
  S extends { readonly type: "array"; readonly items: infer I extends readonly unknown[] } ? FromTupleItems<I, Root> :
  S extends { readonly type: "array"; readonly items: infer I } ? readonly FromSchema<I, Root>[] :
  S extends { readonly type: readonly (infer T)[] } ? FromTypeName<T> :
  S extends { readonly type: infer T } ? FromTypeName<T> :
  unknown;

/** Compatibility name for data declared from plain JSON-Schema literals. */
export type DataSchema<T> = SchemaContract<T>;

type PlainSchema = Record<string, unknown>;

/** Whether a value matches one JSON-Schema primitive/compound `type` name. */
function matchesType(name: string, value: unknown): boolean {
  switch (name) {
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "string": return typeof value === "string";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "number": return typeof value === "number";
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    default: return true;
  }
}

function validateObject(
  schema: PlainSchema,
  value: Record<string, unknown>,
  path: string,
  errs: string[],
  root: PlainSchema,
  roots: ReadonlyMap<SchemaAddress, PlainSchema>,
): boolean {
  let ok = true;
  const props = (schema["properties"] ?? {}) as Record<string, PlainSchema>;
  const required = Array.isArray(schema["required"]) ? (schema["required"] as string[]) : [];
  for (const key of required) if (!(key in value)) { errs.push(`${path}/${key} is required`); ok = false; }
  for (const [key, sub] of Object.entries(props)) {
    if (key in value && value[key] !== undefined && !validateAgainst(sub, value[key], `${path}/${key}`, errs, root, roots)) ok = false;
  }
  if (schema["additionalProperties"] === false) {
    for (const key of Object.keys(value)) if (!(key in props)) { errs.push(`${path}/${key} is not allowed`); ok = false; }
  }
  return ok;
}

function validateArray(
  schema: PlainSchema,
  value: readonly unknown[],
  path: string,
  errs: string[],
  root: PlainSchema,
  roots: ReadonlyMap<SchemaAddress, PlainSchema>,
): boolean {
  let ok = true;
  const minItems = schema["minItems"];
  if (typeof minItems === "number" && value.length < minItems) {
    errs.push(`${path === "" ? "/" : path} must have at least ${minItems} item${minItems === 1 ? "" : "s"}`);
    ok = false;
  }
  const maxItems = schema["maxItems"];
  if (typeof maxItems === "number" && value.length > maxItems) {
    errs.push(`${path === "" ? "/" : path} must have at most ${maxItems} item${maxItems === 1 ? "" : "s"}`);
    ok = false;
  }
  const items = schema["items"];
  if (Array.isArray(items)) {
    for (const [i, sub] of items.entries()) {
      if (i < value.length && !validateAgainst(sub as PlainSchema, value[i], `${path}/${i}`, errs, root, roots)) ok = false;
    }
    if (schema["additionalItems"] === false && value.length > items.length) {
      for (let i = items.length; i < value.length; i += 1) errs.push(`${path}/${i} is not allowed`);
      ok = false;
    }
    return ok;
  }
  if (items !== undefined) {
    for (const [i, item] of value.entries()) {
      if (!validateAgainst(items as PlainSchema, item, `${path}/${i}`, errs, root, roots)) ok = false;
    }
  }
  return ok;
}

function pointerSegment(value: string): string {
  return value.replace(/~1/gu, "/").replace(/~0/gu, "~");
}

function resolvePointer(root: PlainSchema, fragment: string): PlainSchema | undefined {
  if (fragment === "" || fragment === "#") return root;
  if (!fragment.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const encoded of fragment.slice(2).split("/")) {
    const key = pointerSegment(encoded);
    if (current === null || typeof current !== "object" || Array.isArray(current) || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== null && typeof current === "object" && !Array.isArray(current)
    ? current as PlainSchema
    : undefined;
}

/** Resolve one local or explicitly composed cross-schema reference. */
function resolveRefRuntime(
  ref: string,
  root: PlainSchema,
  roots: ReadonlyMap<SchemaAddress, PlainSchema>,
): { readonly schema: PlainSchema; readonly root: PlainSchema } | undefined {
  if (ref.startsWith("#")) {
    const schema = resolvePointer(root, ref);
    return schema === undefined ? undefined : { schema, root };
  }
  const hash = ref.indexOf("#");
  const id = hash < 0 ? ref : ref.slice(0, hash);
  const target = roots.get(id);
  if (target === undefined) return undefined;
  const schema = resolvePointer(target, hash < 0 ? "#" : ref.slice(hash));
  return schema === undefined ? undefined : { schema, root: target };
}

/**
 * The metroplat-owned structural validator. It walks the
 * SAME plain JSON-Schema literal that `FromSchema` interprets at the type level, so the runtime check
 * and the compile-time type agree BY CONSTRUCTION (one schema, two interpreters; no drift). Covers the
 * corpus's closed schema vocabulary (object/array/primitives/const/enum/anyOf/oneOf/nullable, local
 * `#/$defs/X`). Cross-schema references do not delegate through ambient state;
 * they follow the explicitly supplied contract graph and otherwise fail closed.
 */
function validateAgainst(
  schema: PlainSchema,
  value: unknown,
  path: string,
  errs: string[],
  root: PlainSchema,
  roots: ReadonlyMap<SchemaAddress, PlainSchema>,
): boolean {
  const at = path === "" ? "/" : path;
  if (typeof schema["$ref"] === "string") {
    const resolved = resolveRefRuntime(schema["$ref"], root, roots);
    if (resolved === undefined) { errs.push(`${at} has unresolved schema reference ${String(schema["$ref"])}`); return false; }
    return validateAgainst(resolved.schema, value, path, errs, resolved.root, roots);
  }
  if ("const" in schema) {
    if (value !== schema["const"]) { errs.push(`${at} must be ${JSON.stringify(schema["const"])}`); return false; }
    return true;
  }
  if (Array.isArray(schema["enum"])) {
    if (!(schema["enum"] as unknown[]).includes(value)) { errs.push(`${at} must be one of ${(schema["enum"] as unknown[]).map((e) => JSON.stringify(e)).join(", ")}`); return false; }
    return true;
  }
  const alts = (schema["anyOf"] ?? schema["oneOf"]) as PlainSchema[] | undefined;
  if (Array.isArray(alts)) {
    if (alts.some((alt) => validateAgainst(alt, value, path, [], root, roots))) return true;
    errs.push(`${at} matches no alternative`); return false;
  }
  const types = Array.isArray(schema["type"]) ? (schema["type"] as string[]) : schema["type"] === undefined ? [] : [schema["type"] as string];
  if (types.length > 0 && !types.some((t) => matchesType(t, value))) { errs.push(`${at} must be ${types.join(" | ")}`); return false; }
  if (types.includes("string") && typeof value === "string") {
    const minLength = schema["minLength"];
    if (typeof minLength === "number" && value.length < minLength) { errs.push(`${at} must have length at least ${minLength}`); return false; }
    const pattern = schema["pattern"];
    if (typeof pattern === "string" && !(new RegExp(pattern).test(value))) { errs.push(`${at} must match ${pattern}`); return false; }
  }
  if ((types.includes("integer") || types.includes("number")) && typeof value === "number") {
    const minimum = schema["minimum"];
    if (typeof minimum === "number" && value < minimum) { errs.push(`${at} must be >= ${minimum}`); return false; }
  }
  if (types.includes("object") && matchesType("object", value)) return validateObject(schema, value as Record<string, unknown>, path, errs, root, roots);
  if (types.includes("array") && Array.isArray(value)) return validateArray(schema, value, path, errs, root, roots);
  return true;
}

/**
 * Declare a schema contract from a plain JSON-Schema literal. The `as const`
 * schema is the single source; the type is `FromSchema<typeof schema>`, the validator is the
 * metroplat-owned `validateAgainst` over the same literal, and the `$id` is the schema address -
 * This is the normative schema constructor, and it is pure.
 *
 * @example
 * ```ts
 * const fourSchema = { $id: "computing/four", type: "object", required: ["value"],
 *   properties: { value: { enum: ["t", "f"] } } } as const;
 * export type Four = FromSchema<typeof fourSchema>;     // inferred, never generated
 * export const four = schemaFrom(fourSchema);          // validate/assert at the $id address
 * ```
 */
export function schemaFrom<const S extends { readonly $id: string }>(
  schema: S,
  references: readonly SchemaContract[] = [],
): SchemaContract<FromSchema<S>> {
  const id = schema.$id;
  const root = schema as unknown as PlainSchema;
  const byId = new Map<SchemaAddress, SchemaContract>();
  const visit = (reference: SchemaContract): void => {
    const prior = byId.get(reference.id);
    if (prior !== undefined) {
      if (prior.schema !== reference.schema && JSON.stringify(prior.schema) !== JSON.stringify(reference.schema)) {
        throw new TypeError(`schema ${id}: different contracts share reference address ${reference.id}`);
      }
      return;
    }
    if (reference.id === id && reference.schema !== schema) {
      throw new TypeError(`schema ${id}: an external reference shadows the declaring schema`);
    }
    byId.set(reference.id, reference);
    for (const transitive of reference.references) visit(transitive);
  };
  for (const reference of references) visit(reference);
  const explicitReferences = Object.freeze([...byId.values()].sort((left, right) => left.id.localeCompare(right.id)));
  const roots = new Map<SchemaAddress, PlainSchema>([[id, root]]);
  for (const reference of explicitReferences) roots.set(reference.id, reference.schema as PlainSchema);
  const value: SchemaContract<FromSchema<S>> = Object.freeze({
    kind: "metroplat.schema-contract" as const,
    id,
    schema: schema as unknown as JsonRecord & { readonly $id: SchemaAddress },
    references: explicitReferences,
    validate: (candidate: unknown): candidate is FromSchema<S> => validateAgainst(root, candidate, "", [], root, roots),
    assert: (candidate: unknown, context: string = id): FromSchema<S> => {
      const errs: string[] = [];
      if (validateAgainst(root, candidate, "", errs, root, roots)) return candidate as FromSchema<S>;
      throw new TypeError(`${context}: ${errs.join("; ")}`);
    },
    errors: (candidate: unknown): readonly string[] => {
      const errs: string[] = [];
      validateAgainst(root, candidate, "", errs, root, roots);
      return Object.freeze(errs);
    },
  });
  return value;
}
