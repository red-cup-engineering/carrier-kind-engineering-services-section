#!/usr/bin/env node
import { canonical } from "@red-cup-engineering/json-codec-service";
import { parseJavascriptArgv } from "@red-cup-engineering/parse-javascript-argv-service";
import { writeJavascriptNodeStandardOutputText } from "@red-cup-engineering/write-javascript-node-standard-output-text-service";

export function parseCommaSeparatedTextList(text) {
  if (typeof text !== "string" || text.length === 0) throw new TypeError("text must be a nonempty string");
  const values = text.split(",").map((value) => value.trim());
  if (values.some((value) => value.length === 0)) throw new TypeError("comma-separated values must be nonempty");
  return Object.freeze(values);
}

if (import.meta.main) {
  const parsed = parseJavascriptArgv({ type: "JavascriptArgvParsingRequest", version: 1, argumentVector: { type: "JavascriptArgumentVector", version: 1, arguments: process.argv }, options: {}, allowPositionals: true, strict: true });
  if (parsed.positionals.length !== 1) throw new TypeError("usage: parse-comma-separated-text-list TEXT");
  await writeJavascriptNodeStandardOutputText({ type: "JavascriptNodeStandardOutputTextWriteRequest", version: 1, text: `${canonical(parseCommaSeparatedTextList(parsed.positionals[0]))}\n` }, { standardOutput: process.stdout });
}
