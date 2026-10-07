#!/usr/bin/env node
// A harness that speaks MCP only over stdio reaches one HTTP MCP server through this bridge, as
// the machine client that server's operator issued it: MCP_ORIGIN, MCP_CLIENT_ID and
// MCP_CLIENT_SECRET, from the environment or --env-file. The bridge hosts nothing: every call
// is the server's. What the server last said at the handshake is kept per client (MCP_BRIDGE_CACHE,
// default under the user's state directory), so a harness starts while the server is slow to answer.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createClientCredentialsClient } from "@red-cup-engineering/oauth-services-section/client-credentials";
import { mcpHttpTransport } from "@red-cup-engineering/mcp-engineering-services-section/client";
import { bridgeMcpStdio } from "@red-cup-engineering/mcp-engineering-services-section/federation";

const origin = process.env.MCP_ORIGIN?.replace(/\/$/u, "");
const clientId = process.env.MCP_CLIENT_ID;
const clientSecret = process.env.MCP_CLIENT_SECRET;
if (!origin || !clientId || !clientSecret) {
  process.stderr.write("MCP_ORIGIN, MCP_CLIENT_ID and MCP_CLIENT_SECRET are required\n");
  process.exit(1);
}
const cachePath = process.env.MCP_BRIDGE_CACHE ?? join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "561-group", "mcp-bridge",
  `${createHash("sha256").update(`${origin}\n${clientId}`).digest("hex").slice(0, 32)}.json`);
const cache = {
  read: () => { try { return JSON.parse(readFileSync(cachePath, "utf8")); } catch (error) { if (error?.code === "ENOENT") return undefined; throw error; } },
  write: (entry) => {
    mkdirSync(dirname(cachePath), { recursive: true, mode: 0o700 });
    const temporary = `${cachePath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
    renameSync(temporary, cachePath);
  },
};
const tokens = createClientCredentialsClient({ tokenUrl: `${origin}/oauth/token`, clientId, clientSecret, resource: `${origin}/mcp` });
const transport = mcpHttpTransport({ url: `${origin}/mcp`, headers: async () => ({ authorization: `Bearer ${await tokens.getToken()}` }), refreshAuthorization: () => tokens.invalidate() });
bridgeMcpStdio(transport, { cache, onError: (error) => { if (error?.status === 401) tokens.invalidate(); process.stderr.write(`[mcp bridge] ${error?.message ?? error}\n`); } });
