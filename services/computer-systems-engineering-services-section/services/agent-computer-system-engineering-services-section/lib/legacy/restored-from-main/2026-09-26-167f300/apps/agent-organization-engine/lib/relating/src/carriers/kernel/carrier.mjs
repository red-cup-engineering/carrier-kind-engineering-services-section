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

import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { compileJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

/** A schema-first object of the category. */

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
};

/** The live carrier registry: carriers declared in this process, keyed by `$id`. The
 *  morphism category (`running/category`) composes this with its action registry. */
export const carriersById = new Map();

function freezeDeep(value) {
  if (value === null || typeof value !== "object") return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function admittedSchema(schema)

 {
  const canonical = canonicalJson(schema);
  const snapshot = freezeDeep(JSON.parse(canonical));
  return Object.freeze({ canonical, schema: snapshot });
}

function carrierOfAdmittedSchema(admitted) {
  const id = admitted.schema.$id;
  const validationOf = () => compileJsonSchema(admitted.schema, {
    references: carriers().map((carrier) => carrier.schema),
  });
  return Object.freeze({
    kind: "relating.carrier",
    id,
    schema: admitted.schema,
    validate: (candidate) => validationOf().validate(candidate).valid,
    assert: (candidate, context = id) => {
      const result = validationOf().validate(candidate);
      if (result.valid) return candidate;
      throw new TypeError(`${context}: ${result.issues.map((issue) => `${issue.path} ${issue.message}`.trim()).join("; ")}`);
    },
    errors: (candidate) => {
      return Object.freeze(validationOf().validate(candidate).issues.map((issue) => `${issue.path} ${issue.message}`.trim()));
    },
  });
}

function registerAdmittedSchema(admitted) {
  const existing = carriersById.get(admitted.schema.$id);
  if (existing !== undefined) {
    if (admittedSchema(existing.schema).canonical !== admitted.canonical) {
      throw new TypeError(`registerCarrier: incompatible schema redefinition for ${JSON.stringify(admitted.schema.$id)}`);
    }
    return existing;
  }
  const registered = carrierOfAdmittedSchema(admitted);
  carriersById.set(registered.id, registered);
  return registered;
}

/**
 * Register a carrier's schema meaning in the live category and return the normalized carrier.
 * The caller's validator functions are not retained: the admitted canonical schema alone
 * determines validation, assertions, and errors.
 */
export function registerCarrier(value) {
  if (value.id !== value.schema.$id) {
    throw new TypeError(`registerCarrier: carrier id and schema $id differ for ${JSON.stringify(value.id)}`);
  }
  return registerAdmittedSchema(admittedSchema(value.schema));
}

/** Resolve a carrier by bare `$id`. */
export function carrierById(id) {
  return carriersById.get(id);
}

/** The carriers visible in this process. */
export function carriers() {
  return Object.freeze([...carriersById.values()]);
}

// ── schema-literal carriers: no TypeBox or codegen ─────────────────────────────────────
//
// TypeBox earned its keep here on one thing: coupling a runtime JSON Schema to its compile-time
// type. A plain JSON-Schema literal authored `as const` is now the single source:
// `FromSchema<S>` interprets it at compile time, and the shared JSON Schema service validates it at
// runtime. This is the corpus-native form: a carrier is its proof-tree `.schema.json` shape.

/** Relating's public name for the shared static JSON Schema interpretation. */

/** Compatibility name for carriers declared from plain JSON-Schema literals. */

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
export function carrierFrom(schema) {
  const admitted = admittedSchema(schema);
  return registerAdmittedSchema(admitted);
}
