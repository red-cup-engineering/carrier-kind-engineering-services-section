#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { sliceFilesByType } from "../src/slice-files-by-type.mjs";

function parseArgs(argv) {
  const args = { walk: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--walk") args.walk = argv[(index += 1)];
    else throw new Error(`unrecognized argument: ${arg}`);
  }
  return args;
}

async function readInput(walkPath) {
  if (walkPath) return readFile(walkPath, "utf8");
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readInput(args.walk);
  let walk;
  try {
    walk = JSON.parse(raw);
  } catch (error) {
    throw new Error(`input is not valid JSON: ${error.message}`);
  }
  if (walk?.type !== "PosixPathWalk" || !Array.isArray(walk.files)) {
    throw new Error('input is not a PosixPathWalk record (expected {"type":"PosixPathWalk","files":[...]})');
  }
  const slice = sliceFilesByType({ files: walk.files });
  process.stdout.write(`${JSON.stringify(slice, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`slice-files-by-type: ${error.message}\n`);
  process.exitCode = 64;
}
