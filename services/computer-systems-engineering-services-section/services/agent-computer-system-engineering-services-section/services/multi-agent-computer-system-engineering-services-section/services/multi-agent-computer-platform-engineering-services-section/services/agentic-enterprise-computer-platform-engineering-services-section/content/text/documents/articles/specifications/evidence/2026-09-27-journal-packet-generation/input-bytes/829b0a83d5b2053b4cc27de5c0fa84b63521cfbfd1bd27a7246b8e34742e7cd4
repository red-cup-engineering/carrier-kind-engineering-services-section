#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/project-json-record-keys.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { freezeJson } from "./freeze-json.mjs";
import { canonicalJson } from "./canonical-json.mjs";
import { isJsonRecord } from "./is-json-record.mjs";

/** Select named own fields from a JSON object. Input: {record, keys}; output: JSON object. */
export function projectJsonRecordKeys({ record, keys } = {}) {
  if (!isJsonRecord(record))
    throw new TypeError("record must be a JSON object");
  if (
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.some((key) => typeof key !== "string" || key.length === 0)
  ) {
    throw new TypeError("keys must be a nonempty array of nonempty strings");
  }
  const projection = Object.fromEntries(
    [...new Set(keys)]
      .filter((key) => Object.hasOwn(record, key))
      .map((key) => [key, record[key]]),
  );
  return freezeJson(projection);
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(projectJsonRecordKeys(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
