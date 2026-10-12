#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["encode-row"].input;
export const outputSchema = contracts["encode-row"].output;
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../../../../src/index.mjs";
import { row } from "./admit-row.mjs";
export function encode(value) {
  return canonicalJson(row(value));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(encode(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
