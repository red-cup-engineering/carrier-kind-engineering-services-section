import assert from "node:assert/strict";
import test from "node:test";

import { inferenceCall, inferenceMessage, inferenceResult } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { inferenceSourceTerminal } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind";
import { inferenceToolsFromRpcDescription } from "@red-cup-engineering/computer-inference-engine/dispatch/tools";
import { rpcInvocationFromInferenceToolMove } from "@red-cup-engineering/feltos/agents/inference/tool-bridge";
import {
  inferenceCallFromOpenAIChat,
  inferenceCallToOpenAIChat,
  inferenceResultFromOpenAIChat,
  inferenceResultToOpenAIChat,
} from "@red-cup-engineering/computer-inference-engine/openai/chat-completions/inference";
import { foldChatCompletionChunks } from "@red-cup-engineering/computer-inference-engine/openai/chat-completions/codec";
import { authorizationFromCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { describe } from "@red-cup-engineering/computer-system-engine/rpc/describe";
import { capabilityGrant, grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { routeOpenAIChatGuest } from "@red-cup-engineering/metroplat/http/openai-chat";
import { openAIChatInferenceSource } from "@red-cup-engineering/computer-inference-engine/openai/inference-client";
import {
  inferenceCallFromOpenAIResponse,
  inferenceCallToOpenAIResponse,
  inferenceResultFromOpenAIResponse,
} from "@red-cup-engineering/computer-inference-engine/openai/responses/inference";
import {
  inferenceCallFromAnthropicMessage,
  inferenceCallToAnthropicMessage,
  inferenceResultFromAnthropicMessage,
} from "@red-cup-engineering/computer-inference-engine/anthropic/messages/inference";
import { anthropicMessagesInferenceSource } from "@red-cup-engineering/computer-inference-engine/anthropic/inference-client";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";

const at = "2026-07-11T12:00:00.000Z";

async function terminalOf(source, call, options) {
  for await (const event of source(call, options)) {
    if (event.kind === "metroplat.inference.source-terminal") return event.outcome;
  }
  assert.fail("inference source ended without a terminal event");
}

test("inference call identity is stable across transport observation and causal placement", () => {
  const semantic = {
    request: "request:stable",
    subject: "agent:test",
    model: "model:test",
    messages: [inferenceMessage({ role: "user", content: "hello" })],
    observedAt: at,
  };
  const first = inferenceCall({ ...semantic, caller: { transport: "openai" }, causes: ["arrival:a"] });
  const second = inferenceCall({ ...semantic, observedAt: "2026-07-11T13:00:00.000Z", caller: { transport: "anthropic" }, causes: ["arrival:b"] });
  assert.equal(first.id, second.id);
});

test("OpenAI Chat Completions is a lossless reading of its admitted canonical subset", () => {
  const wire = Object.freeze({
    model: "gpt-test",
    messages: Object.freeze([
      Object.freeze({ role: "system", content: "be exact" }),
      Object.freeze({ role: "user", content: "double two" }),
    ]),
    tools: Object.freeze([Object.freeze({
      type: "function",
      function: Object.freeze({
        name: "double",
        description: "Double a number.",
        parameters: Object.freeze({ type: "object", properties: Object.freeze({ input: Object.freeze({ type: "number" }) }), required: Object.freeze(["input"]), additionalProperties: false }),
        strict: true,
      }),
    })]),
    temperature: 0,
    user: "agent:test",
  });
  const call = inferenceCallFromOpenAIChat(wire, {
    request: "request:wire",
    subject: "agent:test",
    observedAt: at,
  });
  assert.deepEqual(inferenceCallToOpenAIChat(call), wire);
});

test("OpenAI tool calls become provider-neutral moves and only the agent bridge constructs RPC", () => {
  const action = operation({ verb: "double", run: ({ value }) => ({ value: value * 2 }) });
  const catalog = createOperationCatalog([action]);
  const call = inferenceCall({
    request: "request:result",
    subject: "agent:test",
    model: "gpt-test",
    messages: [inferenceMessage({ role: "user", content: "double two" })],
    observedAt: at,
  });
  const result = inferenceResultFromOpenAIChat({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1783790400,
    model: "gpt-test",
    choices: [{
      index: 0,
      message: { role: "assistant", content: null, tool_calls: [{ id: "call:double", type: "function", function: { name: "double", arguments: "{\"input\":{\"value\":2}}" } }] },
      finish_reason: "tool_calls",
    }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }, call, at);
  assert.equal(result.stop, "tool-moves");
  assert.deepEqual(result.toolMoves[0], { kind: "metroplat.inference.tool-move", request: "call:double", name: "double", input: { input: { value: 2 } } });
  const invocation = rpcInvocationFromInferenceToolMove(result.toolMoves[0], {
    catalog,
    subject: "agent:test",
    resource: "test",
    observedAt: at,
  });
  assert.equal(invocation.operation, action.ref);
  assert.deepEqual(invocation.input, { value: 2 });
});

test("OpenAI-compatible tool-call continuation metadata survives canonical transcript and next request", () => {
  const initial = inferenceCall({
    request: "request:continuation-first",
    subject: "agent:test",
    model: "gemini-compatible-test",
    messages: [inferenceMessage({ role: "user", content: "use the tool" })],
    observedAt: at,
  });
  const result = inferenceResultFromOpenAIChat({
    id: "chatcmpl-continuation",
    object: "chat.completion",
    created: 1783790400,
    model: "gemini-compatible-test",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call:continue",
          type: "function",
          function: { name: "read", arguments: "{\"id\":\"work-1\"}" },
          extra_content: { google: { thought_signature: "fixture-opaque-continuation" } },
        }],
      },
      finish_reason: "tool_calls",
    }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }, initial, at);
  const transcript = inferenceResultToOpenAIChat(result);
  assert.deepEqual(transcript.choices[0].message.tool_calls[0].extra_content, { google: { thought_signature: "fixture-opaque-continuation" } });

  const continuation = inferenceCall({
    request: "request:continuation-second",
    subject: initial.subject,
    model: initial.model,
    messages: [
      initial.messages[0],
      result.message,
      inferenceMessage({ role: "tool", content: "work result", toolRequest: result.toolMoves[0].request }),
    ],
    observedAt: at,
  });
  const nextWire = inferenceCallToOpenAIChat(continuation);
  assert.deepEqual(nextWire.messages[1].tool_calls[0].extra_content, { google: { thought_signature: "fixture-opaque-continuation" } });
});

test("streamed OpenAI tool-call metadata stays with its call index across interleaved fragments", () => {
  const completion = foldChatCompletionChunks([
    {
      id: "chatcmpl-streamed-continuation",
      object: "chat.completion.chunk",
      created: 1783790400,
      model: "gemini-compatible-test",
      choices: [{
        index: 0,
        delta: {
          tool_calls: [
            { index: 1, id: "call:signed", type: "function", function: { name: "signed_read", arguments: "{\"id\":" }, extra_content: { google: { thought_signature: "fixture-opaque-stream" } } },
            { index: 0, id: "call:plain", type: "function", function: { name: "plain_read", arguments: "{\"id\":" } },
          ],
        },
        finish_reason: null,
      }],
    },
    {
      id: "chatcmpl-streamed-continuation",
      object: "chat.completion.chunk",
      created: 1783790400,
      model: "gemini-compatible-test",
      choices: [{
        index: 0,
        delta: {
          tool_calls: [
            { index: 0, function: { arguments: "\"plain\"}" } },
            { index: 1, function: { arguments: "\"signed\"}" } },
          ],
        },
        finish_reason: "tool_calls",
      }],
    },
  ]);
  const calls = completion.choices[0].message.tool_calls;
  assert.deepEqual(calls.find((call) => call.id === "call:signed")?.extra_content, { google: { thought_signature: "fixture-opaque-stream" } });
  assert.equal(calls.find((call) => call.id === "call:plain")?.extra_content, undefined);
  assert.equal(calls.find((call) => call.id === "call:signed")?.function.arguments, "{\"id\":\"signed\"}");
  assert.equal(calls.find((call) => call.id === "call:plain")?.function.arguments, "{\"id\":\"plain\"}");
});

test("OpenAI tool-call extra_content is a JSON object and unknown core fields remain refused", () => {
  const call = inferenceCall({
    request: "request:malformed-extra-content",
    subject: "agent:test",
    model: "gemini-compatible-test",
    messages: [inferenceMessage({ role: "user", content: "test" })],
    observedAt: at,
  });
  const completion = (extra_content) => ({
    id: "chatcmpl-malformed",
    object: "chat.completion",
    created: 1783790400,
    model: "gemini-compatible-test",
    choices: [{
      index: 0,
      message: { role: "assistant", content: null, tool_calls: [{ id: "call:malformed", type: "function", function: { name: "read", arguments: "{}" }, extra_content }] },
      finish_reason: "tool_calls",
    }],
  });
  assert.throws(() => inferenceResultFromOpenAIChat(completion("not-an-object"), call, at));
  assert.throws(() => inferenceResultFromOpenAIChat(completion([]), call, at));
  assert.throws(() => inferenceResultFromOpenAIChat({
    ...completion({}),
    choices: [{
      index: 0,
      message: { role: "assistant", content: null, tool_calls: [{ id: "call:unknown", type: "function", function: { name: "read", arguments: "{}" }, continuation_signature: "not-admitted" }] },
      finish_reason: "tool_calls",
    }],
  }, call, at));
});

test("model tools derive from RpcDescription rather than a vendor catalog", () => {
  const domain = schemaFrom({
    $id: "metroplat/test/double-input",
    type: "object",
    required: ["value"],
    properties: { value: { type: "number" } },
    additionalProperties: false,
  });
  const action = operation({ verb: "double", summary: "Double a number.", domain, run: ({ value }) => ({ value: value * 2 }) });
  const tools = inferenceToolsFromRpcDescription(describe(createOperationCatalog([action]), new Map([[action.ref, "held"]])));
  assert.equal(tools.length, 1);
  assert.equal(tools[0].operation, action.ref);
  assert.deepEqual(tools[0].inputSchema.properties.input, domain.schema);
});

test("provider effects are unreachable until RPC intent and standing are witnessed", async () => {
  const order = [];
  let idempotencyKey;
  const providerSource = (call, options) => ({
    async *[Symbol.asyncIterator]() {
      order.push("provider");
      idempotencyKey = options.idempotencyKey;
      yield inferenceSourceTerminal(inferenceResult({ call: call.id, model: call.model, stop: "completed", message: inferenceMessage({ role: "assistant", content: "done" }), observedAt: at }));
    },
  });
  const encounterHeads = new Map();
  const encounters = {
    causalHead(run) { return encounterHeads.get(run.id) ?? []; },
    admit(run, evidence) {
      order.push(evidence.kind);
      const event = `encounter-event:${order.length}`;
      encounterHeads.set(run.id, [event]);
      return { kind: "metroplat.encounter.admission", id: event, evidence: evidence.kind, run: run.id, eventIds: [event], material: evidence };
    },
    read() { return []; },
    follow() { return { async *[Symbol.asyncIterator]() {} }; },
  };
  const providerOperation = inferenceProviderOperation("test", providerSource, encounters, encounterExecutionControl());
  const heads = new Map();
  const witness = {
    causalHead(invocation) { return heads.get(invocation) ?? []; },
    admit(evidence) {
      order.push(evidence.kind);
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      const event = `event:${order.length}`;
      heads.set(invocation, [event]);
      return { kind: "metroplat.rpc.evidence-receipt", id: event, evidence: evidence.kind, eventIds: [event] };
    },
  };
  const authorize = authorizationFromStanding(new Map([[providerOperation.ref, "held"]]));
  const port = witnessedInferenceEncounterPort({ operation: providerOperation, encounters, witness, authorize, now: () => at });
  const call = inferenceCall({ request: "provider:1", subject: "agent:test", model: "model:test", messages: [inferenceMessage({ role: "user", content: "go" })], observedAt: at });
  const result = await port(call).settled;
  assert.equal(result.kind, "metroplat.inference.result");
  assert.deepEqual(order, [
    "metroplat.rpc.attempt",
    "metroplat.rpc.decision",
    "metroplat.encounter.opened",
    "provider",
    "metroplat.encounter.contribution",
    "metroplat.rpc.outcome",
  ]);
  assert.match(idempotencyKey, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.deepEqual(result.causes, ["event:6"]);
});

test("inference provider execution follows live subject capability standing", async () => {
  let executions = 0;
  let assertions = [];
  const providerSource = (call) => ({
    async *[Symbol.asyncIterator]() {
      executions += 1;
      yield inferenceSourceTerminal(inferenceResult({
        call: call.id,
        model: call.model,
        stop: "completed",
        message: inferenceMessage({ role: "assistant", content: "done" }),
        observedAt: at,
      }));
    },
  });
  const encounterHeads = new Map();
  const encounters = {
    causalHead(run) { return encounterHeads.get(run.id) ?? []; },
    admit(run, evidence) {
      const event = `encounter-event:${encounterHeads.size + 1}`;
      encounterHeads.set(run.id, [event]);
      return { kind: "metroplat.encounter.admission", id: event, evidence: evidence.kind, run: run.id, eventIds: [event], material: evidence };
    },
    read() { return []; },
    follow() { return { async *[Symbol.asyncIterator]() {} }; },
  };
  const provider = inferenceProviderOperation("subject-test", providerSource, encounters, encounterExecutionControl());
  const witnessHeads = new Map();
  let witnessed = 0;
  const witness = {
    causalHead(invocation) { return witnessHeads.get(invocation) ?? []; },
    admit(evidence) {
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      const event = `rpc-event:${++witnessed}`;
      witnessHeads.set(invocation, [event]);
      return { kind: "metroplat.rpc.evidence-receipt", id: event, evidence: evidence.kind, eventIds: [event] };
    },
  };
  const authorize = authorizationFromCapabilityAssertions(
    authorizationFromStanding(new Map([[provider.ref, "held"]])),
    () => assertions,
  );
  const port = witnessedInferenceEncounterPort({ operation: provider, encounters, witness, authorize, now: () => at });
  const request = (id) => inferenceCall({
    request: id,
    subject: "agent:test",
    model: "model:test",
    messages: [inferenceMessage({ role: "user", content: "go" })],
    observedAt: at,
  });
  const grants = capabilityGrant(`inference:${provider.ref}`, provider.verb);

  const unknown = await port(request("provider:unknown")).settled;
  assert.equal(unknown.kind, "metroplat.inference.obstruction");
  assert.match(unknown.reasons.join("; "), /subject standing is unknown/u);
  assert.equal(executions, 0);

  assertions = [grantAssertion("issuer:test", "agent:test", grants, at)];
  const held = await port(request("provider:held")).settled;
  assert.equal(held.kind, "metroplat.inference.result");
  assert.equal(executions, 1);

  assertions = [...assertions, revokeAssertion("issuer:test", "agent:test", grants, at)];
  const contested = await port(request("provider:contested")).settled;
  assert.equal(contested.kind, "metroplat.inference.obstruction");
  assert.match(contested.reasons.join("; "), /subject standing is contested/u);
  assert.equal(executions, 1);
});

test("the northbound OpenAI guest ABI translates through the canonical inference encounter", async () => {
  let admitted = 0;
  let received;
  const response = await routeOpenAIChatGuest({
    method: "POST",
    path: "/v1/chat/completions",
    query: {},
    body: JSON.stringify({ model: "guest-model", messages: [{ role: "user", content: "hello" }], user: "guest:alice" }),
  }, {
    now: () => at,
    onArrival() {
      admitted += 1;
      return { ok: true, cloudEventIdentity: "arrival:guest", admission: { statements: [{ id: "event:arrival" }] } };
    },
  }, {
    subject: "guest:authorized",
    inference(call) {
      received = call;
      const outcome = inferenceResult({
        call: call.id,
        model: call.model,
        stop: "completed",
        message: inferenceMessage({ role: "assistant", content: "hello back" }),
        observedAt: at,
        causes: ["event:provider-outcome"],
      });
      return {
        encounter: "encounter:guest",
        run: { kind: "metroplat.encounter.run", id: "run:guest" },
        admissions: { async *[Symbol.asyncIterator]() {} },
        settled: Promise.resolve(outcome),
      };
    },
  });
  assert.equal(admitted, 1);
  assert.equal(received.kind, "metroplat.inference.call");
  assert.equal(received.request, "arrival:guest");
  assert.equal(received.subject, "guest:authorized");
  assert.equal(received.extensions["openai.chat-completions.request"].user, "guest:alice");
  assert.deepEqual(received.causes, ["event:arrival"]);
  assert.equal(response.status, 200);
  const wire = JSON.parse(response.body);
  assert.equal(wire.object, "chat.completion");
  assert.equal(wire.choices[0].message.content, "hello back");
});

test("the OpenAI provider adapter returns typed failure conditions", async () => {
  const call = inferenceCall({ request: "failure:1", subject: "agent:test", model: "model:test", messages: [inferenceMessage({ role: "user", content: "go" })], observedAt: at });
  const env = { OPENAI_BASE_URL: "https://provider.invalid/v1", OPENAI_API_KEY: "secret" };
  const cases = [
    ["configuration", openAIChatInferenceSource({ env: {}, now: () => at })],
    ["unauthorized", openAIChatInferenceSource({ env, now: () => at, fetch: async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }) })],
    ["rate-limited", openAIChatInferenceSource({ env, now: () => at, fetch: async () => new Response(JSON.stringify({ error: { message: "slow down" } }), { status: 429 }) })],
    ["rejected", openAIChatInferenceSource({ env, now: () => at, fetch: async () => new Response("broken", { status: 500 }) })],
    ["malformed", openAIChatInferenceSource({ env, now: () => at, fetch: async () => new Response("data: not json\n\n", { status: 200 }) })],
    ["unreachable", openAIChatInferenceSource({ env, now: () => at, fetch: async () => { throw new Error("offline"); } })],
  ];
  for (const [condition, source] of cases) {
    const result = await terminalOf(source, call);
    assert.equal(result.kind, "metroplat.inference.obstruction");
    assert.equal(result.condition, condition);
  }

  const cancelled = new AbortController();
  cancelled.abort();
  const cancelledResult = await terminalOf(openAIChatInferenceSource({ env, now: () => at, fetch: async (_url, init) => {
    if (init.signal?.aborted) throw new DOMException("aborted", "AbortError");
    return new Response();
  } }), call, { signal: cancelled.signal });
  assert.equal(cancelledResult.condition, "cancelled");

  const timeoutResult = await terminalOf(openAIChatInferenceSource({ env, now: () => at, timeoutMs: 1, fetch: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  }) }), call);
  assert.equal(timeoutResult.condition, "timeout");
});

test("OpenAI Responses is a lossless reading and agrees with Chat on canonical identity", () => {
  const responsesWire = Object.freeze({
    model: "gpt-test",
    instructions: "be exact",
    input: Object.freeze([Object.freeze({ role: "user", content: "double two" })]),
    tools: Object.freeze([Object.freeze({ type: "function", name: "double", description: "Double a number.", parameters: Object.freeze({ type: "object", properties: Object.freeze({ input: Object.freeze({ type: "number" }) }), required: Object.freeze(["input"]), additionalProperties: false }), strict: true })]),
    temperature: 0,
  });
  const context = { request: "request:cross-wire", subject: "agent:test", observedAt: at };
  const responseCall = inferenceCallFromOpenAIResponse(responsesWire, context);
  assert.deepEqual(inferenceCallToOpenAIResponse(responseCall), responsesWire);
  const chatCall = inferenceCallFromOpenAIChat({
    model: "gpt-test",
    messages: [{ role: "system", content: "be exact" }, { role: "user", content: "double two" }],
    tools: [{ type: "function", function: { name: "double", description: "Double a number.", parameters: { type: "object", properties: { input: { type: "number" } }, required: ["input"], additionalProperties: false }, strict: true } }],
    temperature: 0,
    user: "agent:test",
  }, context);
  assert.equal(responseCall.id, chatCall.id);

  const chatResult = inferenceResultFromOpenAIChat({
    id: "chatcmpl-cross",
    object: "chat.completion",
    created: 1783790400,
    model: "gpt-test",
    choices: [{ index: 0, message: { role: "assistant", content: "four" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
  }, chatCall, at);
  const responseResult = inferenceResultFromOpenAIResponse({
    id: "resp-cross",
    object: "response",
    created_at: 1783790400,
    model: "gpt-test",
    status: "completed",
    output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "four", annotations: [] }] }],
    usage: { input_tokens: 5, output_tokens: 1, total_tokens: 6 },
  }, responseCall, at);
  assert.equal(responseResult.id, chatResult.id);
});

test("Anthropic Messages is an independent lossless reading with cross-provider identity", () => {
  const anthropicWire = Object.freeze({
    model: "shared-model",
    max_tokens: 64,
    system: "be exact",
    messages: Object.freeze([Object.freeze({ role: "user", content: "double two" })]),
    tools: Object.freeze([Object.freeze({ name: "double", description: "Double a number.", input_schema: Object.freeze({ type: "object", properties: Object.freeze({ input: Object.freeze({ type: "number" }) }), required: Object.freeze(["input"]), additionalProperties: false }), strict: true })]),
    temperature: 0,
  });
  const context = { request: "request:provider-equivalence", subject: "agent:test", observedAt: at };
  const anthropicCall = inferenceCallFromAnthropicMessage(anthropicWire, context);
  assert.deepEqual(inferenceCallToAnthropicMessage(anthropicCall), anthropicWire);
  const chatCall = inferenceCallFromOpenAIChat({
    model: "shared-model",
    max_completion_tokens: 64,
    messages: [{ role: "system", content: "be exact" }, { role: "user", content: "double two" }],
    tools: [{ type: "function", function: { name: "double", description: "Double a number.", parameters: { type: "object", properties: { input: { type: "number" } }, required: ["input"], additionalProperties: false }, strict: true } }],
    temperature: 0,
    user: "agent:test",
  }, context);
  assert.equal(anthropicCall.id, chatCall.id);

  const chatResult = inferenceResultFromOpenAIChat({
    id: "chat-provider",
    object: "chat.completion",
    created: 1783790400,
    model: "shared-model",
    choices: [{ index: 0, message: { role: "assistant", content: "four" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
  }, chatCall, at);
  const anthropicResult = inferenceResultFromAnthropicMessage({
    id: "msg_provider",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: "four" }],
    model: "shared-model",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 1 },
  }, anthropicCall, at);
  assert.equal(anthropicResult.id, chatResult.id);
});

test("Anthropic provider adapter implements the same source without vendor leakage", async () => {
  let observed;
  const source = anthropicMessagesInferenceSource({
    env: { ANTHROPIC_BASE_URL: "https://anthropic.invalid", ANTHROPIC_API_KEY: "anthropic-secret" },
    now: () => at,
    fetch: async (url, init) => {
      observed = { url, headers: init.headers, body: JSON.parse(init.body) };
      const events = [
        { type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", content: [], model: "claude-test", stop_reason: null, stop_sequence: null, usage: { input_tokens: 2, output_tokens: 0 } } },
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "done" } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } },
        { type: "message_stop" },
      ];
      return new Response(events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), { status: 200, headers: { "content-type": "text/event-stream" } });
    },
  });
  const call = inferenceCall({ request: "anthropic:1", subject: "agent:test", model: "claude-test", messages: [inferenceMessage({ role: "user", content: "go" })], generation: { maxOutputTokens: 64 }, observedAt: at });
  const result = await terminalOf(source, call, { idempotencyKey: "rpc-idempotency" });
  assert.equal(result.kind, "metroplat.inference.result");
  assert.equal(result.message.content, "done");
  assert.equal(observed.url, "https://anthropic.invalid/v1/messages");
  assert.equal(observed.headers["x-api-key"], "anthropic-secret");
  assert.equal(observed.headers["anthropic-version"], "2023-06-01");
  assert.equal(observed.headers["idempotency-key"], "rpc-idempotency");
  assert.equal(observed.body.max_tokens, 64);
  assert.equal(observed.body.stream, true);
});
