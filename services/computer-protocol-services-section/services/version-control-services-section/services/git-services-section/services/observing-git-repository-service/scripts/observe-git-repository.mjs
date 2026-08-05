#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultGit = resolve(scriptDirectory, "../../../scripts/git-services");

export function observeGitRepository({ repository = process.cwd(), gitBin = process.env.GIT_SERVICES_BIN ?? defaultGit } = {}) {
  const cwd = resolve(repository);
  const root = runGit(gitBin, cwd, ["rev-parse", "--show-toplevel"]).stdout.trim();
  const branchResult = runGit(gitBin, cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"], { allowFailure: true });
  const headResult = runGit(gitBin, cwd, ["rev-parse", "--verify", "HEAD"], { allowFailure: true });
  const status = runGit(gitBin, cwd, ["status", "--porcelain=v1"]).stdout.replace(/\n$/u, "");
  return Object.freeze({
    root,
    branch: branchResult.status === 0 ? branchResult.stdout.trim() : null,
    head: headResult.status === 0 ? headResult.stdout.trim() : null,
    clean: status.length === 0,
    status,
  });
}

function runGit(gitBin, cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(gitBin, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${(result.stderr || result.stdout).trim()}`);
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repository") options.repository = argv[++index];
    else if (argument === "--git-bin") options.gitBin = argv[++index];
    else if (argument === "--help") options.help = true;
    else throw new TypeError(`unknown argument: ${argument}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("usage: observe-git-repository [--repository <path>] [--git-bin <path>]\n");
    return;
  }
  process.stdout.write(`${JSON.stringify(observeGitRepository(options))}\n`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
