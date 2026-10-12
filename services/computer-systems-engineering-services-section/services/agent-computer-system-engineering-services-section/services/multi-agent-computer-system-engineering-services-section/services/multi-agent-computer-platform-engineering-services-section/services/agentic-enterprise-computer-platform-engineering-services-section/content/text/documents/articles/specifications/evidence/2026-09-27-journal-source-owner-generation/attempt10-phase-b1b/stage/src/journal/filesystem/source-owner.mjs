import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
  statfsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import {
  admitCanonicalJson,
  canonicalizeJson,
  canonicalJson,
  JSON_RESOURCE_ENVELOPE,
} from "@red-cup-engineering/json-services-section";
import { addressArtifact, isArtifactRef, verifyArtifact } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/identity";
import { parseJournalWitness, parseUniqueJournalRecord } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/event";
import { isCausalWitness } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/judgment";
import { rebuildCausalSubstrate } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/substrate";
import { journalDirectoryOf } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/store-root";
import { journalAppendAddress } from "./operations/index.mjs";
import { writeFileAtomicNew } from "../../filesystem.mjs";
import { isJournalUnavailable, journalUnavailable } from "../diagnostics.mjs";

const HOST_NAME = "host.json";
const LOCK_NAME = "maintenance.lock";
const HOST_KIND = "metroplat.journal.host";
const HOST_LIMIT = 16_384;
const DEFAULT_SCAN_LIMIT = JSON_RESOURCE_ENVELOPE.maxSourceBytes;
const registry = new Set();
const NOFOLLOW = fsConstants.O_NOFOLLOW;
const DIRECTORY = fsConstants.O_DIRECTORY;
const CLOEXEC = fsConstants.O_CLOEXEC ?? 0;
const HOST_KEYS = Object.freeze(["hostProfile", "journal", "kind", "limits", "version"]);
const LIMIT_KEYS = Object.freeze([
  "maxLineBytes", "maxBatchBytes", "maxSourceFiles", "maxScanBytes",
  "maxClosureWitnesses", "maxClosureArtifacts", "maxClosureBytes", "maxClosureDepth",
]);

function unavailable(reason, operation, cause) {
  return journalUnavailable(reason, Object.freeze({ operation, cause }));
}

function ioFailure(error, operation) {
  if (error?.code === "EOPNOTSUPP" || error?.code === "ENOTSUP" || error?.code === "ENOSYS") {
    return unavailable("storage-unsupported", operation, error);
  }
  return unavailable("storage-unavailable", operation, error);
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function invalidConfiguration() {
  return new TypeError("journal-host-invalid");
}

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function scalarString(value) {
  if (typeof value !== "string" || value.length === 0 || [...value].length > 512) return false;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function validateConfiguration(input) {
  let snapshot;
  try {
    snapshot = canonicalizeJson(input, JSON_RESOURCE_ENVELOPE).value;
  } catch {
    throw invalidConfiguration();
  }
  if (!exactKeys(snapshot, HOST_KEYS)
    || snapshot.kind !== HOST_KIND || snapshot.version !== 1
    || !scalarString(snapshot.journal)
    || typeof snapshot.hostProfile !== "string"
    || !exactKeys(snapshot.limits, LIMIT_KEYS)) throw invalidConfiguration();
  const limits = snapshot.limits;
  for (const key of LIMIT_KEYS) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0) throw invalidConfiguration();
  }
  if (limits.maxLineBytes > limits.maxBatchBytes || limits.maxBatchBytes > limits.maxScanBytes) {
    throw invalidConfiguration();
  }
  if (snapshot.hostProfile !== "linux-local-flock-v1") {
    throw unavailable("storage-unsupported", "host-profile", snapshot.hostProfile);
  }
  const configuration = Object.freeze({
    kind: HOST_KIND,
    version: 1,
    journal: snapshot.journal,
    hostProfile: snapshot.hostProfile,
    limits: Object.freeze(Object.fromEntries(LIMIT_KEYS.map((key) => [key, limits[key]]))),
  });
  const bytes = `${canonicalJson(configuration)}\n`;
  if (Buffer.byteLength(bytes, "utf8") > HOST_LIMIT) throw invalidConfiguration();
  return Object.freeze({ configuration, bytes });
}

function rootComponents(absolutePath) {
  const parsed = path.parse(absolutePath);
  const pieces = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  return [parsed.root, ...pieces.map((_, index) => path.join(parsed.root, ...pieces.slice(0, index + 1)))];
}

function bindDirectory(directory) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) {
    throw unavailable("storage-unavailable", "root-argument");
  }
  const resolved = path.resolve(directory);
  const identities = [];
  for (const component of rootComponents(resolved)) {
    let fd;
    try {
      const named = lstatSync(component);
      if (named.isSymbolicLink() || !named.isDirectory()) throw new Error("root component is not a nonsymlink directory");
      fd = openSync(component, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
      const opened = fstatSync(fd);
      if (!opened.isDirectory() || !sameIdentity(named, opened)) throw new Error("root component identity changed");
      identities.push(Object.freeze({ path: component, dev: opened.dev, ino: opened.ino }));
    } catch (error) {
      if (isJournalUnavailable(error)) throw error;
      throw ioFailure(error, "root-binding");
    } finally {
      if (fd !== undefined) {
        try { closeSync(fd); } catch { /* Preserve the binding result. */ }
      }
    }
  }
  let fsType;
  try {
    fsType = statfsSync(resolved).type;
  } catch (error) {
    throw ioFailure(error, "filesystem-profile");
  }
  if (process.platform !== "linux" || fsType !== 0xef53) {
    throw unavailable("storage-unsupported", "filesystem-profile", Object.freeze({ platform: process.platform, fsType }));
  }
  const last = identities.at(-1);
  return Object.freeze({ path: resolved, dev: last.dev, ino: last.ino, identities: Object.freeze(identities) });
}

function assertRoot(root) {
  for (const expected of root.identities) {
    let fd;
    try {
      const named = lstatSync(expected.path);
      if (named.isSymbolicLink() || !named.isDirectory()) throw new Error("bound directory changed type");
      fd = openSync(expected.path, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
      const opened = fstatSync(fd);
      if (!sameIdentity(expected, named) || !sameIdentity(expected, opened)) throw new Error("bound directory identity changed");
    } catch (error) {
      if (isJournalUnavailable(error)) throw error;
      throw ioFailure(error, "root-revalidation");
    } finally {
      if (fd !== undefined) {
        try { closeSync(fd); } catch { /* Preserve the binding result. */ }
      }
    }
  }
}

function readBoundFile(root, name, maximum) {
  const filename = path.join(root.path, name);
  let fd;
  try {
    const namedBefore = lstatSync(filename);
    if (namedBefore.isSymbolicLink() || !namedBefore.isFile()) {
      throw unavailable("source-corrupt", "host-file-type");
    }
    fd = openSync(filename, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
    const before = fstatSync(fd);
    if (!before.isFile() || !sameIdentity(namedBefore, before)) throw new Error("named file identity changed");
    const chunks = [];
    let total = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(4096, maximum + 1 - total));
      const count = readSync(fd, buffer, 0, buffer.length, null);
      if (count === 0) break;
      total += count;
      if (total > maximum) throw unavailable("source-corrupt", "host-file-too-large");
      chunks.push(buffer.subarray(0, count));
    }
    const after = fstatSync(fd);
    const namedAfter = lstatSync(filename);
    if (!sameIdentity(before, after) || !sameIdentity(before, namedAfter)
      || before.size !== after.size || after.size !== total) throw new Error("file changed during bounded read");
    return Object.freeze({ bytes: Buffer.concat(chunks, total), identity: Object.freeze({ dev: before.dev, ino: before.ino }) });
  } catch (error) {
    if (isJournalUnavailable(error)) throw error;
    if (error?.code === "ENOENT") throw unavailable("storage-unavailable", "host-unconfigured", error);
    throw ioFailure(error, "host-read");
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch (error) { throw ioFailure(error, "host-close"); }
    }
  }
}

function parseHost(root) {
  const read = readBoundFile(root, HOST_NAME, HOST_LIMIT);
  let admitted;
  try {
    admitted = admitCanonicalJson(read.bytes, JSON_RESOURCE_ENVELOPE);
    const value = admitted.value;
    if (!exactKeys(value, HOST_KEYS) || value.kind !== HOST_KIND || value.version !== 1
      || !scalarString(value.journal) || typeof value.hostProfile !== "string"
      || !exactKeys(value.limits, LIMIT_KEYS)) throw new TypeError("host fields invalid");
    const checked = validateConfiguration(value);
    if (checked.bytes !== `${admitted.text}\n`) throw new TypeError("host is not canonical");
    return Object.freeze({
      bytes: read.bytes,
      digest: createHash("sha256").update(read.bytes).digest("hex"),
      identity: read.identity,
      configuration: checked.configuration,
    });
  } catch (error) {
    if (isJournalUnavailable(error)) throw error;
    if (error?.code === "EIO" || error?.code === "EACCES") throw ioFailure(error, "host-read");
    throw unavailable("source-corrupt", "host-admission", error);
  }
}

function openLock(root) {
  const filename = path.join(root.path, LOCK_NAME);
  let fd;
  try {
    fd = openSync(filename, fsConstants.O_RDWR | fsConstants.O_CREAT | NOFOLLOW | CLOEXEC, 0o600);
    const opened = fstatSync(fd);
    const named = lstatSync(filename);
    if (!opened.isFile() || named.isSymbolicLink() || !named.isFile() || !sameIdentity(opened, named)) {
      throw new Error("maintenance lock binding is invalid");
    }
    return Object.freeze({ fd, path: filename, dev: opened.dev, ino: opened.ino });
  } catch (error) {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* Preserve the opening failure. */ }
    }
    if (error?.code === "ELOOP" || error?.code === "ENOTDIR") {
      throw unavailable("storage-unavailable", "lock-binding", error);
    }
    throw ioFailure(error, "lock-open");
  }
}

function acquire(lock) {
  const key = `${lock.dev}:${lock.ino}`;
  if (registry.has(key)) throw unavailable("maintenance-busy", "reentrant-operation");
  registry.add(key);
  try {
    const result = spawnSync("/usr/bin/flock", ["--exclusive", "--nonblock", "3"], {
      stdio: ["ignore", "ignore", "pipe", lock.fd],
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 4096,
    });
    if (result.error) {
      if (["ENOENT", "EACCES", "ETIMEDOUT"].includes(result.error.code)) {
        throw unavailable("storage-unsupported", "flock-unavailable", result.error);
      }
      throw ioFailure(result.error, "flock");
    }
    if (result.status === 1) throw unavailable("maintenance-busy", "flock-contention", result.stderr);
    if (result.status !== 0) throw ioFailure(new Error("flock helper failed"), "flock");
    return () => registry.delete(key);
  } catch (error) {
    registry.delete(key);
    throw error;
  }
}

function checkLockBinding(root, lock, expected) {
  try {
    const opened = fstatSync(lock.fd);
    const named = lstatSync(lock.path);
    if (!sameIdentity(expected, opened) || !sameIdentity(expected, named)
      || named.isSymbolicLink() || !named.isFile()) throw new Error("bound lock identity changed");
  } catch (error) {
    if (isJournalUnavailable(error)) throw error;
    throw ioFailure(error, "lock-revalidation");
  }
}

function assertBindings(root, lock, lockIdentity, host) {
  assertRoot(root);
  checkLockBinding(root, lock, lockIdentity);
  const current = parseHost(root);
  if (!sameIdentity(host.identity, current.identity) || current.digest !== host.digest) {
    throw unavailable("storage-unavailable", "host-binding-changed");
  }
}

function withGate(root, perform) {
  const lock = openLock(root);
  let release;
  let failure;
  try {
    release = acquire(lock);
    return perform(lock);
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (release) release();
    try { closeSync(lock.fd); } catch (error) {
      if (failure === undefined) throw ioFailure(error, "lock-close");
    }
  }
}

function verifyUniqueCustody(root, configuration) {
  const family = path.join(root.path, "unique-admissions");
  let familyStat;
  try { familyStat = lstatSync(family); } catch (error) {
    if (error?.code === "ENOENT") return;
    throw ioFailure(error, "unique-discovery");
  }
  if (familyStat.isSymbolicLink() || !familyStat.isDirectory()) {
    throw unavailable("storage-unavailable", "unrecognized-root-custody");
  }
  const version = path.join(family, "v1");
  let versionStat;
  try { versionStat = lstatSync(version); } catch (error) {
    if (error?.code === "ENOENT") throw unavailable("storage-unavailable", "unrecognized-root-custody");
    throw ioFailure(error, "unique-discovery");
  }
  if (versionStat.isSymbolicLink() || !versionStat.isDirectory()) {
    throw unavailable("storage-unavailable", "unrecognized-root-custody");
  }
  let directory;
  try { directory = opendirSync(version); } catch (error) { throw ioFailure(error, "unique-discovery"); }
  let work = 0;
  let count = 0;
  try {
    for (let entry = directory.readSync(); entry !== null; entry = directory.readSync()) {
      work += Buffer.byteLength(`unique-admissions/v1/${entry.name}`, "utf8") + 1;
      if (work > configuration.limits.maxScanBytes) throw unavailable("resource-limit", "unique-discovery-work");
      const staging = /^([0-9a-f]{64}\.json)\.([0-9]+)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.tmp$/;
      if (staging.test(entry.name)) {
        const st = lstatSync(path.join(version, entry.name));
        if (st.isSymbolicLink() || !st.isFile()) throw unavailable("source-corrupt", "unique-staging-entry");
        continue;
      }
      if (!/^[0-9a-f]{64}\.json$/.test(entry.name)) {
        throw unavailable("storage-unavailable", "unrecognized-root-custody");
      }
      count += 1;
      if (count > configuration.limits.maxSourceFiles) throw unavailable("resource-limit", "unique-source-files");
      const filename = path.join(version, entry.name);
      const st = lstatSync(filename);
      if (st.isSymbolicLink() || !st.isFile() || st.size > configuration.limits.maxBatchBytes) {
        throw unavailable("source-corrupt", "unique-source-file");
      }
      let fd;
      try {
        fd = openSync(filename, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
        const opened = fstatSync(fd);
        if (!opened.isFile() || !sameIdentity(st, opened)) throw new Error("unique source identity changed");
        const data = Buffer.alloc(opened.size + 1);
        const bytes = readSync(fd, data, 0, data.length, 0);
        if (bytes !== opened.size) throw new Error("unique source length changed");
        const value = admitCanonicalJson(data.subarray(0, bytes), JSON_RESOURCE_ENVELOPE).value;
        const digest = entry.name.slice(0, 64);
        const slot = createHash("sha256").update(canonicalJson([
          "metroplat.journal.unique-slot", 1, configuration.journal,
          value?.witness?.observation?.payload?.[2]?.domain,
          value?.witness?.observation?.payload?.[2]?.key,
        ])).digest("hex");
        parseUniqueJournalRecord(value, configuration.journal, slot);
        const after = fstatSync(fd);
        if (!sameIdentity(opened, after) || after.size !== bytes || digest !== slot) {
          throw new Error("unique source address or identity mismatch");
        }
      } catch (error) {
        if (isJournalUnavailable(error)) throw error;
        throw unavailable("source-corrupt", "unique-source-admission", error);
      } finally {
        if (fd !== undefined) closeSync(fd);
      }
    }
  } catch (error) {
    if (isJournalUnavailable(error)) throw error;
    throw ioFailure(error, "unique-discovery");
  } finally {
    try { directory.closeSync(); } catch { /* Preserve primary discovery result. */ }
  }
}

function sourceIo(error, operation) {
  if (isJournalUnavailable(error)) throw error;
  throw ioFailure(error, operation);
}

function sourceIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sourceStaging(name, finalName) {
  const escaped = finalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\.[0-9]+\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.tmp$`).test(name);
}

function sourcePathBytes(name) {
  return Buffer.byteLength(name, "utf8") + 1;
}

function sourceEntryStat(filename) {
  let stat;
  try {
    stat = lstatSync(filename);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw unavailable("storage-unavailable", "source-entry-disappeared", error);
    }
    sourceIo(error, "source-entry-stat");
  }
  return stat;
}

function sourceDirectory(filename, relativeName, family, parent) {
  if (parent !== undefined) checkSourceDirectory(parent);
  let named;
  let fd;
  try {
    named = lstatSync(filename);
    if (named.isSymbolicLink() || !named.isDirectory()) {
      throw unavailable(family ? "source-corrupt" : "storage-unavailable", family ? "source-directory-type" : "unrecognized-root-custody");
    }
    fd = openSync(filename, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
    const opened = fstatSync(fd);
    if (!opened.isDirectory() || !sourceIdentity(named, opened)) {
      throw unavailable("storage-unavailable", "source-directory-binding-changed");
    }
    return { fd, dev: opened.dev, ino: opened.ino, path: filename, relativeName };
  } catch (error) {
    let failed = true;
    let primary = error;
    if (fd !== undefined) {
      try { closeSync(fd); } catch (cleanupError) {
        if (!failed) { failed = true; primary = ioFailure(cleanupError, "source-directory-close"); }
      }
    }
    if (isJournalUnavailable(primary)) throw primary;
    if (primary?.code === "ENOENT") throw unavailable("storage-unavailable", "source-directory-disappeared", primary);
    sourceIo(primary, "source-directory-open");
  }
}

function checkSourceDirectory(bound) {
  try {
    const named = lstatSync(bound.path);
    const opened = fstatSync(bound.fd);
    if (named.isSymbolicLink() || !named.isDirectory() || !opened.isDirectory()
      || !sourceIdentity(bound, named) || !sourceIdentity(bound, opened)) {
      throw unavailable("storage-unavailable", "source-directory-binding-changed");
    }
  } catch (error) {
    if (isJournalUnavailable(error)) throw error;
    if (error?.code === "ENOENT") throw unavailable("storage-unavailable", "source-directory-disappeared", error);
    sourceIo(error, "source-directory-revalidation");
  }
}

function readSourceFiles(operation) {
  operation.assertLive();
  operation.assertBindings();
  const { root, configuration } = operation;
  const limits = configuration.limits;
  let discoveryWork = 0;
  let sourceBytes = 0;
  let sourceFiles = 0;
  const sources = new Map();
  const identities = new Map();
  const foundFamilies = new Set();
  const requiredEntries = new Set();

  function charge(relativeName) {
    const amount = sourcePathBytes(relativeName);
    if (amount > limits.maxScanBytes - discoveryWork) throw unavailable("resource-limit", "source-discovery-work");
    discoveryWork += amount;
  }

  function bindRoot() {
    let fd;
    try {
      const named = lstatSync(root);
      if (named.isSymbolicLink() || !named.isDirectory()) throw new Error("root changed type");
      fd = openSync(root, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
      const opened = fstatSync(fd);
      if (!opened.isDirectory() || !sourceIdentity(named, opened)) throw new Error("root identity changed");
      return { fd, dev: opened.dev, ino: opened.ino, path: root, relativeName: "" };
    } catch (error) {
      if (fd !== undefined) { try { closeSync(fd); } catch { /* Preserve the binding failure. */ } }
      if (isJournalUnavailable(error)) throw error;
      if (error?.code === "ENOENT") throw unavailable("storage-unavailable", "source-root-disappeared", error);
      sourceIo(error, "source-root-binding");
    }
  }

  function withBound(bound, perform) {
    let failed = false;
    let primary;
    let result;
    try { result = perform(); } catch (error) { failed = true; primary = error; }
    try { closeSync(bound.fd); } catch (error) {
      if (!failed) { failed = true; primary = ioFailure(error, "source-directory-close"); }
    }
    if (failed) throw primary;
    return result;
  }

  function enumerate(bound, onEntry) {
    let iterator;
    let failed = false;
    let primary;
    try {
      checkSourceDirectory(bound);
      iterator = opendirSync(bound.path);
      checkSourceDirectory(bound);
      for (;;) {
        checkSourceDirectory(bound);
        const entry = iterator.readSync();
        if (entry === null) break;
        const relativeName = bound.relativeName ? `${bound.relativeName}/${entry.name}` : entry.name;
        charge(relativeName);
        onEntry(entry, relativeName);
      }
      checkSourceDirectory(bound);
    } catch (error) {
      failed = true;
      primary = isJournalUnavailable(error) ? error : ioFailure(error, "source-directory-enumeration");
    }
    if (iterator !== undefined) {
      try { iterator.closeSync(); } catch (error) {
        if (!failed) { failed = true; primary = ioFailure(error, "source-directory-iterator-close"); }
      }
    }
    if (failed) throw primary;
  }

  function addFile(directory, entryName, relativeName, kind, maximum) {
    checkSourceDirectory(directory);
    const filename = path.join(directory.path, entryName);
    const namedBefore = sourceEntryStat(filename);
    if (namedBefore.isSymbolicLink() || !namedBefore.isFile()) throw unavailable("source-corrupt", "source-file-type");
    if (!Number.isSafeInteger(namedBefore.size) || namedBefore.size <= 0) throw unavailable("source-corrupt", "source-file-size");
    if (namedBefore.size > limits.maxBatchBytes || namedBefore.size > maximum) {
      throw unavailable("resource-limit", kind === "unique" ? "unique-source-bytes" : "source-batch-bytes");
    }
    const key = `${namedBefore.dev}:${namedBefore.ino}`;
    let prior = identities.get(key);
    if (prior === undefined) {
      if (sourceFiles >= limits.maxSourceFiles) throw unavailable("resource-limit", "source-file-count");
      if (namedBefore.size > limits.maxScanBytes - sourceBytes) throw unavailable("resource-limit", "source-bytes");
      sourceFiles += 1;
      sourceBytes += namedBefore.size;
    }
    let fd;
    let failed = false;
    let primary;
    let bytes;
    try {
      checkSourceDirectory(directory);
      fd = openSync(filename, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
      const opened = fstatSync(fd);
      if (!opened.isFile() || !sourceIdentity(namedBefore, opened) || opened.size !== namedBefore.size) {
        throw unavailable("storage-unavailable", "source-file-binding-changed");
      }
      bytes = Buffer.alloc(opened.size);
      let offset = 0;
      while (offset < bytes.length) {
        const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
        if (count === 0) throw unavailable("storage-unavailable", "source-file-premature-eof");
        offset += count;
      }
      const after = fstatSync(fd);
      checkSourceDirectory(directory);
      const namedAfter = sourceEntryStat(filename);
      if (namedAfter.isSymbolicLink() || !namedAfter.isFile() || !after.isFile()
        || !sourceIdentity(opened, after) || !sourceIdentity(opened, namedAfter)
        || after.size !== opened.size || namedAfter.size !== opened.size) {
        throw unavailable("storage-unavailable", "source-file-changed-during-read");
      }
    } catch (error) {
      failed = true;
      primary = isJournalUnavailable(error) ? error
        : error?.code === "ENOENT" ? unavailable("storage-unavailable", "source-file-disappeared", error)
          : ioFailure(error, "source-file-read");
    }
    if (fd !== undefined) {
      try { closeSync(fd); } catch (error) {
        if (!failed) { failed = true; primary = ioFailure(error, "source-file-close"); }
      }
    }
    if (failed) throw primary;
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (prior !== undefined && (!prior.bytes.equals(bytes) || prior.size !== bytes.length)) {
      throw unavailable("source-corrupt", "source-physical-identity-conflict");
    }
    if (prior === undefined) {
      prior = { bytes, size: bytes.length, digest };
      identities.set(key, prior);
    }
    sources.set(relativeName, Object.freeze({
      name: relativeName, kind,
      identity: Object.freeze({ dev: namedBefore.dev, ino: namedBefore.ino }),
      size: prior.size, digest: prior.digest, bytes: prior.bytes,
    }));
  }

  function familyDirectory(rootBound, familyName) {
    if (!foundFamilies.has(familyName)) return;
    const familyPath = path.join(root, familyName);
    const familyBound = sourceDirectory(familyPath, familyName, true, rootBound);
    withBound(familyBound, () => enumerate(familyBound, (entry, relativeName) => {
      if (entry.name !== "v1") throw unavailable("source-corrupt", "source-family-version");
      const versionPath = path.join(familyPath, entry.name);
      checkSourceDirectory(familyBound);
      const versionStat = sourceEntryStat(versionPath);
      if (versionStat.isSymbolicLink() || !versionStat.isDirectory()) throw unavailable("source-corrupt", "source-version-type");
      const versionBound = sourceDirectory(versionPath, relativeName, true, familyBound);
      withBound(versionBound, () => enumerate(versionBound, (sourceEntry, sourceRelativeName) => {
        const staging = familyName === "retained"
          ? /^([0-9a-f]{64}\.jsonl)\.([0-9]+)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.tmp$/
          : /^([0-9a-f]{64}\.json)\.([0-9]+)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.tmp$/;
        if (staging.test(sourceEntry.name)) {
          const stagingStat = sourceEntryStat(path.join(versionPath, sourceEntry.name));
          if (stagingStat.isSymbolicLink() || !stagingStat.isFile()) throw unavailable("source-corrupt", "source-staging-type");
          return;
        }
        const isFinal = familyName === "retained"
          ? /^[0-9a-f]{64}\.jsonl$/.test(sourceEntry.name)
          : /^[0-9a-f]{64}\.json$/.test(sourceEntry.name);
        if (!isFinal) throw unavailable("source-corrupt", "source-family-name");
        const kind = familyName === "retained" ? "retained" : "unique";
        const maximum = kind === "unique" ? JSON_RESOURCE_ENVELOPE.maxSourceBytes + 1 : limits.maxBatchBytes;
        addFile(versionBound, sourceEntry.name, sourceRelativeName, kind, maximum);
      }));
    }));
  }

  function inspectRootEntry(entry) {
    const name = entry.name;
    if (name === HOST_NAME || name === LOCK_NAME) {
      const stat = sourceEntryStat(path.join(root, name));
      if (stat.isSymbolicLink() || !stat.isFile()) throw unavailable("storage-unavailable", "required-root-entry-type");
      requiredEntries.add(name);
      return;
    }
    if (sourceStaging(name, HOST_NAME)) {
      const stat = sourceEntryStat(path.join(root, name));
      if (stat.isSymbolicLink() || !stat.isFile()) throw unavailable("storage-unavailable", "root-staging-type");
      return;
    }
    if (name === "retained" || name === "unique-admissions") { foundFamilies.add(name); return; }
    if (name === "compaction.jsonl" || name === ".statements" || name.endsWith(".statements")
      || name.endsWith(".index") || name.endsWith(".witnesses")) {
      throw unavailable("storage-unavailable", "migration-required");
    }
    throw unavailable("storage-unavailable", "unrecognized-root-custody");
  }

  const rootBound = bindRoot();
  withBound(rootBound, () => {
    enumerate(rootBound, inspectRootEntry);
    if (!requiredEntries.has(HOST_NAME) || !requiredEntries.has(LOCK_NAME)) {
      throw unavailable("storage-unavailable", "required-root-entry-missing");
    }
    familyDirectory(rootBound, "retained");
    familyDirectory(rootBound, "unique-admissions");
    checkSourceDirectory(rootBound);
  });
  operation.assertLive();
  operation.assertBindings();
  return { sources, sourceFiles, sourceBytes };
}

function sourceCorrupt(operation, cause) {
  if (isJournalUnavailable(cause)) throw cause;
  throw unavailable("source-corrupt", operation, cause);
}

function sourceOrdinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function safeSourceFeed(value) {
  return typeof value === "string" && value.length > 0 && !value.includes("\\")
    && !value.includes("\0") && !value.startsWith("/")
    && value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function addSourceCustody(map, reference, name) {
  let names = map.get(reference);
  if (names === undefined) { names = new Set(); map.set(reference, names); }
  names.add(name);
}

function addFeedEvent(map, feed, event) {
  let events = map.get(feed);
  if (events === undefined) { events = new Set(); map.set(feed, events); }
  events.add(event);
}

function parseRetainedSource(source, limits) {
  const filenameDigest = source.name.slice(source.name.lastIndexOf("/") + 1, -6);
  if (!/^[0-9a-f]{64}$/.test(filenameDigest) || source.digest !== filenameDigest) {
    throw unavailable("source-corrupt", "retained-filename-digest");
  }
  const bytes = source.bytes;
  const entries = [];
  const texts = [];
  const bodyLimit = limits.maxLineBytes - 1;
  if (bodyLimit <= 0) throw unavailable("resource-limit", "retained-line-capacity");
  const lineEnvelope = Object.freeze({
    maxSourceBytes: bodyLimit, maxCanonicalBytes: bodyLimit, maxDepth: bodyLimit,
    maxNodes: bodyLimit, maxObjectMembers: bodyLimit, maxArrayLength: bodyLimit,
    maxStringBytes: bodyLimit, maxKeyBytes: bodyLimit,
  });
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    const lineLength = index + 1 - start;
    if (lineLength > limits.maxLineBytes) throw unavailable("resource-limit", "retained-line-bytes");
    if (lineLength === 1) throw unavailable("source-corrupt", "retained-empty-line");
    const admitted = admitCanonicalJson(bytes.subarray(start, index), lineEnvelope);
    const text = admitted.text;
    if (!bytes.subarray(start, index).equals(Buffer.from(text, "utf8"))) {
      throw unavailable("source-corrupt", "retained-noncanonical-line");
    }
    if (texts.length > 0 && sourceOrdinal(texts[texts.length - 1], text) >= 0) {
      throw unavailable("source-corrupt", "retained-entry-order");
    }
    texts.push(text);
    const value = admitted.value;
    if (value === null || Array.isArray(value) || typeof value !== "object"
      || !Number.isInteger(value.version) || value.version !== 1 || typeof value.kind !== "string") {
      throw unavailable("source-corrupt", "retained-entry-shape");
    }
    if (value.kind === "metroplat.journal.retained-witness") {
      if (Object.keys(value).sort().join("\0") !== ["feed", "kind", "statement", "version"].sort().join("\0")
        || !safeSourceFeed(value.feed)) throw unavailable("source-corrupt", "retained-witness-shape");
      let verified;
      try { verified = parseJournalWitness(value.statement); }
      catch (error) { sourceCorrupt("retained-witness", error); }
      entries.push(Object.freeze({ kind: "witness", feed: value.feed, original: value.statement, verified }));
    } else if (value.kind === "metroplat.journal.retained-artifact") {
      if (Object.keys(value).sort().join("\0") !== ["canonicalText", "kind", "ref", "version"].sort().join("\0")
        || typeof value.ref !== "string" || typeof value.canonicalText !== "string") {
        throw unavailable("source-corrupt", "retained-artifact-shape");
      }
      let artifact;
      try { artifact = verifyArtifact(value.ref, value.canonicalText); }
      catch (error) { sourceCorrupt("retained-artifact", error); }
      if (artifact.canonical.text !== value.canonicalText) throw unavailable("source-corrupt", "retained-artifact-canonical");
      entries.push(Object.freeze({ kind: "artifact", ref: value.ref, canonicalText: value.canonicalText }));
    } else if (value.kind === "metroplat.journal.retained-obstruction") {
      if (Object.keys(value).sort().join("\0") !== ["event", "kind", "obstruction", "version"].sort().join("\0")
        || !isArtifactRef(value.event)) throw unavailable("source-corrupt", "retained-obstruction-shape");
      const obstruction = canonicalizeJson(value.obstruction, JSON_RESOURCE_ENVELOPE).value;
      entries.push(Object.freeze({ kind: "obstruction", event: value.event, obstruction,
        canonicalText: canonicalJson(obstruction, JSON_RESOURCE_ENVELOPE) }));
    } else {
      throw unavailable("source-corrupt", "retained-entry-kind");
    }
    start = index + 1;
  }
  if (start !== bytes.length || start === 0) throw unavailable("source-corrupt", "retained-final-lf");
  return Object.freeze(entries);
}

function parseUniqueSource(source, configuration) {
  const filenameDigest = source.name.slice(source.name.lastIndexOf("/") + 1, -5);
  if (!/^[0-9a-f]{64}$/.test(filenameDigest) || source.size > JSON_RESOURCE_ENVELOPE.maxSourceBytes + 1
    || source.bytes[source.bytes.length - 1] !== 0x0a) {
    throw unavailable("source-corrupt", "unique-source-envelope");
  }
  const bytes = source.bytes.subarray(0, source.bytes.length - 1);
  const admitted = admitCanonicalJson(bytes, JSON_RESOURCE_ENVELOPE);
  if (!bytes.equals(Buffer.from(admitted.text, "utf8"))) throw unavailable("source-corrupt", "unique-source-canonical");
  const untrusted = admitted.value;
  const witness = untrusted?.witness;
  const payload = witness?.observation?.payload;
  const command = payload?.[2];
  const slot = createHash("sha256").update(canonicalJson([
    "metroplat.journal.unique-slot", 1, configuration.journal, command?.domain, command?.key,
  ])).digest("hex");
  if (slot !== filenameDigest) throw unavailable("source-corrupt", "unique-slot-filename");
  let parsed;
  try { parsed = parseUniqueJournalRecord(untrusted, configuration.journal, slot); }
  catch (error) { sourceCorrupt("unique-record", error); }
  return parsed;
}

function refreshSourceView(operation) {
  operation.assertLive();
  operation.assertBindings();
  const discovered = readSourceFiles(operation);
  const prior = operation.cache.value;
  const parsedSources = new Map();
  for (const [name, source] of discovered.sources) {
    const cached = prior?.sources?.get(name);
    const same = cached !== undefined && cached.kind === source.kind && cached.size === source.size
      && cached.digest === source.digest && sameIdentity(cached.identity, source.identity);
    let parsed;
    try {
      parsed = same ? cached.parsed : source.kind === "retained"
        ? parseRetainedSource(source, operation.configuration.limits)
        : parseUniqueSource(source, operation.configuration);
    } catch (error) {
      if (isJournalUnavailable(error)) throw error;
      sourceCorrupt("source-parse", error);
    }
    parsedSources.set(name, Object.freeze({ ...source, parsed }));
  }

  const envelopes = new Map();
  const feedEvents = new Map();
  const artifactCustody = new Map();
  const envelopeCustody = new Map();
  const uniqueEntries = new Map();
  const historicalObstructions = new Map();
  const bodyTexts = new Map();
  const sourcePairs = new Map();
  const retainedDecisionPairs = [];
  const decisions = [];

  function addBody(reference, text, name) {
    let artifact;
    try { artifact = verifyArtifact(reference, text); }
    catch (error) { sourceCorrupt("artifact-correspondence", error); }
    if (artifact.canonical.text !== text) throw unavailable("source-corrupt", "artifact-noncanonical");
    const existing = bodyTexts.get(reference);
    if (existing !== undefined && existing !== text) throw unavailable("source-corrupt", "artifact-body-conflict");
    bodyTexts.set(reference, text);
    addSourceCustody(artifactCustody, reference, name);
    if (!sourcePairs.has(reference)) sourcePairs.set(reference, Object.freeze({ ref: reference, canonicalText: text }));
  }

  function addWitness(statement, name, feed) {
    let verified;
    try { verified = parseJournalWitness(statement); }
    catch (error) { sourceCorrupt("witness-correspondence", error); }
    for (const pair of verified.sources) addBody(pair.ref, pair.canonicalText, name);
    const normalized = verified.observation;
    const text = canonicalJson(normalized, JSON_RESOURCE_ENVELOPE);
    const existing = envelopes.get(verified.id);
    if (existing !== undefined && existing.canonicalText !== text) {
      throw unavailable("source-corrupt", "normalized-envelope-conflict");
    }
    if (existing === undefined) envelopes.set(verified.id, Object.freeze({ statement: normalized, canonicalText: text }));
    addSourceCustody(envelopeCustody, verified.id, name);
    if (feed !== undefined) addFeedEvent(feedEvents, feed, verified.id);
    return verified;
  }

  for (const [name, source] of parsedSources) {
    if (source.kind === "retained") {
      for (const entry of source.parsed) {
        if (entry.kind === "witness") addWitness(entry.original, name, entry.feed);
        else if (entry.kind === "artifact") addBody(entry.ref, entry.canonicalText, name);
        else {
          const text = entry.canonicalText;
          let values = historicalObstructions.get(entry.event);
          if (values === undefined) { values = new Map(); historicalObstructions.set(entry.event, values); }
          values.set(text, entry.obstruction);
          decisions.push(`${entry.event}\0${text}`);
          retainedDecisionPairs.push(Object.freeze({ event: entry.event, obstruction: entry.obstruction }));
        }
      }
    } else {
      const parsed = source.parsed;
      uniqueEntries.set(parsed.slotDigest, parsed);
      const verified = addWitness(parsed.record.witness, name);
      for (const pair of parsed.record.artifacts) addBody(pair.ref, pair.canonicalText, name);
      let command;
      try { command = addressArtifact(parsed.command); }
      catch (error) { sourceCorrupt("unique-command-address", error); }
      if (command.ref !== parsed.record.commandRef || command.ref !== parsed.reference.payload) {
        throw unavailable("source-corrupt", "unique-command-correspondence");
      }
      addBody(command.ref, command.canonical.text, name);
      let descriptor;
      try {
        const anchor = "/fixture";
        descriptor = journalAppendAddress(anchor, "metroplat.journal.unique-admission",
          parsed.record.witness.observation.time,
          { subject: parsed.command.subject });
        const feed = path.relative(journalDirectoryOf(anchor), descriptor.path).split(path.sep).join("/");
        if (!safeSourceFeed(feed)) throw new TypeError("unique virtual feed is invalid");
        addFeedEvent(feedEvents, feed, verified.id);
      } catch (error) { sourceCorrupt("unique-virtual-feed", error); }
    }
  }

  decisions.sort(sourceOrdinal);
  const decisionKey = decisions.filter((value, index) => index === 0 || value !== decisions[index - 1]).join("\n");
  const retained = retainedDecisionPairs;
  const priorSources = prior?.sources;
  const unchanged = priorSources instanceof Map && priorSources.size === parsedSources.size
    && [...parsedSources].every(([name, source]) => {
      const old = priorSources.get(name);
      return old !== undefined && old.kind === source.kind && old.size === source.size
        && old.digest === source.digest && sameIdentity(old.identity, source.identity);
    }) && prior.decisionKey === decisionKey;
  const monotone = !unchanged && priorSources instanceof Map && prior.decisionKey === decisionKey
    && [...priorSources].every(([name, old]) => {
      const current = parsedSources.get(name);
      return current !== undefined && current.kind === old.kind && current.size === old.size
        && current.digest === old.digest && sameIdentity(current.identity, old.identity);
    });

  let substrate;
  if (unchanged) {
    substrate = prior.view.substrate;
  } else if (monotone && prior.view?.substrate !== undefined) {
    substrate = prior.view.substrate;
    const unseen = [...sourcePairs.values()].filter((pair) => substrate.artifact(pair.ref) === undefined);
    if (unseen.length > 0) {
      const received = substrate.receiveSourceSet(unseen);
      if (!isCausalWitness(received)) {
        operation.cache.value = undefined;
        throw unavailable("source-corrupt", "causal-source-set", received);
      }
    }
  } else {
    const obstructionRecords = [];
    for (const [event, values] of historicalObstructions) {
      for (const [, obstruction] of [...values].sort(([left], [right]) => sourceOrdinal(left, right))) {
        obstructionRecords.push(Object.freeze({ event, obstruction }));
      }
    }
    const rebuilt = rebuildCausalSubstrate([...sourcePairs.values()], undefined, undefined, obstructionRecords);
    if (!isCausalWitness(rebuilt)) sourceCorrupt("causal-reconstruction", rebuilt);
    substrate = rebuilt.value;
  }

  const view = Object.freeze({
    substrate, sources: parsedSources, envelopes, feedEvents, artifactCustody,
    envelopeCustody, uniqueEntries, historicalObstructions,
    sourceFiles: discovered.sourceFiles, sourceBytes: discovered.sourceBytes,
  });
  operation.assertLive();
  operation.assertBindings();
  operation.cache.value = Object.freeze({ sources: parsedSources, decisionKey, view });
  return view;
}

function createSourceScope(operation) {
  throw new TypeError("journal source view fabrication incomplete");
}

export function openSourceOwner(storeDirectory) {
  const root = bindDirectory(storeDirectory);
  const initialLock = openLock(root);
  const lockIdentity = Object.freeze({ dev: initialLock.dev, ino: initialLock.ino });
  let host;
  let release;
  try {
    release = acquire(initialLock);
    assertRoot(root);
    checkLockBinding(root, initialLock, lockIdentity);
    host = parseHost(root);
    assertBindings(root, initialLock, lockIdentity, host);
  } finally {
    if (release) release();
    closeSync(initialLock.fd);
  }

  const cache = { value: undefined };
  let invalidated = false;
  const owner = Object.freeze({
    withOperation(perform) {
      if (typeof perform !== "function") throw new TypeError("journal operation callback is invalid");
      if (invalidated) throw unavailable("storage-unavailable", "owner-invalidated");
      let lock;
      let releaseGate;
      let live = true;
      let publicationPossible = false;
      let callbackStarted = false;
      let callbackFailed = false;
      let callbackError;
      let failure;
      try {
        lock = openLock(root);
        if (!sameIdentity(lockIdentity, lock)) {
          invalidated = true;
          throw unavailable("storage-unavailable", "lock-binding-changed");
        }
        releaseGate = acquire(lock);
        assertBindings(root, lock, lockIdentity, host);
        const operation = Object.freeze({
          root: root.path,
          configuration: host.configuration,
          cache,
          assertLive() {
            if (!live) throw new TypeError("journal operation scope expired");
          },
          assertBindings() {
            if (!live) throw new TypeError("journal operation scope expired");
            try { assertBindings(root, lock, lockIdentity, host); } catch (error) {
              if (isJournalUnavailable(error) && error.reason === "storage-unavailable") invalidated = true;
              throw error;
            }
          },
          markPublicationPossible() {
            if (!live) throw new TypeError("journal operation scope expired");
            publicationPossible = true;
          },
        });
        operation.assertBindings();
        const scope = createSourceScope(operation);
        callbackStarted = true;
        try {
          const result = perform(scope);
          if (result !== null && (typeof result === "object" || typeof result === "function")
            && typeof result.then === "function") throw new TypeError("journal operation callback must be synchronous");
          operation.assertBindings();
          return result;
        } catch (error) {
          callbackFailed = true;
          callbackError = error;
          throw error;
        }
      } catch (error) {
        failure = error;
        if (publicationPossible) throw unavailable("publication-uncertain", "operation-acknowledgment", error);
        if (callbackStarted && callbackFailed && error === callbackError) throw error;
        if (isJournalUnavailable(error) || error instanceof TypeError) throw error;
        throw ioFailure(error, "operation");
      } finally {
        live = false;
        if (releaseGate) releaseGate();
        if (lock !== undefined) {
          try { closeSync(lock.fd); } catch (error) {
            if (failure === undefined) throw ioFailure(error, "lock-close");
          }
        }
      }
    },
  });
  return owner;
}

export function initializeJournal(storeDirectory, configuration) {
  const admitted = validateConfiguration(configuration);
  const root = bindDirectory(storeDirectory);
  return withGate(root, (lock) => {
    assertRoot(root);
    checkLockBinding(root, lock, Object.freeze({ dev: lock.dev, ino: lock.ino }));
    verifyUniqueCustody(root, admitted.configuration);
    const hostPath = path.join(root.path, HOST_NAME);
    let existing;
    try { existing = lstatSync(hostPath); } catch (error) {
      if (error?.code !== "ENOENT") throw ioFailure(error, "host-initialize-check");
    }
    if (existing !== undefined) {
      const current = parseHost(root);
      if (!current.bytes.equals(Buffer.from(admitted.bytes, "utf8"))) {
        throw unavailable("storage-unavailable", "host-configuration-conflict");
      }
      const hostFd = openSync(hostPath, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
      try { fsyncSync(hostFd); } finally { closeSync(hostFd); }
      fsyncSync(lock.fd);
      assertRoot(root);
      checkLockBinding(root, lock, Object.freeze({ dev: lock.dev, ino: lock.ino }));
      if (!parseHost(root).bytes.equals(Buffer.from(admitted.bytes, "utf8"))) {
        throw unavailable("storage-unavailable", "host-binding-changed");
      }
      return Object.freeze({ disposition: "existing", journal: admitted.configuration.journal });
    }
    let publicationPossible = false;
    try {
      assertRoot(root);
      publicationPossible = true;
      writeFileAtomicNew(hostPath, admitted.bytes, { mode: 0o600, durable: true });
      const published = parseHost(root);
      if (!published.bytes.equals(Buffer.from(admitted.bytes, "utf8"))) throw new Error("published host differs from proposal");
      fsyncSync(lock.fd);
      assertRoot(root);
      checkLockBinding(root, lock, Object.freeze({ dev: lock.dev, ino: lock.ino }));
      return Object.freeze({ disposition: "created", journal: admitted.configuration.journal });
    } catch (error) {
      if (publicationPossible) throw unavailable("publication-uncertain", "host-publication", error);
      throw error;
    }
  });
}
