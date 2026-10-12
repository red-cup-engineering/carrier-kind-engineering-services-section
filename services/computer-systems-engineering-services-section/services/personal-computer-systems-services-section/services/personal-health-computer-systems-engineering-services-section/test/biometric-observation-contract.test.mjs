import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { admitSchema } from "@red-cup-engineering/json-schema-services-section/admit-schema";
import { inspectSchemaCorpus } from "@red-cup-engineering/json-schema-services-section/inspect-schema-corpus";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

const schemas = await Promise.all([
  readJson("lib/schemas/biometric-observation-v1.schema.json"),
  readJson("services/nutrition-practice-system-services-section/apps/nutrition-practice-computer/lib/schemas/nutrition-biometric-observation-v1.schema.json"),
]);
const [generalSchema, nutritionSchema] = schemas;
const byId = new Map(schemas.map((schema) => [schema.$id, schema]));
const validate = (value, id) => validateSchemaInstance({ instance: value, schema: byId.get(id), schemas });

const retention = { containsRawPhoto: false, containsReceiptImage: false, containsRawAudio: false, containsAppearanceEmbedding: false, containsRawWearablePayload: false };

const heartRate = {
  recordType: "biometric-observation",
  schemaVersion: "1.0.0",
  observationId: "observation-heart-rate-001",
  metric: "heart-rate",
  measuredAt: "2026-09-02T07:15:00Z",
  source: { kind: "device", deviceId: "synthetic-wearable-001", deviceModel: "synthetic-band-3" },
  measurement: { value: "58", unit: "{beats}/min", precision: "1" },
  missingness: { status: "observed" },
  consentScope: { kind: "self-only" },
  mediaRetention: retention,
};

test("the general schema and the nutrition profile are both admitted by the canonical Draft 2020-12 service", () => {
  for (const schema of schemas) assert.doesNotThrow(() => admitSchema({ schema }));
  assert.deepEqual(inspectSchemaCorpus({ schemas }), { ok: true, checked: schemas.length, errors: [] });
});

test("declares the general urn:red-cup-science:health:biometric-observation:1.0.0 identity", () => {
  assert.equal(generalSchema.$id, "urn:red-cup-science:health:biometric-observation:1.0.0");
  assert.equal(generalSchema.properties.recordType.$ref, "#/$defs/id");
});

test("the nutrition schema is a thin allOf profile referencing the general schema by $id", () => {
  assert.equal(nutritionSchema.allOf?.[0]?.$ref, "urn:red-cup-science:health:biometric-observation:1.0.0");
  assert.equal(nutritionSchema.allOf?.[1]?.properties?.recordType?.const, "nutrition-biometric-observation");
});

test("accepts device-sourced heart-rate, derived hrv-rmssd, and manually-entered sleep-duration observations", () => {
  assert.equal(validate(heartRate, generalSchema.$id).ok, true);
  assert.equal(validate({ ...heartRate, observationId: "observation-hrv-rmssd-001", metric: "hrv-rmssd", source: { kind: "derived", derivedFrom: ["observation-heart-rate-001"] }, measurement: { value: "42.5", unit: "ms", precision: "0.1" } }, generalSchema.$id).ok, true);
  const { measuredAt, ...withoutMeasuredAt } = heartRate;
  assert.equal(validate({ ...withoutMeasuredAt, observationId: "observation-sleep-duration-001", metric: "sleep-duration", enteredAt: "2026-09-02T08:00:00Z", source: { kind: "manual" }, measurement: { value: "7.5", unit: "h", precision: "0.1" } }, generalSchema.$id).ok, true);
});

test("file-backed positive fixtures for heart-rate, hrv-rmssd, and sleep-duration satisfy the general schema", async () => {
  assert.equal(validate(await readJson("test/fixtures/positive/heart-rate.json"), generalSchema.$id).ok, true);
  assert.equal(validate(await readJson("test/fixtures/positive/hrv-rmssd.json"), generalSchema.$id).ok, true);
  assert.equal(validate(await readJson("test/fixtures/positive/sleep-duration.json"), generalSchema.$id).ok, true);
});

test("accepts an explicitly missing observation without a fabricated measurement", () => {
  const { measurement, ...missing } = heartRate;
  assert.equal(validate({ ...missing, missingness: { status: "missing", reason: "synthetic-device-not-worn" } }, generalSchema.$id).ok, true);
});

test("refuses an observation without measuredAt or enteredAt, without consentScope, with a fabricated measurement on a missing reading, or a malformed metric id", () => {
  const { measuredAt, ...noTimestamp } = heartRate;
  assert.equal(validate(noTimestamp, generalSchema.$id).ok, false);
  const { consentScope, ...noConsent } = heartRate;
  assert.equal(validate(noConsent, generalSchema.$id).ok, false);
  assert.equal(validate({ ...heartRate, missingness: { status: "missing" } }, generalSchema.$id).ok, false);
  assert.equal(validate({ ...heartRate, metric: "Heart Rate" }, generalSchema.$id).ok, false);
});

test("refuses a retained raw wearable payload declaration, in code and in the adversarial fixture", async () => {
  assert.equal(validate({ ...heartRate, mediaRetention: { ...retention, containsRawWearablePayload: true } }, generalSchema.$id).ok, false);
  assert.equal(validate(await readJson("test/fixtures/adversarial/raw-wearable-payload-retention.json"), generalSchema.$id).ok, false);
});

test("refuses retained raw photo, receipt image, audio, and appearance-embedding declarations", () => {
  for (const key of Object.keys(retention)) {
    assert.equal(validate({ ...heartRate, mediaRetention: { ...retention, [key]: true } }, generalSchema.$id).ok, false, key);
  }
});

test("the nutrition profile accepts its own recordType and refuses the general schema's bare recordType", () => {
  const nutritionScoped = { ...heartRate, recordType: "nutrition-biometric-observation" };
  assert.equal(validate(nutritionScoped, nutritionSchema.$id).ok, true);
  assert.equal(validate(heartRate, nutritionSchema.$id).ok, false);
});

test("a nutrition-scoped instance also satisfies the general schema, since recordType is pattern-bound there, not const-bound", () => {
  const nutritionScoped = { ...heartRate, recordType: "nutrition-biometric-observation" };
  assert.equal(validate(nutritionScoped, generalSchema.$id).ok, true);
});
