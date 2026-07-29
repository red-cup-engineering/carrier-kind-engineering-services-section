#!/usr/bin/env node
import { resolve } from "node:path";
import { measureJsnodeCodebase } from "../src/measure-codebase.mjs";

const [root] = process.argv.slice(2);
if (root === undefined || process.argv.length !== 3) {
  process.stderr.write("usage: measure-jsnode-codebase <explicit-codebase-root>\n");
  process.exitCode = 2;
} else {
  process.stdout.write(`${JSON.stringify(measureJsnodeCodebase(resolve(root)))}\n`);
}
