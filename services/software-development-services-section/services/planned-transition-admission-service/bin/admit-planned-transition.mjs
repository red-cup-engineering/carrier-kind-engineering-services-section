#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitPlannedTransition } from "../src/admit-planned-transition.mjs";

const source = process.argv[2] ? readFileSync(process.argv[2], "utf8") : readFileSync(0, "utf8");
process.stdout.write(`${JSON.stringify(admitPlannedTransition(JSON.parse(source)), null, 2)}\n`);
