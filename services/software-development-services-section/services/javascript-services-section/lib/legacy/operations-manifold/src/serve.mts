import process from "node:process";
import { start, installGracefulShutdown } from "@red-cup-engineering/http-server";
import { createOperationsManifoldApp } from "./app.mts";
import { repoRootFromModule } from "./runtime.mts";

const repoRoot = repoRootFromModule(import.meta.url);

const port = Number(process.env["PORT"] ?? process.env["OPERATIONS_MANIFOLD_PORT"] ?? 18805);
const host = process.env["HOST"] ?? "127.0.0.1";
const app = createOperationsManifoldApp(repoRoot);

const result = await start(app, { port, host });
installGracefulShutdown(result);
process.stderr.write(`[operations-manifold] ops.561.group on ${host}:${result.port} — 561 Group Operations Manifold package-script operation surface at /\n`);
process.stderr.write(`[operations-manifold] MCP transport at /mcp\n`);
