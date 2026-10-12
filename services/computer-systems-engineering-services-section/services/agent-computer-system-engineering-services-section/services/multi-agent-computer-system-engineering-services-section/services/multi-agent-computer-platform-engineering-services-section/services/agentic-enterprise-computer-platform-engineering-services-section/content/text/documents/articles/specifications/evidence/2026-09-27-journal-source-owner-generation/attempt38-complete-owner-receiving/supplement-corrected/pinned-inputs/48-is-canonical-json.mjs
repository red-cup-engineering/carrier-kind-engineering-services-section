#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/is-canonical-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { assertCanonicalJson } from "./assert-canonical-json.mjs";
/** Test whether one value can be encoded as RFC 8785 canonical JSON. */
export function isCanonicalJson(value) {
  try {
    assertCanonicalJson(value);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isCanonicalJson(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
