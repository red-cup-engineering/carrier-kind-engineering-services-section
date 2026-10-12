#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serializeLines } from "./serialize-jsonl.mjs";
import contracts from "../schemas/operations.json" with { type: "json" };
export const inputSchema = contracts.appendJsonl.input;
export const outputSchema = contracts.appendJsonl.output;
export function appendJsonl({ path, records }) {
  if (typeof path !== "string" || path === "" || !Array.isArray(records))
    throw new TypeError(
      "appendJsonl input must be { path: string, records: array }",
    );
  const text = serializeLines(records);
  if (text === "") return { path, records: 0, bytes: 0 };
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, text, "utf8");
  return { path, records: records.length, bytes: Buffer.byteLength(text) };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(appendJsonl(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
