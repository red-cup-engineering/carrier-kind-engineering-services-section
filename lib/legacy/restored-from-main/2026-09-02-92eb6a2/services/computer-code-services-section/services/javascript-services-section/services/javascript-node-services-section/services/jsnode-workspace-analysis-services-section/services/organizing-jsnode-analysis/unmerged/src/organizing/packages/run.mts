/**
 * Running package bins — executing a computing strategy boundary.
 *
 * A package bin is admitted as a stdio process boundary (bin.mts): request body
 * to stdin, stdout back. That run belongs to the computer, not to any one
 * transport — every HTTP / MCP / OpenAPI service that mounts these bins needs
 * the same spawn, so it lives here and they consume it.
 *
 * Profiling is an opt-in *read on the same run*: with `profile: true` the run
 * also yields a FootprintReading (wall time + peak RSS), measured by sampling
 * the child's `/proc/<pid>/status` high-water mark. Default off is byte-for-byte
 * the plain spawn — zero added overhead until you ask to be profiled.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { performance } from "node:perf_hooks";
import { execPath } from "node:process";
import type { FootprintReading } from "./footprint.mjs";

/** Extensions whose bins are node scripts, run through the node interpreter. */
const NODE_SCRIPT_EXTENSIONS = new Set([".mjs", ".cjs", ".js", ".mts", ".cts", ".ts"]);

/**
 * Resolve the command + argv for spawning a declared bin. Node-script bins carry
 * a `#!/usr/bin/env node` shebang, which POSIX honours but Windows cannot exec —
 * spawning the `.mjs` directly there fails with `EFTYPE`. Routing such bins
 * through the current node interpreter (`process.execPath`) runs the same process
 * boundary byte-for-byte on every platform; a true native binary (any other
 * extension) keeps spawning directly.
 */
function resolveInvocation(executable: string, args: readonly string[]): { command: string; argv: string[] } {
  if (NODE_SCRIPT_EXTENSIONS.has(extname(executable).toLowerCase())) {
    return { command: execPath, argv: [executable, ...args] };
  }
  return { command: executable, argv: [...args] };
}

export interface RunResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** Present only when `profile: true` was requested. */
  readonly footprint?: FootprintReading;
}

export interface RunNodeBinaryOptions {
  /** Bytes written to the child's stdin, then closed. */
  readonly stdin?: string;
  /** Argument vector for the executable. */
  readonly args?: readonly string[];
  /** When true, also yield a FootprintReading for this run. */
  readonly profile?: boolean;
  /** Peak-RSS sampling interval in ms while profiling. Default 25. */
  readonly pollMs?: number;
}

/** Read a process's peak resident set (VmHWM) in bytes, best-effort (Linux). */
function readPeakRssBytes(pid: number): number | undefined {
  try {
    const match = readFileSync(`/proc/${pid}/status`, "utf8").match(/^VmHWM:\s+(\d+)\s+kB/mu);
    return match ? Number(match[1]) * 1024 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Run a declared stdio executable: pipe `stdin` in, collect stdout/stderr, and —
 * when `profile` is set — a footprint reading. Rejects only on spawn error; a
 * nonzero exit resolves with its code so callers decide how to treat it.
 */
export function runNodeBinary(executable: string, options: RunNodeBinaryOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const profile = options.profile === true;
    const start = performance.now();
    const { command, argv } = resolveInvocation(executable, options.args ?? []);
    const child = spawn(command, argv, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let peakRssBytes: number | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    if (profile && typeof child.pid === "number") {
      const pid = child.pid;
      const sample = (): void => {
        const rss = readPeakRssBytes(pid);
        if (rss !== undefined && (peakRssBytes === undefined || rss > peakRssBytes)) peakRssBytes = rss;
      };
      sample();
      timer = setInterval(sample, options.pollMs ?? 25);
      if (typeof timer.unref === "function") timer.unref();
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (err) => {
      if (timer !== undefined) clearInterval(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer !== undefined) clearInterval(timer);
      if (!profile) {
        resolve({ code, stdout, stderr });
        return;
      }
      const footprint: FootprintReading = Object.freeze({
        wallMs: performance.now() - start,
        exitCode: code,
        ...(peakRssBytes === undefined ? {} : { maxRssBytes: peakRssBytes }),
      });
      resolve({ code, stdout, stderr, footprint });
    });
    child.stdin.end(options.stdin ?? "");
  });
}
