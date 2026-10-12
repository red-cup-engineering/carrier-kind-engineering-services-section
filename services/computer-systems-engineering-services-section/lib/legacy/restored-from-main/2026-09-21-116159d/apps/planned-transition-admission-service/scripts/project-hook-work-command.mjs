#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { projectHookWorkCommand } from "../src/hook-work-command.mjs";
export { projectHookWorkCommand };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(projectHookWorkCommand(input.hook, input.snapshot, input.options))}\n`); }
