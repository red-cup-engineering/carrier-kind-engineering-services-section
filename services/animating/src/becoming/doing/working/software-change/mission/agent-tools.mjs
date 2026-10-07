import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { mkdirSync } from "node:fs";
import { applyEditBlocks, prepareCreateArtifact } from "./edit-language.mjs";
import { runTestsCommand } from "@red-cup-engineering/javascript-node-services-section/run-sandboxed-command";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const SKIP = new Set([".git", "node_modules", ".lake", "dist", "coverage"]);

function inside(root, requested = ".") {
  const path = resolve(root, requested);
  if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) throw new Error("path escapes the admitted territory");
  return path;
}

function contained(root, path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

function realParent(path) {
  let current = path;
  while (!existsSync(current)) current = dirname(current);
  return realpathSync(current);
}

function admittedPath(root, rootReal, requested) {
  if (typeof requested !== "string" || requested.length === 0) throw new TypeError("change path is required");
  const path = inside(root, requested);
  let inspected = root;
  for (const segment of relative(root, path).split(sep).filter(Boolean)) {
    inspected = resolve(inspected, segment);
    try {
      if (lstatSync(inspected).isSymbolicLink()) throw new Error(`change path contains a symlink: ${requested}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const existingReal = existsSync(path) ? realpathSync(path) : realParent(dirname(path));
  if (!contained(rootReal, existingReal)) throw new Error(`change path escapes the admitted territory through a symlink: ${requested}`);
  return { path, relativePath: relative(root, path) };
}

function walk(root, at = root, out = []) {
  if (!existsSync(at)) return out;
  for (const entry of readdirSync(at, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = resolve(at, entry.name);
    if (entry.isDirectory()) walk(root, path, out);
    else if (entry.isFile()) out.push(relative(root, path));
  }
  return out;
}

export function digest(bytes) {
  return sha256Hex(bytes);
}

export function territorySnapshot(root) {
  const files = walk(root);
  return { files, truncated: false };
}

export function createAgentTools({ root, verifyCommand, acceptanceCommand = verifyCommand, commands = {}, writablePaths = [], readablePaths = [], restoreWriteFile = writeFileSync, restoreMakeDirectory = mkdirSync } = {}) {
  root = resolve(root);
  const rootReal = realpathSync(root);
  const changed = new Map();
  const admittedWrites = writablePaths.map((path) => relative(root, inside(root, path)));
  const writeAdmitted = (path) => !admittedWrites.length || admittedWrites.some((allowed) => path === allowed || path.startsWith(`${allowed}${sep}`));
  const admittedReads = readablePaths.map((path) => relative(root, inside(root, path)));
  const readAdmitted = (path) => !admittedReads.length || admittedReads.some((allowed) => path === allowed || path.startsWith(`${allowed}${sep}`));
  const observe = (value) => JSON.stringify(value);
  const checkObservation = (result) => ({ passed: result.passed, output: result.passed ? "exit=0" : result.output });
  const checks = () => {
    const verification = runTestsCommand(root, verifyCommand);
    const acceptance = acceptanceCommand === verifyCommand ? verification : runTestsCommand(root, acceptanceCommand);
    return { verification, acceptance };
  };
  let settledChecks = verifyCommand
    ? checks()
    : { verification: { passed: false, output: "" }, acceptance: { passed: false, output: "" } };
  return {
    changed,
    restoreChanges(changes = [], { requirePassingChecks = false } = {}) {
      if (changed.size) throw new Error("checkpoint restoration requires a fresh process workspace");
      if (!Array.isArray(changes)) throw new TypeError("changes must be an array");
      if (changes.length === 0) {
        if (requirePassingChecks) throw new TypeError("one or more changes are required");
        return { changedPaths: [], ...settledChecks };
      }
      const prepared = [];
      const paths = new Set();
      for (const change of changes) {
        const { path, relativePath } = admittedPath(root, rootReal, change?.path);
        if (!writeAdmitted(relativePath)) throw new Error(`checkpoint path is outside declared writable paths: ${relativePath}`);
        if (paths.has(relativePath)) throw new Error(`checkpoint repeats path: ${relativePath}`);
        paths.add(relativePath);
        const existed = existsSync(path), before = existed ? readFileSync(path) : Buffer.alloc(0);
        if (existed !== change?.beforeExisted || `sha256:${digest(before)}` !== change?.beforeDigest) {
          throw new Error(`checkpoint does not descend from the admitted source: ${relativePath}`);
        }
        const after = Buffer.from(change?.afterBytesBase64 ?? "", "base64");
        if (`sha256:${digest(after)}` !== change?.afterDigest) throw new Error(`checkpoint after digest is invalid: ${relativePath}`);
        prepared.push({ path, relativePath, existed, before, after });
      }
      const applied = [];
      const rollback = () => {
        for (const entry of [...applied].reverse()) {
          if (entry.existed) writeFileSync(entry.path, entry.before);
          else {
            try { unlinkSync(entry.path); } catch (error) { if (error?.code !== "ENOENT") throw error; }
          }
        }
        changed.clear();
      };
      try {
        for (const entry of prepared) {
          applied.push(entry);
          restoreMakeDirectory(dirname(entry.path), { recursive: true });
          restoreWriteFile(entry.path, entry.after);
          changed.set(entry.relativePath, { existed: entry.existed, bytes: entry.before, digest: digest(entry.before) });
        }
        const settled = checks();
        if (requirePassingChecks && (!settled.verification.passed || !settled.acceptance.passed)) {
          rollback();
          return { changedPaths: [], rolledBack: true, ...settled };
        }
        settledChecks = settled;
        return { changedPaths: [...changed.keys()], ...settled };
      } catch (error) {
        rollback();
        throw error;
      }
    },
    execute(action) {
      const args = action?.args || {};
      if (action.action === "list_files") {
        const relativePath = relative(root, resolve(root, args.path || "."));
        if (relativePath !== "" && !readAdmitted(relativePath)) return observe({ error: `list_files path is outside declared readable paths: ${relativePath}` });
        const base = inside(root, args.path || ".");
        const files = walk(root, base).filter(file => readAdmitted(file));
        const requested = Number(args.max);
        return observe({ files: Number.isSafeInteger(requested) && requested >= 0 ? files.slice(0, requested) : files });
      }
      if (action.action === "search") {
        const query = String(args.query || "");
        if (!query) return observe({ error: "search requires args.query" });
        const relativePath = relative(root, resolve(root, args.path || "."));
        if (relativePath !== "" && !readAdmitted(relativePath)) return observe({ error: `search path is outside declared readable paths: ${relativePath}` });
        const base = inside(root, args.path || ".");
        const hits = [];
        const requested = Number(args.max);
        for (const file of walk(root, base)) {
          if (!readAdmitted(file)) continue;
          const path = inside(root, file);
          let text;
          try { text = readFileSync(path, "utf8"); } catch { continue; }
          for (const [index, line] of text.split("\n").entries()) {
            if (line.toLowerCase().includes(query.toLowerCase())) hits.push({ path: file, line: index + 1, text: line });
            if (Number.isSafeInteger(requested) && requested >= 0 && hits.length >= requested) return observe({ hits, truncated: true, truncationAuthority: "caller" });
          }
        }
        return observe({ hits, truncated: false });
      }
      if (action.action === "read") {
        const path = inside(root, args.path);
        const relativePath = relative(root, path);
        if (!readAdmitted(relativePath)) return observe({ ok: false, error: `read path is outside declared readable paths: ${relativePath}` });
        const start = Math.max(1, Number(args.startLine) || 1), end = Number.isSafeInteger(Number(args.endLine)) ? Number(args.endLine) : undefined;
        const lines = readFileSync(path, "utf8").split("\n");
        const last = end === undefined ? lines.length : Math.min(Math.max(start, end), lines.length);
        return observe({ path: relativePath, startLine: start, endLine: last, text: lines.slice(start - 1, last).join("\n") });
      }
      if (action.action === "edit") {
        const path = inside(root, args.path), relativePath = relative(root, path);
        if (!writeAdmitted(relativePath)) return observe({ ok: false, error: `edit path is outside declared writable paths: ${relativePath}`, writablePaths: admittedWrites });
        const existed = existsSync(path);
        const before = existed ? readFileSync(path, "utf8") : "";
        const blocks = (() => {
          if (typeof args.blocks === "string") return args.blocks;
          if (Array.isArray(args.blocks)) return args.blocks.map((block) => {
            if (typeof block === "string") return block;
            if (block && typeof block.search === "string" && typeof block.replace === "string") return `<<<<<<< SEARCH\n${block.search}\n=======\n${block.replace}\n>>>>>>> REPLACE`;
            return "";
          }).filter(Boolean).join("\n");
          if (args.blocks && typeof args.blocks.search === "string" && typeof args.blocks.replace === "string") return `<<<<<<< SEARCH\n${args.blocks.search}\n=======\n${args.blocks.replace}\n>>>>>>> REPLACE`;
          return "";
        })();
        const result = applyEditBlocks(before, blocks);
        if (!result.ok) return observe({ ok: false, terminal: true, error: result.reason || "no edit blocks" });
        if (result.result === before) return observe({ ok: false, terminal: true, error: "edit produced no differential information" });
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, result.result);
        const { verification, acceptance } = checks();
        if (settledChecks.verification.passed && !verification.passed) {
          writeFileSync(path, before);
          return observe({
            ok: false,
            rolledBack: true,
            error: "edit regressed a settled passing verification",
            verification: checkObservation(verification),
            acceptance: checkObservation(acceptance),
          });
        }
        if (!changed.has(relativePath)) changed.set(relativePath, { existed, bytes: Buffer.from(before), digest: digest(before) });
        settledChecks = { verification, acceptance };
        return observe({ ok: true, editBlocks: result.count, verification: checkObservation(verification), acceptance: checkObservation(acceptance) });
      }
      if (action.action === "create") {
        const prepared = prepareCreateArtifact({ workspace: root, path: args.path, content: args.content, writablePaths });
        if (!prepared.ok) return observe({ ok: false, terminal: true, error: prepared.reason });
        const relativePath = relative(root, prepared.path);
        mkdirSync(dirname(prepared.path), { recursive: true });
        writeFileSync(prepared.path, prepared.content);
        const { verification, acceptance } = checks();
        if (settledChecks.verification.passed && !verification.passed) {
          unlinkSync(prepared.path);
          return observe({
            ok: false,
            rolledBack: true,
            error: "create regressed a settled passing verification",
            verification: checkObservation(verification),
            acceptance: checkObservation(acceptance),
          });
        }
        changed.set(relativePath, { existed: false, bytes: Buffer.alloc(0), digest: digest("") });
        settledChecks = { verification, acceptance };
        return observe({ ok: true, created: true, verification: checkObservation(verification), acceptance: checkObservation(acceptance) });
      }
      if (action.action === "command") {
        const named = commands[String(args.name || "")];
        if (!named?.command) return observe({ terminal: true, error: `command is not admitted: ${args.name || "(missing)"}`, available: Object.keys(commands) });
        const result = runTestsCommand(root, named.command);
        return observe({ command: args.name, passed: result.passed, output: result.output });
      }
      if (action.action === "test" || action.action === "finish") {
        const { verification, acceptance } = checks();
        return observe({ verification: checkObservation(verification), acceptance: checkObservation(acceptance), changedPaths: [...changed.keys()] });
      }
      return observe({ terminal: true, error: `unknown action ${action?.action}` });
    },
    verify() { return checks(); },
    changes() {
      return [...changed.entries()].map(([path, before]) => {
        const current = readFileSync(inside(root, path));
        return { path, before, after: current, afterDigest: digest(current), changedBytes: Math.abs(current.length - before.bytes.length) + current.length };
      });
    },
  };
}

/**
 * Induces an isolated, verified mission proposal into an explicitly bounded receiver territory.
 * @param {{root:string,writablePaths:readonly string[],verifyCommand:string,acceptanceCommand?:string,proposal:{type:string,changes:readonly object[]}}} input Receiver-owned induction input.
 * @returns {{changedPaths:readonly string[],verification:object,acceptance:object}} The successful receiver check results.
 * @throws {Error} When the proposal is stale, out of scope, unsafe, or fails either receiver check.
 */
export function induceVerifiedSoftwareMissionProposal({ root, writablePaths, verifyCommand, acceptanceCommand = verifyCommand, proposal } = {}) {
  if (!Array.isArray(writablePaths) || writablePaths.length === 0) throw new TypeError("receiver induction requires explicit nonempty writablePaths");
  if (proposal?.type !== "SoftwareMissionChangeProposal" || !Array.isArray(proposal.changes) || proposal.changes.length === 0) {
    throw new TypeError("receiver induction requires one nonempty SoftwareMissionChangeProposal");
  }
  const tools = createAgentTools({ root, writablePaths: [...writablePaths], verifyCommand, acceptanceCommand });
  const result = tools.restoreChanges(proposal.changes, { requirePassingChecks: true });
  if (result.rolledBack || !result.verification.passed || !result.acceptance.passed) {
    throw new Error("receiver induction rolled back because verification or acceptance failed");
  }
  return result;
}
