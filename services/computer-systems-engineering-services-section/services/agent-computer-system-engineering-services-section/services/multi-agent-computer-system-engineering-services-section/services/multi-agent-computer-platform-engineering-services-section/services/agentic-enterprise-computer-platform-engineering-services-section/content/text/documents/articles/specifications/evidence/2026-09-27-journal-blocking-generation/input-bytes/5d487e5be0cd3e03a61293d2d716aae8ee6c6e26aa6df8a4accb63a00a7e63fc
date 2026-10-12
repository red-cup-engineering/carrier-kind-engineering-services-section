#!/usr/bin/env node
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["identify-row"].input;
export const outputSchema = contracts["identify-row"].output;
import { readFileSync } from "node:fs";
import { encode } from "./encode-row.mjs";
export function identify(value) {
  return encode(value);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(identify(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
