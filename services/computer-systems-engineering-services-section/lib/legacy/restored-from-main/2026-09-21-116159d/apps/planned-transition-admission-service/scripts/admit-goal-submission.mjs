#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitGoalSubmission } from "../src/goal-events.mjs";
export { admitGoalSubmission };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(admitGoalSubmission(input, { at: input.at }))}\n`); }
