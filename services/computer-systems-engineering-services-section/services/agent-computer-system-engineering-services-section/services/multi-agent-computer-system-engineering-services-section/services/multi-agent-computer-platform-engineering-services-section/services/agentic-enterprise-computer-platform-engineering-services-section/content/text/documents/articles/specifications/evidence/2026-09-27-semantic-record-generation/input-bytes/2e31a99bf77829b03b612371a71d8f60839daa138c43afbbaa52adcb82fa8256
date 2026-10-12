#!/usr/bin/env node
import { readFileSync } from "node:fs";
import contract from "../schemas/is-json-text.json" with { type: "json" };
import { parseJsonValue } from "./parse-json-value.mjs";
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** Test whether text carries one JSON value. */
export function isJsonText(text) {
  if (typeof text !== "string") return false;
  try {
    parseJsonValue(text);
    return true;
  } catch {
    return false;
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isJsonText(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
