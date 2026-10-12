import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderJsonSchemaModule } from "@red-cup-engineering/javascript-node-code-fabrication-services-section/transform-json-schema-to-typescript";

// Generic generator: emits one runtime declarations module from every
// *.schema.json in a --specifications directory that carries an
// "x-codegen" block. Any destination package (metrologic, feltos,
// computer-system-engine, ...) can point this at its own specifications/
// directory and its own output file. See --schema-type-import for how the
// generated module reaches defineSchemaType (by default the data section's
// type-system/schema-type).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function flag(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}
const specificationsDir = resolve(root, flag("--specifications", "specifications"));
const outFile = resolve(root, flag("--out", "src/generated/semantic-carriers.mjs"));
const schemaTypeImport = flag("--schema-type-import", "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type");
const check = args.includes("--check");

const candidates = (await readdir(specificationsDir)).filter((name) => name.endsWith(".schema.json")).sort();
const entries = [];
for (const file of candidates) {
  const schema = JSON.parse(await readFile(resolve(specificationsDir, file), "utf8"));
  const codegen = schema["x-codegen"];
  if (!codegen) continue;
  if (typeof codegen.exportName !== "string" || typeof codegen.typeName !== "string" || typeof codegen.runtimeName !== "string") throw new TypeError(`${file} needs x-codegen names`);
  entries.push({ schema, ...codegen });
}
if (entries.length === 0) throw new Error(`no *.schema.json with an x-codegen block found in ${specificationsDir}`);

const binding = { name: "defineSchemaType", from: schemaTypeImport, genericSchema: true };
const rendered = renderJsonSchemaModule(entries, { format: "javascript", runtimeBinding: binding }) + "\n";
let current;
try { current = await readFile(outFile, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (check) { if (current !== rendered) throw new Error(`${outFile} is not generated from its specifications directory`); }
else if (current !== rendered) await writeFile(outFile, rendered);
