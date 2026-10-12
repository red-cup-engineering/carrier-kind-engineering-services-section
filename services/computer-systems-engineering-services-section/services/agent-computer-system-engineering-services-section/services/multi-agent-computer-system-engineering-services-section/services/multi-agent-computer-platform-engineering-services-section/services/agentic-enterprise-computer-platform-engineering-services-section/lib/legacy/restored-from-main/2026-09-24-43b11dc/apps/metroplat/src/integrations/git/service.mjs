/**
 * @packageDocumentation
 *
 * integrations/git/services - MetroPlat's thin RPC-facing git composition.
 *
 * Reading and committing git state is NOT this package's capability to own
 * (561-group ruling 2026-09-05, `metroplat-is-a-marsh-library`): every raw
 * git read and every safe-commit compare-and-set below is delegated to the
 * house git-services-section operators —
 * `@red-cup-engineering/observing-git-repository-service` (branch/HEAD/
 * status/diff observation) and `@red-cup-engineering/committing-git-paths-
 * service` (exact-path, compare-and-set commit installation). What remains
 * here is genuinely MetroPlat's own: RPC operation wiring, Task-settlement-
 * gated authorization, and the settlement trailers/idempotent-replay
 * detection that only this app's work model knows about.
 *
 * Pushing the resulting commit to `origin/main` and confirming the remote
 * head has no house operator yet (git-services-section has no publish/push
 * capability today) — `runGit` below stays only for that narrow, still-
 * uncentralized push+confirm step. If a future consumer needs the same
 * push+confirm semantics, that belongs in git-services-section next, not a
 * second copy here.
 */
import path from "node:path";
import { operation } from "../../rpc/operation.mjs";
import { artifactId } from "@red-cup-engineering/computer-system-engine/identity";

import { readWorkItemView } from "../../work/service.mjs";

import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";
import { observeGitRepository } from "@red-cup-engineering/git-services-section/observe-git-repository";
import { commitGitExactFiles } from "@red-cup-engineering/committing-git-paths-service";

function runGit(root, args) {
  const receipt = executeJavascriptNodeCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command: "git",
    arguments: [...args],
    directory: path.resolve(root),
    environment: null,
    input: null,
  });
  const { result } = receipt;
  return {
    ok: result.status === 0,
    text: result.stdout.replace(/\r?\n$/u, ""),
    stderr: result.stderr.trim(),
  };
}

function inputRecord(input) {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input : {};
}

function workspaceScopeRoot(binding, scope) {
  if (scope === "package" && binding.packageRoot !== undefined) return binding.packageRoot;
  return binding.dataRoot;
}

function stringRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function taskPublicationResult(
  root,
  phase,
  fields,
) {
  return Object.freeze({
    kind: "metroplat.git.task-cut-publication",
    ok: phase === "published",
    phase,
    root,
    ...fields,
  });
}

function boundedDiagnostic(result) {
  return (result.stderr || result.text || "git command failed").slice(0, 1_000);
}

function boundedErrorMessage(error) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1_000);
}

function exactRelativePaths(value) {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === "string")) return undefined;
  const paths = [...new Set(value)].sort();
  if (paths.some((item) => item.length === 0
    || item.startsWith("/")
    || item.includes("\0")
    || item.split(/[\\/]/u).includes(".."))) return undefined;
  return Object.freeze(paths);
}

function taskSettlement(
  binding,
  task,
) {
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
 * Task settlement supplies readiness only. Repository observation, exact-path
 * commit installation, and the commit's own compare-and-set safety are all
 * delegated to git-services-section; only push and remote-head confirmation
 * remain raw git calls here (see module doc).
 */
export function publishSettledTaskCut(binding, input) {
  const root = binding.packageRoot ?? binding.dataRoot;
  const record = stringRecord(input);
  const task = stringRecord(record?.["task"]);
  const expectedHead = typeof record?.["expectedHead"] === "string" ? record["expectedHead"] : undefined;
  const message = typeof record?.["message"] === "string" ? record["message"].trim() : "";
  const paths = exactRelativePaths(record?.["paths"]);
  const base = { paths: paths ?? Object.freeze([]), evidence: Object.freeze(["boundary:observing-git-repository-service", "boundary:committing-git-paths-service", "remote:origin", "branch:main"]) };
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

  let observed;
  try {
    observed = observeGitRepository({ repository: root });
  } catch (error) {
    return taskPublicationResult(root, "precondition", { ...common, obstructions: Object.freeze([`repository-unreadable:${boundedErrorMessage(error)}`]) });
  }
  if (observed.branch !== "main") {
    return taskPublicationResult(root, "precondition", { ...common, obstructions: Object.freeze([`main-branch-required:${observed.branch ?? "detached-HEAD"}`]) });
  }
  if (observed.head === null) {
    return taskPublicationResult(root, "precondition", { ...common, obstructions: Object.freeze(["head-unreadable"]) });
  }

  const currentHead = observed.head;
  const pathSet = artifactId(paths);
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
    let commitResult;
    try {
      commitResult = commitGitExactFiles({ repository: root, paths: [...paths], message: `${message}\n\n${trailers.join("\n")}` });
    } catch (error) {
      return taskPublicationResult(root, "stage", { ...common, head: currentHead, obstructions: Object.freeze([`commit-refused:${boundedErrorMessage(error)}`]) });
    }
    if (!commitResult.committed) {
      return taskPublicationResult(root, "stage", { ...common, head: currentHead, obstructions: Object.freeze([`commit-not-installed:${commitResult.reason ?? "unknown"}`]) });
    }
  }

  let publishedObserved;
  try {
    publishedObserved = observeGitRepository({ repository: root });
  } catch (error) {
    return taskPublicationResult(root, "commit", { ...common, obstructions: Object.freeze([`committed-head-unreadable:${boundedErrorMessage(error)}`]) });
  }
  if (publishedObserved.head === null) return taskPublicationResult(root, "commit", { ...common, obstructions: Object.freeze(["committed-head-unreadable"]) });
  const head = publishedObserved.head;
  const push = runGit(root, ["push", "origin", "HEAD:main"]);
  if (!push.ok) return taskPublicationResult(root, "push", { ...common, head, obstructions: Object.freeze([boundedDiagnostic(push)]) });
  const remote = runGit(root, ["ls-remote", "--heads", "origin", "refs/heads/main"]);
  const remoteHead = remote.text.trim().split(/\s+/u)[0] ?? "";
  if (!remote.ok || remoteHead !== head) {
    return taskPublicationResult(root, "confirm", { ...common, head, ...(remoteHead.length === 0 ? {} : { remoteHead }), obstructions: Object.freeze([remote.ok ? "remote-head-mismatch" : boundedDiagnostic(remote)]) });
  }
  return taskPublicationResult(root, "published", { ...common, head, remoteHead, obstructions: Object.freeze([]) });
}

function porcelainFile(line) {
  if (line.length < 4) return undefined;
  const status = line.slice(0, 2);
  const pathText = line.slice(3);
  if (pathText.length === 0) return undefined;
  return Object.freeze({ status, path: pathText });
}

/** Read worktree changes as status rows plus bounded diff summaries, via the house repository-observation operator. */
export function readGitWorkspaceChange(root) {
  const evidence = Object.freeze([
    "boundary:observing-git-repository-service",
    "command:git status --porcelain=v1",
    "command:git diff --stat",
    "command:git diff --name-status",
  ]);
  let observed;
  try {
    observed = observeGitRepository({ repository: root, diff: true });
  } catch (error) {
    return Object.freeze({
      kind: "metroplat.git.workspace-change-readout",
      root,
      ok: false,
      dirty: false,
      files: Object.freeze([]),
      diffStat: Object.freeze([]),
      nameStatus: Object.freeze([]),
      stderr: boundedErrorMessage(error),
      evidence,
    });
  }
  const files = observed.status.length === 0
    ? []
    : observed.status.split(/\r?\n/u).flatMap((line) => {
        const file = porcelainFile(line);
        return file === undefined ? [] : [file];
      });
  const diffStat = observed.diffStat ?? Object.freeze([]);
  const nameStatus = observed.nameStatus ?? Object.freeze([]);
  return Object.freeze({
    kind: "metroplat.git.workspace-change-readout",
    root,
    ok: true,
    dirty: files.length > 0 || diffStat.length > 0 || nameStatus.length > 0,
    files: Object.freeze(files),
    diffStat,
    nameStatus,
    evidence,
  });
}

export function gitWorkspaceOperations(binding) {
  return Object.freeze([
    operation({
      verb: "workspace-change-readout",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read git worktree changes for a workspace root.",
      description: "Domain: { scope?, id? }. scope/id package selects packageRoot when available; otherwise dataRoot.",
      run: (input) => {
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
      run: (input) => publishSettledTaskCut(binding, input),
    }),
  ]);
}
