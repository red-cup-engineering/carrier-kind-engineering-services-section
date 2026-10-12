#!/usr/bin/env node

import { createInterface } from "node:readline";

import { parseLeaderMessage } from "../src/parse-leader-message.js";

// A corpus projection is evidence transport, not a license to materialize an
// unbounded parser object graph.  The source row is always retained; an
// oversized derived reading is an explicit refusal until the shared
// content-addressed chunk carrier owns it.
const MAX_CANDIDATE_READING_BYTES = 2 * 1024 * 1024;

function refusal(source, message) {
  return Object.freeze({
    kind: "lenticule-science.message-candidate-reading-refusal/v1",
    source,
    refusal: Object.freeze({ kind: "message-reading-refusal", message }),
  });
}

function sourceOf(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("each NDJSON value must be an object");
  }
  if (typeof value.text !== "string" || value.text.trim().length === 0) {
    throw new TypeError("each message needs nonempty string text");
  }
  return value;
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (line.trim().length === 0) continue;
  let source;
  try {
    source = sourceOf(JSON.parse(line));
  } catch (error) {
    process.stdout.write(`${JSON.stringify(refusal(Object.freeze({ line }), error instanceof Error ? error.message : String(error)))}\n`);
    continue;
  }
  try {
    const candidate = Object.freeze({
      kind: "lenticule-science.message-candidate-reading/v1",
      source,
      reading: parseLeaderMessage(source.text),
    });
    const encoded = JSON.stringify(candidate);
    const bytes = Buffer.byteLength(encoded);
    if (bytes > MAX_CANDIDATE_READING_BYTES) {
      process.stdout.write(`${JSON.stringify(refusal(source, `candidate reading requires ${bytes} bytes; maximum carrier size is ${MAX_CANDIDATE_READING_BYTES} bytes pending content-addressed chunk admission`))}\n`);
      continue;
    }
    process.stdout.write(`${encoded}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(refusal(source, error instanceof Error ? error.message : String(error)))}\n`);
  }
}
