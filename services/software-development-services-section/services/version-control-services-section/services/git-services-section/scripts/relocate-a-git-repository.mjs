#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGitmodules } from "../services/gitmodules-file-codec-service/src/gitmodules.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const managedGit = process.env.GIT_SERVICES_BIN ?? resolve(scriptDirectory, "git-services");
const usage = `Usage: relocate-a-git-repository.mjs \\
  --source-repository <worktree> --source-path <submodule-path> \\
  --destination-repository <worktree> --destination-path <submodule-path> [--apply]

Moves one registered Git submodule between two parent worktrees. By default it
prints a JSON plan. --apply stages the source removal and destination addition;
it never commits or pushes.`;

const options = readOptions(process.argv.slice(2));
if (options.help) {
  console.log(usage);
  process.exit(0);
}
for (const key of ["source-repository", "source-path", "destination-repository", "destination-path"]) {
  if (typeof options[key] !== "string") fail(`missing --${key}\n${usage}`);
}
const sourceRepository = resolve(options["source-repository"]);
const destinationRepository = resolve(options["destination-repository"]);
const sourcePath = repositoryPath(options["source-path"], "source-path");
const destinationPath = repositoryPath(options["destination-path"], "destination-path");
assertWorktree(sourceRepository, "source-repository");
assertWorktree(destinationRepository, "destination-repository");
assertClean(sourceRepository);
if (sourceRepository !== destinationRepository) assertClean(destinationRepository);

const sourceEntries = gitmodules(sourceRepository);
const sourceEntry = sourceEntries.find((entry) => entry.path === sourcePath);
if (sourceEntry === undefined) fail(`source path is not declared in ${sourceRepository}/.gitmodules: ${sourcePath}`);
const pin = gitlink(sourceRepository, sourcePath);
if (pin === undefined) fail(`source path is not a staged Git submodule: ${sourcePath}`);
if (gitmodules(destinationRepository).some((entry) => entry.path === destinationPath)) {
  fail(`destination path is already declared in ${destinationRepository}/.gitmodules: ${destinationPath}`);
}
if (existsSync(resolve(destinationRepository, destinationPath))) {
  fail(`destination path already exists: ${resolve(destinationRepository, destinationPath)}`);
}

const commands = [
  { cwd: sourceRepository, argv: ["submodule", "deinit", "-f", "--", sourcePath] },
  { cwd: sourceRepository, argv: ["rm", "-f", "--", sourcePath] },
  { cwd: destinationRepository, argv: ["submodule", "add", "--force", sourceEntry.url, destinationPath] },
  { cwd: resolve(destinationRepository, destinationPath), argv: ["checkout", "--detach", pin] },
  { cwd: destinationRepository, argv: ["add", "--", ".gitmodules", destinationPath] },
];
const plan = {
  action: "relocate-git-repository",
  apply: options.apply === true,
  source: { repository: sourceRepository, path: sourcePath, url: sourceEntry.url, pin },
  destination: { repository: destinationRepository, path: destinationPath },
  commands,
};
if (!options.apply) {
  console.log(JSON.stringify(plan));
  process.exit(0);
}
for (const command of commands) run(command.cwd, command.argv);
const destinationPin = gitlink(destinationRepository, destinationPath);
if (destinationPin !== pin) fail(`destination pin verification failed: expected ${pin}, got ${destinationPin ?? "none"}`);
if (gitmodules(sourceRepository).some((entry) => entry.path === sourcePath)) fail(`source .gitmodules still declares ${sourcePath}`);
console.log(JSON.stringify({ ...plan, completed: true }));

function readOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--help") options[argument.slice(2)] = true;
    else if (["--source-repository", "--source-path", "--destination-repository", "--destination-path"].includes(argument)) options[argument.slice(2)] = argv[++index];
    else fail(`unknown option: ${argument}\n${usage}`);
  }
  return options;
}

function repositoryPath(value, label) {
  if (value.length === 0 || value.startsWith("/") || value.split(/[\\/]+/u).includes("..")) fail(`${label} must be a non-empty repository-relative path`);
  return value.split(sep).join("/").replace(/^\.\//u, "");
}

function assertWorktree(path, label) {
  if (run(path, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") fail(`${label} is not a Git worktree: ${path}`);
}

function assertClean(path) {
  if (run(path, ["status", "--porcelain=v1", "--untracked-files=no"]).trim() !== "") fail(`refusing to modify a parent worktree with tracked changes: ${path}`);
}

function gitmodules(path) {
  const modules = resolve(path, ".gitmodules");
  return existsSync(modules) ? parseGitmodules(readFileSync(modules, "utf8")) : [];
}

function gitlink(path, submodulePath) {
  const line = run(path, ["ls-files", "--stage", "--", submodulePath]).trim();
  const match = /^160000\s+([0-9a-f]{40,64})\s+\d+\t/u.exec(line);
  return match?.[1];
}

function run(cwd, argv) {
  try {
    return execFileSync(managedGit, argv, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = String(error.stderr ?? error.message).trim();
    fail(`git command failed in ${cwd}: ${argv.join(" ")}\n${detail}`);
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(64);
}
