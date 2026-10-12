#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

import { dirtinessReading, gitStatusReading, parseStatus } from "../src/git-mark.mjs";
import { readTextFile } from "../src/admission.mjs";

function parseArgs(argv) {
  const flags = new Map();
  const positionals = [];
  for (const token of argv) {
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq === -1) flags.set(token.slice(2), "");
      else flags.set(token.slice(2, eq), token.slice(eq + 1));
    } else {
      positionals.push(token);
    }
  }
  return { flags, positionals };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const chargeName = (charge) => valueOf(charge).name;

function formatStatus(record, output) {
  switch (output) {
    case "json":
      return JSON.stringify(record) + "\n";
    case "table":
      return ["status\tpath\tcharge"]
        .concat(record.entries.map((entry) => `${entry.status}\t${entry.path}\t${record.charge}`))
        .join("\n") + "\n";
    case "jsonl":
    case "": {
      const lines = record.entries.map((entry) => JSON.stringify({ ...entry, charge: record.charge }));
      return lines.join("\n") + (lines.length ? "\n" : JSON.stringify({ charge: record.charge }) + "\n");
    }
    default:
      throw new Error(`unknown --output=${output} (expected jsonl, json, or table)`);
  }
}

async function main(argv) {
  const args = parseArgs(argv);
  const output = args.flags.get("output") ?? "jsonl";
  const failOn = args.flags.get("fail-on");
  const repo = args.flags.get("repo") ?? (args.flags.has("porcelain") ? undefined : args.positionals[0]);

  let record;
  if (repo !== undefined) {
    const reading = await gitStatusReading(repo);
    record = { entries: reading.entries, charge: chargeName(reading.charge) };
  } else {
    const porcelainPath = args.flags.get("porcelain");
    const text = porcelainPath !== undefined && porcelainPath !== ""
      ? await readTextFile(porcelainPath)
      : await readStdin();
    const entries = parseStatus(text);
    record = { entries, charge: chargeName(dirtinessReading(entries)) };
  }

  process.stdout.write(formatStatus(record, output));
  return failOn === "dirty" && record.entries.length > 0 ? 1 : 0;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`git-status: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
