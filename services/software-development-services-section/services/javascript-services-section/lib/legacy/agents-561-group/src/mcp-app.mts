/**
 * mcp-app — one MCP endpoint per character.
 *
 * This is what lets a user connect their ChatGPT or Anthropic account to a
 * specific character: each character is published as an MCP server at
 * `/c/<id>/mcp`, exposing a single `talk` tool. An external agent platform
 * discovers the OAuth authorization server from the WWW-Authenticate challenge
 * (the well-known metadata in auth.mts), runs the standard OAuth flow against
 * the user's Google account, and thereafter calls `talk` with a verified bearer.
 *
 * Crucially, the bearer reaches the dispatch as request meta (the upstream
 * createMcpApp refactor), so `talk` resolves WHICH user is connected and routes
 * the turn through the SAME memory-fused engine the OpenAI surface uses. An
 * agent talking to a character over MCP shares one discrete memory with that
 * same user talking over the chat API.
 */

import { createMcpApp, mergeApps, type App, type McpRequestMeta } from "@red-cup-engineering/http-server";

import type { Character } from "./characters.mts";
import type { AgentsAuth } from "./auth.mts";
import { converse, type OpenAiMessage } from "./engine.mts";

export interface McpAppParts {
  readonly roster: ReadonlyMap<string, Character>;
  readonly auth: AgentsAuth;
  readonly dataRoot?: string;
}

const TALK_INPUT_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string", description: "What to say to the character." },
    history: {
      type: "array",
      description: "Optional prior turns for local coherence, as {role,content}.",
      items: {
        type: "object",
        properties: { role: { type: "string" }, content: { type: "string" } },
        required: ["role", "content"],
      },
    },
  },
  required: ["message"],
} as const;

function asMessages(args: Readonly<Record<string, unknown>>): OpenAiMessage[] {
  const history = Array.isArray(args["history"])
    ? args["history"].flatMap((m): OpenAiMessage[] => {
        if (m === null || typeof m !== "object") return [];
        const r = m as Record<string, unknown>;
        if (typeof r["role"] !== "string" || typeof r["content"] !== "string") return [];
        return [{ role: r["role"], content: r["content"] }];
      })
    : [];
  const message = typeof args["message"] === "string" ? args["message"] : "";
  return [...history, { role: "user", content: message }];
}

/** Build one MCP App for a single character. */
function characterMcpApp(character: Character, parts: McpAppParts): App {
  const { auth } = parts;
  const { app } = createMcpApp({
    path: `/c/${character.id}/mcp`,
    serverInfo: { name: `561 · ${character.name}`, version: "0.0.1" },
    instructions:
      `You are connected to ${character.name} — ${character.description} ` +
      `Call \`talk\` to say something; ${character.name} replies with their own ` +
      `voice and their memory of you.`,
    tools: [
      {
        name: "talk",
        description: `Say something to ${character.name} and get their reply. ${character.name} remembers you across conversations.`,
        inputSchema: TALK_INPUT_SCHEMA as unknown as Record<string, unknown>,
      },
    ],
    dispatch: async (name: string, args: Readonly<Record<string, unknown>>, meta?: McpRequestMeta) => {
      if (name !== "talk") throw new Error(`unknown tool: ${name}`);
      const email = meta?.bearer ? auth.oauth.validateToken(meta.bearer)?.email : undefined;
      if (!email) throw new Error("unauthorized: connect this endpoint with your 561 account");
      const { reply } = await converse({
        character,
        userEmail: email,
        messages: asMessages(args),
        ...(parts.dataRoot === undefined ? {} : { dataRoot: parts.dataRoot }),
      });
      return reply;
    },
    auth: {
      verify: auth.verify,
      realm: `561 · ${character.name}`,
      resourceMetadataUrl: auth.resourceMetadataUrl,
    },
  });
  return app;
}

/** Build and merge the MCP endpoints for the whole roster. */
export function createMcpApps(parts: McpAppParts): App {
  return mergeApps(...[...parts.roster.values()].map((c) => characterMcpApp(c, parts)));
}
