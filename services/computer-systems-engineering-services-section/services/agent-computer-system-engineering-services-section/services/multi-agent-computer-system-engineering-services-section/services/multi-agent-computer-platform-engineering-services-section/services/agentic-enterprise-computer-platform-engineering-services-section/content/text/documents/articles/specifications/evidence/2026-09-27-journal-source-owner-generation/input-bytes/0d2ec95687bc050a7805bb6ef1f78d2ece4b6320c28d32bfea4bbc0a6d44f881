#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/assert-canonical-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { canonicalJson } from "./canonical-json.mjs";
/** Admit one RFC 8785 JSON value without retaining its serialized text. */
export function assertCanonicalJson(value) {
  canonicalJson(value);
  return value;
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(assertCanonicalJson(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
