#!/usr/bin/env node
import { readFileSync as readInput } from "node:fs";
import contract from "../schemas/validate-cloudevent.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
import { canonicalJson } from "./canonical-json.mjs";
import { isJsonRecord } from "./is-json-record.mjs";

const contextAttributes = new Set([
  "specversion",
  "id",
  "source",
  "type",
  "datacontenttype",
  "dataschema",
  "subject",
  "time",
  "data",
  "data_base64",
]);
const extensionName = /^[a-z0-9]{1,20}$/u;
const rfc3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

export function validateCloudEvent(request) {
  const event = request?.event;
  if (!isJsonRecord(event)) throw new TypeError("event is required");
  const violations = [];
  for (const name of ["id", "source", "specversion", "type"]) {
    if (typeof event[name] !== "string" || event[name].length === 0)
      violations.push({
        kind: "instance",
        path: "",
        keyword: "required",
        message: `must have required property '${name}'`,
      });
  }
  if (event.specversion !== undefined && event.specversion !== "1.0")
    violations.push({
      kind: "instance",
      path: "/specversion",
      keyword: "const",
      message: "must be exactly 1.0",
    });
  if (
    event.time !== undefined &&
    (typeof event.time !== "string" || !rfc3339.test(event.time))
  )
    violations.push({
      kind: "instance",
      path: "/time",
      keyword: "format",
      message: "must match format date-time",
    });
  if (event.data !== undefined && event.data_base64 !== undefined)
    violations.push({
      kind: "instance",
      path: "/data",
      keyword: "mutuallyExclusive",
      message: "data and data_base64 must not both be present",
    });
  for (const name of Object.keys(event))
    if (!contextAttributes.has(name) && !extensionName.test(name))
      violations.push({
        kind: "instance",
        path: `/${name}`,
        keyword: "extensionName",
        message:
          "extension attribute names are lowercase letters and digits, 1 to 20 characters",
      });
  return {
    type: "CloudEventValidation",
    ok: violations.length === 0,
    violations,
    event,
  };
}

if (import.meta.main)
  process.stdout.write(
    JSON.stringify(validateCloudEvent(JSON.parse(readInput(0, "utf8")))) + "\n",
  );
