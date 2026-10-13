/**
 * @packageDocumentation
 *
 * integrations/git/services - live git worktree state via the
 * process-command boundary.
 *
 * Reads default branch, origin remote, and worktree cleanliness through git
 * itself (integrations/process/services/command's child-process boundary),
 * rather than hand-parsing .git internals — the same "read the real host
 * format" rule `monitoring/source-code` follows via the TypeScript AST.
 *
 * `readGitState` spawns three child processes per call. It is not wired into
 * any `services/filesystem` `CutDeriver` today. Before wiring it into one,
 * follow `module-topology`'s own artifact-only pattern in the `orientation`
 * deriver (read a cached `data/state/…-settle-git-state.json` settlement, never call
 * this live from a passive read) — an entering readout re-forking three
 * processes on every read is exactly the hot-path cost that deriver already
 * exists to avoid.
 */
import {
  operation,
  type Operation,
} from "../../rpc/index.mts";
import { contentAddress } from "../../lib/identity/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import { readWorkItemView } from "../../work/service.mts";
import type { FilesystemBinding } from "../filesystem/services/read-write.mts";
import { processCommandExitCode, processCommandOutputText, runProcessCommand } from "../process/services/command.mts";

export interface GitStateRead {
  readonly kind: "metroplat.git-state.read";
  readonly root: string;
  readonly defaultBranch?: string;
  readonly remote?: string;
  readonly dirty?: boolean;
}

export interface GitWorkspaceChangeFile {
  readonly status: string;
  readonly path: string;
}

export interface GitWorkspaceChangeRead {
  readonly kind: "metroplat.git.workspace-change-readout";
  readonly root: string;
  readonly ok: boolean;
  readonly dirty: boolean;
  readonly files: readonly GitWorkspaceChangeFile[];
  readonly diffStat: readonly string[];
  readonly nameStatus: readonly string[];
  readonly stderr?: string;
  readonly evidence: readonly string[];
}

export interface GitTaskCutPublicationReadout {
  readonly kind: "metroplat.git.task-cut-publication";
  readonly ok: boolean;
  readonly phase: "precondition" | "stage" | "commit" | "push" | "confirm" | "published";
  readonly root: string;
  readonly task?: string;
  readonly settlement?: string;
  readonly expectedHead?: string;
  readonly head?: string;
  readonly remoteHead?: string;
  readonly paths: readonly string[];
  readonly evidence: readonly string[];
  readonly obstructions: readonly string[];
}

function runGit(root: string, args: readonly string[]): { readonly ok: boolean; readonly text: string; readonly stderr: string } {
  const result = runProcessCommand({ command: "git", args, cwd: root });
  const stdout = processCommandOutputText(result.stdout).replace(/\r?\n$/u, "");
  return {
    ok: processCommandExitCode(result) === 0,
    text: stdout,
    stderr: processCommandOutputText(result.stderr).trim(),
  };
}

function inputRecord(input: unknown): Readonly<Record<string, unknown>> {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input as Readonly<Record<string, unknown>> : {};
}

function workspaceScopeRoot(binding: FilesystemBinding, scope: string | undefined): string {
  if (scope === "package" && binding.packageRoot !== undefined) return binding.packageRoot;
  return binding.dataRoot;
}

function stringRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

function taskPublicationResult(
  root: string,
  phase: GitTaskCutPublicationReadout["phase"],
  fields: Omit<GitTaskCutPublicationReadout, "kind" | "ok" | "phase" | "root">,
): GitTaskCutPublicationReadout {
  return Object.freeze({
    kind: "metroplat.git.task-cut-publication" as const,
    ok: phase === "published",
    phase,
    root,
    ...fields,
  });
}

function boundedDiagnostic(result: ReturnType<typeof runGit>): string {
  return (result.stderr || result.text || "git command failed").slice(0, 1_000);
}

function exactRelativePaths(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === "string")) return undefined;
  const paths = [...new Set(value)].sort();
  if (paths.some((item) => item.length === 0
    || item.startsWith("/")
    || item.includes("\0")
    || item.split(/[\\/]/u).includes(".."))) return undefined;
  return Object.freeze(paths);
}

function taskSettlement(
  binding: FilesystemBinding,
  task: Readonly<Record<string, unknown>>,
): Readonly<{ cell: string; latest: string; accounting: string; view: string }> | undefined {
  const cell = typeof task["cell"] === "string" ? task["cell"] : undefined;
  const feed = typeof task["feed"] === "string" ? task["feed"] : undefined;
  const date = typeof task["date"] === "string" ? task["date"] : undefined;
  if (cell === undefined || feed === undefined || date === undefined) return undefined;
  const view = stringRecord(readWorkItemView(binding, date, feed));
  const scope = stringRecord(stringRecord(view?.["scopes"])?.[cell]);
  const accounting = stringRecord(scope?.["accounting"]);
  const settlement = stringRecord(scope?.["settlement"]);
  if (scope?.["status"] !== "discharged"
    || scope["causalDischarge"] !== true
    || accounting?.["kind"] !== "metroplat.workItem.accounting:witness"
    || settlement?.["kind"] !== "lorentzian.causalSettle:witness"
    || typeof scope["latest"] !== "string"
    || typeof accounting["id"] !== "string"
    || typeof view?.["id"] !== "string") return undefined;
  return Object.freeze({ cell, latest: scope["latest"], accounting: accounting["id"], view: view["id"] });
}

/**
 * Publish one exact Git cut after MetroPlat's existing work owner proves its
 * facilitating Task causally discharged. RPC standing supplies authorization;
 * Task settlement supplies readiness only. Git's index lock, expected HEAD,
 * and fast-forward push provide the compare-and-set boundary.
 */
export function publishSettledTaskCut(binding: FilesystemBinding, input: unknown): GitTaskCutPublicationReadout {
  const root = binding.packageRoot ?? binding.dataRoot;
  const record = stringRecord(input);
  const task = stringRecord(record?.["task"]);
  const expectedHead = typeof record?.["expectedHead"] === "string" ? record["expectedHead"] : undefined;
  const message = typeof record?.["message"] === "string" ? record["message"].trim() : "";
  const paths = exactRelativePaths(record?.["paths"]);
  const base = { paths: paths ?? Object.freeze([]), evidence: Object.freeze(["boundary:process-command", "remote:origin", "branch:main"]) };
  if (task === undefined || expectedHead === undefined || !/^[0-9a-f]{40}([0-9a-f]{24})?$/u.test(expectedHead)
    || message.length === 0 || paths === undefined) {
    return taskPublicationResult(root, "precondition", { ...base, obstructions: Object.freeze(["invalid-publication-request"]) });
  }
  const settled = taskSettlement(binding, task);
  if (settled === undefined) {
    return taskPublicationResult(root, "precondition", { ...base, expectedHead, ...(typeof task["cell"] === "string" ? { task: task["cell"] } : {}), obstructions: Object.freeze(["task-not-causally-discharged-and-accounted"]) });
  }
  const evidence = Object.freeze([...base.evidence, `work-view:${settled.view}`, `task-accounting:${settled.accounting}`]);
  const common = { task: settled.cell, settlement: settled.latest, expectedHead, paths, evidence };
  const branch = runGit(root, ["branch", "--show-current"]);
  const headRead = runGit(root, ["rev-parse", "--verify", "HEAD"]);
  const stagedBefore = runGit(root, ["diff", "--cached", "--quiet"]);
  if (!branch.ok || branch.text.trim() !== "main") {
    return taskPublicationResult(root, "precondition", { ...common, obstructions: Object.freeze([`main-branch-required:${branch.text.trim() || boundedDiagnostic(branch)}`]) });
  }
  if (!headRead.ok) return taskPublicationResult(root, "precondition", { ...common, obstructions: Object.freeze([`head-unreadable:${boundedDiagnostic(headRead)}`]) });
  if (!stagedBefore.ok) return taskPublicationResult(root, "precondition", { ...common, head: headRead.text.trim(), obstructions: Object.freeze(["preexisting-staged-changes"]) });

  const currentHead = headRead.text.trim();
  const pathSet = contentAddress(paths as unknown as JsonValue);
  const trailers = Object.freeze([
    `MetroPlat-Task: ${settled.cell}`,
    `MetroPlat-Settlement: ${settled.latest}`,
    `MetroPlat-Expected-Head: ${expectedHead}`,
    `MetroPlat-Path-Set: ${pathSet}`,
  ]);
  if (currentHead !== expectedHead) {
    const body = runGit(root, ["show", "-s", "--format=%B", "HEAD"]);
    if (!body.ok || !trailers.every((trailer) => body.text.includes(trailer))) {
      return taskPublicationResult(root, "precondition", { ...common, head: currentHead, obstructions: Object.freeze([`stale-head:${currentHead}`]) });
    }
  } else {
    const stage = runGit(root, ["add", "--", ...paths]);
    if (!stage.ok) return taskPublicationResult(root, "stage", { ...common, head: currentHead, obstructions: Object.freeze([boundedDiagnostic(stage)]) });
    const staged = runGit(root, ["diff", "--cached", "--name-only", "-z"]);
    const stagedPaths = staged.text.split("\0").filter((item) => item.length > 0).sort();
    if (!staged.ok || stagedPaths.length !== paths.length || stagedPaths.some((item, index) => item !== paths[index])) {
      runGit(root, ["restore", "--staged", "--", ...paths]);
      return taskPublicationResult(root, "stage", { ...common, head: currentHead, obstructions: Object.freeze([`staged-path-set-mismatch:${stagedPaths.join(",")}`]) });
    }
    const commit = runGit(root, ["commit", "-m", message, "-m", trailers.join("\n")]);
    if (!commit.ok) {
      runGit(root, ["restore", "--staged", "--", ...paths]);
      return taskPublicationResult(root, "commit", { ...common, head: currentHead, obstructions: Object.freeze([boundedDiagnostic(commit)]) });
    }
  }

  const publishedHead = runGit(root, ["rev-parse", "--verify", "HEAD"]);
  if (!publishedHead.ok) return taskPublicationResult(root, "commit", { ...common, obstructions: Object.freeze([`committed-head-unreadable:${boundedDiagnostic(publishedHead)}`]) });
  const head = publishedHead.text.trim();
  const push = runGit(root, ["push", "origin", "HEAD:main"]);
  if (!push.ok) return taskPublicationResult(root, "push", { ...common, head, obstructions: Object.freeze([boundedDiagnostic(push)]) });
  const remote = runGit(root, ["ls-remote", "--heads", "origin", "refs/heads/main"]);
  const remoteHead = remote.text.trim().split(/\s+/u)[0] ?? "";
  if (!remote.ok || remoteHead !== head) {
    return taskPublicationResult(root, "confirm", { ...common, head, ...(remoteHead.length === 0 ? {} : { remoteHead }), obstructions: Object.freeze([remote.ok ? "remote-head-mismatch" : boundedDiagnostic(remote)]) });
  }
  return taskPublicationResult(root, "published", { ...common, head, remoteHead, obstructions: Object.freeze([]) });
}

/** Read this package's current git branch, origin remote, and worktree cleanliness. */
export function readGitState(root: string): GitStateRead {
  const branch = runGit(root, ["branch", "--show-current"]);
  const remote = runGit(root, ["remote", "get-url", "origin"]);
  const status = runGit(root, ["status", "--porcelain"]);
  return Object.freeze({
    kind: "metroplat.git-state.read" as const,
    root,
    ...(branch.ok && branch.text.trim().length > 0 ? { defaultBranch: branch.text.trim() } : {}),
    ...(remote.ok && remote.text.trim().length > 0 ? { remote: remote.text.trim() } : {}),
    ...(status.ok ? { dirty: status.text.length > 0 } : {}),
  });
}

function porcelainFile(line: string): GitWorkspaceChangeFile | undefined {
  if (line.length < 4) return undefined;
  const status = line.slice(0, 2);
  const pathText = line.slice(3);
  if (pathText.length === 0) return undefined;
  return Object.freeze({ status, path: pathText });
}

/** Read worktree changes as status rows plus bounded diff summaries. */
export function readGitWorkspaceChange(root: string): GitWorkspaceChangeRead {
  const status = runGit(root, ["status", "--porcelain=v1"]);
  const diffStat = runGit(root, ["diff", "--stat"]);
  const nameStatus = runGit(root, ["diff", "--name-status"]);
  const files = status.ok
    ? status.text.split(/\r?\n/u).flatMap((line) => {
        const file = porcelainFile(line);
        return file === undefined ? [] : [file];
      })
    : [];
  const stderr = [status, diffStat, nameStatus]
    .filter((result) => !result.ok && result.stderr.length > 0)
    .map((result) => result.stderr)
    .join("\n");
  return Object.freeze({
    kind: "metroplat.git.workspace-change-readout" as const,
    root,
    ok: status.ok,
    dirty: files.length > 0 || diffStat.text.length > 0 || nameStatus.text.length > 0,
    files: Object.freeze(files),
    diffStat: Object.freeze(diffStat.text.length === 0 ? [] : diffStat.text.split(/\r?\n/u)),
    nameStatus: Object.freeze(nameStatus.text.length === 0 ? [] : nameStatus.text.split(/\r?\n/u)),
    ...(stderr.length === 0 ? {} : { stderr }),
    evidence: Object.freeze([
      "boundary:process-command",
      "command:git status --porcelain=v1",
      "command:git diff --stat",
      "command:git diff --name-status",
    ]),
  });
}

export function gitWorkspaceOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "workspace-change-readout",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read git worktree changes for a workspace root.",
      description: "Domain: { scope?, id? }. scope/id package selects packageRoot when available; otherwise dataRoot.",
      run: (input: unknown): unknown => {
        const record = inputRecord(input);
        const scope = typeof record["scope"] === "string"
          ? record["scope"]
          : typeof record["id"] === "string" ? record["id"] : undefined;
        return readGitWorkspaceChange(workspaceScopeRoot(binding, scope));
      },
    }),
    operation({
      verb: "task-cut-publish",
      relation: "boundary",
      inputFormat: "json",
      outputFormat: "json",
      effects: {
        class: "external",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: "unmeasured",
        totality: "partial",
      },
      summary: "Publish an exact main-branch Git cut facilitated by a causally discharged Task.",
      description: "Domain: { task: { cell, feed, date }, expectedHead, paths, message }. RPC standing authorizes the effect; the Task only proves readiness. The operation stages only the exact path set, commits with settlement trailers, pushes origin/main, and returns explicit partial-failure obstructions.",
      run: (input: unknown): unknown => publishSettledTaskCut(binding, input),
    }),
  ]);
}
