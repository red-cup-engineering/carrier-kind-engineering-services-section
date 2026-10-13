#!/usr/bin/env node
import { importLegacyClockkeeper } from "../src/legacy-clockkeeper-import.mjs";

function argument(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
try {
  const result = await importLegacyClockkeeper({ sourceRoot: argument("--source-root"), destinationRoot: argument("--destination-root") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
