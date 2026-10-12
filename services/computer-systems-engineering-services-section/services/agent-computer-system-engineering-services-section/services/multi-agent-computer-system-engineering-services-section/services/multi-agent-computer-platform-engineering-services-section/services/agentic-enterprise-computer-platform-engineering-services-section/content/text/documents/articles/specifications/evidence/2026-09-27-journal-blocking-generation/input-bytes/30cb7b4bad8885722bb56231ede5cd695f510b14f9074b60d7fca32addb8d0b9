#!/usr/bin/env node
import { readFileSync } from "node:fs";
export const inputSchema = {};
export const outputSchema = { type: "boolean" };
import { normalizeEavtRow } from "./normalize-row.mjs";
/** Test whether one value is a valid EAVT object or tuple spelling. */
export function isEavtRow(value) {
  try {
    normalizeEavtRow(value);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(isEavtRow(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
