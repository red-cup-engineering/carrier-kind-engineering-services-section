import { requireJsonValue, type JsonValue } from "@red-cup-engineering/agentic-relation-engine";
import { mark, utterance, type UtteranceCarrier } from "@lenticule-science/articulating";

type JsonRecord = Readonly<Record<string, JsonValue>>;
type EncodedUtterance = Readonly<{
  token: JsonValue;
  claim: JsonValue;
}>;

function jsonRecord(value: JsonValue): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

/**
 * Encode mesh anti-entropy evidence without claiming mark identity across
 * peers. The mesh protocol owns this envelope; relating owns the marks and
 * utterance constructors it contains.
 */
export function encodeUtteranceLog(utterances: readonly UtteranceCarrier[]): JsonValue {
  const encoded = utterances.map((carrier, index): EncodedUtterance => {
    if (carrier.kind !== "utterance.carrier") {
      throw new TypeError(`encodeUtteranceLog: utterance ${index}: expected an utterance carrier`);
    }
    return Object.freeze({
      token: requireJsonValue(carrier.token.mark.value, `encodeUtteranceLog: utterance ${index} token mark value`),
      claim: requireJsonValue(carrier.claim.mark.value, `encodeUtteranceLog: utterance ${index} claim mark value`),
    });
  });
  return Object.freeze({
    kind: "meme-topology.utteranceLog",
    utterances: Object.freeze(encoded),
  });
}

/** Decode the mesh envelope into fresh marks and utterance carriers. */
export function decodeUtteranceLog(value: JsonValue): readonly UtteranceCarrier[] {
  const record = jsonRecord(value);
  if (record === null || record["kind"] !== "meme-topology.utteranceLog" || !Array.isArray(record["utterances"])) {
    throw new TypeError("decodeUtteranceLog: expected a meme-topology.utteranceLog carrier");
  }
  return Object.freeze(record["utterances"].map((entry, index) => {
    const encoded = jsonRecord(entry);
    if (encoded === null || !("token" in encoded) || !("claim" in encoded)) {
      throw new TypeError(`decodeUtteranceLog: utterance ${index}: expected token and claim mark values`);
    }
    return utterance(mark(encoded["token"]), mark(encoded["claim"]));
  }));
}
