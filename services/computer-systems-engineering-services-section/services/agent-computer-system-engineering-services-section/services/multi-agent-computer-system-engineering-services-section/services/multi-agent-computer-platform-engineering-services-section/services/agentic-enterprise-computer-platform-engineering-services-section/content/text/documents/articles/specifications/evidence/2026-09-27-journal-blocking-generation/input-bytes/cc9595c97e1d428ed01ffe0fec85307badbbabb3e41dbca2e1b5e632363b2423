#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.nonBlankLines.input;
export const outputSchema = contracts.nonBlankLines.output;
export function nonBlankLines(content) {
  return content.split("\n").filter((line) => line.trim() !== "");
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(nonBlankLines(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
