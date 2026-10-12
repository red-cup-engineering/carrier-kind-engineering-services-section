#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitWorkUpdate } from "../src/work-events.mjs";
export const updateWork = (document) => admitWorkUpdate(document.snapshot, document, { at: document.at });
if (import.meta.main) process.stdout.write(`${JSON.stringify(updateWork(JSON.parse(readFileSync(0, "utf8"))))}\n`);
