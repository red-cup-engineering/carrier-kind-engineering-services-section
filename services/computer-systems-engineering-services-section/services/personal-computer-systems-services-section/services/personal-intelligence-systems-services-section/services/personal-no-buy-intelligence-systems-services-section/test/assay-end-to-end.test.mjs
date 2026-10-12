import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateJsonSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validation";
import { deriveSetOfSurfacesFromMeasurement } from "../scripts/derive-set-of-surfaces-from-measurement.mjs";
import { filterSetOfSurfacesByTier } from "../scripts/filter-set-of-surfaces-by-tier.mjs";
import { deriveSetOfGuideChaptersFromCatalog } from "../scripts/derive-set-of-guide-chapters-from-catalog.mjs";

const measurementDir = fileURLToPath(new URL(
  "../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-no-buy-services-section/data/records/",
  import.meta.url,
));
const schemaPath = fileURLToPath(new URL("../schemas/no-buy-surface.schema.json", import.meta.url));

async function loadMeasurementRecords() {
  const [providerText, broadText] = await Promise.all([
    readFile(`${measurementDir}2026-09-05-no-buy-provider-and-incumbent-measurement.json`, "utf8"),
    readFile(`${measurementDir}2026-09-05-no-buy-broad-surface-measurement.json`, "utf8"),
  ]);
  return [JSON.parse(providerText), JSON.parse(broadText)];
}

test("every derived surface, over the real measurement records, conforms to no-buy-surface.schema.json", async () => {
  const [providerRecord, broadRecord] = await loadMeasurementRecords();
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const catalog = deriveSetOfSurfacesFromMeasurement([providerRecord, broadRecord]);
  assert.ok(catalog.surfaces.length > 0);
  for (const surface of catalog.surfaces) {
    const { valid, errors } = validateJsonSchemaInstance({ value: surface, schema });
    assert.ok(valid, `surface ${surface.id} failed schema validation: ${JSON.stringify(errors)}`);
  }
});

test("no-kyc admitted surfaces, over the real measurement records, contain no phone or government-id requirement", async () => {
  const [providerRecord, broadRecord] = await loadMeasurementRecords();
  const catalog = deriveSetOfSurfacesFromMeasurement([providerRecord, broadRecord]);
  const { admitted } = filterSetOfSurfacesByTier({ catalog, tier: "no-kyc" });
  assert.ok(admitted.length > 0);
  for (const surface of admitted) {
    assert.notEqual(surface.requiresIdentity, "phone");
    assert.notEqual(surface.requiresIdentity, "government-id");
    assert.ok(surface.requiresIdentity === "none" || surface.requiresIdentity === "email");
  }
});

test("every pay-rate line in every guide chapter, over the real measurement records, carries an observed date and a source, or says unknown", async () => {
  const [providerRecord, broadRecord] = await loadMeasurementRecords();
  const catalog = deriveSetOfSurfacesFromMeasurement([providerRecord, broadRecord]);
  for (const enterprise of ["crypto", "ai"]) {
    const { chapters } = deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise });
    for (const chapter of chapters) {
      const payRateLines = chapter.split("\n").filter((line) => line.startsWith("Pay rate:"));
      for (const line of payRateLines) {
        const sourced = /\(observed .+, source: .+\)\.$/.test(line);
        const unknown = line === "Pay rate: not measured (unknown).";
        assert.ok(sourced || unknown, `unsourced pay-rate line: ${line}`);
      }
    }
  }
});
