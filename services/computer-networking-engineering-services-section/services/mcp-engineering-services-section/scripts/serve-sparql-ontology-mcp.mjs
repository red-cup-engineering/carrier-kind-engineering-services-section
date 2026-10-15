#!/usr/bin/env node
// The `sparql_query` tool (defined in the triplet serialized-content section) as a stdio MCP server, for a session's MCP configuration.
//   SPARQL_ENDPOINT=http://127.0.0.1:7878/query node scripts/serve-sparql-ontology-mcp.mjs
import { createMcpServer } from "../src/server.mjs";
import { sparqlQueryTool } from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/sparql-query-tool";

const endpoint = process.env.SPARQL_ENDPOINT ?? "http://127.0.0.1:7878/query";
createMcpServer({ name: "group-ontology", version: "0.1.0", title: "The Group's ontology", tools: [sparqlQueryTool({ endpoint })] }).serveStdio();
