import { test } from "node:test";
import assert from "node:assert/strict";

import { runAnalystTurn, buildSystemInstruction } from "../src/chat/gemini-analyst.mjs";
import { sseHeaders, sseFrame } from "../src/chat/sse.mjs";

const SECRET_KEY = "GEMINI_TEST_SECRET_KEY_do-not-leak";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function textCandidate(text) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

function functionCallCandidate(name, args = {}) {
  return { candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }] };
}

async function collect(gen) {
  const events = [];
  for await (const event of gen) events.push(event);
  return events;
}

const walletTool = {
  name: "get_wallet_balance",
  description: "Get the character's current wallet balance.",
  parameters: { type: "object", properties: {}, additionalProperties: false, $schema: "http://json-schema.org/draft-07/schema#" },
  handler: async (_ctx, _args) => ({
    data: { balance: 1234.5 },
    observations: [{ type: "EsiObservation", path: "/characters/1/wallet/", recordedAt: 1_700_000_000_000 }],
  }),
};

function fakeCtx() {
  return { esi: {}, store: {}, userId: 1, characterId: 42, accessToken: "tok", fetchImpl: fetch, now: () => 0 };
}

test("buildSystemInstruction: mentions decision support, citing, and I don't know", () => {
  const text = buildSystemInstruction({ characterName: "Morgan Sennhauser" });
  assert.match(text, /Morgan Sennhauser/);
  assert.match(text, /decision-support/i);
  assert.match(text, /recordedAt/);
  assert.match(text, /I don't know/);
  assert.match(text, /never invent missing inputs/i);
});

test("buildSystemInstruction: works without a characterName", () => {
  const text = buildSystemInstruction();
  assert.match(text, /newbie EVE Online capsuleer/);
});

test("buildSystemInstruction: rejects an empty characterName", () => {
  assert.throws(() => buildSystemInstruction({ characterName: "" }), TypeError);
});

test("runAnalystTurn: text-only turn yields text then done", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse(200, textCandidate("Welcome to New Eden."));
  };

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.equal(calls, 1);
  assert.deepEqual(
    events.map((e) => e.type),
    ["text", "done"],
  );
  assert.equal(events[0].text, "Welcome to New Eden.");
  assert.equal(events[1].history.at(-1).role, "model");
});

test("runAnalystTurn: one functionCall then text round-trips through the tool and back to Gemini", async () => {
  let calls = 0;
  const seenBodies = [];
  const fetchImpl = async (_url, init) => {
    calls += 1;
    seenBodies.push(JSON.parse(init.body));
    if (calls === 1) return jsonResponse(200, functionCallCandidate("get_wallet_balance", {}));
    return jsonResponse(200, textCandidate("Your wallet holds 1234.5 ISK as of the last observation."));
  };

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "what's my wallet balance?",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.equal(calls, 2);
  assert.deepEqual(
    events.map((e) => e.type),
    ["tool_call", "tool_result", "text", "done"],
  );
  assert.equal(events[0].name, "get_wallet_balance");
  assert.equal(events[1].data.balance, 1234.5);
  assert.equal(events[1].observations[0].recordedAt, 1_700_000_000_000);
  assert.match(events[2].text, /1234\.5/);

  // second request carried the functionResponse turn back to Gemini
  const secondBody = seenBodies[1];
  const functionResponseTurn = secondBody.contents.find((t) => t.parts?.[0]?.functionResponse);
  assert.equal(functionResponseTurn.role, "user");
  assert.equal(functionResponseTurn.parts[0].functionResponse.name, "get_wallet_balance");
  assert.equal(functionResponseTurn.parts[0].functionResponse.response.data.balance, 1234.5);

  // Gemini tool declarations must have $schema / additionalProperties stripped
  const declared = secondBody.tools[0].functionDeclarations[0];
  assert.equal(declared.parameters.$schema, undefined);
  assert.equal(declared.parameters.additionalProperties, undefined);
});

test("runAnalystTurn: stops at maxSteps even if the model keeps calling tools", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse(200, functionCallCandidate("get_wallet_balance", {}));
  };

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "keep asking",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
      maxSteps: 2,
    }),
  );

  assert.equal(calls, 2, "must not call gemini more than maxSteps times");
  const last = events.at(-1);
  assert.equal(last.type, "done");
  assert.equal(events.filter((e) => e.type === "tool_call").length, 2);
});

test("runAnalystTurn: HTTP 429 yields a rate-limit error event and stops, without leaking the api key", async () => {
  const fetchImpl = async () => jsonResponse(429, { error: { message: "Resource exhausted" } });

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "error");
  assert.match(events[0].message, /rate limit/i);
  assert.match(events[0].message, /free-tier/i);
  assert.doesNotMatch(events[0].message, new RegExp(SECRET_KEY));
});

test("runAnalystTurn: a generic HTTP failure yields an error event, not a thrown exception, and never leaks the key", async () => {
  const fetchImpl = async () => jsonResponse(500, { error: { message: "boom" } });

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "error");
  assert.match(events[0].message, /500/);
  assert.doesNotMatch(events[0].message, new RegExp(SECRET_KEY));
});

test("runAnalystTurn: unknown tool call is fed back to the model, not thrown", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse(200, functionCallCandidate("does_not_exist", {}));
    return jsonResponse(200, textCandidate("Sorry, I can't do that."));
  };

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.deepEqual(
    events.map((e) => e.type),
    ["tool_call", "tool_result", "text", "done"],
  );
  assert.match(events[1].data.error, /unknown tool/i);
});

// 2026-08-05 subrequest-budget fix (see ROADMAP.md Decisions and
// src/web/worker.mjs's createBudgetedFetch): a tool handler can now throw a
// plain Error("subrequest budget exhausted (N)") mid-fetch when a chat
// turn's shared ctx.fetchImpl counter trips. The loop below (the same
// generic catch that already handles "unknown tool") must convert that into
// a tool_result event carrying the error, not let it escape and kill the
// whole SSE stream -- a truncated Worker invocation is exactly the failure
// mode this budget exists to turn into something the model (and therefore
// the player) can see and react to instead.
test("runAnalystTurn: a tool handler throwing the subrequest-budget error is fed back as a tool_result, not thrown out of the generator", async () => {
  const budgetTrippedTool = {
    name: "get_route",
    description: "stand-in for a tool whose handler trips the shared per-invocation fetch budget",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      throw new Error("subrequest budget exhausted (40)");
    },
  };

  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse(200, functionCallCandidate("get_route", {}));
    return jsonResponse(200, textCandidate("I couldn't finish that route lookup -- it hit a request limit."));
  };

  const events = await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      history: [],
      userText: "plot my route",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [budgetTrippedTool],
    }),
  );

  assert.deepEqual(
    events.map((e) => e.type),
    ["tool_call", "tool_result", "text", "done"],
  );
  assert.match(events[1].data.error, /subrequest budget exhausted \(40\)/);
  assert.deepEqual(events[1].observations, []);
  // The turn must complete normally -- the model still gets to answer.
  assert.equal(events.at(-1).type, "done");
});

test("runAnalystTurn: an omitted model falls back to the adapter's defaultModel (gemini-flash-latest)", async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return jsonResponse(200, textCandidate("hi"));
  };

  await collect(
    runAnalystTurn({ apiKey: SECRET_KEY, history: [], userText: "hi", ctx: fakeCtx(), fetchImpl, toolRegistry: [walletTool] }),
  );

  assert.match(calledUrl, /\/models\/gemini-flash-latest:generateContent$/);
});

test("runAnalystTurn: the retired default model gemini-2.5-flash falls back to the adapter's defaultModel", async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return jsonResponse(200, textCandidate("hi"));
  };

  await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      model: "gemini-2.5-flash",
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.match(calledUrl, /\/models\/gemini-flash-latest:generateContent$/);
  assert.doesNotMatch(calledUrl, /gemini-2\.5-flash/);
});

test("runAnalystTurn: a caller-supplied non-retired model is used as-is", async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return jsonResponse(200, textCandidate("hi"));
  };

  await collect(
    runAnalystTurn({
      apiKey: SECRET_KEY,
      model: "gemini-2.5-pro",
      history: [],
      userText: "hi",
      ctx: fakeCtx(),
      fetchImpl,
      toolRegistry: [walletTool],
    }),
  );

  assert.match(calledUrl, /\/models\/gemini-2\.5-pro:generateContent$/);
});

test("runAnalystTurn: rejects an unknown provider id", async () => {
  await assert.rejects(
    collect(
      runAnalystTurn({ provider: "not-a-real-provider", apiKey: SECRET_KEY, history: [], userText: "hi", ctx: fakeCtx(), toolRegistry: [] }),
    ),
  );
});

test("runAnalystTurn: rejects a missing apiKey", async () => {
  await assert.rejects(
    collect(runAnalystTurn({ apiKey: "", history: [], userText: "hi", ctx: fakeCtx(), toolRegistry: [] })),
    TypeError,
  );
});

test("runAnalystTurn: rejects a malformed history", async () => {
  await assert.rejects(
    collect(
      runAnalystTurn({
        apiKey: SECRET_KEY,
        history: [{ nope: true }],
        userText: "hi",
        ctx: fakeCtx(),
        toolRegistry: [],
      }),
    ),
    TypeError,
  );
});

test("sseHeaders: exact pinned header set", () => {
  assert.deepEqual(sseHeaders(), {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "x-accel-buffering": "no",
  });
});

test("sseFrame: formats an 'event: <type>\\ndata: <json>\\n\\n' frame", () => {
  const frame = sseFrame("text", { text: "hello" });
  assert.equal(frame, 'event: text\ndata: {"text":"hello"}\n\n');
});

test("sseFrame: mirrors every runAnalystTurn event type", () => {
  for (const [type, data] of [
    ["tool_call", { name: "get_wallet_balance", args: {} }],
    ["tool_result", { name: "get_wallet_balance", data: { balance: 1 }, observations: [] }],
    ["done", { history: [] }],
    ["error", { message: "boom" }],
  ]) {
    const frame = sseFrame(type, data);
    assert.equal(frame, `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }
});

test("sseFrame: rejects a non-serializable payload", () => {
  const circular = {};
  circular.self = circular;
  assert.throws(() => sseFrame("text", circular), TypeError);
});

test("sseFrame: rejects an empty event name", () => {
  assert.throws(() => sseFrame("", { a: 1 }), TypeError);
});
