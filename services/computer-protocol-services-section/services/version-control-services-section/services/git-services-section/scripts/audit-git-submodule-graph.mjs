#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGitmodules } from "../services/gitmodules-file-codec-service/src/gitmodules.mjs";

const git = process.env.GIT_SERVICES_BIN ?? resolve(dirname(fileURLToPath(import.meta.url)), "git-services");
const args = process.argv.slice(2);
if (args[0] === "--help" || args[0] === "-h") { console.log("Usage: audit-git-submodule-graph.mjs --repository <worktree>"); process.exit(0); }
if (args.length !== 2 || args[0] !== "--repository") fail("Usage: audit-git-submodule-graph.mjs --repository <worktree>");
const repository = resolve(args[1]);
if (run(repository, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") fail(`not a Git worktree: ${repository}`);
const declarations = existsSync(resolve(repository, ".gitmodules")) ? parseGitmodules(readFileSync(resolve(repository, ".gitmodules"), "utf8")) : [];
const gitlinks = run(repository, ["ls-files", "--stage", "-z"]).split("\0").flatMap((line) => {
  const match = /^160000\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/u.exec(line);
  return match === null ? [] : [{ path: match[2], pin: match[1] }];
}).sort((left, right) => left.path.localeCompare(right.path));
const declaredPaths = new Set(declarations.map((entry) => entry.path));
const gitlinkPaths = new Set(gitlinks.map((entry) => entry.path));
const report = {
  kind: "git-submodule-graph-audit/v1", repository,
  declarationsWithoutGitlink: declarations.filter((entry) => !gitlinkPaths.has(entry.path)),
  gitlinksWithoutDeclaration: gitlinks.filter((entry) => !declaredPaths.has(entry.path)),
  valid: declarations.filter((entry) => gitlinkPaths.has(entry.path)).map((entry) => ({ ...entry, pin: gitlinks.find((gitlink) => gitlink.path === entry.path)?.pin }))
};
report.ok = report.declarationsWithoutGitlink.length === 0 && report.gitlinksWithoutDeclaration.length === 0;
console.log(JSON.stringify(report));

function run(cwd, argv) { try { return execFileSync(git, argv, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); } catch (error) { fail(`git command failed in ${cwd}: ${argv.join(" ")}\n${String(error.stderr ?? error.message).trim()}`); } }
function fail(message) { process.stderr.write(`audit-git-submodule-graph: ${message}\n`); process.exit(2); }
