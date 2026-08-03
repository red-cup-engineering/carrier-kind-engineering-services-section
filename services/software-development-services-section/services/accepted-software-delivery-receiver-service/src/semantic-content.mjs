import { EMPTY_WITNESS_ROOT, admitJsonSemanticContent, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const BINARY_TAG = "org.emsenn.semantic-content.bytes.base64url.v1";

function externalize(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { type: BINARY_TAG, value: Buffer.from(value).toString("base64url") };
  }
  if (Array.isArray(value)) return value.map(externalize);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, externalize(item)]));
  }
  return value;
}

function internalize(value) {
  if (Array.isArray(value)) return value.map(internalize);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    if (Object.keys(value).sort().join("\0") === "type\0value" && value.type === BINARY_TAG && typeof value.value === "string") {
      return Buffer.from(value.value, "base64url");
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, internalize(item)]));
  }
  return value;
}

export const identify = (value, objectKind) => identifyJsonSemanticContent({ objectKind, value: externalize(value), witnessRoot: EMPTY_WITNESS_ROOT });
export const admit = (bytes, objectKind) => internalize(admitJsonSemanticContent({ bytes, objectKind }).value);
