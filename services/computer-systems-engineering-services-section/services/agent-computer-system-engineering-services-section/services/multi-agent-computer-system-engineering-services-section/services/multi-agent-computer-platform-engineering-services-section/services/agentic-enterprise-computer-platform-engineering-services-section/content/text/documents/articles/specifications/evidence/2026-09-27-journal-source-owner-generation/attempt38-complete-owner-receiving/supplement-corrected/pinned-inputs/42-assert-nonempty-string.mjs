#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["value", "label"],
  properties: { value: {}, label: { type: "string" }, expectation: { type: "string" } },
});
export const outputSchema = Object.freeze({ type: "string", minLength: 1 });
/** Admit a non-blank string while preserving the caller's field-specific label. */
export function assertNonemptyString(value, label, expectation = "a non-empty string") {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label}: expected ${expectation}`);
  return value;
}

if (import.meta.main) {
  const { value, label, expectation } = JSON.parse(readInput(0, "utf8"));
  process.stdout.write(JSON.stringify(assertNonemptyString(value, label, expectation)) + "\n");
}
