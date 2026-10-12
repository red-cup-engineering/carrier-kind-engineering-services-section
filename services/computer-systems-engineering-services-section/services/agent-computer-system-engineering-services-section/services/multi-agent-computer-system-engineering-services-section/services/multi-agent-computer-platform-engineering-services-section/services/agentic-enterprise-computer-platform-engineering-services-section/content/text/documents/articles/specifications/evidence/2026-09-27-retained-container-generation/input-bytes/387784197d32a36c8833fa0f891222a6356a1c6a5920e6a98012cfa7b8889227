#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.projectJsonlRecords.input;
export const outputSchema = contracts.projectJsonlRecords.output;
export function projectJsonlRecords({ records, keys }) {
  if (!Array.isArray(records))
    throw new TypeError("JSONL projection records must be an array");
  if (
    !Array.isArray(keys) ||
    keys.some((key) => typeof key !== "string" || key === "")
  )
    throw new TypeError("JSONL projection keys must be nonempty strings");
  return records.map((record, index) => {
    if (record === null || Array.isArray(record) || typeof record !== "object")
      throw new TypeError(`JSONL record ${index + 1} is not an object`);
    return Object.fromEntries(
      keys
        .filter((key) => Object.hasOwn(record, key))
        .map((key) => [key, record[key]]),
    );
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(projectJsonlRecords(JSON.parse(readInput(0, "utf8")))) +
      "\n",
  );
