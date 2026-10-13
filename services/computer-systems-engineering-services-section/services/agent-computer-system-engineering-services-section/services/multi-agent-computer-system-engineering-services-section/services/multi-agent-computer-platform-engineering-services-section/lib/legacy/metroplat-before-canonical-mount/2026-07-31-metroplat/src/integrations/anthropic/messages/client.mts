/** Effect-only HTTP client for the Anthropic Messages wire. */
import { processEnvironment, processEnvValue, type ProcessEnvironment } from "../../process/services/environment.mts";
import { anthropicMessageRequest, anthropicMessageRequestToWireJson, anthropicMessageStreamEvent } from "./codec.mts";
import type { AnthropicMessageRequest, AnthropicMessageStreamEvent } from "./schema.mts";
import { parseSseByteStream } from "../../http/codec/sse/index.mts";

export const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
export const ANTHROPIC_BASE_URL_ENV = "ANTHROPIC_BASE_URL";
export const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicMessagesClientOptions {
  readonly fetch?: typeof fetch;
  readonly env?: ProcessEnvironment;
  readonly signal?: AbortSignal;
  readonly idempotencyKey?: string;
  readonly version?: string;
}
export type AnthropicMessagesStreamEvent =
  | Readonly<{ kind: "anthropic.messages.stream.event"; event: AnthropicMessageStreamEvent }>
  | Readonly<{ kind: "anthropic.messages.stream.failure"; condition: "missing-api-key" | "unreachable" | "cancelled" | "unauthorized" | "rate-limited" | "malformed" | "rejected" | "truncated"; reason: string }>;

function errorReason(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { readonly error?: { readonly message?: unknown } };
    return typeof parsed.error?.message === "string" ? parsed.error.message : `HTTP ${status}`;
  } catch { return `HTTP ${status}: ${body.slice(0, 500)}`; }
}

/** Effect-only incremental Messages API source. */
export function streamAnthropicMessage(request: AnthropicMessageRequest, options: AnthropicMessagesClientOptions = {}): AsyncIterable<AnthropicMessagesStreamEvent> {
  return Object.freeze({
    async *[Symbol.asyncIterator](): AsyncGenerator<AnthropicMessagesStreamEvent> {
      const env = options.env ?? processEnvironment();
      const apiKey = processEnvValue(ANTHROPIC_API_KEY_ENV, env);
      if (apiKey === undefined || apiKey.trim().length === 0) {
        yield { kind: "anthropic.messages.stream.failure", condition: "missing-api-key", reason: `${ANTHROPIC_API_KEY_ENV} is not set` };
        return;
      }
      const base = (processEnvValue(ANTHROPIC_BASE_URL_ENV, env) ?? "https://api.anthropic.com").replace(/\/+$/u, "");
      let response: Response;
      try {
        response = await (options.fetch ?? fetch)(`${base}/v1/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "accept": "text/event-stream",
            "x-api-key": apiKey,
            "anthropic-version": options.version ?? ANTHROPIC_VERSION,
            ...(options.idempotencyKey === undefined ? {} : { "idempotency-key": options.idempotencyKey }),
          },
          body: anthropicMessageRequestToWireJson(anthropicMessageRequest({ ...request, stream: true })),
          ...(options.signal === undefined ? {} : { signal: options.signal }),
        });
      } catch (error) {
        yield { kind: "anthropic.messages.stream.failure", condition: options.signal?.aborted === true ? "cancelled" : "unreachable", reason: options.signal?.aborted === true ? "Anthropic Messages request was cancelled" : error instanceof Error ? error.message : String(error) };
        return;
      }
      if (!response.ok) {
        const body = await response.text();
        yield { kind: "anthropic.messages.stream.failure", condition: response.status === 401 || response.status === 403 ? "unauthorized" : response.status === 429 ? "rate-limited" : "rejected", reason: errorReason(response.status, body) };
        return;
      }
      if (response.body === null) {
        yield { kind: "anthropic.messages.stream.failure", condition: "malformed", reason: "Anthropic Messages streaming response has no body" };
        return;
      }
      try {
        for await (const frame of parseSseByteStream(response.body)) {
          if (frame.data.trim().length === 0) continue;
          const event = anthropicMessageStreamEvent(JSON.parse(frame.data));
          yield { kind: "anthropic.messages.stream.event", event };
          if (event.type === "message_stop" || event.type === "error") return;
        }
      } catch (error) {
        yield { kind: "anthropic.messages.stream.failure", condition: options.signal?.aborted === true ? "cancelled" : "malformed", reason: options.signal?.aborted === true ? "Anthropic Messages request was cancelled" : error instanceof Error ? error.message : String(error) };
        return;
      }
      yield { kind: "anthropic.messages.stream.failure", condition: "truncated", reason: "Anthropic Messages stream ended before message_stop" };
    },
  });
}
