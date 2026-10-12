#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/form-cloudevent.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { canonicalJson } from "./canonical-json.mjs";

const optionalAttributes = ["time", "datacontenttype", "dataschema", "subject"];

export function formCloudEvent(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request))
    throw new TypeError("request is required");
  for (const name of ["id", "source", "type"])
    if (typeof request[name] !== "string" || request[name].length === 0)
      throw new TypeError(`${name} is required`);
  if (request.specversion !== undefined && request.specversion !== "1.0")
    throw new TypeError("specversion must be 1.0");
  const event = {
    specversion: "1.0",
    id: request.id,
    source: request.source,
    type: request.type,
  };
  for (const name of optionalAttributes)
    if (request[name] !== undefined) event[name] = request[name];
  if (request.data !== undefined) event.data = request.data;
  const extensions = request.extensions ?? {};
  if (
    extensions === null ||
    typeof extensions !== "object" ||
    Array.isArray(extensions)
  )
    throw new TypeError("extensions must be an object");
  return Object.assign(event, extensions);
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(formCloudEvent(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
