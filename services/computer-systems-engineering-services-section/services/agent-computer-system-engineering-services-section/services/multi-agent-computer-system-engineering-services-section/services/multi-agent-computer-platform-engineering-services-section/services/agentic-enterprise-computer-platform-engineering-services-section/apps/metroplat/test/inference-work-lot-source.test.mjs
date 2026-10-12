import assert from "node:assert/strict";
import test from "node:test";

import { InferenceWorkLotClientError } from "@red-cup-engineering/computer-inference-engine/dispatch/client";
import { inferenceCall, inferenceMessage } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { BOUNDED_INFERENCE_SERVICE_MODEL, METROPLAT_INFERENCE_MARKET_CUSTOMER, inferenceWorkLotSource } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import {
  INFERENCE_ROUTING_FUNCTION as WORKER_ROUTING_FUNCTION,
  METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV,
  METROPLAT_INFERENCE_SOURCE_ENV,
  infographInferenceSource,
} from "@red-cup-engineering/metroplat/inference-source";
import { INFERENCE_ROUTING_FUNCTION as DISPATCH_ROUTING_FUNCTION } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-dispatch";

const at = "2026-08-28T12:00:00.000Z";
const card = "http://127.0.0.1:8800/.well-known/agent-card.json";
const requestNi = `ni:///sha-256;${"A".repeat(43)}`;
const outputNi = `ni:///sha-256;${"B".repeat(43)}`;
const resultNi = `ni:///sha-256;${"C".repeat(43)}`;
const configurationIdentity = `ni:///sha-256;${"D".repeat(43)}`;

function call(overrides = {}) {
  return inferenceCall({
    request: "request:bounded:1",
    subject: "agent:test",
    model: BOUNDED_INFERENCE_SERVICE_MODEL,
    messages: [inferenceMessage({ role: "system", content: "Be exact." }), inferenceMessage({ role: "user", content: "Explain two." })],
    observedAt: at,
    ...overrides,
  });
}

function source(request, overrides = {}) {
  return inferenceWorkLotSource({
    agentUrl: card,
    desiredUse: "production-assistance",
    now: () => at,
    request,
    ...overrides,
  });
}

async function eventsOf(provider, inferenceCall, options) {
  const events = [];
  for await (const event of provider(inferenceCall, options)) events.push(event);
  return events;
}

test("bounded market source validates a trustworthy standard Agent Card URL", () => {
  assert.throws(() => source(async () => {}, { agentUrl: "http://market.example/.well-known/agent-card.json" }), /HTTPS standard Agent Card/u);
  assert.throws(() => source(async () => {}, { agentUrl: "https://market.example/card.json" }), /HTTPS standard Agent Card/u);
  assert.doesNotThrow(() => source(async () => {}, { agentUrl: "https://market.example/.well-known/agent-card.json" }));
});

test("Infograph defaults to the shared zero-cash router unless a complete single endpoint is configured", () => {
  assert.equal(infographInferenceSource({ env: {} }).provider, "zero-cash-providers");
  assert.equal(infographInferenceSource({ env: { [METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV]: card } }).provider, "zero-cash-providers");
  assert.equal(infographInferenceSource({ env: { OPENAI_BASE_URL: "http://127.0.0.1:1234/v1", OPENAI_API_KEY: "fixture" } }).provider, "zero-cash-providers");
  assert.equal(infographInferenceSource({ env: { [METROPLAT_INFERENCE_SOURCE_ENV]: "openai.chat-completions", OPENAI_BASE_URL: "http://127.0.0.1:1234/v1", OPENAI_API_KEY: "fixture" } }).provider, "openai.chat-completions");
  assert.equal(infographInferenceSource({ env: { [METROPLAT_INFERENCE_SOURCE_ENV]: "zero-cash-providers" } }).provider, "zero-cash-providers");
  assert.strictEqual(WORKER_ROUTING_FUNCTION, DISPATCH_ROUTING_FUNCTION, "worker and dispatch_inference expose the same routing function");
  assert.throws(() => infographInferenceSource({ env: { [METROPLAT_INFERENCE_SOURCE_ENV]: "" } }), /METROPLAT_INFERENCE_SOURCE is required/u);
  assert.throws(() => infographInferenceSource({ env: { [METROPLAT_INFERENCE_SOURCE_ENV]: "inference-work-lot.market" } }), /METROPLAT_INFERENCE_MARKET_AGENT_CARD is required/u);
  assert.throws(() => infographInferenceSource({ env: { [METROPLAT_INFERENCE_SOURCE_ENV]: "automatic" } }), /unsupported inference source/u);
  assert.equal(infographInferenceSource({ env: {
    [METROPLAT_INFERENCE_SOURCE_ENV]: "inference-work-lot.market",
    [METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV]: card,
  } }).provider, "inference-work-lot.market");
});

test("unpreservable extensions and foreign service aliases refuse before market contact", async () => {
  let contacts = 0;
  const provider = source(async () => { contacts += 1; throw new Error("unreachable"); });
  const controlled = await eventsOf(provider, call({ extensions: { "other-provider": { mode: "secret" } } }));
  assert.equal(contacts, 0);
  assert.equal(controlled.at(-1).outcome.condition, "rejected");
  assert.match(controlled.at(-1).outcome.reasons[0], /extension namespaces/u);

  const unsupportedField = await eventsOf(provider, call({
    extensions: { "openai.chat-completions.request": { logprobs: true } },
  }));
  assert.equal(contacts, 0);
  assert.equal(unsupportedField.at(-1).outcome.condition, "rejected");
  assert.match(unsupportedField.at(-1).outcome.reasons[0], /cannot preserve OpenAI request fields: logprobs/u);

  const foreign = await eventsOf(provider, call({ model: "provider/native-model" }));
  assert.equal(contacts, 0);
  assert.equal(foreign.at(-1).outcome.condition, "configuration");
});

test("market carries a standard tool turn and leaves execution to the MetroPlat caller", async () => {
  const submissions = [];
  const provider = source(async (input) => {
    submissions.push(input.request);
    const toolRound = submissions.length === 1;
    return {
      exchange: { inputNi: requestNi, outputNi }, resultNi,
      provider: { account: "urn:account:market" },
      result: {
        outcome: "candidate-pending-customer-acceptance", disposition: "candidate-delivered", integrationAccepted: false,
        provider: "urn:ame:openrouter", model: "cohere/north-mini-code:free",
        configurationIdentity,
        candidate: toolRound
          ? { id: "chatcmpl-tool", object: "chat.completion", created: 1, model: "cohere/north-mini-code:free", choices: [{ index: 0, message: { role: "assistant", content: null, tool_calls: [{ id: "call-work", type: "function", function: { name: "read_work", arguments: '{"id":"federated-compute-resource-placement-2026-09-07"}' } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 } }
          : { id: "chatcmpl-final", object: "chat.completion", created: 2, model: "cohere/north-mini-code:free", choices: [{ index: 0, message: { role: "assistant", content: "The work item is open." }, finish_reason: "stop" }], usage: { prompt_tokens: 15, completion_tokens: 6, total_tokens: 21 } },
      },
    };
  }, { agentBounds: { maximumRequests: 2, maximumToolCalls: 1, maximumOutputTokens: 1024, maximumTokensPerRequest: 512, maximumDepth: 0, maximumToolRounds: 1 } });
  const firstCall = call({
    generation: { maxOutputTokens: 768, temperature: 0.2, topP: 0.8, stopSequences: ["END"] },
    tools: [{ name: "read_work", description: "Read one work item", inputSchema: { type: "object", required: ["id"] } }],
    extensions: { "openai.chat-completions.request": { tool_choice: "required", parallel_tool_calls: false, seed: 7 } },
  });
  const first = (await eventsOf(provider, firstCall)).at(-1).outcome;
  assert.equal(first.stop, "tool-moves");
  assert.equal(first.toolMoves[0].request, "call-work");
  assert.deepEqual(first.toolMoves[0].extensions["inference-work-lot.configuration-identity"], { configurationIdentity });
  assert.deepEqual(first.message.toolMoves[0].extensions["inference-work-lot.configuration-identity"], { configurationIdentity });
  assert.equal(submissions.length, 1, "the market returned the tool call but did not execute it");
  assert.equal(submissions[0].chatCompletion.model, undefined);
  assert.equal(submissions[0].chatCompletion.user, undefined);
  assert.equal(submissions[0].chatCompletion.tools[0].function.name, "read_work");
  assert.equal(submissions[0].chatCompletion.tool_choice, "required");
  assert.equal(submissions[0].chatCompletion.parallel_tool_calls, false);
  assert.equal(submissions[0].agentBounds.maximumTokensPerRequest, 512, "caller max output is clamped to its bound");
  assert.equal(submissions[0].context, undefined, "wire messages are carried only in chatCompletion");
  assert.equal(submissions[0].chatCompletion.messages[1].content, "Explain two.");

  let callerExecutions = 0;
  callerExecutions += 1;
  const secondCall = call({
    messages: [...firstCall.messages, first.message, inferenceMessage({ role: "tool", toolRequest: "call-work", content: '{"kind":"work-item","status":"open"}' })],
    tools: firstCall.tools,
    generation: firstCall.generation,
    extensions: firstCall.extensions,
  });
  const second = (await eventsOf(provider, secondCall)).at(-1).outcome;
  assert.equal(callerExecutions, 1);
  assert.equal(submissions.length, 2);
  assert.equal(submissions[1].workPlacement.requiredImplementationIdentity, configurationIdentity);
  assert.equal(submissions[1].chatCompletion.messages.at(-1).tool_call_id, "call-work");
  assert.equal(second.message.content, "The work item is open.");
  assert.equal(second.usage.totalTokens, 21);
});

test("market tool continuation refuses conflicting transcript affinity before contact", async () => {
  let contacts = 0;
  const provider = source(async () => { contacts += 1; throw new Error("unreachable"); });
  const first = inferenceMessage({
    role: "assistant",
    content: null,
    toolMoves: [{
      request: "call-a",
      name: "read_work",
      input: {},
      extensions: { "inference-work-lot.configuration-identity": { configurationIdentity: "ni:///sha-256;configuration-a" } },
    }],
  });
  const second = inferenceMessage({
    role: "assistant",
    content: null,
    toolMoves: [{
      request: "call-b",
      name: "read_work",
      input: {},
      extensions: { "inference-work-lot.configuration-identity": { configurationIdentity: "ni:///sha-256;configuration-b" } },
    }],
  });
  const outcome = (await eventsOf(provider, call({ messages: [...call().messages, first, second] }))).at(-1).outcome;
  assert.equal(contacts, 0);
  assert.equal(outcome.condition, "rejected");
  assert.match(outcome.reasons[0], /conflicting implementation identities/u);
});

test("market tool result without configuration affinity refuses before MetroPlat tool execution", async () => {
  const provider = source(async () => ({
    exchange: { inputNi: requestNi, outputNi }, resultNi, provider: { account: "urn:account:market" },
    result: {
      outcome: "candidate-pending-customer-acceptance", integrationAccepted: false, provider: "urn:ame:provider", model: "provider/model",
      candidate: { id: "chatcmpl-tool", object: "chat.completion", created: 1, model: "provider/model", choices: [{
        index: 0, message: { role: "assistant", content: null, tool_calls: [{ id: "call-work", type: "function", function: { name: "read_work", arguments: "{}" } }] }, finish_reason: "tool_calls",
      }] },
    },
  }));
  const outcome = (await eventsOf(provider, call({ tools: [{ name: "read_work", description: "Read", inputSchema: { type: "object" } }] }))).at(-1).outcome;
  assert.equal(outcome.condition, "malformed");
  assert.match(outcome.reasons[0], /omitted its implementation identity/u);
});

test("a constrained text result must return its exact implementation identity before projection", async () => {
  const provider = source(async () => ({
    exchange: { inputNi: requestNi, outputNi }, resultNi, provider: { account: "urn:account:market" },
    result: {
      outcome: "candidate-pending-customer-acceptance", integrationAccepted: false, provider: "urn:ame:provider", model: "provider/model",
      configurationIdentity: "ni:///sha-256;different-configuration", candidate: "plain text",
    },
  }), { workPlacement: { requiredImplementationIdentity: "ni:///sha-256;required-configuration" } });
  const outcome = (await eventsOf(provider, call())).at(-1).outcome;
  assert.equal(outcome.condition, "malformed");
  assert.match(outcome.reasons[0], /did not return the required implementation identity/u);
});

test("partial raw chat usage remains evidence instead of fabricated canonical counters", async () => {
  const provider = source(async () => ({
    exchange: { inputNi: requestNi, outputNi }, resultNi, provider: { account: "urn:account:market" },
    result: { outcome: "candidate-pending-customer-acceptance", integrationAccepted: false, provider: "urn:ame:provider", model: "provider/model", candidate: { id: "chatcmpl-partial", object: "chat.completion", created: 1, model: "provider/model", choices: [{ index: 0, message: { role: "assistant", content: "partial" }, finish_reason: "stop" }], usage: { completion_tokens: 3 } } },
  }));
  const outcome = (await eventsOf(provider, call())).at(-1).outcome;
  assert.equal(outcome.usage, undefined);
  assert.deepEqual(outcome.extensions["inference-work-lot"].rawChatCompletionUsage, { completion_tokens: 3 });
});

test("bounded source submits one endpoint-neutral lot and preserves selected provider provenance", async () => {
  let submitted;
  const provider = source(async (input) => {
    submitted = input;
    return {
      exchange: { inputNi: requestNi, outputNi },
      resultNi,
      provider: { account: "urn:account:market" },
      result: {
        outcome: "candidate-pending-customer-acceptance",
        disposition: "candidate-delivered",
        integrationAccepted: false,
        provider: "urn:ame:openrouter-inference-team",
        model: "openrouter/free-model",
        candidate: "Two is one plus one.",
        selectionRule: "pareto-frontier",
        marketRound: 0,
        routeDecision: outputNi,
        marketWitnesses: [requestNi, resultNi],
        evidence: { offer: "urn:offer:free" },
        consideration: { asset: "resolution-credit", amount: "20" },
      },
    };
  });
  const inferenceCall = call();
  const events = await eventsOf(provider, inferenceCall, { idempotencyKey: "attempt:stable" });

  assert.equal(submitted.agentUrl, card);
  assert.equal(submitted.attemptKey, "attempt:stable");
  assert.equal(submitted.request.customer, METROPLAT_INFERENCE_MARKET_CUSTOMER);
  assert.equal(submitted.request.workLotId, inferenceCall.id);
  assert.equal(submitted.request.taskClass, BOUNDED_INFERENCE_SERVICE_MODEL);
  assert.equal(submitted.request.model, undefined);
  assert.equal(submitted.request.provider, undefined);
  assert.equal(submitted.request.zeroCashOnly, undefined);
  assert.equal(submitted.request.agentBounds, undefined);
  assert.equal(submitted.request.context, undefined);
  assert.equal(submitted.request.chatCompletion.messages[0].content, "Be exact.");

  assert.deepEqual(events.slice(0, 3).map((event) => event.move.type), [
    "inference.response-start",
    "inference.text-delta",
    "inference.finish",
  ]);
  const outcome = events.at(-1).outcome;
  assert.equal(outcome.kind, "metroplat.inference.result");
  assert.equal(outcome.model, "openrouter/free-model");
  assert.equal(outcome.message.content, "Two is one plus one.");
  assert.equal(outcome.usage, undefined);
  assert.equal(outcome.extensions["inference-work-lot"].provider, "urn:ame:openrouter-inference-team");
  assert.equal(outcome.extensions["inference-work-lot"].requestNi, requestNi);
  assert.equal(outcome.extensions["inference-work-lot"].marketRound, 0);
  assert.equal(outcome.extensions["inference-work-lot"].routeDecision, outputNi);
  assert.deepEqual(outcome.extensions["inference-work-lot"].marketWitnesses, [requestNi, resultNi]);
});

test("Infograph's explicit market selection requests strict free bounded delegation", async () => {
  const configured = infographInferenceSource({ env: {
    [METROPLAT_INFERENCE_SOURCE_ENV]: "inference-work-lot.market",
    [METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV]: card,
  } });
  let submitted;
  const provider = inferenceWorkLotSource({
    agentUrl: card,
    desiredUse: "metroplat-production-assistance",
    zeroCashOnly: true,
    now: () => at,
    agentBounds: { maximumRequests: 8, maximumToolCalls: 8, maximumOutputTokens: 8192, maximumDepth: 2, maximumTokensPerRequest: 1024, maximumToolRounds: 4 },
    request: async (input) => {
      submitted = input;
      return { exchange: { inputNi: requestNi, outputNi }, resultNi, provider: { account: "urn:account:market" }, result: { outcome: "candidate-pending-customer-acceptance", disposition: "candidate-delivered", integrationAccepted: false, provider: "urn:ame:openrouter-inference-team", model: "cohere/north-mini-code:free", candidate: "ready" } };
    },
  });
  await eventsOf(provider, call());
  assert.equal(configured.provider, "inference-work-lot.market");
  assert.equal(submitted.request.zeroCashOnly, true);
  assert.deepEqual(submitted.request.agentBounds, { maximumRequests: 8, maximumToolCalls: 8, maximumOutputTokens: 8192, maximumDepth: 2, maximumTokensPerRequest: 1024, maximumToolRounds: 4 });
});

test("market resource policy and partial measurements survive the MetroPlat boundary", async () => {
  const workPlacement = {
    evaluatedAt: at,
    unknownAvailability: "refuse",
    resourceCeilings: [{ resource: "requests", unit: "request", amount: { numerator: "1", denominator: "1" } }],
  };
  const declaredResources = workPlacement.resourceCeilings;
  const measuredResources = {
    accountIdentity: null,
    windowIdentity: null,
    resources: [{ resource: "output-tokens", unit: "token", amount: { numerator: "0", denominator: "1" } }],
    unknown: ["input-tokens", "network-bytes"],
  };
  const providerEvidence = { measuredResources, exchanges: [{ usage: { completionTokens: 0 } }] };
  let submitted;
  const provider = source(async (input) => {
    submitted = input;
    return {
      exchange: { inputNi: requestNi, outputNi }, resultNi,
      provider: { account: "urn:account:market" },
      result: {
        outcome: "candidate-pending-customer-acceptance", integrationAccepted: false,
        provider: "urn:ame:provider", model: "provider/model", candidate: "",
        declaredResources, measuredResources, providerEvidence,
      },
    };
  }, { workPlacement });
  const outcome = (await eventsOf(provider, call())).at(-1).outcome;
  assert.deepEqual(submitted.request.workPlacement, workPlacement);
  assert.deepEqual(outcome.extensions["inference-work-lot"].declaredResources, declaredResources);
  assert.deepEqual(outcome.extensions["inference-work-lot"].measuredResources, measuredResources);
  assert.deepEqual(outcome.extensions["inference-work-lot"].providerEvidence, providerEvidence);
  assert.equal(outcome.usage, undefined, "partial resource observations must not manufacture complete token counters");
});

test("typed market failures and settlement refusals retain their evidence", async () => {
  const typed = source(async () => {
    throw new InferenceWorkLotClientError("rate-limited", "market capacity exhausted secret-token", {
      retryable: true,
      evidence: { taskId: "task:pending" },
    });
  });
  const typedOutcome = (await eventsOf(typed, call())).at(-1).outcome;
  assert.equal(typedOutcome.condition, "rate-limited");
  assert.equal(typedOutcome.retryable, true);
  assert.doesNotMatch(typedOutcome.reasons[0], /secret-token/u);
  assert.equal(typedOutcome.extensions["inference-work-lot"].taskId, "task:pending");

  const refused = source(async () => ({
    exchange: { inputNi: "ni:///sha-256;request", outputNi: "ni:///sha-256;output" },
    resultNi: "ni:///sha-256;refusal",
    provider: { account: "urn:account:market" },
    result: {
      outcome: "candidate-refused",
      disposition: "selected-provider-transport-obstructed",
      settlementResidues: [{ provider: "urn:ame:provider", disposition: "settlement-transport-obstruction" }],
      marketRound: 0,
      routeDecision: "ni:///sha-256;route-decision",
      marketWitnesses: ["ni:///sha-256;transport-witness"],
    },
  }));
  const refusal = (await eventsOf(refused, call())).at(-1).outcome;
  assert.equal(refusal.condition, "unreachable");
  assert.equal(refusal.retryable, true);
  assert.equal(refusal.extensions["inference-work-lot"].settlementResidues[0].provider, "urn:ame:provider");
  assert.equal(refusal.extensions["inference-work-lot"].routeDecision, "ni:///sha-256;route-decision");

  const cancelled = source(async () => ({
    exchange: { inputNi: "ni:///sha-256;request", outputNi: "ni:///sha-256;output" },
    resultNi: "ni:///sha-256;cancellation",
    provider: { account: "urn:account:market" },
    result: {
      outcome: "market-residue",
      disposition: "selected-provider-transport-obstructed",
      settlementResidues: [{ provider: "urn:ame:provider", disposition: "customer-cancelled" }],
    },
  }));
  const cancellation = (await eventsOf(cancelled, call())).at(-1).outcome;
  assert.equal(cancellation.condition, "cancelled");
  assert.equal(cancellation.retryable, false);
});
