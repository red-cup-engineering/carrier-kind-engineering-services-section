#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/parse-json-value.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { requireJsonValue } from "./require-json-value.mjs";
/** Parse one JSON text document into an admitted JSON value. */
export function parseJsonValue(text) {
  return requireJsonValue(JSON.parse(text));
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(parseJsonValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
