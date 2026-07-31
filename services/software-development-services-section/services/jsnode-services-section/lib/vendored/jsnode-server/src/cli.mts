#!/usr/bin/env node
/**
 * jsnode-server CLI — serve [--root <dir>] [--port N] [--host H] [--interval N]
 */
import process from "node:process";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { start, installGracefulShutdown } from "@emsenn/web/server";
import { createJSNodeServer, jsNodeServerConfigFromManifest, type JSNodeServerConfig } from "./service.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18808;

function findRepoRoot(from: string): string | undefined {
  let dir = path.resolve(from);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function usage(): string {
  return "usage: jsnode-server serve [--root <dir>] [--port N] [--host H] [--interval N] [--config package.json]\n";
}

function envPort(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  io: { cwd?: string; stdout?: { write(s: string): void }; stderr?: { write(s: string): void }; env?: Record<string, string | undefined> } = {},
): Promise<number> {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const cwd = io.cwd ?? process.cwd();
  try {
    const positional: string[] = [];
    let rootArg: string | undefined;
    let portArg: number | undefined;
    let hostArg: string | undefined;
    let intervalArg: number | undefined;
    let configArg: string | undefined;
    let help = false;

    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i] ?? "";
      if (arg === "--help" || arg === "-h") { help = true; }
      else if (arg === "--root") { rootArg = argv[++i]; }
      else if (arg === "--port") {
        const raw = argv[++i] ?? "";
        const n = Number.parseInt(raw, 10);
        if (!Number.isInteger(n) || n < 1) throw new Error(`--port requires a positive integer; got: ${raw}`);
        portArg = n;
      } else if (arg === "--host") { hostArg = argv[++i]; }
      else if (arg === "--interval") {
        const raw = argv[++i] ?? "";
        const n = Number.parseInt(raw, 10);
        if (!Number.isInteger(n) || n < 1) throw new Error(`--interval requires a positive integer; got: ${raw}`);
        intervalArg = n;
      } else if (arg === "--config") { configArg = argv[++i]; }
      else if (!arg.startsWith("--")) positional.push(arg);
    }

    if (help) { out.write(usage()); return 0; }
    if (positional[0] !== "serve") throw new Error(usage());

    const configPath = path.resolve(cwd, configArg ?? "package.json");
    let manifest: Record<string, unknown> = {};
    try {
      manifest = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
    } catch { /* no config file: fall through to defaults */ }

    let fileConfig: Partial<JSNodeServerConfig> = {};
    try {
      fileConfig = jsNodeServerConfigFromManifest(manifest);
    } catch { /* no 561:jsnode-server key: use defaults */ }

    const root = rootArg !== undefined
      ? path.resolve(cwd, rootArg)
      : (typeof fileConfig.root === "string" && fileConfig.root.length > 0
          ? fileConfig.root
          : (findRepoRoot(cwd) ?? cwd));
    const port = portArg ?? envPort(env["PORT"]) ?? fileConfig.port ?? DEFAULT_PORT;
    const host = hostArg ?? env["HOST"] ?? DEFAULT_HOST;
    const intervalSeconds = intervalArg ?? fileConfig.intervalSeconds;

    const base = env["BASE_URL"] ?? fileConfig.base;
    const config: JSNodeServerConfig = {
      name: fileConfig.name ?? "jsnode-server",
      root,
      port,
      ...(base !== undefined ? { base } : {}),
      ...(intervalSeconds !== undefined ? { intervalSeconds } : {}),
    };
    const service = createJSNodeServer(config);
    await service.refresh();
    service.start();
    const result = await start(service.app, { port, host });
    installGracefulShutdown(result, { onClosed: () => service.stop() });
    out.write(`jsnode-server ${config.name} listening at http://${host}:${result.port}/ (${service.snapshot()?.packages.length ?? 0} packages)\n`);
    await new Promise<never>(() => {});
    return 0;
  } catch (error) {
    err.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function isMain(): boolean {
  return process.argv[1] !== undefined &&
    new URL(import.meta.url).pathname === path.resolve(process.argv[1]);
}

if (isMain()) {
  runCli().then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
