#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/is-json-record.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** Test whether a value is a plain JSON object. */
export function isJsonRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isJsonRecord(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
