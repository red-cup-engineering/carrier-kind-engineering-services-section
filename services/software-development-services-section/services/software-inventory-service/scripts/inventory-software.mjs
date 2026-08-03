#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  inventorySoftware,
  softwareInventoryJson,
  validateSoftwareInventoryJson,
} from "../src/software-inventory.mjs";

const CLASSIFICATIONS = new Set(["owned-source", "off-tree-owned", "vendor", "cache", "release", "archive", "recovery", "unclassified"]);

function usage() {
  return "usage: inventory-software --root PATH --source URI --owner URN --classification KIND [--systemd-host HOST] [--format json|dot]";
}

export function parseOperatorArguments(argv) {
  const options = { format: "json" };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined || !flag?.startsWith("--")) throw new TypeError(usage());
    if (flag === "--root") options.root = value;
    else if (flag === "--source") options.source = value;
    else if (flag === "--owner") options.owner = value;
    else if (flag === "--classification") options.classification = value;
    else if (flag === "--systemd-host") options.systemdHost = value;
    else if (flag === "--systemd-source") options.systemdSource = value;
    else if (flag === "--systemd-owner") options.systemdOwner = value;
    else if (flag === "--systemd-classification") options.systemdClassification = value;
    else if (flag === "--systemd-aliases") options.systemdAliases = value.split(",").filter(Boolean);
    else if (flag === "--format") options.format = value;
    else throw new TypeError(`unknown option ${flag}\n${usage()}`);
  }
  for (const field of ["root", "source", "owner", "classification"]) if (typeof options[field] !== "string" || options[field].length === 0) throw new TypeError(usage());
  if (!CLASSIFICATIONS.has(options.classification)) throw new TypeError(`unknown classification ${options.classification}`);
  if (!["json", "dot"].includes(options.format)) throw new TypeError("format must be json or dot");
  const systemdBindingFields = [options.systemdSource, options.systemdOwner, options.systemdClassification];
  if (systemdBindingFields.some((value) => value !== undefined) && systemdBindingFields.some((value) => value === undefined)) throw new TypeError("systemd source, owner, and classification must be supplied together");
  if (options.systemdClassification !== undefined && !CLASSIFICATIONS.has(options.systemdClassification)) throw new TypeError(`unknown systemd classification ${options.systemdClassification}`);
  return Object.freeze(options);
}

function jsonCarrier(_key, value) {
  return value instanceof Uint8Array ? { base64: Buffer.from(value).toString("base64") } : value;
}

export async function runOperator(argv, io = process) {
  const options = parseOperatorArguments(argv);
  const result = await inventorySoftware({
    root: options.root,
    rootBinding: { source: options.source, owner: options.owner, classification: options.classification },
    ...(options.systemdHost === undefined ? {} : { systemdHost: options.systemdHost }),
    ...(options.systemdSource === undefined ? {} : { systemdSourceBinding: { source: options.systemdSource, owner: options.systemdOwner, classification: options.systemdClassification, aliases: options.systemdAliases ?? [] } }),
  });
  const receiver = softwareInventoryJson(result);
  const verdict = validateSoftwareInventoryJson(receiver);
  if (!verdict.ok) throw new TypeError(`software inventory output failed schema validation: ${JSON.stringify(verdict.errors)}`);
  io.stdout.write(options.format === "dot" ? result.chart.text : `${JSON.stringify(receiver, jsonCarrier, 2)}\n`);
  return result;
}

if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runOperator(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
