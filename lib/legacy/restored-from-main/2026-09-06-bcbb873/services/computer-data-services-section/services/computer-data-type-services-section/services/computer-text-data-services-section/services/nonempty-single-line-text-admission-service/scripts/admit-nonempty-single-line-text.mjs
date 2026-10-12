#!/usr/bin/env node
import { parseJavascriptArgv } from "@red-cup-engineering/parse-javascript-argv-service";
import { writeJavascriptNodeStandardOutputText } from "@red-cup-engineering/write-javascript-node-standard-output-text-service";

export function admitNonemptySingleLineText(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\n") || value.includes("\r")) {
    throw new TypeError("value must be one nonempty line of text");
  }
  return value;
}

if (import.meta.main) {
  const parsed = parseJavascriptArgv({ type: "JavascriptArgvParsingRequest", version: 1, argumentVector: { type: "JavascriptArgumentVector", version: 1, arguments: process.argv }, options: {}, allowPositionals: true, strict: true });
  if (parsed.positionals.length !== 1) throw new TypeError("exactly one text argument is required");
  await writeJavascriptNodeStandardOutputText({ type: "JavascriptNodeStandardOutputTextWriteRequest", version: 1, text: `${admitNonemptySingleLineText(parsed.positionals[0])}\n` }, { standardOutput: process.stdout });
}
