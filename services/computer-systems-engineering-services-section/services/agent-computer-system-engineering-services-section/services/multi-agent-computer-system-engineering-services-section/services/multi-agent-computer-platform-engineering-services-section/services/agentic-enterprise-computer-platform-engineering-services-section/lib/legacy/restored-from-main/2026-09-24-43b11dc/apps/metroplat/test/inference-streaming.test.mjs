import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { inferenceCall, inferenceMessage, inferenceObstruction, inferenceResult } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "../src/agents/inference/rpc.mjs";
import { inferenceSourceMove, inferenceSourceTerminal, inferenceStreamMove } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind";
import { inferenceTranscriptFromEncounterReading } from "../src/agents/inference/encounter.mjs";
import { openAIChatInferenceSource, openAIResponsesInferenceSource } from "@red-cup-engineering/computer-inference-engine/openai/inference-client";
import { anthropicMessagesInferenceSource } from "@red-cup-engineering/computer-inference-engine/anthropic/inference-client";
import { journalEncounterStore } from "../src/integrations/filesystem/services/encounter-store.mjs";
import { journalRpcWitness } from "../src/integrations/filesystem/services/rpc-witness.mjs";
import { authorizationFromStanding } from "../src/rpc/dispatch.mjs";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { encounterCancellationOperation } from "../src/encounter/rpc.mjs";
import { encounterExecutionControl } from "../src/encounter/control.mjs";
import { encounterReading } from "../src/encounter/reading.mjs";
import { tokenUsageEventFromInferenceEncounter } from "../src/integrations/token-usage/inference-encounter.mjs";
import { createOperationCatalog } from "../src/rpc/operation.mjs";
import { dispatch } from "../src/rpc/dispatch.mjs";
import { invocation } from "../src/rpc/invocation.mjs";

const at = "2026-07-11T12:00:00.000Z";
const env = { OPENAI_BASE_URL: "https://provider.invalid/v1", OPENAI_API_KEY: "stream-secret" };

function call() {
  return inferenceCall({
    request: "stream:request",
    subject: "agent:stream",
    model: "model:stream",
    messages: [inferenceMessage({ role: "user", content: "say hello" })],
    observedAt: at,
  });
}

function sseBody(done = true) {
  const frames = [
    `data: ${JSON.stringify({ id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1783790400, model: "model:stream", choices: [{ index: 0, delta: { role: "assistant", content: "Hel" }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1783790400, model: "model:stream", choices: [{ index: 0, delta: { content: "lo" }, finish_reason: "stop" }] })}\n\n`,
    `data: ${JSON.stringify({ id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1783790400, model: "model:stream", choices: [], usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 } })}\n\n`,
    ...(done ? ["data: [DONE]\n\n"] : []),
  ].join("");
  const bytes = new TextEncoder().encode(frames);
  const cuts = [1, 7, 29, 83, 141, bytes.length - 5, bytes.length];
  let previous = 0;
  return new ReadableStream({
    start(controller) {
      for (const cut of cuts) {
        if (cut <= previous || cut > bytes.length) continue;
        controller.enqueue(bytes.slice(previous, cut));
        previous = cut;
      }
      if (previous < bytes.length) controller.enqueue(bytes.slice(previous));
      controller.close();
    },
  });
}

function source(done = true, observed = {}) {
  return openAIChatInferenceSource({
    env,
    now: () => at,
    fetch: async (url, init) => {
      observed.url = url;
      observed.headers = init.headers;
      observed.body = JSON.parse(init.body);
      return new Response(sseBody(done), { status: 200, headers: { "content-type": "text/event-stream" } });
    },
  });
}

test("fragmented OpenAI SSE becomes canonical incremental moves and one folded terminal", async () => {
  const observed = {};
  const events = [];
  for await (const event of source(true, observed)(call(), { idempotencyKey: "rpc:stream" })) events.push(event);

  assert.equal(observed.url, "https://provider.invalid/v1/chat/completions");
  assert.equal(observed.headers.authorization, "Bearer stream-secret");
  assert.equal(observed.headers["idempotency-key"], "rpc:stream");
  assert.equal(observed.body.stream, true);
  assert.equal(observed.body.stream_options.include_usage, true);

  const moves = events.filter(({ kind }) => kind === "metroplat.inference.source-move").map(({ move }) => move);
  assert.deepEqual(moves.map(({ type }) => type), [
    "inference.response-start",
    "inference.text-delta",
    "inference.text-delta",
    "inference.finish",
    "inference.usage",
  ]);
  assert.deepEqual(moves.map(({ sequence }) => sequence), [0, 1, 2, 3, 4]);
  const terminal = events.at(-1);
  assert.equal(terminal.kind, "metroplat.inference.source-terminal");
  assert.equal(terminal.outcome.kind, "metroplat.inference.result");
  assert.equal(terminal.outcome.message.content, "Hello");
  assert.equal(terminal.outcome.usage.totalTokens, 6);
});

test("a provider stream without its terminal marker becomes a typed truncation obstruction", async () => {
  const events = [];
  for await (const event of source(false)(call())) events.push(event);
  const terminal = events.at(-1);
  assert.equal(terminal.kind, "metroplat.inference.source-terminal");
  assert.equal(terminal.outcome.kind, "metroplat.inference.obstruction");
  assert.equal(terminal.outcome.condition, "truncated-stream");
  assert.equal(terminal.outcome.retryable, true);
});

test("one witnessed inference session exposes only admitted moves and causally closes RPC after its terminal", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-inference-session-"));
  try {
    const rootName = "@emsenn/metroplat";
    const encounters = journalEncounterStore(root, { namespace: rootName, pollIntervalMs: 10 });
    const operation = inferenceProviderOperation("openai.chat-completions", source(), encounters, encounterExecutionControl());
    const witness = journalRpcWitness(root, { namespace: rootName });
    const start = witnessedInferenceEncounterPort({
      operation,
      encounters,
      witness,
      authorize: authorizationFromStanding(new Map([[operation.ref, "held"]])),
      now: () => at,
    });
    const session = start(call());
    const admissions = [];
    const reading = (async () => {
      for await (const admission of session.admissions) admissions.push(admission);
    })();
    const [outcome] = await Promise.all([session.settled, reading]);
    assert.equal(outcome.kind, "metroplat.inference.result");

    const evidence = admissions.map(({ material }) => material);
    assert.equal(evidence[0].kind, "metroplat.encounter.opened");
    const contributions = evidence.filter(({ kind }) => kind === "metroplat.encounter.contribution");
    assert.deepEqual(contributions.map(({ contribution }) => contribution.kind === "metroplat.encounter.move" ? contribution.type : contribution.type), [
      "inference.response-start",
      "inference.text-delta",
      "inference.text-delta",
      "inference.finish",
      "inference.usage",
      "metroplat.inference.result",
    ]);

    const terminalAdmission = admissions.find(({ material }) => material.kind === "metroplat.encounter.contribution" && material.contribution.kind === "metroplat.encounter.terminal");
    assert.ok(terminalAdmission);
    const rpcFeed = journal.feed(root, "rpc", at, { rootName, subject: "rpc" });
    const rpcEvents = openJournal(root).read(rpcFeed);
    const rpcOutcome = rpcEvents.find((event) => event.observation.payload[1].kind === "metroplat.rpc.outcome");
    assert.ok(rpcOutcome);
    assert.equal(rpcOutcome.core.causes.includes(terminalAdmission.eventIds[0]), true);

    const settledReading = encounterReading(session.run, encounters.read(session.run), encounters.causalHead(session.run));
    const transcript = inferenceTranscriptFromEncounterReading(settledReading);
    assert.equal(transcript.standing, "settled");
    assert.equal(transcript.moves.some(({ type }) => type === "inference.text-delta"), true);
    const usage = tokenUsageEventFromInferenceEncounter(settledReading, { provider: "openai", agentId: "agent:stream" });
    assert.equal(usage.usage.totalTokens, 6);
    assert.deepEqual(usage.evidence, settledReading.frontier);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Anthropic message events map to the same canonical move vocabulary and fold streamed tool input", async () => {
  const events = [
    { type: "message_start", message: { id: "msg_stream", type: "message", role: "assistant", content: [], model: "claude-stream", stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } },
    { type: "ping" },
    { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "tool_stream", name: "double", input: {} } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: "{\"value\":" } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: "2}" } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 3 } },
    { type: "message_stop" },
  ];
  const wire = events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
  let observed;
  const source = anthropicMessagesInferenceSource({
    env: { ANTHROPIC_BASE_URL: "https://anthropic.invalid", ANTHROPIC_API_KEY: "anthropic-stream-secret" },
    now: () => at,
    fetch: async (url, init) => {
      observed = { url, headers: init.headers, body: JSON.parse(init.body) };
      return new Response(new TextEncoder().encode(wire), { status: 200, headers: { "content-type": "text/event-stream" } });
    },
  });
  const input = inferenceCall({
    request: "anthropic:stream",
    subject: "agent:stream",
    model: "claude-stream",
    messages: [inferenceMessage({ role: "user", content: "double two" })],
    generation: { maxOutputTokens: 64 },
    observedAt: at,
  });
  const streamed = [];
  for await (const event of source(input, { idempotencyKey: "anthropic-rpc" })) streamed.push(event);
  assert.equal(observed.url, "https://anthropic.invalid/v1/messages");
  assert.equal(observed.headers["x-api-key"], "anthropic-stream-secret");
  assert.equal(observed.headers["idempotency-key"], "anthropic-rpc");
  assert.equal(observed.body.stream, true);
  const moves = streamed.filter(({ kind }) => kind === "metroplat.inference.source-move").map(({ move }) => move);
  assert.deepEqual(moves.map(({ type }) => type), [
    "inference.response-start",
    "inference.tool-call-delta",
    "inference.tool-call-delta",
    "inference.tool-call-delta",
    "inference.finish",
    "inference.usage",
  ]);
  const terminal = streamed.at(-1);
  assert.equal(terminal.kind, "metroplat.inference.source-terminal");
  assert.equal(terminal.outcome.kind, "metroplat.inference.result");
  assert.equal(terminal.outcome.stop, "tool-moves");
  assert.deepEqual(terminal.outcome.toolMoves[0].input, { value: 2 });
  assert.equal(terminal.outcome.usage.totalTokens, 8);
});

test("OpenAI Responses native events project directly to canonical moves and a terminal result", async () => {
  const completed = {
    id: "resp_stream",
    object: "response",
    created_at: 1783790400,
    model: "responses-stream",
    status: "completed",
    output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "four", annotations: [] }] }],
    usage: { input_tokens: 5, output_tokens: 1, total_tokens: 6 },
  };
  const events = [
    { type: "response.created", sequence_number: 0, response: { ...completed, status: "in_progress", output: [], usage: null } },
    { type: "response.output_text.delta", sequence_number: 1, output_index: 0, content_index: 0, delta: "four" },
    { type: "response.completed", sequence_number: 2, response: completed },
  ];
  const wire = events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
  let observed;
  const source = openAIResponsesInferenceSource({
    env,
    now: () => at,
    fetch: async (url, init) => {
      observed = { url, body: JSON.parse(init.body), headers: init.headers };
      return new Response(new TextEncoder().encode(wire), { status: 200, headers: { "content-type": "text/event-stream" } });
    },
  });
  const input = inferenceCall({ request: "responses:stream", subject: "agent:stream", model: "responses-stream", messages: [inferenceMessage({ role: "user", content: "double two" })], observedAt: at });
  const streamed = [];
  for await (const event of source(input, { idempotencyKey: "responses-rpc" })) streamed.push(event);
  assert.equal(observed.url, "https://provider.invalid/v1/responses");
  assert.equal(observed.body.stream, true);
  assert.equal(observed.headers["idempotency-key"], "responses-rpc");
  const moves = streamed.filter(({ kind }) => kind === "metroplat.inference.source-move").map(({ move }) => move);
  assert.deepEqual(moves.map(({ type }) => type), ["inference.response-start", "inference.text-delta", "inference.finish", "inference.usage"]);
  const terminal = streamed.at(-1);
  assert.equal(terminal.kind, "metroplat.inference.source-terminal");
  assert.equal(terminal.outcome.kind, "metroplat.inference.result");
  assert.equal(terminal.outcome.message.content, "four");
  assert.equal(terminal.outcome.usage.totalTokens, 6);
});

test("execution cancellation is a separately witnessed RPC act and causally supports the cancelled terminal", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-inference-cancel-"));
  try {
    const rootName = "@emsenn/metroplat";
    const encounters = journalEncounterStore(root, { namespace: rootName, pollIntervalMs: 10 });
    const control = encounterExecutionControl();
    let sourceStarted;
    const started = new Promise((resolve) => { sourceStarted = resolve; });
    const cancellable = (input, options) => ({
      async *[Symbol.asyncIterator]() {
        yield inferenceSourceMove(inferenceStreamMove({ type: "inference.response-start", channel: "response", sequence: 0, body: { model: input.model }, observedAt: at }));
        sourceStarted();
        await new Promise((resolve) => options.signal.addEventListener("abort", resolve, { once: true }));
        yield inferenceSourceTerminal(inferenceObstruction({ call: input.id, condition: "cancelled", reasons: ["cancelled by governed act"], retryable: false, observedAt: at, causes: [input.id] }));
      },
    });
    const provider = inferenceProviderOperation("cancel-test", cancellable, encounters, control);
    const cancel = encounterCancellationOperation(control, "cancel-test-encounter");
    const witness = journalRpcWitness(root, { namespace: rootName });
    const authorize = authorizationFromStanding(new Map([[provider.ref, "held"], [cancel.ref, "held"]]));
    const start = witnessedInferenceEncounterPort({ operation: provider, encounters, witness, authorize, now: () => at });
    const session = start(call());
    await started;

    const cancellation = invocation({
      request: "cancel:request",
      subject: "agent:stream",
      operation: cancel.ref,
      verb: cancel.verb,
      resource: `encounter:${session.run.id}`,
      input: { run: session.run.id },
      caller: { transport: "test" },
      observedAt: at,
    });
    const cancellationReceipt = await dispatch({ catalog: createOperationCatalog([cancel]), witness, authorize, now: () => at }, cancellation);
    assert.equal(cancellationReceipt.ok, true);
    assert.equal(cancellationReceipt.value.cancelled, true);
    const outcome = await session.settled;
    assert.equal(outcome.kind, "metroplat.inference.obstruction");
    assert.equal(outcome.condition, "cancelled");

    const rpcFeed = journal.feed(root, "rpc", at, { rootName, subject: "rpc" });
    const rpcEvents = openJournal(root).read(rpcFeed);
    const cancellationDecision = rpcEvents.find((event) => event.observation.payload[1].kind === "metroplat.rpc.decision" && event.observation.payload[2].decision.invocation === cancellation.id);
    assert.ok(cancellationDecision);
    const terminalAdmission = encounters.read(session.run).find(({ material }) => material.kind === "metroplat.encounter.contribution" && material.contribution.kind === "metroplat.encounter.terminal");
    assert.ok(terminalAdmission);
    const encounterFeed = journal.feed(root, "encounter", session.run.openedAt, { rootName, subject: `encounter-${session.run.id}` });
    const terminalEvent = openJournal(root).read(encounterFeed).find(({ id }) => id === terminalAdmission.eventIds[0]);
    assert.equal(terminalEvent.core.causes.includes(cancellationDecision.id), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("redelivery reuses one run while deliberate retry preserves the encounter and creates a linked run", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-inference-retry-"));
  try {
    const encounters = journalEncounterStore(root, { pollIntervalMs: 10 });
    const control = encounterExecutionControl();
    let executions = 0;
    const finite = (input) => ({
      async *[Symbol.asyncIterator]() {
        executions += 1;
        yield inferenceSourceTerminal(inferenceResult({ call: input.id, model: input.model, stop: "completed", message: inferenceMessage({ role: "assistant", content: `execution:${executions}` }), observedAt: at }));
      },
    });
    const provider = inferenceProviderOperation("retry-test", finite, encounters, control);
    const witness = journalRpcWitness(root);
    const start = witnessedInferenceEncounterPort({ operation: provider, encounters, witness, authorize: authorizationFromStanding(new Map([[provider.ref, "held"]])), now: () => at });
    const semanticCall = call();
    const first = start(semanticCall);
    await first.settled;
    const laterCall = inferenceCall({
      request: semanticCall.request,
      subject: semanticCall.subject,
      model: semanticCall.model,
      messages: semanticCall.messages,
      observedAt: "2026-07-12T12:00:00.000Z",
      causes: ["new-arrival"],
    });
    assert.equal(laterCall.id, semanticCall.id);
    const redelivery = start(laterCall);
    await redelivery.settled;
    assert.equal(redelivery.run.id, first.run.id);
    assert.equal(executions, 1);

    const retry = start(semanticCall, { request: "stream:request:attempt-2", retryOf: first.run.id });
    await retry.settled;
    assert.equal(retry.encounter, first.encounter);
    assert.notEqual(retry.run.id, first.run.id);
    assert.equal(retry.run.retryOf, first.run.id);
    assert.equal(executions, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
