import { execFileSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

function git(cwd, args, executable) {
  try { return { ran: true, status: 0, stdout: execFileSync(executable, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (error) { return { ran: typeof error.status === "number", status: error.status ?? null, stdout: error.stdout ?? "", stderr: error.stderr ?? "", error }; }
}

function directoryState(path) {
  try { const stat = lstatSync(path); return stat.isDirectory() ? "directory" : "non-directory"; }
  catch (error) { if (error.code === "ENOENT") return "missing"; throw error; }
}

function gitlinks(worktree, prefix, executable) {
  const listed = git(worktree, ["ls-files", "--stage", "--", prefix], executable);
  if (!listed.ran || listed.status !== 0) throw new Error(`cannot inspect Git index in ${worktree}`);
  return String(listed.stdout).split("\n").flatMap((line) => {
    const match = /^160000\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/u.exec(line);
    return match === null ? [] : [{ path: match[2], commit: match[1] }];
  });
}

function nearestParentWorktree(source, executable) {
  for (let candidate = dirname(source); candidate !== dirname(candidate); candidate = dirname(candidate)) {
    const probe = git(candidate, ["rev-parse", "--show-toplevel"], executable);
    if (!probe.ran) throw new Error(`Git worktree probe did not run for ${candidate}`);
    if (probe.status === 0) return resolve(String(probe.stdout).trim());
  }
  return null;
}

export function inspectReformTarget(sourcePath, destinationPath, { gitExecutable = process.env.GIT_SERVICES_BIN ?? "git" } = {}) {
  const source = resolve(sourcePath), destination = resolve(destinationPath);
  const sourceState = directoryState(source), destinationState = directoryState(destination);
  if (sourceState !== "directory") return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, route: "refuse" });
  const probe = git(source, ["rev-parse", "--show-toplevel"], gitExecutable);
  if (!probe.ran) throw new Error(`Git worktree probe did not run for ${source}`);
  const parentWorktree = nearestParentWorktree(source, gitExecutable);
  if (probe.status !== 0 && parentWorktree === null) return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, route: "untracked-directory" });
  if (probe.status === 0 && parentWorktree !== null) {
    const parentRelative = relative(parentWorktree, source).split(sep).join("/");
    if (parentRelative !== "" && parentRelative !== ".." && !parentRelative.startsWith("../")) {
      const direct = gitlinks(parentWorktree, parentRelative, gitExecutable).find(({ path }) => path === parentRelative);
      if (direct) return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, worktree: parentWorktree, sourceRelative: parentRelative, route: "registered-submodule", gitlinks: Object.freeze([direct]) });
    }
  }
  if (probe.status !== 0) {
    const sourceRelative = relative(parentWorktree, source).split(sep).join("/");
    return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, worktree: parentWorktree, sourceRelative, route: "untracked-directory" });
  }
  const worktree = resolve(String(probe.stdout).trim());
  const sourceRelative = relative(worktree, source).split(sep).join("/");
  if (sourceRelative === "") return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, worktree, route: "existing-worktree" });
  if (sourceRelative === ".." || sourceRelative.startsWith("../")) throw new Error(`Git worktree ${worktree} does not contain ${source}`);
  const tracked = git(worktree, ["ls-files", "--error-unmatch", "--", sourceRelative], gitExecutable);
  if (!tracked.ran) throw new Error(`Git tracked-path probe did not run for ${source}`);
  if (tracked.status !== 0) return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, worktree, sourceRelative, route: "untracked-directory" });
  const entries = gitlinks(worktree, sourceRelative, gitExecutable);
  const direct = entries.find(({ path }) => path === sourceRelative);
  return Object.freeze({ type: "ReformTargetInspection", source, destination, sourceState, destinationState, worktree, sourceRelative, route: direct ? "registered-submodule" : "tracked-directory", gitlinks: Object.freeze(entries) });
}
