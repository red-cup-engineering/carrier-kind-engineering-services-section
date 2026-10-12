// gemini-analyst.mjs — the tool-using chat loop behind /api/chat.
//
// Historical name (filename pinned by every caller: worker.mjs, the
// package.json "./chat" export, test/gemini-analyst.test.mjs) — the loop
// itself is provider-agnostic as of 2026-08-05 (ROADMAP.md decisions log).
// All provider-specific wire format lives in src/chat/providers.mjs; this
// module only drives the generic loop: buildRequest -> fetch -> parseResponse
// -> yield text -> run tools through the shared registry -> appendToolResults
// -> repeat until no tool calls or maxSteps.
//
// Shape ported from the house agentic-loop skeleton (legacy
// swarm/src/agent-loop.mjs + tool-call.mjs): one model turn -> append
// assistant turn verbatim -> parse tool/function calls -> execute -> append
// result turns -> repeat until no function call or a step cap. All the
// governance machinery there (held-top contested tools, EAVT trace cells,
// cost ledgers) is stripped for v1: EVE Assist's tools are read-only against
// the game world by construction (see ROADMAP.md product principle 1), so
// there is nothing to gate — every tool call just runs.

import { getProvider } from "./providers.mjs";

const CALL_TIMEOUT_MS = 60_000;

// The pre-provider-agnostic default model, stored in existing user_settings
// rows created before this refactor (migrations/0001_init.sql's
// gemini_model column default). It 404s live against the Gemini API as of
// 2026-08-05 ("no longer available to new users") — any caller still
// carrying it (an old settings row, an old test, a stale client) silently
// falls forward to the adapter's own defaultModel instead of failing.
const RETIRED_DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Build the analyst's system instruction: an EVE Online research analyst for
 * a newbie player. Decision support only; cites every retrieved fact with
 * its observation timestamp; separates retrieval from inference; prefers
 * "I don't know" over invention; asks for missing inputs; explains jargon.
 *
 * @param {{ characterName?: string }} [opts]
 * @returns {string}
 */
export function buildSystemInstruction({ characterName } = {}) {
  if (characterName !== undefined && (typeof characterName !== "string" || characterName.length === 0)) {
    throw new TypeError("buildSystemInstruction: characterName must be a non-empty string when provided");
  }
  const who = characterName
    ? `for ${characterName}, a newbie EVE Online capsuleer`
    : "for a newbie EVE Online capsuleer";

  return [
    `You are the EVE Assist research analyst, an EVE Online decision-support analyst ${who}.`,
    "",
    "Ground rules, binding:",
    "1. Decision support only. You never pilot, trade, message, or take any in-game action yourself; you inform a human who decides.",
    '2. Every fact you state that came from a retrieved tool observation must cite that observation\'s recordedAt timestamp (e.g. "as of <recordedAt>"). Never state a retrieved fact without its timestamp.',
    '3. Clearly distinguish retrieved facts (from a tool observation) from your own inference or reasoning — say so explicitly, e.g. "Retrieved:" versus "My inference:".',
    '4. If the data you have is insufficient to answer, say "I don\'t know" or "the data is insufficient" rather than inventing a plausible-sounding answer.',
    "5. If you need an input you don't have (a character, system, item, price, or time range), ask the player for it. Never invent missing inputs.",
    '6. The player is new to EVE Online. Explain jargon and acronyms in plain language the first time you use them (e.g. "ISK (EVE\'s currency)", "warp core stabilizer").',
    "",
    "Use the available tools to retrieve current facts before answering questions about the player's account, assets, wallet, skills, location, or orders. Do not guess at numbers you could retrieve.",
  ].join("\n");
}

// ProviderRateLimitError — internal only (not a pinned export); lets the
// generator body distinguish "yield the rate-limit error event and stop"
// from any other HTTP failure with a single catch clause, while still
// carrying which provider it was so the yielded message can name it.
class ProviderRateLimitError extends Error {
  constructor(providerId) {
    super(`${providerId} rate limited (HTTP 429)`);
    this.name = "ProviderRateLimitError";
    this.providerId = providerId;
  }
}

// Gemini's free tier is the only one this house has hit live rate limits
// against and has a specific, actionable message for (aistudio rate-limit
// docs, per ROADMAP.md); other providers get a generic but still
// provider-named message rather than inventing per-provider advice we
// haven't verified.
function rateLimitMessage(providerId) {
  if (providerId === "gemini") {
    return "Gemini free-tier rate limit reached (HTTP 429) — wait a moment and try again.";
  }
  return `${providerId} rate limit reached (HTTP 429) — wait a moment and try again.`;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function callAdapter({ adapter, model, systemText, turns, toolDeclarations, baseUrl, apiKey, httpFetch }) {
  const { url, headers, body } = adapter.buildRequest({ model, systemText, turns, toolDeclarations, baseUrl, apiKey });
  const res = await httpFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });

  if (res.status === 429) throw new ProviderRateLimitError(adapter.id);
  if (!res.ok) {
    // Never interpolate apiKey here — only status + a truncated response body.
    const text = await safeText(res);
    throw new Error(`${adapter.id} request failed: HTTP ${res.status}${text ? ` — ${text.slice(0, 300)}` : ""}`);
  }
  return res.json();
}

// loadTools — resolves the tool registry to advertise/execute. Default path
// dynamically imports the pinned location (src/tools/registry.mjs, owned by
// a sibling agent) so this module has no static import-time dependency on a
// file another agent may still be writing; an injected `toolRegistry` array
// (test seam, mirrors the house scriptedToolProvider pattern) takes
// precedence for tests and any caller that already has one in hand.
async function loadTools(override) {
  if (override !== undefined) {
    if (!Array.isArray(override)) {
      throw new TypeError("runAnalystTurn: toolRegistry override must be an array of tool definitions");
    }
    return { list: override, getTool: (name) => override.find((t) => t.name === name) };
  }
  const mod = await import("../tools/registry.mjs");
  if (!Array.isArray(mod.toolRegistry)) {
    throw new Error("runAnalystTurn: ../tools/registry.mjs did not export a toolRegistry array");
  }
  return {
    list: mod.toolRegistry,
    getTool: typeof mod.getTool === "function" ? mod.getTool : (name) => mod.toolRegistry.find((t) => t.name === name),
  };
}

function validateHistory(history) {
  if (!Array.isArray(history)) {
    throw new TypeError("runAnalystTurn: history must be an array of provider-native conversation turns");
  }
  for (const turn of history) {
    if (turn === null || typeof turn !== "object" || typeof turn.role !== "string") {
      throw new TypeError('runAnalystTurn: history entries must be objects with a string "role" (provider-native turn shape)');
    }
  }
}

// initialUserTurn — not part of the pinned adapter interface (buildRequest/
// parseResponse/appendModelTurn/appendToolResults). Every provider needs the
// very first user message shaped before any real API response exists to
// grow turns from via appendModelTurn; this is the one bit of per-provider
// turn-shape knowledge the loop needs up front. Gemini's turns carry a
// `parts` array; every OpenAI-compatible-shaped and Anthropic provider here
// accepts a plain string `content`, so those two collapse to one branch.
function initialUserTurn(providerId, userText) {
  if (providerId === "gemini") return { role: "user", parts: [{ text: userText }] };
  return { role: "user", content: userText };
}

/**
 * Run one analyst turn: model <-> tool-call round trip until the model
 * answers with no further function calls, or maxSteps is reached.
 * Provider-agnostic: `provider` selects a src/chat/providers.mjs adapter
 * (getProvider throws on an unknown id); the yielded event contract below
 * is identical regardless of which provider answers.
 *
 * @param {object} opts
 * @param {string} [opts.provider] - adapter id from providers.mjs; defaults to "gemini".
 * @param {string} [opts.baseUrl] - required for the "openai-compatible" provider (e.g. Groq, OpenRouter, or a self-hosted gateway); ignored by providers with a pinned URL.
 * @param {string} opts.apiKey - the user's own API key for the selected provider (bring-your-own-key). Never logged, thrown, or yielded.
 * @param {string} [opts.model] - defaults to the selected provider's defaultModel; a falsy value or the retired "gemini-2.5-flash" default also falls back to it.
 * @param {ReadonlyArray<{role: string}>} opts.history - prior provider-native conversation turns (opaque shape, see providers.mjs).
 * @param {string} opts.userText - the new user message for this turn.
 * @param {object} opts.ctx - tool execution context: { esi, store, userId, characterId, accessToken, fetchImpl, now, names }. `names` (src/esi/name-resolver.mjs, added 2026-08-05) is a per-invocation batch id->name resolver tool handlers use instead of one ESI GET per id.
 * @param {typeof fetch} [opts.fetchImpl] - injected fetch (provider HTTP calls); defaults to global fetch.
 * @param {number} [opts.maxSteps] - max model<->tool round trips; defaults to 8.
 * @param {Array<object>} [opts.toolRegistry] - test/injection seam; defaults to the pinned src/tools/registry.mjs.
 * @param {string} [opts.characterName] - optional, for a personalized system instruction (not carried by the pinned ctx shape).
 * @returns {AsyncGenerator<{type: "text", text: string} | {type: "tool_call", name: string, args: object} | {type: "tool_result", name: string, data: unknown, observations: unknown[]} | {type: "done", history: Array<object>} | {type: "error", message: string}>}
 */
export async function* runAnalystTurn({
  provider = "gemini",
  baseUrl,
  apiKey,
  model,
  history,
  userText,
  ctx,
  fetchImpl,
  maxSteps = 8,
  toolRegistry,
  characterName,
} = {}) {
  if (typeof provider !== "string" || provider.length === 0) {
    throw new TypeError("runAnalystTurn: provider must be a non-empty string");
  }
  const adapter = getProvider(provider);
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new TypeError("runAnalystTurn: apiKey must be a non-empty string");
  }
  if (model !== undefined && typeof model !== "string") {
    throw new TypeError("runAnalystTurn: model must be a string when provided");
  }
  validateHistory(history);
  if (typeof userText !== "string" || userText.length === 0) {
    throw new TypeError("runAnalystTurn: userText must be a non-empty string");
  }
  if (ctx === null || typeof ctx !== "object") {
    throw new TypeError("runAnalystTurn: ctx must be an object");
  }
  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new TypeError("runAnalystTurn: maxSteps must be a positive integer");
  }
  const httpFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  if (typeof httpFetch !== "function") {
    throw new TypeError("runAnalystTurn: fetchImpl must be a function (or a global fetch must exist)");
  }

  const effectiveModel = !model || model === RETIRED_DEFAULT_MODEL ? adapter.defaultModel : model;

  const { list: tools, getTool } = await loadTools(toolRegistry);
  const systemText = buildSystemInstruction({ characterName });

  let turns = [...history, initialUserTurn(provider, userText)];

  for (let step = 1; step <= maxSteps; step += 1) {
    let json;
    try {
      json = await callAdapter({
        adapter,
        model: effectiveModel,
        systemText,
        turns,
        toolDeclarations: tools,
        baseUrl,
        apiKey,
        httpFetch,
      });
    } catch (err) {
      if (err instanceof ProviderRateLimitError) {
        yield { type: "error", message: rateLimitMessage(err.providerId) };
        return;
      }
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
      return;
    }

    const { texts, toolCalls } = adapter.parseResponse(json);
    for (const text of texts) {
      yield { type: "text", text };
    }

    turns = adapter.appendModelTurn(turns, json);

    if (toolCalls.length === 0) {
      yield { type: "done", history: turns };
      return;
    }

    const results = [];
    for (const call of toolCalls) {
      yield { type: "tool_call", name: call.name, args: call.args };

      try {
        const tool = getTool(call.name);
        if (!tool || typeof tool.handler !== "function") {
          throw new Error(`unknown tool "${call.name}"`);
        }
        const result = await tool.handler(ctx, call.args);
        const data = result?.data ?? null;
        const observations = Array.isArray(result?.observations) ? result.observations : [];
        yield { type: "tool_result", name: call.name, data, observations };
        results.push({ id: call.id, name: call.name, data: { data, observations } });
      } catch (err) {
        // A tool error (bad args, missing scope, unknown tool) is fed back to
        // the model as a tool result rather than aborting the whole turn —
        // the analyst should explain the problem to the player, per the "ask
        // for missing inputs instead of inventing" ground rule.
        const message = err instanceof Error ? err.message : String(err);
        yield { type: "tool_result", name: call.name, data: { error: message }, observations: [] };
        results.push({ id: call.id, name: call.name, data: { error: message } });
      }
    }

    turns = adapter.appendToolResults(turns, results);

    if (step === maxSteps) {
      yield { type: "done", history: turns };
      return;
    }
  }
}
