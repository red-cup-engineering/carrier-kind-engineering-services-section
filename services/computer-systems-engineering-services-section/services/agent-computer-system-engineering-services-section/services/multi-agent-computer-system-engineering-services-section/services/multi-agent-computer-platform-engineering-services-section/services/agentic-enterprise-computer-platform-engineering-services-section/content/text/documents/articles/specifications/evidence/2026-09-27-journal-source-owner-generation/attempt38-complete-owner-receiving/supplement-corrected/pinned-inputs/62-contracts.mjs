import { compileJsonSchema } from "./validation.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
export const SchemaContractSchema = {
    $id: "computer-data/schema-contract",
    type: "object",
    required: ["kind", "id", "schema"],
    properties: {
        kind: { const: "schema-contract" },
        id: { type: "string", minLength: 1 },
        schema: {},
    },
    title: "SchemaContract",
    description: "A category object declared by one JSON-Schema literal and its validator.",
    additionalProperties: false,
};
/** AJV resolves bare house schema addresses as URLs relative to the current
 * schema. Keep those bare addresses on the public contracts, but compile an
 * isolated absolute-name copy while retaining nested identifier scopes. */
function evaluatorSchemaGraph(root, references) {
    const contracts = [root, ...references];
    const addresses = new Map(contracts.map((contract) => [
        contract.id,
        `https://schemas.computer-data.invalid/${encodeURIComponent(contract.id)}/`,
    ]));
    const resolvedAddress = (reference, baseId) => {
        if (reference.includes("://") || reference.startsWith("urn:"))
            return reference;
        const parts = [...baseId.split("/").slice(0, -1), ...reference.split("/")];
        const normalized = [];
        for (const part of parts) {
            if (part === "" || part === ".")
                continue;
            if (part === "..")
                normalized.pop();
            else
                normalized.push(part);
        }
        return normalized.join("/");
    };
    const addressOfReference = (reference, baseId) => addresses.get(reference) ?? addresses.get(resolvedAddress(reference, baseId));
    const registeredNestedIds = new Map();
    const schemaKeys = new Set([
        "additionalItems", "additionalProperties", "allOf", "anyOf", "contains", "contentSchema", "dependencies", "dependentSchemas",
        "else", "if", "items", "not", "oneOf", "patternProperties", "prefixItems", "properties", "propertyNames",
        "then", "unevaluatedItems", "unevaluatedProperties", "$defs", "definitions",
    ]);
    const projectSchema = (value, isRoot, documentId, uriScope) => {
        if (value === true || value === false || value === null || typeof value !== "object" || Array.isArray(value))
            return value;
        const result = {};
        const declaredId = value["$id"];
        const scopeId = !isRoot && typeof declaredId === "string" ? resolvedAddress(declaredId, documentId) : documentId;
        const scopeUri = !isRoot && typeof declaredId === "string" ? new URL(declaredId, uriScope).href : uriScope;
        if (!isRoot && typeof declaredId === "string" && !addresses.has(declaredId)) {
            const prior = registeredNestedIds.get(scopeUri);
            const serialized = JSON.stringify(value);
            if (prior !== undefined) {
                if (prior !== serialized)
                    throw new TypeError(`schema ${root.id}: nested $id ${scopeUri} names different schemas`);
                // Reuse the first complete nested document. Re-projecting an identical
                // document after removing its duplicate $id would change the scope of
                // any descendant relative identifiers or anchors.
                return { $ref: scopeUri };
            }
            registeredNestedIds.set(scopeUri, serialized);
        }
        const tupleItems = Array.isArray(value["items"]);
        for (const [key, item] of Object.entries(value)) {
            if (key === "$id") {
                // Only compiled contract roots receive private absolute addresses.
                // A nested $id establishes a local scope unless that exact semantic
                // address is already compiled as a referenced root. Repeated URI
                // scopes must carry byte-identical schemas or remain an explicit error.
                if (isRoot)
                    result[key] = addresses.get(String(item)) ?? item;
                else if (!addresses.has(String(item)))
                    result[key] = item;
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
        // Legacy dependency declarations are constraints, not annotations, on house carriers.
        const dependencies = result["dependencies"];
        if (dependencies !== null && typeof dependencies === "object" && !Array.isArray(dependencies)) {
            const entries = Object.entries(dependencies);
            const dependentRequired = Object.fromEntries(entries.filter(([, member]) => Array.isArray(member)));
            const dependentSchemas = Object.fromEntries(entries.filter(([, member]) => !Array.isArray(member)));
            result["allOf"] = [...(Array.isArray(result["allOf"]) ? result["allOf"] : []), { dependentRequired, dependentSchemas }];
            delete result["dependencies"];
        }
        if (tupleItems && !("additionalItems" in value))
            result["items"] = {};
        return result;
    };
    return Object.freeze({
        root: projectSchema(root.schema, true, root.id, addresses.get(root.id) ?? root.id),
        references: Object.freeze(references.map((reference) => projectSchema(reference.schema, true, reference.id, addresses.get(reference.id) ?? reference.id))),
    });
}
/** Every schema declared in this process, by `$id`: the one registry `$ref`s resolve through
 *  when a declaration names no explicit references. */
const declared = new Map();

/** The schema contract declared under `id`, if any. */
export function schemaById(id) {
  return declared.get(id)?.contract;
}

/** Every schema contract declared in this process. */
export function declaredSchemas() {
  return Object.freeze([...declared.values()].map((entry) => entry.contract));
}

function freezeDeep(value) {
  if (value === null || typeof value !== "object") return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

/** The `$ref` addresses a schema names (fragments dropped, local refs skipped). */
function referenceAddresses(schema, into = new Set()) {
  if (schema === null || typeof schema !== "object") return into;
  if (Array.isArray(schema)) {
    for (const item of schema) referenceAddresses(item, into);
    return into;
  }
  for (const [key, value] of Object.entries(schema)) {
    if (key === "$ref" && typeof value === "string") {
      const address = value.split("#", 1)[0];
      if (address !== "") into.add(address);
    } else referenceAddresses(value, into);
  }
  return into;
}

function closureOf(id, references) {
  const byId = new Map();
  const visit = (reference) => {
    const prior = byId.get(reference.id);
    if (prior !== undefined) {
      if (prior.schema !== reference.schema && canonicalJson(prior.schema) !== canonicalJson(reference.schema)) {
        throw new TypeError(`schema ${id}: different contracts share reference address ${reference.id}`);
      }
      return;
    }
    if (reference.id === id) return;
    byId.set(reference.id, reference);
    for (const transitive of reference.references) visit(transitive);
  };
  for (const reference of references) visit(reference);
  return byId;
}

/**
 * Declare a schema contract from a plain JSON-Schema literal.
 *
 * The schema is admitted as a frozen canonical snapshot and recorded under its `$id`; declaring
 * the same `$id` again returns the first contract, and declaring a different schema under it is
 * refused. `$ref`s resolve through `references` when given, and otherwise through the declared
 * schemas they name, resolved when the contract first validates.
 *
 * @param schema Schema carrying its composition address.
 * @param references Cross-schema contracts available to `$ref` (explicit composition).
 * @returns The contract: `validate`, `assert`, `errors`, and its explicit references.
 */
export function schemaFrom(schema, references = []) {
  const id = schema.$id;
  const canonical = canonicalJson(schema);
  const existing = id === undefined ? undefined : declared.get(id);
  if (existing !== undefined && references.length === 0) {
    if (existing.canonical !== canonical) throw new TypeError(`schemaFrom: incompatible schema redefinition for ${JSON.stringify(id)}`);
    return existing.contract;
  }
  const snapshot = freezeDeep(JSON.parse(canonical));
  const explicit = closureOf(id, references);
  const explicitReferences = Object.freeze([...explicit.values()].sort((left, right) => left.id.localeCompare(right.id)));
  let evaluator;
  const evaluate = (candidate) => {
    if (evaluator === undefined) {
      const resolved = new Map(explicit);
      const pending = [...referenceAddresses(snapshot)];
      while (pending.length > 0) {
        const address = pending.pop();
        if (address === id || resolved.has(address)) continue;
        const found = declared.get(address)?.contract;
        if (found === undefined) continue;
        resolved.set(address, found);
        pending.push(...referenceAddresses(found.schema));
      }
      const graph = evaluatorSchemaGraph({ id, schema: snapshot }, [...resolved.values()].sort((left, right) => left.id.localeCompare(right.id)));
      evaluator = compileJsonSchema(graph.root, { references: graph.references });
    }
    return evaluator.validate(candidate);
  };
  const formatIssues = (candidate) => Object.freeze(evaluate(candidate).issues.map((issue) => {
    const unresolved = /can't resolve reference (.+?) from id/u.exec(issue.message);
    return unresolved === null
      ? `${issue.path || "/"} ${issue.keyword}: ${issue.message}`
      : `${issue.path || "/"} unresolved schema reference ${unresolved[1]}`;
  }));
  const contract = Object.freeze({
    kind: "schema-contract",
    id,
    schema: snapshot,
    references: explicitReferences,
    validate: (candidate) => evaluate(candidate).valid,
    assert: (candidate, context = id) => {
      const result = evaluate(candidate);
      if (result.valid) return candidate;
      throw new TypeError(`${context}: ${formatIssues(candidate).join("; ")}`);
    },
    errors: formatIssues,
  });
  if (id !== undefined && existing === undefined) declared.set(id, { canonical, contract });
  return contract;
}
