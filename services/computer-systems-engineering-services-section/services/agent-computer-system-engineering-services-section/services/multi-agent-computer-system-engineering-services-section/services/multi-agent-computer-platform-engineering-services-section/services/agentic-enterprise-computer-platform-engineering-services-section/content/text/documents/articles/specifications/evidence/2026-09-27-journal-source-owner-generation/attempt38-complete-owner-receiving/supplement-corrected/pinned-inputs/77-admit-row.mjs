#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { isJsonValue } from "../../../../../src/index.mjs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts["admit-row"].input;
export const outputSchema = contracts["admit-row"].output;

export function eavtRow(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 4
  ) {
    throw new TypeError("EAVT row must be exactly {e,a,v,t}");
  }
  for (const key of ["e", "a", "v", "t"]) {
    if (!Object.hasOwn(value, key))
      throw new TypeError(`EAVT row field "${key}" is required`);
    if (!isJsonValue(value[key]))
      throw new TypeError(`EAVT row field "${key}" must be JSON`);
  }
  return Object.freeze({ e: value.e, a: value.a, v: value.v, t: value.t });
}
export const row = eavtRow;
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(eavtRow(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
