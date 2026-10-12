#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { userSemanticJsonMessage } from "../src/semantic-json-part.mjs";

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    "object-kind": { type: "string" },
  },
});
if (!values.input || !values["object-kind"]) throw new Error("--input and --object-kind are required");
const value = JSON.parse(readFileSync(values.input, "utf8"));
process.stdout.write(`${JSON.stringify(userSemanticJsonMessage({ objectKind: values["object-kind"], value }))}\n`);
