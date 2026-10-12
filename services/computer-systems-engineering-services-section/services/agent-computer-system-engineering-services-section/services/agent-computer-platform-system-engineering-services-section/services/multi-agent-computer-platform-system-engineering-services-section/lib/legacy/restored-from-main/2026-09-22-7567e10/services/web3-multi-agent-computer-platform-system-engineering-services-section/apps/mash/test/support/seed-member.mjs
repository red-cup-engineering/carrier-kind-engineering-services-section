import { makeWitness } from "@red-cup-engineering/flatfile-resource-graph-service/kernel/witness";
import { identity } from "@red-cup-engineering/flatfile-resource-graph-service/kernel/identity";
import { appendSeavt } from "@red-cup-engineering/flatfile-resource-graph-service/kernel/event-log";
import { seavt } from "@red-cup-engineering/flatfile-resource-graph-service/kernel/seavt";
import { putRecord } from "@red-cup-engineering/flatfile-resource-graph-service/kernel/record-store";

// Seeds a fresh member root with one witness — mirrors
// apps/fae/test/replay.test.mjs's own witnessFixture/appendWitness
// pair exactly (a record-creation witness aside, which no test here
// needs): a legal 0->1 FOUR transition, appended to the composed
// journal, its full body in the content-addressed record store keyed
// by the same id the row's v coordinate carries — the same gate-then-
// write tail apps/fae's own operator/edit.mjs performs.
export function seedWitness(root, { target, timestamp, operator = "fm_add", channel = "substrate" }) {
  const witness = makeWitness({
    operator,
    target,
    before_digest: null,
    after_digest: identity({ target, timestamp }),
    details: {},
    agent: "mash-fixture",
    timestamp,
    kind: "mutation",
    four_before: [false, false],
    four_after: [true, false],
    channel,
  });
  appendSeavt(root, witness.channel, [seavt(witness.target, witness.operator, witness.id, witness.timestamp)], witness.timestamp);
  putRecord(root, witness);
  return witness;
}
