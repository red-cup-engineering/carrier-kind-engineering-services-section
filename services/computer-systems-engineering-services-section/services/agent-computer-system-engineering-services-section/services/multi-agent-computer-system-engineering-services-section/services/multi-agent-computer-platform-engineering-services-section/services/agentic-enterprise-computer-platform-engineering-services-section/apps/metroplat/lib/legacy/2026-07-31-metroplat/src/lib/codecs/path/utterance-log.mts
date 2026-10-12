import { mark, utterance, type UtteranceObject } from "../../records/utterance/utterance.mts";
import type { JsonValue } from "../json/core.mts";

type MutableJsonRecord = { [key: string]: JsonValue };
type UtteranceLogEntry = Readonly<{ token: JsonValue; claim: JsonValue }>;

function asJsonValue(value: unknown, context: string): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${context}: non-finite number is not a JSON value`);
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((item, index) => asJsonValue(item, `${context}[${index}]`)));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: MutableJsonRecord = {};
    for (const [key, item] of Object.entries(value)) out[key] = asJsonValue(item, `${context}.${key}`);
    return Object.freeze(out);
  }
  throw new TypeError(`${context}: not a JSON value`);
}

function jsonRecord(value: JsonValue): Readonly<Record<string, JsonValue>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, JsonValue>>
    : null;
}

export function dehydrateUtterances(utterances: readonly UtteranceObject[]): JsonValue {
  const encoded = utterances.map((utteranceValue, index): UtteranceLogEntry => {
    const context = `dehydrateUtterances: utterance ${index}`;
    if (typeof utteranceValue !== "object" || utteranceValue === null || utteranceValue.kind !== "utterance.object") {
      throw new TypeError(`${context}: expected an utterance object`);
    }
    return Object.freeze({
      token: asJsonValue(utteranceValue.token.mark.value, `${context} token mark value`),
      claim: asJsonValue(utteranceValue.claim.mark.value, `${context} claim mark value`),
    });
  });
  return Object.freeze({ kind: "meme-topology.utteranceLog", utterances: Object.freeze(encoded) });
}

export function rehydrateUtterances(value: JsonValue): readonly UtteranceObject[] {
  const record = jsonRecord(value);
  if (record === null || record["kind"] !== "meme-topology.utteranceLog" || !Array.isArray(record["utterances"])) {
    throw new TypeError("rehydrateUtterances: expected a meme-topology.utteranceLog object");
  }
  return Object.freeze(record["utterances"].map((entry, index) => {
    const item = jsonRecord(entry);
    const context = `rehydrateUtterances: utterance ${index}`;
    if (item === null || !("token" in item) || !("claim" in item)) {
      throw new TypeError(`${context}: encoded utterance must carry token and claim mark values`);
    }
    return utterance(mark(item["token"]), mark(item["claim"]));
  }));
}
