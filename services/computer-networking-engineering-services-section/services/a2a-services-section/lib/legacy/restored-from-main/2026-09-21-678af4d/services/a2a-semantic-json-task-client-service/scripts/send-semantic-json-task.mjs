#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { sendSemanticJsonTask } from "../src/send-semantic-json-task.mjs";

const { values } = parseArgs({
  options: {
    agent: { type: "string" },
    input: { type: "string" },
    "object-kind": { type: "string" },
    "result-object-kind": { type: "string" },
  },
});
if (!values.agent || !values.input || !values["object-kind"]) throw new Error("--agent, --input, and --object-kind are required");
const result = await sendSemanticJsonTask({
  agentUrl: values.agent,
  objectKind: values["object-kind"],
  resultObjectKind: values["result-object-kind"],
  value: JSON.parse(readFileSync(values.input, "utf8")),
});
process.stdout.write(`${JSON.stringify({ value: result.value, inputToken: result.inputToken, outputToken: result.outputToken })}\n`);
