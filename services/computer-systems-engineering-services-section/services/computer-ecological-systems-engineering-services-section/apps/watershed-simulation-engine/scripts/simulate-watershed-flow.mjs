#!/usr/bin/env node
import process from "node:process";
import { simulateWatershedFlow } from "../src/simulate-watershed-flow.mjs";

let input = "";
for await (const chunk of process.stdin) input += chunk;
try {
  process.stdout.write(`${JSON.stringify(simulateWatershedFlow(JSON.parse(input)), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`watershed-simulation-engine: ${error.message}\n`);
  process.exitCode = 1;
}
