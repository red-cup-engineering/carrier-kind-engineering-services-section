#!/usr/bin/env node
export const inputSchema = {
  oneOf: [
    {
      type: "object",
      required: ["e", "a", "v", "t"],
      properties: { e: {}, a: {}, v: {}, t: {} },
      additionalProperties: false,
    },
    { type: "array", minItems: 4, maxItems: 4 },
  ],
};
export const outputSchema = {
  type: "object",
  required: ["e", "a", "v", "t"],
  properties: { e: {}, a: {}, v: {}, t: {} },
  additionalProperties: false,
};
import { readFileSync } from "node:fs";
import { eavtRow } from "./admit-row.mjs";

export function normalizeEavtRow(value) {
  if (Array.isArray(value)) {
    if (value.length !== 4)
      throw new TypeError("EAVT tuple must contain exactly four values");
    return eavtRow({ e: value[0], a: value[1], v: value[2], t: value[3] });
  }
  return eavtRow(value);
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(normalizeEavtRow(JSON.parse(readFileSync(0, "utf8")))) +
      "\n",
  );
