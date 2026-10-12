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
import { parseUniqueJournalRecord } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/event";
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
