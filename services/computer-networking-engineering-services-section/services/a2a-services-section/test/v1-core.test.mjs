import assert from "node:assert/strict";
import test from "node:test";
import {
  A2A_V1_CORE_PROFILE,
  A2A_V1_INTERRUPTED_TASK_STATES,
  admitA2AV1Message,
  admitA2AV1Task,
  isFinalTaskState,
  isSuccessfulTaskState,
} from "../scripts/v1-core.mjs";
import { isTerminalTaskState } from "../scripts/a2a-client.mjs";

test("the v1 core profile is partial and refuses a full wire-conformance claim", () => {
  assert.equal(A2A_V1_CORE_PROFILE.releasedVersion, "1.0.0");
  assert.equal(A2A_V1_CORE_PROFILE.wireConformant, false);
  assert.deepEqual(A2A_V1_CORE_PROFILE.coverage, ["Task", "TaskStatus", "TaskState", "Message"]);
  assert.ok(A2A_V1_CORE_PROFILE.reasons.length >= 4);
});

test("admit a server-generated Task lifecycle object", () => {
  const task = admitA2AV1Task({
    id: "task-server-generated-1",
    contextId: "context-1",
    status: {
      state: "TASK_STATE_WORKING",
      timestamp: "2026-10-05T22:50:00Z",
      message: { messageId: "message-1", contextId: "context-1", taskId: "task-server-generated-1", role: "ROLE_AGENT", parts: [{ text: "Working" }] },
    },
    artifacts: [],
    history: [{ messageId: "message-0", contextId: "context-1", role: "ROLE_USER", parts: [{ text: "Do bounded work" }], referenceTaskIds: ["task-prior"] }],
    metadata: { source: "fixture" },
  });
  assert.equal(task.id, "task-server-generated-1");
  assert.equal(task.status.state, "TASK_STATE_WORKING");
  assert.equal(task.status.message.taskId, task.id);
  assert.equal(task.history[0].role, "ROLE_USER");
  assert.throws(() => { task.id = "x"; }, TypeError);
});

test("a Message is admitted without any capability, office or authority field", () => {
  const message = admitA2AV1Message({
    messageId: "message-2", contextId: "context-2", role: "ROLE_USER",
    parts: [{ data: { request: "bounded work" } }], extensions: ["urn:example:coordination-extension"],
  });
  assert.equal(message.messageId, "message-2");
  for (const key of ["capability", "office", "authority"]) assert.equal(key in message, false);
});

test("a non-A2A task object is refused at the Task boundary", () => {
  assert.throws(() => admitA2AV1Task({ taskId: "legacy-task", contextId: "c", capability: {}, input: {} }), /A2A v1 Task id/u);
});

test("final and successful stay distinct, and interrupted states are not final", () => {
  assert.equal(isFinalTaskState("TASK_STATE_COMPLETED"), true);
  assert.equal(isSuccessfulTaskState("TASK_STATE_COMPLETED"), true);
  for (const state of ["TASK_STATE_FAILED", "TASK_STATE_CANCELED", "TASK_STATE_REJECTED"]) {
    assert.equal(isFinalTaskState(state), true);
    assert.equal(isSuccessfulTaskState(state), false);
  }
  for (const state of ["TASK_STATE_WORKING", ...A2A_V1_INTERRUPTED_TASK_STATES]) assert.equal(isFinalTaskState(state), false);
  // The client's own stop-waiting set also stops at an interrupted state.
  assert.equal(isTerminalTaskState("TASK_STATE_INPUT_REQUIRED"), true);
});

test("malformed roles, states, parts and non-JSON values are refused", () => {
  assert.throws(() => admitA2AV1Message({ messageId: "m", role: "ROLE_ADMIN", parts: [{ text: "x" }] }), /Message role: unexpected value/u);
  assert.throws(() => admitA2AV1Message({ messageId: "m", role: "ROLE_USER", parts: [] }), /at least one part/u);
  assert.throws(() => admitA2AV1Message({ messageId: "m", role: "ROLE_USER", parts: [{ text: () => 1 }] }), /expected JSON value/u);
  assert.throws(() => admitA2AV1Task({ id: "task-1", status: { state: "DONE" } }), /task status state: unexpected value/u);
});
