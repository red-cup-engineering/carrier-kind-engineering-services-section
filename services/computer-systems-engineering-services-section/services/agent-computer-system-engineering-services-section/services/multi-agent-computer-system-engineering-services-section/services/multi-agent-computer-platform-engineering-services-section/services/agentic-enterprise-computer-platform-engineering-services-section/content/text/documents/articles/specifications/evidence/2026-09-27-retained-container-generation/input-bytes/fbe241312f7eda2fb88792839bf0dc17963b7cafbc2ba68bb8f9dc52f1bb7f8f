#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitJsonType } from "./admit-json-type.mjs";
import contract from "../schemas/read-json-field.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function readJsonField({
  record,
  key,
  name = "record",
  source = "JSON",
}) {
  admitJsonType({ value: record, type: "object", name, source });
  if (typeof key !== "string") throw new TypeError("key must be a string");
  if (!Object.hasOwn(record, key))
    throw new TypeError(
      `${source}: missing field ${JSON.stringify(key)} in ${name}`,
    );
  return record[key];
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(readJsonField(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
