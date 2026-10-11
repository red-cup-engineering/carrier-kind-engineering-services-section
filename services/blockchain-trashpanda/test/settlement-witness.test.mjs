import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { recordSettlementRecord, settlementWitnesses } from "../src/settlement-witness.mjs";

const ACTOR = "urn:ame:blockchain-trashpanda";
const RECORD = { id: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", type: "FormationReceiptAdmission", disposition: "admitted" };

test("a settlement witness is kept as a told record in the one log and read back; earlier raw rows stay read only", (t) => {
  const dataRoot = mkdtempSync(join(tmpdir(), "trashpanda-settlement-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  const legacy = join(dataRoot, "data", "logs", "2026", "10", "01", "blockchain-trashpanda.settlement.jsonl");
  mkdirSync(join(legacy, ".."), { recursive: true });
  writeFileSync(legacy, '{"e":"earlier","a":"settlement:actor","v":"actor.blockchain-trashpanda","t":"2026-10-01T00:00:00.000Z"}\n');

  const category = "blockchain-trashpanda.formation-receipt-admissions";
  const kept = recordSettlementRecord({ actor: ACTOR, category, recordedAt: "2026-10-10T12:00:00.000Z", record: RECORD, dataRoot });
  assert.equal(kept.record, RECORD.id);
  assert.equal(kept.appended > 0, true);
  assert.deepEqual(settlementWitnesses(category, { dataRoot }), [{
    type: "BlockchainTrashpandaSettlementWitness", version: 1, actor: ACTOR, category,
    record: RECORD.id, recordType: "FormationReceiptAdmission", disposition: "admitted",
  }]);
  assert.equal(recordSettlementRecord({ actor: ACTOR, category, recordedAt: "2026-10-10T12:00:00.000Z", record: RECORD, dataRoot }).appended, 0, "the same witness is kept once");
  assert.deepEqual(settlementWitnesses("blockchain-trashpanda.other", { dataRoot }), []);
  assert.match(readFileSync(legacy, "utf8"), /^\{"e":"earlier"/u);
  assert.throws(() => recordSettlementRecord({ actor: "urn:ame:other", category, recordedAt: "2026-10-10T12:00:00.000Z", record: RECORD, dataRoot }), /malformed/u);
});
