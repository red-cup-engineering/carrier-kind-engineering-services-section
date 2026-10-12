#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitPlannedTransition } from "../src/admit-planned-transition.mjs";

export const admitPlannedTransitionScript = (input) => admitPlannedTransition(input);

if (import.meta.main) {
  const source = process.argv[2] ? readFileSync(process.argv[2], "utf8") : readFileSync(0, "utf8");
  process.stdout.write(`${JSON.stringify(admitPlannedTransitionScript(JSON.parse(source)), null, 2)}\n`);
}
