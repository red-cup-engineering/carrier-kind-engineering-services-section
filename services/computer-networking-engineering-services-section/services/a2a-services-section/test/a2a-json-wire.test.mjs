import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { callA2aMethod, discoverAgentCard, getTask, sendMessage } from "../scripts/a2a-client.mjs";
import { createA2aServer } from "../scripts/a2a-server.mjs";
import { agentSenMessage, extractSenPart, rawNi, sendSenTask, userSenMessage } from "../scripts/sen-part.mjs";

const card = { name: "synthetic-wire-peer", supportedInterfaces: [{ protocolBinding: "JSONRPC", protocolVersion: "1.0", url: "http://127.0.0.1/" }], capabilities: {} };
const input = Uint8Array.of(0, 255, 128, 1);
const output = Uint8Array.of(255, 0, 2);
const responseMessage = { messageId: "result", contextId: "context", taskId: "task", role: "ROLE_AGENT", parts: [{ raw: Buffer.from(output).toString("base64"), mediaType: "application/sen+cbor", metadata: { ni: rawNi(output) } }] };

async function rawCall(baseUrl, method, params, { version = "1.0", id = "independent-request" } = {}) {
  const response = await fetch(baseUrl, { method: "POST", headers: { "content-type": "application/json", ...(version === undefined ? {} : { "A2A-Version": version }) }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  return response.json();
}

test("SEN client hires an independently implemented normative JSON peer", async () => {
  const seen = [];
  // Deliberately does not import the owner's codec or server. Both ends agreeing
  // on the same incorrect private representation cannot make this test pass.
  const server = createServer(async (req, res) => {
    try {
      seen.push({ path: req.url, version: req.headers["a2a-version"] });
      assert.equal(req.headers["a2a-version"], "1.0");
      if (req.method === "GET") {
        assert.equal(req.url, "/.well-known/agent-card.json");
        res.end(JSON.stringify(card)); return;
      }
      let body = ""; for await (const chunk of req) body += chunk;
      const rpc = JSON.parse(body);
      assert.equal(rpc.method, "SendMessage"); assert.equal(rpc.jsonrpc, "2.0");
      const part = rpc.params.message.parts[0];
      assert.equal(part.content, undefined); assert.equal(part.raw, Buffer.from(input).toString("base64"));
      assert.equal(part.metadata.ni, rawNi(input));
      res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: { message: responseMessage } }));
    } catch (error) { res.statusCode = 500; res.end(error.message); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const receipt = await sendSenTask({ agentUrl: baseUrl, message: userSenMessage(input) });
    assert.equal(receipt.inputNi, rawNi(input)); assert.equal(receipt.outputNi, rawNi(output));
    assert.deepEqual(extractSenPart(receipt.result.parts).bytes, Buffer.from(output));
    assert.equal(seen.length, 2);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("independent JSON client reaches real server, preserving typed SEN bytes and custody", async () => {
  const started = await createA2aServer({ agentCard: card, handlers: { "message/send": async (message) => {
    assert.deepEqual(extractSenPart(message.parts).bytes, Buffer.from(input));
    return agentSenMessage(output);
  } } });
  try {
    const body = await rawCall(started.baseUrl, "SendMessage", { message: { messageId: "input", role: "ROLE_USER", parts: [{ raw: Buffer.from(input).toString("base64"), mediaType: "application/sen+cbor", metadata: { ni: rawNi(input) } }] } });
    assert.equal(body.id, "independent-request"); assert.equal(body.error, undefined);
    assert.deepEqual(Object.keys(body.result), ["message"]);
    const result = body.result.message;
    assert.ok(result.contextId); assert.ok(result.taskId);
    assert.equal(result.parts[0].content, undefined); assert.equal(result.parts[0].raw, Buffer.from(output).toString("base64"));
    assert.equal(result.parts[0].metadata.ni, rawNi(output));
    const task = (await rawCall(started.baseUrl, "GetTask", { id: result.taskId, historyLength: 1 })).result;
    assert.equal(task.status.state, "TASK_STATE_COMPLETED"); assert.equal(task.history.length, 1);
    assert.equal(task.status.message.parts[0].raw, result.parts[0].raw);
    assert.equal((await getTask(started.baseUrl, result.taskId, { historyLength: 0 })).history, undefined);
    assert.equal((await rawCall(started.baseUrl, "GetTask", { id: result.taskId, historyLength: -1 })).error.code, -32602);
  } finally { await started.close(); }
});

test("wire rejects missing/unsupported versions, legacy names and malformed Parts before effect", async () => {
  let effects = 0;
  const started = await createA2aServer({ agentCard: card, handlers: { "message/send": async () => { effects++; return agentSenMessage(output); } } });
  try {
    const params = { message: { messageId: "input", role: "ROLE_USER", parts: [{ text: "request" }] } };
    for (const version of ["", "0.3", "2.0", "1.1"]) assert.equal((await rawCall(started.baseUrl, "SendMessage", params, { version })).error.code, -32009);
    assert.equal((await rawCall(started.baseUrl, "message/send", params)).error.code, -32601);
    for (const part of [{ raw: "%%%" }, { text: "x", data: {} }, { content: { $case: "text", value: "old private wire" } }]) assert.equal((await rawCall(started.baseUrl, "SendMessage", { message: { ...params.message, parts: [part] } })).error.code, -32602);
    assert.equal(effects, 0);
    assert.equal((await rawCall(started.baseUrl, "SendMessage", params, { version: "1.0.7" })).error, undefined);
    assert.equal(effects, 1); // specification patch versions do not change compatibility
  } finally { await started.close(); }
});

test("client refuses mismatched JSON-RPC custody and malformed result wrappers", async () => {
  for (const change of [(r) => ({ ...r, id: "forged" }), (r) => ({ ...r, jsonrpc: "1.0" }), (r) => ({ ...r, error: { code: -1, message: "both" } }), (r) => ({ ...r, result: responseMessage }), (r) => ({ ...r, result: { message: responseMessage, task: {} } })]) {
    const fetch = async (_url, init) => {
      const request = JSON.parse(init.body);
      return new Response(JSON.stringify(change({ jsonrpc: "2.0", id: request.id, result: { message: responseMessage } })), { status: 200 });
    };
    await assert.rejects(sendMessage("http://127.0.0.1", userSenMessage(input), { fetch }), /A2A/u);
  }
});

test("nonblocking wire returns a Task and independent CancelTask observes its custody", async () => {
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  const started = await createA2aServer({ agentCard: card, handlers: { "message/send": async () => { await gate; return agentSenMessage(output); } } });
  try {
    const params = { message: { messageId: "input", role: "ROLE_USER", parts: [{ text: "synthetic pending work" }] }, configuration: { returnImmediately: true } };
    const reply = await rawCall(started.baseUrl, "SendMessage", params);
    assert.deepEqual(Object.keys(reply.result), ["task"]);
    assert.equal(reply.result.task.status.state, "TASK_STATE_WORKING");
    const task = (await rawCall(started.baseUrl, "CancelTask", { id: reply.result.task.id })).result;
    assert.equal(task.id, reply.result.task.id); assert.equal(task.status.state, "TASK_STATE_CANCELED");
    assert.equal(typeof task.status.message.parts[0].text, "string");
    assert.equal(task.status.message.parts[0].content, undefined);
    assert.equal((await rawCall(started.baseUrl, "SendMessage", { ...params, configuration: { returnImmediately: "true" } })).error.code, -32602);
  } finally { finish(); await started.close(); }
});

test("client uses one case-insensitive fixed protocol header and leaves auth/extensions intact", async () => {
  const fetch = async (_url, init) => {
    const headers = new Headers(init.headers);
    assert.equal(headers.get("a2a-version"), "1.0");
    assert.equal(headers.get("authorization"), "Bearer synthetic");
    assert.equal(headers.get("a2a-extensions"), "urn:example:receiving");
    const request = JSON.parse(init.body);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { message: responseMessage } }));
  };
  await sendMessage("http://127.0.0.1", userSenMessage(input), { fetch, headers: new Headers({ "A2A-Version": "0.3", authorization: "Bearer synthetic", "A2A-Extensions": "urn:example:receiving" }) });
});

test("SendMessage applies configuration history bounds to immediate and retained Task responses", async () => {
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  const started = await createA2aServer({ agentCard: card, handlers: { "message/send": async () => { await gate; return agentSenMessage(output); } } });
  try {
    const message = { messageId: "input", role: "ROLE_USER", parts: [{ text: "synthetic pending work" }] };
    const reply = await rawCall(started.baseUrl, "SendMessage", { message, configuration: { returnImmediately: true, historyLength: 0 } });
    assert.equal(reply.result.task.history, undefined);
    const id = reply.result.task.id;
    await rawCall(started.baseUrl, "CancelTask", { id });
    const retained = await rawCall(started.baseUrl, "SendMessage", { message: { ...message, taskId: id }, configuration: { historyLength: 0 } });
    assert.equal(retained.result.task.history, undefined);
    const bounded = await rawCall(started.baseUrl, "SendMessage", { message: { ...message, taskId: id }, configuration: { historyLength: 1 } });
    assert.equal(bounded.result.task.history.length, 1);
    assert.equal(bounded.result.task.history[0].role, "ROLE_AGENT");
  } finally { finish(); await started.close(); }
});
