#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, closeSync, constants, createReadStream, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dataCustodyDirectory } from "@red-cup-engineering/data-custody-directory-service";
import { expandRecurrenceRule } from "@red-cup-engineering/expand-recurrence-rule-service";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { semanticBytes } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { encodeRelationalValue } from "@red-cup-engineering/relational-value-graph-service";
import { admitDurableRecord, legacyRecordDigest, LEGACY_DURABLE_CELL_FORMAT } from "./durable-cell-admission.mjs";
import { CONTRACT, RETIREMENT_CONTRACT } from "./law.mjs";
import { RECORD_KIND, identify } from "./semantic-content.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export { CONTRACT, RETIREMENT_CONTRACT } from "./law.mjs";
// The portable service account is the default provider identity. A colony
// deployment may seat the service under its own already-contracted actor; the
// systemd unit carries that explicit incumbency rather than making it ambient.
export const ACTOR = process.env.SCHEDULED_ACTIVITY_DELIVERY_ACTOR ?? "urn:ame:scheduled-activity-delivery-service";
// The current law tightened schedule transition and delivery settlement without
// invalidating registrations admitted by its immediate predecessor.  Reads
// therefore project both append-only histories; all new writes use CONTRACT.
export const PREDECESSOR_CONTRACTS = Object.freeze([
  "ni:///sha-256;jG8aEkjcH4_x_sMyKHE6-eEIgWcaVmTTTHs6qlehW2E",
]);
const EFFECTS = Object.freeze([
  "provider-local-append-only-schedule",
  "provider-local-occurrence-reservation",
  "exact-advertised-target-operation-invocation",
]);
const MAX_TEMPLATE_BYTES = 128 * 1024;
const MAX_DELIVERY_TIMEOUT_MS = 3_600_000;
const MAX_CONCURRENT_TARGETS = 3;
const MAX_TARGETS_PER_TICK = 32;
const ACTIVE_SCHEDULE_PROJECTION = "ActiveScheduleProjection";
const TICK_RESULTS_DIRECTORY = "tick-results";
// These are the fixed, host-owned executables used for every live target
// invocation. They are deliberately not PATH lookups or schedule inputs.
export const TARGET_ISOLATION_EXECUTABLES = Object.freeze({
  timeout: "/usr/bin/timeout",
  nice: "/usr/bin/nice",
  bwrap: "/usr/bin/bwrap",
});
// Cold Red Gate's scheduled carrier and every target it launches use the
// already-retained Guix Node closure, never the mutable NVM/PATH selection.
// This path is part of that colony's deployment contract, not schedule input.
export const COLD_RED_GATE_NODE = "/gnu/store/kba00zrnc1d1cg9bkx0krpvc2sp7wzrh-node-24.18.0/bin/node";
export function resolveColdRedGateNodeExecutable(path = COLD_RED_GATE_NODE) {
  let target, stat, store;
  try { target = realpathSync(path); stat = statSync(target); store = statSync("/gnu/store"); accessSync(target, constants.X_OK); }
  catch { throw new Error(`pinned Cold Red Gate Node is absent or not executable: ${path}`); }
  if (target !== COLD_RED_GATE_NODE || !stat.isFile() || stat.uid !== store.uid || stat.dev !== store.dev || (stat.mode & 0o222) !== 0) {
    throw new Error(`pinned Cold Red Gate Node is not the exact Guix-store-owned non-writable regular file: ${COLD_RED_GATE_NODE}`);
  }
  return target;
}
export function resolveTargetIsolationExecutables(executables = TARGET_ISOLATION_EXECUTABLES) {
  const resolved = {};
  for (const [name, path] of Object.entries(executables)) {
    let target, stat;
    try { target = realpathSync(path); stat = statSync(target); accessSync(target, constants.X_OK); }
    catch { throw new Error(`fixed isolation executable is absent or not executable: ${name} (${path})`); }
    if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o022) !== 0) throw new Error(`fixed isolation executable does not resolve to a root-owned non-writable regular file: ${name} (${path})`);
    resolved[name] = target;
  }
  return Object.freeze(resolved);
}
export const TARGET_WRITABLE_ROOT_ENVIRONMENT = Object.freeze([
  "KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT",
  "KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT",
]);

function canonical(value) { return identify(value, RECORD_KIND).bytes; }
function durableProjectionBytes(value) { const encoded = encodeRelationalValue(value); return semanticBytes(["ascribe", encoded.type, encoded.term]); }
function bytewiseTextOrder(left, right) { return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")); }
export function digest(value) { return identify(value, RECORD_KIND).id; }
function id(value) { return digest(value); }
function response(type, source, object) {
  return { "@context": CONTEXT, id: id({ actor: ACTOR, type, inReplyTo: source?.id ?? null, object }), type, actor: ACTOR,
    target: source?.actor ?? "urn:actor:unidentified", inReplyTo: source?.id ?? "urn:activity:unidentified", object };
}
function refusal(source, code, reason, contract = CONTRACT) { return response("Reject", source, { type: "Refusal", contract, code, reason, customerTerritoryMutation: false }); }
function sectionRoot(options = {}) { return resolve(options.root ?? process.env.SCHEDULED_ACTIVITY_DELIVERY_ROOT ?? ROOT); }
export function tickResultFilename(at) {
  if (!validInstant(at)) throw new Error("tick result requires an explicit valid instant");
  return `${at.replaceAll(/[-:.]/gu, "")}.json`;
}
export function tickResultPath(root, at) { return join(dataCustodyDirectory(root, "state", TICK_RESULTS_DIRECTORY), tickResultFilename(at)); }
function tickResultBody(result) { const { id: ignored, ...body } = result; return body; }
function verifyTickResult(result, path = null) {
  if (!result || typeof result !== "object" || result.type !== "ScheduledDeliveryTickResult" || result.actor !== ACTOR || !validInstant(result.at)) throw new Error(`invalid persisted tick result${path ? `: ${path}` : ""}`);
  if (typeof result.id !== "string" || result.id !== id(tickResultBody(result))) throw new Error(`persisted tick result identity does not verify${path ? `: ${path}` : ""}`);
  if (path && basename(path) !== tickResultFilename(result.at)) throw new Error(`persisted tick result filename does not bind its instant: ${path}`);
  return Object.freeze(result);
}
function readTickResult(path) {
  let stat;
  try { stat = lstatSync(path); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o600) throw new Error(`persisted tick result is not a 0600 regular file: ${path}`);
  let result; try { result = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error(`persisted tick result is not valid JSON: ${path}`); }
  return verifyTickResult(result, path);
}
function persistTickResult(root, result) {
  const directory = dataCustodyDirectory(root, "state", TICK_RESULTS_DIRECTORY), path = tickResultPath(root, result.at), existing = readTickResult(path);
  if (existing) return existing;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const directoryStat = lstatSync(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error(`tick-results directory is unsafe: ${directory}`);
    const descriptor = openSync(path, "wx", 0o600);
    try { writeFileSync(descriptor, `${JSON.stringify(result)}\n`); fsyncSync(descriptor); }
    finally { closeSync(descriptor); }
  } catch (error) {
    // A concurrent/replayed clock pulse may have won the one allowed write.
    // Return only its independently verified immutable observation.
    if (error?.code === "EEXIST") return readTickResult(path) ?? (() => { throw error; })();
    throw error;
  }
  return readTickResult(path);
}
// Read-only operator observation. It creates neither the directory nor a
// result cell, and fails closed instead of skipping a malformed newest cell.
export function inspectLatestTick(options = {}) {
  const root = sectionRoot(options), directory = dataCustodyDirectory(root, "state", TICK_RESULTS_DIRECTORY);
  if (!existsSync(directory)) return null;
  const directoryStat = lstatSync(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error(`tick-results directory is unsafe: ${directory}`);
  const names = readdirSync(directory).filter((name) => /^\d{8}T\d{9}Z\.json$/u.test(name)).sort();
  if (names.length === 0) return null;
  return readTickResult(join(directory, names.at(-1)));
}
function store(options = {}) {
  const journal = createSemanticRecordJournal({ root: sectionRoot(options), objectKind: "scheduled-activity-delivery.record" });
  // sectionRoot(options) is the package/section root, not a data directory:
  // createSemanticRecordJournal appends its own lawful "data/logs" beneath it.
  return Object.freeze({
    records: (category) => journal.query({ category }).map(({ record: value }) => value),
    record: ({ category, recordedAt, record: value }) => journal.record({ category, recordedAt, record: value, charge: { support: true, refutation: false } }),
  });
}
function records(ledger, kind) {
  return [CONTRACT, ...PREDECESSOR_CONTRACTS].flatMap((contract) => ledger.records(`${contract}.${kind}`));
}
async function append(ledger, kind, value, at) { return ledger.record({ category: `${CONTRACT}.${kind}`, recordedAt: at, record: value }); }
async function tickLedger(options = {}) {
  const durable = store(options);
  const categories = [CONTRACT, ...PREDECESSOR_CONTRACTS]
    .flatMap((contract) => ["schedules", "schedule-transitions", "delivery-receipts", "schedule-retirements", "events"].map((kind) => `${contract}.${kind}`));
  const snapshot = new Map(categories.map((category) => [category, durable.records(category)]));
  return Object.freeze({
    records(category) { return [...(snapshot.get(category) ?? [])]; },
    async record(input) {
      const receipt = await durable.record(input);
      if (!snapshot.has(input.category)) snapshot.set(input.category, []);
      snapshot.get(input.category).push(input.record);
      return receipt;
    },
  });
}
function eventRecord(source, outcome, at, details = {}) { return { specversion: "1.0", id: id({ source: source?.id, outcome, at, details }), source: ACTOR, type: `org.emsenn.scheduled-activity-delivery.${outcome}`, subject: source?.id ?? "urn:activity:unidentified", time: at, datacontenttype: "application/rmn+cbor", data: { contract: CONTRACT, sourceDigest: digest(source ?? null), ...details } }; }
async function witness(ledger, source, outcome, at, details = {}) { return append(ledger, "events", eventRecord(source, outcome, at, details), at); }
function validInstant(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function attachment(activity) { const value = activity?.object?.sourceActivity?.object?.attachment; return (Array.isArray(value) ? value : [value]).find((item) => item?.type === "ScheduledActivityDeliveryRequest"); }
function inside(root, path) { const rel = relative(root, path); return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); }
function scheduleIdentity(customer, requestDigest, targetBinding) { return id({ provider: ACTOR, customer, requestDigest, targetBinding }); }
function targetBindingFor(_request, target) {
  return target.runtimeClosureDigest === undefined
    ? { packageDigest: target.packageDigest, selectedBinDigest: target.selectedBinDigest }
    : { packageDigest: target.packageDigest, selectedBinDigest: target.selectedBinDigest, runtimeClosureDigest: target.runtimeClosureDigest };
}
function sameSemantic(left, right) { return canonical(left).equals(canonical(right)); }
function registrations(ledger) { return [...records(ledger, "schedules"), ...records(ledger, "schedule-transitions").map((item) => item.successorRegistration)]; }
function retirements(ledger) { return [...records(ledger, "schedule-retirements"), ...records(ledger, "schedule-transitions").map((item) => item.predecessorRetirement)]; }
function transitionIntentPath(root, predecessorSchedule) { return dataCustodyDirectory(root, "state", "schedule-transition-intents", `${digest(predecessorSchedule).slice("ni:///sha-256;".length)}.rmn.cbor`); }
function fsyncDirectory(path) { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }
function ensureDurableDirectory(directory) {
  if (existsSync(directory)) {
    if (!lstatSync(directory).isDirectory()) throw new Error(`durable cell parent is not a directory: ${directory}`);
    return;
  }
  const missing = []; let cursor = directory;
  while (!existsSync(cursor)) {
    missing.push(cursor);
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error(`durable cell has no existing ancestor: ${directory}`);
    cursor = parent;
  }
  for (const path of missing.reverse()) {
    try { mkdirSync(path); }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (!lstatSync(path).isDirectory()) throw new Error(`durable cell parent is not a directory: ${path}`);
    fsyncDirectory(dirname(path));
  }
}
let durableCellSequence = 0;
function publishDurableCell(path, bytes) {
  const directory = dirname(path); ensureDurableDirectory(directory);
  const temporary = `${path}.${process.pid}.${Date.now()}.${durableCellSequence += 1}.tmp`; let published = false;
  try {
    const fd = openSync(temporary, "wx", 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    try { linkSync(temporary, path); published = true; }
    catch (error) { if (error?.code !== "EEXIST") throw error; }
    if (published) { fsyncDirectory(directory); return true; }
  } finally { try { unlinkSync(temporary); } catch (error) { if (error?.code !== "ENOENT") throw error; } }
  if (!readFileSync(path).equals(bytes)) throw new Error(`durable cell conflicts with existing bytes: ${path}`);
  return false;
}
function scheduleProjection(registration) {
  return {
    type: ACTIVE_SCHEDULE_PROJECTION,
    scheduleId: registration.scheduleId,
    registration,
    registrationDigest: digest(registration),
    customerTerritoryMutation: false,
  };
}
function projectActiveSchedule(root, registration) {
  if (registration?.type !== "ScheduleRegistration" || typeof registration.scheduleId !== "string" || registration.id !== registration.scheduleId) throw new Error("active schedule projection requires one settled ScheduleRegistration");
  if (existsSync(retiredScheduleProjectionPath(root, registration.scheduleId))) return false;
  publishDurableCell(activeScheduleProjectionPath(root, registration.scheduleId), durableProjectionBytes(scheduleProjection(registration)));
  return true;
}
function retireActiveSchedule(root, retirement) {
  if (retirement?.type !== "ScheduleRetirement" || typeof retirement.scheduleId !== "string") throw new Error("retired schedule projection requires one settled ScheduleRetirement");
  publishDurableCell(retiredScheduleProjectionPath(root, retirement.scheduleId), durableProjectionBytes({ type: "RetiredScheduleProjection", scheduleId: retirement.scheduleId, retirement, retirementDigest: digest(retirement), customerTerritoryMutation: false }));
  try { unlinkSync(activeScheduleProjectionPath(root, retirement.scheduleId)); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
function activeScheduleProjections(root) {
  const directory = dataCustodyDirectory(root, "state", "active-schedule-projections");
  if (!existsSync(directory)) return [];
  const active = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".rmn.cbor")) continue;
    const path = join(directory, entry.name), admission = admitDurableCell(root, path), projection = admission.value;
    if (projection?.type !== ACTIVE_SCHEDULE_PROJECTION || projection.registrationDigest !== digest(projection.registration) || projection.scheduleId !== projection.registration?.scheduleId || projection.registration?.type !== "ScheduleRegistration" || projection.registration?.id !== projection.scheduleId || projection.customerTerritoryMutation !== false) throw new Error("invalid active schedule projection");
    if (!existsSync(retiredScheduleProjectionPath(root, projection.scheduleId))) active.push(projection.registration);
  }
  return active.sort((left, right) => bytewiseTextOrder(left.scheduleId, right.scheduleId));
}
function migrationProjectionPath(root, sourceDigest) { return dataCustodyDirectory(root, "state", "durable-cell-format-migrations", `${sourceDigest.slice("ni:///sha-256;".length)}.rmn.cbor`); }
function currentCellProjectionPath(root, sourceDigest) { return dataCustodyDirectory(root, "state", "durable-cell-current-projections", `${sourceDigest.slice("ni:///sha-256;".length)}.rmn.cbor`); }
function decodingCachePath(root, sourceDigest) { return dataCustodyDirectory(root, "state", "durable-cell-decoding-caches", `${sourceDigest.slice("ni:///sha-256;".length)}.json`); }
function migrationDecodingCachePath(root, sourceDigest) { return dataCustodyDirectory(root, "state", "durable-cell-migration-decoding-caches", `${sourceDigest.slice("ni:///sha-256;".length)}.json`); }
function scheduleProjectionName(scheduleId) { return digest(scheduleId).slice("ni:///sha-256;".length); }
function activeScheduleProjectionPath(root, scheduleId) { return dataCustodyDirectory(root, "state", "active-schedule-projections", `${scheduleProjectionName(scheduleId)}.rmn.cbor`); }
function retiredScheduleProjectionPath(root, scheduleId) { return dataCustodyDirectory(root, "state", "retired-schedule-projections", `${scheduleProjectionName(scheduleId)}.rmn.cbor`); }
function rawDigest(bytes) { return `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`; }
function admitDurableCell(root, path) {
  const sourceBytes = readFileSync(path), sourceDigest = rawDigest(sourceBytes);
  const migrationPath = migrationProjectionPath(root, sourceDigest), currentPath = currentCellProjectionPath(root, sourceDigest), cachePath = decodingCachePath(root, sourceDigest), migrationCachePath = migrationDecodingCachePath(root, sourceDigest);
  if (![migrationPath, currentPath, cachePath, migrationCachePath].every(existsSync)) return admitDurableRecord(sourceBytes);
  const migrationBytes = readFileSync(migrationPath), migration = JSON.parse(readFileSync(migrationCachePath, "utf8"));
  const currentBytes = readFileSync(currentPath), value = JSON.parse(readFileSync(cachePath, "utf8"));
  if (!canonical(migration).equals(migrationBytes) || migration?.type !== "DurableCellFormatMigrationProjection" || migration.sourceCarrierDigest !== sourceDigest || migration.sourcePath !== relative(root, path).split(sep).join("/") || migration.currentProjectionDigest !== digest(value) || !canonical(value).equals(currentBytes) || migration.rawCellPreserved !== true) throw new Error("durable cell migration projection does not bind the preserved source cell to its current projection");
  return Object.freeze({ value, format: LEGACY_DURABLE_CELL_FORMAT, sourceDigest, recordDigest: legacyRecordDigest });
}
function projectLegacyDurableCell(root, path, admission) {
  if (admission.format !== LEGACY_DURABLE_CELL_FORMAT) return false;
  const value = admission.value;
  const currentPath = currentCellProjectionPath(root, admission.sourceDigest), currentBytes = canonical(value);
  if (existsSync(currentPath)) {
    if (!readFileSync(currentPath).equals(currentBytes)) throw new Error(`durable current-cell projection conflicts with existing bytes: ${currentPath}`);
  } else publishDurableCell(currentPath, currentBytes);
  const cachePath = decodingCachePath(root, admission.sourceDigest), cacheBytes = Buffer.from(JSON.stringify(value));
  if (existsSync(cachePath)) {
    if (!readFileSync(cachePath).equals(cacheBytes)) throw new Error(`durable cell decoding cache conflicts with existing bytes: ${cachePath}`);
  } else publishDurableCell(cachePath, cacheBytes);
  const projectionPath = migrationProjectionPath(root, admission.sourceDigest), migration = {
    type: "DurableCellFormatMigrationProjection",
    sourceCarrierDigest: admission.sourceDigest,
    sourcePath: relative(root, path).split(sep).join("/"),
    sourceFormat: admission.format,
    sourceRecordType: value?.type ?? null,
    sourceRecordId: typeof value?.id === "string" ? value.id : null,
    currentProjectionDigest: digest(value),
    reader: "@coesite-operations/scheduled-activity-delivery-service@0.1.2",
    rawCellPreserved: true,
    customerTerritoryMutation: false,
  }, bytes = canonical(migration);
  if (existsSync(projectionPath)) {
    if (!readFileSync(projectionPath).equals(bytes)) throw new Error(`durable cell migration projection conflicts with existing bytes: ${projectionPath}`);
  } else publishDurableCell(projectionPath, bytes);
  const migrationCachePath = migrationDecodingCachePath(root, admission.sourceDigest), migrationCacheBytes = Buffer.from(JSON.stringify(migration));
  if (existsSync(migrationCachePath)) {
    if (!readFileSync(migrationCachePath).equals(migrationCacheBytes)) throw new Error(`durable migration decoding cache conflicts with existing bytes: ${migrationCachePath}`);
  } else publishDurableCell(migrationCachePath, migrationCacheBytes);
  return true;
}
function readPreparedTransition(root, predecessorSchedule) {
  if (typeof predecessorSchedule !== "string") return null;
  const path = transitionIntentPath(root, predecessorSchedule); if (!existsSync(path)) return null;
  const admission = admitDurableCell(root, path), prepared = admission.value;
  if (prepared?.type !== "ScheduleTransition" || prepared.id !== admission.recordDigest(Object.fromEntries(Object.entries(prepared).filter(([key]) => key !== "id"))) || prepared.predecessorSchedule !== predecessorSchedule || typeof prepared.transitionRequestDigest !== "string") throw new Error("invalid prepared schedule transition");
  projectLegacyDurableCell(root, path, admission);
  return prepared;
}
function preparedTransitionForSuccessor(root, successorSchedule) {
  const intentRoot = dataCustodyDirectory(root, "state", "schedule-transition-intents"); if (!existsSync(intentRoot)) return null;
  for (const name of readdirSync(intentRoot).filter((item) => item.endsWith(".rmn.cbor")).sort()) {
    const path = join(intentRoot, name), admission = admitDurableCell(root, path), prepared = admission.value;
    if (prepared?.type !== "ScheduleTransition" || prepared.id !== admission.recordDigest(Object.fromEntries(Object.entries(prepared).filter(([key]) => key !== "id"))) || typeof prepared.transitionRequestDigest !== "string") throw new Error("invalid prepared schedule transition");
    projectLegacyDurableCell(root, path, admission);
    if (prepared.successorSchedule === successorSchedule) return prepared;
  }
  return null;
}
function prepareTransition(root, candidate) {
  const path = transitionIntentPath(root, candidate.predecessorSchedule), bytes = canonical(candidate), directory = dirname(path);
  if (publishDurableCell(path, bytes)) return candidate;
  return readPreparedTransition(root, candidate.predecessorSchedule);
}

async function withScheduleMutationLock(root, action) {
  const path = dataCustodyDirectory(root, "state", "locks", "schedule-mutation.lock"); mkdirSync(dirname(path), { recursive: true });
  const holder = spawn("/usr/bin/flock", ["--exclusive", path, process.execPath, "-e", "process.stdout.write('acquired\\n'); process.stdin.resume();"], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = ""; holder.stderr.setEncoding("utf8"); holder.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((accept, reject) => {
    let stdout = "";
    const fail = (code, signal) => reject(new Error(`schedule mutation lock failed: code=${code ?? "none"} signal=${signal ?? "none"}${stderr ? ` ${stderr.trim()}` : ""}`));
    holder.once("error", reject); holder.once("exit", fail); holder.stdout.setEncoding("utf8");
    holder.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.includes("acquired\n")) { holder.off("exit", fail); accept(); } });
  });
  try { return await action(); }
  finally { const exited = new Promise((accept) => holder.once("exit", accept)); holder.stdin.end(); await exited; }
}

export function inspectTarget(target) {
  if (!target || !isAbsolute(target.packageRoot ?? "") || typeof target.actor !== "string" || typeof target.operation !== "string" || typeof target.contract !== "string") return { problem: "target must name absolute packageRoot, actor, operation, and contract" };
  if (Object.keys(target).some((key) => !["packageRoot", "actor", "operation", "contract"].includes(key))) return { problem: "target may name only its advertised package, actor, operation, and contract; executable, argv, environment, and shell input are forbidden" };
  const packageRoot = resolve(target.packageRoot); const packagePath = join(packageRoot, "package.json");
  if (!existsSync(packagePath) || !lstatSync(packagePath).isFile() || lstatSync(packagePath).isSymbolicLink()) return { problem: "target package.json is not a regular file" };
  let pkg; try { pkg = JSON.parse(readFileSync(packagePath, "utf8")); } catch { return { problem: "target package.json is invalid JSON" }; }
  const defaultBinName = typeof pkg?.name === "string" ? pkg.name.split("/").at(-1) : null;
  const bins = typeof pkg?.bin === "string" && defaultBinName ? { [defaultBinName]: pkg.bin } : pkg?.bin;
  const bin = bins?.[target.operation];
  if (typeof bin !== "string") return { problem: "target operation has no package bin entry" };
  const entry = resolve(packageRoot, bin);
  if (!inside(packageRoot, entry) || !existsSync(entry) || !lstatSync(entry).isFile() || lstatSync(entry).isSymbolicLink()) return { problem: "advertised target entry is absent, outside its package, or not a regular file" };
  const entryRelative = relative(packageRoot, entry).split(sep).join("/");
  const declared = inspectDeclaredRuntimeFiles(packageRoot, entryRelative, entry, pkg, target.operation);
  if (declared.problem) return declared;
  // Runtime artefacts are opaque bytes, not JSON values. They retain a raw
  // content digest; the declared closure descriptor crosses the RMN boundary.
  const entryDigest = rawDigest(readFileSync(entry));
  return { packageRoot, packagePath, packageDigest: rawDigest(readFileSync(packagePath)), entry, entryRelative, entryDigest,
    runtimeFiles: declared.files,
    selectedBinDigest: digest({ operation: target.operation, entry: entryRelative, entryDigest }),
    ...(declared.explicit ? { runtimeClosureDigest: digest(declared.files.map(({ relativePath, digest: fileDigest }) => ({ relativePath, digest: fileDigest }))) } : {}) };
}

function runtimeImportSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /\bimport\s+(?:[\w*$\s,{}]+?\s+from\s+)?["']([^"']+)["']/gu,
    /\bexport\s+(?:[\w*$\s,{}]+?\s+from\s+)["']([^"']+)["']/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];
  let remainder = source;
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
    remainder = remainder.replace(pattern, "");
  }
  // `import.meta` is an intrinsic module coordinate, not a runtime import. It
  // neither loads bytes nor expands the declared target closure.
  remainder = remainder.replace(/\bimport\.meta\b/gu, "");
  if (/\b(?:import|require)\b/u.test(remainder)) throw new Error("target runtime uses an undeclared or dynamic module import");
  return [...found].sort(bytewiseTextOrder);
}
function inspectDeclaredRuntimeFiles(packageRoot, entryRelative, entry, pkg, operation) {
  const packagedClosure = pkg?.scheduledActivityDelivery?.runtimePackages?.[operation] === "npm-lockfile";
  const declaration = pkg?.scheduledActivityDelivery?.runtimeFiles;
  if (declaration === undefined) {
    // Existing self-contained targets retain their two-file binding shape.
    if (/\b(?:import|export|require)\b/u.test(readFileSync(entry, "utf8"))) return { problem: "target bin must be self-contained and may not use module imports" };
    return { explicit: false, files: [{ relativePath: entryRelative, source: entry, digest: rawDigest(readFileSync(entry)) }] };
  }
  const declaredPaths = declaration?.[operation];
  if (!Array.isArray(declaredPaths) || (!packagedClosure && declaredPaths.length === 0) || declaredPaths.some((path) => typeof path !== "string") || new Set(declaredPaths).size !== declaredPaths.length) return { problem: "target package must declare one unique runtimeFiles array for its selected operation" };
  const files = new Map([[entryRelative, { relativePath: entryRelative, source: entry, digest: rawDigest(readFileSync(entry)) }]]);
  for (const relativePath of declaredPaths) {
    const source = resolve(packageRoot, relativePath);
    if (!inside(packageRoot, source) || !existsSync(source) || !lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) return { problem: `declared target runtime file is absent, outside its package, or not a regular file: ${relativePath}` };
    const normalized = relative(packageRoot, source).split(sep).join("/");
    if (files.has(normalized)) return { problem: `declared target runtime file is duplicated: ${relativePath}` };
    files.set(normalized, { relativePath: normalized, source, digest: rawDigest(readFileSync(source)) });
  }
  try {
    for (const file of files.values()) {
      if (!/\.(?:[cm]?js|json)$/u.test(file.relativePath)) continue;
      for (const specifier of runtimeImportSpecifiers(readFileSync(file.source, "utf8"))) {
        if (specifier.startsWith("node:")) continue;
        if (!specifier.startsWith("./") && !specifier.startsWith("../")) { if (packagedClosure) continue; throw new Error(`target runtime bare import is not declared: ${specifier}`); }
        const imported = resolve(dirname(file.source), specifier);
        if (!inside(packageRoot, imported)) throw new Error(`target runtime import escapes its package: ${specifier}`);
        const normalized = relative(packageRoot, imported).split(sep).join("/");
        if (!files.has(normalized)) throw new Error(`target runtime import is not declared: ${specifier}`);
      }
    }
  } catch (error) { return { problem: error instanceof Error ? error.message : String(error) }; }
  if (packagedClosure) {
    const modules = join(packageRoot, "node_modules");
    if (!existsSync(join(packageRoot, "package-lock.json")) || !existsSync(modules) || lstatSync(modules).isSymbolicLink()) return { problem: "npm-lockfile runtime closure requires a regular package-lock.json and installed node_modules" };
    const collect = (directory) => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const source = join(directory, item.name), normalized = relative(packageRoot, source).split(sep).join("/");
        if (normalized.startsWith("node_modules/.bin/") || normalized.includes("/node_modules/.bin/")) continue;
        if (item.isDirectory()) collect(source);
        else if (item.isFile() && !item.isSymbolicLink()) files.set(normalized, { relativePath: normalized, source, digest: rawDigest(readFileSync(source)) });
        else if (item.isSymbolicLink()) throw new Error(`npm-lockfile runtime closure refuses symbolic link: ${normalized}`);
      }
    };
    try { collect(modules); }
    catch (error) { return { problem: error instanceof Error ? error.message : String(error) }; }
  }
  return { explicit: true, files: [...files.values()].sort((left, right) => bytewiseTextOrder(left.relativePath, right.relativePath)) };
}

function immutableRuntimeImage(registration, inspected, options = {}) {
  const imageRoot = join(dataCustodyDirectory(sectionRoot(options), "state", "runtime-images"), digest({ target: registration.request.target, binding: registration.targetBinding }).slice("ni:///sha-256;".length));
  const descriptors = [
    { relativePath: "package.json", source: inspected.packagePath, expected: inspected.packageDigest, assay: rawDigest },
    ...inspected.runtimeFiles.map((file) => ({ relativePath: file.relativePath, source: file.source, expected: file.digest, assay: rawDigest })),
  ];
  const unique = new Map();
  for (const descriptor of descriptors) {
    const prior = unique.get(descriptor.relativePath);
    if (prior && prior.expected !== descriptor.expected) throw new Error(`runtime image has conflicting commitments for ${descriptor.relativePath}`);
    unique.set(descriptor.relativePath, descriptor);
  }
  const mounts = [];
  for (const descriptor of [...unique.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath))) {
    if (!existsSync(descriptor.source) || !lstatSync(descriptor.source).isFile() || lstatSync(descriptor.source).isSymbolicLink()) throw new Error(`runtime image source is no longer a regular file: ${descriptor.relativePath}`);
    const bytes = readFileSync(descriptor.source);
    if (descriptor.assay(bytes) !== descriptor.expected) throw new Error(`runtime image source changed before capture: ${descriptor.relativePath}`);
    const imagePath = resolve(imageRoot, descriptor.relativePath);
    if (!inside(imageRoot, imagePath)) throw new Error(`runtime image path escapes its provider plate: ${descriptor.relativePath}`);
    publishDurableCell(imagePath, bytes);
    mounts.push({ source: imagePath, target: descriptor.source });
  }
  const after = inspectTarget(registration.request.target);
  if (after.problem || !sameSemantic(targetBindingFor(registration.request, after), registration.targetBinding)) throw new Error("target runtime closure changed while its immutable image was captured");
  return { imageRoot, mounts };
}

function inspectRequest(request, at) {
  const problems = [];
  if (request?.type !== "ScheduledActivityDeliveryRequest") problems.push("request type");
  if (!request || !["dry-run", "live"].includes(request.executionMode)) problems.push("executionMode dry-run|live");
  if (!Number.isInteger(request?.schedule?.intervalSeconds) || request.schedule.intervalSeconds < 60 || request.schedule.intervalSeconds > 31_536_000) problems.push("schedule.intervalSeconds 60..31536000");
  if (!validInstant(request?.schedule?.firstDueAt)) problems.push("schedule.firstDueAt");
  if (request?.schedule?.maxDeliveries !== null && (!Number.isInteger(request?.schedule?.maxDeliveries) || request.schedule.maxDeliveries < 1 || request.schedule.maxDeliveries > 10000)) problems.push("schedule.maxDeliveries null|1..10000");
  if (!Number.isInteger(request?.timeoutMilliseconds) || request.timeoutMilliseconds < 1 || request.timeoutMilliseconds > MAX_DELIVERY_TIMEOUT_MS) problems.push(`timeoutMilliseconds 1..${MAX_DELIVERY_TIMEOUT_MS}`);
  if (request?.retry?.maxAttempts !== 1) problems.push("retry.maxAttempts must equal 1");
  if (typeof request?.deliveryCapabilityId !== "string" || !request.deliveryCapabilityId.startsWith("urn:")) problems.push("deliveryCapabilityId");
  if (!request?.activityTemplate || request.activityTemplate["@context"] !== CONTEXT || request.activityTemplate.type !== "Create" || request.activityTemplate.target !== request?.target?.actor || !request.activityTemplate.object || typeof request.activityTemplate.object !== "object") problems.push("finite ActivityStreams Create template addressed to target actor");
  if (request?.activityTemplate && ["id", "actor", "published", "capability"].some((key) => Object.hasOwn(request.activityTemplate, key))) problems.push("template must leave provider-authored envelope fields absent");
  if (canonical(request?.activityTemplate ?? null).byteLength > MAX_TEMPLATE_BYTES) problems.push("activity template byte bound");
  const target = inspectTarget(request?.target);
  if (target.problem) problems.push(target.problem);
  if (!validInstant(at)) problems.push("provider instant");
  return { problems, target };
}

function offerObject(activity, request, target) {
  const requestDigest = digest(request); const targetBinding = targetBindingFor(request, target);
  const scheduleId = scheduleIdentity(activity.actor, requestDigest, targetBinding);
  return { type: "ExecutableServiceOffer", contract: CONTRACT, sourceActivity: activity.object.sourceActivity.id, customer: activity.actor,
    request, requestDigest, scheduleId, targetBinding,
    effects: EFFECTS, operation: "invoke-service", evidence: ["provider-owned-schedule", "one-occurrence-one-attempt-reservation", "exact-target-response-or-transport-failure"],
    nonclaims: ["HTTP-Signature-authentication", "ActivityPub-federation", "customer-work-success", "customer-territory-mutation"] };
}

function sameSet(left, right) { return Array.isArray(left) && left.length === new Set(left).size && left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]); }
function providerEmittedOffer(ledger, offer) {
  const offerDigest = digest(offer);
  return records(ledger, "events").some((event) => event?.type === "org.emsenn.scheduled-activity-delivery.offer.emitted" && event.data?.sourceDigest === offerDigest && event.data?.scheduleId === offer?.object?.scheduleId && event.data?.requestDigest === offer?.object?.requestDigest);
}
function validInvocation(activity, at, ledger) {
  const contract = activity?.object; const offer = contract?.offer; const body = offer?.object; const cap = contract?.capability;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR) return "invocation must be an ActivityStreams Accept addressed to this provider";
  if (contract?.type !== "ServiceContract" || contract.contract !== CONTRACT || offer?.type !== "Offer" || offer.actor !== ACTOR || body?.type !== "ExecutableServiceOffer" || body.contract !== CONTRACT) return "exact provider-authored offer is required";
  if (!providerEmittedOffer(ledger, offer)) return "provider has no witnessed emission of the accepted offer";
  if (activity.actor !== body.customer || body.requestDigest !== digest(body.request)) return "customer or request binding changed";
  const inspected = inspectRequest(body.request, at); if (inspected.problems.length) return `accepted request is no longer admissible: ${inspected.problems.join(", ")}`;
  const targetBinding = targetBindingFor(body.request, inspected.target);
  if (!sameSemantic(body.targetBinding, targetBinding) || body.scheduleId !== scheduleIdentity(body.customer, body.requestDigest, targetBinding)) return "target binding is not the provider-inspected canonical runtime closure";
  if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.parentOffer !== offer.id || cap.attenuation?.requestDigest !== body.requestDigest || cap.attenuation?.scheduleId !== body.scheduleId || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at)) return "exact unexpired single-use registration capability is required";
  if (!sameSet(cap.allowedActions, ["invoke-service", ...EFFECTS])) return "registration capability grants inexact effects";
  return null;
}

function validTransition(activity, at, ledger) {
  const request = activity?.object; const offer = request?.offer; const body = offer?.object; const cap = request?.capability;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Update" || activity.target !== ACTOR || request?.type !== "ScheduleTransitionRequest" || request.contract !== CONTRACT) return "transition must be an ActivityStreams Update<ScheduleTransitionRequest> addressed to this provider";
  const predecessor = registrations(ledger).find((item) => item.scheduleId === request.predecessorSchedule);
  if (!predecessor || retirements(ledger).some((item) => item.scheduleId === request.predecessorSchedule)) return "transition predecessor is absent or already retired";
  if (predecessor.customer !== activity.actor) return "only the registered customer may transition its schedule";
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || body?.type !== "ExecutableServiceOffer" || body.contract !== CONTRACT || body.customer !== activity.actor) return "exact provider-authored successor offer is required";
  if (!providerEmittedOffer(ledger, offer)) return "provider has no witnessed emission of the successor offer";
  if (body.requestDigest !== digest(body.request) || body.scheduleId === request.predecessorSchedule) return "successor identity must bind a changed exact runtime closure";
  const inspected = inspectRequest(body.request, at); if (inspected.problems.length) return `successor request is no longer admissible: ${inspected.problems.join(", ")}`;
  const targetBinding = targetBindingFor(body.request, inspected.target);
  if (!sameSemantic(body.targetBinding, targetBinding) || body.scheduleId !== scheduleIdentity(body.customer, body.requestDigest, targetBinding)) return "successor target binding is not the provider-inspected canonical runtime closure";
  if (registrations(ledger).some((item) => item.scheduleId === body.scheduleId)) return "successor is already registered and cannot be introduced atomically";
  if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.parentOffer !== offer.id || cap.attenuation?.predecessorSchedule !== request.predecessorSchedule || cap.attenuation?.successorSchedule !== body.scheduleId || cap.attenuation?.requestDigest !== body.requestDigest || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at)) return "exact unexpired single-use transition capability is required";
  if (!sameSet(cap.allowedActions, ["renew-schedule", ...EFFECTS])) return "transition capability grants inexact effects";
  return null;
}

export async function settle(activity, operation = "solicit-service", at = new Date().toISOString(), options = {}) {
  const ledger = options.ledger ?? store(options);
  if (operation === "solicit-service") {
    await witness(ledger, activity, "solicitation.received", at);
    if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.target !== ACTOR || activity.object?.type !== "ServiceSolicitation") return refusal(activity, "wrong-boundary", "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider");
    const request = attachment(activity); const inspected = inspectRequest(request, at);
    if (inspected.problems.length) return response("Question", activity, { type: "ServiceTermsRequired", contract: CONTRACT, missing: inspected.problems });
    const result = response("Offer", activity, offerObject(activity, request, inspected.target)); await witness(ledger, result, "offer.emitted", at, { scheduleId: result.object.scheduleId, requestDigest: result.object.requestDigest }); return result;
  }
  if (operation === "invoke-service") {
    return withScheduleMutationLock(sectionRoot(options), async () => {
      await witness(ledger, activity, "invocation.received", at); const invalid = validInvocation(activity, at, ledger); if (invalid) return refusal(activity, "invalid-contract", invalid);
      const offered = activity.object.offer.object; const prior = registrations(ledger).find((item) => item.scheduleId === offered.scheduleId);
      if (prior) {
        if (prior.requestDigest !== offered.requestDigest) return refusal(activity, "conflicting-schedule", "schedule identity was already registered with different bytes");
        // The journal append is authoritative.  Rebuild a projection that may
        // have been missed by a crash between that append and projection.
        projectActiveSchedule(sectionRoot(options), prior);
        return response("Accept", activity, prior);
      }
      if (preparedTransitionForSuccessor(sectionRoot(options), offered.scheduleId)) return refusal(activity, "transition-prepared", "schedule is reserved as an atomic transition successor and cannot be registered independently");
      const registration = { type: "ScheduleRegistration", id: offered.scheduleId, scheduleId: offered.scheduleId, provider: ACTOR, customer: activity.actor, request: offered.request, requestDigest: offered.requestDigest, targetBinding: offered.targetBinding, acceptedOffer: activity.object.offer.id, registrationCapabilityDigest: digest(activity.object.capability), status: "active", registeredAt: at, customerTerritoryMutation: false };
      await append(ledger, "schedules", registration, at); await witness(ledger, registration, "schedule.registered", at, { scheduleId: registration.scheduleId }); projectActiveSchedule(sectionRoot(options), registration); return response("Accept", activity, registration);
    });
  }
  if (operation === "renew-schedule") {
    return withScheduleMutationLock(sectionRoot(options), async () => {
      await witness(ledger, activity, "transition.received", at);
      const request = activity?.object; const offered = request?.offer?.object; const requestDigest = digest(activity);
      const prior = records(ledger, "schedule-transitions").find((item) => item.predecessorSchedule === request?.predecessorSchedule);
      if (prior) {
        if (prior.transitionRequestDigest !== requestDigest) return refusal(activity, "conflicting-transition", "predecessor already names a different authenticated successor");
        // Retire first: after a crash, temporary non-delivery is safer than
        // allowing predecessor and successor to deliver the same occurrence.
        retireActiveSchedule(sectionRoot(options), prior.predecessorRetirement);
        projectActiveSchedule(sectionRoot(options), prior.successorRegistration);
        return response("Accept", activity, prior);
      }
      const prepared = readPreparedTransition(sectionRoot(options), request?.predecessorSchedule);
      if (prepared) {
        if (prepared.transitionRequestDigest !== requestDigest) return refusal(activity, "conflicting-transition", "predecessor already has a different prepared successor");
        await append(ledger, "schedule-transitions", prepared, prepared.settledAt); await witness(ledger, prepared, "schedule.transitioned", prepared.settledAt, { predecessorSchedule: prepared.predecessorSchedule, successorSchedule: prepared.successorSchedule }); retireActiveSchedule(sectionRoot(options), prepared.predecessorRetirement); projectActiveSchedule(sectionRoot(options), prepared.successorRegistration); return response("Accept", activity, prepared);
      }
      const invalid = validTransition(activity, at, ledger); if (invalid) return refusal(activity, "invalid-transition", invalid);
      const successorRegistration = { type: "ScheduleRegistration", id: offered.scheduleId, scheduleId: offered.scheduleId, provider: ACTOR, customer: activity.actor, request: offered.request, requestDigest: offered.requestDigest, targetBinding: offered.targetBinding, acceptedOffer: request.offer.id, registrationCapabilityDigest: digest(request.capability), status: "active", registeredAt: at, customerTerritoryMutation: false };
      const predecessor = registrations(ledger).find((item) => item.scheduleId === request.predecessorSchedule);
      const predecessorRetirement = { type: "ScheduleRetirement", id: id({ scheduleId: predecessor.scheduleId, transition: offered.scheduleId }), scheduleId: predecessor.scheduleId, provider: ACTOR, customer: activity.actor, contract: CONTRACT, requestDigest, registrationDigest: digest(predecessor), status: "retired", retiredAt: at, customerTerritoryMutation: false };
      const body = { type: "ScheduleTransition", provider: ACTOR, customer: activity.actor, predecessorSchedule: predecessor.scheduleId, successorSchedule: successorRegistration.scheduleId, successorRegistration, predecessorRetirement, transitionRequestDigest: requestDigest, status: "settled", settledAt: at, customerTerritoryMutation: false };
      const candidate = { id: id(body), ...body }, transition = prepareTransition(sectionRoot(options), candidate);
      if (transition.transitionRequestDigest !== requestDigest) return refusal(activity, "conflicting-transition", "predecessor already has a different prepared successor");
      await append(ledger, "schedule-transitions", transition, transition.settledAt); await witness(ledger, transition, "schedule.transitioned", transition.settledAt, { predecessorSchedule: transition.predecessorSchedule, successorSchedule: transition.successorRegistration.scheduleId }); retireActiveSchedule(sectionRoot(options), transition.predecessorRetirement); projectActiveSchedule(sectionRoot(options), transition.successorRegistration); return response("Accept", activity, transition);
    });
  }
  if (operation === "retire-schedule") {
    return withScheduleMutationLock(sectionRoot(options), async () => {
      const rejectRetirement = (code, reason) => refusal(activity, code, reason, RETIREMENT_CONTRACT);
      await witness(ledger, activity, "retirement.received", at);
      const request = activity?.object;
      const scheduleId = request?.scheduleId;
      const registration = registrations(ledger).find((item) => item.scheduleId === scheduleId);
      if (activity?.["@context"] !== CONTEXT || activity.type !== "Undo" || activity.target !== ACTOR || request?.type !== "ScheduleRetirementRequest" || request.contract !== RETIREMENT_CONTRACT || typeof scheduleId !== "string") return rejectRetirement("wrong-retirement-boundary", "retirement must be an ActivityStreams Undo<ScheduleRetirementRequest> addressed to this provider");
      if (!registration) return rejectRetirement("unknown-schedule", "retirement names no provider-owned schedule");
      if (activity.actor !== registration.customer) return rejectRetirement("wrong-customer", "only the registered customer may retire its schedule");
      const cap = request.capability;
      if (cap?.type !== "Capability" || cap.issuer !== activity.actor || cap.holder !== ACTOR || cap.invocationTarget !== ACTOR || cap.attenuation?.scheduleId !== scheduleId || cap.singleUse !== true || !validInstant(cap.expiresAt) || Date.parse(cap.expiresAt) < Date.parse(at) || !sameSet(cap.allowedActions, ["retire-schedule"])) return rejectRetirement("invalid-retirement-capability", "exact unexpired single-use schedule retirement capability is required");
      const requestDigest = digest(activity);
      const prior = retirements(ledger).find((item) => item.scheduleId === scheduleId);
      if (prior) { retireActiveSchedule(sectionRoot(options), prior); return response("Accept", activity, prior); }
      const retirement = { type: "ScheduleRetirement", id: id({ scheduleId, requestDigest }), scheduleId, provider: ACTOR, customer: activity.actor, contract: RETIREMENT_CONTRACT, requestDigest, registrationDigest: digest(registration), status: "retired", retiredAt: at, customerTerritoryMutation: false };
      // Suspend delivery before the authoritative append. If this process is
      // interrupted, omission is recoverable on retry; delivering a schedule
      // after its accepted retirement is not.
      retireActiveSchedule(sectionRoot(options), retirement); await append(ledger, "schedule-retirements", retirement, at); await witness(ledger, retirement, "schedule.retired", at, { scheduleId }); return response("Accept", activity, retirement);
    });
  }
  return refusal(activity, "unknown-operation", `unknown operation ${operation}`);
}

function pendingSettlementPath(root, scheduleId, occurrence) { return dataCustodyDirectory(root, "state", "pending-delivery-settlements", digest(scheduleId).slice("ni:///sha-256;".length), `${occurrence}.rmn.cbor`); }
function confirmedSettlementPath(root, scheduleId, occurrence) { return dataCustodyDirectory(root, "state", "confirmed-delivery-settlements", digest(scheduleId).slice("ni:///sha-256;".length), `${occurrence}.rmn.cbor`); }
function attemptDirectory(root, scheduleId) { return dataCustodyDirectory(root, "state", "pending-delivery-attempts", digest(scheduleId).slice("ni:///sha-256;".length)); }
function attemptPath(root, scheduleId, occurrence) { return join(attemptDirectory(root, scheduleId), `${occurrence}.rmn.cbor`); }
function recoveryAttemptPath(root, scheduleId, occurrence) { return dataCustodyDirectory(root, "state", "pending-delivery-recovery", digest(scheduleId).slice("ni:///sha-256;".length), `${occurrence}.rmn.cbor`); }
function readDeliveryAttemptCell(root, path) {
  const admission = admitDurableCell(root, path), attempt = admission.value;
  const body = Object.fromEntries(Object.entries(attempt ?? {}).filter(([key]) => key !== "id"));
  if (attempt?.type !== "ScheduledDeliveryAttempt" || attempt.id !== admission.recordDigest(body) || typeof attempt.scheduleId !== "string" || !Number.isSafeInteger(attempt.occurrence) || !validInstant(attempt.scheduledFor) || !validInstant(attempt.attemptedAt) || !validInstant(attempt.recoverAfter) || attempt.activityDigest !== admission.recordDigest(attempt.activity)) throw new Error("invalid durable delivery attempt");
  projectLegacyDurableCell(root, path, admission);
  return { attempt, admission };
}
function readDeliveryAttempt(root, path) { return readDeliveryAttemptCell(root, path).attempt; }
function writeDeliveryAttempt(root, attempt) {
  const path = attemptPath(root, attempt.scheduleId, attempt.occurrence); let written;
  if (existsSync(path)) { readDeliveryAttempt(root, path); written = false; }
  else {
    try { written = publishDurableCell(path, canonical(attempt)); }
    catch (error) { if (!existsSync(path)) throw error; readDeliveryAttempt(root, path); written = false; }
  }
  publishDurableCell(recoveryAttemptPath(root, attempt.scheduleId, attempt.occurrence), durableProjectionBytes({ type: "PendingDeliveryRecovery", scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, attempt: attempt.id, customerTerritoryMutation: false }));
  return written;
}
function occurrenceReserved(root, scheduleId, occurrence) {
  return existsSync(attemptPath(root, scheduleId, occurrence)) || existsSync(pendingSettlementPath(root, scheduleId, occurrence)) || existsSync(confirmedSettlementPath(root, scheduleId, occurrence));
}
function reservedOccurrenceCount(root, scheduleId) {
  // A finite schedule is capped at 10,000 deliveries by admission law.  This
  // reads directory names only, and is never used for unbounded schedules.
  const directories = [attemptDirectory(root, scheduleId), dirname(pendingSettlementPath(root, scheduleId, 0)), dirname(confirmedSettlementPath(root, scheduleId, 0))];
  const occurrences = new Set();
  for (const directory of directories) {
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".rmn.cbor")) continue;
      const occurrence = Number(entry.name.slice(0, -".rmn.cbor".length));
      if (Number.isSafeInteger(occurrence) && occurrence >= 0) occurrences.add(occurrence);
    }
  }
  return occurrences.size;
}
function deliveryAttemptFiles(root) {
  const found = [];
  const visit = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child); else if (entry.isFile() && entry.name.endsWith(".rmn.cbor")) found.push(child);
    }
  };
  visit(dataCustodyDirectory(root, "state", "pending-delivery-attempts")); return found.sort();
}
function *iterateDeliveryAttemptFiles(root) {
  const visit = function *(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) yield* visit(child);
      else if (entry.isFile() && entry.name.endsWith(".rmn.cbor")) yield child;
    }
  };
  yield* visit(dataCustodyDirectory(root, "state", "pending-delivery-attempts"));
}
function readDeliveryAttempts(root) {
  return deliveryAttemptFiles(root).map((path) => {
    try {
      const { attempt, admission } = readDeliveryAttemptCell(root, path);
      return { path, attempt, admission, error: null };
    } catch (error) { return { path, attempt: null, error }; }
  });
}
export function migratePendingDeliveryAttemptCells(options = {}) {
  const root = sectionRoot(options), candidates = readDeliveryAttempts(root);
  return {
    type: "PendingDeliveryAttemptCellMigrationResult",
    admitted: candidates.filter((candidate) => !candidate.error).length,
    legacy: candidates.filter((candidate) => candidate.admission?.format === LEGACY_DURABLE_CELL_FORMAT).length,
    refused: candidates.filter((candidate) => candidate.error).map((candidate) => ({ sourcePath: relative(root, candidate.path).split(sep).join("/"), errorDigest: digest(candidate.error instanceof Error ? candidate.error.message : String(candidate.error)) })),
    rawCellsPreserved: true,
    customerTerritoryMutation: false,
  };
}
function pendingSettlementFiles(root) {
  const found = [];
  const visit = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child); else if (entry.isFile() && entry.name.endsWith(".rmn.cbor")) found.push(child);
    }
  };
  visit(dataCustodyDirectory(root, "state", "pending-delivery-settlements")); return found.sort();
}
function writePendingSettlement(root, receipt, recordedAt) {
  const path = pendingSettlementPath(root, receipt.scheduleId, receipt.occurrence);
  const bytes = canonical({ type: "PendingDeliverySettlement", receipt, recordedAt });
  publishDurableCell(path, bytes);
}
function confirmPendingSettlement(root, receipt) {
  const path = confirmedSettlementPath(root, receipt.scheduleId, receipt.occurrence), bytes = canonical({ type: "DeliverySettlementProjectionConfirmed", receipt: receipt.id, scheduleId: receipt.scheduleId, occurrence: receipt.occurrence, appendOnly: true });
  publishDurableCell(path, bytes);
}
function readPendingSettlements(root) {
  return pendingSettlementFiles(root).filter((path) => {
    const occurrence = Number(path.split(sep).at(-1).replace(/\.rmn\.cbor$/u, "")), scheduleDigest = path.split(sep).at(-2);
    return !existsSync(dataCustodyDirectory(root, "state", "confirmed-delivery-settlements", scheduleDigest, `${occurrence}.rmn.cbor`));
  }).map((path) => {
    try {
      const admission = admitDurableCell(root, path), pending = admission.value;
      if (pending?.type !== "PendingDeliverySettlement" || pending.receipt?.type !== "ScheduledDeliveryReceipt" || !validInstant(pending.recordedAt)) throw new Error("invalid pending delivery settlement");
      projectLegacyDurableCell(root, path, admission);
      return { path, pending, admission, error: null };
    } catch (error) { return { path, pending: null, error }; }
  });
}
async function ensureDeliverySettlement(ledger, pending, state = null) {
  const receipt = pending.receipt; const details = { scheduleId: receipt.scheduleId, occurrence: receipt.occurrence, disposition: receipt.disposition };
  const receiptIds = state?.receiptIds ?? new Set(records(ledger, "delivery-receipts").map((item) => item.id));
  const eventIds = state?.eventIds ?? new Set(records(ledger, "events").map((item) => item.id));
  if (!receiptIds.has(receipt.id)) { await append(ledger, "delivery-receipts", receipt, pending.recordedAt); receiptIds.add(receipt.id); }
  const event = eventRecord(receipt, "delivery.settled", pending.recordedAt, details);
  if (!eventIds.has(event.id)) { await append(ledger, "events", event, pending.recordedAt); eventIds.add(event.id); }
  return receipt;
}
async function reconcilePendingSettlements(root, ledger) {
  const recovered = []; const failures = [], state = { receiptIds: new Set(records(ledger, "delivery-receipts").map((item) => item.id)), eventIds: new Set(records(ledger, "events").map((item) => item.id)) };
  for (const candidate of readPendingSettlements(root)) {
    if (candidate.error) { failures.push({ type: "PendingDeliverySettlementResidue", receipt: null, scheduleId: null, occurrence: null, sourceDigest: digest(candidate.path), errorDigest: digest(candidate.error instanceof Error ? candidate.error.message : String(candidate.error)), customerTerritoryMutation: false }); continue; }
    const pending = candidate.pending;
    const receiptPresent = state.receiptIds.has(pending.receipt.id);
    const details = { scheduleId: pending.receipt.scheduleId, occurrence: pending.receipt.occurrence, disposition: pending.receipt.disposition };
    const eventPresent = state.eventIds.has(eventRecord(pending.receipt, "delivery.settled", pending.recordedAt, details).id);
    if (receiptPresent && eventPresent) { confirmPendingSettlement(root, pending.receipt); continue; }
    try { await ensureDeliverySettlement(ledger, pending, state); confirmPendingSettlement(root, pending.receipt); recovered.push(pending.receipt.id); }
    catch (error) { failures.push({ type: "PendingDeliverySettlementResidue", receipt: pending.receipt.id, scheduleId: pending.receipt.scheduleId, occurrence: pending.receipt.occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
  }
  return { recovered, failures };
}
async function reconcileInterruptedAttempts(root, ledger, at) {
  const recovered = [], failures = [], attemptOccurrences = new Map(); const receiptOccurrences = new Set(records(ledger, "delivery-receipts").map((item) => `${item.scheduleId}\n${item.occurrence}`));
  for (const candidate of readDeliveryAttempts(root)) {
    if (candidate.error) { failures.push({ type: "InterruptedDeliveryAttemptResidue", attempt: null, errorDigest: digest(candidate.error instanceof Error ? candidate.error.message : String(candidate.error)), customerTerritoryMutation: false }); continue; }
    const attempt = candidate.attempt, key = `${attempt.scheduleId}\n${attempt.occurrence}`;
    if (!attemptOccurrences.has(attempt.scheduleId)) attemptOccurrences.set(attempt.scheduleId, new Set());
    attemptOccurrences.get(attempt.scheduleId).add(attempt.occurrence);
    if (receiptOccurrences.has(key) || existsSync(confirmedSettlementPath(root, attempt.scheduleId, attempt.occurrence)) || existsSync(pendingSettlementPath(root, attempt.scheduleId, attempt.occurrence)) || Date.parse(at) < Date.parse(attempt.recoverAfter)) continue;
    const body = { type: "ScheduledDeliveryReceipt", attempt: attempt.id, scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, scheduledFor: attempt.scheduledFor, attemptedAt: attempt.attemptedAt, activity: attempt.activity, activityDigest: attempt.activityDigest, disposition: "outcome-unknown-after-interruption", targetResponse: null, targetResponseDigest: null, process: { status: null, signal: null, stderrDigest: digest("provider-interrupted-after-attempt-intent"), wallTimeMilliseconds: null }, retryAuthorized: false, customerTerritoryMutation: false };
    const receipt = { id: id({ scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, attempt: attempt.id, activity: attempt.activity, disposition: body.disposition, response: null }), ...body };
    const pending = { type: "PendingDeliverySettlement", receipt, recordedAt: at }; writePendingSettlement(root, receipt, at);
    try { await ensureDeliverySettlement(ledger, pending); confirmPendingSettlement(root, receipt); receiptOccurrences.add(key); recovered.push(receipt.id); }
    catch (error) { failures.push({ type: "InterruptedDeliveryAttemptResidue", attempt: attempt.id, receipt: receipt.id, scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
  }
  return { recovered, failures, attemptOccurrences };
}
function *recoveryAttemptCells(root, at, limit = 32) {
  const directory = dataCustodyDirectory(root, "state", "pending-delivery-recovery");
  if (!existsSync(directory)) return;
  const minute = Math.floor(Date.parse(at) / 60_000);
  const shards = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(bytewiseTextOrder);
  if (shards.length === 0) return;
  let yielded = 0;
  for (let shardIndex = 0; shardIndex < shards.length && yielded < limit; shardIndex += 1) {
    const shard = shards[(minute + shardIndex) % shards.length], shardPath = join(directory, shard);
    const cells = readdirSync(shardPath, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".rmn.cbor")).map((entry) => entry.name).sort(bytewiseTextOrder);
    if (cells.length === 0) continue;
    for (let cellIndex = 0; cellIndex < cells.length && yielded < limit; cellIndex += 1) {
      yielded += 1;
      yield join(shardPath, cells[(minute + cellIndex) % cells.length]);
    }
  }
}
async function reconcileRecoveryQueue(root, ledger, at) {
  const recovered = [], failures = [];
  for (const marker of recoveryAttemptCells(root, at)) {
    try {
      const scheduleDigest = dirname(marker).split(sep).at(-1), occurrence = Number(marker.split(sep).at(-1).replace(/\.rmn\.cbor$/u, ""));
      // The marker is merely a bounded work coordinate; the signed attempt is
      // always re-admitted from its original durable cell.
      const attemptsRoot = dataCustodyDirectory(root, "state", "pending-delivery-attempts", scheduleDigest), attempt = readDeliveryAttempt(root, join(attemptsRoot, `${occurrence}.rmn.cbor`));
      if (existsSync(confirmedSettlementPath(root, attempt.scheduleId, attempt.occurrence))) { unlinkSync(marker); continue; }
      if (existsSync(pendingSettlementPath(root, attempt.scheduleId, attempt.occurrence))) {
        const pendingAdmission = admitDurableCell(root, pendingSettlementPath(root, attempt.scheduleId, attempt.occurrence)), pending = pendingAdmission.value;
        if (pending?.type !== "PendingDeliverySettlement" || pending.receipt?.id === undefined || !validInstant(pending.recordedAt)) throw new Error("invalid pending delivery settlement");
        await ensureDeliverySettlement(ledger, pending, { receiptIds: new Set(), eventIds: new Set() }); confirmPendingSettlement(root, pending.receipt); unlinkSync(marker); recovered.push(pending.receipt.id); continue;
      }
      if (Date.parse(at) < Date.parse(attempt.recoverAfter)) continue;
      const body = { type: "ScheduledDeliveryReceipt", attempt: attempt.id, scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, scheduledFor: attempt.scheduledFor, attemptedAt: attempt.attemptedAt, activity: attempt.activity, activityDigest: attempt.activityDigest, disposition: "outcome-unknown-after-interruption", targetResponse: null, targetResponseDigest: null, process: { status: null, signal: null, stderrDigest: digest("provider-interrupted-after-attempt-intent"), wallTimeMilliseconds: null }, retryAuthorized: false, customerTerritoryMutation: false };
      const receipt = { id: id({ scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, attempt: attempt.id, activity: attempt.activity, disposition: body.disposition, response: null }), ...body }, pending = { type: "PendingDeliverySettlement", receipt, recordedAt: at };
      writePendingSettlement(root, receipt, at); await ensureDeliverySettlement(ledger, pending, { receiptIds: new Set(), eventIds: new Set() }); confirmPendingSettlement(root, receipt); unlinkSync(marker); recovered.push(receipt.id);
    } catch (error) { failures.push({ type: "InterruptedDeliveryAttemptResidue", errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
  }
  return { recovered, failures };
}
function deliveredActivity(registration, occurrence, scheduledFor, at) {
  const template = registration.request.activityTemplate;
  const { object: _templateObject, ...templateEnvelope } = template;
  const demand = { ...template.object, pulseId: `${registration.scheduleId}#${occurrence}` };
  // ActivityPub only standardizes its public carrier.  A customer's private
  // capability and demand vocabulary belongs inside a typed document; putting
  // unknown terms directly on an Activity causes conforming JSON-LD processors
  // to discard them before the customer can inspect the work order.
  const activityPubDelivery = registration.request.target.contract === "activitypub-services-section/signed-delivery/v1";
  const object = activityPubDelivery
    ? {
        type: "Document",
        mediaType: "application/vnd.emsenn.rmn+json",
        content: JSON.stringify({
          type: "ScheduledActivityWorkOrder",
          capability: registration.request.deliveryCapabilityId,
          demand,
        }),
      }
    : demand;
  const body = {
    ...templateEnvelope,
    actor: ACTOR,
    target: template.target,
    ...(activityPubDelivery ? {} : { capability: registration.request.deliveryCapabilityId }),
    published: at,
    object,
  };
  return { id: id(body), ...body };
}
function admittedTargetEnvironment() {
  const names = configuredEnvironmentNames("SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST");
  return Object.fromEntries(names.flatMap((name) => process.env[name] === undefined ? [] : [[name, process.env[name]]]));
}
function configuredEnvironmentNames(variable) {
  const raw = String(process.env[variable] ?? "");
  if (!raw) return [];
  const names = raw.split(",").map((name) => name.trim());
  if (names.some((name) => !/^[A-Z][A-Z0-9_]*$/u.test(name)) || new Set(names).size !== names.length) throw new Error(`${variable} is not a unique list of safe environment names`);
  return names;
}
function admittedTargetReadOnlyPaths() {
  return [...new Set(Object.values(admittedTargetEnvironment()).filter((value) => isAbsolute(value ?? "")))].map((path) => {
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || (!lstatSync(path).isFile() && !lstatSync(path).isDirectory())) throw new Error("admitted target environment path is absent or unsafe");
    const resolved = realpathSync(path);
    if (resolved !== resolve(path)) throw new Error("admitted target environment path traverses a symlink");
    try { accessSync(path, constants.R_OK | (lstatSync(path).isDirectory() ? constants.X_OK : 0)); }
    catch { throw new Error("admitted target environment path is not readable by the service account"); }
    return resolved;
  });
}
function admittedTargetWritableRoots() {
  const configured = configuredEnvironmentNames("SCHEDULED_ACTIVITY_DELIVERY_TARGET_WRITABLE_ROOT_ENV_ALLOWLIST");
  const admitted = configuredEnvironmentNames("SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST");
  if (configured.some((name) => !admitted.includes(name))) throw new Error("target writable-root environment name is not admitted to the target");
  if (configured.length === 0) return [];
  const roots = configured.map((name) => process.env[name]);
  if (roots.some((path) => !isAbsolute(path ?? "") || !existsSync(path) || !lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink())) throw new Error("target writable root is absent, unsafe, or not an absolute directory");
  const normalized = roots.map((path) => resolve(path));
  if (new Set(normalized).size !== normalized.length || normalized.some((path) => ["/", "/home", "/root", "/run", "/run/user"].includes(path))) throw new Error("target writable roots must be distinct and not broad host directories");
  const resolved = roots.map((path) => realpathSync(path));
  if (resolved.some((path, index) => path !== normalized[index])) throw new Error("target writable root traverses a symlink");
  try { for (const path of roots) accessSync(path, constants.R_OK | constants.W_OK | constants.X_OK); }
  catch { throw new Error("target writable root is not readable, writable, and searchable by the service account"); }
  return resolved;
}
function maskedParentDirectories(paths) {
  const masked = ["/home", "/root", "/run/user"];
  const directories = new Set();
  for (const path of paths) for (const root of masked) if (path.startsWith(`${root}/`)) {
    let current = dirname(path);
    while (current.startsWith(`${root}/`)) { directories.add(current); current = dirname(current); }
  }
  return [...directories].sort((left, right) => left.length - right.length);
}
export async function invokeTarget(registration, activity, options = {}) {
  if (registration.request.executionMode === "dry-run") return { status: 0, signal: null, stdout: "", stderr: "", response: null, problem: null, dryRun: true, customerTerritoryMutationAuthorized: false };
  if (typeof options.targetInvoker === "function") return await options.targetInvoker(registration, activity);
  const inspected = inspectTarget(registration.request.target); if (inspected.problem) return { status: null, signal: null, stdout: "", stderr: inspected.problem, response: null, problem: "target-runtime-inspection-failed", dryRun: false };
  if (!sameSemantic(registration.targetBinding, targetBindingFor(registration.request, inspected))) return { status: null, signal: null, stdout: "", stderr: "target package or selected bin changed after schedule registration", response: null, problem: "target-runtime-closure-changed", dryRun: false };
  // Own the complete target process tree. Node's spawnSync timeout only
  // terminates its immediate child; a target can launch inference clients or
  // deployment tools which would otherwise survive it and starve the colony.
  // GNU timeout creates and terminates the foreground process group, while
  // nice keeps an admitted long-running issue below interactive recovery work.
  let isolationExecutables;
  try { isolationExecutables = resolveTargetIsolationExecutables(); }
  catch (error) { return { status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), response: null, problem: "target-runtime-isolation-unavailable", dryRun: false }; }
  const { timeout: timeoutExecutable, nice: niceExecutable, bwrap: bwrapExecutable } = isolationExecutables;
  let writableRoots;
  try { writableRoots = admittedTargetWritableRoots(); }
  catch (error) { return { status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), response: null, problem: "target-runtime-isolation-unavailable", dryRun: false }; }
  let readOnlyPaths, nodeExecutable;
  try { readOnlyPaths = admittedTargetReadOnlyPaths(); nodeExecutable = realpathSync(process.execPath); if (!lstatSync(nodeExecutable).isFile() || lstatSync(nodeExecutable).isSymbolicLink()) throw new Error("Node executable is unsafe"); }
  catch (error) { return { status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), response: null, problem: "target-runtime-isolation-unavailable", dryRun: false }; }
  let image;
  try { image = immutableRuntimeImage(registration, inspected, options); }
  catch (error) { return { status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.message : String(error), response: null, problem: "target-runtime-image-failed", dryRun: false }; }
  const timeoutSeconds = (registration.request.timeoutMilliseconds / 1000).toFixed(3).replace(/\.?0+$/u, "");
  const hardStopGraceMilliseconds = options.hardStopGraceMilliseconds ?? 20_000;
  if (!Number.isSafeInteger(hardStopGraceMilliseconds) || hardStopGraceMilliseconds < 0 || hardStopGraceMilliseconds > 20_000) throw new Error("ScheduleDelivery hard-stop grace is outside the provider bound");
  // Use the timeout option subset shared by GNU coreutils and the uutils
  // coreutils installed on Cold Red Gate. uutils 0.2.2 returns 125 for
  // --kill-after; the service cgroup remains the hard-stop boundary.
  const result = await new Promise((resolveInvocation) => {
    // Bubblewrap starts from a read-only host root, replaces proc/dev/tmp, and
    // overlays only the captured digest-committed target files. Its sole
    // writable host mounts are provider-configured fixed roots, never paths
    // carried by a customer schedule.
    const reconstructionPaths = [nodeExecutable, registration.request.target.packageRoot, ...readOnlyPaths, ...writableRoots];
    // Bubblewrap's default user-namespace process has empty inheritable,
    // permitted, effective, bounding, and ambient capability sets and
    // NoNewPrivs=1. Preflight measures that kernel state on the actual host.
    const sandboxArguments = ["--die-with-parent", "--new-session", "--unshare-user", "--uid", "0", "--gid", "0", "--ro-bind", "/", "/", "--tmpfs", "/home", "--tmpfs", "/root", "--tmpfs", "/run/user", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", ...maskedParentDirectories(reconstructionPaths).flatMap((path) => ["--dir", path]), "--ro-bind", image.imageRoot, registration.request.target.packageRoot, "--ro-bind", nodeExecutable, nodeExecutable, ...readOnlyPaths.flatMap((path) => ["--ro-bind", path, path]), ...writableRoots.flatMap((path) => ["--bind", path, path]), "--", nodeExecutable, inspected.entry];
    const child = spawn(timeoutExecutable, ["--signal=TERM", `${timeoutSeconds}s`, niceExecutable, "-n", "10", bwrapExecutable, ...sandboxArguments], {
      cwd: registration.request.target.packageRoot,
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    // Target resources remain denied by default. A colony deployment may grant
    // named, non-secret service addresses through one explicit allowlist; this
    // makes a scheduled contract capable of hiring its declared providers
    // without leaking the ScheduleDelivery's ambient process environment.
      env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NO_COLOR: "1", ...admittedTargetEnvironment() },
    });
    const maximum = 16 * 1024 * 1024; const stdout = []; const stderr = []; let stdoutBytes = 0; let stderrBytes = 0; let overflow = false; let spawnError = null;
    const collect = (chunks, key) => (chunk) => {
      if (key === "stdout") stdoutBytes += chunk.length; else stderrBytes += chunk.length;
      if (stdoutBytes > maximum || stderrBytes > maximum) { overflow = true; child.kill("SIGTERM"); return; }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout, "stdout")); child.stderr.on("data", collect(stderr, "stderr")); child.on("error", (error) => { spawnError = error; }); child.stdin.on("error", (error) => { spawnError ??= error; });
    const hardStop = setTimeout(() => {
      try { process.kill(-child.pid, "SIGKILL"); }
      catch (error) { if (error?.code !== "ESRCH") { spawnError ??= error; child.kill("SIGKILL"); } }
    }, registration.request.timeoutMilliseconds + hardStopGraceMilliseconds);
    child.on("close", (status, signal) => { clearTimeout(hardStop); resolveInvocation({ status, signal, stdout: Buffer.concat(stdout).toString("utf8"), stderr: overflow ? "target output exceeded 16 MiB" : spawnError?.stack ?? Buffer.concat(stderr).toString("utf8") }); });
    child.stdin.end(`${JSON.stringify(activity)}\n`);
  });
  let parsed = null; try { parsed = JSON.parse(result.stdout); } catch { /* recorded as transport failure */ }
  // A live target may truthfully report a customer-territory effect only when
  // this carrier actually admitted one or more fixed writable roots into its
  // Bubblewrap mount graph.  The target never gets authority from its own
  // receipt: the flag merely attests to this already-enforced carrier fact.
  return { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, response: parsed, problem: parsed === null ? "target-response-unparseable" : null, dryRun: false, customerTerritoryMutationAuthorized: writableRoots.length > 0 };
}

async function invokeFairly(attempts, maximum = MAX_CONCURRENT_TARGETS) {
  const completed = new Array(attempts.length); let cursor = 0;
  const worker = async () => {
    while (cursor < attempts.length) {
      const index = cursor; cursor += 1; const attempt = attempts[index], started = Date.now();
      const invoked = await invokeTarget(attempt.registration, attempt.activity, attempt.options).catch((error) => ({ status: null, signal: null, stdout: "", stderr: error instanceof Error ? error.stack ?? error.message : String(error), response: null, problem: "target-invocation-failed", dryRun: false }));
      completed[index] = { ...attempt, started, invoked };
    }
  };
  await Promise.all(Array.from({ length: Math.min(maximum, attempts.length) }, () => worker())); return completed;
}

export function targetResponseProblem(response, registration, activity, options = {}) {
  const object = response?.object;
  if (response?.["@context"] !== CONTEXT) return "foreign-context";
  if (response?.actor !== registration?.request?.target?.actor) return "foreign-target-actor";
  if (response?.target !== ACTOR) return "foreign-provider-target";
  if (response?.inReplyTo !== activity?.id) return "foreign-reply";
  if (typeof object?.type !== "string") return "missing-target-response-type";
  if (object.contract !== registration?.request?.target?.contract) return "foreign-target-contract";
  if (object.customerTerritoryMutation !== false && object.customerTerritoryMutation !== true) return "target-mutation-claim";
  if (object.customerTerritoryMutation === true && !(response.type === "Accept" && options.customerTerritoryMutationAuthorized === true)) return "target-mutation-claim";
  if (response.type === "Accept") return null;
  if (response.type === "Reject" && /Refusal$/u.test(object.type) && typeof object.reason === "string" && object.reason) return null;
  return "unsupported-target-decision";
}
function targetDecisionType(response, registration, activity, options = {}) {
  if (targetResponseProblem(response, registration, activity, options)) return null;
  if (response.type === "Accept") return "accept";
  if (response.type === "Reject") return "reject";
  return null;
}

function contentJournalPaths(root) {
  const found = [];
  const visit = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name === "witness-journal-seavt.jsonl") found.push(path);
    }
  };
  visit(join(root, "data", "logs")); return found.sort();
}
async function *streamJournalRows(root) {
  for (const path of contentJournalPaths(root)) {
    const reader = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const line of reader) {
      if (!line.trim()) continue;
      let row; try { row = JSON.parse(line); } catch { throw new Error(`invalid semantic record journal JSONL row: ${path}`); }
      if (!row || typeof row !== "object" || !Object.hasOwn(row, "e") || !Object.hasOwn(row, "a") || !Object.hasOwn(row, "v")) throw new Error(`invalid direct-RMN SEAVT row: ${path}`);
      const decoded = { ...row, e: termToJson(row.e), a: termToJson(row.a), v: termToJson(row.v) };
      if (typeof decoded.a !== "string" || typeof decoded.e !== "string" || identify(decoded.v, RECORD_KIND).id !== decoded.e) throw new Error(`invalid direct-RMN SEAVT identity: ${path}`);
      yield decoded;
    }
  }
}
// This is a local, streaming projection repair.  It invokes no target and
// reserves no new occurrence, so an operator can migrate Cold Red Gate's
// legacy history before separately enabling its timer.
export async function migrateScheduleDeliveryProjections(options = {}) {
  const root = sectionRoot(options), registrationsById = new Map(), retirementsById = new Map(); let rows = 0, receipts = 0, recoveryAttempts = 0;
  const categories = new Set([CONTRACT, ...PREDECESSOR_CONTRACTS]);
  for await (const row of streamJournalRows(root)) {
    const match = [...categories].find((contract) => row.a === `${contract}.schedules` || row.a === `${contract}.schedule-transitions` || row.a === `${contract}.schedule-retirements` || row.a === `${contract}.delivery-receipts`);
    if (!match) continue;
    rows += 1;
    if (row.a === `${match}.schedules` && row.v?.type === "ScheduleRegistration") registrationsById.set(row.v.scheduleId, row.v);
    if (row.a === `${match}.schedule-transitions` && row.v?.type === "ScheduleTransition") {
      registrationsById.set(row.v.successorRegistration?.scheduleId, row.v.successorRegistration);
      retirementsById.set(row.v.predecessorRetirement?.scheduleId, row.v.predecessorRetirement);
    }
    if (row.a === `${match}.schedule-retirements` && row.v?.type === "ScheduleRetirement") retirementsById.set(row.v.scheduleId, row.v);
    if (row.a === `${match}.delivery-receipts` && row.v?.type === "ScheduledDeliveryReceipt" && typeof row.v.scheduleId === "string" && Number.isSafeInteger(row.v.occurrence)) {
      const receipt = row.v;
      confirmPendingSettlement(root, receipt); receipts += 1;
    }
  }
  for (const path of iterateDeliveryAttemptFiles(root)) {
    const attempt = readDeliveryAttempt(root, path);
    if (!existsSync(confirmedSettlementPath(root, attempt.scheduleId, attempt.occurrence))) publishDurableCell(recoveryAttemptPath(root, attempt.scheduleId, attempt.occurrence), durableProjectionBytes({ type: "PendingDeliveryRecovery", scheduleId: attempt.scheduleId, occurrence: attempt.occurrence, attempt: attempt.id, customerTerritoryMutation: false }));
    recoveryAttempts += 1;
  }
  let active = 0;
  for (const registration of registrationsById.values()) {
    if (!registration || typeof registration.scheduleId !== "string") continue;
    const retirement = retirementsById.get(registration.scheduleId);
    if (retirement) retireActiveSchedule(root, retirement);
    else { projectActiveSchedule(root, registration); active += 1; }
  }
  return Object.freeze({ type: "ScheduledActivityDeliveryProjectionMigration", journalRows: rows, activeSchedules: active, retiredSchedules: retirementsById.size, receiptReservations: receipts, recoveryAttempts, deliveryActivated: false, customerTerritoryMutation: false });
}

/**
 * Floors an ISO 8601 instant to whole seconds, the precision RFC 5545's basic UTC date-time form carries.
 * @param {string} instant An ISO 8601 UTC instant, any fractional-second precision.
 * @returns {string} The same instant with its fractional seconds dropped, still ISO 8601 UTC.
 */
function toIsoWholeSecondUtc(instant) {
  return new Date(instant).toISOString().replace(/\.\d{3}Z$/u, "Z");
}

/**
 * Formats an ISO 8601 UTC instant as an RFC 5545 basic UTC date-time ("YYYYMMDDTHHMMSSZ"), the DTSTART form expand-recurrence-rule-service requires.
 * @param {string} instant An ISO 8601 UTC instant, any fractional-second precision.
 * @returns {string} The equivalent RFC 5545 basic UTC date-time.
 */
function toBasicUtcDateTime(instant) {
  return toIsoWholeSecondUtc(instant).replace(/[-:]/gu, "");
}

/**
 * Finds a schedule's most recent recurrence instance at or before `at`, expressing the schedule's firstDueAt/intervalSeconds pair as an RFC 5545 VEVENT (a FREQ=SECONDLY;INTERVAL=n RRULE) and composing expand-recurrence-rule-service for the recurrence arithmetic, rather than hand-rolled interval division.
 * @param {{firstDueAt: string, intervalSeconds: number}} schedule The schedule's first-due instant and its whole-second recurrence interval.
 * @param {string} at The current instant to evaluate recurrence up to (inclusive).
 * @returns {{occurrence: number, scheduledFor: string}|null} The zero-based occurrence index and its ISO 8601 UTC instant, or null when no occurrence has yet fallen at or before `at`.
 */
function mostRecentScheduleOccurrence(schedule, at) {
  const windowStart = toIsoWholeSecondUtc(schedule.firstDueAt);
  if (Date.parse(at) < Date.parse(windowStart)) return null;
  const { occurrences } = expandRecurrenceRule({
    dtstart: toBasicUtcDateTime(schedule.firstDueAt),
    rrule: `FREQ=SECONDLY;INTERVAL=${schedule.intervalSeconds}`,
    window: { start: windowStart, end: at },
  });
  if (occurrences.length === 0) return null;
  return { occurrence: occurrences.length - 1, scheduledFor: occurrences[occurrences.length - 1] };
}

export async function runDue(at = new Date().toISOString(), options = {}) {
  if (!validInstant(at)) throw new Error("run-due requires an explicit valid instant");
  // Timer work must be proportional to accepted active schedules, not to the
  // append-only delivery history.  In particular, do not replace this with a
  // journal snapshot: Cold Red Gate has years of tiny reservation cells.
  const root = sectionRoot(options), replay = readTickResult(tickResultPath(root, at));
  if (replay) return replay;
  const ledger = options.ledger ?? store(options); const attempts = []; const results = []; const recovery = await reconcileRecoveryQueue(root, ledger, at); const settlementFailures = [...recovery.failures];
  // Kept only for programmatic compatibility fixtures that inject a ledger.
  // The installed timer never supplies one; it must use the explicit,
  // streaming migration below rather than recurse through historic attempts.
  if (options.ledger && !existsSync(dataCustodyDirectory(root, "state", "active-schedule-projections"))) migratePendingDeliveryAttemptCells({ root });
  const active = activeScheduleProjections(root);
  // Bound target work per timer activation. The time-derived rotation is
  // stateless (there is no cursor to corrupt) and moves by one full dispatch
  // window each minute, so every admitted active schedule is eventually seen.
  const offset = active.length === 0 ? 0 : (Math.floor(Date.parse(at) / 60_000) * MAX_TARGETS_PER_TICK) % active.length;
  const dispatchWindow = active.length <= MAX_TARGETS_PER_TICK
    ? active
    : Array.from({ length: MAX_TARGETS_PER_TICK }, (_, index) => active[(offset + index) % active.length]);
  for (const registration of dispatchWindow) {
    if (registration.status !== "active") continue;
    const due = mostRecentScheduleOccurrence(registration.request.schedule, at); if (due === null) continue;
    const { occurrence, scheduledFor } = due;
    if (registration.request.schedule.maxDeliveries !== null && reservedOccurrenceCount(root, registration.scheduleId) >= registration.request.schedule.maxDeliveries) continue;
    if (occurrenceReserved(root, registration.scheduleId, occurrence)) continue;
    const activity = deliveredActivity(registration, occurrence, scheduledFor, at);
    const attemptBody = { type: "ScheduledDeliveryAttempt", scheduleId: registration.scheduleId, occurrence, scheduledFor, attemptedAt: at, recoverAfter: new Date(Date.parse(at) + registration.request.timeoutMilliseconds + 20_000).toISOString(), activity, activityDigest: digest(activity), targetBinding: registration.targetBinding, retryAuthorized: false, customerTerritoryMutation: false };
    const attempt = { id: id(attemptBody), ...attemptBody }; if (!writeDeliveryAttempt(root, attempt)) continue;
    attempts.push({ registration, occurrence, scheduledFor, activity, attempt, options });
  }
  const completed = await invokeFairly(attempts);
  // Target work is concurrent, but append-only settlement remains serialized
  // so a slow enterprise cannot monopolize the clock and a flaky WitnessJournal carrier
  // is not needlessly flooded by simultaneous projections.
  for (const { registration, occurrence, scheduledFor, activity, attempt, started, invoked } of completed) {
    const targetProblem = invoked.dryRun ? null : invoked.problem ?? targetResponseProblem(invoked.response, registration, activity, invoked);
    const targetDecision = invoked.dryRun ? null : targetDecisionType(invoked.response, registration, activity, invoked);
    const disposition = invoked.dryRun ? "dry-run" : targetDecision ? `target-${targetDecision}` : "transport-failure";
    const receipt = { type: "ScheduledDeliveryReceipt", id: id({ scheduleId: registration.scheduleId, occurrence, attempt: attempt.id, activity, disposition, response: invoked.response }), attempt: attempt.id, scheduleId: registration.scheduleId, occurrence, scheduledFor, attemptedAt: at, activity, activityDigest: digest(activity), disposition, targetResponse: invoked.response, targetResponseDigest: invoked.response ? digest(invoked.response) : null, targetResponseProblem: targetProblem, process: { status: invoked.status, signal: invoked.signal, stderrDigest: digest(invoked.stderr ?? ""), wallTimeMilliseconds: Date.now() - started }, retryAuthorized: false, customerTerritoryMutation: false };
    const pending = { type: "PendingDeliverySettlement", receipt, recordedAt: at }; writePendingSettlement(root, receipt, at);
    try { await ensureDeliverySettlement(ledger, pending, { receiptIds: new Set(), eventIds: new Set() }); confirmPendingSettlement(root, receipt); unlinkSync(recoveryAttemptPath(root, receipt.scheduleId, receipt.occurrence)); }
    catch (error) { settlementFailures.push({ type: "PendingDeliverySettlementResidue", receipt: receipt.id, scheduleId: registration.scheduleId, occurrence, errorDigest: digest(error instanceof Error ? error.message : String(error)), customerTerritoryMutation: false }); }
    results.push(receipt);
  }
  const result = { type: "ScheduledDeliveryTickResult", actor: ACTOR, at, attempted: results.length, receipts: results, recoveredSettlements: [], recoveredInterruptedAttempts: recovery.recovered, pendingSettlements: settlementFailures, activeScheduleProjection: true, activeSchedules: active.length, dispatchWindow: dispatchWindow.length, maximumTargetsPerTick: MAX_TARGETS_PER_TICK, migrationRequired: active.length === 0 && !existsSync(dataCustodyDirectory(root, "state", "active-schedule-projections")), concurrentTargetIsolation: true, maximumConcurrentTargets: MAX_CONCURRENT_TARGETS, perScheduleFailureIsolation: true, noCatchUpCascade: true };
  return persistTickResult(root, { ...result, id: id(result) });
}

// This is deliberately an observation, rather than a dry run: it never
// reserves an occurrence, creates a runtime image, or invokes a customer.
// Deployment tooling uses it to make the enablement boundary visible.
export function inspectAcceptedSchedules(options = {}) {
  const ledger = options.ledger ?? store(options);
  const retired = new Set(retirements(ledger).map((item) => item.scheduleId));
  return registrations(ledger)
    .filter((registration) => registration?.status === "active" && !retired.has(registration.scheduleId))
    .map((registration) => Object.freeze({
      scheduleId: registration.scheduleId,
      customer: registration.customer,
      executionMode: registration.request?.executionMode ?? null,
      deliveryCapabilityId: registration.request?.deliveryCapabilityId ?? null,
      target: Object.freeze({ packageRoot: registration.request?.target?.packageRoot ?? null, actor: registration.request?.target?.actor ?? null, operation: registration.request?.target?.operation ?? null, contract: registration.request?.target?.contract ?? null }),
      firstDueAt: registration.request?.schedule?.firstDueAt ?? null,
      intervalSeconds: registration.request?.schedule?.intervalSeconds ?? null,
      maxDeliveries: registration.request?.schedule?.maxDeliveries ?? null,
      targetBinding: registration.targetBinding,
    }))
    .sort((left, right) => String(left.scheduleId).localeCompare(String(right.scheduleId)));
}

function arg(name, fallback) { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; }
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const operation = arg("--operation", "solicit-service"); const at = arg("--now", new Date().toISOString());
  try {
    const output = operation === "run-due" ? await runDue(at)
      : operation === "inspect-latest-tick" ? inspectLatestTick()
        : await settle(JSON.parse(readFileSync(0, "utf8")), operation, at);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); if (output?.type === "Reject") process.exitCode = 2;
  }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}
