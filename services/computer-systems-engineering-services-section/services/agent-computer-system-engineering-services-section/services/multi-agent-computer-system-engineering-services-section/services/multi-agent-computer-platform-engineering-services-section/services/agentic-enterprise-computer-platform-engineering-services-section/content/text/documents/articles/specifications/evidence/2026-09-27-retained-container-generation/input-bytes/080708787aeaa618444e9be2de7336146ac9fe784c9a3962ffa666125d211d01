#!/usr/bin/env node
import { readFileSync } from "node:fs";
import contract from "../schemas/is-object-record.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function isObjectRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isObjectRecord(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
