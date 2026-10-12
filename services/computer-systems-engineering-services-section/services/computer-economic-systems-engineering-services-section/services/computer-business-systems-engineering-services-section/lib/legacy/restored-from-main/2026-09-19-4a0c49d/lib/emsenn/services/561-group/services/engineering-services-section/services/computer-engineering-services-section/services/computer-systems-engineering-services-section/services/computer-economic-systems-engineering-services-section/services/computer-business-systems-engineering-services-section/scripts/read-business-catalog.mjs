#!/usr/bin/env node
import { parseArgs } from "node:util";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { readBusinessCatalog, readBusinessCatalogSources } from "../src/read-business-catalog.mjs";

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    root: { type: "string", default: process.cwd() },
    sources: { type: "boolean", default: false },
    query: { type: "string" }, kind: { type: "string" },
    "account-prefix": { type: "string" },
    offset: { type: "string" }, limit: { type: "string" },
  } });
  const options = { root: values.root };
  for (const key of ["offset", "limit"]) if (values[key] !== undefined) options[key] = Number(values[key]);
  Object.assign(options, { query: values.query, kind: values.kind, accountPrefix: values["account-prefix"] });
  return values.sources ? readBusinessCatalogSources(options) : readBusinessCatalog(options);
}

await runMain(async () => process.stdout.write(`${JSON.stringify(await main())}\n`), {
  moduleUrl: import.meta.url, exitCode: 1,
  formatError: error => `${error.message}\n`,
});
