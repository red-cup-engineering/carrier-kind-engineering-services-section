import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const HELD = Object.freeze({ for: true, against: false });

/** The kind trashpanda's settlement witnesses are kept under in the one log. */
export const SETTLEMENT_WITNESS_OBJECT_KIND = "blockchain-trashpanda.settlement";

/**
 * Witness one admitted trashpanda record in the one log: a told record (kind
 * `blockchain-trashpanda.settlement`, under the admission's own category) naming the
 * actor, the record's ni, its type and its disposition, related to the actor that
 * witnessed it. Raw rows an earlier release wrote to `data/logs/.../blockchain-trashpanda.settlement.jsonl`
 * stay where they are, read only.
 */
export function recordSettlementRecord({ actor, category, recordedAt, record, dataRoot = ROOT }) {
  if (actor !== ACTOR || typeof category !== "string" || !Number.isFinite(Date.parse(recordedAt)) || record === null || typeof record !== "object") throw new TypeError("blockchain-trashpanda settlement witness is malformed");
  if (typeof record.id !== "string" || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(record.id)) throw new TypeError("record must be one semantic-content ni token");
  const disposition = typeof record.disposition === "string" ? record.disposition : "admitted";
  const kept = createSemanticRecordJournal({ root: dataRoot, objectKind: SETTLEMENT_WITNESS_OBJECT_KIND }).record({
    category,
    recordedAt,
    told: HELD,
    record: { type: "BlockchainTrashpandaSettlementWitness", version: 1, actor, category, record: record.id, recordType: String(record.type), disposition },
    relation: { subject: actor, predicate: "witnessed", object: record.id },
  });
  return Object.freeze({ ...kept, documentNi: record.id, record: record.id });
}

/** Every settlement witness held under `category`, in the order they were recorded. */
export function settlementWitnesses(category, { dataRoot = ROOT } = {}) {
  return createSemanticRecordJournal({ root: dataRoot, objectKind: SETTLEMENT_WITNESS_OBJECT_KIND })
    .query({ category })
    .filter((row) => row.told?.for && !row.told?.against)
    .map((row) => row.record);
}
