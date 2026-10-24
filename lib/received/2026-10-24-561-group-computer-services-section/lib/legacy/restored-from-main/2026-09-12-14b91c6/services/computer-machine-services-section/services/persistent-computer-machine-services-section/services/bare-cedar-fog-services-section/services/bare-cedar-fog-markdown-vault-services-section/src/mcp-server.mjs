#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  readBareCedarFogMarkdownCarrier,
  searchBareCedarFogMarkdownLanguageLightcone,
  searchBareCedarFogMarkdownVaults,
} from "./index.mjs";
import { withSearchJournal } from "./search-journal.mjs";

const generation = z.enum(["all", "current", "legacy", "reference", "triage"]);
const vaultIds = z.array(z.string().min(1)).min(1).max(6).optional();
// This file lives at <packageRoot>/src/mcp-server.mjs; the journal is owned
// by the package itself, independent of the repository `root` being searched.
const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVER = "markdown-vault";

export function createMarkdownVaultMcpServer({ root }) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("a fixed repository root is required");
  }

  const server = new McpServer(
    { name: "bare-cedar-fog-markdown-vault", version: "1.0.0" },
    {
      instructions: [
        "Read-only access to Markdown carriers in the Bare Cedar Fog info repository.",
        "The server fixes the repository root; callers cannot select another filesystem root.",
        "Use search_markdown_vaults for exact carrier evidence and search_markdown_lightcone when repository path semantics should narrow the search.",
        "Once search has named the carrier (a path came back from either search tool), use read_markdown_carrier to read it directly — its frontmatter, heading outline, and one named section's body — instead of grepping or shelling out to sed/cat on the same path.",
      ].join(" "),
    },
  );

  server.registerTool("search_markdown_vaults", {
    title: "Search repository Markdown",
    description: "Search the repository's Markdown vaults with bounded ripgrep and return path, generation, line, column, and matching line evidence.",
    inputSchema: {
      query: z.string().min(1),
      vaultIds,
      generation: generation.default("current"),
      caseSensitive: z.boolean().default(false),
      regularExpression: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(25),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true },
  }, withSearchJournal({
    packageRoot: PACKAGE_ROOT,
    server: SERVER,
    tool: "search_markdown_vaults",
    deriveCount: (output) => ({
      results: output.structuredContent.matches.length,
      truncated: output.structuredContent.truncated,
    }),
  }, async (input) => {
    const result = await searchBareCedarFogMarkdownVaults({ root, ...input });
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  }));

  server.registerTool("search_markdown_lightcone", {
    title: "Search Markdown through repository semantics",
    description: "Project bounded semantic keywords through the repository's declared edge vocabulary and proof paths, then search only the admitted Markdown candidates.",
    inputSchema: {
      keywords: z.array(z.string().min(1)).min(1).max(12),
      query: z.string().min(1),
      depth: z.number().int().min(0).max(4).default(2),
      candidateLimit: z.number().int().min(1).max(1_000).default(300),
      includeCarrierReadings: z.boolean().default(true),
      vaultIds,
      generation: generation.default("current"),
      limit: z.number().int().min(1).max(100).default(25),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true },
  }, withSearchJournal({
    packageRoot: PACKAGE_ROOT,
    server: SERVER,
    tool: "search_markdown_lightcone",
    deriveCount: (output) => ({
      results: output.structuredContent.search.matches.length,
      truncated: output.structuredContent.search.truncated,
    }),
  }, async (input) => {
    const result = await searchBareCedarFogMarkdownLanguageLightcone({ root, ...input });
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  }));

  server.registerTool("read_markdown_carrier", {
    title: "Read one Markdown carrier",
    description: "Reads one Markdown carrier named by a prior search (or otherwise known path): its parsed frontmatter, its heading outline (title, level, line), and the body of one named section (heading text) or the whole body when no section is named, truncated at maxCharacters. Use this instead of sed/cat/grep on a carrier path once you know it — it refuses (as a datum, not an error) a path outside the repository root, a non-.md path, a missing file, or an unknown section.",
    inputSchema: {
      path: z.string().min(1),
      section: z.string().min(1).optional(),
      headingDepth: z.number().int().min(1).max(6).optional(),
      maxCharacters: z.number().int().min(1).default(12000),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false, readOnlyHint: true },
  }, withSearchJournal({
    packageRoot: PACKAGE_ROOT,
    server: SERVER,
    tool: "read_markdown_carrier",
    deriveCount: (output) => ({
      results: output.structuredContent.kind.endsWith(".refusal") ? 0 : 1,
      truncated: output.structuredContent.truncated ?? false,
    }),
  }, async (input) => {
    const result = await readBareCedarFogMarkdownCarrier({ root, ...input });
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  }));

  return server;
}

export async function serveMarkdownVaultMcp({
  root = process.env.INFO_REPOSITORY_ROOT,
  transport = new StdioServerTransport(),
} = {}) {
  const server = createMarkdownVaultMcpServer({ root });
  await server.connect(transport);
  return server;
}

function isMain() {
  return process.argv[1] !== undefined
    && new URL(import.meta.url).pathname === process.argv[1];
}

if (isMain()) {
  serveMarkdownVaultMcp().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
