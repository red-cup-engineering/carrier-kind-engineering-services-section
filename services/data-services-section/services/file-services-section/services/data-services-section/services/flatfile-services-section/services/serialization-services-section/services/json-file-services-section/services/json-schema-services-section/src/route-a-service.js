#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const service = process.argv[2];
const routes = Object.freeze({
  "reading-a-schema": join(root, "bin/read-a-schema.mjs"),
  "writing-a-schema": join(root, "services/writing-a-schema/src/write-a-schema.js"),
  "search-path-for-schema": join(root, "services/search-path-for-schema/scripts/search-path-for-schema.mjs"),
});
const target = routes[service];
if (!target) {
  process.stderr.write("refused: name reading-a-schema, writing-a-schema, or search-path-for-schema\n");
  process.exit(1);
}
const result = spawnSync(process.execPath, [target, ...process.argv.slice(3)], { stdio: "inherit" });
process.exit(result.status ?? 1);
