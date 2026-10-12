#!/usr/bin/env node
import { readFileSync } from "node:fs";
import contract from "../schemas/write-json-text.json" with { type: "json" };
import { canonicalJson } from "./canonical-json.mjs";
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** Write the first JSON value as canonical text, or empty text for no values. */
export function writeJsonText(values) {
  if (!Array.isArray(values))
    throw new TypeError("JSON text values must be an array");
  return values.length === 0 ? "" : `${canonicalJson(values[0])}\n`;
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(writeJsonText(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
