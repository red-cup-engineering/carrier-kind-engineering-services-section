#!/usr/bin/env node
import { normalizePackageBody } from "../src/normalize-package-body.mjs";

const apply = process.argv.includes("--apply");
const positional = process.argv.slice(2).filter((value) => value !== "--apply");
const receipt = await normalizePackageBody({ root: positional[0] ?? process.cwd(), apply });
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
