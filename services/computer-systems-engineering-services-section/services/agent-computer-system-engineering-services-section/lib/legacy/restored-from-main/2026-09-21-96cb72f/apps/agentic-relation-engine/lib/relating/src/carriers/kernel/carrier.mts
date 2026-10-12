/**
 * @packageDocumentation
 *
 * writing/carrier — the schema-first object of the category and its representation.
 *
 * A carrier declaration is one plain JSON-Schema literal authored `as const`.
 * From it, `FromSchema<S>` reads the static type, transports read the JSON Schema
 * with its `$id`, and boundaries read the shared JSON Schema validator. A carrier is
 * an OBJECT of the relating category; its identity is its bare `$id`, the address
 * morphism composition reads. The morphism half of the category (actions, the
 * action registry, composition) lives in `src/running/category` — the categorical
 * role split objects→writing, morphisms→running.
 *
 * The live carrier registry lives here because carrier `$ref` resolution is an
 * object-side concern: a cross-carrier `$ref` validates by delegating to the
 * referenced carrier's own validator. `running/category` composes this carrier
 * registry with its action registry into the full `CategoryRegistry`.
 */
import type { JsonRecord } from "../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { canonicalJson } from "@red-cup-engineering/computer-data-engine/identity";
import { compileJsonSchema } from "@red-cup-engineering/computer-data-engine";
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";

export type CarrierId = string;

/** A schema-first object of the category. */
export interface Carrier<T = unknown> {
  /** Runtime tag for carrier declarations. */
  readonly kind: "relating.carrier";
  /** Bare, package-rooted carrier identity. This is the composition address. */
  readonly id: CarrierId;
  /** The authored JSON-Schema literal, carrying the same `$id` as `id`. */
  readonly schema: JsonRecord & { readonly $id: CarrierId };
  /** Runtime validator projected from the schema. */
  readonly validate: (value: unknown) => value is T;
  /** Runtime assertion projected from the schema, with useful error context. */
  readonly assert: (value: unknown, context?: string) => T;
  /** Validation errors projected without throwing. */
  readonly errors: (value: unknown) => readonly string[];
}

/** The schema of a carrier declaration itself. */
export const CarrierSchema = {
  $id: "relating/carriers/kernel/carrier",
  type: "object",
  required: ["kind", "id", "schema"],
  properties: {
    kind: { const: "relating.carrier" },
    id: { type: "string", minLength: 1 },
    schema: {},
  },
  title: "Carrier",
  description: "The schema-of-a-carrier: a category object declared by one JSON-Schema literal.",
  additionalProperties: false,
} as const;

export type CarrierCarrier = FromSchema<typeof CarrierSchema>;

/** The live carrier registry: carriers declared in this process, keyed by `$id`. The
 *  morphism category (`running/category`) composes this with its action registry. */
export const carriersById = new Map<CarrierId, Carrier>();

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function admittedSchema(schema: JsonRecord & { readonly $id: CarrierId }): {
  readonly canonical: string;
  readonly schema: JsonRecord & { readonly $id: CarrierId };
} {
  const canonical = canonicalJson(schema);
  const snapshot = freezeDeep(JSON.parse(canonical)) as JsonRecord & { readonly $id: CarrierId };
  return Object.freeze({ canonical, schema: snapshot });
}

function carrierOfAdmittedSchema(admitted: ReturnType<typeof admittedSchema>): Carrier {
  const id = admitted.schema.$id;
  const validationOf = () => compileJsonSchema(admitted.schema, {
    references: carriers().map((carrier) => carrier.schema),
  });
  return Object.freeze({
    kind: "relating.carrier" as const,
    id,
    schema: admitted.schema,
    validate: (candidate: unknown): candidate is unknown => validationOf().validate(candidate).valid,
    assert: (candidate: unknown, context: string = id): unknown => {
      const result = validationOf().validate(candidate);
      if (result.valid) return candidate;
      throw new TypeError(`${context}: ${result.issues.map((issue) => `${issue.path} ${issue.message}`.trim()).join("; ")}`);
    },
    errors: (candidate: unknown): readonly string[] => {
      return Object.freeze(validationOf().validate(candidate).issues.map((issue) => `${issue.path} ${issue.message}`.trim()));
    },
  });
}

function registerAdmittedSchema<T>(admitted: ReturnType<typeof admittedSchema>): Carrier<T> {
  const existing = carriersById.get(admitted.schema.$id);
  if (existing !== undefined) {
    if (admittedSchema(existing.schema).canonical !== admitted.canonical) {
      throw new TypeError(`registerCarrier: incompatible schema redefinition for ${JSON.stringify(admitted.schema.$id)}`);
    }
    return existing as Carrier<T>;
  }
  const registered = carrierOfAdmittedSchema(admitted);
  carriersById.set(registered.id, registered as Carrier);
  return registered as Carrier<T>;
}

/**
 * Register a carrier's schema meaning in the live category and return the normalized carrier.
 * The caller's validator functions are not retained: the admitted canonical schema alone
 * determines validation, assertions, and errors.
 */
export function registerCarrier<T>(value: Carrier<T>): Carrier<T> {
  if (value.id !== value.schema.$id) {
    throw new TypeError(`registerCarrier: carrier id and schema $id differ for ${JSON.stringify(value.id)}`);
  }
  return registerAdmittedSchema(admittedSchema(value.schema));
}

/** Resolve a carrier by bare `$id`. */
export function carrierById(id: CarrierId): Carrier | undefined {
  return carriersById.get(id);
}

/** The carriers visible in this process. */
export function carriers(): readonly Carrier[] {
  return Object.freeze([...carriersById.values()]);
}

// ── schema-literal carriers: no TypeBox or codegen ─────────────────────────────────────
//
// TypeBox earned its keep here on one thing: coupling a runtime JSON Schema to its compile-time
// type. A plain JSON-Schema literal authored `as const` is now the single source:
// `FromSchema<S>` interprets it at compile time, and the shared JSON Schema service validates it at
// runtime. This is the corpus-native form: a carrier is its proof-tree `.schema.json` shape.

/** Relating's public name for the shared static JSON Schema interpretation. */
export type FromSchema<S, Root = S> = FromJsonSchema<S, Root>;

/** Compatibility name for carriers declared from plain JSON-Schema literals. */
export type DataCarrier<T> = Carrier<T>;

/**
 * Declare a carrier from a plain JSON-Schema literal. The `as const` schema is the single source; the
 * type is `FromSchema<typeof schema>`, the runtime validator is compiled by the shared JSON Schema
 * service, and the `$id` registers in the one category.
 * This is now the normative carrier constructor.
 *
 * @example
 * ```ts
 * const fourSchema = { $id: "computing/four", type: "object", required: ["value"],
 *   properties: { value: { enum: ["t", "f"] } } } as const;
 * export type Four = FromSchema<typeof fourSchema>;     // inferred, never generated
 * export const four = carrierFrom(fourSchema);          // validate/assert, registered $id
 * ```
 */
export function carrierFrom<const S extends { readonly $id: string }>(schema: S): Carrier<FromSchema<S>> {
  const admitted = admittedSchema(schema as unknown as JsonRecord & { readonly $id: CarrierId });
  return registerAdmittedSchema<FromSchema<S>>(admitted);
}
