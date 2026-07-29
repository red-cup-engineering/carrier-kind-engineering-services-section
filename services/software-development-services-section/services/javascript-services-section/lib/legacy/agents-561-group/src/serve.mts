/**
 * serve — the agents.561.group entry point.
 *
 * One process serves four things over HTTP, all sharing one Google-OAuth
 * authorization server and one memory mount:
 *   • the OAuth transport + well-known metadata (UNGATED) — how any client
 *     discovers where to authorize;
 *   • the human WebUX (UNGATED) — landing, Google sign-in, the token page;
 *   • the per-character MCP endpoints at /c/<id>/mcp (self-gated by bearer) —
 *     how ChatGPT / Claude connect to a character;
 *   • the OpenAI-compatible API at /v1/* (bearer-gated) — how any OpenAI client
 *     talks to a character.
 *
 * Every authenticated turn — whether it arrives over /v1 or over MCP — routes
 * through the same memory-fused engine, so a character holds ONE discrete memory
 * of each user across every way that user reaches it.
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { installGracefulShutdown, start, mergeApps } from "@emsenn/http-server";

import { loadCharacters, rosterIndex } from "./characters.mts";
import { loadAuth } from "./auth.mts";
import { createOpenaiApp } from "./openai-app.mts";
import { createMcpApps } from "./mcp-app.mts";
import { createWebuxApp } from "./webux.mts";

const siteRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const port = Number(process.env["PORT"] ?? 18820);
const host = process.env["HOST"] ?? "127.0.0.1";
const publicBaseUrl = (process.env["PUBLIC_BASE_URL"] ?? process.env["BASE_URL"] ?? `http://${host}:${port}`).replace(/\/$/, "");
const dataRoot = path.join(siteRoot, "data");
const stateDir = path.join(dataRoot, "state", "oauth");

const characters = await loadCharacters(siteRoot);
const roster = rosterIndex(characters);
const auth = loadAuth({ publicBaseUrl, stateDir });

const openaiApp = auth.guard(createOpenaiApp({ roster, auth, dataRoot }));
const mcpApp = createMcpApps({ roster, auth, dataRoot });
const webuxApp = createWebuxApp({ roster: characters, auth, publicBaseUrl });

// auth.app (OAuth + well-known) and webuxApp are ungated; mcpApp self-gates with
// the bearer inside createMcpApp; openaiApp is wrapped by the auth guard.
const app = mergeApps(auth.app, webuxApp, mcpApp, openaiApp);

const result = await start(app, { port, host });
installGracefulShutdown(result);

process.stderr.write(
  `[agents] ${publicBaseUrl} on ${host}:${result.port} — ${characters.length} characters: ` +
  `${characters.map((c) => c.id).join(", ")}\n`,
);
process.stderr.write(
  `[agents] OpenAI API at ${publicBaseUrl}/v1 · MCP at ${publicBaseUrl}/c/<id>/mcp · sign in at ${publicBaseUrl}/\n`,
);
