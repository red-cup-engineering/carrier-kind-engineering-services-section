#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runProgram } from "../src/becoming/doing/working/software-change/mission/development.mjs";

async function main() {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const execution = { ...input.execution };
  if (input.receiver !== undefined) {
    if (execution.receiver !== undefined) throw new TypeError("name one receiving port");
    execution.receiver = input.receiver;
  }
  if (typeof execution.dataRoot !== "string" || !execution.dataRoot.trim()) throw new TypeError("execution.dataRoot must name caller-owned persistent custody");
  const result = await runProgram(input.mission, execution);
  process.stdout.write(`${JSON.stringify({ result })}\n`);
  if (result.outcome?.verified !== true && result.outcome?.answered !== true) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
