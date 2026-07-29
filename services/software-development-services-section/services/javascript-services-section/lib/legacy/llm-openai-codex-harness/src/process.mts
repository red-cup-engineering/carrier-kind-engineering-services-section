// process — the persistent Codex CLI process the harness supervises.
//
// Spawns `codex mcp` (Codex acting as an MCP server over stdio) as a long-lived
// child and keeps it alive across requests, so a single Codex session — with its
// rigged-in MCP servers and `notify` hook — stays warm behind the hub. Speaks
// newline-delimited JSON-RPC to the child (the MCP stdio framing) and correlates
// responses by id, so callers can drive the live Codex over `request`.
//
// Spawn failures (e.g. `codex` not installed) are caught and surfaced through
// `status().lastError` rather than crashing the server: the hub stays up and the
// process can be started later once the binary is present.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import process from "node:process";

export interface CodexProcessOptions {
  /** The Codex executable. Defaults to "codex" (resolved on PATH). */
  readonly bin?: string;
  /** Arguments. Defaults to ["mcp"] — run Codex as an MCP server over stdio. */
  readonly args?: readonly string[];
  /** Working directory for the child. Defaults to process.cwd(). */
  readonly cwd?: string;
  /** Extra environment for the child, merged over the parent's. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  readonly requestTimeoutMs?: number;
}

export interface CodexStatus {
  readonly running: boolean;
  readonly pid: number | null;
  readonly command: string;
  readonly startedAt: string | null;
  readonly restarts: number;
  readonly lastError: string | null;
  readonly pendingRequests: number;
}

export interface CodexProcessHandle {
  /** Spawn the child if it is not already running. Idempotent. */
  start(): void;
  /** Terminate the child (SIGTERM, then SIGKILL after a grace period). */
  stop(): Promise<void>;
  /** Stop then start. */
  restart(): Promise<void>;
  /** A snapshot of the supervised process's state. */
  status(): CodexStatus;
  /** Send a JSON-RPC request to the live Codex process and await its response. */
  request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown>;
}

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

const STOP_GRACE_MS = 2000;

/** Create a supervisor for a persistent Codex CLI process. */
export function createCodexProcess(options: CodexProcessOptions = {}): CodexProcessHandle {
  const bin = options.bin ?? "codex";
  const args = [...(options.args ?? ["mcp"])];
  const command = [bin, ...args].join(" ");
  const requestTimeoutMs = options.requestTimeoutMs ?? 30000;

  let child: ChildProcessWithoutNullStreams | null = null;
  let startedAt: string | null = null;
  let restarts = 0;
  let lastError: string | null = null;
  let stdoutBuffer = "";
  let nextId = 1;
  const pending = new Map<number, Pending>();

  function settleAllPending(error: Error): void {
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    pending.clear();
  }

  function onLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    let message: { id?: unknown; result?: unknown; error?: { message?: string } };
    try {
      message = JSON.parse(trimmed) as typeof message;
    } catch {
      return; // not a JSON-RPC frame (log noise) — ignore
    }
    if (typeof message.id !== "number") return; // notification / unmatched
    const p = pending.get(message.id);
    if (p === undefined) return;
    clearTimeout(p.timer);
    pending.delete(message.id);
    if (message.error) p.reject(new Error(message.error.message ?? "codex rpc error"));
    else p.resolve(message.result);
  }

  function start(): void {
    if (child !== null) return;
    try {
      const spawned = spawn(bin, args, {
        cwd: options.cwd ?? process.cwd(),
        env: { ...process.env, ...options.env },
      });
      child = spawned;
      startedAt = new Date().toISOString();
      lastError = null;
      stdoutBuffer = "";

      spawned.stdout.setEncoding("utf8");
      spawned.stdout.on("data", (chunk: string) => {
        stdoutBuffer += chunk;
        let nl: number;
        while ((nl = stdoutBuffer.indexOf("\n")) >= 0) {
          const line = stdoutBuffer.slice(0, nl);
          stdoutBuffer = stdoutBuffer.slice(nl + 1);
          onLine(line);
        }
      });
      spawned.stderr.setEncoding("utf8");
      spawned.stderr.on("data", (chunk: string) => {
        lastError = chunk.trim().slice(0, 500);
      });
      spawned.on("error", (err: Error) => {
        lastError = err.message;
        child = null;
        startedAt = null;
        settleAllPending(new Error(`codex process error: ${err.message}`));
      });
      spawned.on("exit", (code, signal) => {
        if (child === spawned) {
          child = null;
          startedAt = null;
        }
        settleAllPending(new Error(`codex process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`));
      });
    } catch (err) {
      lastError = (err as Error).message;
      child = null;
      startedAt = null;
    }
  }

  async function stop(): Promise<void> {
    const current = child;
    if (current === null) return;
    await new Promise<void>((resolve) => {
      const force = setTimeout(() => {
        try { current.kill("SIGKILL"); } catch { /* already gone */ }
      }, STOP_GRACE_MS);
      current.once("exit", () => {
        clearTimeout(force);
        resolve();
      });
      try { current.kill("SIGTERM"); } catch { clearTimeout(force); resolve(); }
    });
    child = null;
    startedAt = null;
  }

  async function restart(): Promise<void> {
    await stop();
    restarts += 1;
    start();
  }

  function status(): CodexStatus {
    return {
      running: child !== null,
      pid: child?.pid ?? null,
      command,
      startedAt,
      restarts,
      lastError,
      pendingRequests: pending.size,
    };
  }

  function request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown> {
    const current = child;
    if (current === null) {
      return Promise.reject(new Error("codex process is not running — start it first"));
    }
    const id = nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`codex rpc timeout after ${timeoutMs ?? requestTimeoutMs}ms (${method})`));
      }, timeoutMs ?? requestTimeoutMs);
      pending.set(id, { resolve, reject, timer });
      const frame = JSON.stringify({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
      try {
        current.stdin.write(`${frame}\n`);
      } catch (err) {
        clearTimeout(timer);
        pending.delete(id);
        reject(new Error(`failed to write to codex stdin: ${(err as Error).message}`));
      }
    });
  }

  return { start, stop, restart, status, request };
}
