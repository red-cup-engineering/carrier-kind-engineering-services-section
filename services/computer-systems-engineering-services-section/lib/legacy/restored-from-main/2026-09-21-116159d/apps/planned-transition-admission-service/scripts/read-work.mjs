#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { foldWorkEvents, projectWorkSnapshot } from "../src/work-snapshot.mjs";
export const readWork = (document) => projectWorkSnapshot(foldWorkEvents(document.events, { generatedAt: document.generatedAt }), document);
if (import.meta.main) process.stdout.write(`${JSON.stringify(readWork(JSON.parse(readFileSync(0, "utf8"))))}\n`);
