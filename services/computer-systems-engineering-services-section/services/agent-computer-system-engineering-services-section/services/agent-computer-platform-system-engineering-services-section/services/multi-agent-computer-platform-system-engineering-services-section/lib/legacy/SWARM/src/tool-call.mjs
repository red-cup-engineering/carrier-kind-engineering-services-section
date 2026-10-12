// tool-call.mjs — provider tool-calling round-trip.
//
// The existing infer() (src/infer.mjs) reads only choices[0].message.content
// via responseText() and THROWS when content is not a string. A tool-call turn
// carries content:null with tool_calls populated, so infer()'s reader cannot be
// reused for tool turns. This module is the tools-aware sibling of infer(): it
// reuses infer()'s EXACT HTTP shape but parses tool_calls + finish_reason off
// the response, and never collapses a null-content tool turn into a throw.
//
// Held-⊤ discipline: a tool-call turn is held — content coerces to "" on the
// const channel while the raw provider `message` (carrying tool_calls) rides on
// the second tuple element, so neither the call nor its absence is forced.

import { packPrompt, sanitizeErrorMessage, responseError } from "./infer.mjs";
import { resolveProvider, resolveApiKey } from "./providers.mjs";
import { stableId } from "./cognition.mjs";

// Build the OpenAI-style request body for a tools turn. packPrompt() owns the
// model/response_format shape; this layer adds the tools-turn fields on top of
// it (the supplied `messages` REPLACE packPrompt's single-user-turn messages,
// verbatim, and tools/tool_choice are attached). Kept separate from
// inferWithTools so a test can assert the body without an HTTP round-trip.
export function buildToolBody(agent, options = {}) {
  const base = packPrompt(agent, "", options);
  const tools = options.tools;
  const toolChoice = options.toolChoice ?? (tools?.length ? "auto" : undefined);
  const messages = options.messages ?? base.messages;
  return {
    ...base,
    messages,
    ...(tools ? { tools } : {}),
    ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
  };
}

// inferWithTools(agent, messages, options) — tools-aware sibling of infer().
// Same 2-tuple shape, extended with finishReason; never throws on null content.
export async function inferWithTools(agent, messages, options = {}) {
  const provider = resolveProvider(agent.provider);
  const { apiKey, envName } = resolveApiKey(agent.provider, options);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("No fetch implementation available.");

  const body = buildToolBody(agent, { ...options, messages, tools: options.tools });

  let response;
  try {
    response = await fetchImpl(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const reason = error?.message ? `: ${sanitizeErrorMessage(error.message)}` : "";
    throw new Error(
      `Provider request failed before HTTP response for "${agent.provider}" (${agent.model}) at ${provider.endpoint}${reason}`,
      { cause: error },
    );
  }

  if (!response.ok) throw await responseError(response);
  const data = await response.json();
  const choice = data.choices?.[0] ?? {};
  const msg = choice.message ?? {};
  const created = options.now ?? new Date().toISOString();
  const id =
    options.id ??
    data.id ??
    stableId([agent.name, agent.provider, agent.model, JSON.stringify(messages), created], "msg");

  return [
    {
      id,
      agent: agent.name,
      provider: agent.provider,
      model: agent.model,
      created,
      providerResponseId: data.id ?? "",
      usage: data.usage ?? {},
      apiKeyEnv: envName,
      finishReason: choice.finish_reason ?? "",
    },
    // const channel coerces null -> ""; raw provider message (with tool_calls)
    // rides alongside so a held tool turn is never forced to a throw.
    { const: typeof msg.content === "string" ? msg.content : "", message: msg },
  ];
}

// parseToolCalls(utterance) — lift the provider tool_calls off an inferWithTools
// tuple. tc.function.arguments is a JSON STRING per OpenAI/Groq/NIM; malformed
// args do NOT throw — they settle to {} with argumentsMalformed:true so the
// runner can turn the call into a "active" refusal rather than a disk touch.
export function parseToolCalls(utterance) {
  const toolCalls = utterance?.[1]?.message?.tool_calls ?? [];
  return toolCalls.map((tc) => {
    const call = {
      id: tc.id ?? "",
      name: tc.function?.name ?? "",
      arguments: {},
    };
    try {
      call.arguments = JSON.parse(tc.function?.arguments ?? "{}");
    } catch {
      call.arguments = {};
      call.argumentsMalformed = true;
    }
    return call;
  });
}

// toolResultMessage — the transcript turn the loop appends after a governed run.
export function toolResultMessage(callId, name, result) {
  return {
    role: "tool",
    tool_call_id: callId,
    name,
    content: typeof result === "string" ? result : JSON.stringify(result),
  };
}

// toolSchemasFor(toolNames) — wrap actuator JSON-schemas as OpenAI tool specs,
// dropping names with no schema. ACTUATOR_SCHEMAS lives in the sibling
// actuators.mjs; it is imported lazily so this module loads even before that
// sibling lands (an absent catalog simply drops every name -> []).
export async function toolSchemasFor(toolNames = []) {
  let ACTUATOR_SCHEMAS = {};
  try {
    ({ ACTUATOR_SCHEMAS } = await import("./actuators.mjs"));
  } catch {
    ACTUATOR_SCHEMAS = {};
  }
  return toolNames
    .filter((name) => ACTUATOR_SCHEMAS[name])
    .map((name) => ({ type: "function", function: ACTUATOR_SCHEMAS[name] }));
}

// scriptedToolProvider(responses) — TEST SEAM. Mirrors mockFetch
// (tests/api.test.mjs) but shifts one queued response per call so a multi-step
// tool loop can be scripted. Injected via options.fetch exactly as mockFetch is.
export function scriptedToolProvider(responses = []) {
  return async (url, request) => ({
    ok: true,
    status: 200,
    async json() {
      return responses.length
        ? responses.shift()
        : { choices: [{ finish_reason: "stop", message: { role: "assistant", content: "(exhausted)" } }] };
    },
  });
}
