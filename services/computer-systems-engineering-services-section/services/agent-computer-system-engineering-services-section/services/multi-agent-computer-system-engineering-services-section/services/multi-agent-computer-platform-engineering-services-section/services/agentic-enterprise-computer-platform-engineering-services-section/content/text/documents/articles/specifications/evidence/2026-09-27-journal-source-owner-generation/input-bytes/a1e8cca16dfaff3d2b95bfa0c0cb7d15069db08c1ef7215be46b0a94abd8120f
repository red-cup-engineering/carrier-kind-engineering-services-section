#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { parseJsonValue as parse } from "../../../scripts/parse-json-value.mjs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.parseLines.input;
export const outputSchema = contracts.parseLines.output;
export function parseLines(content) {
  const values = [];
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "") continue;
    try {
      values.push(parse(line));
    } catch (error) {
      throw new TypeError(
        `JSON Lines line ${index + 1}: ${error instanceof Error ? error.message : "invalid JSON"}`,
      );
    }
  }
  return values;
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(parseLines(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
