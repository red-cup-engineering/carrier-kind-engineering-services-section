import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");

/** Observe the shipped listener's announcement under the caller's test deadline. */
export function startHttpProcess(env, signal) {
  const child = spawn(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "scripts/metroplat-serve.mjs"], {
    cwd: packageRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const closed = new Promise((resolve) => child.once("close", resolve));
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  const lines = createInterface({ input: child.stdout });
  let abort;
  const ready = new Promise((resolve, reject) => {
    abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    child.once("error", reject);
    child.once("exit", (code, termination) => reject(new Error(`HTTP server exited with code ${code}, signal ${termination}: ${stderr}`)));
    lines.on("line", (line) => {
      const address = /^infograph-serve: .* on (http:\/\/\S+)$/u.exec(line)?.[1];
      if (address !== undefined) resolve(new URL(address));
    });
  });
  return {
    ready,
    get stdout() { return stdout; },
    async close() {
      signal.removeEventListener("abort", abort);
      lines.close();
      const running = () => child.exitCode === null && child.signalCode === null;
      if (running()) child.kill("SIGTERM");
      const escalation = setTimeout(() => { if (running()) child.kill("SIGKILL"); }, 2_000);
      try { await closed; } finally { clearTimeout(escalation); }
    },
  };
}
