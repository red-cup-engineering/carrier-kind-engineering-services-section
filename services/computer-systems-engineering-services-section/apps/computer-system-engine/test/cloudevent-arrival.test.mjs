import assert from "node:assert/strict";
import test from "node:test";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { arrivalUtteranceFromCloudEvent, cloudEventContract, cloudEventIdentity } from "../src/rpc/cloudevent-identity.mjs";

const event = Object.freeze({
  specversion: "1.0",
  id: "arrival-1",
  source: "https://bare-cedar-fog.561.group/",
  type: "org.561-group.test.arrival",
  time: "2026-10-15T00:00:00Z",
  datacontenttype: "application/json",
  data: { claim: "admitted" },
});

test("an arrival's token is its CloudEvents source and id", () => {
  assert.equal(cloudEventIdentity(event), "https://bare-cedar-fog.561.group/#arrival-1");
});

test("an arrival is a CloudEvents 1.0 event with time and JSON data", () => {
  assert.deepEqual(cloudEventContract.assert(event, "event"), event);
  for (const [field, value] of [["specversion", "0.3"], ["time", undefined], ["id", ""], ["data", undefined]]) {
    const changed = { ...event, [field]: value };
    if (value === undefined) delete changed[field];
    assert.throws(() => cloudEventContract.assert(changed, "event"), TypeError, field);
  }
});

test("an arrival's utterance marks its token and claims its data", () => {
  assert.deepEqual(arrivalUtteranceFromCloudEvent(event), utterance(mark(cloudEventIdentity(event)), mark(event.data)));
});
