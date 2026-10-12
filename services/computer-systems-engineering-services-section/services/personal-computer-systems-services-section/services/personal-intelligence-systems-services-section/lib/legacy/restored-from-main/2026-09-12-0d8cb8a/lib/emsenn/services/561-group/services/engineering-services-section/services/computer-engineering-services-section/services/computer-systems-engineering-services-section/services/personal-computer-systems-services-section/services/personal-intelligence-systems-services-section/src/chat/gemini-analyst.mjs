// gemini-analyst.mjs — tool-using, provider-agnostic chat loop. Moved
// upstream 2026-09-05 (Gig Assist spec §i): systemInstruction and
// toolRegistry are caller-supplied so each domain drives the same loop
// with its own persona and tools. Provider wire format lives in
// src/chat/providers.mjs.

import { getProvider } from "./providers.mjs";

const CALL_TIMEOUT_MS = 60_000;

// The pre-provider-agnostic default model, stored in existing user_settings
// rows created before this refactor (migrations/0001_init.sql's
// gemini_model column default). It 404s live against the Gemini API as of
// 2026-08-05 ("no longer available to new users") — any caller still
// carrying it (an old settings row, an old test, a stale client) silently
// falls forward to the adapter's own defaultModel instead of failing.
const RETIRED_DEFAULT_MODEL = "gemini-2.5-flash";

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
 * @param {Array<object>} opts.toolRegistry - the caller's tool registry (see ../tools/registry.mjs's buildRegistry).
 * @param {string} opts.systemInstruction - the caller's system-instruction text (persona, ground rules); domain-specific text stays in the caller's own package.
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
  systemInstruction,
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
  if (!Array.isArray(toolRegistry)) {
    throw new TypeError("runAnalystTurn: toolRegistry must be an array of tool definitions");
  }
  if (typeof systemInstruction !== "string" || systemInstruction.length === 0) {
    throw new TypeError("runAnalystTurn: systemInstruction must be a non-empty string");
  }
  const httpFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  if (typeof httpFetch !== "function") {
    throw new TypeError("runAnalystTurn: fetchImpl must be a function (or a global fetch must exist)");
  }

  const effectiveModel = !model || model === RETIRED_DEFAULT_MODEL ? adapter.defaultModel : model;

  const tools = toolRegistry;
  const getTool = (name) => tools.find((t) => t.name === name);
  const systemText = systemInstruction;

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
