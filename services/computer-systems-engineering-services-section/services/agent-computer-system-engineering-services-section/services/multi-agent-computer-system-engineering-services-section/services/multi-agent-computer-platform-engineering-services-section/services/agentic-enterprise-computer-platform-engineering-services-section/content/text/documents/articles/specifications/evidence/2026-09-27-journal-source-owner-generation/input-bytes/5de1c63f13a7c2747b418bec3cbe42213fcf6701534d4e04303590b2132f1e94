#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/require-json-value.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { isJsonValue } from "./is-json-value.mjs";
/** Admit one raw JSON value. */
export function requireJsonValue(value) {
  if (!isJsonValue(value)) throw new TypeError("not a JSON value");
  return value;
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(requireJsonValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
