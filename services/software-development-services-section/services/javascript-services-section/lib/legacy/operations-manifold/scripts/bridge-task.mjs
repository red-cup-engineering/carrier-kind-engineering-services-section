#!/usr/bin/env node
/**
 * Task bridge adapter — TaskCreated/TaskCompleted ↔ manifold read-work.
 *
 * The harness task list and the manifold read-work fold should be one topology.
 * On TaskCreated this starts a read-work item (gate `record`, not `stop`, so a
 * sub-task never becomes a session stop-gate blocker) tagged with the task id; on
 * TaskCompleted it finds that item by tag and completes it. Each task therefore
 * lands as append-only work evidence the suit and stop-gate already read.
 */
import { harnessIdentity } from "../src/harness.mts";
import { codexHookEventName, codexHookPayloadFromText, codexHookSessionId } from "../src/codex-hook.mts";
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { readStdin } from "../src/script-stdio.mts";
import { stringField } from "../src/records.mts";
import { completeWork, operationsManifoldWork, startWork } from "../src/work-management.mts";

function taskIdOf(payload) {
  return stringField(payload, "task_id") ?? stringField(payload, "taskId") ?? stringField(payload, "id") ?? null;
}

function taskSubjectOf(payload) {
  return stringField(payload, "subject") ?? stringField(payload, "title") ?? stringField(payload, "description") ?? null;
}

async function bridgeTask(metaUrl) {
  const repoRoot = repoRootFromModule(metaUrl);
  const payload = codexHookPayloadFromText(await readStdin());
  const event = codexHookEventName(payload);
  const identity = harnessIdentity({ payload });
  const session = codexHookSessionId(payload);
  const taskId = taskIdOf(payload);
  const subject = taskSubjectOf(payload) ?? (taskId === null ? "harness task" : `harness task ${taskId}`);
  const tag = `task:${taskId ?? subject}`;

  if (event === "TaskCreated") {
    return startWork(repoRoot, {
      title: subject,
      intent: subject,
      success: "Complete the harness task and let TaskCompleted settle this read-work item.",
      workKind: "task",
      gate: "record",
      agent: identity.agent,
      ...(session === "unknown-session" ? {} : { session }),
      evidence: [tag, `${identity.harness}.task`],
      source: `${identity.harness}.task-bridge`,
    });
  }

  if (event === "TaskCompleted") {
    const snapshot = await operationsManifoldWork(repoRoot);
    const item = snapshot.items.find((candidate) => candidate.status !== "complete" && candidate.evidence.some((value) => value.includes(tag)));
    if (item === undefined) return { kind: "operations-manifold.task-bridge", bridged: false, reason: `no open read-work tagged ${tag}` };
    return completeWork(repoRoot, { id: item.id, outcome: `Harness task completed: ${subject}`, evidence: [tag] });
  }

  return { kind: "operations-manifold.task-bridge", bridged: false, reason: `unbridged event ${event}` };
}

if (isMainModule(import.meta.url)) {
  bridgeTask(import.meta.url)
    .then(() => process.exit(0))
    .catch(() => process.exit(0)); // never break the turn over a task bridge
}
