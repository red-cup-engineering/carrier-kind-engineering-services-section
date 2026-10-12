/**
 * @packageDocumentation
 *
 * integrations/filesystem/services/read-write-verbs — the read and write
 * operations, as pure transformations over a `binding` bag every effectful
 * call arrives through as a parameter (never a module-level import): the
 * bag's default construction (`node:os`, and the `node:fs`/`node:fs/promises`
 * primitives it bundles) is `./read-write.mjs`'s one export,
 * `defaultFilesystemBinding` — kept at that name and path rather than here
 * because a held-area test still imports it from exactly there.
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
 * Derived views live at state-tier addresses (`data/state/<token>-state/
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
import { javascriptProgram } from "@red-cup-engineering/javascript-node-services-section/module-closure";
import {defaultFilesystemBinding} from "@red-cup-engineering/computer-system-engine/rpc/binding";
import {schemaFrom} from "@red-cup-engineering/json-schema-services-section/contracts";
import { pathPoint } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { operation, withOperationArguments } from "@red-cup-engineering/computer-system-engine/rpc/operation";

import { transportCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { agentsDocProjector, classifyResource, siteNoteProjector } from "@red-cup-engineering/metroplat/presentation/catalog";
import { markdownProjector } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { applyMarkdownEdit, isMarkdownEditRequest } from "@red-cup-engineering/markdown-engineering-services-section/apply-markdown-edit";
import { applyLspTextEdits } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/text.domain";
import { LSP_METHODS, lspRequestEnvelopeContract } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/codec";
import { projectLsp } from "@red-cup-engineering/metroplat/lsp/bind";
import { isDirectoryManifest } from "@red-cup-engineering/metroplat/resources/directory-manifest";
import { cornerOf, rungOf } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { address, utteranceCell } from "@red-cup-engineering/signcell/cell";
import { isSessionReading } from "@red-cup-engineering/relating/running/session";
import { readLeanWorkspace } from "@red-cup-engineering/feltos/lean/workspace/service";
import {
  runBlueprintWorkspaceCommand,
  runTexWorkspaceCommand,
  runVersoWorkspaceCommand,
} from "@red-cup-engineering/feltos/lean/tex/workspace-service";
import { readTexWorkspace } from "@red-cup-engineering/lean-system-services-section/tex/workspace-service";

/** An uttered claim's reflexive SignCell and its address. */
const utteredCell = (token, claim) => { const told = utteranceCell(token, claim); return Object.freeze({ cell: told, address: address(told) }); };


/** Roots the read/write pair is bound to at service assembly. */

/** Host-facing roots that may be supplied explicitly when assembling a default binding. */

/** Present a path as a boundary resource: a directory as its recognized workspace reading or
 *  manifest, or a file's content. */
export async function presentResource(filePath, binding) {
  const resolved = path.resolve(filePath);
  const markdownResolution = binding.resolveMarkdownNode(resolved);
  if (markdownResolution.kind === "ambiguous") {
    throw new TypeError(`read: ambiguous markdown node ${markdownResolution.canonicalPath} has carriers ${markdownResolution.paths.join(", ")}`);
  }
  const located = markdownResolution.kind === "located" ? markdownResolution.path : resolved;
  const stat = binding.statPathOrNull(located);
  if (stat === null) throw new TypeError(`read: no resource at ${resolved}`);
  if (stat.isDirectory()) {
    const kind = classifyWorkspaceKind(located, binding);
    const presented = kind === null ? directoryManifestOf(located, binding) : WORKSPACE_PRESENTATION[kind](located, binding);
    return Object.freeze({
      path: markdownResolution.kind === "located" ? markdownResolution.canonicalPath : located,
      content: `${canonicalJson(requireJsonValue(JSON.parse(JSON.stringify(presented)), `directory ${located}`))}\n`,
    });
  }
  return Object.freeze({ path: markdownResolution.kind === "located" ? markdownResolution.canonicalPath : located, content: binding.readFileUtf8(located) });
}

const CORNERS = new Set(["bottom", "data", "prose", "assertion"]);

function cornerArg(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  if (!CORNERS.has(text)) throw new TypeError(`read: unknown corner ${text} (bottom|data|prose|assertion)`);
  return text;
}

/** The result `read` returns: the dispatched projector's coordinates and its carried items. */

function admitReadArrival(
  binding,
  request,
) {
  const at = binding.now();
  return appendArrivalAtRoot(binding.dataRoot, transportCloudEvent("filesystem", Object.freeze({
    kind: "metroplat.filesystem.read-arrival-material",
    path: request.path,
    ...(request.corner === undefined ? {} : { corner: request.corner }),
  }), at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference",
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
  binding,
  request,
) {
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
  return Object.freeze({
    kind: "metroplat.filesystem.read-result",
    path: resource.path,
    type: projector.type,
    corner: cornerOf(projector),
    rung: rungOf(projector),
    content: resource.content,
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
function writeTargetProjector(resource) {
  if (siteNoteProjector.recognize(resource)) return siteNoteProjector;
  if (agentsDocProjector.recognize(resource)) return agentsDocProjector;
  if (markdownProjector.recognize(resource)) return markdownProjector;
  return null;
}

function jsonRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function lspRequestEnvelopeOf(value) {
  try {
    return lspRequestEnvelopeContract.assert(value, "write lsp request");
  } catch {
    return undefined;
  }
}

function textDocumentUriOf(request, fallback) {
  const params = jsonRecord(request.params);
  const textDocument = params === undefined ? undefined : jsonRecord(params["textDocument"]);
  const uri = textDocument?.["uri"];
  return typeof uri === "string" && uri !== "" ? uri : fallback;
}

function lspRequestForUri(request, uri) {
  const params = jsonRecord(request.params) ?? {};
  return Object.freeze({
    ...request,
    params: Object.freeze({
      ...params,
      textDocument: Object.freeze({ uri }),
    }),
  });
}

function isLspPosition(value) {
  const record = jsonRecord(value);
  return record !== undefined && Number.isInteger(record["line"]) && Number.isInteger(record["character"]);
}

function isLspTextEdit(value) {
  const record = jsonRecord(value);
  const range = jsonRecord(record?.["range"]);
  return record !== undefined
    && typeof record["newText"] === "string"
    && range !== undefined
    && isLspPosition(range["start"])
    && isLspPosition(range["end"]);
}

function lspTextEdits(value) {
  if (!Array.isArray(value) || !value.every(isLspTextEdit)) {
    throw new TypeError("write: LSP result must carry TextEdit objects");
  }
  return Object.freeze(value);
}

function workspaceEditTextEdits(value, uri) {
  const action = jsonRecord(value);
  const edit = jsonRecord(action?.["edit"]);
  const changes = jsonRecord(edit?.["changes"]);
  const edits = changes?.[uri];
  if (edits === undefined) throw new TypeError(`write: LSP code action has no workspace edit for ${uri}`);
  return lspTextEdits(edits);
}

function lspResponseTextEdits(method, value, uri) {
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

  

/** TeX command claims retain their existing instruments. Lean execution uses
 *  lean-check, with typed compiler actions, a node lock, limits and receipts. */
const COMMAND_TOOLS = new Set(["tex-engine", "blueprint-tool", "verso-tool"]);

/** A command claim: the Plan 9 ctl-file shape of execution. Writing one to a
 *  workspace directory records the utterance and runs the tool through the
 *  lifecycle-recorded process boundary. */

/** Recognize a claim as a command claim, or null. */
export function commandClaimOf(claim) {
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) return null;
  const record = claim;
  const tool = record["tool"];
  if (typeof tool !== "string" || !COMMAND_TOOLS.has(tool)) return null;
  if ("command" in record && typeof record["command"] !== "string") return null;
  const args = record["args"];
  if (args !== undefined && (!Array.isArray(args) || !args.every((arg) => typeof arg === "string"))) return null;
  return claim;
}

function runCommandClaim(
  workspace,
  claim,
  binding,
  at,
  rootName,
) {
  const lifecyclePersistence = Object.freeze({ dataRoot: binding.dataRoot, rootName });
  const options = {
    ...(claim.command === undefined ? {} : { command: claim.command }),
    ...(claim.args === undefined ? {} : { args: claim.args }),
    at,
    lifecyclePersistence,
  };
  const observation = claim.tool === "tex-engine" ? runTexWorkspaceCommand(workspace, options)
    : claim.tool === "blueprint-tool" ? runBlueprintWorkspaceCommand(workspace, options)
      : runVersoWorkspaceCommand(workspace, options);
  return JSON.parse(JSON.stringify(observation));
}

/** The innermost ancestor of a path bearing deposited tiers (a `data/logs`
 *  directory), or the fallback root when no enclosure exists. Which settlement
 *  records a write is a function of the target path, never of the process:
 *  a write into an inhabited constituent deposits in that constituent's own
 *  plate. A bare directory becomes inhabited by its first deposit (fold a
 *  claim to a path under its `data/logs`), after which enclosure finds it. */
export function enclosingClaimDataRoot(targetPath, fallback, binding) {
  let dir = path.dirname(path.resolve(targetPath));
  for (;;) {
    if (path.basename(dir) !== "data" && ["logs", "state", "records"].some((tier) => binding.statPathOrNull(path.join(dir, "data", tier))?.isDirectory() === true)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(fallback);
    dir = parent;
  }
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
export function normalizeSubjectToken(basename) {
  const settleMatch = STATE_SETTLEMENT_BASENAME.exec(basename);
  if (settleMatch?.[1] !== undefined) return settleMatch[1];
  const dated = DATE_PREFIX.exec(basename);
  const dateStripped = dated?.[1] ?? basename;
  const firstDot = dateStripped.indexOf(".");
  return firstDot > 0 ? dateStripped.slice(0, firstDot) : dateStripped;
}

/** A properly-admitted claim's two marks and its posited reading: `token` is
 *  the caller's own identity (the identity-carrying side of the utterance),
 *  `claimMark` is the assertion content (the content-carrying side) — the
 *  minimal principled pair `Utterance` admits. The predication cell is never
 *  accepted as input; `writeAtRoot` derives it via `predicationSeed`. */

/** Recognize a write request's claim as the `{token, claim, reading}` shape,
 *  or `null` when it is some other claim vocabulary (a bare `{cell, reading}`
 *  row, a command claim, a directory manifest, arbitrary content) — a
 *  structural shape check, never a guess at content. */
function utteredClaimOf(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value;
  const token = record["token"];
  const claimMark = record["claim"];
  const reading = record["reading"];
  if (token === undefined || claimMark === undefined || typeof reading !== "string") return undefined;
  return Object.freeze({ token, claimMark, reading });
}

function admitWriteArrival(
  binding,
  request

,
  at,
  rootName,
) {
  return appendArrivalAtRoot(binding.dataRoot, transportCloudEvent("filesystem", Object.freeze({
    kind: "metroplat.filesystem.write-arrival-material",
    ...(request.path === undefined ? {} : { path: request.path }),
    ...(request.token === undefined ? {} : { token: request.token }),
    ...(request.causes === undefined ? {} : { causes: request.causes }),
    claim: request.claim,
  }), at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference",
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
  binding,
  request

,
) {
  if (request.claim === undefined) throw new TypeError("write: claim is required");
  const at = request.at ?? binding.now();
  const rootName = binding.rootName ?? "@red-cup-engineering/metroplat";
  const arrival = admitWriteArrival(binding, request, at, rootName);
  // Constructors admit minimal principled objects; readers derive downstream
  // structure (placement-law rule 6) — so a caller that wants a real
  // predication cell supplies the two marks `Utterance` actually needs (its
  // own identity as the token, its assertion as the claim-mark), and the cell
  // is DERIVED here via `predicationSeed`, never reverse-parsed out of an
  // opaque label. Callers still sending the older bare `{cell: string,
  // reading}` shape (or no reading at all) are unchanged, except that any
  // `reading` present is now checked against the FOUR finite vocabulary and
  // rejected at the boundary rather than silently admitted (placement-law
  // rule 22) — the same gate previously applied unconditionally now applies
  // to whichever of the two shapes the claim carries.
  const uttered = utteredClaimOf(request.claim);
  let admittedClaim = request.claim;
  if (uttered !== undefined) {
    if (!isSessionReading(uttered.reading)) {
      throw new TypeError(`write: claim reading must be a member of the FOUR finite vocabulary (unknown|held|denied|contested), got ${JSON.stringify(uttered.reading)}`);
    }
    const identity = utteredCell(uttered.token, uttered.claimMark);
    admittedClaim = Object.freeze({
      kind: "metroplat.filesystem.predicated-claim",
      cell: JSON.parse(JSON.stringify(identity.cell)),
      address: identity.address,
      reading: uttered.reading,
    });
  } else if (request.claim !== null && typeof request.claim === "object" && !Array.isArray(request.claim) && "reading" in request.claim) {
    const reading = (request.claim)["reading"];
    if (typeof reading !== "string" || !isSessionReading(reading)) {
      throw new TypeError(`write: claim reading must be a member of the FOUR finite vocabulary (unknown|held|denied|contested), got ${JSON.stringify(reading)}`);
    }
  }
  const requestedPath = request.path === undefined ? undefined : path.resolve(request.path);
  const markdownTarget = requestedPath === undefined ? undefined : binding.resolveMarkdownNode(requestedPath);
  if (markdownTarget?.kind === "ambiguous") throw new TypeError(`write: ambiguous markdown node ${markdownTarget.canonicalPath} has carriers ${markdownTarget.paths.join(", ")}`);
  const targetPath = markdownTarget?.kind === "located" ? markdownTarget.path : requestedPath;
  const journalRoot = targetPath === undefined
    ? binding.dataRoot
    : enclosingClaimDataRoot(targetPath, binding.dataRoot, binding);
  const subject = request.token
    ?? (targetPath === undefined ? "write" : normalizeSubjectToken(targetPath.split(path.sep).at(-1) ?? "write"));
  // A predicated claim's cell and reading are the attribute of its recorded
  // row — the same row shape the claim-session feed cellizes (`sessionAttribute`
  // carries {cell, reading}), which is what `workItemObservationsOfRows` and
  // every other admit-feed reader consume. Burying them in the value slot made
  // a declared work item recorded but invisible to its own settlement; this
  // fixes that by writing them at the attribute a reader actually reads.
  const predication = (() => {
    if (admittedClaim === null || typeof admittedClaim !== "object" || Array.isArray(admittedClaim)) return undefined;
    const record = admittedClaim;
    const cell = record["cell"];
    const reading = record["reading"];
    return typeof cell === "string" && typeof reading === "string" && isSessionReading(reading)
      ? Object.freeze({ cell, reading })
      : undefined;
  })();
  // The write is one `filesystem-write` record of the enclosing settlement, following the causes the request names.
  const written = put(journalRoot, "filesystem-write", {
    e: targetPath === undefined ? subject : pathPoint(targetPath.split(path.sep).join("/")),
    a: Object.freeze({ event: "write", ...(predication ?? {}) }),
    v: admittedClaim,
    t: at,
    ...(request.causes === undefined ? {} : { causes: request.causes }),
  });
  const admission = Object.freeze({ type: "filesystem-write", root: journalRoot, address: written, rootName, subject });

  if (targetPath === undefined) {
    return Object.freeze({ kind: "metroplat.filesystem.write-receipt", arrival, admission});
  }

  // A command claim written to a workspace directory is execution: the
  // utterance is already recorded above; the fold runs the named tool through
  // the lifecycle-recorded process boundary and the receipt carries its
  // observation. The workspace path is the ctl file.
  const retiredLeanTool = request.claim !== null && typeof request.claim === "object"
    && (request.claim.tool === "lean" || request.claim.tool === "lake");
  if (retiredLeanTool && binding.statPathOrNull(targetPath)?.isDirectory() === true)
    throw new TypeError("write: Lean execution requires lean-check with a typed build, file, or declaration action");
  const command = commandClaimOf(request.claim);
  if (command !== null && binding.statPathOrNull(targetPath)?.isDirectory() === true) {
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt",
      arrival,
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
      binding.ensureDirectory(path.dirname(full));
      writeFileAtomic(full, content);
      files += 1;
      bytes += Buffer.byteLength(content, "utf8");
    }
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt",
      arrival,
      admission,
      target: Object.freeze({ path: targetPath, type: "directory-manifest", bytes, files }),
    });
  }

  const resource = Object.freeze({ path: targetPath.split(path.sep).join("/"), content: canonicalJson(request.claim) });
  const projector = writeTargetProjector(resource);
  const lspRequest = lspRequestEnvelopeOf(request.claim);
  if (projector !== null && lspRequest !== undefined) {
    if (lspRequest.method !== LSP_METHODS.formatting && lspRequest.method !== LSP_METHODS.codeAction) {
      throw new TypeError(`write: markdown LSP writes support ${LSP_METHODS.formatting} or ${LSP_METHODS.codeAction}, got ${lspRequest.method}`);
    }
    if (binding.statPathOrNull(targetPath)?.isFile() !== true) throw new TypeError(`write: markdown LSP target does not exist: ${targetPath}`);
    const existing = binding.readFileUtf8(targetPath);
    const uri = textDocumentUriOf(lspRequest, pathToFileURL(targetPath).href);
    const response = projectLsp({
      schemas: [],
      operations: [],
      markdownDocuments: [Object.freeze({ uri, text: existing })],
    }).handle(lspRequestForUri(lspRequest, uri));
    const applied = applyLspTextEdits(existing, lspResponseTextEdits(lspRequest.method, response.result, uri));
    binding.ensureDirectory(path.dirname(targetPath));
    writeFileAtomic(targetPath, applied.text);
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt",
      arrival,
      admission,
      target: Object.freeze({ path: targetPath, type: projector.type, bytes: applied.afterBytes }),
      observation: Object.freeze({
        kind: "metroplat.markdown.lsp-write-receipt",
        method: lspRequest.method,
        uri,
        response: response,
        application: Object.freeze({
          kind: applied.kind,
          edits: applied.edits,
          changed: applied.changed,
          beforeBytes: applied.beforeBytes,
          afterBytes: applied.afterBytes,
        }),
      }),
    });
  }
  if (projector !== null && isMarkdownEditRequest(request.claim)) {
    const existing = binding.statPathOrNull(targetPath)?.isFile() === true
      ? binding.readFileUtf8(targetPath)
      : request.claim.createIfMissing === true
        ? request.claim.initialText ?? ""
        : undefined;
    if (existing === undefined) throw new TypeError(`write: markdown edit target does not exist: ${targetPath}`);
    const applied = applyMarkdownEdit(existing, request.claim);
    binding.ensureDirectory(path.dirname(targetPath));
    writeFileAtomic(targetPath, applied.text);
    return Object.freeze({
      kind: "metroplat.filesystem.write-receipt",
      arrival,
      admission,
      target: Object.freeze({ path: targetPath, type: projector.type, bytes: Buffer.byteLength(applied.text, "utf8") }),
      observation: applied.receipt,
    });
  }
  // A path recognized by none of the three markdown codecs is plain data: the
  // canonical JSON already computed as `resource.content` IS the body, with no
  // dispatch needed — every non-markdown projector in the retired catalog
  // inherited this exact same write, verbatim.
  const type = projector?.type ?? "json";
  const content = projector?.write?.([request.claim]) ?? `${resource.content}\n`;
  binding.ensureDirectory(path.dirname(targetPath));
  writeFileAtomic(targetPath, content);
  return Object.freeze({
    kind: "metroplat.filesystem.write-receipt",
    arrival,
    admission,
    target: Object.freeze({ path: targetPath, type, bytes: Buffer.byteLength(content, "utf8") }),
  });
}

function stringArg(args, key) {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function bindingOfArgs(args) {
  const dataRoot = stringArg(args, "data-root");
  if (dataRoot === undefined) throw new TypeError("filesystem: expected --data-root");
  return defaultFilesystemBinding(dataRoot,{
    ...(stringArg(args, "root-name") === undefined ? {} : { rootName: stringArg(args, "root-name") }),
    ...(stringArg(args, "claude-session-root") === undefined ? {} : { claudeSessionRoot: stringArg(args, "claude-session-root") }),
    ...(stringArg(args, "codex-session-root") === undefined ? {} : { codexSessionRoot: stringArg(args, "codex-session-root") }),
    ...(stringArg(args, "codex-memory-root") === undefined ? {} : { codexMemoryRoot: stringArg(args, "codex-memory-root") }),
    ...(stringArg(args, "package-root") === undefined ? {} : { packageRoot: stringArg(args, "package-root") }),
  });
}

// The read/write pair selects exports of one admitted source snapshot.
const resourceProgramme = javascriptProgram(import.meta.url, "runRead");

/** read — `readAtRoot`: dispatch a path through the projector catalog at a corner. */
export const readOperation = operation({
  verb: "read",
  locus: "path",
  domain:schemaFrom({$id:"metroplat/resources/read-request",type:["object","null"],properties:{path:{type:"string",minLength:1},corner:{type:"string"}},additionalProperties:true}),
  inputFormat: "json",
  outputFormat: "json",
  options: Object.freeze(["path", "corner", "data-root", "root-name", "claude-session-root", "codex-session-root", "codex-memory-root", "package-root"]),
  summary: "Read a path through the most specific recognizing projector at a requested content-commitment corner.",
  description: "Domain: { path, corner? } (or --path/--corner). Files present their content, directories present their manifest, and dated state-tier settlement addresses recompute through their deriver when current. Dispatch is classifyAt over the mounted projector catalog; the reading carries the projector type, corner, rung, and carried items.",
  relation: "projection",
  program: resourceProgramme,
});


export function runRead(input, args = {}, context) {
    const record = (input ?? {});
    const request = {
      path: stringArg(args, "path") ?? String(record["path"] ?? ""),
      corner: stringArg(args, "corner") ?? (typeof record["corner"] === "string" ? record["corner"] : undefined),
    };
    return readAtRoot(context?.filesystemBinding??bindingOfArgs(args), request);
}

/** write — `writeAtRoot`: admission a claim and fold it through the write leg. */
export const writeOperation = operation({
  verb: "write",
  locus: "path",
  effects:{class:"external",replay:"coordinated",coordination:"coordination-required",deterministic:"unmeasured",totality:"partial"},
  domain:schemaFrom({$id:"metroplat/resources/write-request",type:"object",required:["claim"],properties:{path:{type:"string",minLength:1},claim:{},token:{type:"string"},at:{type:"string"},causes:{type:"array",items:{type:"string"}}},additionalProperties:true}),
  inputFormat: "json",
  outputFormat: "json",
  options: Object.freeze(["path", "token", "at", "data-root", "root-name"]),
  summary: "Admit a claim as a journaled utterance and fold it, through whichever of the three markdown codecs recognizes the path (or plain canonical JSON otherwise), to the addressed path.",
  description: "Domain: { path?, claim, token?, at? }. A pathless write records EAVT rows under the bound data root's log tier (hook envelopes keep their established row shape); an addressed write records under the innermost enclosing settlement of the target path (the nearest ancestor with deposited data/logs, the bound root as fallback), then folds the claim through the site-note, agents-doc, or plain markdown codec if the target path matches one of them (most specific first), else writes the claim as canonical JSON. A directory-manifest claim materializes as the directory itself; a command claim ({ tool: tex-engine|blueprint-tool|verso-tool, command?, args? }) written to a workspace directory executes through the lifecycle-recorded process boundary, its lifecycle recorded in the workspace's own settlement, with the tool observation as the receipt.",
  relation: "projection",
  program: Object.freeze({ ...resourceProgramme, export: "runWrite" }),
});


export function runWrite(input, args = {}, context) {
    const record = (input ?? {});
    const request = {
      path: stringArg(args, "path") ?? (typeof record["path"] === "string" ? record["path"] : undefined),
      claim: requireJsonValue(record["claim"], "write claim"),
      token: stringArg(args, "token") ?? (typeof record["token"] === "string" ? record["token"] : undefined),
      at: stringArg(args, "at") ?? (typeof record["at"] === "string" ? record["at"] : undefined),
      causes: Array.isArray(record["causes"])
        ? Object.freeze(record["causes"].filter((cause) => typeof cause === "string"))
        : undefined,
    };
    return writeAtRoot(context?.filesystemBinding??bindingOfArgs(args), request);
}

export const filesystemOperations = Object.freeze([readOperation, writeOperation]);

function boundOperation(unbound, binding) {
  return withOperationArguments(unbound, {
    "data-root": binding.dataRoot,
    ...(binding.rootName === undefined ? {} : { "root-name": binding.rootName }),
    ...(binding.claudeSessionRoot === undefined ? {} : { "claude-session-root": binding.claudeSessionRoot }),
    ...(binding.codexSessionRoot === undefined ? {} : { "codex-session-root": binding.codexSessionRoot }),
    ...(binding.codexMemoryRoot === undefined ? {} : { "codex-memory-root": binding.codexMemoryRoot }),
    ...(binding.packageRoot === undefined ? {} : { "package-root": binding.packageRoot }),
  },{filesystemBinding:binding});
}

/** Replace unbound read/write in a family with ones bound to this node's roots. */
export function withFilesystemBinding(family, binding) {
  return Object.freeze(family.map((act) =>
    act.verb === readOperation.verb ? boundOperation(readOperation, binding)
      : act.verb === writeOperation.verb ? boundOperation(writeOperation, binding)
        : act));
}
