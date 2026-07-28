// Real workspace operations: apply a unified diff, run a command, capture results.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function directArguments(command) {
  const parts = String(command || "").trim().split(/\s+/u).filter(Boolean);
  return parts.length > 0 && parts.every((part) => /^[A-Za-z0-9_./:@=+,%-]+$/u.test(part)) ? parts : null;
}

export function runCommand(command, { cwd, shell = "auto", signal } = {}) {
  if (signal?.aborted) throw signal.reason ?? new Error("command execution cancelled by customer");
  const childEnvironment = { ...process.env };
  // Node deliberately suppresses recursive `node --test` execution when this
  // private marker leaks from the outer test runner. Verification commands are
  // separate host acts and must execute rather than inherit that suppression.
  delete childEnvironment.NODE_TEST_CONTEXT;
  const argv = shell === true ? null : directArguments(command);
  // A declared direct Node verification is a request for this provider's
  // runtime, not whatever executable an ambient PATH happens to name.  Keep
  // PATH itself intact for declared child tools (for example forge/cast).
  if (argv?.[0] === "node") argv[0] = process.execPath;
  const res = argv
    ? spawnSync(argv[0], argv.slice(1), { cwd, shell: false, encoding: "utf8", maxBuffer: Number.POSITIVE_INFINITY, env: childEnvironment })
    : spawnSync(command, { cwd, shell: shell === false ? false : true, encoding: "utf8", maxBuffer: Number.POSITIVE_INFINITY, env: childEnvironment });
  return {
    code: res.status,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    error: res.error?.message || "",
    cancelled: res.signal !== null && res.status === null,
  };
}

// Apply a unified diff in `workdir` via `git apply`. Returns { ok, error }.
export function applyUnifiedDiff(workdir, patch) {
  if (!patch || !patch.trim()) return { ok: false, error: "empty patch" };
  const dir = mkdtempSync(join(tmpdir(), "fcdev-"));
  const patchFile = join(dir, "change.patch");
  writeFileSync(patchFile, patch.endsWith("\n") ? patch : patch + "\n");
  // --3way lets git fall back to a merge when context is slightly off.
  const res = spawnSync("git", ["-C", workdir, "apply", "--3way", "--whitespace=nowarn", patchFile], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  if (res.status === 0) return { ok: true };
  return { ok: false, error: (res.stderr || res.stdout || `git apply exited ${res.status}`).trim() };
}

// Run a test/verify command; passed = exit code 0.
export function runTestsCommand(workdir, command, opts = {}) {
  const r = runCommand(command, { cwd: workdir, ...opts });
  return { passed: r.code === 0, output: `exit=${r.code}\n${r.stdout}\n${r.stderr}\n${r.error}` };
}
