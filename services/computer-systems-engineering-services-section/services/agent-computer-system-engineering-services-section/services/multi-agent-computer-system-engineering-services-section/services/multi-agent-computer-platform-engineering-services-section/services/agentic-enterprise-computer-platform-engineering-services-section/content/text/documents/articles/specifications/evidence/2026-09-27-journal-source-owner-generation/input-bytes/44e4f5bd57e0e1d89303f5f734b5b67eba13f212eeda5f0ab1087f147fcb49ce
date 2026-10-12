#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/freeze-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { requireJsonValue } from "./require-json-value.mjs";
/** Deep-freeze one admitted JSON value while preserving shared children. */
export function freezeJson(value) {
  requireJsonValue(value);
  const visited = new Set();
  const freeze = (child) => {
    if (child === null || typeof child !== "object" || visited.has(child))
      return child;
    visited.add(child);
    for (const nested of Object.values(child)) freeze(nested);
    return Object.freeze(child);
  };
  return freeze(value);
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(freezeJson(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
