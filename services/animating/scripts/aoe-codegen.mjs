#!/usr/bin/env node
import { resolve } from "node:path";
import { generateSemanticCarriersWork } from "../src/becoming/doing/working/software-change/semantic-carrier-generation.mjs";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new TypeError(`${name} needs a value`);
  return args[index + 1];
}
const receipt = await generateSemanticCarriersWork({
  specificationsDir: resolve(flag("--specifications", "specifications")),
  outFile: resolve(flag("--out", "src/generated/semantic-carriers.mjs")),
  schemaTypeImport: flag("--schema-type-import", "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type"),
  actor: flag("--actor", process.env.USER ?? "local-operator"),
  journalPath: flag("--journal"),
  write: args.includes("--write"), check: args.includes("--check"),
});
process.stdout.write(JSON.stringify(receipt) + "\n");
