#!/usr/bin/env node
const CONTEXT = new Set(["specversion", "id", "source", "type", "datacontenttype", "dataschema", "subject", "time"]);
const DATA = new Set(["data", "data_base64"]);
const EXTENSION_NAME = /^[a-z0-9]{1,20}$/u;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const MEDIA_TYPE = /^[\w.+-]+\/[\w.+-]+(?:\s*;.*)?$/u;
const nonempty = (v) => typeof v === "string" && v.length > 0;
const uriReference = (v) => nonempty(v) && !/\s/u.test(v);
const uri = (v) => { try { new URL(v); return true; } catch { return false; } };

/**
 * Validates one candidate CloudEvent against the CloudEvents 1.0 attribute rules.
 * @param {object} request A record carrying the candidate event.
 * @returns {object} A CloudEventValidation record.
 * @throws {TypeError} When the event is not an object.
 */
export function validateCloudEvent(request) {
  const event = request?.event;
  if (event === null || typeof event !== "object" || Array.isArray(event)) throw new TypeError("event is required");
  const violations = [];
  const rule = (attribute, text) => violations.push({ attribute, rule: text });
  if (event.specversion !== "1.0") rule("specversion", "must be the string 1.0");
  if (!nonempty(event.id)) rule("id", "must be a non-empty string");
  if (!uriReference(event.source)) rule("source", "must be a non-empty URI-reference");
  if (!nonempty(event.type)) rule("type", "must be a non-empty string");
  if (event.time !== undefined && !(nonempty(event.time) && RFC3339.test(event.time))) rule("time", "must be an RFC 3339 timestamp");
  if (event.datacontenttype !== undefined && !(nonempty(event.datacontenttype) && MEDIA_TYPE.test(event.datacontenttype))) rule("datacontenttype", "must be an RFC 2046 media type");
  if (event.dataschema !== undefined && !(nonempty(event.dataschema) && uri(event.dataschema))) rule("dataschema", "must be an absolute URI");
  if (event.subject !== undefined && !nonempty(event.subject)) rule("subject", "must be a non-empty string when present");
  if (event.data !== undefined && event.data_base64 !== undefined) rule("data", "data and data_base64 must not both be present");
  if (event.data_base64 !== undefined && !(nonempty(event.data_base64) && /^[A-Za-z0-9+/]+={0,2}$/u.test(event.data_base64))) rule("data_base64", "must be base64 text");
  for (const name of Object.keys(event)) {
    if (CONTEXT.has(name) || DATA.has(name)) continue;
    if (!EXTENSION_NAME.test(name)) rule(name, "extension attribute names are lowercase letters and digits, 1 to 20 characters");
    else if (event[name] !== null && typeof event[name] === "object") rule(name, "extension attribute values are strings, numbers, or booleans");
  }
  return { type: "CloudEventValidation", ok: violations.length === 0, violations, event };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("validateCloudEvent — Validates one candidate CloudEvent against the CloudEvents 1.0 attribute rules.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(validateCloudEvent(JSON.parse(line)))}\n`);
    }
  }
}
