#!/usr/bin/env node
// FOAM locus: model / llm / openai / codex / native-work-product-transition-projection.
import { readFileSync } from "node:fs";
import { executeA2aMessage } from "../src/a2a-executor.mjs";
try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
