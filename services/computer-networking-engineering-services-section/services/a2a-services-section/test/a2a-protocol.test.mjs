import assert from "node:assert/strict";
import test from "node:test";
import { callA2aMethod, cancelTask, discoverAgentCard, getTask, ROLE_AGENT, ROLE_USER, sendMessage, TASK_STATE } from "../scripts/a2a-client.mjs";
import { createA2aServer } from "../scripts/a2a-server.mjs";
import { waitForListening } from "./_test-helpers.mjs";

const AGENT_CARD = Object.freeze({ name: "test-agent", protocolVersion: "1.0", capabilities: {} });

async function startServer(options) {
  const started = await createA2aServer({ agentCard: AGENT_CARD, host: "127.0.0.1", port: 0, ...options });
  await waitForListening(started.baseUrl);
  return started;
}

async function withServer(handlers, run) {
  const { baseUrl, close } = await startServer({ handlers });
  try { return await run(baseUrl); } finally { await close(); }
}

test("discoverAgentCard fetches the well-known resource", async () => {
  await withServer({}, async (baseUrl) => {
    const card = await discoverAgentCard(baseUrl);
    assert.deepEqual(card, AGENT_CARD);
  });
});

test("message/send round-trips through a caller-supplied handler and tasks/get observes it", async () => {
  await withServer({
    "message/send": async (message) => ({ messageId: "m2", taskId: message.taskId, contextId: message.contextId, role: ROLE_AGENT, parts: [{ content: { $case: "text", value: "ok" } }], metadata: {}, extensions: [], referenceTaskIds: [] }),
  }, async (baseUrl) => {
    const message = { messageId: "m1", taskId: "task-1", contextId: "ctx-1", role: ROLE_USER, parts: [{ content: { $case: "text", value: "synthetic request" } }], metadata: {}, extensions: [], referenceTaskIds: [] };
    const result = await sendMessage(baseUrl, message);
    assert.equal(result.parts[0].content.value, "ok");
    const task = await getTask(baseUrl, "task-1");
    assert.equal(task.status.state, TASK_STATE.COMPLETED);
    assert.deepEqual(task.history.map(({ role }) => role), ["ROLE_USER", "ROLE_AGENT"]);
  });
});

test("a handler refusal fails the task instead of throwing across the wire", async () => {
  await withServer({ "message/send": async () => { throw new Error("refused by policy"); } }, async (baseUrl) => {
    const message = { messageId: "m1", taskId: "task-2", contextId: "ctx-1", role: ROLE_USER, parts: [{ content: { $case: "text", value: "synthetic request" } }], metadata: {}, extensions: [], referenceTaskIds: [] };
    const result = await sendMessage(baseUrl, message);
    assert.equal(result.metadata.disposition, "refused");
    const task = await getTask(baseUrl, "task-2");
    assert.equal(task.status.state, TASK_STATE.FAILED);
  });
});

test("tasks/cancel moves a nonterminal task to canceled and a repeat cancel is idempotent", async () => {
  const { baseUrl, close, taskStore } = await startServer({
    handlers: { "message/send": () => new Promise(() => {}) }, // left deliberately pending
  });
  try {
    taskStore.record("task-3", "ctx-1");
    taskStore.transition("task-3", TASK_STATE.WORKING);
    const cancelled = await cancelTask(baseUrl, "task-3");
    assert.equal(cancelled.status.state, TASK_STATE.CANCELED);
    const repeat = await cancelTask(baseUrl, "task-3");
    assert.equal(repeat.status.state, TASK_STATE.CANCELED);
  } finally { await close(); }
});

test("tasks/get on an unknown task is a JSON-RPC error, not a thrown transport failure", async () => {
  await withServer({}, async (baseUrl) => {
    await assert.rejects(() => getTask(baseUrl, "no-such-task"), /unknown task/u);
  });
});

test("an unknown JSON-RPC method is refused with -32601", async () => {
  await withServer({}, async (baseUrl) => {
    const error = await callA2aMethod(baseUrl, "message/stream", {}).catch((error) => error);
    assert.equal(error.code, -32601);
  });
});

test("a bearerToken option requires the matching Authorization header", async () => {
  const { baseUrl, close } = await startServer({ bearerToken: "secret", handlers: { "message/send": async (message) => message } });
  try {
    await assert.rejects(() => sendMessage(baseUrl, { messageId: "m1", role: ROLE_USER, parts: [{ content: { $case: "text", value: "synthetic request" } }] }), /HTTP 401/u);
    const result = await sendMessage(baseUrl, { messageId: "m1", role: ROLE_USER, parts: [{ content: { $case: "text", value: "synthetic request" } }] }, { headers: { authorization: "Bearer secret" } });
    assert.equal(result.messageId, "m1");
  } finally { await close(); }
});
