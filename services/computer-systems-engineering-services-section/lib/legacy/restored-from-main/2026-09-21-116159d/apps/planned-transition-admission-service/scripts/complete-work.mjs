#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitWorkCompletion } from "../src/work-events.mjs";
export const completeWork = (document) => admitWorkCompletion(document.snapshot, document, { at: document.at });
if (import.meta.main) process.stdout.write(`${JSON.stringify(completeWork(JSON.parse(readFileSync(0, "utf8"))))}\n`);
