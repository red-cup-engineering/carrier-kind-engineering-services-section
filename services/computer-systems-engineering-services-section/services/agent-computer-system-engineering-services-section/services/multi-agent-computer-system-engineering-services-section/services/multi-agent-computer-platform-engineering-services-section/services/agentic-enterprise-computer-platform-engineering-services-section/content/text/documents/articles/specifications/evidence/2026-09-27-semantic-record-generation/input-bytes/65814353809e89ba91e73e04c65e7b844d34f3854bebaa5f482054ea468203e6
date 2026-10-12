#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readFileSync } from "node:fs";
import { normalizeEavtRow } from "@red-cup-engineering/eavt-services-section/normalize-row";
import { seavtRow } from "./admit-seavt-row.mjs";
export const inputSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        e: { type: "array" },
        a: { type: "array" },
        v: { type: "array" },
        t: {},
      },
      required: ["e", "a", "v", "t"],
      additionalProperties: false,
    },
    { type: "array", minItems: 4, maxItems: 4 },
  ],
};
export const outputSchema = {
  type: "object",
  properties: {
    e: { type: "array" },
    a: { type: "array" },
    v: { type: "array" },
    t: {},
  },
  required: ["e", "a", "v", "t"],
  additionalProperties: false,
};
export function normalizeSeavtRow(value) {
  return seavtRow(normalizeEavtRow(value));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(normalizeSeavtRow(JSON.parse(readCarrierInput(0, "utf8")))) +
      "\n",
  );
