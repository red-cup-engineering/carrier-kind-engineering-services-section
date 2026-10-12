#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/is-json-value.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
/** Test whether a JavaScript value is finite, acyclic JSON data. */
export function isJsonValue(value) {
  const visit = (item, ancestors) => {
    if (item === null || typeof item === "boolean" || typeof item === "string")
      return true;
    if (typeof item === "number") return Number.isFinite(item);
    if (Array.isArray(item)) {
      if (ancestors.has(item)) return false;
      ancestors.add(item);
      let valid = true;
      for (let index = 0; index < item.length; index += 1)
        if (!Object.hasOwn(item, index) || !visit(item[index], ancestors)) {
          valid = false;
          break;
        }
      ancestors.delete(item);
      return valid;
    }
    if (
      typeof item !== "object" ||
      Object.getPrototypeOf(item) !== Object.prototype ||
      ancestors.has(item)
    )
      return false;
    ancestors.add(item);
    const valid = Object.values(item).every((child) => visit(child, ancestors));
    ancestors.delete(item);
    return valid;
  };
  return visit(value, new Set());
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isJsonValue(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
