/**
 * @packageDocumentation
 *
 * integrations/filesystem/services/read-write — the filesystem-backed read and write operations.
 *
 * `read` presents a filesystem resource (a file's content, a directory as its
 * recognized workspace reading or manifest, or a derived state-tier settlement) and
 * dispatches through the mounted projector catalog to the most specific
 * projector at a requested corner. `write` admits a claim as an utterance,
 * records it as EAVT rows under the innermost settlement enclosing the
 * target path (the bound data root when pathless or unenclosed), and folds it: through
 * the site-note/agents-doc/markdown codec that recognizes the target path
 * (checked directly, most specific first — the only three codecs that carry
 * any write behavior of their own), or as plain canonical JSON otherwise, to
 * an addressed file; as materialized files for a directory-manifest claim; or
 * — for a command claim written to a workspace directory — as execution
 * through the lifecycle-recorded process boundary, Plan 9 ctl-file style,
 * with the tool observation as the receipt.
 *
 * Derived views live at state-tier addresses (`data/state/YYYY/MM/DD/
 * ${date}-settle-${token}.json`): the path names a real recorded feed, and
 * reading a current-day settlement recomputes it through the monotone state
 * projection of that same-token admission log — the ONLY derivation this file
 * performs. Named derivations outside journal feeds (module-topology,
 * claude-fleet, file-census, ...) are NOT read through this path at all: each
 * is mounted by its owning operation family with its own CLI/HTTP/MCP/OpenAPI
 * faces, never a token matched inside `read`.
 *
 * These are the ONLY service verbs that read or write boundary material. A
 * new kind of material is a codec mounted into `src/presentation/catalog`; a new
 * view is a projection at a corner; neither is ever a new verb.
 *
 * Assembling an agent's own context suit from this same filesystem is a
 * distinct concern from dispatching a read/write verb, even though both read
 * the same data root — that lives in the sibling `./agent-context.mjs`, not here.
 */
import { homedir } from "node:os";
import { canonicalBytes } from "../../../lib/identity/index.mts";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  operation,
  withOperationArguments,
  type Operation,
} from "../../../rpc/index.mts";
import type { AgentReadinessReport } from "../../../presentation/index.mts";
import { transportCloudEvent, type ArrivalReceipt } from "../../../rpc/index.mts";
import { agentsDocProjector, classifyResource, siteNoteProjector } from "../../../presentation/catalog.mts";
import { markdownProjector } from "../../../presentation/markdown.mts";
import { applyMarkdownEdit, isMarkdownEditRequest } from "../../../lib/codecs/markdown/edit.mts";
import {
  applyLspTextEdits,
  LSP_METHODS,
  lspRequestEnvelopeContract,
  projectLsp,
  type LspRequestEnvelope,
  type LspTextEdit,
} from "../../lsp/index.mts";
import { isDirectoryManifest, type DirectoryManifest } from "../directory-manifest.mts";
import { cornerOf, rungOf, type Corner, type Projector, type Resource } from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
import { pathPoint } from "../../../lib/codecs/path/index.mts";
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { toEavt } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import {
  isArtifactAct,
  parseArtifactStem,
  artifactAddressTyping,
  projectDataArtifactPath,
  artifactActTier,
  type ArtifactAddressTyping,
} from "../../../lib/addressing/index.mts";
import { feedTokenFamilyMember } from "../../../agents/addressing/feed-token.mts";
import { openJournal, type EventWriteResult, journal } from "../../../journal/index.mts";
import {
  projectRecordPathContent,
} from "./journal-projections.mts";
import { appendArrivalAtRoot, projectArrivalLogPathState } from "./arrival.mts";
import { commitClaudeSessionSuitLogRecord } from "./agent-context.mts";
import {
  ensureDirectory,
  pathExists,
  readDirectoryEntries,
  readFileUtf8,
  resolveMarkdownNode,
  statPathOrNull,
  writeFileAtomic,
} from "../../../lib/filesystem/index.mts";
import { utteredClaimIdentity } from "@lenticule-science/metrologic/settling/records/utterance/claim-identity";
import { isChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { readLeanWorkspace, runLeanWorkspaceCommand } from "../../lean/workspace/service.mts";
import {
  runBlueprintWorkspaceCommand,
  runTexWorkspaceCommand,
  runVersoWorkspaceCommand,
} from "../../lean/tex/workspace-service.mts";
import { readTexWorkspace } from "@red-cup-engineering/lean-system-services-section/tex/workspace-service";

/** Roots the read/write pair is bound to at service assembly. */
export interface FilesystemBinding {
  /** The admission site root: admission logs and derived settlements live under its data/. */
  readonly dataRoot: string;
  /** Root name recorded on appended rows. */
  readonly rootName?: string;
  /** Claude Code transcript discovery root (for session/fleet settlement derivers). */
  readonly claudeSessionRoot?: string;
  /** Codex session discovery root. */
  readonly codexSessionRoot?: string;
  /** Codex memory index and rollout-summary root. */
  readonly codexMemoryRoot?: string;
  /** Package root available to source observation and package-development operations. */
  readonly packageRoot?: string;
  /** Optional readiness material induced by the service boundary. */
  readonly readiness?: AgentReadinessReport;
  /** Clock override (ISO string), defaults to the process clock. */
  readonly now?: () => string;
}

/** Host-facing roots that may be supplied explicitly when assembling a default binding. */
export interface DefaultFilesystemBindingOptions {
  readonly packageRoot?: string;
  readonly claudeSessionRoot?: string;
  readonly codexSessionRoot?: string;
  readonly codexMemoryRoot?: string;
  readonly now?: () => string;
}

/** The coordinates of one derived settlement, parsed from its data-tier address.
 *  `act` names which admission tier the path addresses: `settle` (state), `commit`
 *  (record), or `realize` (content) — `admit` (log) is recorded by `write`
 *  directly and never recomputed here. */
export interface DerivedAddress {
  readonly path: string;
  readonly date: string;
  readonly token: string;
  readonly act: "settle" | "commit" | "realize";
}

const DERIVED_TIER_SEGMENT = /((^|\/)data\/(state|records)\/|(^|\/)content\/)/u;
const DERIVABLE_ACTS: ReadonlySet<string> = new Set(["settle", "commit", "realize"]);

/** Parse a derived-tier (state/record/content) settlement address, or null when the
 *  path is not one. */
export function derivedAddressOf(filePath: string): DerivedAddress | null {
  if (!DERIVED_TIER_SEGMENT.test(filePath)) return null;
  const stem = (filePath.split("/").at(-1) ?? "").replace(/\.[^./]+$/u, "");
  const parsed = parseArtifactStem(stem);
  if (parsed === null || !DERIVABLE_ACTS.has(parsed.act)) return null;
  return Object.freeze({ path: filePath, date: parsed.date, token: parsed.token, act: parsed.act as DerivedAddress["act"] });
}

/** The log→record leg for one feed's on-demand `commit`/`realize` settlement read: a
 *  `claude-session-<id>` feed commits through its own suit statistic (see
 *  `commitClaudeSessionSuitLogRecord`), same as the batched `plate-promotion`
 *  drive; every other feed keeps the generic per-entity record projection. */
function commitFeedRecord(logPath: string, token: string): void {
  if (feedTokenFamilyMember(token)?.family === "claude-session") {
    commitClaudeSessionSuitLogRecord(logPath, token, path.basename(logPath));
    return;
  }
  journal.projectRecord(logPath);
}

async function deriveStateContent(derived: DerivedAddress, _binding: FilesystemBinding): Promise<string | undefined> {
  const logPath = projectDataArtifactPath(derived.path, "log", "jsonl");
  if (!journal.sourceStatus(logPath).exists) return undefined;
  // The default derivation of any real recorded feed, one tier at a time —
  // log→state (`settle`), state→record (`commit`), record→content (`realize`).
  // Each leg is idempotent and non-mutating: re-deriving `derived.path` never
  // truncates a lower tier, so deleting any tier above data/journals and reading
  // it again recovers the same content (the settlement law).
  if (derived.act === "settle") {
    projectArrivalLogPathState(logPath) ?? journal.projectState(logPath);
    return pathExists(derived.path) ? readFileUtf8(derived.path) : undefined;
  }
  if (derived.act === "commit") {
    commitFeedRecord(logPath, derived.token);
    return pathExists(derived.path) ? readFileUtf8(derived.path) : undefined;
  }
  const recordPath = projectDataArtifactPath(derived.path, "record", "jsonl");
  commitFeedRecord(logPath, derived.token);
  projectRecordPathContent(recordPath);
  return pathExists(derived.path) ? readFileUtf8(derived.path) : undefined;
}

/** The closed set of workspace kinds a directory presents as, beyond the
 *  generic manifest. Recognition below is one function switching over this
 *  closed union, not an array of independently-authored `matches(dir)`
 *  predicates — adding a kind means extending this type and the two
 *  functions below it, both compiler-checked for exhaustiveness. */
export type WorkspaceKind = "lean" | "tex";

function hasFileWithExtension(dir: string, extension: string, maxDepth: number): boolean {
  if (maxDepth < 0) return false;
  let entries;
  try {
    entries = readDirectoryEntries(dir);
  } catch (error) {
    // A missing directory legitimately means "no marker file here" — but a
    // permission-denied or I/O-failed read is an obstructed read, not
    // evidence the workspace kind is absent, so it is not silently folded
    // into the same false as "doesn't exist".
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isFile() && entry.name.endsWith(extension)) return true;
    if (entry.isDirectory() && hasFileWithExtension(path.join(dir, entry.name), extension, maxDepth - 1)) return true;
  }
  return false;
}

/** Classify a directory's workspace kind: Lean (lean-toolchain or a lakefile)
 *  checked before TeX (a `.tex` tree), `null` when neither marker is present.
 *  One function over the closed `WorkspaceKind` union, order-deterministic,
 *  in place of a scanned array of independently-authored `matches(dir)`
 *  predicates. */
function classifyWorkspaceKind(dir: string): WorkspaceKind | null {
  if (
    pathExists(path.join(dir, "lean-toolchain"))
    || pathExists(path.join(dir, "lakefile.lean"))
    || pathExists(path.join(dir, "lakefile.toml"))
  ) return "lean";
  if (hasFileWithExtension(dir, ".tex", 3)) return "tex";
  return null;
}

/** The workspace reading for each closed `WorkspaceKind` — a `Record` keyed
 *  by the union itself, so TypeScript requires exactly these two cases,
 *  neither more nor fewer, kept in lockstep with the type by the compiler
 *  rather than by hand. */
const WORKSPACE_PRESENTATION: Readonly<Record<WorkspaceKind, (dir: string) => JsonValue>> = Object.freeze({
  lean: (dir: string) => readLeanWorkspace(dir) as unknown as JsonValue,
  tex: (dir: string) => readTexWorkspace(dir) as unknown as JsonValue,
});

const MANIFEST_FILE_LIMIT = 4096;
const MANIFEST_BYTE_LIMIT = 8 * 1024 * 1024;

function directoryManifestOf(root: string): DirectoryManifest & JsonValue {
  const files: Record<string, string> = {};
  let count = 0;
  const visit = (dir: string, prefix: string): void => {
    let entries;
    try {
      entries = readDirectoryEntries(dir);
    } catch {
      return;
    }
    for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
      if (count >= MANIFEST_FILE_LIMIT) return;
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) visit(full, relative);
      else if (entry.isFile()) {
        const stat = statPathOrNull(full);
        if (stat === null || stat.size > MANIFEST_BYTE_LIMIT) continue;
        try {
          files[relative] = readFileUtf8(full);
          count += 1;
        } catch {
          continue;
        }
      }
    }
  };
  visit(root, "");
  return Object.freeze({
    kind: "metroplat.directory-manifest" as const,
    root,
    files: Object.freeze(files),
  }) as DirectoryManifest & JsonValue;
}

/** Present a path as a boundary resource: a derived settlement (recomputed when it is
 *  current-day), a directory as its recognized workspace reading or manifest,
 *  or a file's content. */
export async function presentResource(filePath: string, binding: FilesystemBinding): Promise<Resource> {
  const resolved = path.resolve(filePath);
  const derivedAddress = derivedAddressOf(resolved.split(path.sep).join("/"));
  if (derivedAddress !== null) {
    const today = (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
    if (derivedAddress.date === today || !pathExists(resolved)) {
      const derived = await deriveStateContent(derivedAddress, binding);
      if (derived !== undefined) return Object.freeze({ path: resolved, content: derived });
    }
  }
  const markdownResolution = resolveMarkdownNode(resolved);
  if (markdownResolution.kind === "ambiguous") {
    throw new TypeError(`read: ambiguous markdown node ${markdownResolution.canonicalPath} has carriers ${markdownResolution.paths.join(", ")}`);
  }
  const located = markdownResolution.kind === "located" ? markdownResolution.path : resolved;
  const stat = statPathOrNull(located);
  if (stat === null) throw new TypeError(`read: no resource at ${resolved}`);
  if (stat.isDirectory()) {
    const kind = classifyWorkspaceKind(located);
    const presented = kind === null ? directoryManifestOf(located) : WORKSPACE_PRESENTATION[kind](located);
    return Object.freeze({
      path: markdownResolution.kind === "located" ? markdownResolution.canonicalPath : located,
      content: `${canonicalBytes(requireJsonValue(JSON.parse(JSON.stringify(presented)) as unknown, `directory ${located}`))}\n`,
    });
  }
  return Object.freeze({ path: markdownResolution.kind === "located" ? markdownResolution.canonicalPath : located, content: readFileUtf8(located) });
}

const CORNERS: ReadonlySet<string> = new Set(["bottom", "data", "prose", "assertion"]);

function cornerArg(value: unknown): Corner | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  if (!CORNERS.has(text)) throw new TypeError(`read: unknown corner ${text} (bottom|data|prose|assertion)`);
  return text as Corner;
}

/** The result `read` returns: the dispatched projector's coordinates and its carried items. */
export interface FilesystemReadResult {
  readonly kind: "metroplat.filesystem.read-result";
  readonly path: string;
  readonly type: string;
  readonly corner: Corner;
  readonly rung: string;
  /** The presented resource bytes before projector-specific decoding. */
  readonly content: string;
  /** The proofed path, when the path parses as a admission address: the address
   *  as a CHL term with its decidable HasTy verdict. */
  readonly address?: ArtifactAddressTyping;
  /** The source admission for this read attempt. Reads are arrivals too. */
  readonly arrival?: ArrivalReceipt;
  readonly items: readonly JsonValue[];
}

function admitReadArrival(
  binding: FilesystemBinding,
  request: { readonly path: string; readonly corner?: string | undefined },
): ArrivalReceipt {
  const at = binding.now?.() ?? new Date().toISOString();
  return appendArrivalAtRoot(binding.dataRoot, transportCloudEvent("filesystem", Object.freeze({
    kind: "metroplat.filesystem.read-arrival-material" as const,
    path: request.path,
    ...(request.corner === undefined ? {} : { corner: request.corner }),
  }) as JsonValue, at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference" as const,
    transport: "filesystem",
    verb: "read",
    path: request.path,
  })), {
    at,
    rootName: binding.rootName ?? "@red-cup-engineering/metroplat",
  });
}

/** Read a path through the projector catalog at an optional corner. */
export async function readAtRoot(
  binding: FilesystemBinding,
  request: { readonly path: string; readonly corner?: string | undefined },
): Promise<FilesystemReadResult> {
  if (typeof request.path !== "string" || request.path.length === 0) throw new TypeError("read: path is required");
  const arrival = admitReadArrival(binding, request);
  const corner = cornerArg(request.corner);
  const resource = await presentResource(request.path, binding);
  const projector = classifyResource(resource, corner);
  if (projector === null) {
    throw new TypeError(corner === undefined
      ? `read: no projector recognizes ${resource.path}`
      : `read: no projector recognizes ${resource.path} at the ${corner} corner`);
  }
  const items = projector.read === undefined ? Object.freeze([]) : Object.freeze(projector.read(resource));
  // Typed term addressing: when the path parses as a admission address, the
  // reading carries the proofed path — the address AS a CHL term with its
  // decidable HasTy verdict. A well-typed path term is the proof that the
  // addressed derivation composes; the string path stays the boundary
  // encoding.
  const derivedAddress = derivedAddressOf(resource.path.split(path.sep).join("/"));
  const address = derivedAddress !== null && isArtifactAct(derivedAddress.act)
    ? artifactAddressTyping({ tier: artifactActTier(derivedAddress.act), date: derivedAddress.date, act: derivedAddress.act, token: derivedAddress.token })
    : undefined;
  return Object.freeze({
    kind: "metroplat.filesystem.read-result" as const,
    path: resource.path,
    type: projector.type,
    corner: cornerOf(projector),
    rung: rungOf(projector),
    content: resource.content,
    ...(address === undefined ? {} : { address }),
    arrival,
    items,
  });
}

/** The write target is one of the three codecs that actually have their own
 *  write logic (site-note, agents-doc, plain markdown, most specific first —
 *  a site note and an AGENTS/CLAUDE doc are both markdown, so the more
 *  specific recognizer must be checked first), or the canonical-JSON body
 *  already computed as `resource.content`. Every other mounted projector
 *  (jsonl, eavt, session transcripts, hook envelopes, state settlements, workspace
 *  readings, directory manifests, plates) inherits that same canonical-JSON
 *  write verbatim — there is no distinct write behavior left to dispatch to,
 *  so there is nothing to scan a catalog for. */
function writeTargetProjector(resource: Resource): Projector<JsonValue> | null {
  if (siteNoteProjector.recognize(resource)) return siteNoteProjector;
  if (agentsDocProjector.recognize(resource)) return agentsDocProjector;
  if (markdownProjector.recognize(resource)) return markdownProjector;
  return null;
}

function jsonRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function lspRequestEnvelopeOf(value: JsonValue): LspRequestEnvelope | undefined {
  try {
    return lspRequestEnvelopeContract.assert(value, "write lsp request") as LspRequestEnvelope;
  } catch {
    return undefined;
  }
}

function textDocumentUriOf(request: LspRequestEnvelope, fallback: string): string {
  const params = jsonRecord(request.params);
  const textDocument = params === undefined ? undefined : jsonRecord(params["textDocument"]);
  const uri = textDocument?.["uri"];
  return typeof uri === "string" && uri !== "" ? uri : fallback;
}

function lspRequestForUri(request: LspRequestEnvelope, uri: string): LspRequestEnvelope {
  const params = jsonRecord(request.params) ?? {};
  return Object.freeze({
    ...request,
    params: Object.freeze({
      ...params,
      textDocument: Object.freeze({ uri }),
    }),
  }) as LspRequestEnvelope;
}

function isLspPosition(value: unknown): value is { readonly line: number; readonly character: number } {
  const record = jsonRecord(value);
  return record !== undefined && Number.isInteger(record["line"]) && Number.isInteger(record["character"]);
}

function isLspTextEdit(value: unknown): value is LspTextEdit {
  const record = jsonRecord(value);
  const range = jsonRecord(record?.["range"]);
  return record !== undefined
    && typeof record["newText"] === "string"
    && range !== undefined
    && isLspPosition(range["start"])
    && isLspPosition(range["end"]);
}

function lspTextEdits(value: unknown): readonly LspTextEdit[] {
  if (!Array.isArray(value) || !value.every(isLspTextEdit)) {
    throw new TypeError("write: LSP result must carry TextEdit objects");
  }
  return Object.freeze(value);
}

function workspaceEditTextEdits(value: unknown, uri: string): readonly LspTextEdit[] {
  const action = jsonRecord(value);
  const edit = jsonRecord(action?.["edit"]);
  const changes = jsonRecord(edit?.["changes"]);
  const edits = changes?.[uri];
  if (edits === undefined) throw new TypeError(`write: LSP code action has no workspace edit for ${uri}`);
  return lspTextEdits(edits);
}

function lspResponseTextEdits(method: string, value: unknown, uri: string): readonly LspTextEdit[] {
  if (method === LSP_METHODS.formatting) return lspTextEdits(value);
  if (method === LSP_METHODS.codeAction) {
    if (!Array.isArray(value)) throw new TypeError("write: LSP codeAction result must be an array");
    if (value.length !== 1) {
      throw new TypeError(`write: LSP codeAction write requires exactly one selected action, got ${value.length}`);
    }
    return workspaceEditTextEdits(value[0], uri);
  }
  throw new TypeError(`write: markdown LSP writes support ${LSP_METHODS.formatting} or ${LSP_METHODS.codeAction}, got ${method}`);
}

/** The receipt `write` returns: the admission append, plus any folded target
 *  write, plus the tool observation when the claim was a command. */
export interface FilesystemWriteReceipt {
  readonly kind: "metroplat.filesystem.write-receipt";
  /** The source admission for this write attempt. Writes are arrivals before they fold. */
  readonly arrival?: ArrivalReceipt;
  readonly admission: EventWriteResult;
  /** The proofed path, when the write's target parses as a admission address:
   *  the address as a CHL term with its decidable HasTy verdict — the same
   *  typed coordinate the read side carries. */
  readonly address?: ArtifactAddressTyping;
  readonly target?: Readonly<{ path: string; type: string; bytes: number; files?: number }>;
  readonly observation?: JsonValue;
}

/** The tools a command claim may name. `lean`/`lake` run through the Lean
 *  workspace runner; the TeX family runs through its own instruments. */
const COMMAND_TOOLS: ReadonlySet<string> = new Set(["tex-engine", "blueprint-tool", "verso-tool", "lean", "lake"]);

/** A command claim: the Plan 9 ctl-file shape of execution. Writing one to a
 *  workspace directory records the utterance and runs the tool through the
 *  lifecycle-recorded process boundary. */
export interface CommandClaim {
  readonly tool: "tex-engine" | "blueprint-tool" | "verso-tool" | "lean" | "lake";
  readonly command?: string;
  readonly args?: readonly string[];
}

/** Recognize a claim as a command claim, or null. */
export function commandClaimOf(claim: JsonValue): CommandClaim | null {
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) return null;
  const record = claim as Readonly<Record<string, JsonValue>>;
  const tool = record["tool"];
  if (typeof tool !== "string" || !COMMAND_TOOLS.has(tool)) return null;
  if ("command" in record && typeof record["command"] !== "string") return null;
  const args = record["args"];
  if (args !== undefined && (!Array.isArray(args) || !args.every((arg) => typeof arg === "string"))) return null;
  return claim as unknown as CommandClaim;
}

function runCommandClaim(
  workspace: string,
  claim: CommandClaim,
  binding: FilesystemBinding,
  at: string,
  rootName: string,
): JsonValue {
  const lifecyclePersistence = Object.freeze({ dataRoot: binding.dataRoot, rootName });
  const options = {
    ...(claim.command === undefined ? {} : { command: claim.command }),
    ...(claim.args === undefined ? {} : { args: claim.args }),
    at,
    lifecyclePersistence,
  };
  const observation = claim.tool === "tex-engine" ? runTexWorkspaceCommand(workspace, options)
    : claim.tool === "blueprint-tool" ? runBlueprintWorkspaceCommand(workspace, options)
      : claim.tool === "verso-tool" ? runVersoWorkspaceCommand(workspace, options)
        : runLeanWorkspaceCommand(workspace, { ...options, command: claim.command ?? claim.tool });
  return JSON.parse(JSON.stringify(observation)) as JsonValue;
}

/** The innermost ancestor of a path bearing deposited tiers (a `data/journals`
 *  directory), or the fallback root when no enclosure exists. Which settlement
 *  records a write is a function of the target path, never of the process:
 *  a write into an inhabited constituent deposits in that constituent's own
 *  plate. A bare directory becomes inhabited by its first deposit (fold a
 *  claim to a path under its `data/journals`), after which enclosure finds it. */
export function enclosingClaimDataRoot(targetPath: string, fallback: string): string {
  return journal.enclosingRoot(targetPath, fallback);
}

const STATE_SETTLEMENT_BASENAME = /^\d{4}-\d{2}-\d{2}-settle-(.+)\.json$/u;
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-(.+)$/u;

/** Normalize a recorded basename to a clean feed-subject token — a subject
 *  names a namespace, not a filename. Total and deterministic, two rules
 *  applied in order: (1) a basename matching the state-settlement grammar
 *  `<date>-settle-<token>.json` (what `readAtRoot`'s own settlement derivers name their
 *  artifacts) yields the bare `<token>`, so a promoted state settlement and its
 *  hand-authored feed land on the SAME subject — both `work-ledger`, never
 *  the settlement's own filename becoming a second, shadow feed; (2) any other
 *  basename has a leading `YYYY-MM-DD-` date prefix stripped, then
 *  everything from the first `.` onward (every trailing extension,
 *  `.json.json` included) dropped. A basename with neither a date prefix nor
 *  an extension passes through unchanged — identity is the base case, not a
 *  special one. Without this, a write targeting a dated state-settlement artifact
 *  records under a subject that is itself a whole filename
 *  (`2026-07-04-admit-2026-07-04-settle-work-ledger.json.jsonl`), and that
 *  doubling propagates into every derived href built from the same subject. */
export function normalizeSubjectToken(basename: string): string {
  const settleMatch = STATE_SETTLEMENT_BASENAME.exec(basename);
  if (settleMatch?.[1] !== undefined) return settleMatch[1];
  const dated = DATE_PREFIX.exec(basename);
  const dateStripped = dated?.[1] ?? basename;
  const firstDot = dateStripped.indexOf(".");
  return firstDot > 0 ? dateStripped.slice(0, firstDot) : dateStripped;
}

/** A properly-admitted claim's two marks and its posited charge: `token` is
 *  the caller's own identity (the identity-carrying side of the utterance),
 *  `claimMark` is the assertion content (the content-carrying side) — the
 *  minimal principled pair `Utterance` admits. The predication cell is never
 *  accepted as input; `writeAtRoot` derives it via `predicationSeed`. */
interface UtteredClaim {
  readonly token: JsonValue;
  readonly claimMark: JsonValue;
  readonly charge: string;
}

/** Recognize a write request's claim as the `{token, claim, charge}` shape,
 *  or `null` when it is some other claim vocabulary (a bare `{cell, charge}`
 *  row, a command claim, a directory manifest, arbitrary content) — a
 *  structural shape check, never a guess at content. */
function utteredClaimOf(value: JsonValue): UtteredClaim | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const token = record["token"];
  const claimMark = record["claim"];
  const charge = record["charge"];
  if (token === undefined || claimMark === undefined || typeof charge !== "string") return undefined;
  return Object.freeze({ token, claimMark, charge });
}

function admitWriteArrival(
  binding: FilesystemBinding,
  request: {
    readonly path?: string | undefined;
    readonly claim: JsonValue;
    readonly token?: string | undefined;
    readonly causes?: readonly string[] | undefined;
  },
  at: string,
  rootName: string,
): ArrivalReceipt {
  return appendArrivalAtRoot(binding.dataRoot, transportCloudEvent("filesystem", Object.freeze({
    kind: "metroplat.filesystem.write-arrival-material" as const,
    ...(request.path === undefined ? {} : { path: request.path }),
    ...(request.token === undefined ? {} : { token: request.token }),
    ...(request.causes === undefined ? {} : { causes: request.causes }),
    claim: request.claim,
  }) as JsonValue, at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference" as const,
    transport: "filesystem",
    verb: "write",
    ...(request.path === undefined ? {} : { path: request.path }),
  })), {
    at,
    rootName,
  });
}

/** Admit a claim as a recorded utterance and fold it to the addressed path. */
export function writeAtRoot(
  binding: FilesystemBinding,
  request: {
    readonly path?: string | undefined;
    readonly claim: JsonValue;
    readonly token?: string | undefined;
    readonly at?: string | undefined;
    readonly causes?: readonly string[] | undefined;
  },
): FilesystemWriteReceipt {
  if (request.claim === undefined) throw new TypeError("write: claim is required");
  const at = request.at ?? binding.now?.() ?? new Date().toISOString();
  const rootName = binding.rootName ?? "@red-cup-engineering/metroplat";
  const arrival = admitWriteArrival(binding, request, at, rootName);
  // Constructors admit minimal principled objects; readers derive downstream
  // structure (placement-law rule 6) — so a caller that wants a real
  // predication cell supplies the two marks `Utterance` actually needs (its
  // own identity as the token, its assertion as the claim-mark), and the cell
  // is DERIVED here via `predicationSeed`, never reverse-parsed out of an
  // opaque label. Callers still sending the older bare `{cell: string,
  // charge}` shape (or no charge at all) are unchanged, except that any
  // `charge` present is now checked against the FOUR finite vocabulary and
  // rejected at the boundary rather than silently admitted (placement-law
  // rule 22) — the same gate previously applied unconditionally now applies
  // to whichever of the two shapes the claim carries.
  const uttered = utteredClaimOf(request.claim);
  let admittedClaim: JsonValue = request.claim;
  if (uttered !== undefined) {
    if (!isChargeValueName(uttered.charge)) {
      throw new TypeError(`write: claim charge must be a member of the FOUR finite vocabulary (unknown|held|denied|contested), got ${JSON.stringify(uttered.charge)}`);
    }
    const identity = utteredClaimIdentity(uttered.token, uttered.claimMark);
    admittedClaim = Object.freeze({
      kind: "metroplat.filesystem.predicated-claim" as const,
      cell: JSON.parse(JSON.stringify(identity.cell)) as JsonValue,
      address: identity.address,
      charge: uttered.charge,
    });
  } else if (request.claim !== null && typeof request.claim === "object" && !Array.isArray(request.claim) && "charge" in request.claim) {
    const charge = (request.claim as Readonly<Record<string, JsonValue>>)["charge"];
    if (typeof charge !== "string" || !isChargeValueName(charge)) {
      throw new TypeError(`write: claim charge must be a member of the FOUR finite vocabulary (unknown|held|denied|contested), got ${JSON.stringify(charge)}`);
    }
  }
  const targetPath = request.path === undefined ? undefined : path.resolve(request.path);
  const journalRoot = targetPath === undefined
    ? binding.dataRoot
    : enclosingClaimDataRoot(targetPath, binding.dataRoot);
  const subject = request.token
    ?? (targetPath === undefined ? "write" : normalizeSubjectToken(targetPath.split(path.sep).at(-1) ?? "write"));
  // Typed term addressing on the write side: when the target parses as an
  // admission address, the receipt carries the proofed path, and the recorded row
  // itself carries the address term as attribute material (the quarry law —
  // "e: the addressed term" — enters as an attribute first; promotion of `e`
  // itself waits on a state-key consumer survey).
  const targetDerivedAddress = targetPath === undefined ? null : derivedAddressOf(targetPath.split(path.sep).join("/"));
  const address = targetDerivedAddress !== null && isArtifactAct(targetDerivedAddress.act)
    ? artifactAddressTyping({ tier: artifactActTier(targetDerivedAddress.act), date: targetDerivedAddress.date, act: targetDerivedAddress.act, token: targetDerivedAddress.token })
    : undefined;
  // A predicated claim's cell and charge are the attribute of its recorded
  // row — the same row shape the claim-session feed cellizes (`sessionAttribute`
  // carries {cell, charge}), which is what `workItemObservationsOfRows` and
  // every other admit-feed reader consume. Burying them in the value slot made
  // a declared work item recorded but invisible to its own settlement; this
  // fixes that by writing them at the attribute a reader actually reads.
  const predication = (() => {
    if (admittedClaim === null || typeof admittedClaim !== "object" || Array.isArray(admittedClaim)) return undefined;
    const record = admittedClaim as Readonly<Record<string, JsonValue>>;
    const cell = record["cell"];
    const charge = record["charge"];
    return typeof cell === "string" && typeof charge === "string" && isChargeValueName(charge)
      ? Object.freeze({ cell, charge })
      : undefined;
  })();
  const admission = openJournal(journalRoot).appendRows("write", [
    toEavt({
      e: targetPath === undefined ? subject : pathPoint(targetPath.split(path.sep).join("/")),
      a: Object.freeze({ event: "write", ...(predication ?? {}) }),
      v: admittedClaim,
      t: at,
    }),
    ...(address === undefined ? [] : [toEavt({
      e: pathPoint((targetPath as string).split(path.sep).join("/")),
      a: Object.freeze({ event: "address-term" }),
      v: Object.freeze({ term: address.term, ty: address.ty, hasTy: address.hasTy }) as unknown as JsonValue,
      t: at,
    })]),
  ], {
    at,
    rootName,
    subject,
    ...(request.causes === undefined ? {} : { eventCauses: request.causes }),
  });

  if (targetPath === undefined) {
    return Object.freeze({ kind: "metroplat.filesystem.write-receipt" as const, arrival, admission, ...(address === undefined ? {} : { address }) });
  }

  // A command claim written to a workspace directory is execution: the
  // utterance is already recorded above; the fold runs the named tool through
  // the lifecycle-recorded process boundary and the receipt carries its
  // observation. The workspace path is the ctl file.
  const command = commandClaimOf(request.claim);
  if (command !== null && statPathOrNull(targetPath)?.isDirectory() === true) {
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt" as const,
      arrival,
      ...(address === undefined ? {} : { address }),
      admission,
      observation: runCommandClaim(targetPath, command, { ...binding, dataRoot: journalRoot }, at, rootName),
    });
  }

  // Fold through the write leg. A directory-manifest claim materializes as the
  // directory itself — the write-side mirror of directory reads.
  if (isDirectoryManifest(request.claim)) {
    const manifest = request.claim;
    let files = 0;
    let bytes = 0;
    for (const [relative, content] of Object.entries(manifest.files)) {
      const full = path.resolve(targetPath, relative);
      if (full !== targetPath && !full.startsWith(`${targetPath}${path.sep}`)) {
        throw new TypeError(`write: manifest entry ${relative} escapes ${targetPath}`);
      }
      ensureDirectory(path.dirname(full));
      writeFileAtomic(full, content);
      files += 1;
      bytes += Buffer.byteLength(content, "utf8");
    }
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt" as const,
      arrival,
      ...(address === undefined ? {} : { address }),
      admission,
      target: Object.freeze({ path: targetPath, type: "directory-manifest", bytes, files }),
    });
  }

  const resource: Resource = Object.freeze({ path: targetPath.split(path.sep).join("/"), content: canonicalBytes(request.claim) });
  const projector = writeTargetProjector(resource);
  const lspRequest = lspRequestEnvelopeOf(request.claim);
  if (projector !== null && lspRequest !== undefined) {
    if (lspRequest.method !== LSP_METHODS.formatting && lspRequest.method !== LSP_METHODS.codeAction) {
      throw new TypeError(`write: markdown LSP writes support ${LSP_METHODS.formatting} or ${LSP_METHODS.codeAction}, got ${lspRequest.method}`);
    }
    if (statPathOrNull(targetPath)?.isFile() !== true) throw new TypeError(`write: markdown LSP target does not exist: ${targetPath}`);
    const existing = readFileUtf8(targetPath);
    const uri = textDocumentUriOf(lspRequest, pathToFileURL(targetPath).href);
    const response = projectLsp({
      schemas: [],
      operations: [],
      markdownDocuments: [Object.freeze({ uri, text: existing })],
    }).handle(lspRequestForUri(lspRequest, uri));
    const applied = applyLspTextEdits(existing, lspResponseTextEdits(lspRequest.method, response.result, uri));
    ensureDirectory(path.dirname(targetPath));
    writeFileAtomic(targetPath, applied.text);
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt" as const,
      arrival,
      ...(address === undefined ? {} : { address }),
      admission,
      target: Object.freeze({ path: targetPath, type: projector.type, bytes: applied.afterBytes }),
      observation: Object.freeze({
        kind: "metroplat.markdown.lsp-write-receipt" as const,
        method: lspRequest.method,
        uri,
        response: response as unknown as JsonValue,
        application: Object.freeze({
          kind: applied.kind,
          edits: applied.edits,
          changed: applied.changed,
          beforeBytes: applied.beforeBytes,
          afterBytes: applied.afterBytes,
        }),
      }) as unknown as JsonValue,
    });
  }
  if (projector !== null && isMarkdownEditRequest(request.claim)) {
    const existing = statPathOrNull(targetPath)?.isFile() === true
      ? readFileUtf8(targetPath)
      : request.claim.createIfMissing === true
        ? request.claim.initialText ?? ""
        : undefined;
    if (existing === undefined) throw new TypeError(`write: markdown edit target does not exist: ${targetPath}`);
    const applied = applyMarkdownEdit(existing, request.claim);
    ensureDirectory(path.dirname(targetPath));
    writeFileAtomic(targetPath, applied.text);
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt" as const,
      arrival,
      ...(address === undefined ? {} : { address }),
      admission,
      target: Object.freeze({ path: targetPath, type: projector.type, bytes: Buffer.byteLength(applied.text, "utf8") }),
      observation: applied.receipt as unknown as JsonValue,
    });
  }
  // A path recognized by none of the three markdown codecs is plain data: the
  // canonical JSON already computed as `resource.content` IS the body, with no
  // dispatch needed — every non-markdown projector in the retired catalog
  // inherited this exact same write, verbatim.
  const type = projector?.type ?? "json";
  const content = projector?.write?.([request.claim]) ?? `${resource.content}\n`;
  ensureDirectory(path.dirname(targetPath));
  writeFileAtomic(targetPath, content);
  return Object.freeze({
    kind: "metroplat.filesystem.write-receipt" as const,
    arrival,
    ...(address === undefined ? {} : { address }),
    admission,
    target: Object.freeze({ path: targetPath, type, bytes: Buffer.byteLength(content, "utf8") }),
  });
}

function stringArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function bindingOfArgs(args: Record<string, unknown>): FilesystemBinding {
  const dataRoot = stringArg(args, "data-root");
  if (dataRoot === undefined) throw new TypeError("filesystem: expected --data-root");
  return Object.freeze({
    dataRoot,
    ...(stringArg(args, "root-name") === undefined ? {} : { rootName: stringArg(args, "root-name")! }),
    ...(stringArg(args, "claude-session-root") === undefined ? {} : { claudeSessionRoot: stringArg(args, "claude-session-root")! }),
    ...(stringArg(args, "codex-session-root") === undefined ? {} : { codexSessionRoot: stringArg(args, "codex-session-root")! }),
    ...(stringArg(args, "codex-memory-root") === undefined ? {} : { codexMemoryRoot: stringArg(args, "codex-memory-root")! }),
    ...(stringArg(args, "package-root") === undefined ? {} : { packageRoot: stringArg(args, "package-root")! }),
  });
}

/** read — `readAtRoot`: dispatch a path through the projector catalog at a corner. */
export const readOperation: Operation = operation({
  verb: "read",
  inputFormat: "json",
  outputFormat: "json",
  options: Object.freeze(["path", "corner", "data-root", "root-name", "claude-session-root", "codex-session-root", "codex-memory-root", "package-root"]),
  summary: "Read a path through the most specific recognizing projector at a requested content-commitment corner.",
  description: "Domain: { path, corner? } (or --path/--corner). Files present their content, directories present their manifest, and dated state-tier settlement addresses recompute through their deriver when current. Dispatch is classifyAt over the mounted projector catalog; the reading carries the projector type, corner, rung, and carried items.",
  relation: "projection",
  run: (input: unknown, args: Record<string, unknown>): unknown => {
    const record = (input ?? {}) as Record<string, unknown>;
    const request = {
      path: stringArg(args, "path") ?? String(record["path"] ?? ""),
      corner: stringArg(args, "corner") ?? (typeof record["corner"] === "string" ? record["corner"] : undefined),
    };
    return readAtRoot(bindingOfArgs(args), request);
  },
});

/** write — `writeAtRoot`: admission a claim and fold it through the write leg. */
export const writeOperation: Operation = operation({
  verb: "write",
  inputFormat: "json",
  outputFormat: "json",
  options: Object.freeze(["path", "token", "at", "data-root", "root-name"]),
  summary: "Admit a claim as a journaled utterance and fold it, through whichever of the three markdown codecs recognizes the path (or plain canonical JSON otherwise), to the addressed path.",
  description: "Domain: { path?, claim, token?, at? }. A pathless write records EAVT rows under the bound data root's log tier (hook envelopes keep their established row shape); an addressed write records under the innermost enclosing settlement of the target path (the nearest ancestor with deposited data/journals, the bound root as fallback), then folds the claim through the site-note, agents-doc, or plain markdown codec if the target path matches one of them (most specific first), else writes the claim as canonical JSON. A directory-manifest claim materializes as the directory itself; a command claim ({ tool: tex-engine|blueprint-tool|verso-tool|lean|lake, command?, args? }) written to a workspace directory executes through the lifecycle-recorded process boundary, its lifecycle recorded in the workspace's own settlement, with the tool observation as the receipt.",
  relation: "projection",
  run: (input: unknown, args: Record<string, unknown>): unknown => {
    const record = (input ?? {}) as Record<string, unknown>;
    const request = {
      path: stringArg(args, "path") ?? (typeof record["path"] === "string" ? record["path"] : undefined),
      claim: requireJsonValue(record["claim"], "write claim"),
      token: stringArg(args, "token") ?? (typeof record["token"] === "string" ? record["token"] : undefined),
      at: stringArg(args, "at") ?? (typeof record["at"] === "string" ? record["at"] : undefined),
      causes: Array.isArray(record["causes"])
        ? Object.freeze(record["causes"].filter((cause): cause is string => typeof cause === "string"))
        : undefined,
    };
    return writeAtRoot(bindingOfArgs(args), request);
  },
});

export const filesystemOperations: readonly Operation[] = Object.freeze([readOperation, writeOperation]);

function boundOperation(unbound: Operation, binding: FilesystemBinding): Operation {
  return withOperationArguments(unbound, {
    "data-root": binding.dataRoot,
    ...(binding.rootName === undefined ? {} : { "root-name": binding.rootName }),
    ...(binding.claudeSessionRoot === undefined ? {} : { "claude-session-root": binding.claudeSessionRoot }),
    ...(binding.codexSessionRoot === undefined ? {} : { "codex-session-root": binding.codexSessionRoot }),
    ...(binding.codexMemoryRoot === undefined ? {} : { "codex-memory-root": binding.codexMemoryRoot }),
    ...(binding.packageRoot === undefined ? {} : { "package-root": binding.packageRoot }),
  });
}

/** Replace unbound read/write in a family with ones bound to this node's roots. */
export function withFilesystemBinding(family: readonly Operation[], binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze(family.map((act) =>
    act.verb === readOperation.verb ? boundOperation(readOperation, binding)
      : act.verb === writeOperation.verb ? boundOperation(writeOperation, binding)
        : act));
}

/** The default binding for a node serving one data root: Claude Code transcripts
 *  under the host's project slug for that root, Codex sessions under the host's
 *  session store, and the package itself as the module-topology target. Lean and
 *  TeX workspaces need NO binding — they are recognized at their own paths. */
export function defaultFilesystemBinding(
  dataRoot: string,
  options: DefaultFilesystemBindingOptions = {},
): FilesystemBinding {
  const resolvedRoot = path.resolve(dataRoot);
  return Object.freeze({
    dataRoot: resolvedRoot,
    claudeSessionRoot: options.claudeSessionRoot ?? path.join(homedir(), ".claude", "projects", resolvedRoot.split(path.sep).join("-")),
    codexSessionRoot: options.codexSessionRoot ?? path.join(homedir(), ".codex", "sessions"),
    codexMemoryRoot: options.codexMemoryRoot ?? path.join(homedir(), ".codex", "memories"),
    ...(options.packageRoot === undefined ? {} : { packageRoot: options.packageRoot }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
}
