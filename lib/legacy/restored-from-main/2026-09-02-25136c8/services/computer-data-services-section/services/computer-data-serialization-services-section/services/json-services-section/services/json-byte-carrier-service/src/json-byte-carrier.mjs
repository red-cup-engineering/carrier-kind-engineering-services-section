const FIELDS = Object.freeze(["contentBase64", "mediaType"]);

function requiredMediaType(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) throw new TypeError("JSON byte carrier mediaType must be nonempty trimmed text");
  return value;
}

export function encodeJsonByteCarrier(bytes, { mediaType = "application/octet-stream" } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("JSON byte carrier input must be a Uint8Array");
  return Object.freeze({ mediaType: requiredMediaType(mediaType), contentBase64: Buffer.from(bytes).toString("base64") });
}

export function decodeJsonByteCarrier(carrier, { expectedMediaType, maximumBytes = Number.MAX_SAFE_INTEGER } = {}) {
  if (carrier === null || typeof carrier !== "object" || Array.isArray(carrier) || Object.getPrototypeOf(carrier) !== Object.prototype) throw new TypeError("JSON byte carrier must be one plain object");
  const fields = Object.keys(carrier).sort();
  if (fields.length !== FIELDS.length || fields.some((field, index) => field !== FIELDS[index])) throw new TypeError("JSON byte carrier must contain exactly mediaType and contentBase64");
  const mediaType = requiredMediaType(carrier.mediaType);
  if (expectedMediaType !== undefined && mediaType !== expectedMediaType) throw new TypeError(`JSON byte carrier mediaType must be ${expectedMediaType}`);
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new TypeError("JSON byte carrier maximumBytes must be a nonnegative safe integer");
  if (typeof carrier.contentBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(carrier.contentBase64)) throw new TypeError("JSON byte carrier contentBase64 must be canonical Base64");
  const bytes = Buffer.from(carrier.contentBase64, "base64");
  if (bytes.toString("base64") !== carrier.contentBase64) throw new TypeError("JSON byte carrier contentBase64 must reproduce canonical Base64");
  if (bytes.length > maximumBytes) throw new RangeError(`JSON byte carrier exceeds ${maximumBytes} bytes`);
  return Object.freeze({ mediaType, bytes });
}
