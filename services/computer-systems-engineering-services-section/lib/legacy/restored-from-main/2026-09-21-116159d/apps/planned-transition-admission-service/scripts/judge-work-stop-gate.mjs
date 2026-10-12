#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { judgeWorkStopGate } from "../src/work-snapshot.mjs";
export const judgeStopGate = (document) => judgeWorkStopGate(document.snapshot, document);
if (import.meta.main) {
  const result = judgeStopGate(JSON.parse(readFileSync(0, "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.passed) process.exitCode = 1;
}
