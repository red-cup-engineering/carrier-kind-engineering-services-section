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
