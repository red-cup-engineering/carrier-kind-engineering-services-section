const MEDIA_RETENTION = Object.freeze({
  containsRawPhoto: false,
  containsReceiptImage: false,
  containsRawAudio: false,
  containsAppearanceEmbedding: false,
  containsRawWearablePayload: false,
});

let counter = 0;

/** Builds one biometric-observation-v1-shaped fixture record for tests. `recordType` defaults to the general health-science record; pass "nutrition-biometric-observation" to build the nutrition-profile shape instead. */
export function observation({ metric, day, value, unit = "unit", precision = "1", status = "observed", source = { kind: "manual" }, recordType = "biometric-observation" }) {
  counter += 1;
  const record = {
    recordType,
    schemaVersion: "1.0.0",
    observationId: `observation-${metric}-${counter}`,
    metric,
    measuredAt: `${day}T07:00:00Z`,
    source,
    missingness: { status },
    consentScope: { kind: "self-only" },
    mediaRetention: MEDIA_RETENTION,
  };
  if (status !== "missing") record.measurement = { value: String(value), unit, precision };
  return record;
}

/** Builds `count` consecutive daily observations for one metric starting at `startDay`, with `values[i]` (or null for a missing day) on day i. */
export function dailySeries(metric, startDay, values, unit = "unit") {
  const start = new Date(`${startDay}T00:00:00Z`);
  return values.map((value, index) => {
    const day = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
    return value === null ? observation({ metric, day, status: "missing" }) : observation({ metric, day, value, unit });
  });
}
