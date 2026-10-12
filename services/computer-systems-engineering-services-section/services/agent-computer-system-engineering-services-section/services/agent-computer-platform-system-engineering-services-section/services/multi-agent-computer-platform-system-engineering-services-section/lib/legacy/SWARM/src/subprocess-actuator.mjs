// subprocess-actuator — the highest-blast-radius do-things-on-the-computer actuator: run a shell
// command (npm test / npm run build / git …) and capture exit code + stdout/stderr. The single biggest
// "agent can actually act" gap: the subprocess.run policy is already DECLARED (tool-policy.mjs:75) but
// until now was unbacked. This module backs it.
//
// Like the FILES actuators (actuators.mjs), this owns ONLY the ONE structural refusal that is a FACT
// ABOUT THE PATH — sandbox escape, here on the working directory — and decides NO governance. The
// governance decision (tool-policy admission: subprocess.run requiresLeaderAuthorization=true, so the
// delegation chain must carry authority via dispatchAdmissible; then the Gov regime; then the held-⊤
// safety gate, which can BLOCK a destructive command) is wholly the runner's job
// (governed-tool-runner.mjs). The cwd is forced through withinRoot(root, …) so its sandbox refusal is
// the SAME out-of-sandbox fact as the file actuators — one refusal vocabulary across every actuator.
//
// spawn is async, so this is an ASYNC actuator. It returns a Promise of the exact actuator shape
// { ok, value, trace } that actuators.mjs:42 returns, so the merged async actuator registry in the
// runner can dispatch it uniformly. The actuator NEVER self-admits — it only ever executes after the
// three gates pass inside runGovernedTool; called directly it is a bare effect with no authority claim.

import { spawn } from "node:child_process";
import { resolve, relative } from "node:path";

import { withinRoot } from "./actuators.mjs";
import { toolPolicyFor } from "./tool-policy.mjs";

// DEFAULT_TIMEOUT_MS — NOT a hidden literal. timeoutMs is a GOVERNED/DECLARED parameter: it is read
// (in priority order) from (1) the caller's options/args, then (2) the subprocess.run tool-policy field
// `timeoutMs` (a documented policy field, the place the bound BELONGS so it is one governed quantity for
// every subprocess run), and only then this module-level documented default. The default is the
// fail-closed last resort so a missing policy field never means "no bound at all" (an unbounded child is
// itself a safety hazard); it is exported so it is addressable, never buried.
export const DEFAULT_SUBPROCESS_TIMEOUT_MS = 120000;

// resolveTimeoutMs — the governed-parameter resolution described above. A non-finite or non-positive
// value at any level is ignored (it would mean "no bound"); the documented default fills the gap.
function resolveTimeoutMs(args = {}, options = {}) {
  const policy = toolPolicyFor("subprocess.run");
  const candidates = [
    args.timeoutMs,
    options.timeoutMs,
    options.subprocessTimeoutMs,
    policy.timeoutMs,
    DEFAULT_SUBPROCESS_TIMEOUT_MS,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_SUBPROCESS_TIMEOUT_MS;
}

// refused — the ok:false result + its swarm.actuator.refused proposed trace row, mirroring
// actuators.mjs:21 so a subprocess refusal reads in the same vocabulary as a file refusal.
function refused(object, error) {
  return {
    ok: false,
    tool: "subprocess.run",
    scope: "compute",
    error,
    value: null,
    trace: { predicate: "subprocess.run", object, kind: "swarm.actuator.refused" },
  };
}

// runSubprocess(root, { command, args, cwd, timeoutMs }, options) — spawn `command` with `args` inside a
// cwd that is FORCED through withinRoot(root, cwd): an out-of-sandbox cwd is refused with the same
// out-of-sandbox fact a file actuator surfaces, never executed. Captures exitCode/stdout/stderr/signal.
// ASYNC: returns a Promise of the actuator-shaped { ok, value:{ exitCode, stdout, stderr, signal },
// trace:{ predicate:'subprocess.run', object:command, kind:'swarm.actuator.exec' } }.
export function runSubprocess(root, { command, args = [], cwd = ".", timeoutMs } = {}, options = {}) {
  return new Promise((resolveResult) => {
    if (typeof command !== "string" || command.length === 0) {
      resolveResult(refused(String(command ?? ""), "malformed-args"));
      return;
    }
    if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) {
      resolveResult(refused(command, "malformed-args"));
      return;
    }

    // the ONE structural refusal this actuator owns: the working directory must lie inside root.
    const absCwd = withinRoot(root, cwd);
    if (!absCwd) {
      resolveResult(refused(command, "out-of-sandbox"));
      return;
    }

    const limitMs = resolveTimeoutMs({ timeoutMs }, options);

    let child;
    try {
      child = spawn(command, args, {
        cwd: absCwd,
        timeout: limitMs,
        windowsHide: true,
        shell: false,
      });
    } catch (e) {
      // spawn can throw synchronously (e.g. a non-string command slipped past) — fail closed.
      resolveResult(refused(command, e.code === "ENOENT" ? "enoent" : "spawn-error"));
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const relCwd = relative(resolve(root), absCwd);

    if (child.stdout) child.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
    if (child.stderr) child.stderr.on("data", (d) => { stderr += d.toString("utf8"); });

    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      // ENOENT here = the command binary was not found — a structural fact about the command path,
      // surfaced as a refusal in the same vocabulary as a missing file.
      resolveResult(refused(command, e.code === "ENOENT" ? "enoent" : "spawn-error"));
    });

    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      // A run that COMPLETED is ok:true even with a non-zero exit code: the exit code is the VALUE the
      // agent asked for (did the test/build pass?), not an actuator refusal. The actuator only refuses
      // on facts about the path/command (sandbox escape, missing binary, malformed args). A timeout
      // surfaces as signal SIGTERM with exitCode null — that fact is carried in value, not hidden.
      resolveResult({
        ok: true,
        tool: "subprocess.run",
        scope: "compute",
        value: {
          exitCode: exitCode === null ? null : Number(exitCode),
          stdout,
          stderr,
          signal: signal ?? null,
          command,
          args,
          relCwd,
          timeoutMs: limitMs,
        },
        trace: { predicate: "subprocess.run", object: command, kind: "swarm.actuator.exec" },
      });
    });
  });
}

// SUBPROCESS_ACTUATORS — (root, args, options) => Promise<result>, keyed by tool name, merged into the
// async actuator registry the runner dispatches. Each call runs a real child process, sandboxed to root
// by its cwd, and decides NO governance — exactly the contract of ACTUATORS in actuators.mjs.
export const SUBPROCESS_ACTUATORS = {
  "subprocess.run": (root, args, options) => runSubprocess(root, args ?? {}, options ?? {}),
};

// SUBPROCESS_SCHEMAS — the OpenAI function-schema, shaped like ACTUATOR_SCHEMAS (actuators.mjs:122), so
// toolSchemasFor can advertise the capability to a tool-calling model. timeoutMs is an OPTIONAL declared
// input here (its governed default lives in the tool-policy / DEFAULT_SUBPROCESS_TIMEOUT_MS), never a
// hidden literal the model has to guess.
export const SUBPROCESS_SCHEMAS = {
  "subprocess.run": {
    name: "subprocess.run",
    description:
      "Run a shell command (e.g. npm test, npm run build, git status) inside the workspace root and capture its exit code, stdout, and stderr. Leader-delegated: requires an authorizing delegation chain.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "the executable to run (no shell interpolation; argv form)" },
        args: { type: "array", items: { type: "string" }, description: "argument vector passed to the command" },
        cwd: { type: "string", description: "workspace-relative working directory (sandboxed to root)" },
        timeoutMs: { type: "number", description: "optional governed timeout; defaults to the subprocess.run policy bound" },
      },
      required: ["command"],
    },
  },
};
