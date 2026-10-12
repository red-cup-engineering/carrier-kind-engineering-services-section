const instances = new WeakSet();
const privateDetails = new WeakMap();
const reasons = new Set([
  "source-corrupt",
  "evidence-unavailable",
  "resource-limit",
  "maintenance-busy",
  "storage-unsupported",
  "storage-unavailable",
  "publication-uncertain",
]);

export function journalUnavailable(reason, diagnostics) {
  if (typeof reason !== "string" || !reasons.has(reason)) {
    throw new TypeError("journal unavailable reason is invalid");
  }
  const error = new Error(`journal unavailable: ${reason}`);
  Object.defineProperties(error, {
    name: { value: "JournalUnavailable", enumerable: true },
    code: { value: "JOURNAL_UNAVAILABLE", enumerable: true },
    reason: { value: reason, enumerable: true },
  });
  instances.add(error);
  privateDetails.set(error, diagnostics);
  return Object.freeze(error);
}

export function isJournalUnavailable(value) {
  return value !== null
    && (typeof value === "object" || typeof value === "function")
    && instances.has(value);
}

// Retain private diagnostics without adding a public accessor or serializer.
void privateDetails;
