#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/parse-json.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { canonicalJson } from "./canonical-json.mjs";

export function parseJson(request) {
  if (typeof request?.text !== "string")
    throw new TypeError("text must be a string");
  try {
    return { ok: true, value: JSON.parse(request.text) };
  } catch (error) {
    const match = /position (\d+)/u.exec(error.message);
    return {
      ok: false,
      error: {
        message: error.message,
        position: match ? Number(match[1]) : null,
      },
    };
  }
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(parseJson(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
