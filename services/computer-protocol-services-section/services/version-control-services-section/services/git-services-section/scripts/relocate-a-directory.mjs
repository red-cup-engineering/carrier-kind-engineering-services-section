#!/usr/bin/env node
import { lstat, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const usage = `Usage: relocate-a-directory.mjs --source <directory> --destination <directory> [--apply]

Prints a JSON plan by default.  --apply performs one filesystem rename.  The
destination must not exist; this command never merges or overwrites trees.`;

const options = readOptions(process.argv.slice(2));
if (options.help) {
  console.log(usage);
  process.exit(0);
}
if (typeof options.source !== "string" || typeof options.destination !== "string") fail(usage);
const source = resolve(options.source);
const destination = resolve(options.destination);
if (source === destination) fail("source and destination are the same directory");
await assertDirectory(source, "source");
await assertMissing(destination, "destination");

const plan = { action: "relocate-directory", source, destination, apply: options.apply === true };
if (!options.apply) {
  console.log(JSON.stringify(plan));
  process.exit(0);
}
await mkdir(dirname(destination), { recursive: true });
try {
  await rename(source, destination);
} catch (error) {
  if (error?.code === "EXDEV") fail("source and destination are on different filesystems; refusing a non-atomic copy/delete move");
  throw error;
}
console.log(JSON.stringify({ ...plan, completed: true }));

function readOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--help") options[argument.slice(2)] = true;
    else if (argument === "--source" || argument === "--destination") options[argument.slice(2)] = argv[++index];
    else fail(`unknown option: ${argument}\n${usage}`);
  }
  return options;
}

async function assertDirectory(path, label) {
  let stat;
  try { stat = await lstat(path); } catch { fail(`${label} does not exist: ${path}`); }
  if (!stat.isDirectory()) fail(`${label} is not a directory: ${path}`);
}

async function assertMissing(path, label) {
  try { await lstat(path); } catch { return; }
  fail(`${label} already exists: ${path}`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(64);
}
