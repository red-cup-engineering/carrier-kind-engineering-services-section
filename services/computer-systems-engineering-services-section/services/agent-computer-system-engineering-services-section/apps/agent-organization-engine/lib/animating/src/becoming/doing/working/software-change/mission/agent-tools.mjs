import { identifyContentFile } from '@red-cup-engineering/immutable-content-custody-service/file-content';
import { existsSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { mkdirSync } from "node:fs";
import { runTestsCommand } from "@red-cup-engineering/javascript-node-services-section/run-sandboxed-command";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

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

export function digest(bytes) {
  return sha256Hex(bytes);
}

function sourceSnapshotIdentity(body) {
  return identifyJsonSemanticContent({ objectKind: "software-change.source-snapshot", value: body, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

/** Capture exact receiver-selected file targets before any supplier work. */
export function captureSoftwareChangeSource({ root, writablePaths } = {}) {
  if (!Array.isArray(writablePaths) || writablePaths.length === 0) throw new TypeError("source binding needs explicit file targets");
  root = resolve(root);
  const rootReal = realpathSync(root), seen = new Set();
  const targets = writablePaths.map(requested => {
    const { path, relativePath } = admittedPath(root, rootReal, requested);
    if (requested !== relativePath || seen.has(relativePath)) throw new TypeError("source targets must be unique canonical relative file paths");
    seen.add(relativePath);
    const beforeExisted = existsSync(path);
    if (beforeExisted && !lstatSync(path).isFile()) throw new TypeError(`source target is not a regular file: ${relativePath}`);
    const beforeDigest=beforeExisted?'sha256:'+Buffer.from(identifyContentFile(path).ni.split(';')[1],'base64url').toString('hex'):'sha256:'+digest(Buffer.alloc(0));
    return { path: relativePath, beforeExisted, beforeDigest };
  });
  const body = { type: "SoftwareChangeSourceSnapshot", version: 1, targets };
  return Object.freeze({ ...body, id: sourceSnapshotIdentity(body) });
}

function admittedSourceSnapshot(snapshot) {
  const { id, ...body } = snapshot ?? {};
  if (body.type !== "SoftwareChangeSourceSnapshot" || body.version !== 1 || !Array.isArray(body.targets)
      || body.targets.length === 0 || sourceSnapshotIdentity(body) !== id) throw new TypeError("source snapshot identity is invalid");
  const seen = new Set();
  for (const target of body.targets) {
    if (typeof target?.path !== "string" || !target.path || target.path.startsWith("/") || target.path.includes("\\")
        || target.path.split("/").some(part => !part || part === "." || part === "..") || seen.has(target.path)
        || typeof target.beforeExisted !== "boolean" || !/^sha256:[a-f0-9]{64}$/u.test(target.beforeDigest)) throw new TypeError("source snapshot has an invalid target");
    seen.add(target.path);
  }
  return body.targets;
}

/** Compile fabricated text into the same byte-bound proposal the receiver already consumes. */
export function projectFabricatedSoftwareChanges(sourceSnapshot, artifactProposal) {
  const targets = new Map(admittedSourceSnapshot(sourceSnapshot).map(target => [target.path, target]));
  const transform = artifactProposal?.type === "SoftwareSourceTransformation";
  if (artifactProposal?.version !== 1 || (transform
    ? !Array.isArray(artifactProposal.operations)
    : artifactProposal?.type !== "JsnodeModuleProposal" || !Array.isArray(artifactProposal.files) || !Array.isArray(artifactProposal.tests))) {
    throw new TypeError("one source transformation or module fabrication proposal is required");
  }
  const seen = new Set();
  const files = transform ? artifactProposal.operations : [...artifactProposal.files, ...artifactProposal.tests];
  const changes = files.map(file => {
    const target = targets.get(file?.path);
    const remove = transform && file?.kind === "remove";
    if (transform && !["replace-text", "remove"].includes(file?.kind)) throw new TypeError("unknown source transformation");
    if (!target || seen.has(file.path) || (remove ? file.text !== undefined || !target.beforeExisted : typeof file.text !== "string")) throw new TypeError(`fabricated file is repeated or outside the bound source: ${file?.path}`);
    if (file.mode !== undefined && file.mode !== 0o644) throw new TypeError("text receiving cannot realize another file mode");
    seen.add(file.path);
    const after = remove ? Buffer.alloc(0) : Buffer.from(file.text, "utf8");
    return { ...target, ...(remove ? {afterExisted:false} : {}), afterDigest: `sha256:${digest(after)}`, afterBytesBase64: after.toString("base64") };
  });
  if (changes.length === 0) throw new TypeError("fabrication has no file changes");
  return Object.freeze({ type: "SoftwareMissionChangeProposal", changes, sourceSnapshot, artifactProposal,
    proposalOnly: true, customerMutation: false });
}

/** AOE binds the source before calling any deterministic or inferential fabricator. */
export async function proposeFabricatedSoftwareChange({ root, writablePaths, plan, fabricate } = {}) {
  if (typeof fabricate !== "function") throw new TypeError("a fabrication method is required");
  const sourceSnapshot = captureSoftwareChangeSource({ root, writablePaths });
  if (plan !== undefined && (plan.type !== "JsnodeModuleFabricationPlan" || !Array.isArray(plan.paths)
      || plan.paths.some(path => !writablePaths.includes(path)))) return Object.freeze({
    type: "SoftwareMissionChangeProposalRefusal", version: 1, phase: "source-plan-binding",
    sourceSnapshot, fabricationPlan: plan,
    cause: {name: "TypeError", message: "fabrication outputs exceed the selected consumer targets"},
    proposalOnly: true, customerMutation: false,
  });
  const artifactProposal = await fabricate();
  if (artifactProposal?.type === "JsnodeModuleDerivationRefusal") return Object.freeze({ ...artifactProposal, sourceSnapshot });
  if (artifactProposal?.type !== "JsnodeModuleProposal") throw new TypeError("fabricator returned neither a module proposal nor its refusal");
  try {
    if (plan !== undefined && (artifactProposal.workOrderSpecification?.specificationDigest !== plan.workOrderSpecificationDigest
        || JSON.stringify([...artifactProposal.files, ...artifactProposal.tests].map(file => file.path).sort()) !== JSON.stringify([...plan.paths].sort()))) {
      throw new TypeError("fabrication differs from the original admitted output plan");
    }
    return Object.freeze({...projectFabricatedSoftwareChanges(sourceSnapshot, artifactProposal),
      ...(plan === undefined ? {} : {fabricationPlan: plan})});
  } catch (error) {
    // A refused projection must retain the purchased artifact and its lots.
    // It is not a supplier rejection, and cannot reconstruct a later source.
    return Object.freeze({
      type: "SoftwareMissionChangeProposalRefusal", version: 1,
      phase: "source-change-projection", sourceSnapshot, artifactProposal,
      ...(plan === undefined ? {} : {fabricationPlan: plan}),
      cause: { name: error.name, message: error.message },
      proposalOnly: true, customerMutation: false,
    });
  }
}

/**
 * Induces an isolated, verified mission proposal into an explicitly bounded receiver territory.
 * @param {{root:string,writablePaths:readonly string[],verifyCommand:string,acceptanceCommand?:string,proposal:{type:string,changes:readonly object[]}}} input Receiver-owned induction input.
 * @returns {{changedPaths:readonly string[],verification:object,acceptance:object}} The successful receiver check results.
 * @throws {Error} When the proposal is stale, out of scope, unsafe, or fails either receiver check.
 */
export function induceVerifiedSoftwareMissionProposal({ root, writablePaths, verifyCommand, acceptanceCommand, proposal } = {}) {
  if (!Array.isArray(writablePaths) || writablePaths.length === 0) throw new TypeError("receiver induction requires explicit nonempty writablePaths");
  if (proposal?.type !== "SoftwareMissionChangeProposal" || !Array.isArray(proposal.changes) || proposal.changes.length === 0) {
    throw new TypeError("receiver induction requires one nonempty SoftwareMissionChangeProposal");
  }
  if (proposal.sourceSnapshot !== undefined) {
    const projected = projectFabricatedSoftwareChanges(proposal.sourceSnapshot, proposal.artifactProposal);
    if (JSON.stringify(projected.changes) !== JSON.stringify(proposal.changes)) throw new TypeError("received changes differ from the source-bound fabrication proposal");
    if (typeof verifyCommand !== "string" || !verifyCommand || typeof acceptanceCommand !== "string" || !acceptanceCommand) {
      throw new TypeError("fabrication receiving requires explicit receiver verification and consumer acceptance commands");
    }
  }
  acceptanceCommand ??= verifyCommand;
  root = resolve(root);
  const rootReal = realpathSync(root);
  const admitted = new Set(writablePaths);
  const paths = new Set(), prepared = [];
  for (const change of proposal.changes) {
    const {path, relativePath} = admittedPath(root, rootReal, change?.path);
    if (!admitted.has(relativePath)) throw new TypeError('receiving path is outside declared writable paths: '+relativePath);
    if (paths.has(relativePath)) throw new TypeError('receiving repeats path: '+relativePath);
    paths.add(relativePath);
    const existed = existsSync(path);
    if (existed && !lstatSync(path).isFile()) throw new TypeError('receiving target must be a regular file');
    const before = existed ? readFileSync(path) : Buffer.alloc(0);
    if (existed !== change.beforeExisted || 'sha256:'+digest(before) !== change.beforeDigest)
      throw new TypeError('receiving does not descend from the admitted source: '+relativePath);
    const after = Buffer.from(change.afterBytesBase64 ?? '', 'base64');
    if ('sha256:'+digest(after) !== change.afterDigest) throw new TypeError('receiving after digest is invalid: '+relativePath);
    if (change.afterExisted !== undefined && typeof change.afterExisted !== 'boolean') throw new TypeError('after existence must be Boolean');
    if (change.afterExisted === false && after.length) throw new TypeError('absent output cannot contain bytes');
    prepared.push({path, relativePath, existed, before, after, remove:change.afterExisted === false});
  }
  const applied = [];
  const rollback = () => {
    for (const entry of [...applied].reverse()) {
      if (entry.existed) writeFileSync(entry.path, entry.before);
      else if (existsSync(entry.path)) unlinkSync(entry.path);
    }
  };
  let result;
  try {
    for (const entry of prepared) {
      applied.push(entry);
      if (entry.remove) { if (entry.existed) unlinkSync(entry.path); }
      else { mkdirSync(dirname(entry.path), {recursive:true}); writeFileSync(entry.path, entry.after); }
    }
    const verification = runTestsCommand(root, verifyCommand);
    const acceptance = acceptanceCommand === verifyCommand ? verification : runTestsCommand(root, acceptanceCommand);
    result = {changedPaths:prepared.map(entry=>entry.relativePath),verification,acceptance};
    if (!verification.passed || !acceptance.passed) { rollback(); result = {...result,changedPaths:[],rolledBack:true}; }
  } catch(error) { rollback(); throw error; }
  if (result.rolledBack || !result.verification.passed || !result.acceptance.passed) {
    const refusal=new Error("receiver induction rolled back because verification or acceptance failed");
    refusal.receiving=result;
    throw refusal;
  }
  return result;
}
