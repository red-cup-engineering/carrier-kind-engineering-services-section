import assert from "node:assert/strict";
import test from "node:test";

import { dehydrateUtterances, rehydrateUtterances } from "@red-cup-engineering/eavt/log-path";
import * as scientific from "@red-cup-engineering/signcell/utterance";

test("existing utterance logs reconstitute shared objects without changing persisted payloads", () => {
  const saved = { kind: "meme-topology.utteranceLog", utterances: [
    { token: { device: "sensor", reading: false }, claim: "held" },
    { token: ["unknown", 0, null], claim: { observed: true } },
    // A literal "__proto__" JSON key must round-trip as an own data property,
    // never as a prototype reassignment on the intermediate plain object.
    { token: JSON.parse('{"__proto__":{"observed":true},"constructor":"held"}'), claim: false },
  ] };
  const admitted = rehydrateUtterances(saved);
  assert.ok(admitted.every((value) => value.token instanceof scientific.Token && value.claim instanceof scientific.Claim));
  assert.deepEqual(dehydrateUtterances(admitted), saved);
});
