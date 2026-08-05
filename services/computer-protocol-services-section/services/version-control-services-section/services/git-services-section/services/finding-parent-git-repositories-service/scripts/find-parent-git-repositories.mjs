#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseGitmodules } from "../../gitmodules-file-codec-service/src/gitmodules.mjs";

export function findParentGitRepositories({ path, top } = {}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path is required");
  if (typeof top !== "string" || top.length === 0) throw new TypeError("top is required");
  const absolutePath = resolve(path);
  const absoluteTop = resolve(top);
  if (!existsSync(absolutePath)) throw new Error(`path does not exist: ${absolutePath}`);
  if (!isRepository(absoluteTop)) throw new Error(`top is not a Git repository: ${absoluteTop}`);

  let directory = lstatSync(absolutePath).isDirectory() ? absolutePath : dirname(absolutePath);
  const relativeToTop = relative(absoluteTop, directory);
  if (relativeToTop === ".." || relativeToTop.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    throw new Error(`path is not beneath top: ${absolutePath}`);
  }

  const repositories = [];
  for (;;) {
    if (isRepository(directory)) repositories.push(directory);
    if (directory === absoluteTop) break;
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`could not reach top from path: ${absolutePath}`);
    directory = parent;
  }
  if (repositories.at(-1) !== absoluteTop) repositories.push(absoluteTop);

  const result = repositories.map((repository, index) => {
    const parent = repositories[index + 1] ?? null;
    if (parent === null) return Object.freeze({ repository, parent: null, submodulePath: null });
    const submodulePath = relative(parent, repository).split("\\").join("/");
    const gitmodulesPath = resolve(parent, ".gitmodules");
    if (!existsSync(gitmodulesPath)) throw new Error(`${parent} has no .gitmodules entry for ${submodulePath}`);
    const entries = parseGitmodules(readFileSync(gitmodulesPath, "utf8"));
    if (!entries.some((entry) => entry.path === submodulePath)) {
      throw new Error(`${parent}/.gitmodules does not declare ${submodulePath}`);
    }
    return Object.freeze({ repository, parent, submodulePath });
  });
  return Object.freeze(result);
}

function isRepository(path) {
  return existsSync(resolve(path, ".git"));
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--path") options.path = argv[++index];
    else if (argument === "--top") options.top = argv[++index];
    else if (argument === "--help") options.help = true;
    else throw new TypeError(`unknown argument: ${argument}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("usage: find-parent-git-repositories --path <path> --top <repository>\n");
    return;
  }
  process.stdout.write(`${JSON.stringify(findParentGitRepositories(options))}\n`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
