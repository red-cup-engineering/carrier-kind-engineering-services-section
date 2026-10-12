#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { foldGoalEvents, projectGoalSnapshot } from "../src/goal-snapshot.mjs";
export { foldGoalEvents, projectGoalSnapshot };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(projectGoalSnapshot(foldGoalEvents(input.events, { generatedAt: input.generatedAt }), input))}\n`); }
