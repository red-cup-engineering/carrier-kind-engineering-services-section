import { createHash } from "node:crypto";

// This boundary deliberately has no RDF client.  A caller must bring the exact
// exported row bytes; an activation file that merely names an old identifier is
// not evidence from which a record may be reconstructed.
export function namedUnrecoveredLegacyRow({ legacyIdentity, category } = {}) {
  if (typeof legacyIdentity !== "string" || !legacyIdentity || typeof category !== "string" || !category) throw new TypeError("legacy recovery requires identity and category");
  return Object.freeze({ type: "LegacyRdfRowRecovery", legacyIdentity, category, status: "named-unrecovered", reason: "original-rdf-row-bytes-unavailable" });
}

export async function importRecoveredLegacyRdfRow({ legacyIdentity, category, rowBytes, admit, appendReceipt, recoveredAt = new Date().toISOString() } = {}) {
  if (typeof legacyIdentity !== "string" || !legacyIdentity || typeof category !== "string" || !category || !(rowBytes instanceof Uint8Array) || typeof admit !== "function" || typeof appendReceipt !== "function") throw new TypeError("legacy import requires identity category original row bytes admission and receipt writer");
  let record; try { record = JSON.parse(Buffer.from(rowBytes).toString("utf8")); } catch { throw new TypeError("legacy import row bytes are not one JSON record"); }
  if (!record || typeof record !== "object" || Array.isArray(record) || record.id !== legacyIdentity) throw new TypeError("legacy import row does not prove the declared identity");
  const admitted = await admit(record);
  if (!admitted || typeof admitted.id !== "string") throw new TypeError("legacy import admission did not produce one current record");
  const receipt = Object.freeze({ type: "LegacyRdfRecordImportReceipt", legacyIdentity, legacyCategory: category, legacyRowSha256: `sha256:${createHash("sha256").update(rowBytes).digest("hex")}`, importedRecord: admitted.id, recoveredAt, status: "imported-from-original-row-bytes" });
  await appendReceipt(receipt);
  return receipt;
}
