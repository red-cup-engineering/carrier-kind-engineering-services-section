import { mark, utterance } from "@red-cup-engineering/computer-data-engine/utterance";
function requireJsonValue(value, label) {
    const visit = (current)=>{
        if (current === null || typeof current === "string" || typeof current === "boolean") return;
        if (typeof current === "number") {
            if (Number.isFinite(current)) return;
        } else if (Array.isArray(current)) {
            current.forEach(visit);
            return;
        } else if (typeof current === "object" && Object.getPrototypeOf(current) === Object.prototype) {
            Object.values(current).forEach(visit);
            return;
        }
        throw new TypeError(`${label}: expected a JSON value`);
    };
    visit(value);
    return value;
}
function jsonRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
/**
 * Encode mesh anti-entropy evidence without claiming mark identity across
 * peers. The mesh protocol owns this envelope; relating owns the marks and
 * utterance constructors it contains.
 */
export function encodeUtteranceLog(utterances) {
    const encoded = utterances.map((carrier, index) => {
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
export function decodeUtteranceLog(value) {
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
