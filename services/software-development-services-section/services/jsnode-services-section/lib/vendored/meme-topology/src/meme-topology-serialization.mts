import { mark, utterance, type UtteranceCarrier } from "@emsenn/meme-algebra";

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [k: string]: JsonValue };

function asJsonValue(value: unknown, context: string): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${context}: non-finite number is not a JSON value`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => asJsonValue(item, `${context}[${index}]`));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) out[key] = asJsonValue(item, `${context}.${key}`);
    return out;
  }
  throw new TypeError(`${context}: not a JSON value`);
}

/** Utterance-log persistence: carriers never cross the wire; re-`induce` on
 *  the far side. Mark values must themselves be JSON values; anything else is
 *  a TypeError. Marks are values, so the rehydrated log coincides with the
 *  dehydrated one. */
export function dehydrateUtterances(utterances: readonly UtteranceCarrier[]): JsonValue {
  const encoded = utterances.map((carrier, index) => {
    const context = `dehydrateUtterances: utterance ${index}`;
    if (typeof carrier !== "object" || carrier === null || carrier.kind !== "utterance.carrier") {
      throw new TypeError(`${context}: expected an utterance carrier`);
    }
    return {
      token: asJsonValue(carrier.token.mark.value, `${context} token mark value`),
      claim: asJsonValue(carrier.claim.mark.value, `${context} claim mark value`),
    } as JsonValue;
  });
  return { kind: "meme-topology.utteranceLog", utterances: encoded };
}

export function rehydrateUtterances(value: JsonValue): readonly UtteranceCarrier[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("rehydrateUtterances: expected an utterance log object");
  }
  const log = value as { readonly [k: string]: JsonValue };
  if (log["kind"] !== "meme-topology.utteranceLog" || !Array.isArray(log["utterances"])) {
    throw new TypeError("rehydrateUtterances: expected a meme-topology.utteranceLog carrier");
  }
  const out = (log["utterances"] as readonly JsonValue[]).map((entry, index) => {
    const context = `rehydrateUtterances: utterance ${index}`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new TypeError(`${context}: expected an encoded utterance`);
    }
    const record = entry as { readonly [k: string]: JsonValue };
    if (!("token" in record) || !("claim" in record)) {
      throw new TypeError(`${context}: encoded utterance must carry token and claim mark values`);
    }
    return utterance(mark(record["token"]), mark(record["claim"]));
  });
  return Object.freeze(out);
}
