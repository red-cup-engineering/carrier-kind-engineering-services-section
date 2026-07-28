#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { operatePulse } from "../src/service.mjs";
process.stdout.write(`${JSON.stringify(await operatePulse(JSON.parse(readFileSync(0, "utf8"))), null, 2)}\n`);
