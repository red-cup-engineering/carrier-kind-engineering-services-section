import * as fare from "../../../../../../apps/flatfile-agentic-resource-engine/apps/fare/src/index.mjs";

// Seeds a fresh member root with one witness — mirrors
// apps/fare/test/replay.test.mjs's own witnessFixture/appendWitness
// pair exactly (a record-creation witness aside, which no test here
// needs): a legal 0->1 FOUR transition, appended to the composed
// journal, its full body in the content-addressed record store keyed
// by the same id the row's v coordinate carries — the same gate-then-
// write tail apps/fare's own operator/edit.mjs performs.
export function seedWitness(root, { target, timestamp, operator = "fm_add", channel = "substrate" }) {
  const witness = fare.witness.makeWitness({
    operator,
    target,
    before_digest: null,
    after_digest: fare.identity.identity({ target, timestamp }),
    details: {},
    agent: "mash-fixture",
    timestamp,
    kind: "mutation",
    four_before: [false, false],
    four_after: [true, false],
    channel,
  });
  fare.eventLog.appendSeavt(root, witness.channel, [fare.seavt.seavt(witness.target, witness.operator, witness.id, witness.timestamp)], witness.timestamp);
  fare.recordStore.putRecord(root, witness);
  return witness;
}
