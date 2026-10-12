#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { requireJsonValue } from "./require-json-value.mjs";
import contract from "../schemas/admit-json-type.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function admitJsonType({
  value,
  type,
  name = "value",
  source = "JSON",
}) {
  if (
    !["object", "array", "string", "number", "boolean", "null"].includes(type)
  )
    throw new TypeError("unknown JSON type");
  const actual =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (actual !== type)
    throw new TypeError(
      `${source}: expected ${type} for ${name}, got ${actual}`,
    );
  try {
    return requireJsonValue(value);
  } catch {
    throw new TypeError(`${name}: not a JSON value`);
  }
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(admitJsonType(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
