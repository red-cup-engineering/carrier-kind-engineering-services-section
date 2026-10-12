import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import { compileJsonSchema, type JsonSchema } from "@red-cup-engineering/computer-data-type-engine";

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonRecord = { readonly [key: string]: JsonValue };
export type SchemaAddress = string;

/** A Node schema contract: address plus schema/validator projections of admissible material. */
export interface SchemaContract<T = unknown> {
  readonly kind: "metroplat.schema-contract";
  readonly id: SchemaAddress;
  readonly schema: JsonRecord & { readonly $id: SchemaAddress };
  readonly references: readonly SchemaContract[];
  readonly validate: (value: unknown) => value is T;
  readonly assert: (value: unknown, context?: string) => T;
  readonly errors: (value: unknown) => readonly string[];
}

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

export type SchemaContractMaterial = FromJsonSchema<typeof SchemaContractSchema>;
/** Compatibility name for data declared from plain JSON-Schema literals. */
export type DataSchema<T> = SchemaContract<T>;

/** AJV resolves bare house schema addresses as URLs relative to the current
 * schema. Keep those bare addresses on the public contracts, but compile an
 * isolated absolute-name copy while retaining nested identifier scopes. */
function evaluatorSchemaGraph(root: Pick<SchemaContract, "id" | "schema">, references: readonly SchemaContract[]): {
  readonly root: JsonSchema;
  readonly references: readonly JsonSchema[];
} {
  const contracts = [root, ...references];
  const addresses = new Map(contracts.map((contract) => [
    contract.id,
    `https://schemas.metroplat.invalid/${encodeURIComponent(contract.id)}/`,
  ]));
  const resolvedAddress = (reference: string, baseId: string): string => {
    if (reference.includes("://") || reference.startsWith("urn:")) return reference;
    const parts = [...baseId.split("/").slice(0, -1), ...reference.split("/")];
    const normalized: string[] = [];
    for (const part of parts) {
      if (part === "" || part === ".") continue;
      if (part === "..") normalized.pop();
      else normalized.push(part);
    }
    return normalized.join("/");
  };
  const addressOfReference = (reference: string, baseId: string): string | undefined =>
    addresses.get(reference) ?? addresses.get(resolvedAddress(reference, baseId));
  const registeredNestedIds = new Map<string, string>();
  const schemaKeys = new Set([
    "additionalItems", "additionalProperties", "allOf", "anyOf", "contains", "contentSchema", "dependencies", "dependentSchemas",
    "else", "if", "items", "not", "oneOf", "patternProperties", "prefixItems", "properties", "propertyNames",
    "then", "unevaluatedItems", "unevaluatedProperties", "$defs", "definitions",
  ]);
  const projectSchema = (value: unknown, isRoot: boolean, documentId: string, uriScope: string): unknown => {
    if (value === true || value === false || value === null || typeof value !== "object" || Array.isArray(value)) return value;
    const result: Record<string, unknown> = {};
    const declaredId = (value as Record<string, unknown>)["$id"];
    const scopeId = !isRoot && typeof declaredId === "string" ? resolvedAddress(declaredId, documentId) : documentId;
    const scopeUri = !isRoot && typeof declaredId === "string" ? new URL(declaredId, uriScope).href : uriScope;
    if (!isRoot && typeof declaredId === "string" && !addresses.has(declaredId)) {
      const prior = registeredNestedIds.get(scopeUri);
      const serialized = JSON.stringify(value);
      if (prior !== undefined) {
        if (prior !== serialized) throw new TypeError(`schema ${root.id}: nested $id ${scopeUri} names different schemas`);
        // Reuse the first complete nested document. Re-projecting an identical
        // document after removing its duplicate $id would change the scope of
        // any descendant relative identifiers or anchors.
        return { $ref: scopeUri };
      }
      registeredNestedIds.set(scopeUri, serialized);
    }
    const tupleItems = Array.isArray((value as Record<string, unknown>)["items"]);
    for (const [key, item] of Object.entries(value)) {
      if (key === "$id") {
        // Only compiled contract roots receive private absolute addresses.
        // A nested $id establishes a local scope unless that exact semantic
        // address is already compiled as a referenced root. Repeated URI
        // scopes must carry byte-identical schemas or remain an explicit error.
        if (isRoot) result[key] = addresses.get(String(item)) ?? item;
        else if (!addresses.has(String(item))) result[key] = item;
        continue;
      }
      if (key === "$ref" && typeof item === "string") {
        const [address = "", fragment = ""] = item.split("#", 2);
        const resolved = address.length === 0 ? undefined : addressOfReference(address, scopeId);
        result[key] = address.length === 0
          ? !isRoot && registeredNestedIds.has(scopeUri) ? new URL(item, scopeUri).href : item
          : resolved === undefined ? new URL(item, scopeUri).href : `${resolved}${fragment.length === 0 ? "" : `#${fragment}`}`;
        continue;
      }
      // House carriers still use draft-07 tuple `items`. The shared evaluator
      // implements the current `prefixItems` spelling, so normalize only its
      // private compilation copy and preserve the carrier's public schema.
      if (tupleItems && key === "items") {
        result["prefixItems"] = Array.isArray(item) ? item.map((member) => projectSchema(member, false, scopeId, scopeUri)) : item;
        continue;
      }
      if (tupleItems && key === "additionalItems") {
        result["items"] = projectSchema(item, false, scopeId, scopeUri);
        continue;
      }
      if (!schemaKeys.has(key)) {
        result[key] = item;
        continue;
      }
      if (["allOf", "anyOf", "oneOf", "prefixItems"].includes(key) && Array.isArray(item)) {
        result[key] = item.map((member) => projectSchema(member, false, scopeId, scopeUri));
        continue;
      }
      if (["$defs", "definitions", "properties", "patternProperties", "dependencies", "dependentSchemas"].includes(key)
        && item !== null && typeof item === "object" && !Array.isArray(item)) {
        result[key] = Object.fromEntries(Object.entries(item).map(([name, member]) => [
          name,
          key === "dependencies" && Array.isArray(member) ? member : projectSchema(member, false, scopeId, scopeUri),
        ]));
        continue;
      }
      result[key] = projectSchema(item, false, scopeId, scopeUri);
    }
    if (tupleItems && !("additionalItems" in (value as Record<string, unknown>))) result["items"] = {};
    return result;
  };
  return Object.freeze({
    root: projectSchema(root.schema, true, root.id, addresses.get(root.id) ?? root.id) as JsonSchema,
    references: Object.freeze(references.map((reference) => projectSchema(reference.schema, true, reference.id, addresses.get(reference.id) ?? reference.id) as JsonSchema)),
  });
}

/**
 * Declare a schema contract from a plain JSON-Schema literal and explicitly composed references.
 *
 * @param schema Schema carrying its composition address.
 * @param references Cross-schema contracts available to `$ref`.
 * @returns A pure domain wrapper over the shared standards evaluator.
 */
export function schemaFrom<const S extends { readonly $id: string }>(
  schema: S,
  references: readonly SchemaContract[] = [],
): SchemaContract<FromJsonSchema<S>> {
  const id = schema.$id;
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
  const evaluatorGraph = evaluatorSchemaGraph({
    id,
    schema: schema as unknown as JsonRecord & { readonly $id: SchemaAddress },
  }, explicitReferences);
  const evaluator = compileJsonSchema(evaluatorGraph.root, {
    references: evaluatorGraph.references,
  });
  const evaluate = (candidate: unknown) => evaluator.validate(candidate);
  const formatIssues = (candidate: unknown): readonly string[] => Object.freeze(
    evaluate(candidate).issues.map((issue) => {
      const unresolved = /can't resolve reference (.+?) from id/u.exec(issue.message);
      return unresolved === null
        ? `${issue.path || "/"} ${issue.keyword}: ${issue.message}`
        : `${issue.path || "/"} unresolved schema reference ${unresolved[1]}`;
    }),
  );
  return Object.freeze({
    kind: "metroplat.schema-contract" as const,
    id,
    schema: schema as unknown as JsonRecord & { readonly $id: SchemaAddress },
    references: explicitReferences,
    validate: (candidate: unknown): candidate is FromJsonSchema<S> => evaluate(candidate).valid,
    assert: (candidate: unknown, context: string = id): FromJsonSchema<S> => {
      const result = evaluate(candidate);
      if (result.valid) return candidate as FromJsonSchema<S>;
      throw new TypeError(`${context}: ${formatIssues(candidate).join("; ")}`);
    },
    errors: formatIssues,
  });
}
