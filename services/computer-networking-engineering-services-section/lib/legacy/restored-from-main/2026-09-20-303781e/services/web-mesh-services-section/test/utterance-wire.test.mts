import assert from "node:assert/strict";
import test from "node:test";

import { mark, utterance } from "@lenticule-science/articulating";
import { decodeUtteranceLog, encodeUtteranceLog } from "../src/utterance-wire.mts";

test("mesh utterance envelopes round-trip carried values through fresh marks", () => {
  const encoded = encodeUtteranceLog([
    utterance(mark({ peer: "node-a" }), mark(["reachable", true])),
  ]);

  assert.deepEqual(encoded, {
    kind: "meme-topology.utteranceLog",
    utterances: [{ token: { peer: "node-a" }, claim: ["reachable", true] }],
  });
  const [decoded] = decodeUtteranceLog(encoded);
  assert.deepEqual(decoded?.token.mark.value, { peer: "node-a" });
  assert.deepEqual(decoded?.claim.mark.value, ["reachable", true]);
});

test("mesh utterance envelopes reject malformed carriers", () => {
  assert.throws(
    () => decodeUtteranceLog({ kind: "meme-topology.utteranceLog", utterances: [{}] }),
    /expected token and claim mark values/,
  );
  assert.throws(
    () => decodeUtteranceLog({ kind: "something-else", utterances: [] }),
    /expected a meme-topology\.utteranceLog carrier/,
  );
});

test("mesh utterance envelopes reject non-JSON mark values", () => {
  assert.throws(
    () => encodeUtteranceLog([utterance(mark(1n), mark("claim"))]),
    /token mark value/,
  );
});
