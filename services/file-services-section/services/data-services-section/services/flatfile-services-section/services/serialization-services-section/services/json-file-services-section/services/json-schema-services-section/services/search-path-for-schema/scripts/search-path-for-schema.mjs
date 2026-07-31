#!/usr/bin/env node
import { searchPathForSchema } from "../src/search-path-for-schema.mjs";

const [path] = process.argv.slice(2);
if (!path || process.argv.length !== 3) {
  process.stderr.write("usage: search-path-for-schema <path>\n");
  process.exitCode = 64;
} else {
  try { process.stdout.write(`${JSON.stringify(await searchPathForSchema(path), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
