#!/usr/bin/env node
import { readFileSync } from "node:fs";
import contract from "../schemas/json-byte-carrier.json" with { type: "json" };
export const inputSchema = contract.encodeJsonByteCarrier.input;
export const outputSchema = contract.encodeJsonByteCarrier.output;
/** Encode a JSON byte-integer array as one media-typed Base64 carrier. */
export function encodeJsonByteCarrier({ bytes, mediaType } = {}) {
  if (
    !Array.isArray(bytes) ||
    bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    throw new TypeError("JSON byte carrier bytes must be byte integers");
  if (
    typeof mediaType !== "string" ||
    mediaType.length === 0 ||
    mediaType.trim() !== mediaType
  )
    throw new TypeError(
      "JSON byte carrier mediaType must be nonempty trimmed text",
    );
  return Object.freeze({
    mediaType,
    contentBase64: Buffer.from(bytes).toString("base64"),
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(encodeJsonByteCarrier(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
