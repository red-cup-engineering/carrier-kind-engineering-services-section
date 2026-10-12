import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { observation } from "./fixtures/biometric-observations.mjs";

const SCHEMA_PATH = fileURLToPath(
  new URL(
    "../../../../../../../../../../../../../../../../../../lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/personal-health-computer-systems-engineering-services-section/lib/schemas/biometric-observation-v1.schema.json",
    import.meta.url,
  ),
);

const NUTRITION_PROFILE_SCHEMA_PATH = fileURLToPath(
  new URL(
    "../../../../../../../../../../../../../../../../../../lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/personal-health-computer-systems-engineering-services-section/services/nutrition-practice-system-services-section/apps/nutrition-practice-computer/lib/schemas/nutrition-biometric-observation-v1.schema.json",
    import.meta.url,
  ),
);

/**
 * Resolves one schema's own `required`/`properties`/`$defs`, following a
 * top-level `allOf` by merging each branch — an external `$ref` branch is
 * substituted by `knownSchemasById` (the general schema this profile
 * extends), a local branch is used as-is. Zero-dependency, deliberately
 * not a full JSON Schema resolver.
 */
function resolvedShape(schema, knownSchemasById) {
  if (!Array.isArray(schema.allOf)) return schema;
  const branches = schema.allOf.map((branch) => (typeof branch.$ref === "string" ? knownSchemasById.get(branch.$ref) ?? branch : branch));
  return {
    required: branches.flatMap((branch) => branch.required ?? []),
    properties: Object.assign({}, ...branches.map((branch) => branch.properties ?? {})),
    $defs: Object.assign({}, ...branches.map((branch) => branch.$defs ?? {})),
  };
}

/** Checks a candidate object's own top-level keys, and each $ref'd nested object's keys, against a JSON-Schema-shaped schema's `required` arrays. Zero-dependency, deliberately not a full JSON Schema validator. */
function requiredKeysPresent(schema, candidate, knownSchemasById = new Map()) {
  const shape = resolvedShape(schema, knownSchemasById);
  const missing = [];
  for (const key of shape.required ?? []) if (!(key in candidate)) missing.push(key);
  for (const [propertyName, propertySchema] of Object.entries(shape.properties ?? {})) {
    const ref = propertySchema.$ref;
    if (!ref || !ref.startsWith("#/$defs/")) continue;
    const defSchema = shape.$defs[ref.slice("#/$defs/".length)];
    const value = candidate[propertyName];
    if (defSchema?.type === "object" && value && typeof value === "object") {
      for (const nestedKey of defSchema.required ?? []) if (!(nestedKey in value)) missing.push(`${propertyName}.${nestedKey}`);
    }
  }
  return missing;
}

test("the biometric-observation schema this package targets is readable at its documented path", () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  assert.equal(schema.$id, "urn:red-cup-science:health:biometric-observation:1.0.0");
});

test("an observed fixture carries every field the schema requires", () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const fixture = observation({ metric: "resting-heart-rate", day: "2026-08-20", value: 58, unit: "{beats}/min" });
  assert.deepEqual(requiredKeysPresent(schema, fixture), []);
});

test("a missing-status fixture omits measurement while still carrying every required field", () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const fixture = observation({ metric: "resting-heart-rate", day: "2026-08-20", status: "missing" });
  assert.deepEqual(requiredKeysPresent(schema, fixture), []);
  assert.equal("measurement" in fixture, false);
});

test("the nutrition-practice-computer schema remains an accepted profile: an allOf $ref to the general schema plus its own recordType const", () => {
  const generalSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const nutritionSchema = JSON.parse(readFileSync(NUTRITION_PROFILE_SCHEMA_PATH, "utf8"));
  assert.equal(nutritionSchema.allOf?.[0]?.$ref, generalSchema.$id);
  const knownSchemasById = new Map([[generalSchema.$id, generalSchema]]);
  const fixture = observation({ metric: "resting-heart-rate", day: "2026-08-20", value: 58, unit: "{beats}/min", recordType: "nutrition-biometric-observation" });
  assert.deepEqual(requiredKeysPresent(nutritionSchema, fixture, knownSchemasById), []);
});
