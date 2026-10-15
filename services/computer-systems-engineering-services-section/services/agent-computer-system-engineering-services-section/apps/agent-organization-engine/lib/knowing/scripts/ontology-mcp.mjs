#!/usr/bin/env node
// The `sparql_query` tool as a stdio MCP server, for a session's MCP configuration.
//   SPARQL_ENDPOINT=http://127.0.0.1:7878/query node scripts/ontology-mcp.mjs
import { createMcpServer } from "@red-cup-engineering/mcp-engineering-services-section/server";
import { sparqlQueryTool } from "../src/writing/sparql/endpoint.mjs";

const endpoint = process.env.SPARQL_ENDPOINT ?? "http://127.0.0.1:7878/query";
createMcpServer({ name: "group-ontology", version: "0.1.0", title: "The Group's ontology", tools: [sparqlQueryTool({ endpoint })] }).serveStdio();
