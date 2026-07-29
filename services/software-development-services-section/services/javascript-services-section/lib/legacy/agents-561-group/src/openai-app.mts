/**
 * openai-app — the OpenAI-compatible chat surface.
 *
 * Two resources, the subset every OpenAI-dialect client needs:
 *   GET  /v1/models             — the roster, projected as OpenAI "models". The
 *                                 model id IS the character id: choosing a model
 *                                 is choosing who you talk with.
 *   POST /v1/chat/completions   — drive one turn against the chosen character,
 *                                 fused with the caller's discrete memory.
 *
 * The caller is identified by the OAuth bearer (the same token the well-known
 * metadata teaches a client to obtain). That identity keys the memory; the
 * `model` field selects the character. So a stock OpenAI client — our own
 * openai-agent-tui, or any third-party tool — points its base_url at `…/v1`,
 * sets its API key to an issued token, and picks a character by model name.
 *
 * This App is returned UNGATED; serve.mts wraps it with the auth guard so an
 * unauthenticated request gets the 401 + RFC 9728 challenge before any handler.
 */

import { readJsonBody } from "@emsenn/relating/running/http";
import { jsonRepr, type App, type Context, type Repr } from "@emsenn/http-server";

import type { Character } from "./characters.mts";
import { converse, type OpenAiMessage } from "./engine.mts";
import type { AgentsAuth } from "./auth.mts";

export interface OpenaiAppParts {
  readonly roster: ReadonlyMap<string, Character>;
  readonly auth: AgentsAuth;
  readonly dataRoot?: string;
}

interface ChatCompletionRequest {
  readonly model?: unknown;
  readonly messages?: unknown;
  readonly stream?: unknown;
}

function modelsList(roster: ReadonlyMap<string, Character>): Repr {
  return jsonRepr({
    object: "list",
    data: [...roster.values()].map((c) => ({
      id: c.id,
      object: "model",
      created: 0,
      owned_by: "561-group",
      description: c.description,
      name: c.name,
    })),
  });
}

function validMessages(value: unknown): OpenAiMessage[] | null {
  if (!Array.isArray(value)) return null;
  const out: OpenAiMessage[] = [];
  for (const m of value) {
    if (m === null || typeof m !== "object") return null;
    const r = m as Record<string, unknown>;
    if (typeof r["role"] !== "string") return null;
    // OpenAI allows content as string or parts; we accept string content and
    // flatten the common {type:"text",text} parts shape.
    const content = typeof r["content"] === "string"
      ? r["content"]
      : Array.isArray(r["content"])
        ? r["content"].map((p) => (p && typeof p === "object" && typeof (p as Record<string, unknown>)["text"] === "string" ? (p as Record<string, unknown>)["text"] as string : "")).join("")
        : "";
    out.push({ role: r["role"], content });
  }
  return out;
}

function completionResponse(characterId: string, reply: string, usage: { input?: number; output?: number } | undefined): unknown {
  const prompt = usage?.input ?? 0;
  const completion = usage?.output ?? 0;
  return {
    id: `chatcmpl-${cryptoId()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: characterId,
    choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

function streamResponse(characterId: string, reply: string): Repr {
  const id = `chatcmpl-${cryptoId()}`;
  const created = Math.floor(Date.now() / 1000);
  const base = { id, object: "chat.completion.chunk", created, model: characterId };
  const frames = [
    { ...base, choices: [{ index: 0, delta: { role: "assistant", content: reply }, finish_reason: null }] },
    { ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
  ];
  const body = frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("") + "data: [DONE]\n\n";
  return {
    status: 200,
    type: "text/event-stream; charset=utf-8",
    headers: Object.freeze({ "cache-control": "no-cache", "x-accel-buffering": "no" }),
    body,
  };
}

function cryptoId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function createOpenaiApp(parts: OpenaiAppParts): App {
  const { roster, auth } = parts;

  const chatHandler = async (ctx: Context): Promise<Repr> => {
    const email = auth.identify(ctx) ?? (typeof ctx.locals["email"] === "string" ? ctx.locals["email"] as string : undefined);
    if (email === undefined) return jsonRepr({ error: { message: "unauthorized", type: "invalid_request_error" } }, 401);

    let body: ChatCompletionRequest | null;
    try {
      body = await readJsonBody<ChatCompletionRequest | null>(ctx.req, { empty: null });
    } catch {
      return jsonRepr({ error: { message: "invalid JSON body", type: "invalid_request_error" } }, 400);
    }
    if (!body) return jsonRepr({ error: { message: "missing request body", type: "invalid_request_error" } }, 400);

    const modelId = typeof body.model === "string" ? body.model : "";
    const character = roster.get(modelId);
    if (!character) {
      return jsonRepr({ error: { message: `unknown model "${modelId}"; GET /v1/models for the roster`, type: "invalid_request_error", code: "model_not_found" } }, 404);
    }
    const messages = validMessages(body.messages);
    if (!messages) return jsonRepr({ error: { message: "messages must be an array of {role,content}", type: "invalid_request_error" } }, 400);

    try {
      const { reply, result } = await converse({
        character,
        userEmail: email,
        messages,
        ...(parts.dataRoot === undefined ? {} : { dataRoot: parts.dataRoot }),
      });
      if (body.stream === true) return streamResponse(character.id, reply);
      return jsonRepr(completionResponse(character.id, reply, result.run.result.usage));
    } catch (error) {
      return jsonRepr({ error: { message: (error as Error).message, type: "server_error" } }, 500);
    }
  };

  return {
    resources: [
      {
        match: "/v1/models",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => modelsList(roster),
      },
      {
        match: "/v1/chat/completions",
        methods: ["POST"],
        produces: ["application/json", "text/event-stream"],
        handler: chatHandler,
      },
    ],
  };
}
