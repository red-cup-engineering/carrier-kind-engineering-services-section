#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSchema, schemaCorpus, validateInstance } from "../dist/index.mjs";

const argument = (flag) => {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
};
const emit = (value, code = 0) => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(code);
};
const refuse = (message) => emit({ ok: false, error: message }, 1);
const findUp = (from, shape) => {
  let directory = resolve(from);
  for (;;) {
    const candidate = join(directory, shape);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
};

const here = dirname(fileURLToPath(import.meta.url));
const from = argument("--from") ?? process.cwd();
const poolPath = argument("--pool") ?? findUp(from, "lib/schemas") ?? findUp(here, "lib/schemas");
if (!poolPath) refuse(`⊥ no schema pool at or above ${from}; pass --pool or --from`);

const byName = new Map();
const schemas = [];
for (const entry of readdirSync(poolPath)) {
  if (!entry.endsWith(".schema.json")) continue;
  const path = join(poolPath, entry);
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { refuse(`${entry} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
  let receipt;
  try { receipt = createSchema(parsed, undefined, { allowUnknownAnnotations: true }); }
  catch (error) { refuse(`${entry} is not an admitted schema: ${error instanceof Error ? error.message : String(error)}`); }
  const record = { path, schema: receipt.schema };
  const name = entry.replace(/\.schema\.json$/u, "");
  if (byName.has(name) || byName.has(receipt.schema.$id)) refuse(`duplicate schema address in pool: ${name}`);
  byName.set(name, record);
  byName.set(receipt.schema.$id, record);
  schemas.push(receipt.schema);
}

if (process.argv.includes("--list")) {
  const unique = [...new Map([...byName.entries()].filter(([name]) => !name.includes("/")).map(([, value]) => [value.path, value])).values()];
  emit({ ok: true, schemas: unique.map(({ path, schema }) => ({ name: path.split("/").at(-1).replace(/\.schema\.json$/u, ""), $id: schema.$id, path: relative(from, path) })) });
}

const named = process.argv[2];
if (!named || named.startsWith("--")) refuse("name a schema by filename stem or $id");
const found = byName.get(named);
if (!found) refuse(`no schema ${JSON.stringify(named)} in pool`);
if (process.argv.includes("--show")) emit({ ok: true, $id: found.schema.$id, schema: found.schema });

const input = readFileSync(0, "utf8").trim();
if (!input) refuse("no JSON instance on stdin");
let instance;
try { instance = JSON.parse(input); }
catch (error) { refuse(`stdin is not JSON: ${error instanceof Error ? error.message : String(error)}`); }
const result = validateInstance(instance, found.schema, schemaCorpus(schemas));
emit({ ok: result.ok, schema: found.schema.$id, errors: result.errors }, result.ok ? 0 : 1);
