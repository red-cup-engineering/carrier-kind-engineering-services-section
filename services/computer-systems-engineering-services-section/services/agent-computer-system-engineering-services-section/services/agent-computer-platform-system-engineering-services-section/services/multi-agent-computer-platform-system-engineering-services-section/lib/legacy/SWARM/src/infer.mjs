import { createHash } from "node:crypto";

import { jcs } from "@561-group/computer/typed-resource-catalog/json";

import { jsonSafe } from "./cognition.mjs";
import { resolveApiKey, resolveProvider } from "./providers.mjs";

export function packPrompt(agent, prompt, options = {}) {
  // `options.messages` (the agent-loop transcript across steps) REPLACES the constructed pack verbatim;
  // otherwise build the default [system?, context?, user] pack. Byte-identical for callers passing neither.
  const messages = options.messages ?? (() => {
    const m = [];
    if (agent.system) m.push({ role: "system", content: agent.system });
    if (options.context) m.push({ role: "system", content: options.context });
    m.push({ role: "user", content: prompt });
    return m;
  })();
  // Structured-output passthrough: `json: true` -> json_object; `responseFormat` -> verbatim (e.g. json_schema).
  const format = options.responseFormat ?? (options.json ? { type: "json_object" } : undefined);
  return {
    model: agent.model,
    messages,
    ...(format ? { response_format: format } : {}),
    ...(options.tools ? { tools: options.tools } : {}),
    ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
  };
}

function stableId(parts) {
  // Identity is content: canonical JSON (jcs/RFC-8785) -> sha256. Not raw JSON.stringify.
  const digest = createHash("sha256").update(jcs(jsonSafe(parts))).digest("hex").slice(0, 16);
  return `msg-${digest}`;
}

export function sanitizeErrorMessage(message = "") {
  return String(message)
    .replace(/Bearer\s+[-._~+/=A-Za-z0-9]+/g, "Bearer [redacted]")
    .replace(/(api[_-]?key["':=\s]+)[-._~+/=A-Za-z0-9]+/gi, "$1[redacted]");
}

export function responseText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  throw new Error("Provider response did not include choices[0].message.content.");
}

export async function responseError(response) {
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  const suffix = body ? `: ${body.slice(0, 500)}` : "";
  return new Error(`Provider request failed with HTTP ${response.status}${suffix}`);
}

export async function infer(agent, prompt, options = {}) {
  const provider = resolveProvider(agent.provider);
  const { apiKey, envName } = resolveApiKey(agent.provider, options);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("No fetch implementation available.");

  const body = packPrompt(agent, prompt, options);
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
  const reply = responseText(data);
  const created = options.now ?? new Date().toISOString();
  const id = options.id ?? data.id ?? stableId([agent.name, agent.provider, agent.model, prompt, reply, created]);

  return [
    {
      id,
      agent: agent.name,
      provider: agent.provider,
      model: agent.model,
      prompt,
      created,
      providerResponseId: data.id ?? "",
      usage: data.usage ?? {},
      apiKeyEnv: envName,
    },
    { const: reply },
  ];
}
