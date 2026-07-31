/**
 * session — the codex coding-agent session computer, over the agent-* / git-* /
 * jsnode stack. The four capabilities the old `apps/codex-computer` exposed,
 * consolidated here as a library and surfaced through `scripts/session`:
 *
 *   capsule  — gather a package's key files into a reusable context capsule
 *   finding  — record a charge-bearing session finding (append-only JSONL)
 *   impact   — git change-impact: changed packages, dependents, commands
 *   recall   — recall what the session knows about a subject
 *
 * Composed from local Codex session findings/recall, @red-cup-engineering/computing/git +
 * git/codecs (status), @red-cup-engineering/organizing-with-jsnode (workspace + dependents,
 * via the workspace adapter), and @emsenn/relating (charges) — with no
 * dependency on the old swarm monolith.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gitStatus } from "@red-cup-engineering/computing/git";

import { action, carrierFrom, mark, negate, tm, valueOf, witnessedPotential } from "@emsenn/relating";
import { canonical as canonicalJson, requireJsonValue } from "@emsenn/relating/writing";
import {
  appendSessionFindings,
  computeImpact,
  cutSessionState,
  dataMountRoot,
  finding,
  findRepoRoot,
  loadWorkspace,
  recallSessionSubject,
  renderSessionRecall,
} from "@red-cup-engineering/organizing-with-openai-agents/session";

export interface CliResult { readonly code: number; readonly output: string }

export const CliResultSchema = { "$id": "organizing/openai/codex/session/cli-result", "title": "CodexSessionCliResult", "additionalProperties": false, type: "object", required: ["code", "output"], properties: { "code": { type: "integer" }, "output": { type: "string" } } } as const;

export const cliResultCarrier = carrierFrom(CliResultSchema);

export const CapsuleFileSliceSchema = { "$id": "organizing/openai/codex/session/capsule-file-slice", "title": "CodexCapsuleFileSlice", "additionalProperties": false, type: "object", required: ["path", "bytes", "truncated", "sha256", "text"], properties: { "path": { type: "string", "minLength": 1 }, "bytes": { type: "integer", "minimum": 0 }, "truncated": { type: "boolean" }, "sha256": { type: "string", "minLength": 1 }, "text": { type: "string" } } } as const;

export const SessionCapsuleSchema = { "$id": "organizing/openai/codex/session/capsule", "title": "CodexSessionCapsule", "additionalProperties": false, type: "object", required: ["id", "generatedAt", "repoRoot", "packages", "terms", "files"], properties: { "id": { type: "string", "minLength": 1 }, "generatedAt": { type: "string", "minLength": 1 }, "repoRoot": { type: "string", "minLength": 1 }, "packages": { type: "array", items: { type: "string", "minLength": 1 } }, "terms": { type: "array", items: { type: "array", items: { type: "string" } } }, "files": { type: "array", items: CapsuleFileSliceSchema } } } as const;

export const capsuleFileSliceCarrier = carrierFrom(CapsuleFileSliceSchema);

export const sessionCapsuleCarrier = carrierFrom(SessionCapsuleSchema);

export const canonicalizeCliResultAction = action({
  verb: "organizing.openai.codex.session.canonicalize-cli-result",
  description: "Canonicalize a Codex session CLI result carrier.",
  domain: cliResultCarrier,
  codomain: cliResultCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeCapsuleFileSliceAction = action({
  verb: "organizing.openai.codex.session.canonicalize-capsule-file-slice",
  description: "Canonicalize a Codex session capsule file slice carrier.",
  domain: capsuleFileSliceCarrier,
  codomain: capsuleFileSliceCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeSessionCapsuleAction = action({
  verb: "organizing.openai.codex.session.canonicalize-capsule",
  description: "Canonicalize a Codex session capsule carrier.",
  domain: sessionCapsuleCarrier,
  codomain: sessionCapsuleCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeCliResultAction,
  canonicalizeCapsuleFileSliceAction,
  canonicalizeSessionCapsuleAction,
]);

const PACKAGE_CONTEXT_FILES = ["package.json", "README.md", "src/index.mts", "src/index.ts", "tsconfig.json"] as const;
const DEFAULT_MAX_BYTES = 24 * 1024;

const USAGE = `codex-session — coding-agent session computer

usage:
  codex-session capsule --packages a,b [--files x,y] [--max-bytes N]
  codex-session finding --session <id> --subject a,b,c --predicate <p> [--object <json>]
                        [--charge affirmed|denied] [--note <text>]
  codex-session impact  [--json]
  codex-session recall  --session <id> --subject a,b,c
  codex-session cut     --session <id> [--id <record-id>]
`;

function id(value: unknown): string {
  return createHash("sha256").update(canonicalJson(requireJsonValue(value, "session id value"))).digest("hex").slice(0, 16);
}
const mountRoot = (repoRoot: string): string => dataMountRoot({ root: path.join(repoRoot, "data") });
const storeRoot = (repoRoot: string): string => path.join(mountRoot(repoRoot), "codex");
const sessionNamespace = (sessionId: string): string => `codex-session.${safe(sessionId)}`;
const csv = (value: string | undefined): readonly string[] =>
  value === undefined ? [] : value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);

type Flags = Readonly<{ options: Readonly<Record<string, string>>; positionals: readonly string[]; bools: ReadonlySet<string> }>;
function parse(args: readonly string[]): Flags {
  const options: Record<string, string> = {};
  const positionals: string[] = [];
  const bools = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (key === "json") { bools.add(key); continue; }
      const next = args[i + 1];
      if (next === undefined) throw new Error(`flag --${key} needs a value`);
      options[key] = next; i++;
    } else positionals.push(arg);
  }
  return { options, positionals, bools };
}
const need = (flags: Flags, key: string): string => {
  const value = flags.options[key];
  if (value === undefined) throw new Error(`missing required --${key}`);
  return value;
};

async function readSlice(repoRoot: string, relative: string, maxBytes: number) {
  const absolute = path.resolve(repoRoot, relative);
  if (!absolute.startsWith(`${repoRoot}${path.sep}`)) return undefined;
  try {
    const buffer = await readFile(absolute);
    const truncated = buffer.byteLength > maxBytes;
    return {
      path: relative,
      bytes: buffer.byteLength,
      truncated,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      text: (truncated ? buffer.subarray(0, maxBytes) : buffer).toString("utf8"),
    };
  } catch { return undefined; }
}

async function cmdCapsule(flags: Flags): Promise<string> {
  const repoRoot = await findRepoRoot();
  const store = storeRoot(repoRoot);
  await mkdir(path.join(store, "capsules"), { recursive: true });
  const workspace = await loadWorkspace(repoRoot);
  const names = csv(flags.options["packages"]);
  const pkgs = names.map((n) => {
    const pkg = workspace.byName.get(n) ?? workspace.packages.find((p) => p.relativePath === n);
    if (!pkg) throw new Error(`no package matched ${n}`);
    return pkg;
  });
  const candidatePaths = [
    ...pkgs.flatMap((p) => PACKAGE_CONTEXT_FILES.map((f) => `${p.relativePath}/${f}`)),
    ...csv(flags.options["files"]),
  ];
  const maxBytes = flags.options["max-bytes"] ? Number(flags.options["max-bytes"]) : DEFAULT_MAX_BYTES;
  const slices = (await Promise.all([...new Set(candidatePaths)].map((p) => readSlice(repoRoot, p, maxBytes))))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .sort((a, b) => a.path.localeCompare(b.path));
  const terms = pkgs.map((p) => ["codex", "package", p.name]);
  const capsuleId = id({ kind: "codex-capsule", packages: names, files: slices.map((s) => [s.path, s.sha256]) });
  const capsule = { id: capsuleId, generatedAt: new Date().toISOString(), repoRoot, packages: names, terms, files: slices };
  await writeFile(path.join(store, "capsules", `${capsuleId}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
  return `capsule ${capsuleId}: ${slices.length} slices from ${names.length} package(s) → ${path.relative(repoRoot, path.join(store, "capsules", `${capsuleId}.json`))}`;
}

async function cmdFinding(flags: Flags): Promise<string> {
  const repoRoot = await findRepoRoot();
  const sessionId = need(flags, "session");
  const subject = csv(need(flags, "subject"));
  const predicate = need(flags, "predicate");
  const chargeName = (flags.options["charge"] ?? "affirmed");
  const at = new Date().toISOString();
  const witness = { source: "codex", session: sessionId, subject, predicate, at };
  const f = finding({
    session: sessionId, subject, predicate, at,
    charge: chargeName === "denied"
      ? negate(witnessedPotential(mark(witness)))
      : witnessedPotential(mark(witness)),
    ...(flags.options["object"] === undefined ? {} : { object: parseObject(flags.options["object"]) }),
    ...(flags.options["note"] === undefined ? {} : { note: flags.options["note"] }),
  });
  await appendSessionFindings(mountRoot(repoRoot), sessionNamespace(sessionId), [f], at);
  return `finding recorded · session ${sessionId} · ${subject.join("/")} ${predicate} = ${valueOf(f.charge).name}`;
}

async function cmdImpact(flags: Flags): Promise<string> {
  const repoRoot = await findRepoRoot();
  const store = storeRoot(repoRoot);
  await mkdir(path.join(store, "impact"), { recursive: true });
  const workspace = await loadWorkspace(repoRoot);
  const impact = computeImpact(workspace, await gitStatus(repoRoot));
  const impactId = id({ kind: "codex-impact", changed: impact.changedFiles.map((e) => e.path) });
  await writeFile(path.join(store, "impact", `${impactId}.json`), `${JSON.stringify({ id: impactId, ...impact }, null, 2)}\n`);
  if (flags.bools.has("json")) return JSON.stringify({ id: impactId, ...impact }, null, 2);
  if (impact.packageImpacts.length === 0 && impact.rootChanges.length === 0) return "impact: working tree clean";
  return [
    `change impact ${impactId}:`,
    ...impact.packageImpacts.map((p) => `  ${p.package}  (${p.changedFiles.length} files${p.directDependents.length ? `, ${p.directDependents.length} dependents` : ""})`),
    ...(impact.rootChanges.length ? [`  root: ${impact.rootChanges.length} change(s)`] : []),
    impact.suggestedCommands.length ? "  suggested:" : "  suggested: (none)",
    ...impact.suggestedCommands.map((c) => `    ${c}`),
  ].join("\n");
}

async function cmdRecall(flags: Flags): Promise<string> {
  const repoRoot = await findRepoRoot();
  const sessionId = need(flags, "session");
  const subject = csv(need(flags, "subject"));
  const recall = await recallSessionSubject(mountRoot(repoRoot), sessionNamespace(sessionId), sessionId, subject);
  if (recall.entries.length === 0) return `recall: no findings for session ${sessionId}`;
  return renderSessionRecall(recall);
}

async function cmdCut(flags: Flags): Promise<string> {
  const repoRoot = await findRepoRoot();
  const sessionId = need(flags, "session");
  const at = new Date().toISOString();
  const { path: recordFile, record } = await cutSessionState(mountRoot(repoRoot), sessionNamespace(sessionId), sessionId, {
    at,
    ...(flags.options["id"] === undefined ? {} : { id: flags.options["id"] }),
  });
  return `cut ${record.id}: ${record.count} entries -> ${path.relative(repoRoot, recordFile).split(path.sep).join("/")}`;
}

const safe = (name: string): string => name.replace(/[^A-Za-z0-9._-]/g, "_");
function parseObject(value: string): unknown { try { return JSON.parse(value); } catch { return value; } }

/** Run the codex session computer over an argv vector and return code + output. */
export async function runSessionCli(argv: readonly string[]): Promise<CliResult> {
  const [command, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { code: command === undefined ? 1 : 0, output: USAGE };
  }
  try {
    const flags = parse(rest);
    switch (command) {
      case "capsule": return { code: 0, output: await cmdCapsule(flags) };
      case "finding": return { code: 0, output: await cmdFinding(flags) };
      case "impact": return { code: 0, output: await cmdImpact(flags) };
      case "recall": return { code: 0, output: await cmdRecall(flags) };
      case "cut": return { code: 0, output: await cmdCut(flags) };
      default: return { code: 1, output: `unknown command: ${command}\n\n${USAGE}` };
    }
  } catch (error) {
    return { code: 1, output: `error: ${(error as Error).message}` };
  }
}
