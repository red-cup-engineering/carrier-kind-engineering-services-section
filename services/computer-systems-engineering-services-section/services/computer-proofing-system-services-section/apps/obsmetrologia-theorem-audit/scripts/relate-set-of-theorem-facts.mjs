#!/usr/bin/env node
/**
 * Effect: run one relate query -- a conjunction of --attribute/--value
 * pairs -- against the admitted theorem-facts trace and print the
 * matching theorem names. Worked example: --attribute regime-mode
 * --value hypothesized --attribute module --value KineticTheory.
 * @module relate-set-of-theorem-facts
 */
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readEavtTrace, relateEavtRows } from "@red-cup-engineering/eavt-services-section";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { argument, repeatedArgument } from "@red-cup-engineering/javascript-node-services-section/argv";
import { nameOfEntity } from "../src/census-admission.mjs";

const DEFAULT_TRACE_PATH = projectFileUrlFilepath(
  new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/state/obsmetrologia-theorem-fact-state/2026-09-04-obsmetrologia-theorem-facts.eavt", import.meta.url).href,
);

/**
 * Parse argv into repeatable --attribute/--value pairs plus an optional --trace override.
 * Each value is JSON-parsed when possible (so "3" and "true" become number/boolean),
 * falling back to the raw string (so "hypothesized" stays a string).
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{tracePath: string|undefined, pairs: Array<{attribute: string, value: *}>}}
 * @throws {Error} If an --attribute is missing its paired --value, or vice versa.
 */
export function parseArgv(argv) {
  const tracePath = argument("--trace", argv);
  const attributes = repeatedArgument("--attribute", argv);
  const values = repeatedArgument("--value", argv);
  if (attributes.length !== values.length) {
    throw new Error(attributes.length > values.length
      ? `relate-set-of-theorem-facts: --attribute "${attributes[attributes.length - 1]}" missing its --value`
      : "relate-set-of-theorem-facts: --value given with no preceding --attribute");
  }
  const pairs = attributes.map((attribute, index) => {
    const raw = values[index];
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    return { attribute, value };
  });
  return { tracePath, pairs };
}

/**
 * The theorem entity addresses matching every {attribute,value} pair (AND), via eavt's relate.
 * @param {object[]} rows
 * @param {Array<{attribute: string, value: *}>} pairs
 * @returns {string[]} Matching entity addresses, sorted.
 * @throws {Error} If `pairs` is empty.
 */
export function relateConjunction(rows, pairs) {
  if (pairs.length === 0) throw new Error("relate-set-of-theorem-facts: at least one --attribute/--value pair is required");
  let matches = new Set(relateEavtRows({ rows, predicate: pairs[0].attribute, object: pairs[0].value }).subjects);
  for (const { attribute, value } of pairs.slice(1)) {
    const next = new Set(relateEavtRows({ rows, predicate: attribute, object: value }).subjects);
    matches = new Set([...matches].filter((address) => next.has(address)));
  }
  return [...matches].sort();
}

function main() {
  const { tracePath: argvTracePath, pairs } = parseArgv(process.argv.slice(2));
  const tracePath = argvTracePath ?? DEFAULT_TRACE_PATH;
  const { rows } = readEavtTrace({ path: tracePath });
  const addresses = relateConjunction(rows, pairs);
  const theorems = addresses.map((address) => nameOfEntity(rows, address)).sort();
  process.stdout.write(`${JSON.stringify({ pairs, count: theorems.length, theorems }, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
