// actuators — the native FILES actuator: real disk-touching executors (files.read / files.write / files.list)
// sandboxed to a workspace root. Mirrors fetch-tool.mjs's admit->act->witness shape, but each actuator owns ONLY
// the ONE structural refusal that is a FACT ABOUT THE PATH — sandbox escape — and never decides governance
// admission. That decision (tool-policy admission + recognition/Gov regime + held-⊤ safety) is the runner's job
// (governed-tool-runner.mjs). Each call returns a structured result AND a PROPOSED EAVT trace row {predicate=tool,
// object=path, kind}, which the runner is free to witness, refuse, or hold.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname, isAbsolute } from "node:path";
import { createHash } from "node:crypto";

// withinRoot — the one refusal the actuator owns: is `path` inside `root`? Returns the resolved absolute path when
// it is, or null when it escapes. The `..` check is the live POSIX guard; isAbsolute(rel) covers the Windows-drive
// edge where relative() yields an absolute path across drives.
export function withinRoot(root, path) {
  const abs = isAbsolute(path) ? path : resolve(root, path);
  const rel = relative(resolve(root), abs);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)) ? abs : null;
}

// refused — build the ok:false result + its swarm.actuator.refused proposed trace row.
function refused(tool, scope, path, error) {
  return {
    ok: false,
    tool,
    scope,
    error,
    value: null,
    trace: { predicate: tool, object: path, kind: "swarm.actuator.refused" },
  };
}

// ACTUATORS — (root, args) => result. Each touches disk for real, sandboxed to root, and returns a proposed EAVT
// trace row alongside the structured value. No governance decision happens here.
export const ACTUATORS = {
  "files.read": (root, { path }) => {
    const abs = withinRoot(root, path);
    if (!abs) return refused("files.read", "read", path, "out-of-sandbox");
    try {
      const content = readFileSync(abs, "utf8");
      const bytes = Buffer.byteLength(content, "utf8");
      const digest = "sha256-" + createHash("sha256").update(content).digest("hex");
      return {
        ok: true,
        tool: "files.read",
        scope: "read",
        value: { path: abs, relPath: relative(resolve(root), abs), bytes, digest, content },
        trace: { predicate: "files.read", object: relative(resolve(root), abs), kind: "swarm.actuator.read" },
      };
    } catch (e) {
      return refused(
        "files.read",
        "read",
        path,
        e.code === "ENOENT" ? "enoent" : e.code === "EISDIR" ? "eisdir" : "io-error",
      );
    }
  },
  "files.write": (root, { path, content }) => {
    const abs = withinRoot(root, path);
    if (!abs) return refused("files.write", "write", path, "out-of-sandbox");
    if (typeof content !== "string") return refused("files.write", "write", path, "malformed-args");
    try {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
      const bytes = Buffer.byteLength(content, "utf8");
      const digest = "sha256-" + createHash("sha256").update(content).digest("hex");
      return {
        ok: true,
        tool: "files.write",
        scope: "write",
        value: { path: abs, relPath: relative(resolve(root), abs), bytesWritten: bytes, digest },
        trace: { predicate: "files.write", object: relative(resolve(root), abs), kind: "swarm.actuator.write" },
      };
    } catch (e) {
      return refused("files.write", "write", path, "io-error");
    }
  },
  "files.list": (root, { path = "." }) => {
    const abs = withinRoot(root, path);
    if (!abs) return refused("files.list", "read", path, "out-of-sandbox");
    try {
      const entries = readdirSync(abs, { withFileTypes: true }).map((d) => ({
        name: d.name,
        type: d.isDirectory() ? "dir" : "file",
      }));
      return {
        ok: true,
        tool: "files.list",
        scope: "read",
        value: { path: abs, relPath: relative(resolve(root), abs), entries },
        trace: { predicate: "files.list", object: relative(resolve(root), abs), kind: "swarm.actuator.list" },
      };
    } catch (e) {
      return refused(
        "files.list",
        "read",
        path,
        e.code === "ENOENT" ? "enoent" : e.code === "ENOTDIR" ? "eisdir" : "io-error",
      );
    }
  },
};

// runActuator — dispatch by name. Unknown names fail closed with no-actuator (scope compute), still proposing a
// refused trace row so the runner has something auditable to hold. `extraActuators` (subprocess/patch/network/
// mcp/…) merge OVER the base files registry — additive, injected by the caller so this module stays decoupled
// from the async actuators. An actuator fn may return a result OR a promise; the governed runner awaits it.
export function runActuator(root, name, args, { extraActuators } = {}) {
  const fn = (extraActuators && extraActuators[name]) || ACTUATORS[name];
  if (!fn)
    return {
      ok: false,
      tool: name,
      scope: "compute",
      error: "no-actuator",
      value: null,
      trace: { predicate: name, object: "", kind: "swarm.actuator.refused" },
    };
  return fn(root, args ?? {});
}

// ACTUATOR_SCHEMAS — OpenAI function-schema parameters, consumed by toolSchemasFor to advertise these capabilities
// to a tool-calling model.
export const ACTUATOR_SCHEMAS = {
  "files.read": {
    name: "files.read",
    description: "Read a UTF-8 text file inside the workspace root.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "workspace-relative path" } },
      required: ["path"],
    },
  },
  "files.write": {
    name: "files.write",
    description: "Write a UTF-8 text file inside the workspace root (leader-delegated).",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  "files.list": {
    name: "files.list",
    description: "List directory entries inside the workspace root.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: [],
    },
  },
};
