#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const relocation = resolve(scriptDirectory, "relocate-a-git-repository.mjs");
const usage = `Usage: retire-a-git-repository-to-legacy.mjs \\
  --source-repository <worktree> --source-path <submodule-path> \\
  --legacy-repository <worktree> --date YYYY-MM-DD --name <name> [--apply]

Moves a submodule into a supplied legacy repository as <date>-<name>. The
legacy repository must already exist; this command never creates remotes.`;
const options = readOptions(process.argv.slice(2));
if (options.help) {
  console.log(usage);
  process.exit(0);
}
for (const key of ["source-repository", "source-path", "legacy-repository", "date", "name"]) {
  if (typeof options[key] !== "string") fail(`missing --${key}\n${usage}`);
}
if (!/^\d{4}-\d{2}-\d{2}$/u.test(options.date)) fail("--date must be YYYY-MM-DD");
if (!/^[a-z0-9][a-z0-9-]*$/u.test(options.name)) fail("--name must be lowercase letters, digits, and hyphens");
const argv = [relocation,
  "--source-repository", options["source-repository"],
  "--source-path", options["source-path"],
  "--destination-repository", options["legacy-repository"],
  "--destination-path", `${options.date}-${options.name}`,
  ...(options.apply ? ["--apply"] : []),
];
const result = spawnSync(process.execPath, argv, { encoding: "utf8", env: process.env });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);

function readOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--help") options[argument.slice(2)] = true;
    else if (["--source-repository", "--source-path", "--legacy-repository", "--date", "--name"].includes(argument)) options[argument.slice(2)] = argv[++index];
    else fail(`unknown option: ${argument}\n${usage}`);
  }
  return options;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(64);
}
