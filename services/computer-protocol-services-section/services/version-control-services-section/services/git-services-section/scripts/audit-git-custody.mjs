#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseGitmodules } from "../services/gitmodules-file-codec-service/src/gitmodules.mjs";

const options = parseArguments(process.argv.slice(2));
const gitEnvironment = { ...process.env };
for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR"]) delete gitEnvironment[name];
const root = realpathSync(resolve(options.repository));
if (git(root, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") fail(`not a Git worktree: ${root}`);

const errors = [];
const warnings = [];
const repositories = discoverRegisteredRepositories(root, errors);
const registeredPaths = new Set(repositories.map(({ path }) => path));
const origins = new Map();

for (const repository of repositories) {
  inspectRepository(repository, root, errors, warnings, origins);
}

for (const worktree of discoverNestedWorktrees(root)) {
  if (!registeredPaths.has(worktree)) errors.push(finding("unregistered-worktree", worktree, "nested Git worktree is not registered by a parent gitlink"));
}

for (const [origin, paths] of origins) {
  if (paths.length > 1) warnings.push(finding("duplicate-origin", root, `one hosted repository is mounted ${paths.length} times: ${origin}`, { paths }));
}

if (options.prePush) inspectPushedCommits(root, readFileSync(0, "utf8"), errors);

const report = {
  kind: "git-custody-audit/v1",
  root,
  repositoryCount: repositories.length,
  ok: errors.length === 0,
  errors,
  warnings,
};

if (options.format === "json") process.stdout.write(`${JSON.stringify(report)}\n`);
else {
  for (const entry of errors) process.stderr.write(`git-custody error [${entry.code}]: ${entry.repository}: ${entry.detail}\n`);
  for (const entry of warnings) process.stderr.write(`git-custody warning [${entry.code}]: ${entry.repository}: ${entry.detail}\n`);
  process.stderr.write(`git-custody: ${report.ok ? "passed" : "failed"}; repositories=${repositories.length} errors=${errors.length} warnings=${warnings.length}\n`);
}
process.exitCode = report.ok ? 0 : 1;

function discoverRegisteredRepositories(start, findings) {
  const queue = [{ path: start, parent: null, submodulePath: null, pin: null, declaredUrl: null }];
  const discovered = [];
  const seen = new Set();
  while (queue.length > 0) {
    const repository = queue.shift();
    if (seen.has(repository.path)) continue;
    seen.add(repository.path);
    discovered.push(repository);
    const declarations = readDeclarations(repository.path, findings);
    const gitlinks = readGitlinks(repository.path);
    const declared = new Map(declarations.map((entry) => [entry.path, entry]));
    const linked = new Map(gitlinks.map((entry) => [entry.path, entry]));
    for (const entry of declarations) {
      if (!linked.has(entry.path)) findings.push(finding("declaration-without-gitlink", repository.path, `.gitmodules declares ${entry.path} without an index gitlink`));
    }
    for (const entry of gitlinks) {
      if (!declared.has(entry.path)) findings.push(finding("gitlink-without-declaration", repository.path, `index gitlink ${entry.path} has no .gitmodules declaration`));
    }
    for (const [path, entry] of declared) {
      const link = linked.get(path);
      if (link === undefined) continue;
      const child = resolve(repository.path, path);
      if (!existsSync(join(child, ".git"))) {
        findings.push(finding("uninitialized-submodule", child, `registered pin ${link.pin} is not initialized`));
        continue;
      }
      let childRoot;
      try { childRoot = realpathSync(child); } catch { findings.push(finding("missing-submodule", child, `registered pin ${link.pin} has no worktree`)); continue; }
      queue.push({ path: childRoot, parent: repository.path, submodulePath: path, pin: link.pin, declaredUrl: entry.url });
    }
  }
  return discovered;
}

function inspectRepository(repository, root, findings, notices, origins) {
  const head = git(repository.path, ["rev-parse", "HEAD"]).trim();
  const status = git(repository.path, ["status", "--porcelain=v1", "--untracked-files=normal", "--ignore-submodules=all"]).trim();
  if (status !== "") findings.push(finding("dirty-worktree", repository.path, status.split("\n")[0]));

  const replacements = lines(git(repository.path, ["for-each-ref", "--format=%(refname)", "refs/replace"]));
  if (replacements.length > 0) findings.push(finding("replacement-refs", repository.path, `${replacements.length} refs/replace entries exist`, { refs: replacements }));

  const branches = lines(git(repository.path, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]));
  if (branches.length > 1) notices.push(finding("multiple-local-branches", repository.path, `${branches.length} local branches exist`, { branches }));

  const origin = optionalGit(repository.path, ["remote", "get-url", "origin"])?.trim() ?? repository.declaredUrl;
  if (origin === null || origin === undefined || origin === "") findings.push(finding("missing-origin", repository.path, "repository has no origin URL"));
  else {
    const normalized = normalizeOrigin(origin);
    origins.set(normalized, [...(origins.get(normalized) ?? []), relative(root, repository.path) || "."]);
  }

  if (repository.parent !== null) {
    if (head !== repository.pin) findings.push(finding("gitlink-head-mismatch", repository.path, `worktree HEAD ${head} differs from parent pin ${repository.pin}`));
    const containingOrigin = lines(git(repository.path, ["for-each-ref", "--count=1", `--contains=${head}`, "--format=%(objectname)", "refs/remotes/origin"]));
    if (containingOrigin.length === 0) {
      findings.push(finding("unreachable-from-origin", repository.path, `HEAD ${head} is not reachable from any fetched origin ref`));
    }
  }

  const entries = lines(git(repository.path, ["ls-tree", "-r", "--name-only", "HEAD"]));
  const payload = entries.filter((path) => path !== ".gitignore" && path !== ".gitattributes");
  if (payload.length === 0) notices.push(finding("empty-payload", repository.path, `HEAD ${head} contains no payload paths`));
}

function inspectPushedCommits(repository, input, findings) {
  const zero = /^0+$/u;
  const commits = new Set();
  for (const line of lines(input)) {
    const [localRef, localOid, remoteRef, remoteOid] = line.trim().split(/\s+/u);
    if (!localRef || !localOid || !remoteRef || !remoteOid || zero.test(localOid)) continue;
    const range = zero.test(remoteOid) ? [localOid, "--not", "--remotes=origin"] : [`${remoteOid}..${localOid}`];
    for (const commit of lines(git(repository, ["rev-list", "--reverse", ...range]))) commits.add(commit);
  }
  for (const commit of commits) {
    const parent = optionalGit(repository, ["rev-parse", `${commit}^`])?.trim();
    if (!parent) continue;
    const parentPaths = lines(git(repository, ["ls-tree", "-r", "--name-only", parent]));
    const deletedPaths = lines(git(repository, ["diff-tree", "--no-commit-id", "--name-only", "--diff-filter=D", "-r", "--no-renames", parent, commit]));
    if (deletedPaths.length < 20 || deletedPaths.length * 2 < parentPaths.length) continue;
    const message = git(repository, ["show", "-s", "--format=%B", commit]);
    const trailer = /^Git-Custody-Relocation:\s+(.+)$/mu.exec(message)?.[1]?.trim();
    if (!trailer || !validReceipt(repository, commit, trailer)) {
      findings.push(finding("unproven-broad-deletion", repository, `commit ${commit} deletes ${deletedPaths.length}/${parentPaths.length} paths without a valid Git-Custody-Relocation receipt`, { commit, deletedPaths: deletedPaths.slice(0, 50) }));
    }
  }
}

function validReceipt(repository, commit, path) {
  if (path.startsWith("/") || path.split("/").includes("..")) return false;
  const content = optionalGit(repository, ["show", `${commit}:${path}`]);
  if (content === null) return false;
  try {
    const value = JSON.parse(content);
    return value?.kind === "git-custody-relocation/v1"
      && typeof value?.source?.repository === "string" && typeof value?.source?.commit === "string" && typeof value?.source?.path === "string" && typeof value?.source?.tree === "string"
      && typeof value?.destination?.repository === "string" && typeof value?.destination?.commit === "string" && typeof value?.destination?.path === "string" && typeof value?.destination?.tree === "string"
      && ["exact-tree", "blob-set"].includes(value?.proof?.method);
  } catch { return false; }
}

function discoverNestedWorktrees(start) {
  const markers = execFileSync("/usr/bin/find", [start, "-name", ".git", "-print", "-prune"], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  return [...new Set(lines(markers).map((path) => realpathSync(dirname(path))))].sort();
}

function readDeclarations(repository, findings) {
  const path = join(repository, ".gitmodules");
  if (!existsSync(path)) return [];
  try { return parseGitmodules(readFileSync(path, "utf8")); }
  catch (error) { findings.push(finding("invalid-gitmodules", repository, error.message)); return []; }
}

function readGitlinks(repository) {
  return git(repository, ["ls-files", "--stage", "-z"]).split("\0").flatMap((line) => {
    const match = /^160000\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/u.exec(line);
    return match === null ? [] : [{ pin: match[1], path: match[2] }];
  });
}

function normalizeOrigin(value) {
  return value.trim().replace(/^git@([^:]+):/u, "$1/").replace(/^ssh:\/\/git@/u, "").replace(/^https?:\/\//u, "").replace(/\.git$/u, "").replace(/\/$/u, "").toLowerCase();
}
function lines(value) { return value.trim() === "" ? [] : value.trim().split("\n"); }
function finding(code, repository, detail, extra = {}) { return { code, repository, detail, ...extra }; }
function git(cwd, argv) { return execFileSync("/usr/bin/git", ["--no-optional-locks", "-C", cwd, ...argv], { encoding: "utf8", env: gitEnvironment, maxBuffer: 128 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
function optionalGit(cwd, argv) { try { return git(cwd, argv); } catch { return null; } }
function parseArguments(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: audit-git-custody.mjs --repository <worktree> [--pre-push] [--format text|json]"); process.exit(0);
  }
  let repository = null; let prePush = false; let format = "text";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--repository") repository = argv[++index];
    else if (argv[index] === "--pre-push") prePush = true;
    else if (argv[index] === "--format") format = argv[++index];
    else fail(`unknown argument: ${argv[index]}`);
  }
  if (!repository || !["text", "json"].includes(format)) fail("--repository and a valid --format are required");
  return { repository, prePush, format };
}
function fail(message) { process.stderr.write(`audit-git-custody: ${message}\n`); process.exit(2); }
