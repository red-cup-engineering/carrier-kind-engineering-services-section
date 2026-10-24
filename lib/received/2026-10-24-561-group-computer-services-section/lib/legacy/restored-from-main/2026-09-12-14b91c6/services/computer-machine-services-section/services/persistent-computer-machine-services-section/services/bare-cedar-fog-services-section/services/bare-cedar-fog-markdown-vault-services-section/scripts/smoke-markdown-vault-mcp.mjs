#!/usr/bin/env node

import assert from "node:assert/strict";
import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = process.env.INFO_REPOSITORY_ROOT ?? "/home/emsenn/info";
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(PACKAGE_ROOT, "src/mcp-server.mjs")],
  cwd: PACKAGE_ROOT,
  env: { ...process.env, INFO_REPOSITORY_ROOT: repositoryRoot },
});
const client = new Client(
  { name: "bare-cedar-fog-markdown-vault-smoke", version: "1.0.0" },
  { capabilities: {} },
);

try {
  await client.connect(transport);
  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map(({ name }) => name),
    ["search_markdown_vaults", "search_markdown_lightcone", "read_markdown_carrier"],
  );
  assert(listed.tools.every(({ annotations }) => annotations?.readOnlyHint === true));

  const result = await client.callTool({
    name: "search_markdown_vaults",
    arguments: {
      query: "one-person transnational conglomerate",
      generation: "current",
      limit: 2,
    },
  });
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  assert.equal(result.structuredContent.type, "BareCedarFogMarkdownVaultSearchResult");
  assert(result.structuredContent.matches.length >= 1);
  assert(result.structuredContent.matches.every(({ path }) => !path.startsWith("/")));

  const privateResult = await client.callTool({
    name: "search_markdown_vaults",
    arguments: {
      query: "Absurdity of knowledge",
      vaultIds: ["public-services"],
      generation: "current",
      limit: 5,
    },
  });
  const personalLog = "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/emsenn-services-section/content/text/logs/personal-logs/2026/03/28/2026-03-28-1016-emsenn-personal-log.md";
  assert.notEqual(privateResult.isError, true, JSON.stringify(privateResult.content));
  assert(privateResult.structuredContent.matches.some(({ path, line, text }) => (
    path === personalLog && line === 55 && text === "## Absurdity of knowledge"
  )));

  const carrierResult = await client.callTool({
    name: "read_markdown_carrier",
    arguments: { path: personalLog, section: "Absurdity of knowledge" },
  });
  assert.notEqual(carrierResult.isError, true, JSON.stringify(carrierResult.content));
  assert.equal(carrierResult.structuredContent.kind, "red-cup-engineering.markdown-vault.read-carrier");
  assert.equal(carrierResult.structuredContent.section, "Absurdity of knowledge");
  assert(carrierResult.structuredContent.outline.some(({ title }) => title === "Absurdity of knowledge"));

  const refusalResult = await client.callTool({
    name: "read_markdown_carrier",
    arguments: { path: "../outside-repository.md" },
  });
  assert.notEqual(refusalResult.isError, true, JSON.stringify(refusalResult.content));
  assert.equal(refusalResult.structuredContent.kind, "red-cup-engineering.markdown-vault.read-carrier.refusal");
  assert.equal(refusalResult.structuredContent.reason, "outside-repository-root");

  process.stdout.write(`${JSON.stringify({
    ok: true,
    server: client.getServerVersion(),
    tools: listed.tools.map(({ name }) => name),
    matches: result.structuredContent.matches.length,
    privatePersonalLogMatches: privateResult.structuredContent.matches.filter(({ path }) => path === personalLog).length,
    carrierSectionHeadingCount: carrierResult.structuredContent.outline.length,
    carrierOutsideRootRefusalReason: refusalResult.structuredContent.reason,
  })}\n`);
} finally {
  await client.close();
}
