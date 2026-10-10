#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ACTOR = "urn:ame:accepted-software-delivery-receiver-service";
export const SETTLEMENT = "urn:ame:software-development-services-section";
export const HUMAN_LEADER = "urn:leader:emsenn";
export const SERVICE_ROOT = "services/accepted-software-delivery-receiver-service";
export const STAGE_OPERATION = "stage-accepted-software-delivery";
export const ADMIT_OPERATION = "review-and-admit-staged-software-delivery";
export const CORRECTION_STAGE_OPERATION = "stage-accepted-software-delivery-correction";
export const CORRECTION_ADMIT_OPERATION = "review-and-admit-staged-software-delivery-correction";
export const STAGING_RECEIPT = "AcceptedSoftwareDeliveryStagingReceipt";
export const ADMISSION_RECEIPT = "SoftwareDeliveryAdmissionReceipt";
export const CORRECTION_STAGING_RECEIPT = "AcceptedSoftwareDeliveryCorrectionStagingReceipt";
export const CORRECTION_ADMISSION_RECEIPT = "SoftwareDeliveryCorrectionAdmissionReceipt";
export const PRESERVED_RUNTIME_ROOTS = Object.freeze(["data", "node_modules"]);
export const STAGE_EFFECTS = Object.freeze(["sdss-receiver-local-private-candidate", "sdss-receiver-local-append-only-evidence", "sdss-receiver-local-staged-tree"]);
export const ADMIT_EFFECTS = Object.freeze(["sdss-local-create-only-target", "sdss-receiver-local-append-only-evidence"]);
export const CORRECTION_STAGE_EFFECTS = Object.freeze(["sdss-receiver-local-private-replacement-plate", "sdss-receiver-local-append-only-evidence", "sdss-existing-target-plate-snapshot"]);
export const CORRECTION_ADMIT_EFFECTS = Object.freeze(["sdss-local-crash-recoverable-plate-replacement", "sdss-receiver-local-append-only-evidence", "sdss-prior-plate-digest-preservation", "sdss-displaced-live-plate-removal"]);

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_AUTHORITY_ROOT = resolve(MODULE_ROOT, "../..");
const DEFAULT_RECORD_ROOT = join(DEFAULT_AUTHORITY_ROOT, "data");
const DEFAULT_DATA_ROOT = join(MODULE_ROOT, "data");
const SHA = /^sha256:[0-9a-f]{64}$/u;
const CONTENT_ID = /^urn:sha256:[0-9a-f]{64}$/u;
// The shared mesh-scope carrier, at its owner (8c7d72e9 removed the private copies this once named).
export const ADOPTED_MESH_CARRIER = "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/mesh-scope";
export const ADOPTED_MESH_EXPORTS = Object.freeze(["inspectMeshScope", "admitEnterpriseInstall", "revalidateEnterpriseInstall"]);

async function adoptedMeshCarrier(options = {}) {
  const carrier = options.meshCarrier ?? await import(ADOPTED_MESH_CARRIER);
  if (!ADOPTED_MESH_EXPORTS.every((name) => typeof carrier?.[name] === "function")) {
    throw new ReceiverRefusal("adopted-mesh-carrier-invalid", "the adopted carrier does not expose the exact inspect/admit/revalidate seam");
  }
  return {
    inspectMeshScope: carrier.inspectMeshScope,
    admitEnterpriseInstall: carrier.admitEnterpriseInstall,
    revalidateEnterpriseInstall: carrier.revalidateEnterpriseInstall,
    identity: Object.freeze({ specifier: ADOPTED_MESH_CARRIER, exports: ADOPTED_MESH_EXPORTS }),
  };
}

export class ReceiverRefusal extends Error {
  constructor(code, detail, evidence = {}) {
    super(detail);
    this.name = "ReceiverRefusal";
    this.code = code;
    this.evidence = evidence;
  }
}

export class InjectedCrash extends Error {
  constructor(phase) {
    super(`injected crash after ${phase}`);
    this.name = "InjectedCrash";
    this.code = "injected-crash";
    this.phase = phase;
  }
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

export function rawDigest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function contentRecord(body) {
  return { id: `urn:${digest(body)}`, ...body };
}

function withoutId(value) {
  const { id: _id, ...body } = value ?? {};
  return body;
}

export function assertContentRecord(value, label) {
  if (!value || !CONTENT_ID.test(value.id ?? "") || value.id !== `urn:${digest(withoutId(value))}`) {
    throw new ReceiverRefusal("content-identity-mismatch", `${label} is not an exact content record`);
  }
  return value;
}

export function assertReplyIdentity(value, label) {
  const expected = `urn:${digest({ type: value?.type, source: value?.inReplyTo ?? null, object: value?.object })}`;
  if (!value || !CONTENT_ID.test(value.id ?? "") || value.id !== expected) {
    throw new ReceiverRefusal("content-identity-mismatch", `${label} does not recompute under the provider reply identity law`);
  }
  return value;
}

export function safeRelative(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("\\") || value.includes("//") || isAbsolute(value)) return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== ".." && part !== ".git") && value === parts.join("/");
}

function exactUnder(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function existingDirectory(label, path) {
  let canonicalPath;
  try {
    const lexical = resolve(path);
    canonicalPath = realpathSync(lexical);
    if (canonicalPath !== lexical || lstatSync(lexical).isSymbolicLink() || !statSync(canonicalPath).isDirectory()) throw new Error("not a canonical non-symlink directory");
  } catch (error) {
    throw new ReceiverRefusal("canonical-path-refused", `${label} is not an exact existing non-symlink directory`, { cause: error.message });
  }
  return canonicalPath;
}

export function pathSnapshot(rootArg, relativePath, { finalMustBeAbsent = false } = {}) {
  const root = existingDirectory("authority root", rootArg);
  if (!safeRelative(relativePath)) throw new ReceiverRefusal("unsafe-relative-path", relativePath ?? "absent");
  const components = [];
  let at = root;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    at = join(at, parts[index]);
    let entry;
    try { entry = lstatSync(at); }
    catch {
      if (index !== parts.length - 1) throw new ReceiverRefusal("path-ancestor-absent", relativePath, { component: at });
      components.push({ path: at, exists: false });
      break;
    }
    if (entry.isSymbolicLink()) throw new ReceiverRefusal("symlink-path-refused", relativePath, { component: at });
    if (index < parts.length - 1 && !entry.isDirectory()) throw new ReceiverRefusal("non-directory-ancestor-refused", relativePath, { component: at });
    components.push({ path: at, exists: true, dev: entry.dev, ino: entry.ino, mode: entry.mode, type: entry.isDirectory() ? "directory" : "file" });
  }
  if (finalMustBeAbsent && components.at(-1)?.exists !== false) throw new ReceiverRefusal("create-only-destination-exists", relativePath);
  return Object.freeze({ root, relativePath, components: Object.freeze(components) });
}

function walkFiles(root) {
  const files = [];
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new ReceiverRefusal("symlink-tree-refused", relative(root, child));
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) {
        const bytes = readFileSync(child);
        files.push({ path: relative(root, child).split(sep).join("/"), digest: rawDigest(bytes), byteLength: bytes.length });
      } else throw new ReceiverRefusal("special-file-refused", relative(root, child));
    }
  }
  walk(root);
  return files;
}

export function treeEvidence(root) {
  const files = walkFiles(existingDirectory("tree", root));
  return { files, treeDigest: digest(files) };
}

function jsonlFiles(root) {
  const paths = [];
  function walk(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) paths.push(child);
    }
  }
  walk(root);
  return paths.sort();
}

function readRecords(root) {
  const records = [];
  for (const path of jsonlFiles(root)) {
    for (const [index, line] of readFileSync(path, "utf8").split("\n").entries()) {
      if (!line) continue;
      try { records.push({ path, line: index + 1, value: JSON.parse(line) }); }
      catch (error) { throw new ReceiverRefusal("malformed-local-record", path, { line: index + 1, cause: error.message }); }
    }
  }
  return records;
}

function visibleObjects(record) {
  return [record, record?.delivery, record?.decision, record?.receipt, record?.transition, record?.consumption].filter(Boolean);
}

export function resolveExactLocalRecord(root, id, label) {
  if (!CONTENT_ID.test(id ?? "")) throw new ReceiverRefusal("invalid-content-id", `${label} ID is invalid`);
  const matches = readRecords(root).flatMap(({ path, line, value }) => visibleObjects(value).filter((candidate) => candidate.id === id).map((candidate) => ({ path, line, candidate })));
  if (matches.length !== 1) throw new ReceiverRefusal(matches.length === 0 ? "local-record-absent" : "duplicate-local-record", `${label} must resolve exactly once`, { id, matches: matches.map(({ path, line }) => ({ path, line })) });
  return matches[0].candidate;
}

function evidencePath(dataRoot, category, recordedAt) {
  const day = recordedAt.slice(0, 10);
  const [year, month, date] = day.split("-");
  return join(dataRoot, category, year, month, date, `${day}-accepted-software-delivery-receiver-service-${basename(category)}.jsonl`);
}

function appendEvidence(dataRoot, category, record) {
  assertContentRecord(record, `${category} record`);
  const existing = readRecords(join(dataRoot, category)).flatMap(({ value }) => visibleObjects(value)).find((candidate) => candidate.id === record.id);
  if (existing) return existing;
  const path = evidencePath(dataRoot, category, record.recordedAt);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`);
  return record;
}

function recordsOfType(dataRoot, type) {
  return readRecords(dataRoot).flatMap(({ value }) => visibleObjects(value)).filter((record) => record?.type === type);
}

function crash(options, phase) {
  if (options.crashAt === phase) throw new InjectedCrash(phase);
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function acquireAuthorityExecution(dataRoot, authority) {
  const locks = join(dataRoot, "authority-execution-locks");
  mkdirSync(locks, { recursive: true, mode: 0o700 });
  const lock = join(locks, authority.authorityDigest.slice(7));
  for (;;) {
    try {
      const descriptor = openSync(lock, "wx", 0o600);
      try {
        writeFileSync(descriptor, JSON.stringify({
          pid: process.pid,
          operation: authority.offer.operation,
          requestDigest: authority.requestDigest,
          authorityDigest: authority.authorityDigest,
        }));
      } finally {
        closeSync(descriptor);
      }
      return () => {
        try { unlinkSync(lock); }
        catch (error) { if (error?.code !== "ENOENT") throw error; }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let owner;
      try { owner = JSON.parse(readFileSync(lock, "utf8")); }
      catch { throw new ReceiverRefusal("authority-execution-lock-invalid", authority.authorityDigest); }
      if (processAlive(owner.pid)) {
        throw new ReceiverRefusal("authority-execution-in-progress", authority.authorityDigest, {
          operation: owner.operation,
          requestDigest: owner.requestDigest,
        });
      }
      try { unlinkSync(lock); }
      catch (unlinkError) { if (unlinkError?.code !== "ENOENT") throw unlinkError; }
    }
  }
}

async function withAuthorityExecution(dataRoot, authority, execute) {
  const release = acquireAuthorityExecution(dataRoot, authority);
  try { return await execute(); }
  finally { release(); }
}

function resourceReceipt(started, { providerLocalMutation = false } = {}) {
  return {
    type: "ResourceReceipt",
    wallTime: { state: "measured", value: Number(process.hrtime.bigint() - started) / 1e6, unit: "ms" },
    inferenceTokens: { state: "unknown-not-zero" },
    coordination: { state: "unknown-not-zero" },
    monetaryCost: { state: "unknown-not-zero" },
    externalNetwork: false,
    externalSpend: 0,
    credentials: false,
    git: false,
    providerLocalMutation,
    customerMutation: false,
    foreignMutation: false,
    ttiMutation: false,
  };
}

function assertSettlementLocal(meshCarrier, authorityRoot, subject, label) {
  let scope;
  try { scope = meshCarrier.inspectMeshScope({ authorityRoot, subject }); }
  catch (error) { throw new ReceiverRefusal("mesh-scope-refusal", error.message, error.facts ?? {}); }
  if (!scope.inside || scope.boundaries.length > 0) throw new ReceiverRefusal("mesh-scope-refusal", `${label} is outside the SDSS-operated mesh`, { subject, boundaries: scope.boundaries });
  return scope;
}

function operationCore(operation, request) {
  if (operation === STAGE_OPERATION) {
    return {
      type: request?.type,
      proposedProductId: request?.proposedProductId,
      proposedProductDigest: request?.proposedProductDigest,
      artifactSetDigest: request?.artifactSetDigest,
      customerDecisionId: request?.customerDecisionId,
      customerDecisionReceiptId: request?.customerDecisionReceiptId,
      receiverIdentity: request?.receiverIdentity,
      targetServiceIdentity: request?.targetServiceIdentity,
      targetContract: request?.targetContract,
      targetRoot: request?.targetRoot,
    };
  }
  return {
    type: request?.type,
    stagingReceiptId: request?.stagingReceiptId,
    stagedTreeDigest: request?.stagedTreeDigest,
    receiverIdentity: request?.receiverIdentity,
    targetServiceIdentity: request?.targetServiceIdentity,
    targetContract: request?.targetContract,
    targetRoot: request?.targetRoot,
  };
}

export function solicitOperation(operation, requestCore, customer, recordedAt = new Date().toISOString()) {
  if (![STAGE_OPERATION, ADMIT_OPERATION].includes(operation) || typeof customer !== "string" || !customer.startsWith("urn:")) {
    throw new ReceiverRefusal("invalid-solicitation", "operation and customer must be exact");
  }
  const expectedType = operation === STAGE_OPERATION ? "StageAcceptedSoftwareDeliveryRequest" : "ReviewAndAdmitStagedSoftwareDeliveryRequest";
  if (requestCore?.type !== expectedType) throw new ReceiverRefusal("invalid-solicitation", `expected ${expectedType}`);
  return contentRecord({
    type: "AcceptedSoftwareDeliveryReceiverOperationOffer",
    recordedAt,
    actor: ACTOR,
    target: customer,
    operation,
    requestDigest: digest(requestCore),
    effects: operation === STAGE_OPERATION ? [...STAGE_EFFECTS] : [...ADMIT_EFFECTS],
    separatelyInvoked: true,
  });
}

function validateOfferAndAuthority(operation, request, now) {
  const core = operationCore(operation, request);
  const expectedType = operation === STAGE_OPERATION ? "StageAcceptedSoftwareDeliveryRequest" : "ReviewAndAdmitStagedSoftwareDeliveryRequest";
  if (request?.type !== expectedType || request.receiverIdentity !== ACTOR) throw new ReceiverRefusal("invalid-operation-request", `expected ${expectedType}`);
  const offer = assertContentRecord(request.operationOffer, "operation offer");
  const authority = assertContentRecord(operation === STAGE_OPERATION ? request.stagingCapability : request.admissionGrant, operation === STAGE_OPERATION ? "staging capability" : "admission grant");
  const effects = operation === STAGE_OPERATION ? STAGE_EFFECTS : ADMIT_EFFECTS;
  const authorityType = operation === STAGE_OPERATION ? "AcceptedSoftwareDeliveryStagingCapability" : "SoftwareDeliveryAdmissionGrant";
  const expectedScope = operation === STAGE_OPERATION
    ? { targetSettlement: SETTLEMENT, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot }
    : { stagingReceiptId: request.stagingReceiptId, targetSettlement: SETTLEMENT, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot };
  if (offer.type !== "AcceptedSoftwareDeliveryReceiverOperationOffer" || offer.actor !== ACTOR || offer.operation !== operation || offer.requestDigest !== digest(core) || digest(offer.effects) !== digest(effects)) {
    throw new ReceiverRefusal("operation-offer-mismatch", operation);
  }
  if (authority.type !== authorityType || authority.issuedBy !== HUMAN_LEADER || authority.receiver !== ACTOR || authority.operation !== operation || authority.requestDigest !== offer.requestDigest || authority.offerDigest !== digest(offer) || authority.singleUse !== true || typeof authority.nonce !== "string" || authority.nonce.length < 8 || digest(authority.scope) !== digest(expectedScope) || digest(authority.effects) !== digest(effects)) {
    throw new ReceiverRefusal("authority-mismatch", operation);
  }
  const issued = Date.parse(authority.issuedAt);
  const expiry = Date.parse(authority.expiresAt);
  const at = Date.parse(now);
  if (![issued, expiry, at].every(Number.isFinite) || issued > at || expiry < at) throw new ReceiverRefusal("authority-expired-or-invalid", operation);
  return { core, requestDigest: digest(core), offer, authority, authorityDigest: digest(authority) };
}

function artifactDescriptors(artifacts) {
  return artifacts.map(({ bytesBase64: _bytes, ...descriptor }) => descriptor);
}

function validateAcceptanceChain(request, recordRoot) {
  const product = assertReplyIdentity(resolveExactLocalRecord(recordRoot, request.proposedProductId, "proposed product"), "proposed product");
  const decision = assertReplyIdentity(resolveExactLocalRecord(recordRoot, request.customerDecisionId, "customer decision"), "customer decision");
  const receipt = assertReplyIdentity(resolveExactLocalRecord(recordRoot, request.customerDecisionReceiptId, "customer decision receipt"), "customer decision receipt");
  if (product.type !== "Accept" || product.actor !== SETTLEMENT || product.object?.type !== "ProposedSoftwareDevelopmentProduct" || product.object?.contract !== "software-development-service" || product.object?.targetSettlement !== SETTLEMENT || product.object?.pendingCustomerDecision !== true || product.object?.customerMutation !== false || product.object?.foreignMutation !== false) {
    throw new ReceiverRefusal("invalid-proposed-product", product.id);
  }
  if (!SHA.test(request.proposedProductDigest ?? "") || request.proposedProductDigest !== digest(product)) throw new ReceiverRefusal("product-digest-mismatch", product.id);
  const artifacts = product.object.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0 || request.artifactSetDigest !== digest(artifactDescriptors(artifacts))) throw new ReceiverRefusal("artifact-set-digest-mismatch", product.id);
  if (!safeRelative(request.targetRoot) || !request.targetRoot.startsWith("services/") || request.targetRoot === SERVICE_ROOT || request.targetServiceIdentity !== `urn:ame:${basename(request.targetRoot)}` || request.targetContract !== basename(request.targetRoot)) throw new ReceiverRefusal("target-binding-mismatch", request.targetRoot ?? "absent");
  const seen = new Set();
  const verifiedArtifacts = artifacts.map((artifact) => {
    if (!safeRelative(artifact.targetPath) || !exactUnder(artifact.targetPath, request.targetRoot) || artifact.targetPath === request.targetRoot || seen.has(artifact.targetPath)) throw new ReceiverRefusal("artifact-path-refused", artifact.targetPath ?? "absent");
    seen.add(artifact.targetPath);
    if (typeof artifact.bytesBase64 !== "string" || !SHA.test(artifact.digest ?? "") || !Number.isInteger(artifact.byteLength) || artifact.byteLength < 0) throw new ReceiverRefusal("malformed-artifact", artifact.targetPath);
    const bytes = Buffer.from(artifact.bytesBase64, "base64");
    if (bytes.toString("base64") !== artifact.bytesBase64 || bytes.length !== artifact.byteLength || digest(artifact.bytesBase64) !== artifact.digest) throw new ReceiverRefusal("artifact-byte-digest-mismatch", artifact.targetPath);
    return { ...artifact, bytes };
  });
  if (decision.type !== "Accept" || decision.actor !== product.target || decision.target !== product.actor || decision.inReplyTo !== product.id || decision.object?.type !== "SoftwareDevelopmentCustomerDecision" || decision.object?.proposedProduct?.id !== product.id || decision.object?.proposedProductDigest !== request.proposedProductDigest || decision.object?.customerUsefulness !== true) throw new ReceiverRefusal("accepting-decision-chain-mismatch", decision.id);
  if (receipt.type !== "Accept" || receipt.actor !== product.actor || receipt.target !== decision.actor || receipt.inReplyTo !== decision.id || receipt.object?.type !== "CustomerDecisionReceipt" || receipt.object?.contract !== product.object.contract || receipt.object?.proposedProduct !== product.id || receipt.object?.decision !== "Accept" || receipt.object?.customer !== decision.actor || receipt.object?.providerDoesNotOverrideDecision !== true || digest(receipt.object?.checks ?? []) !== digest(decision.object?.checks ?? [])) throw new ReceiverRefusal("decision-receipt-chain-mismatch", receipt.id);
  return { product, decision, receipt, artifacts: verifiedArtifacts };
}

function ensureAuthorityAvailable(dataRoot, authorityDigest, requestDigest, operation, authorityNonce) {
  const committedType = operation === STAGE_OPERATION ? "StagingCapabilityConsumptionCommitted" : "AdmissionGrantConsumptionCommitted";
  const preparedType = operation === STAGE_OPERATION ? "StagingCapabilityConsumptionPrepared" : "AdmissionGrantConsumptionPrepared";
  const committed = recordsOfType(dataRoot, committedType).filter((record) => record.authorityDigest === authorityDigest || record.authorityNonce === authorityNonce);
  if (committed.length) throw new ReceiverRefusal("authority-already-consumed", authorityDigest);
  const prepared = recordsOfType(dataRoot, preparedType).filter((record) => record.authorityDigest === authorityDigest || record.authorityNonce === authorityNonce);
  if (prepared.some((record) => record.requestDigest !== requestDigest)) throw new ReceiverRefusal("authority-prepared-for-different-request", authorityDigest);
  return prepared[0] ?? null;
}

function makeConsumption(type, operation, authorityDigest, authorityNonce, requestDigest, preparedTransition, recordedAt, authority) {
  return contentRecord({ type, recordedAt, receiver: ACTOR, operation, authorityDigest, authorityNonce, requestDigest, preparedTransition,
    authorityType: authority.type, authorityIssuer: authority.issuedBy, authorityReceiver: authority.receiver,
    authorityScope: authority.scope, authorityIssuedAt: authority.issuedAt, authorityExpiresAt: authority.expiresAt,
    authorityOfferDigest: authority.offerDigest, authorityEffectsDigest: digest(authority.effects) });
}

function writeCandidate(candidate, targetRoot, artifacts) {
  mkdirSync(candidate, { recursive: false, mode: 0o700 });
  for (const artifact of artifacts) {
    const suffix = artifact.targetPath.slice(targetRoot.length + 1);
    if (!safeRelative(suffix)) throw new ReceiverRefusal("artifact-path-refused", artifact.targetPath);
    const target = resolve(candidate, suffix);
    if (!target.startsWith(`${resolve(candidate)}${sep}`)) throw new ReceiverRefusal("candidate-escape", artifact.targetPath);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, artifact.bytes, { flag: "wx", mode: 0o600 });
  }
}

function copyTree(source, target) {
  mkdirSync(target, { recursive: false, mode: 0o700 });
  function copy(from, to) {
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const sourcePath = join(from, entry.name);
      const targetPath = join(to, entry.name);
      if (entry.isSymbolicLink()) throw new ReceiverRefusal("symlink-tree-refused", sourcePath);
      if (entry.isDirectory()) { mkdirSync(targetPath, { mode: 0o700 }); copy(sourcePath, targetPath); }
      else if (entry.isFile()) copyFileSync(sourcePath, targetPath, 0);
      else throw new ReceiverRefusal("special-file-refused", sourcePath);
    }
  }
  copy(source, target);
}

function exactTransition(dataRoot, type, requestDigest) {
  const found = recordsOfType(dataRoot, type).filter((record) => record.requestDigest === requestDigest);
  if (found.length > 1) throw new ReceiverRefusal("duplicate-transition", `${type}:${requestDigest}`);
  return found[0] ?? null;
}

function stageReceiptFrom(prepared, committed, recordedAt, started) {
  return contentRecord({
    type: STAGING_RECEIPT,
    recordedAt,
    receiver: ACTOR,
    operation: STAGE_OPERATION,
    requestDigest: prepared.requestDigest,
    preparedTransition: prepared.id,
    committedTransition: committed.id,
    proposedProduct: prepared.proposedProduct,
    proposedProductDigest: prepared.proposedProductDigest,
    artifactSetDigest: prepared.artifactSetDigest,
    customerDecision: prepared.customerDecision,
    customerDecisionReceipt: prepared.customerDecisionReceipt,
    targetServiceIdentity: prepared.targetServiceIdentity,
    targetContract: prepared.targetContract,
    targetRoot: prepared.targetRoot,
    stagedTreeDigest: prepared.stagedTreeDigest,
    stagedTree: prepared.stagedTree,
    stagingDestination: prepared.stagingDestination,
    capabilityDigest: prepared.authorityDigest,
    consumedCapabilityDigest: prepared.authorityDigest,
    expiresAt: prepared.authorityExpiresAt,
    acceptanceChainDigest: prepared.acceptanceChainDigest,
    resourceReceipt: resourceReceipt(started),
  });
}

export async function stageAcceptedSoftwareDelivery(request, options = {}) {
  const started = process.hrtime.bigint();
  const now = options.now ?? new Date().toISOString();
  const authorityRoot = existingDirectory("SDSS authority root", options.authorityRoot ?? DEFAULT_AUTHORITY_ROOT);
  const recordRoot = existingDirectory("SDSS record root", options.recordRoot ?? DEFAULT_RECORD_ROOT);
  const dataRootArg = resolve(options.dataRoot ?? DEFAULT_DATA_ROOT);
  mkdirSync(dataRootArg, { recursive: true });
  const dataRoot = existingDirectory("receiver data root", dataRootArg);
  const meshCarrier = await adoptedMeshCarrier(options);
  const recordScope = assertSettlementLocal(meshCarrier, authorityRoot, recordRoot, "SDSS record root");
  const dataScope = assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root");
  const authority = validateOfferAndAuthority(STAGE_OPERATION, request, now);
  ensureAuthorityAvailable(dataRoot, authority.authorityDigest, authority.requestDigest, STAGE_OPERATION, authority.authority.nonce);
  const chain = validateAcceptanceChain(request, recordRoot);
  const targetSnapshot = pathSnapshot(authorityRoot, request.targetRoot, { finalMustBeAbsent: true });
  const key = authority.requestDigest.slice(7);
  const candidatesRoot = join(dataRoot, "private-candidates");
  const stagedRoot = join(dataRoot, "staged");
  mkdirSync(candidatesRoot, { recursive: true, mode: 0o700 });
  mkdirSync(stagedRoot, { recursive: true, mode: 0o700 });
  const candidate = join(candidatesRoot, key);
  const destination = join(stagedRoot, key);
  let prepared = exactTransition(dataRoot, "AcceptedSoftwareDeliveryStagePrepared", authority.requestDigest);
  if (!prepared) {
    if (existsSync(destination)) throw new ReceiverRefusal("staging-destination-collision", key);
    if (!existsSync(candidate)) {
      writeCandidate(candidate, request.targetRoot, chain.artifacts);
      crash(options, "stage-candidate-created");
    }
    const tree = treeEvidence(candidate);
    const expectedTree = chain.artifacts.map((artifact) => ({ path: artifact.targetPath.slice(request.targetRoot.length + 1), digest: rawDigest(artifact.bytes), byteLength: artifact.bytes.length })).sort((left, right) => left.path.localeCompare(right.path));
    if (tree.treeDigest !== digest(expectedTree)) throw new ReceiverRefusal("private-candidate-tree-mismatch", key);
    prepared = contentRecord({
      type: "AcceptedSoftwareDeliveryStagePrepared",
      recordedAt: now,
      receiver: ACTOR,
      operation: STAGE_OPERATION,
      requestDigest: authority.requestDigest,
      offer: authority.offer.id,
      authorityDigest: authority.authorityDigest,
      authorityNonce: authority.authority.nonce,
      authorityIssuer: authority.authority.issuedBy,
      authorityReceiver: authority.authority.receiver,
      authorityScope: authority.authority.scope,
      authorityIssuedAt: authority.authority.issuedAt,
      authorityExpiresAt: authority.authority.expiresAt,
      proposedProduct: chain.product.id,
      proposedProductDigest: request.proposedProductDigest,
      artifactSetDigest: request.artifactSetDigest,
      customerDecision: chain.decision.id,
      customerDecisionReceipt: chain.receipt.id,
      targetServiceIdentity: request.targetServiceIdentity,
      targetContract: request.targetContract,
      targetRoot: request.targetRoot,
      targetPathSnapshot: targetSnapshot,
      meshCarrierImport: meshCarrier.identity,
      meshScopeSnapshots: { recordRoot: recordScope.snapshot, dataRoot: dataScope.snapshot },
      acceptanceChainDigest: digest({ product: chain.product.id, productDigest: request.proposedProductDigest,
        decision: chain.decision.id, receipt: chain.receipt.id, artifactSetDigest: request.artifactSetDigest,
        receiver: ACTOR, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot }),
      candidate: relative(dataRoot, candidate).split(sep).join("/"),
      stagingDestination: relative(dataRoot, destination).split(sep).join("/"),
      stagedTreeDigest: tree.treeDigest,
      stagedTree: tree.files,
    });
    const consumption = makeConsumption("StagingCapabilityConsumptionPrepared", STAGE_OPERATION, authority.authorityDigest, authority.authority.nonce, authority.requestDigest, prepared.id, now, authority.authority);
    appendEvidence(dataRoot, "authority-consumptions", consumption);
    crash(options, "stage-capability-prepared");
    appendEvidence(dataRoot, "transitions", prepared);
    crash(options, "stage-transition-prepared");
  } else if (prepared.authorityDigest !== authority.authorityDigest || prepared.proposedProduct !== chain.product.id || prepared.targetRoot !== request.targetRoot) {
    throw new ReceiverRefusal("prepared-stage-binding-mismatch", prepared.id);
  }
  if (!existsSync(destination)) {
    if (!existsSync(candidate)) throw new ReceiverRefusal("prepared-stage-bytes-absent", prepared.id);
    const current = treeEvidence(candidate);
    if (current.treeDigest !== prepared.stagedTreeDigest || digest(current.files) !== digest(prepared.stagedTree)) throw new ReceiverRefusal("prepared-stage-tree-drift", prepared.id);
    if (digest(pathSnapshot(authorityRoot, request.targetRoot, { finalMustBeAbsent: true })) !== digest(prepared.targetPathSnapshot)) throw new ReceiverRefusal("target-path-snapshot-drift", request.targetRoot);
    const nextRecordScope = assertSettlementLocal(meshCarrier, authorityRoot, recordRoot, "SDSS record root");
    const nextDataScope = assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root");
    if (digest({ recordRoot: nextRecordScope.snapshot, dataRoot: nextDataScope.snapshot }) !== digest(prepared.meshScopeSnapshots)) throw new ReceiverRefusal("mesh-scope-snapshot-drift", request.targetRoot);
    ensureAuthorityAvailable(dataRoot, authority.authorityDigest, authority.requestDigest, STAGE_OPERATION, authority.authority.nonce);
    if (existsSync(destination)) throw new ReceiverRefusal("staging-destination-collision", key);
    renameSync(candidate, destination);
    crash(options, "stage-tree-published");
  }
  const published = treeEvidence(destination);
  if (published.treeDigest !== prepared.stagedTreeDigest || digest(published.files) !== digest(prepared.stagedTree)) throw new ReceiverRefusal("published-stage-tree-drift", prepared.id);
  let committed = exactTransition(dataRoot, "AcceptedSoftwareDeliveryStageCommitted", authority.requestDigest);
  if (!committed) {
    committed = contentRecord({ type: "AcceptedSoftwareDeliveryStageCommitted", recordedAt: now, receiver: ACTOR, operation: STAGE_OPERATION, requestDigest: authority.requestDigest, preparedTransition: prepared.id, authorityDigest: authority.authorityDigest, stagedTreeDigest: prepared.stagedTreeDigest, stagingDestination: prepared.stagingDestination, receiptType: STAGING_RECEIPT });
    appendEvidence(dataRoot, "transitions", committed);
    crash(options, "stage-transition-committed");
  }
  let receipt = recordsOfType(dataRoot, STAGING_RECEIPT).find((record) => record.requestDigest === authority.requestDigest);
  if (!receipt) {
    receipt = stageReceiptFrom(prepared, committed, now, started);
    appendEvidence(dataRoot, "receipts", receipt);
    crash(options, "stage-receipt-appended");
  }
  const consumed = makeConsumption("StagingCapabilityConsumptionCommitted", STAGE_OPERATION, authority.authorityDigest, authority.authority.nonce, authority.requestDigest, prepared.id, now, authority.authority);
  appendEvidence(dataRoot, "authority-consumptions", consumed);
  crash(options, "stage-capability-committed");
  return receipt;
}

function validateStagingReceipt(request, dataRoot) {
  const receipt = assertContentRecord(resolveExactLocalRecord(dataRoot, request.stagingReceiptId, "staging receipt"), "staging receipt");
  if (receipt.type !== STAGING_RECEIPT || receipt.receiver !== ACTOR || receipt.operation !== STAGE_OPERATION || receipt.stagedTreeDigest !== request.stagedTreeDigest || receipt.targetServiceIdentity !== request.targetServiceIdentity || receipt.targetContract !== request.targetContract || receipt.targetRoot !== request.targetRoot || receipt.consumedCapabilityDigest === digest(request.admissionGrant)) throw new ReceiverRefusal("staging-receipt-binding-mismatch", receipt.id);
  const prepared = assertContentRecord(resolveExactLocalRecord(dataRoot, receipt.preparedTransition, "stage prepared transition"), "stage prepared transition");
  const committed = assertContentRecord(resolveExactLocalRecord(dataRoot, receipt.committedTransition, "stage committed transition"), "stage committed transition");
  if (prepared.type !== "AcceptedSoftwareDeliveryStagePrepared" || committed.type !== "AcceptedSoftwareDeliveryStageCommitted" || committed.preparedTransition !== prepared.id || committed.requestDigest !== receipt.requestDigest || committed.stagedTreeDigest !== receipt.stagedTreeDigest || prepared.stagedTreeDigest !== receipt.stagedTreeDigest || prepared.stagingDestination !== receipt.stagingDestination) throw new ReceiverRefusal("staging-transition-chain-mismatch", receipt.id);
  const source = resolve(dataRoot, receipt.stagingDestination);
  if (!source.startsWith(`${resolve(dataRoot)}${sep}`) || !existsSync(source)) throw new ReceiverRefusal("staged-tree-absent", receipt.id);
  const tree = treeEvidence(source);
  if (tree.treeDigest !== receipt.stagedTreeDigest || digest(tree.files) !== digest(receipt.stagedTree)) throw new ReceiverRefusal("staged-tree-drift", receipt.id);
  return { receipt, prepared, committed, source, tree };
}

function admissionReceiptFrom(prepared, committed, recordedAt, started) {
  return contentRecord({
    type: ADMISSION_RECEIPT,
    recordedAt,
    receiver: ACTOR,
    operation: ADMIT_OPERATION,
    requestDigest: prepared.requestDigest,
    preparedTransition: prepared.id,
    committedTransition: committed.id,
    stagingReceipt: prepared.stagingReceipt,
    stagedTreeDigest: prepared.stagedTreeDigest,
    targetServiceIdentity: prepared.targetServiceIdentity,
    targetContract: prepared.targetContract,
    targetRoot: prepared.targetRoot,
    admittedTreeDigest: prepared.stagedTreeDigest,
    grantDigest: prepared.authorityDigest,
    consumedGrantDigest: prepared.authorityDigest,
    meshAdmissionRequestSha256: prepared.meshAdmissionRequestSha256,
    meshAdmissionSnapshotDigest: digest(prepared.meshAdmissionSnapshot),
    overwrite: false,
    resourceReceipt: resourceReceipt(started),
  });
}

export async function reviewAndAdmitStagedSoftwareDelivery(request, options = {}) {
  const started = process.hrtime.bigint();
  const now = options.now ?? new Date().toISOString();
  const authorityRoot = existingDirectory("SDSS authority root", options.authorityRoot ?? DEFAULT_AUTHORITY_ROOT);
  const dataRoot = existingDirectory("receiver data root", options.dataRoot ?? DEFAULT_DATA_ROOT);
  const servicesParent = existingDirectory("SDSS services parent", join(authorityRoot, "services"));
  const meshCarrier = await adoptedMeshCarrier(options);
  const dataScope = assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root");
  const servicesScope = assertSettlementLocal(meshCarrier, authorityRoot, servicesParent, "SDSS services parent");
  const authority = validateOfferAndAuthority(ADMIT_OPERATION, request, now);
  ensureAuthorityAvailable(dataRoot, authority.authorityDigest, authority.requestDigest, ADMIT_OPERATION, authority.authority.nonce);
  const stage = validateStagingReceipt(request, dataRoot);
  const finalTarget = resolve(authorityRoot, request.targetRoot);
  const key = authority.requestDigest.slice(7);
  const candidate = join(servicesParent, `.accepted-delivery-receiver-candidate-${key}`);
  let prepared = exactTransition(dataRoot, "SoftwareDeliveryAdmissionPrepared", authority.requestDigest);
  const targetSnapshot = prepared?.targetPathSnapshot ?? pathSnapshot(authorityRoot, request.targetRoot, { finalMustBeAbsent: true });
  if (!prepared) {
    if (existsSync(finalTarget)) throw new ReceiverRefusal("admission-destination-collision", request.targetRoot);
    if (!existsSync(candidate)) {
      copyTree(stage.source, candidate);
      crash(options, "admission-candidate-created");
    }
    const candidateTree = treeEvidence(candidate);
    if (candidateTree.treeDigest !== stage.receipt.stagedTreeDigest) throw new ReceiverRefusal("admission-candidate-tree-drift", request.stagingReceiptId);
    let meshAdmission;
    try {
      meshCarrier.inspectMeshScope({ authorityRoot, subject: stage.source });
      meshAdmission = meshCarrier.admitEnterpriseInstall({ authorityRoot, sourceEnterprise: stage.source, targetNode: servicesParent, installer: "codex", operation: "install", mode: "apply" });
    } catch (error) {
      throw new ReceiverRefusal("mesh-scope-refusal", error.message, error.facts ?? {});
    }
    prepared = contentRecord({
      type: "SoftwareDeliveryAdmissionPrepared",
      recordedAt: now,
      receiver: ACTOR,
      operation: ADMIT_OPERATION,
      requestDigest: authority.requestDigest,
      offer: authority.offer.id,
      authorityDigest: authority.authorityDigest,
      authorityNonce: authority.authority.nonce,
      authorityIssuer: authority.authority.issuedBy,
      authorityReceiver: authority.authority.receiver,
      authorityScope: authority.authority.scope,
      authorityIssuedAt: authority.authority.issuedAt,
      authorityExpiresAt: authority.authority.expiresAt,
      stagingReceipt: stage.receipt.id,
      stagedTreeDigest: stage.receipt.stagedTreeDigest,
      targetServiceIdentity: request.targetServiceIdentity,
      targetContract: request.targetContract,
      targetRoot: request.targetRoot,
      targetPathSnapshot: targetSnapshot,
      candidate: basename(candidate),
      meshCarrierImport: meshCarrier.identity,
      meshScopeSnapshots: { dataRoot: dataScope.snapshot, servicesParent: servicesScope.snapshot },
      meshAdmissionRequest: meshAdmission.request,
      meshAdmissionRequestSha256: `sha256:${meshAdmission.requestSha256}`,
      meshAdmissionSnapshot: meshAdmission.snapshot,
    });
    const consumption = makeConsumption("AdmissionGrantConsumptionPrepared", ADMIT_OPERATION, authority.authorityDigest, authority.authority.nonce, authority.requestDigest, prepared.id, now, authority.authority);
    appendEvidence(dataRoot, "authority-consumptions", consumption);
    crash(options, "admission-grant-prepared");
    appendEvidence(dataRoot, "transitions", prepared);
    crash(options, "admission-transition-prepared");
  } else if (prepared.authorityDigest !== authority.authorityDigest || prepared.stagingReceipt !== stage.receipt.id || prepared.targetRoot !== request.targetRoot) {
    throw new ReceiverRefusal("prepared-admission-binding-mismatch", prepared.id);
  }
  if (!existsSync(finalTarget)) {
    if (!existsSync(candidate)) throw new ReceiverRefusal("prepared-admission-candidate-absent", prepared.id);
    const candidateTree = treeEvidence(candidate);
    if (candidateTree.treeDigest !== prepared.stagedTreeDigest) throw new ReceiverRefusal("prepared-admission-tree-drift", prepared.id);
    if (digest(pathSnapshot(authorityRoot, request.targetRoot, { finalMustBeAbsent: true })) !== digest(prepared.targetPathSnapshot)) throw new ReceiverRefusal("target-path-snapshot-drift", request.targetRoot);
    ensureAuthorityAvailable(dataRoot, authority.authorityDigest, authority.requestDigest, ADMIT_OPERATION, authority.authority.nonce);
    let meshAdmission;
    try {
      meshAdmission = meshCarrier.admitEnterpriseInstall(prepared.meshAdmissionRequest);
      if (`sha256:${meshAdmission.requestSha256}` !== prepared.meshAdmissionRequestSha256 || digest(meshAdmission.snapshot) !== digest(prepared.meshAdmissionSnapshot)) throw new Error("mesh request or snapshot changed");
      const nextDataScope = assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root");
      const nextServicesScope = assertSettlementLocal(meshCarrier, authorityRoot, servicesParent, "SDSS services parent");
      if (digest({ dataRoot: nextDataScope.snapshot, servicesParent: nextServicesScope.snapshot }) !== digest(prepared.meshScopeSnapshots)) throw new Error("mesh scope snapshot changed");
      meshCarrier.revalidateEnterpriseInstall(meshAdmission);
    } catch (error) {
      throw new ReceiverRefusal("mesh-scope-refusal", error.message, error.facts ?? {});
    }
    if (existsSync(finalTarget)) throw new ReceiverRefusal("create-only-destination-exists", request.targetRoot);
    renameSync(candidate, finalTarget);
    crash(options, "admission-target-published");
  }
  const finalTree = treeEvidence(finalTarget);
  if (finalTree.treeDigest !== prepared.stagedTreeDigest) throw new ReceiverRefusal("admitted-tree-drift", prepared.id);
  let committed = exactTransition(dataRoot, "SoftwareDeliveryAdmissionCommitted", authority.requestDigest);
  if (!committed) {
    committed = contentRecord({ type: "SoftwareDeliveryAdmissionCommitted", recordedAt: now, receiver: ACTOR, operation: ADMIT_OPERATION, requestDigest: authority.requestDigest, preparedTransition: prepared.id, authorityDigest: authority.authorityDigest, stagingReceipt: prepared.stagingReceipt, stagedTreeDigest: prepared.stagedTreeDigest, targetRoot: prepared.targetRoot, meshAdmissionRequestSha256: prepared.meshAdmissionRequestSha256, receiptType: ADMISSION_RECEIPT });
    appendEvidence(dataRoot, "transitions", committed);
    crash(options, "admission-transition-committed");
  }
  let receipt = recordsOfType(dataRoot, ADMISSION_RECEIPT).find((record) => record.requestDigest === authority.requestDigest);
  if (!receipt) {
    receipt = admissionReceiptFrom(prepared, committed, now, started);
    appendEvidence(dataRoot, "receipts", receipt);
    crash(options, "admission-receipt-appended");
  }
  const consumed = makeConsumption("AdmissionGrantConsumptionCommitted", ADMIT_OPERATION, authority.authorityDigest, authority.authority.nonce, authority.requestDigest, prepared.id, now, authority.authority);
  appendEvidence(dataRoot, "authority-consumptions", consumed);
  crash(options, "admission-grant-committed");
  return receipt;
}

/* Correction is deliberately not an admission variant: its authority, evidence,
 * target snapshot, and publication protocol are all replacement-specific. */
function correctionStageCore(request) {
  return { type: request?.type, proposedProductId: request?.proposedProductId, proposedProductDigest: request?.proposedProductDigest,
    artifactSetDigest: request?.artifactSetDigest, intendedPlateDigest: request?.intendedPlateDigest, priorPlateDigest: request?.priorPlateDigest,
    customerDecisionId: request?.customerDecisionId, customerDecisionReceiptId: request?.customerDecisionReceiptId,
    receiverIdentity: request?.receiverIdentity, targetServiceIdentity: request?.targetServiceIdentity, targetContract: request?.targetContract, targetRoot: request?.targetRoot };
}

function correctionAdmitCore(request) {
  return { type: request?.type, correctionStagingReceiptId: request?.correctionStagingReceiptId, replacementPlateDigest: request?.replacementPlateDigest,
    priorPlateDigest: request?.priorPlateDigest, receiverIdentity: request?.receiverIdentity, targetServiceIdentity: request?.targetServiceIdentity,
    targetContract: request?.targetContract, targetRoot: request?.targetRoot };
}

function correctionEffects(operation) {
  return operation === CORRECTION_STAGE_OPERATION ? CORRECTION_STAGE_EFFECTS : CORRECTION_ADMIT_EFFECTS;
}

export function solicitCorrectionOperation(operation, requestCore, customer, recordedAt = new Date().toISOString()) {
  if (![CORRECTION_STAGE_OPERATION, CORRECTION_ADMIT_OPERATION].includes(operation) || typeof customer !== "string" || !customer.startsWith("urn:")) throw new ReceiverRefusal("invalid-solicitation", "correction operation and customer must be exact");
  const expected = operation === CORRECTION_STAGE_OPERATION ? "StageAcceptedSoftwareDeliveryCorrectionRequest" : "ReviewAndAdmitStagedSoftwareDeliveryCorrectionRequest";
  if (requestCore?.type !== expected) throw new ReceiverRefusal("invalid-solicitation", `expected ${expected}`);
  return contentRecord({ type: "AcceptedSoftwareDeliveryReceiverCorrectionOperationOffer", recordedAt, actor: ACTOR, target: customer, operation,
    requestDigest: digest(requestCore), effects: [...correctionEffects(operation)], separatelyInvoked: true, replacement: true });
}

function validateCorrectionAuthority(operation, request, now, dataRoot) {
  const core = operation === CORRECTION_STAGE_OPERATION ? correctionStageCore(request) : correctionAdmitCore(request);
  const expected = operation === CORRECTION_STAGE_OPERATION ? "StageAcceptedSoftwareDeliveryCorrectionRequest" : "ReviewAndAdmitStagedSoftwareDeliveryCorrectionRequest";
  const authorityField = operation === CORRECTION_STAGE_OPERATION ? "correctionStagingCapability" : "correctionAdmissionGrant";
  const authorityType = operation === CORRECTION_STAGE_OPERATION ? "AcceptedSoftwareDeliveryCorrectionStagingCapability" : "SoftwareDeliveryCorrectionAdmissionGrant";
  if (request?.type !== expected || request.receiverIdentity !== ACTOR) throw new ReceiverRefusal("invalid-operation-request", `expected ${expected}`);
  const offer = assertContentRecord(request.operationOffer, "correction operation offer");
  const authority = assertContentRecord(request?.[authorityField], authorityField);
  const scope = operation === CORRECTION_STAGE_OPERATION
    ? { targetSettlement: SETTLEMENT, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot, priorPlateDigest: request.priorPlateDigest, intendedPlateDigest: request.intendedPlateDigest }
    : { correctionStagingReceiptId: request.correctionStagingReceiptId, targetSettlement: SETTLEMENT, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot, priorPlateDigest: request.priorPlateDigest, replacementPlateDigest: request.replacementPlateDigest };
  const effects = correctionEffects(operation);
  if (offer.type !== "AcceptedSoftwareDeliveryReceiverCorrectionOperationOffer" || offer.actor !== ACTOR || offer.operation !== operation || offer.requestDigest !== digest(core) || digest(offer.effects) !== digest(effects) || offer.replacement !== true) throw new ReceiverRefusal("operation-offer-mismatch", operation);
  if (authority.type !== authorityType || authority.issuedBy !== HUMAN_LEADER || authority.receiver !== ACTOR || authority.operation !== operation || authority.requestDigest !== digest(core) || authority.offerDigest !== digest(offer) || authority.singleUse !== true || typeof authority.nonce !== "string" || authority.nonce.length < 8 || digest(authority.scope) !== digest(scope) || digest(authority.effects) !== digest(effects)) throw new ReceiverRefusal("authority-mismatch", operation);
  const issued = Date.parse(authority.issuedAt); const expiry = Date.parse(authority.expiresAt); const at = Date.parse(now);
  if (![issued, expiry, at].every(Number.isFinite) || issued > at || expiry < at) throw new ReceiverRefusal("authority-expired-or-invalid", operation);
  const consumed = recordsOfType(dataRoot, "CorrectionAuthorityConsumptionCommitted").filter((record) => record.authorityDigest === digest(authority) || record.authorityNonce === authority.nonce);
  if (consumed.length) throw new ReceiverRefusal("authority-already-consumed", digest(authority));
  const prepared = recordsOfType(dataRoot, "CorrectionAuthorityConsumptionPrepared").filter((record) => record.authorityDigest === digest(authority) || record.authorityNonce === authority.nonce);
  if (prepared.some((record) => record.requestDigest !== digest(core) || record.operation !== operation)) {
    throw new ReceiverRefusal("authority-prepared-for-different-request", digest(authority));
  }
  return { core, requestDigest: digest(core), offer, authority, authorityDigest: digest(authority), scope, effects };
}

function expectedArtifactPlate(artifacts, targetRoot) {
  return artifacts.map((artifact) => ({ path: artifact.targetPath.slice(targetRoot.length + 1), digest: rawDigest(artifact.bytes), byteLength: artifact.bytes.length })).sort((a, b) => a.path.localeCompare(b.path));
}

/* A correction replaces the source plate, not the settlement's runtime roots.
 * Evidence is deliberately per top-level entry so recovery can identify bytes
 * at every location without relying on a filename. */
function plateEntryEvidence(root, name) {
  const path = join(root, name); const entry = lstatSync(path);
  if (entry.isSymbolicLink()) throw new ReceiverRefusal("symlink-plate-refused", name);
  if (entry.isFile()) {
    const bytes = readFileSync(path);
    return { name, type: "file", digest: rawDigest(bytes), byteLength: bytes.length };
  }
  if (entry.isDirectory()) {
    const tree = treeEvidence(path);
    return { name, type: "directory", digest: tree.treeDigest, files: tree.files };
  }
  throw new ReceiverRefusal("special-file-refused", name);
}

export function plateEvidence(rootArg) {
  const root = existingDirectory("plate", rootArg);
  const entries = readdirSync(root, { withFileTypes: true }).map((entry) => entry.name).sort((a, b) => a.localeCompare(b))
    .filter((name) => !PRESERVED_RUNTIME_ROOTS.includes(name)).map((name) => plateEntryEvidence(root, name));
  return { entries, plateDigest: digest(entries) };
}

function preservedRootSnapshots(target) {
  return PRESERVED_RUNTIME_ROOTS.map((name) => {
    const path = join(target, name);
    if (!existsSync(path)) return { name, exists: false };
    const entry = lstatSync(path);
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw new ReceiverRefusal("preserved-runtime-root-invalid", name);
    return { name, exists: true, dev: entry.dev, ino: entry.ino, mode: entry.mode, type: "directory" };
  });
}

function sameEvidence(path, expected) {
  try { return digest(plateEntryEvidence(dirname(path), basename(path))) === digest(expected); }
  catch { return false; }
}

function assertPreservedRoots(target, snapshots) {
  if (digest(preservedRootSnapshots(target)) !== digest(snapshots)) throw new ReceiverRefusal("preserved-runtime-root-drift", target);
}

function correctionReceipt(stagePrepared, committed, now, started) {
  return contentRecord({ type: CORRECTION_STAGING_RECEIPT, recordedAt: now, receiver: ACTOR, operation: CORRECTION_STAGE_OPERATION,
    requestDigest: stagePrepared.requestDigest, preparedTransition: stagePrepared.id, committedTransition: committed.id,
    proposedProduct: stagePrepared.proposedProduct, customerDecision: stagePrepared.customerDecision, customerDecisionReceipt: stagePrepared.customerDecisionReceipt,
    targetServiceIdentity: stagePrepared.targetServiceIdentity, targetContract: stagePrepared.targetContract, targetRoot: stagePrepared.targetRoot,
    priorPlateDigest: stagePrepared.priorPlateDigest, priorPlate: stagePrepared.priorPlate, replacementPlateDigest: stagePrepared.replacementPlateDigest,
    replacementPlate: stagePrepared.replacementPlate, preservedRuntimeRoots: stagePrepared.preservedRuntimeRoots, stagingDestination: stagePrepared.stagingDestination, replacement: true, resourceReceipt: resourceReceipt(started, { providerLocalMutation: true }) });
}

export async function stageAcceptedSoftwareDeliveryCorrection(request, options = {}) {
  const started = process.hrtime.bigint(); const now = options.now ?? new Date().toISOString();
  const authorityRoot = existingDirectory("SDSS authority root", options.authorityRoot ?? DEFAULT_AUTHORITY_ROOT);
  const recordRoot = existingDirectory("SDSS record root", options.recordRoot ?? DEFAULT_RECORD_ROOT);
  const dataRootArg = resolve(options.dataRoot ?? DEFAULT_DATA_ROOT); mkdirSync(dataRootArg, { recursive: true }); const dataRoot = existingDirectory("receiver data root", dataRootArg);
  const meshCarrier = await adoptedMeshCarrier(options); const authority = validateCorrectionAuthority(CORRECTION_STAGE_OPERATION, request, now, dataRoot);
  return withAuthorityExecution(dataRoot, authority, async () => {
  const recordScope = assertSettlementLocal(meshCarrier, authorityRoot, recordRoot, "SDSS record root"); const dataScope = assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root");
  const chain = validateAcceptanceChain(request, recordRoot); const target = existingDirectory("correction target", resolve(authorityRoot, request.targetRoot));
  const targetScope = assertSettlementLocal(meshCarrier, authorityRoot, target, "existing correction target"); const prior = plateEvidence(target); const intended = expectedArtifactPlate(chain.artifacts, request.targetRoot);
  if (chain.product.object?.completeTargetPlate !== true
    || chain.product.object?.completeTargetPlateDigest !== request.intendedPlateDigest
    || request.priorPlateDigest !== prior.plateDigest
    || intended.some((entry) => PRESERVED_RUNTIME_ROOTS.includes(entry.path.split("/")[0]))) {
    throw new ReceiverRefusal("correction-target-or-artifact-set-mismatch", request.targetRoot);
  }
  const key = authority.requestDigest.slice(7); const candidates = join(dataRoot, "private-correction-candidates"); const staged = join(dataRoot, "staged-corrections"); mkdirSync(candidates, { recursive: true, mode: 0o700 }); mkdirSync(staged, { recursive: true, mode: 0o700 });
  const candidate = join(candidates, key); const destination = join(staged, key); let prepared = exactTransition(dataRoot, "AcceptedSoftwareDeliveryCorrectionStagePrepared", authority.requestDigest);
  if (!prepared) {
    if (!existsSync(candidate)) { writeCandidate(candidate, request.targetRoot, chain.artifacts); crash(options, "correction-stage-candidate-created"); }
    const replacement = plateEvidence(candidate); if (!replacement.entries.length || replacement.plateDigest !== request.intendedPlateDigest) throw new ReceiverRefusal("private-correction-candidate-plate-mismatch", key);
    prepared = contentRecord({ type: "AcceptedSoftwareDeliveryCorrectionStagePrepared", recordedAt: now, receiver: ACTOR, operation: CORRECTION_STAGE_OPERATION, requestDigest: authority.requestDigest, offer: authority.offer.id, authorityDigest: authority.authorityDigest, authorityNonce: authority.authority.nonce, authorityExpiresAt: authority.authority.expiresAt, proposedProduct: chain.product.id, customerDecision: chain.decision.id, customerDecisionReceipt: chain.receipt.id, targetServiceIdentity: request.targetServiceIdentity, targetContract: request.targetContract, targetRoot: request.targetRoot, targetPathSnapshot: pathSnapshot(authorityRoot, request.targetRoot), preservedRuntimeRoots: preservedRootSnapshots(target), priorPlateDigest: prior.plateDigest, priorPlate: prior.entries, replacementPlateDigest: replacement.plateDigest, replacementPlate: replacement.entries, stagingDestination: relative(dataRoot, destination).split(sep).join("/"), meshScopeSnapshots: { recordRoot: recordScope.snapshot, dataRoot: dataScope.snapshot, target: targetScope.snapshot } });
    appendEvidence(dataRoot, "authority-consumptions", contentRecord({
      type: "CorrectionAuthorityConsumptionPrepared",
      recordedAt: now,
      operation: CORRECTION_STAGE_OPERATION,
      authorityDigest: authority.authorityDigest,
      authorityNonce: authority.authority.nonce,
      requestDigest: authority.requestDigest,
      preparedTransition: prepared.id,
    }));
    appendEvidence(dataRoot, "transitions", prepared); crash(options, "correction-stage-prepared");
  }
  if (!existsSync(destination)) {
    if (!existsSync(candidate) || plateEvidence(candidate).plateDigest !== prepared.replacementPlateDigest) throw new ReceiverRefusal("prepared-correction-candidate-drift", prepared.id);
    const currentTarget = existingDirectory("correction target", resolve(authorityRoot, request.targetRoot));
    const currentScopes = {
      recordRoot: assertSettlementLocal(meshCarrier, authorityRoot, recordRoot, "SDSS record root").snapshot,
      dataRoot: assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root").snapshot,
      target: assertSettlementLocal(meshCarrier, authorityRoot, currentTarget, "existing correction target").snapshot,
    };
    if (plateEvidence(currentTarget).plateDigest !== prepared.priorPlateDigest
      || digest(pathSnapshot(authorityRoot, request.targetRoot)) !== digest(prepared.targetPathSnapshot)
      || digest(preservedRootSnapshots(currentTarget)) !== digest(prepared.preservedRuntimeRoots)
      || digest(currentScopes) !== digest(prepared.meshScopeSnapshots)) {
      throw new ReceiverRefusal("correction-target-drift", request.targetRoot);
    }
    renameSync(candidate, destination);
    crash(options, "correction-stage-published");
  }
  if (plateEvidence(destination).plateDigest !== prepared.replacementPlateDigest) throw new ReceiverRefusal("staged-correction-plate-drift", prepared.id);
  let committed = exactTransition(dataRoot, "AcceptedSoftwareDeliveryCorrectionStageCommitted", authority.requestDigest); if (!committed) { committed = contentRecord({ type: "AcceptedSoftwareDeliveryCorrectionStageCommitted", recordedAt: now, receiver: ACTOR, operation: CORRECTION_STAGE_OPERATION, requestDigest: authority.requestDigest, preparedTransition: prepared.id, replacementPlateDigest: prepared.replacementPlateDigest }); appendEvidence(dataRoot, "transitions", committed); }
  let receipt = recordsOfType(dataRoot, CORRECTION_STAGING_RECEIPT).find((record) => record.requestDigest === authority.requestDigest); if (!receipt) { receipt = correctionReceipt(prepared, committed, now, started); appendEvidence(dataRoot, "receipts", receipt); }
  appendEvidence(dataRoot, "authority-consumptions", contentRecord({ type: "CorrectionAuthorityConsumptionCommitted", recordedAt: now, operation: CORRECTION_STAGE_OPERATION, authorityDigest: authority.authorityDigest, authorityNonce: authority.authority.nonce, requestDigest: authority.requestDigest }));
  return receipt;
  });
}

export async function reviewAndAdmitStagedSoftwareDeliveryCorrection(request, options = {}) {
  const started = process.hrtime.bigint();
  const now = options.now ?? new Date().toISOString();
  const authorityRoot = existingDirectory("SDSS authority root", options.authorityRoot ?? DEFAULT_AUTHORITY_ROOT);
  const dataRoot = existingDirectory("receiver data root", options.dataRoot ?? DEFAULT_DATA_ROOT);
  const servicesParent = existingDirectory("SDSS services parent", join(authorityRoot, "services"));
  const meshCarrier = await adoptedMeshCarrier(options);
  const authority = validateCorrectionAuthority(CORRECTION_ADMIT_OPERATION, request, now, dataRoot);
  return withAuthorityExecution(dataRoot, authority, async () => {
  const receipt = assertContentRecord(resolveExactLocalRecord(dataRoot, request.correctionStagingReceiptId, "correction staging receipt"), "correction staging receipt");
  if (receipt.type !== CORRECTION_STAGING_RECEIPT
    || receipt.replacementPlateDigest !== request.replacementPlateDigest
    || receipt.priorPlateDigest !== request.priorPlateDigest
    || receipt.targetServiceIdentity !== request.targetServiceIdentity
    || receipt.targetContract !== request.targetContract
    || receipt.targetRoot !== request.targetRoot
    || receipt.replacement !== true) {
    throw new ReceiverRefusal("correction-staging-receipt-binding-mismatch", request.correctionStagingReceiptId);
  }
  const source = resolve(dataRoot, receipt.stagingDestination);
  if (!source.startsWith(`${resolve(dataRoot)}${sep}`) || plateEvidence(source).plateDigest !== receipt.replacementPlateDigest) {
    throw new ReceiverRefusal("staged-correction-plate-drift", receipt.id);
  }

  const key = authority.requestDigest.slice(7);
  const target = resolve(authorityRoot, request.targetRoot);
  const candidate = join(servicesParent, `.accepted-delivery-receiver-correction-${key}`);
  const prior = join(servicesParent, `.accepted-delivery-receiver-displaced-${key}`);
  let prepared = exactTransition(dataRoot, "SoftwareDeliveryCorrectionAdmissionPrepared", authority.requestDigest);
  if (!prepared) {
    if (!existsSync(candidate)) copyTree(source, candidate);
    if (plateEvidence(candidate).plateDigest !== receipt.replacementPlateDigest) throw new ReceiverRefusal("correction-candidate-plate-drift", receipt.id);
    const scopedTarget = existingDirectory("correction target", target);
    const current = plateEvidence(scopedTarget);
    if (current.plateDigest !== receipt.priorPlateDigest || !current.entries.length) throw new ReceiverRefusal("correction-target-drift", request.targetRoot);
    assertPreservedRoots(scopedTarget, receipt.preservedRuntimeRoots);
    const meshScopes = {
      dataRoot: assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root").snapshot,
      servicesParent: assertSettlementLocal(meshCarrier, authorityRoot, servicesParent, "SDSS services parent").snapshot,
      source: assertSettlementLocal(meshCarrier, authorityRoot, source, "staged correction source").snapshot,
      target: assertSettlementLocal(meshCarrier, authorityRoot, scopedTarget, "existing correction target").snapshot,
    };
    let meshAdmission;
    try {
      meshAdmission = meshCarrier.admitEnterpriseInstall({
        authorityRoot,
        sourceEnterprise: source,
        targetNode: servicesParent,
        installer: "codex",
        operation: "reinstall",
        mode: "apply",
      });
    } catch (error) {
      throw new ReceiverRefusal("mesh-scope-refusal", error.message, error.facts ?? {});
    }
    prepared = contentRecord({
      type: "SoftwareDeliveryCorrectionAdmissionPrepared",
      recordedAt: now,
      receiver: ACTOR,
      operation: CORRECTION_ADMIT_OPERATION,
      requestDigest: authority.requestDigest,
      authorityDigest: authority.authorityDigest,
      authorityNonce: authority.authority.nonce,
      correctionStagingReceipt: receipt.id,
      targetRoot: request.targetRoot,
      targetServiceIdentity: request.targetServiceIdentity,
      targetContract: request.targetContract,
      priorPlateDigest: receipt.priorPlateDigest,
      priorPlate: receipt.priorPlate,
      replacementPlateDigest: receipt.replacementPlateDigest,
      replacementPlate: receipt.replacementPlate,
      preservedRuntimeRoots: receipt.preservedRuntimeRoots,
      targetPathSnapshot: pathSnapshot(authorityRoot, request.targetRoot),
      candidate: basename(candidate),
      displacedLocation: basename(prior),
      meshScopeSnapshots: meshScopes,
      meshAdmissionRequest: meshAdmission.request,
      meshAdmissionRequestSha256: `sha256:${meshAdmission.requestSha256}`,
      meshAdmissionSnapshot: meshAdmission.snapshot,
    });
    appendEvidence(dataRoot, "authority-consumptions", contentRecord({
      type: "CorrectionAuthorityConsumptionPrepared",
      recordedAt: now,
      operation: CORRECTION_ADMIT_OPERATION,
      authorityDigest: authority.authorityDigest,
      authorityNonce: authority.authority.nonce,
      requestDigest: authority.requestDigest,
      preparedTransition: prepared.id,
    }));
    appendEvidence(dataRoot, "transitions", prepared);
    crash(options, "correction-admission-prepared");
  } else if (prepared.authorityDigest !== authority.authorityDigest
    || prepared.correctionStagingReceipt !== receipt.id
    || prepared.targetRoot !== request.targetRoot) {
    throw new ReceiverRefusal("prepared-correction-admission-binding-mismatch", prepared.id);
  }

  const revalidateMesh = () => {
    let admission;
    try {
      admission = meshCarrier.admitEnterpriseInstall(prepared.meshAdmissionRequest);
      if (`sha256:${admission.requestSha256}` !== prepared.meshAdmissionRequestSha256
        || digest(admission.snapshot) !== digest(prepared.meshAdmissionSnapshot)) {
        throw new Error("mesh admission drift");
      }
      const currentScopes = {
        dataRoot: assertSettlementLocal(meshCarrier, authorityRoot, dataRoot, "receiver data root").snapshot,
        servicesParent: assertSettlementLocal(meshCarrier, authorityRoot, servicesParent, "SDSS services parent").snapshot,
        source: assertSettlementLocal(meshCarrier, authorityRoot, source, "staged correction source").snapshot,
        target: assertSettlementLocal(meshCarrier, authorityRoot, existingDirectory("correction target", target), "existing correction target").snapshot,
      };
      if (digest(currentScopes) !== digest(prepared.meshScopeSnapshots)) throw new Error("mesh scope drift");
      meshCarrier.revalidateEnterpriseInstall(admission);
    } catch (error) {
      throw new ReceiverRefusal("mesh-scope-refusal", error.message, error.facts ?? {});
    }
  };

  const oldEntries = prepared.priorPlate;
  const newEntries = prepared.replacementPlate;
  const recoveryCommitted = exactTransition(dataRoot, "SoftwareDeliveryCorrectionAdmissionCommitted", authority.requestDigest);
  if (!existsSync(prior)) mkdirSync(prior, { mode: 0o700 });
  if (!existsSync(candidate)) mkdirSync(candidate, { mode: 0o700 });
  assertPreservedRoots(existingDirectory("correction target", target), prepared.preservedRuntimeRoots);
  revalidateMesh();
  appendEvidence(dataRoot, "transitions", contentRecord({ type: "SoftwareDeliveryCorrectionPlatePublishPrepared", recordedAt: now, requestDigest: authority.requestDigest, targetRoot: request.targetRoot, oldPlate: oldEntries, newPlate: newEntries, preservedRuntimeRoots: prepared.preservedRuntimeRoots, candidate: basename(candidate), displacedLocation: basename(prior) }));
  if (!recoveryCommitted) for (const [index, oldEntry] of oldEntries.entries()) {
    const from = join(target, oldEntry.name); const displaced = join(prior, oldEntry.name);
    if (existsSync(displaced)) { if (!sameEvidence(displaced, oldEntry)) throw new ReceiverRefusal("correction-recovery-state-ambiguous", oldEntry.name); }
    else if (existsSync(from) && sameEvidence(from, oldEntry)) { renameSync(from, displaced); crash(options, `correction-old-plate-displaced-${index}`); }
    else throw new ReceiverRefusal("correction-recovery-state-ambiguous", oldEntry.name);
  }
  if (!recoveryCommitted) for (const [index, newEntry] of newEntries.entries()) {
    const from = join(candidate, newEntry.name); const published = join(target, newEntry.name);
    if (existsSync(published)) { if (!sameEvidence(published, newEntry)) throw new ReceiverRefusal("correction-recovery-state-ambiguous", newEntry.name); }
    else if (existsSync(from) && sameEvidence(from, newEntry)) { renameSync(from, published); crash(options, `correction-new-plate-published-${index}`); }
    else throw new ReceiverRefusal("correction-recovery-state-ambiguous", newEntry.name);
  }
  if (plateEvidence(existingDirectory("corrected target", target)).plateDigest !== prepared.replacementPlateDigest) throw new ReceiverRefusal("admitted-correction-plate-drift", prepared.id);
  assertPreservedRoots(target, prepared.preservedRuntimeRoots);
  let committed = recoveryCommitted;
  if (!committed) {
    committed = contentRecord({
      type: "SoftwareDeliveryCorrectionAdmissionCommitted",
      recordedAt: now,
      receiver: ACTOR,
      operation: CORRECTION_ADMIT_OPERATION,
      requestDigest: authority.requestDigest,
      preparedTransition: prepared.id,
      priorPlateDigest: prepared.priorPlateDigest,
      priorPlate: prepared.priorPlate,
      admittedPlateDigest: prepared.replacementPlateDigest,
      replacement: true,
      displacedLivePlateRemovalRequired: true,
    });
    appendEvidence(dataRoot, "transitions", committed);
    crash(options, "correction-admission-committed");
  }
  if (existsSync(prior)) {
    rmSync(prior, { recursive: true, force: true });
    crash(options, "correction-displaced-plate-removed");
  }
  if (existsSync(candidate)) rmSync(candidate, { recursive: true, force: true });

  let result = recordsOfType(dataRoot, CORRECTION_ADMISSION_RECEIPT).find((record) => record.requestDigest === authority.requestDigest);
  if (!result) {
    result = contentRecord({
      type: CORRECTION_ADMISSION_RECEIPT,
      recordedAt: now,
      receiver: ACTOR,
      operation: CORRECTION_ADMIT_OPERATION,
      requestDigest: authority.requestDigest,
      preparedTransition: prepared.id,
      committedTransition: committed.id,
      correctionStagingReceipt: receipt.id,
      targetServiceIdentity: prepared.targetServiceIdentity,
      targetContract: prepared.targetContract,
      targetRoot: prepared.targetRoot,
      priorPlateDigest: prepared.priorPlateDigest,
      priorPlate: prepared.priorPlate,
      admittedPlateDigest: prepared.replacementPlateDigest,
      admittedPlate: prepared.replacementPlate,
      preservedRuntimeRoots: prepared.preservedRuntimeRoots,
      replacement: true,
      displacedLivePlateRemoved: true,
      resourceReceipt: resourceReceipt(started, { providerLocalMutation: true }),
    });
    appendEvidence(dataRoot, "receipts", result);
    crash(options, "correction-admission-receipt-appended");
  }
  appendEvidence(dataRoot, "authority-consumptions", contentRecord({
    type: "CorrectionAuthorityConsumptionCommitted",
    recordedAt: now,
    operation: CORRECTION_ADMIT_OPERATION,
    authorityDigest: authority.authorityDigest,
    authorityNonce: authority.authority.nonce,
    requestDigest: authority.requestDigest,
  }));
  return result;
  });
}

function operationName() {
  const index = process.argv.indexOf("--operation");
  return index >= 0 ? process.argv[index + 1] : basename(process.argv[1] ?? "");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    const operation = operationName();
    let result;
    if (operation === `solicit-${STAGE_OPERATION}`) result = solicitOperation(STAGE_OPERATION, input.request, input.customer, input.recordedAt);
    else if (operation === `solicit-${ADMIT_OPERATION}`) result = solicitOperation(ADMIT_OPERATION, input.request, input.customer, input.recordedAt);
    else if (operation === `solicit-${CORRECTION_STAGE_OPERATION}`) result = solicitCorrectionOperation(CORRECTION_STAGE_OPERATION, input.request, input.customer, input.recordedAt);
    else if (operation === `solicit-${CORRECTION_ADMIT_OPERATION}`) result = solicitCorrectionOperation(CORRECTION_ADMIT_OPERATION, input.request, input.customer, input.recordedAt);
    else if (operation === STAGE_OPERATION) result = await stageAcceptedSoftwareDelivery(input);
    else if (operation === ADMIT_OPERATION) result = await reviewAndAdmitStagedSoftwareDelivery(input);
    else if (operation === CORRECTION_STAGE_OPERATION) result = await stageAcceptedSoftwareDeliveryCorrection(input);
    else if (operation === CORRECTION_ADMIT_OPERATION) result = await reviewAndAdmitStagedSoftwareDeliveryCorrection(input);
    else throw new ReceiverRefusal("unknown-operation", operation);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ type: "AcceptedSoftwareDeliveryReceiverRefusal", code: error.code ?? "receiver-error", detail: error.message, evidence: error.evidence ?? {}, externalNetwork: false, externalSpend: 0, credentials: false, git: false, customerMutation: false, foreignMutation: false, ttiMutation: false })}\n`);
    process.exitCode = 2;
  }
}
