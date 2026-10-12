#!/usr/bin/env node
import { readFileSync } from "node:fs";
import contract from "../schemas/json-byte-carrier.json" with { type: "json" };
export const inputSchema = contract.decodeJsonByteCarrier.input;
export const outputSchema = contract.decodeJsonByteCarrier.output;
/** Decode one exact media-typed Base64 carrier into JSON byte integers. */
export function decodeJsonByteCarrier({
  carrier,
  expectedMediaType,
  maximumBytes = Number.MAX_SAFE_INTEGER,
} = {}) {
  if (
    carrier === null ||
    typeof carrier !== "object" ||
    Array.isArray(carrier) ||
    Object.getPrototypeOf(carrier) !== Object.prototype
  )
    throw new TypeError("JSON byte carrier must be one plain object");
  const fields = Object.keys(carrier).sort();
  if (
    fields.length !== 2 ||
    fields[0] !== "contentBase64" ||
    fields[1] !== "mediaType"
  )
    throw new TypeError(
      "JSON byte carrier must contain exactly mediaType and contentBase64",
    );
  const { mediaType, contentBase64 } = carrier;
  if (
    typeof mediaType !== "string" ||
    mediaType.length === 0 ||
    mediaType.trim() !== mediaType
  )
    throw new TypeError(
      "JSON byte carrier mediaType must be nonempty trimmed text",
    );
  if (expectedMediaType !== undefined && mediaType !== expectedMediaType)
    throw new TypeError(
      `JSON byte carrier mediaType must be ${expectedMediaType}`,
    );
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
    throw new TypeError(
      "JSON byte carrier maximumBytes must be a nonnegative safe integer",
    );
  if (
    typeof contentBase64 !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      contentBase64,
    )
  )
    throw new TypeError(
      "JSON byte carrier contentBase64 must be canonical Base64",
    );
  const bytes = Buffer.from(contentBase64, "base64");
  if (bytes.toString("base64") !== contentBase64)
    throw new TypeError(
      "JSON byte carrier contentBase64 must reproduce canonical Base64",
    );
  if (bytes.length > maximumBytes)
    throw new RangeError(`JSON byte carrier exceeds ${maximumBytes} bytes`);
  return Object.freeze({ mediaType, bytes: Array.from(bytes) });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(decodeJsonByteCarrier(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
