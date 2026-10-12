import { resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

const OBJECT_KIND = "emsweb.modern-business-persistent-notebook.journal-record";

export function semanticJson(value) {
  if (value instanceof Uint8Array) return { mediaType: "application/octet-stream", contentBase64: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(semanticJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, semanticJson(child)]));
  return value;
}

export function queryJournalRecords(root, category) {
  return createSemanticRecordJournal({ root: resolve(root), objectKind: OBJECT_KIND }).query({ category }).map((entry) => entry.record);
}

export function recordJournalRecord(root, category, record, { recordedAt, actor } = {}) {
  return createSemanticRecordJournal({ root: resolve(root), objectKind: OBJECT_KIND }).record({ category, recordedAt, record: semanticJson(record), charge: { support: true, refutation: false }, relation: { subject: actor, predicate: "records", object: record.id ?? category } });
}
