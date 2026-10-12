// src/chat/analyst.mjs — the tool-using, provider-agnostic analyst loop.
// systemInstruction and tools are caller-supplied so every Assist domain
// drives the same loop with its own persona and typed operations; provider
// wire formats live in ./providers.mjs. Every tool call dispatches through
// the caller's own `execute(name, args)` — the one dispatch (platform.execute
// in the web application) — so the loop never looks up or validates a tool
// itself; it only turns operations into each provider's declaration shape
// for the request. Web-standard globals only.

import { getProvider } from "./providers.mjs";

const CALL_TIMEOUT_MS = 60_000;

// The pre-provider-agnostic default model that older settings rows may still
// carry; it no longer serves, so it falls forward to the adapter's own default.
const RETIRED_DEFAULT_MODEL = "gemini-2.5-flash";

class ProviderRateLimitError extends Error {
  constructor(providerId) {
    super(`${providerId} rate limited (HTTP 429)`);
    this.name = "ProviderRateLimitError";
    this.providerId = providerId;
  }
}

function rateLimitMessage(providerId) {
  if (providerId === "gemini") return "Gemini free-tier rate limit reached (HTTP 429) — wait a moment and try again.";
  return `${providerId} rate limit reached (HTTP 429) — wait a moment and try again.`;
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}

// Every provider adapter's buildRequest reads plain { name, description,
// parameters } tool declarations; operations carry that same information as
// { id, description, domain.schema }, so this is the one place that shape
// is bridged, once per turn (operations do not change mid-turn).
function operationDeclarations(operations) {
  return operations.map((operation) => ({ name: operation.id, description: operation.description, parameters: operation.domain.schema }));
}

async function callAdapter({ adapter, model, systemText, turns, toolDeclarations, baseUrl, apiKey, httpFetch }) {
  const { url, headers, body } = adapter.buildRequest({ model, systemText, turns, toolDeclarations, baseUrl, apiKey });
  const res = await httpFetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
  if (res.status === 429) throw new ProviderRateLimitError(adapter.id);
  if (!res.ok) {
    // Never interpolate apiKey here — only status + a truncated response body.
    const text = await safeText(res);
    throw new Error(`${adapter.id} request failed: HTTP ${res.status}${text ? ` — ${text.slice(0, 300)}` : ""}`);
  }
  return res.json();
}

function validateHistory(history) {
  if (!Array.isArray(history)) throw new TypeError("runAnalystTurn: history must be an array of provider-native conversation turns");
  for (const turn of history) {
    if (turn === null || typeof turn !== "object" || typeof turn.role !== "string") {
      throw new TypeError('runAnalystTurn: history entries must be objects with a string "role" (provider-native turn shape)');
    }
  }
}

// The one bit of per-provider turn-shape knowledge the loop needs before any
// response exists to grow turns from: Gemini turns carry a `parts` array,
// every other adapter here accepts a plain string `content`.
function initialUserTurn(providerId, userText) {
  if (providerId === "gemini") return { role: "user", parts: [{ text: userText }] };
  return { role: "user", content: userText };
}

/**
 * Run one analyst turn: model <-> tool-call round trip until the model
 * answers with no further function calls, or maxSteps is reached.
 *
 * @param {object} opts
 * @param {string} [opts.provider] adapter id from ./providers.mjs; defaults to "gemini".
 * @param {string} [opts.baseUrl] required for the "openai-compatible" provider; ignored by providers with a pinned URL.
 * @param {string} opts.apiKey the principal's own API key (bring-your-own-key). Never logged, thrown, or yielded.
 * @param {string} [opts.model] defaults to the adapter's defaultModel; the retired default also falls forward to it.
 * @param {ReadonlyArray<{role: string}>} opts.history prior provider-native turns (opaque shape).
 * @param {string} opts.userText the new user message.
 * @param {(name: string, args: object) => Promise<{data: unknown, observations: unknown[]}>} opts.execute the one tool dispatch (platform.execute, unwrapped); throws on refusal/failure.
 * @param {typeof fetch} [opts.fetchImpl] injected fetch for provider calls; defaults to global fetch.
 * @param {number} [opts.maxSteps] max model<->tool round trips; defaults to 8.
 * @param {ReadonlyArray<object>} opts.tools the operations offered to the model (see ../tools/operations.mjs assistOperation).
 * @param {string} opts.systemInstruction the domain's persona and ground rules.
 * @returns {AsyncGenerator<{type: "text", text: string} | {type: "tool_call", name: string, args: object} | {type: "tool_result", name: string, data: unknown, observations: unknown[]} | {type: "done", history: Array<object>} | {type: "error", message: string}>}
 */
export async function* runAnalystTurn({
  provider = "gemini", baseUrl, apiKey, model, history, userText, execute, fetchImpl, maxSteps = 8, tools, systemInstruction,
} = {}) {
  if (typeof provider !== "string" || provider.length === 0) throw new TypeError("runAnalystTurn: provider must be a non-empty string");
  const adapter = getProvider(provider);
  if (typeof apiKey !== "string" || apiKey.length === 0) throw new TypeError("runAnalystTurn: apiKey must be a non-empty string");
  if (model !== undefined && typeof model !== "string") throw new TypeError("runAnalystTurn: model must be a string when provided");
  validateHistory(history);
  if (typeof userText !== "string" || userText.length === 0) throw new TypeError("runAnalystTurn: userText must be a non-empty string");
  if (typeof execute !== "function") throw new TypeError("runAnalystTurn: execute must be a function (name, args) => Promise<{ data, observations }>");
  if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new TypeError("runAnalystTurn: maxSteps must be a positive integer");
  if (!Array.isArray(tools)) throw new TypeError("runAnalystTurn: tools must be an array of operations (see ../tools/operations.mjs)");
  if (typeof systemInstruction !== "string" || systemInstruction.length === 0) throw new TypeError("runAnalystTurn: systemInstruction must be a non-empty string");
  const httpFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  if (typeof httpFetch !== "function") throw new TypeError("runAnalystTurn: fetchImpl must be a function (or a global fetch must exist)");

  const effectiveModel = !model || model === RETIRED_DEFAULT_MODEL ? adapter.defaultModel : model;
  const toolDeclarations = operationDeclarations(tools);
  let turns = [...history, initialUserTurn(provider, userText)];

  for (let step = 1; step <= maxSteps; step += 1) {
    let json;
    try {
      json = await callAdapter({ adapter, model: effectiveModel, systemText: systemInstruction, turns, toolDeclarations, baseUrl, apiKey, httpFetch });
    } catch (err) {
      yield { type: "error", message: err instanceof ProviderRateLimitError ? rateLimitMessage(err.providerId) : err instanceof Error ? err.message : String(err) };
      return;
    }

    const { texts, toolCalls } = adapter.parseResponse(json);
    for (const text of texts) yield { type: "text", text };
    turns = adapter.appendModelTurn(turns, json);

    if (toolCalls.length === 0) {
      yield { type: "done", history: turns };
      return;
    }

    const results = [];
    for (const call of toolCalls) {
      yield { type: "tool_call", name: call.name, args: call.args };
      try {
        const result = await execute(call.name, call.args);
        const data = result?.data ?? null;
        const observations = Array.isArray(result?.observations) ? result.observations : [];
        yield { type: "tool_result", name: call.name, data, observations };
        results.push({ id: call.id, name: call.name, data: { data, observations } });
      } catch (err) {
        // A tool refusal (bad args, missing scope, unknown tool) is fed back to
        // the model as a tool result rather than aborting the turn: the analyst
        // explains the problem, per the "ask for missing inputs" ground rule.
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
