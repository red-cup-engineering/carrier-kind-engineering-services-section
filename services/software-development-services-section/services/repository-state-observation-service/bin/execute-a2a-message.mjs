#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { executeA2aMessage } from "../src/a2a-executor.mjs";
try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(await executeA2aMessage(source))}\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
