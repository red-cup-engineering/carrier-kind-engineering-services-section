/** Install operation families named by one MetroPlat instance, beside FERN-bound operations. */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { operationSourcesFromFern, fernCatalogOptionsFrom } from "./fern-catalog.mjs";

const SPECIFIER = /^@[^/]+\/[^/]+(?:\/[A-Za-z0-9._-]+)*$/u;
const EXPORT = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

export async function operationSourcesFromInstance(instancePath, binding) {
  const instance = JSON.parse(await readFile(instancePath, "utf8"));
  if (instance?.version !== 1 || !Array.isArray(instance.operationSources)) {
    throw new TypeError("MetroPlat instance must declare version 1 operationSources");
  }
  const require = createRequire(instancePath);
  const sources = [];
  const modules = new Set();
  for (const entry of instance.operationSources) {
    if (typeof entry?.module !== "string" || !SPECIFIER.test(entry.module)
      || typeof entry.export !== "string" || !EXPORT.test(entry.export)
      || modules.has(entry.module)) {
      throw new TypeError("MetroPlat instance operation source must name one unique installed package export");
    }
    modules.add(entry.module);
    const imported = await import(pathToFileURL(require.resolve(entry.module)).href);
    const factory = imported[entry.export];
    if (typeof factory !== "function") throw new TypeError(`${entry.module} does not export ${entry.export}`);
    const operations = factory(binding);
    if (!Array.isArray(operations) || operations.some((operation) => typeof operation?.verb !== "string" || typeof operation.execute !== "function")) {
      throw new TypeError(`${entry.module} did not provide an operation family`);
    }
    sources.push(Object.freeze({ module: entry.module, operations: Object.freeze([...operations]) }));
  }
  return Object.freeze(sources);
}

/** All installed sources enter the same witnessed catalog on CLI, HTTP and MCP. */
export async function operationSourcesFromProcessOptions(options, binding) {
  const fern = fernCatalogOptionsFrom(options);
  const [bound, installed] = await Promise.all([
    fern === undefined ? [] : operationSourcesFromFern(fern),
    options.instance === undefined ? [] : operationSourcesFromInstance(options.instance, binding),
  ]);
  return Object.freeze([...bound, ...installed]);
}
