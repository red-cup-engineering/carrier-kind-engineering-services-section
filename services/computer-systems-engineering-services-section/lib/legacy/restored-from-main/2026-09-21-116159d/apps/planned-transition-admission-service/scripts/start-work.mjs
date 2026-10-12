#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { admitWorkStart } from "../src/work-events.mjs";
export const startWork = (document) => admitWorkStart(document, { at: document.at });
if (import.meta.main) process.stdout.write(`${JSON.stringify(startWork(JSON.parse(readFileSync(0, "utf8"))))}\n`);
