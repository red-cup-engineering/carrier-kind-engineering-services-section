// ask — the thin inference client. A documented, stable, LIGHT alternative to `message()`/`infer()` for
// consumers that just want a raw OpenAI-compatible chat call: no cognition, memory, ledger, descent, or agent
// config. Point it at a provider+model with a prompt, get back the reply text plus a stable provenance.
//
//   ask({ provider, model, prompt, system?, json?, responseFormat? }, options?) -> { text, provenance }
//
// provenance is the persistable witness shape consumers fold into a claim's `prov:wasAttributedTo`:
//   { provider, model, usage, apiKeyEnv }   — apiKeyEnv is the env-var NAME, never the key value.
//
// Structured output (INBOX #4): `json: true` requests `response_format: { type: "json_object" }`; pass an
// explicit `responseFormat` object for full provider passthrough (e.g. a `json_schema`). The reply text is
// returned verbatim — `ask` does not parse it; the caller extracts its own cells.
//
// Resilience: optional `timeoutMs` (AbortController) and `retries` with exponential backoff on transient
// failures (network errors and HTTP 408/429/5xx). Both default to a single bounded attempt.
import { resolveProvider, resolveApiKey } from "./providers.mjs";
import { responseText, responseError, sanitizeErrorMessage } from "./infer.mjs";

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ask(request = {}, options = {}) {
  const {
    provider: providerName, model, prompt, system,
    json = false, responseFormat,
  } = request;
  const {
    apiKey, env, fetch: fetchOption,
    timeoutMs = 60000, retries = 0, retryDelayMs = 250,
    signal, sleep = defaultSleep,
  } = options;

  if (!providerName) throw new Error("ask: `provider` is required.");
  if (!model) throw new Error("ask: `model` is required.");
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error("ask: `prompt` must be a non-empty string.");
  }

  const provider = resolveProvider(providerName);
  const { apiKey: key, envName } = resolveApiKey(providerName, { apiKey, env });
  const fetchImpl = fetchOption ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("ask: no fetch implementation available.");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const format = responseFormat ?? (json ? { type: "json_object" } : undefined);
  const body = { model, messages, ...(format ? { response_format: format } : {}) };

  const attempts = Math.max(0, retries) + 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetchImpl(provider.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      lastError = new Error(
        `ask: request failed before HTTP response for "${providerName}" (${model})` +
          (error?.message ? `: ${sanitizeErrorMessage(error.message)}` : ""),
        { cause: error },
      );
      if (attempt < attempts - 1) { await sleep(retryDelayMs * 2 ** attempt); continue; }
      throw lastError;
    } finally {
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener?.("abort", onAbort);
    }

    if (!response.ok) {
      const error = await responseError(response);
      if (TRANSIENT_STATUS.has(response.status) && attempt < attempts - 1) {
        lastError = error;
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }
      throw error;
    }

    const data = await response.json();
    const text = responseText(data);
    return {
      text,
      provenance: { provider: providerName, model, usage: data.usage ?? {}, apiKeyEnv: envName },
    };
  }
  throw lastError;
}
