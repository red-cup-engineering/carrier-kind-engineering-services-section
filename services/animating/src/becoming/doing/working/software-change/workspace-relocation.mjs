import { lstat, mkdir, readFile, readdir, readlink, realpath, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { readJsnodeModuleRequests, readJsnodePackageConsumers, visitJsnodeSyntax } from "@red-cup-engineering/javascript-node-services-section/syntax";
import { applyJsnodePackageCollapsePlan, planJsnodePackageCollapse } from "@red-cup-engineering/javascript-node-services-section/syntax";
import { planActivePathRelocation, applyActivePathRelocation, relocateRepositoryPath } from "@red-cup-engineering/computer-code-engineering-services-section/workspace-path-relocation";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { admitSoftwarePlacement, softwareWorkIdentity, witnessSoftwareWork } from "../software-change.mjs";
import { concludeSoftwareWork, proposeSoftwareWork, readSoftwareWorkProposal } from "./work-journal.mjs";

const digestData = (value) => sha256Hex(Buffer.from(JSON.stringify(value)));
const execFileAsync = promisify(execFile);
const modulePath = /\.(?:[cm]?js|[cm]?ts|jsx|tsx)$/iu;

async function instanceDeclarations(root) {
  let candidates;
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "ls-files", "-z", "--cached", "*instance.json"],
      { maxBuffer: 16 * 1024 * 1024 });
    candidates = stdout.split("\0").filter(Boolean);
  } catch {
    candidates = [];
    async function visit(directory) {
      for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") await visit(path.join(directory, entry.name));
        else if (entry.isFile() && entry.name.endsWith("instance.json")) candidates.push(path.join(directory, entry.name));
      }
    }
    await visit("");
  }
  const declarations = [];
  for (const name of candidates) {
    const file = inside(root, name);
    if (!(await exists(file))?.isFile()) continue;
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (typeof manifest?.instanceOf !== "string" || !manifest.instanceOf) continue;
    if (typeof manifest?.identity?.id !== "string" || !manifest.identity.id) {
      throw new TypeError("instance declaration lacks identity.id: " + name);
    }
    declarations.push({ name: manifest.identity.id, instanceOf: manifest.instanceOf, origin: manifest.identity.origin, path: name });
  }
  return declarations;
}

async function ownerDeclarations(root) {
  let candidates;
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "ls-files", "-z", "--cached", "--others",
      "--exclude-standard", "--", "*package.json"], { maxBuffer: 32 * 1024 * 1024 });
    candidates = stdout.split("\0").filter(Boolean);
  } catch {
    candidates = [];
    async function visit(directory) {
      for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") await visit(path.join(directory, entry.name));
        else if (entry.isFile() && entry.name === "package.json") candidates.push(path.join(directory, entry.name));
      }
    }
    await visit("");
  }
  const declarations = [];
  for (const name of candidates) {
    const file = inside(root, name);
    if (!(await exists(file))?.isFile()) continue;
    const bytes = await readFile(file);
    if (!bytes.includes(Buffer.from('"softwareKind"'))) continue;
    const manifest = JSON.parse(bytes.toString("utf8"));
    if (typeof manifest.name !== "string" || typeof manifest.softwareKind !== "string") {
      throw new TypeError("software owner declaration needs package name and softwareKind: " + name);
    }
    declarations.push({ name: manifest.name, kind: manifest.softwareKind, path: name, digest: sha256Hex(bytes) });
  }
  return declarations;
}

async function admitWorkspacePlacement(root, declaration) {
  const placement = admitSoftwarePlacement(declaration);
  const owner = placement.content.ownerAfter;
  const instance = (await instanceDeclarations(root)).find((item) => item.name === owner ||
    (typeof item.origin === "string" && item.origin === owner));
  if (instance) throw new TypeError("an instance supplies configuration and state; " + owner + " is declared by " + instance.path + " and cannot own executable capability");
  const matches = (await ownerDeclarations(root)).filter((item) => item.name === owner);
  if (matches.length !== 1) throw new TypeError("receiving software owner needs one package declaration: " + owner);
  if (matches[0].kind !== placement.content.ownerAfterKind) {
    throw new TypeError("receiving software owner kind differs from " + matches[0].path + ": " + matches[0].kind);
  }
  return { placement, declaration: matches[0] };
}

async function packageConsumerCandidates(root, specifiers) {
  let gitRoot;
  try {
    gitRoot = (await execFileAsync("git", ["-C", root, "rev-parse", "--show-toplevel"])).stdout.trim();
  } catch {
    gitRoot = null;
  }
  if (gitRoot === root) {
    let tracked = "";
    try {
      tracked = (await execFileAsync("git", ["-C", root, "grep", "-l", "-z", "-F",
        ...specifiers.flatMap((name) => ["-e", name]), "--"], { maxBuffer: 64 * 1024 * 1024 })).stdout;
    } catch (error) {
      if (error.code !== 1) throw error;
    }
    const untracked = (await execFileAsync("git", ["-C", root, "ls-files", "-z", "--others", "--exclude-standard"],
      { maxBuffer: 64 * 1024 * 1024 })).stdout;
    return [...new Set([...tracked.split("\0"), ...untracked.split("\0")])]
      .filter((name) => modulePath.test(name)).sort();
  }
  const found = [];
  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const name = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") await visit(name);
      else if (entry.isFile() && modulePath.test(name)) found.push(name);
    }
  }
  await visit("");
  return found.sort();
}

async function discoverPackageConsumers(root, mapping) {
  const specifiers = [...new Set((mapping?.packageExports ?? []).map((entry) => entry.specifier))];
  if (specifiers.length === 0) return [];
  const consumers = [];
  for (const name of await packageConsumerCandidates(root, specifiers)) {
    const absolute = inside(root, name);
    const stat = await exists(absolute);
    if (!stat?.isFile() || stat.isSymbolicLink()) continue;
    const bytes = await readFile(absolute);
    const text = bytes.toString("utf8");
    if (!specifiers.some((specifier) => text.includes(specifier))) continue;
    if (!Buffer.from(text).equals(bytes)) throw new Error("package consumer is not UTF-8 text: " + name);
    const references = readJsnodePackageConsumers(text, name, specifiers);
    if (references.length) consumers.push({ path: name, digest: sha256Hex(bytes), references });
  }
  return consumers;
}

function keepJournalOutsideRetiredPaths(journalPath, root, retired) {
  if (!journalPath) throw new TypeError("software relocation needs a journalPath");
  const journal = path.resolve(journalPath);
  for (const name of retired) {
    const absolute = path.resolve(root, name);
    if (journal === absolute || journal.startsWith(absolute + path.sep)) {
      throw new Error("journal must survive outside moved or retired paths: " + name);
    }
  }
}

const exists = async (file) => { try { return await lstat(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; } };
function inside(root, file) {
  const absolute = path.resolve(root, file);
  if (absolute === root || !absolute.startsWith(root + path.sep)) throw new Error("path must be inside repository: " + file);
  return absolute;
}
function moduleReferences(text, fileName, repositoryRoot) {
  const references = readJsnodeModuleRequests(text, fileName)
    .filter((item) => item.start !== null && item.end !== null && typeof item.specifier === "string")
    .map((item) => ({ start: item.start, end: item.end, value: item.specifier }));
  // File URLs and explicit repository paths are live source references too.
  visitJsnodeSyntax(text, fileName, (node, parent) => {
    if (node.type !== "Literal" || typeof node.value !== "string") return;
    const fileURL = parent?.type === "NewExpression" && parent.callee.type === "Identifier" && parent.callee.name === "URL" && parent.arguments[0] === node;
    const repositoryPath = node.value.startsWith("lib/emsenn/") || node.value.startsWith(repositoryRoot + "/");
    if (fileURL || repositoryPath) references.push({ start: node.start, end: node.end, value: node.value });
  });
  return [...new Map(references.map((item) => [item.start, item])).values()].sort((a, b) => a.start - b.start);
}

/** Plans directory relocation and exact live-reference edits without executing the source being migrated.
 * files explicitly identifies active source/configuration/link carriers; persisted data is never inferred as a reference.
 */
export async function planWorkspaceRelocation({ repositoryRoot, replacements, files, symlinks = [] }) {
  const root = await realpath(repositoryRoot);
  if (!Array.isArray(files)) throw new TypeError("files must explicitly select active reference carriers");
  // The pure projector validates disjoint normalized source/destination prefixes.
  relocateRepositoryPath("relocation-validation", replacements);
  for (const move of replacements) for (const source of replacements) {
    if (move.to === source.from || move.to.startsWith(source.from + "/")) throw new Error("destination lies inside a source: " + move.to);
  }
  const moves = [];
  for (const move of replacements) {
    const from = inside(root, move.from);
    const to = inside(root, move.to);
    if (!(await exists(from))?.isDirectory() || (await lstat(from)).isSymbolicLink()) throw new Error("source must be a real directory: " + move.from);
    if (await exists(to)) throw new Error("destination already exists: " + move.to);
    if (await realpath(from) !== from) throw new Error("source crosses a symbolic directory: " + move.from);
    const stat = await lstat(from);
    const snapshot = await retirementSnapshot(from);
    moves.push({ ...move, device: stat.dev, inode: stat.ino, snapshot, snapshotDigest: digestData(snapshot) });
  }
  const edits = [];
  const refusals = [];
  for (const selected of files) {
    const absolute = inside(root, selected.path);
    const stat = await exists(absolute);
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) continue;
    const bytes = await readFile(absolute);
    const text = bytes.toString("utf8");
    if (!Buffer.from(text).equals(bytes)) { refusals.push({ path: selected.path, reason: "not UTF-8 text" }); continue; }
    try {
      const source = { type: "active-path-reference-source", version: 1, kind: selected.kind,
        path: selected.path, text,
        references: selected.kind === "module" ? moduleReferences(text, selected.path, root) : undefined };
      const plan = planActivePathRelocation(source, { repositoryRoot: root, relocations: replacements });
      if (plan.edits.length) {
        const projected = applyActivePathRelocation(source, plan);
        edits.push({ path: selected.path, digest: sha256Hex(bytes), length: bytes.length, plan,
          relocatedPath: projected.relocatedPath, outputDigest: sha256Hex(Buffer.from(projected.text)), outputLength: Buffer.byteLength(projected.text) });
      }
    } catch (error) { refusals.push({ path: selected.path, reason: error.message }); }
  }
  const links = [];
  for (const name of symlinks) {
    const absolute = inside(root, name);
    if (!(await exists(absolute))?.isSymbolicLink()) continue;
    const target = await readlink(absolute);
    const resolved = path.resolve(path.dirname(absolute), target);
    if (!resolved.startsWith(root + path.sep)) continue;
    const targetRelative = path.relative(root, resolved).split(path.sep).join("/");
    const nextName = relocateRepositoryPath(name, replacements);
    const nextTarget = relocateRepositoryPath(targetRelative, replacements);
    if (nextName === name && nextTarget === targetRelative) continue;
    const next = path.isAbsolute(target) ? inside(root, nextTarget) : path.relative(path.dirname(inside(root, nextName)), inside(root, nextTarget));
    if (next !== target) links.push({ path: name, relocatedPath: nextName, target, replacement: next });
  }
  return { kind: "workspace-relocation", version: 1, repositoryRoot: root, moves, edits, links, refusals };
}

/** Rechecks every edited carrier before the first mutation. Moves preserve ignored files and directory contents. */
async function applyWorkspaceRelocation(plan) {
  if (plan?.kind !== "workspace-relocation" || plan.version !== 1) throw new TypeError("not a workspace relocation plan");
  if (plan.refusals.length) throw new Error("unresolved source refusals: " + plan.refusals.length);
  const root = await realpath(plan.repositoryRoot);
  const writes = [];
  const writeTargets = new Set();
  for (const edit of plan.edits) {
    const bytes = await readFile(inside(root, edit.path));
    if (sha256Hex(bytes) !== edit.digest) throw new Error("source changed: " + edit.path);
    const receipt = applyActivePathRelocation({ path: edit.path, text: bytes.toString("utf8") }, edit.plan);
    if (sha256Hex(Buffer.from(receipt.text)) !== edit.outputDigest) throw new Error("projected output changed: " + edit.path);
    if (writeTargets.has(receipt.relocatedPath)) throw new Error("projected write collision: " + receipt.relocatedPath);
    writeTargets.add(receipt.relocatedPath);
    if (receipt.relocatedPath !== edit.path && await exists(inside(root, receipt.relocatedPath))) throw new Error("write destination appeared: " + receipt.relocatedPath);
    writes.push({ path: receipt.relocatedPath, text: receipt.text });
  }
  for (const move of plan.moves) {
    const stat = await lstat(inside(root, move.from));
    if (stat.dev !== move.device || stat.ino !== move.inode || digestData(await retirementSnapshot(inside(root, move.from))) !== move.snapshotDigest) throw new Error("source directory changed: " + move.from);
    if (await exists(inside(root, move.to))) throw new Error("destination appeared: " + move.to);
  }
  for (const link of plan.links) if (await readlink(inside(root, link.path)) !== link.target) throw new Error("symbolic reference changed: " + link.path);
  for (const move of plan.moves) {
    await mkdir(path.dirname(inside(root, move.to)), { recursive: true });
    await rename(inside(root, move.from), inside(root, move.to));
  }
  for (const write of writes) await writeFile(inside(root, write.path), write.text);
  for (const edit of plan.edits) if (sha256Hex(await readFile(inside(root, edit.relocatedPath))) !== edit.outputDigest) throw new Error("written output differs: " + edit.relocatedPath);
  for (const link of plan.links) {
    const destination = inside(root, link.relocatedPath);
    await unlink(destination);
    await symlink(link.replacement, destination);
  }
  return { movedDirectories: plan.moves.length, rewrittenFiles: writes.length, rewrittenSymlinks: plan.links.length };
}

async function relocationEvidence(plan, actor, status = "planned") {
  const root = plan.repositoryRoot;
  const inputs = [
    ...plan.moves.map((move) => ({ path: move.from, kind: "directory-snapshot", digest: move.snapshotDigest })),
    ...plan.edits.map((edit) => ({ path: edit.path, kind: "source-file", digest: edit.digest, length: edit.length })),
    ...plan.links.map((link) => ({ path: link.path, kind: "symbolic-link", digest: digestData(link.target) })),
    { path: plan.ownerAfterDeclaration.path, kind: "software-owner-declaration", digest: plan.ownerAfterDeclaration.digest },
  ];
  const outputs = [
    ...await Promise.all(plan.moves.map(async (move) => ({
      path: move.to, kind: "directory-snapshot",
      digest: status !== "planned" ? digestData(await retirementSnapshot(inside(root, move.to))) : move.snapshotDigest,
    }))),
    ...plan.edits.map((edit) => ({ path: edit.relocatedPath, kind: "source-file", digest: edit.outputDigest, length: edit.outputLength })),
    ...plan.links.map((link) => ({ path: link.relocatedPath, kind: "symbolic-link", digest: digestData(link.replacement) })),
  ];
  return witnessSoftwareWork({ intent: relocationIntent(plan, actor), inputs, outputs, placement: plan.placement,
    applied: status === "applied", observed: status === "observed" });
}

const relocationIntent = (plan, actor) => ({ operation: "workspace-relocation", actor, request: {
  planDigest: digestData(plan), placement: admitSoftwarePlacement(plan.placement).id,
} });

function projectedMoveSnapshot(plan, move) {
  const snapshot = structuredClone(move.snapshot);
  const replace = (name, value) => {
    if (!name.startsWith(move.from + "/")) return;
    const parts = name.slice(move.from.length + 1).split("/");
    let current = snapshot;
    for (const part of parts.slice(0, -1)) current = current.entries.find(([entry]) => entry === part)?.[1];
    const entry = current?.entries.find(([entryName]) => entryName === parts.at(-1));
    if (!entry) throw new Error("planned source is absent from directory snapshot: " + name);
    entry[1] = value;
  };
  for (const edit of plan.edits) replace(edit.path, { kind: "file", digest: edit.outputDigest });
  for (const link of plan.links) replace(link.path, { kind: "link", target: link.replacement });
  return snapshot;
}

async function relocationObserved(plan) {
  const root = plan.repositoryRoot;
  for (const move of plan.moves) {
    if (await exists(inside(root, move.from))) return false;
    const target = inside(root, move.to);
    if (!(await exists(target))?.isDirectory() ||
        digestData(await retirementSnapshot(target)) !== digestData(projectedMoveSnapshot(plan, move))) return false;
  }
  for (const edit of plan.edits) {
    const target = inside(root, edit.relocatedPath);
    if (!(await exists(target))?.isFile() || sha256Hex(await readFile(target)) !== edit.outputDigest) return false;
  }
  for (const link of plan.links) {
    const target = inside(root, link.relocatedPath);
    if (!(await exists(target))?.isSymbolicLink() || await readlink(target) !== link.replacement) return false;
  }
  return true;
}

export async function relocateWorkspace(request) {
  const actor = request.actor ?? "unspecified";
  if (request.action === "plan") {
    const { placement, declaration } = await admitWorkspacePlacement(await realpath(request.repositoryRoot), request.placement);
    const plan = await planWorkspaceRelocation(request);
    plan.placement = placement.content;
    plan.ownerAfterDeclaration = declaration;
    keepJournalOutsideRetiredPaths(request.journalPath, plan.repositoryRoot, plan.moves.map((move) => move.from));
    if (plan.refusals.length) return { moves: plan.moves.length, edits: plan.edits.length, links: plan.links.length,
      refusals: plan.refusals, evidence: { kind: "aoe.software.work-refusal", reasons: plan.refusals } };
    const intent = relocationIntent(plan, actor);
    const work = softwareWorkIdentity(intent);
    const history = await proposeSoftwareWork(request.journalPath, work, { kind: plan.kind, actor, intent, plan });
    return { moves: plan.moves.length, edits: plan.edits.length, links: plan.links.length, refusals: plan.refusals,
      work, journalPath: request.journalPath, history, evidence: await relocationEvidence(plan, actor) };
  }
  if (request.action === "apply" && request.journalPath) {
    const { work, proposal } = await readSoftwareWorkProposal(request.journalPath);
    const { plan, intent } = proposal;
    const { declaration } = await admitWorkspacePlacement(plan.repositoryRoot, plan.placement);
    if (JSON.stringify(declaration) !== JSON.stringify(plan.ownerAfterDeclaration)) throw new Error("receiving software owner declaration changed");
    if (proposal.kind !== "workspace-relocation" || proposal.actor !== actor ||
        intent?.actor !== actor || work !== softwareWorkIdentity(relocationIntent(plan, actor)) ||
        JSON.stringify(intent) !== JSON.stringify(relocationIntent(plan, actor))) throw new Error("journal does not admit this relocation");
    if (await relocationObserved(plan)) {
      const history = await concludeSoftwareWork(request.journalPath, work, "observed", { planDigest: digestData(plan) });
      return { status: "observed", movedDirectories: 0, rewrittenFiles: 0, rewrittenSymlinks: 0,
        work, journalPath: request.journalPath, history, evidence: await relocationEvidence(plan, actor, "observed") };
    }
    const result = await applyWorkspaceRelocation(plan);
    if (!(await relocationObserved(plan))) throw new Error("relocation output differs from admitted proposal");
    const history = await concludeSoftwareWork(request.journalPath, work, "applied", { planDigest: digestData(plan), result });
    return { status: "applied", ...result, work, journalPath: request.journalPath, history,
      evidence: await relocationEvidence(plan, actor, "applied") };
  }
  throw new TypeError("action must be plan or apply");
}

// Retirement snapshots include content and directory membership. An inode alone
// cannot detect a concurrent edit or new user file inside an obsolete package.
async function retirementSnapshot(absolute) {
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) return { kind: "link", target: await readlink(absolute) };
  if (stat.isFile()) return { kind: "file", digest: sha256Hex(await readFile(absolute)) };
  if (!stat.isDirectory()) throw new Error("unsupported retirement carrier: " + absolute);
  const entries = [];
  for (const name of (await readdir(absolute)).sort()) {
    entries.push([name, await retirementSnapshot(path.join(absolute, name))]);
  }
  return { kind: "directory", entries };
}

/** Plans an explicitly selected package-boundary retirement. Unlike relocation,
 * each source carrier is projected by the shared parser codemod, then selected
 * obsolete files/directories are removed only after every output is admitted. */
export async function planWorkspacePackageCollapse({ repositoryRoot, mapping, files, obsolete = [] }) {
  const root = await realpath(repositoryRoot);
  if (!Array.isArray(files)) throw new TypeError("package collapse requires an explicit source file array");
  if (!Array.isArray(obsolete)) throw new TypeError("obsolete paths must be an array");
  const consumerClosure = await discoverPackageConsumers(root, mapping);
  const selectedPaths = new Set(files.map((selected) => typeof selected === "string" ? selected : selected?.path));
  const omitted = consumerClosure.filter((consumer) => !selectedPaths.has(consumer.path));
  if (omitted.length) throw new Error("package collapse omits source-discovered consumers: " +
    omitted.map((consumer) => consumer.path).join(", "));
  const outputs = new Set();
  const transformations = [];
  for (const selected of files) {
    const sourcePath = typeof selected === "string" ? selected : selected?.path;
    const eraseTypeScript = typeof selected === "string" ? false : selected.eraseTypeScript === true;
    const absolute = inside(root, sourcePath);
    const stat = await exists(absolute);
    if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error("selected source must be a real file: " + sourcePath);
    const bytes = await readFile(absolute);
    const text = bytes.toString("utf8");
    if (!Buffer.from(text).equals(bytes)) throw new Error("selected source is not UTF-8 text: " + sourcePath);
    const codemod = planJsnodePackageCollapse(text, sourcePath, mapping, { eraseTypeScript });
    const receipt = applyJsnodePackageCollapsePlan(text, sourcePath, codemod);
    if (outputs.has(receipt.outputPath)) throw new Error("projected output collision: " + receipt.outputPath);
    outputs.add(receipt.outputPath);
    if (receipt.outputPath !== sourcePath && await exists(inside(root, receipt.outputPath))) throw new Error("projected output already exists: " + receipt.outputPath);
    transformations.push({ path: sourcePath, digest: sha256Hex(bytes), codemod, outputPath: receipt.outputPath, outputDigest: sha256Hex(Buffer.from(receipt.text)), outputText: receipt.text });
  }
  const retired = [];
  for (const name of obsolete) {
    const absolute = inside(root, name);
    const stat = await exists(absolute);
    if (!stat || stat.isSymbolicLink()) throw new Error("obsolete path must exist and not be a symlink: " + name);
    if ([...outputs].some((output) => output === name || output.startsWith(name + "/"))) throw new Error("obsolete path contains a projected output: " + name);
    retired.push({ path: name, device: stat.dev, inode: stat.ino, snapshot: await retirementSnapshot(absolute) });
  }
  return { kind: "workspace-package-collapse", version: 1, repositoryRoot: root,
    packageSpecifiers: [...new Set((mapping?.packageExports ?? []).map((entry) => entry.specifier))],
    consumerClosure, transformations, obsolete: retired };
}

/** Applies a preflighted collapse. Reapplying a completed plan is idempotent:
 * absent retired inputs are accepted only when their exact projected outputs remain. */
async function applyWorkspacePackageCollapse(plan) {
  if (plan?.kind !== "workspace-package-collapse" || plan.version !== 1) throw new TypeError("not a workspace package-collapse plan");
  const root = await realpath(plan.repositoryRoot);
  const writes = [];
  for (const item of plan.transformations) {
    const source = inside(root, item.path);
    const output = inside(root, item.outputPath);
    const sourceStat = await exists(source);
    const outputStat = await exists(output);
    if (!sourceStat) {
      if (!outputStat?.isFile() || sha256Hex(await readFile(output)) !== item.outputDigest) throw new Error("source disappeared without its projected output: " + item.path);
      continue;
    }
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error("source changed: " + item.path);
    const sourceBytes = await readFile(source);
    const sourceDigest = sha256Hex(sourceBytes);
    // Consumers commonly retain their filename. Once projected, that path holds
    // the output rather than the preflight input and must be recognized as done.
    if (item.outputPath === item.path && sourceDigest === item.outputDigest) continue;
    if (sourceDigest !== item.digest) throw new Error("source changed: " + item.path);
    if (item.outputPath !== item.path && outputStat) throw new Error("projected output appeared: " + item.outputPath);
    const receipt = applyJsnodePackageCollapsePlan(sourceBytes.toString("utf8"), item.path, item.codemod);
    if (sha256Hex(Buffer.from(receipt.text)) !== item.outputDigest) throw new Error("projected output changed: " + item.path);
    writes.push({ path: item.outputPath, text: receipt.text });
  }
  for (const item of plan.obsolete) {
    const current = await exists(inside(root, item.path));
    if (current && (current.dev !== item.device || current.ino !== item.inode)) throw new Error("obsolete path changed: " + item.path);
    if (current && (!item.snapshot || JSON.stringify(await retirementSnapshot(inside(root, item.path))) !== JSON.stringify(item.snapshot))) throw new Error("obsolete contents changed: " + item.path);
  }
  for (const write of writes) {
    await mkdir(path.dirname(inside(root, write.path)), { recursive: true });
    await writeFile(inside(root, write.path), write.text);
  }
  let removed = 0;
  for (const item of plan.obsolete) if (await exists(inside(root, item.path))) { await rm(inside(root, item.path), { recursive: true, force: false }); removed += 1; }
  for (const item of plan.transformations) if (sha256Hex(await readFile(inside(root, item.outputPath))) !== item.outputDigest) throw new Error("written output differs: " + item.outputPath);
  for (const item of plan.obsolete) if (await exists(inside(root, item.path))) throw new Error("obsolete path remains: " + item.path);
  return { projectedFiles: writes.length, retiredPaths: removed };
}

const collapseIntent = (plan, actor) => ({ operation: "workspace-package-collapse", actor, request: {
  planDigest: digestData(plan), placement: admitSoftwarePlacement(plan.placement).id,
} });

async function collapseObserved(plan) {
  const root = plan.repositoryRoot;
  for (const item of plan.transformations) {
    const target = inside(root, item.outputPath);
    if (!(await exists(target))?.isFile() || sha256Hex(await readFile(target)) !== item.outputDigest) return false;
  }
  for (const item of plan.obsolete) if (await exists(inside(root, item.path))) return false;
  return true;
}

async function collapseEvidence(plan, actor, status = "planned") {
  const inputs = [
    ...plan.transformations.map((item) => ({ path: item.path, kind: "source-file", digest: item.digest })),
    ...plan.obsolete.map((item) => ({ path: item.path, kind: "retirement-snapshot", digest: digestData(item.snapshot) })),
    { path: plan.ownerAfterDeclaration.path, kind: "software-owner-declaration", digest: plan.ownerAfterDeclaration.digest },
  ];
  const outputs = [
    ...plan.transformations.map((item) => ({ path: item.outputPath, kind: "source-file", digest: item.outputDigest })),
    ...plan.obsolete.map((item) => ({ path: item.path, kind: status !== "planned" ? "retired-path" : "projected-retirement", digest: digestData({ path: item.path, absent: true }) })),
  ];
  return witnessSoftwareWork({ intent: collapseIntent(plan, actor), inputs, outputs,
    placement: plan.placement, discoveredConsumers: plan.consumerClosure,
    applied: status === "applied", observed: status === "observed" });
}

/** Executes a package-collapse request. `plan` is the dry-run: it proves every
 * selected transformation and retirement without writing to the workspace. */
export async function collapseWorkspacePackages(request) {
  const actor = request.actor ?? "unspecified";
  if (request.action === "plan" || request.action === "dry-run") {
    const { placement, declaration } = await admitWorkspacePlacement(await realpath(request.repositoryRoot), request.placement);
    const plan = await planWorkspacePackageCollapse(request);
    plan.ownerAfterDeclaration = declaration;
    if (plan.obsolete.some((item) => declaration.path === item.path || declaration.path.startsWith(item.path + "/"))) {
      throw new TypeError("receiving software owner declaration would be retired: " + declaration.path);
    }
    plan.placement = { ...placement.content, consumers: [...new Set([
      ...placement.content.consumers, ...plan.consumerClosure.map((consumer) => consumer.path),
    ])].sort() };
    if (request.action === "dry-run") return { projectedFiles: plan.transformations.length, retiredPaths: plan.obsolete.length,
      dryRun: true, plan, evidence: await collapseEvidence(plan, actor) };
    keepJournalOutsideRetiredPaths(request.journalPath, plan.repositoryRoot, plan.obsolete.map((item) => item.path));
    const intent = collapseIntent(plan, actor);
    const work = softwareWorkIdentity(intent);
    const history = await proposeSoftwareWork(request.journalPath, work, { kind: plan.kind, actor, intent, plan });
    return { projectedFiles: plan.transformations.length, retiredPaths: plan.obsolete.length,
      status: "planned", work, journalPath: request.journalPath, history, evidence: await collapseEvidence(plan, actor) };
  }
  if (request.action === "apply" && request.journalPath) {
    const { work, proposal } = await readSoftwareWorkProposal(request.journalPath);
    const { plan, intent } = proposal;
    const { declaration } = await admitWorkspacePlacement(plan.repositoryRoot, plan.placement);
    if (JSON.stringify(declaration) !== JSON.stringify(plan.ownerAfterDeclaration)) throw new Error("receiving software owner declaration changed");
    if (proposal.kind !== "workspace-package-collapse" || proposal.actor !== actor ||
        intent?.actor !== actor || work !== softwareWorkIdentity(collapseIntent(plan, actor)) ||
        JSON.stringify(intent) !== JSON.stringify(collapseIntent(plan, actor))) throw new Error("journal does not admit this package collapse");
    const currentConsumers = await discoverPackageConsumers(plan.repositoryRoot, {
      packageExports: plan.packageSpecifiers.map((specifier) => ({ specifier })),
    });
    const plannedConsumers = new Set(plan.consumerClosure.map((consumer) => consumer.path));
    const newConsumers = currentConsumers.filter((consumer) => !plannedConsumers.has(consumer.path));
    if (newConsumers.length) throw new Error("new package consumers appeared after the proposal: " +
      newConsumers.map((consumer) => consumer.path).join(", "));
    if (await collapseObserved(plan)) {
      const history = await concludeSoftwareWork(request.journalPath, work, "observed", { planDigest: digestData(plan) });
      return { status: "observed", projectedFiles: 0, retiredPaths: 0,
        work, journalPath: request.journalPath, history, evidence: await collapseEvidence(plan, actor, "observed") };
    }
    const result = await applyWorkspacePackageCollapse(plan);
    if (!(await collapseObserved(plan))) throw new Error("package-collapse output differs from admitted proposal");
    const history = await concludeSoftwareWork(request.journalPath, work, "applied", { planDigest: digestData(plan), result });
    return { status: "applied", ...result, work, journalPath: request.journalPath, history,
      evidence: await collapseEvidence(plan, actor, "applied") };
  }
  throw new TypeError("action must be plan, dry-run, or apply");
}
