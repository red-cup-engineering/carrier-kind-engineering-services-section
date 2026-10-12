import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
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
import { addressArtifact, addressPrimitiveArticulation, addressSiteConstitution, isArtifactRef, verifyArtifact } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/identity";
import { parseJournalWitness, parseUniqueJournalRecord } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/event";
import { isCausalWitness } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/judgment";
import { rebuildCausalSubstrate } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/substrate";
import { causalGraphOf, topologicalOrder } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/causal-graph";
import { journalDirectoryOf } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/store-root";
import { journalAppendAddress } from "./operations/index.mjs";
import { writeFileAtomicNew } from "../../filesystem.mjs";
import { isJournalUnavailable, journalUnavailable } from "../diagnostics.mjs";

const HOST_NAME = "host.json";
const LOCK_NAME = "maintenance.lock";
const HOST_KIND = "metroplat.journal.host";
const HOST_LIMIT = 16_384;
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
  let failed = false;
  let failure;
  let result;
  try {
    for (const component of rootComponents(resolved)) {
      for (const expected of identities) {
        let parentFd;
        try {
          const namedParent = lstatSync(expected.path);
          if (namedParent.isSymbolicLink() || !namedParent.isDirectory() || !sameIdentity(expected, namedParent)) {
            throw new Error("discovered ancestor binding changed");
          }
          parentFd = openSync(expected.path, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
          const openedParent = fstatSync(parentFd);
          if (!openedParent.isDirectory() || !sameIdentity(expected, openedParent)) {
            throw new Error("discovered ancestor descriptor changed");
          }
        } catch (error) {
          failed = true;
          failure = isJournalUnavailable(error) ? error : ioFailure(error, "root-binding");
        }
        if (parentFd !== undefined) {
          try { closeSync(parentFd); } catch (error) {
            if (!failed) { failed = true; failure = ioFailure(error, "host-close"); }
          }
        }
        if (failed) break;
      }
      if (failed) break;
      let fd;
      try {
        const named = lstatSync(component);
        if (named.isSymbolicLink() || !named.isDirectory()) throw new Error("root component is not a nonsymlink directory");
        fd = openSync(component, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
        const opened = fstatSync(fd);
        if (!opened.isDirectory() || !sameIdentity(named, opened)) throw new Error("root component identity changed");
        identities.push(Object.freeze({ path: component, dev: opened.dev, ino: opened.ino }));
      } catch (error) {
        failed = true;
        failure = isJournalUnavailable(error) ? error : ioFailure(error, "root-binding");
      }
      if (fd !== undefined) {
        try { closeSync(fd); } catch (error) {
          if (!failed) { failed = true; failure = ioFailure(error, "host-close"); }
        }
      }
      if (failed) break;
    }
    if (!failed) {
      const fsType = statfsSync(resolved).type;
      if (process.platform !== "linux" || fsType !== 0xef53) {
        throw unavailable("storage-unsupported", "filesystem-profile", Object.freeze({ platform: process.platform, fsType }));
      }
      const last = identities.at(-1);
      result = Object.freeze({ path: resolved, dev: last.dev, ino: last.ino, identities: Object.freeze(identities) });
    }
  } catch (error) {
    if (!failed) {
      failed = true;
      failure = isJournalUnavailable(error) ? error : ioFailure(error, "filesystem-profile");
    }
  }
  if (failed) throw failure;
  return result;
}

function assertRoot(root) {
  let failed = false;
  let failure;
  for (const expected of root.identities) {
    let fd;
    try {
      const named = lstatSync(expected.path);
      if (named.isSymbolicLink() || !named.isDirectory() || !sameIdentity(expected, named)) {
        throw new Error("bound directory changed type or identity");
      }
      fd = openSync(expected.path, fsConstants.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC);
      const opened = fstatSync(fd);
      if (!opened.isDirectory() || !sameIdentity(expected, opened)) throw new Error("bound directory identity changed");
    } catch (error) {
      failed = true;
      failure = isJournalUnavailable(error) ? error : ioFailure(error, "root-revalidation");
    }
    if (fd !== undefined) {
      try { closeSync(fd); } catch (error) {
        if (!failed) { failed = true; failure = ioFailure(error, "host-close"); }
      }
    }
    if (failed) break;
  }
  if (failed) throw failure;
}

function readBoundFile(root, name, maximum) {
  const filename = path.join(root.path, name);
  let fd;
  let failed = false;
  let failure;
  let result;
  try {
    assertRoot(root);
    const namedBefore = lstatSync(filename);
    if (namedBefore.isSymbolicLink() || !namedBefore.isFile()) {
      throw unavailable("source-corrupt", "host-file-type");
    }
    assertRoot(root);
    fd = openSync(filename, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
    const before = fstatSync(fd);
    if (!before.isFile() || !sameIdentity(namedBefore, before)) throw new Error("named file identity changed");
    if (!Number.isSafeInteger(before.size) || before.size < 0 || before.size > maximum) {
      throw unavailable("source-corrupt", "host-file-too-large");
    }
    const chunks = [];
    let total = 0;
    for (;;) {
      const remaining = maximum - total;
      const buffer = Buffer.alloc(Math.min(4096, remaining + 1));
      const count = readSync(fd, buffer, 0, buffer.length, null);
      if (count === 0) break;
      total += count;
      if (total > maximum) throw unavailable("source-corrupt", "host-file-too-large");
      chunks.push(buffer.subarray(0, count));
    }
    const after = fstatSync(fd);
    const namedAfter = lstatSync(filename);
    if (!after.isFile() || namedAfter.isSymbolicLink() || !namedAfter.isFile()
      || !sameIdentity(before, after) || !sameIdentity(before, namedAfter)
      || before.size !== after.size || after.size !== total) throw new Error("file changed during bounded read");
    result = Object.freeze({ bytes: Buffer.concat(chunks, total), identity: Object.freeze({ dev: before.dev, ino: before.ino }) });
  } catch (error) {
    failed = true;
    failure = isJournalUnavailable(error) ? error
      : error?.code === "ENOENT" ? unavailable("storage-unavailable", "host-unconfigured", error)
        : ioFailure(error, "host-read");
  }
  if (fd !== undefined) {
    try { closeSync(fd); } catch (error) {
      if (!failed) { failed = true; failure = ioFailure(error, "host-close"); }
    }
  }
  if (failed) throw failure;
  return result;
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
    const exactBytes = Buffer.from(`${checked.bytes}`, "utf8");
    if (!read.bytes.equals(exactBytes)) throw new TypeError("host is not canonical");
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
  let failed = false;
  let failure;
  let result;
  try {
    assertRoot(root);
    fd = openSync(filename, fsConstants.O_RDWR | fsConstants.O_CREAT | NOFOLLOW | CLOEXEC, 0o600);
    const opened = fstatSync(fd);
    const named = lstatSync(filename);
    if (!opened.isFile() || named.isSymbolicLink() || !named.isFile() || !sameIdentity(opened, named)) {
      throw new Error("maintenance lock binding is invalid");
    }
    assertRoot(root);
    const namedAfter = lstatSync(filename);
    if (namedAfter.isSymbolicLink() || !namedAfter.isFile() || !sameIdentity(opened, namedAfter)) {
      throw new Error("maintenance lock binding changed");
    }
    result = Object.freeze({ fd, path: filename, dev: opened.dev, ino: opened.ino });
    fd = undefined;
  } catch (error) {
    failed = true;
    failure = isJournalUnavailable(error) ? error
      : error?.code === "ELOOP" || error?.code === "ENOTDIR"
        ? unavailable("storage-unavailable", "lock-binding", error)
        : ioFailure(error, "lock-open");
  }
  if (fd !== undefined) {
    try { closeSync(fd); } catch (error) {
      if (!failed) { failed = true; failure = ioFailure(error, "host-close"); }
    }
  }
  if (failed) throw failure;
  return result;
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
    assertRoot(root);
    const opened = fstatSync(lock.fd);
    const named = lstatSync(lock.path);
    if (!opened.isFile() || named.isSymbolicLink() || !named.isFile()
      || !sameIdentity(expected, opened) || !sameIdentity(expected, named)) {
      throw new Error("bound lock identity changed");
    }
    const namedAfter = lstatSync(lock.path);
    if (namedAfter.isSymbolicLink() || !namedAfter.isFile() || !sameIdentity(expected, namedAfter)) {
      throw new Error("bound lock name changed");
    }
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

function withGate(root, perform, publication = { possible: false }) {
  const lock = openLock(root);
  let release;
  let failed = false;
  let primary;
  let result;
  try {
    release = acquire(lock);
    result = perform(lock);
  } catch (error) {
    failed = true;
    primary = error;
  }
  if (release !== undefined) {
    try { release(); } catch (error) {
      if (!failed) {
        failed = true;
        primary = ioFailure(error, "lock-release");
      }
    }
  }
  try { closeSync(lock.fd); } catch (error) {
    if (!failed) {
      failed = true;
      primary = ioFailure(error, "lock-close");
    }
  }
  if (failed) {
    if (publication.possible) throw unavailable("publication-uncertain", "host-publication", primary);
    throw primary;
  }
  return result;
}

function verifyUniqueCustody(root, configuration) {
  const limit = configuration.limits.maxScanBytes;
  const fixedLimit = JSON_RESOURCE_ENVELOPE.maxSourceBytes + 1;
  let workBytes = 0;
  let sourceBytes = 0;
  let sourceCount = 0;
  const physical = new Set();
  const ownedDirectories = [];
  const openDirectories = [];
  let failed = false;
  let failure;
  const stop = Symbol("unique-discovery-stopped");
  const recordFailure = (error) => {
    if (!failed) {
      failed = true;
      failure = error;
    }
  };
  const chargeWork = (amount) => {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > limit - workBytes) {
      throw unavailable("resource-limit", "unique-discovery-work");
    }
    workBytes += amount;
  };
  const readEntry = (listing, operation) => {
    try { return listing.readSync(); } catch (error) { throw ioFailure(error, operation); }
  };
  const closeListing = (listing, operation) => {
    try { listing.closeSync(); } catch (error) {
      const translated = ioFailure(error, operation);
      recordFailure(translated);
      throw stop;
    }
    const index = openDirectories.lastIndexOf(listing);
    if (index !== -1) openDirectories.splice(index, 1);
  };
  const closeOwnedDirectory = (directory, operation) => {
    try { closeSync(directory.fd); } catch (error) { recordFailure(ioFailure(error, operation)); }
  };
  try {
    assertRoot(root);
    const capturedRoot = root.identities[root.identities.length - 1];
    const rootDirectory = sourceDirectory(root.path, ".", false);
    ownedDirectories.push(rootDirectory);
    if (!sameIdentity(capturedRoot, rootDirectory)) {
      throw unavailable("storage-unavailable", "source-directory-binding-changed");
    }
    checkSourceDirectory(rootDirectory);
    assertRoot(root);

    let rootListing;
    try { rootListing = opendirSync(root.path); } catch (error) { throw ioFailure(error, "unique-root-discovery"); }
    openDirectories.push(rootListing);
    let hasFamily = false;
    for (let entry = readEntry(rootListing, "unique-root-discovery"); entry !== null; entry = readEntry(rootListing, "unique-root-discovery")) {
      chargeWork(sourcePathBytes(entry.name));
      if (entry.name === "unique-admissions") {
        hasFamily = true;
        const stat = sourceEntryStat(path.join(root.path, entry.name));
        if (stat.isSymbolicLink() || !stat.isDirectory()) {
          throw unavailable("source-corrupt", "unique-family-type");
        }
      }
    }
    closeListing(rootListing, "unique-root-close");
    checkSourceDirectory(rootDirectory);
    assertRoot(root);

    if (hasFamily) {
      checkSourceDirectory(rootDirectory);
      const familyPath = path.join(root.path, "unique-admissions");
      const familyDirectory = sourceDirectory(familyPath, "unique-admissions", true, rootDirectory);
      ownedDirectories.push(familyDirectory);
      let familyListing;
      try { familyListing = opendirSync(familyPath); } catch (error) { throw ioFailure(error, "unique-family-discovery"); }
      openDirectories.push(familyListing);
      let hasVersion = false;
      for (let entry = readEntry(familyListing, "unique-family-discovery"); entry !== null; entry = readEntry(familyListing, "unique-family-discovery")) {
        chargeWork(sourcePathBytes(`unique-admissions/${entry.name}`));
        if (entry.name !== "v1") throw unavailable("source-corrupt", "unique-family-version");
        hasVersion = true;
        const stat = sourceEntryStat(path.join(familyPath, entry.name));
        if (stat.isSymbolicLink() || !stat.isDirectory()) {
          throw unavailable("source-corrupt", "unique-version-type");
        }
      }
      closeListing(familyListing, "unique-family-close");
      checkSourceDirectory(rootDirectory);
      checkSourceDirectory(familyDirectory);
      assertRoot(root);
      if (!hasVersion) throw unavailable("source-corrupt", "unique-family-version");

      const versionPath = path.join(familyPath, "v1");
      checkSourceDirectory(rootDirectory);
      checkSourceDirectory(familyDirectory);
      const versionDirectory = sourceDirectory(versionPath, "unique-admissions/v1", true, familyDirectory);
      ownedDirectories.push(versionDirectory);
      let listing;
      try { listing = opendirSync(versionPath); } catch (error) { throw ioFailure(error, "unique-version-discovery"); }
      openDirectories.push(listing);
      for (let entry = readEntry(listing, "unique-version-discovery"); entry !== null; entry = readEntry(listing, "unique-version-discovery")) {
        const relativeName = `unique-admissions/v1/${entry.name}`;
        chargeWork(sourcePathBytes(relativeName));
        const stagingFinal = entry.name.slice(0, 69);
        const staging = /^[0-9a-f]{64}\.json$/.test(stagingFinal)
          && sourceStaging(entry.name, stagingFinal);
        const finalName = /^[0-9a-f]{64}\.json$/.test(entry.name);
        if (!staging && !finalName) throw unavailable("source-corrupt", "unique-source-name");

        checkSourceDirectory(rootDirectory);
        checkSourceDirectory(familyDirectory);
        checkSourceDirectory(versionDirectory);
        const filename = path.join(versionPath, entry.name);
        const namedBefore = sourceEntryStat(filename);
        if (namedBefore.isSymbolicLink() || !namedBefore.isFile()) {
          throw unavailable("source-corrupt", staging ? "unique-staging-entry" : "unique-source-file");
        }
        if (staging) continue;
        if (!Number.isSafeInteger(namedBefore.size) || namedBefore.size < 0) {
          throw unavailable("source-corrupt", "unique-source-length");
        }
        if (namedBefore.size > configuration.limits.maxBatchBytes) {
          throw unavailable("resource-limit", "unique-source-size");
        }
        if (namedBefore.size > fixedLimit) throw unavailable("resource-limit", "unique-source-envelope");

        let fd;
        let fileFailed = false;
        let fileFailure;
        try {
          checkSourceDirectory(rootDirectory);
          checkSourceDirectory(familyDirectory);
          checkSourceDirectory(versionDirectory);
          try { fd = openSync(filename, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC); } catch (error) {
            throw ioFailure(error, "unique-source-open");
          }
          let opened;
          try { opened = fstatSync(fd); } catch (error) {
            throw ioFailure(error, "unique-source-stat");
          }
          if (!opened.isFile() || !sameIdentity(namedBefore, opened)
            || namedBefore.size !== opened.size) {
            throw unavailable("storage-unavailable", "source-binding-changed");
          }
          if (!Number.isSafeInteger(opened.size) || opened.size < 0) {
            throw unavailable("storage-unavailable", "source-binding-changed");
          }
          if (opened.size > configuration.limits.maxBatchBytes) {
            throw unavailable("resource-limit", "unique-source-size");
          }
          if (opened.size > fixedLimit) throw unavailable("resource-limit", "unique-source-envelope");

          const identityKey = `${String(opened.dev)}:${String(opened.ino)}`;
          const isNewPhysical = !physical.has(identityKey);
          if (isNewPhysical) {
            if (sourceCount >= configuration.limits.maxSourceFiles) {
              throw unavailable("resource-limit", "unique-source-files");
            }
            if (opened.size > limit - sourceBytes) {
              throw unavailable("resource-limit", "unique-scan-bytes");
            }
          }

          const chunks = [];
          let total = 0;
          for (;;) {
            const buffer = Buffer.alloc(Math.min(65_536, opened.size + 1 - total));
            let read;
            try { read = readSync(fd, buffer, 0, buffer.length, null); } catch (error) { throw ioFailure(error, "unique-source-read"); }
            if (read === 0) break;
            total += read;
            if (total > opened.size) throw unavailable("storage-unavailable", "source-binding-changed");
            chunks.push(buffer.subarray(0, read));
          }
          let after;
          try { after = fstatSync(fd); } catch (error) {
            throw ioFailure(error, "unique-source-stat");
          }
          const namedAfter = sourceEntryStat(filename);
          if (!after.isFile() || namedAfter.isSymbolicLink() || !namedAfter.isFile()
            || !sameIdentity(opened, after) || !sameIdentity(opened, namedAfter)
            || opened.size !== after.size || opened.size !== namedAfter.size || after.size !== total) {
            throw unavailable("storage-unavailable", "source-binding-changed");
          }
          checkSourceDirectory(rootDirectory);
          checkSourceDirectory(familyDirectory);
          checkSourceDirectory(versionDirectory);
          const bytes = Buffer.concat(chunks, total);
          parseUniqueSource(Object.freeze({ name: relativeName, size: total, bytes }), configuration);
          if (isNewPhysical) {
            physical.add(identityKey);
            sourceCount += 1;
            sourceBytes += total;
          }
        } catch (error) {
          fileFailed = true;
          fileFailure = error;
        } finally {
          if (fd !== undefined) {
            try { closeSync(fd); } catch (error) {
              if (!fileFailed) {
                fileFailed = true;
                fileFailure = ioFailure(error, "unique-source-close");
              }
            }
          }
        }
        if (fileFailed) throw fileFailure;
      }
      closeListing(listing, "unique-version-close");
      checkSourceDirectory(rootDirectory);
      checkSourceDirectory(familyDirectory);
      checkSourceDirectory(versionDirectory);
      assertRoot(root);
    }
    checkSourceDirectory(rootDirectory);
    assertRoot(root);
  } catch (error) {
    if (error !== stop) recordFailure(error);
  }

  while (openDirectories.length > 0) {
    const listing = openDirectories[openDirectories.length - 1];
    try {
      listing.closeSync();
      openDirectories.pop();
    } catch (error) {
      recordFailure(ioFailure(error, "unique-discovery-close"));
      openDirectories.pop();
    }
  }
  while (ownedDirectories.length > 0) {
    const directory = ownedDirectories.pop();
    closeOwnedDirectory(directory, "unique-directory-close");
  }
  if (failed) throw failure;
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
  return { sources, sourceFiles, sourceBytes, discoveryWork };
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
      entries.push(Object.freeze({ kind: "artifact", ref: value.ref, canonicalText: value.canonicalText, verified: artifact }));
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
  let admitted;
  try {
    admitted = admitCanonicalJson(bytes, JSON_RESOURCE_ENVELOPE);
    if (!bytes.equals(Buffer.from(admitted.text, "utf8"))) {
      throw unavailable("source-corrupt", "unique-source-canonical");
    }
    return parseUniqueJournalRecord(admitted.value, configuration.journal, filenameDigest);
  } catch (error) {
    sourceCorrupt("unique-record", error);
  }
}

function refreshSourceView(operation) {
  operation.assertLive();
  operation.assertBindings();
  const discovered = readSourceFiles(operation);
  const prior = operation.cache.value;
  const limits = operation.configuration.limits;
  const bodyLimit = limits.maxLineBytes - 1;
  if (bodyLimit <= 0 && [...discovered.sources.values()].some((source) => source.kind === "retained")) {
    throw unavailable("resource-limit", "retained-line-capacity");
  }
  const lineEnvelope = Object.freeze({
    maxSourceBytes: bodyLimit, maxCanonicalBytes: bodyLimit, maxDepth: bodyLimit,
    maxNodes: bodyLimit, maxObjectMembers: bodyLimit, maxArrayLength: bodyLimit,
    maxStringBytes: bodyLimit, maxKeyBytes: bodyLimit,
  });
  const parsedSources = new Map();
  const correspondences = new Map();
  for (const [name, source] of discovered.sources) {
    const cached = prior?.sources?.get(name);
    const same = cached !== undefined && cached.kind === source.kind && cached.size === source.size
      && cached.digest === source.digest && sameIdentity(cached.identity, source.identity);
    let parsed;
    try {
      parsed = same ? cached.parsed : source.kind === "retained"
        ? parseRetainedSource(source, limits)
        : parseUniqueSource(source, operation.configuration);
    } catch (error) {
      if (isJournalUnavailable(error)) throw error;
      sourceCorrupt("source-parse", error);
    }
    const current = Object.freeze({ ...source, parsed });
    parsedSources.set(name, current);
    const cachedCorrespondence = same ? prior?.correspondences?.get(name) : undefined;
    if (cachedCorrespondence !== undefined) {
      correspondences.set(name, cachedCorrespondence);
      continue;
    }
    const rows = [];
    try {
      if (source.kind === "retained") {
        for (const entry of parsed) {
          if (entry.kind === "witness") {
            const verified = entry.verified;
            const canonicalText = canonicalJson(verified, lineEnvelope);
            rows.push(Object.freeze({ kind: "witness", verified, canonicalText,
              pairs: verified.sources, feed: entry.feed }));
          } else if (entry.kind === "artifact") {
            if (entry.verified.canonical.text !== entry.canonicalText) {
              throw unavailable("source-corrupt", "retained-artifact-canonical");
            }
            rows.push(Object.freeze({ kind: "artifact", pair: Object.freeze({
              ref: entry.ref, canonicalText: entry.canonicalText,
            }) }));
          } else {
            rows.push(entry);
          }
        }
      } else {
        const record = parsed;
        const verified = parseJournalWitness(record.record.witness);
        const pairs = [...verified.sources, ...record.record.artifacts];
        const command = addressArtifact(record.command);
        if (command.ref !== record.record.commandRef || command.ref !== record.reference.payload) {
          throw unavailable("source-corrupt", "unique-command-correspondence");
        }
        pairs.push(Object.freeze({ ref: command.ref, canonicalText: command.canonical.text }));
        const anchor = "/fixture";
        const descriptor = journalAppendAddress(anchor, "metroplat.journal.unique-admission",
          record.record.witness.observation.time, { subject: record.command.subject });
        const feed = path.relative(journalDirectoryOf(anchor), descriptor.path).split(path.sep).join("/");
        if (!safeSourceFeed(feed)) throw new TypeError("unique virtual feed is invalid");
        rows.push(Object.freeze({ kind: "unique", parsed: record, verified,
          canonicalText: canonicalJson(verified, JSON_RESOURCE_ENVELOPE), pairs: Object.freeze(pairs), feed }));
      }
    } catch (error) {
      sourceCorrupt("source-correspondence", error);
    }
    correspondences.set(name, Object.freeze(rows));
  }

  const envelopes = new Map();
  const feedEvents = new Map();
  const artifactCustody = new Map();
  const envelopeCustody = new Map();
  const uniqueEntries = new Map();
  const decisionValues = new Map();
  const bodyTexts = new Map();
  const sourcePairs = new Map();
  const decisions = [];

  function addBody(pair, name) {
    const existing = bodyTexts.get(pair.ref);
    if (existing !== undefined && existing !== pair.canonicalText) {
      throw unavailable("source-corrupt", "artifact-body-conflict");
    }
    bodyTexts.set(pair.ref, pair.canonicalText);
    addSourceCustody(artifactCustody, pair.ref, name);
    if (!sourcePairs.has(pair.ref)) sourcePairs.set(pair.ref, pair);
  }

  function addWitness(row, name) {
    for (const pair of row.pairs) addBody(pair, name);
    const verified = row.verified;
    const existing = envelopes.get(verified.id);
    if (existing !== undefined && existing.canonicalText !== row.canonicalText) {
      throw unavailable("source-corrupt", "normalized-envelope-conflict");
    }
    if (existing === undefined) {
      envelopes.set(verified.id, Object.freeze({ statement: verified, canonicalText: row.canonicalText }));
    }
    addSourceCustody(envelopeCustody, verified.id, name);
    if (row.feed !== undefined) addFeedEvent(feedEvents, row.feed, verified.id);
    return verified.id;
  }

  for (const [name, source] of parsedSources) {
    for (const row of correspondences.get(name)) {
      if (row.kind === "witness" || row.kind === "unique") {
        const event = addWitness(row, name);
        if (row.kind === "unique") uniqueEntries.set(row.parsed.slotDigest, row.parsed);
        if (row.feed !== undefined) addFeedEvent(feedEvents, row.feed, event);
      } else if (row.kind === "artifact") {
        addBody(row.pair, name);
      } else {
        let values = decisionValues.get(row.event);
        if (values === undefined) { values = new Map(); decisionValues.set(row.event, values); }
        values.set(row.canonicalText, row.obstruction);
        decisions.push(`${row.event}\0${row.canonicalText}`);
      }
    }
  }

  const historicalObstructions = new Map();
  const obstructionRecords = [];
  for (const [event, values] of decisionValues) {
    const ordered = [...values].sort(([left], [right]) => sourceOrdinal(left, right));
    const originals = Object.freeze(ordered.map(([, obstruction]) => obstruction));
    historicalObstructions.set(event, originals);
    for (const [, obstruction] of ordered) {
      obstructionRecords.push(Object.freeze({ event, obstruction }));
    }
  }
  decisions.sort(sourceOrdinal);
  const decisionKey = decisions.filter((value, index) => index === 0 || value !== decisions[index - 1]).join("\n");
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
        && current.digest === old.digest && sameIdentity(old.identity, current.identity);
    });

  let substrate;
  if (unchanged) {
    substrate = prior.view.substrate;
  } else if (monotone && prior.view?.substrate !== undefined) {
    substrate = prior.view.substrate;
    const unseen = [...sourcePairs.values()].filter((pair) => substrate.artifact(pair.ref) === undefined);
    operation.cache.value = undefined;
    try {
      if (unseen.length > 0) {
        const received = substrate.receiveSourceSet(unseen);
        if (!isCausalWitness(received)) sourceCorrupt("causal-source-set", received);
      }
    } catch (error) {
      operation.cache.value = undefined;
      throw error;
    }
  } else {
    const rebuilt = rebuildCausalSubstrate([...sourcePairs.values()], undefined, undefined, obstructionRecords);
    if (!isCausalWitness(rebuilt)) sourceCorrupt("causal-reconstruction", rebuilt);
    substrate = rebuilt.value;
  }

  const view = Object.freeze({
    substrate, sources: parsedSources, envelopes, feedEvents, artifactCustody,
    envelopeCustody, uniqueEntries, historicalObstructions,
    sourceFiles: discovered.sourceFiles, sourceBytes: discovered.sourceBytes,
    discoveryWork: discovered.discoveryWork,
  });
  try {
    operation.assertLive();
    operation.assertBindings();
  } catch (error) {
    if (monotone && !unchanged) operation.cache.value = undefined;
    throw error;
  }
  operation.cache.value = Object.freeze({ sources: parsedSources, correspondences, decisionKey, view });
  return view;
}

const sourceScopeStates = new WeakMap();
const SOURCE_EFFECTS_INCOMPLETE = "journal source effects fabrication incomplete";

function scopeInput(value, keys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${label} is invalid`);
  const own = Reflect.ownKeys(value);
  if (own.some((key) => typeof key !== "string")
    || own.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new TypeError(`${label} is invalid`);
  }
  const result = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${label} is invalid`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function scopeReference(value, label) {
  if (typeof value !== "string" || !isArtifactRef(value)) throw new TypeError(`${label} is invalid`);
  return value;
}

function scopeFeed(value) {
  if (!safeSourceFeed(value)) throw new TypeError("journal feed is invalid");
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("journal feed is invalid");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError("journal feed is invalid");
    }
  }
  return value;
}

function scopeDate(value) {
  if (typeof value !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(value)) {
    throw new TypeError("journal date is invalid");
  }
  return value;
}

function scopeSelection(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("journal selection is invalid");
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (kindDescriptor === undefined || !("value" in kindDescriptor) || !kindDescriptor.enumerable) {
    throw new TypeError("journal selection is invalid");
  }
  switch (kindDescriptor.value) {
    case "feed": {
      const input = scopeInput(value, ["kind", "feed"], "journal selection");
      return Object.freeze({ kind: "feed", feed: scopeFeed(input.feed) });
    }
    case "date": {
      const input = scopeInput(value, ["kind", "date"], "journal selection");
      return Object.freeze({ kind: "date", date: scopeDate(input.date) });
    }
    case "territory": {
      scopeInput(value, ["kind"], "journal selection");
      return Object.freeze({ kind: "territory" });
    }
    case "as-of": {
      const input = scopeInput(value, ["kind", "feed", "frontier"], "journal selection");
      const feed = scopeFeed(input.feed);
      const frontier = input.frontier;
      if (!Array.isArray(frontier) || Object.getPrototypeOf(frontier) !== Array.prototype) {
        throw new TypeError("journal frontier is invalid");
      }
      const keys = Reflect.ownKeys(frontier);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(frontier, "length");
      if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
        || keys.length !== lengthDescriptor.value + 1) throw new TypeError("journal frontier is invalid");
      const refs = [];
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(frontier, String(index));
        if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError("journal frontier is invalid");
        }
        const ref = scopeReference(descriptor.value, "journal frontier reference");
        if (index > 0 && sourceOrdinal(refs[index - 1], ref) >= 0) {
          throw new TypeError("journal frontier must be strictly ordinal-sorted");
        }
        refs.push(ref);
      }
      return Object.freeze({ kind: "as-of", feed, frontier: Object.freeze(refs) });
    }
    default: throw new TypeError("journal selection is invalid");
  }
}

function sourceDateFeeds(view, date) {
  const parts = date.split("-");
  const prefix = `${parts[0]}/${parts[1]}/${parts[2]}/`;
  return [...view.feedEvents.keys()].filter((feed) => feed.startsWith(prefix)
    && feed.slice(prefix.length).length > 0).sort(sourceOrdinal);
}

function sourceSelectionFeeds(view, selection) {
  if (selection.kind === "feed") return view.feedEvents.has(selection.feed) ? [selection.feed] : [];
  if (selection.kind === "date") return sourceDateFeeds(view, selection.date);
  if (selection.kind === "territory") return [...view.feedEvents.keys()].sort(sourceOrdinal);
  throw new TypeError("selection does not name feeds");
}

function sourceOrderedEnvelopes(view, refs, requiredRefs = refs) {
  const selected = new Set(refs);
  const closure = new Set();
  const pending = [...requiredRefs];
  const witnesses = [];
  while (pending.length > 0) {
    const ref = pending.pop();
    if (closure.has(ref)) continue;
    const witness = view.substrate.witness(ref);
    if (witness === undefined) throw unavailable("evidence-unavailable", "selected-cause-missing");
    if (view.substrate.witnessState(ref) !== "admitted") {
      throw unavailable("evidence-unavailable", "selected-cause-incomplete");
    }
    closure.add(ref);
    witnesses.push({ id: ref, core: witness.core });
    for (const cause of witness.core.causes) pending.push(cause);
  }
  let ordered;
  try { ordered = topologicalOrder(causalGraphOf(witnesses)); }
  catch (error) { throw unavailable("source-corrupt", "selected-causal-order", error); }
  const result = [];
  for (const witness of ordered) {
    if (!selected.has(witness.id)) continue;
    const envelope = view.envelopes.get(witness.id);
    if (envelope === undefined) throw unavailable("evidence-unavailable", "selected-envelope-missing");
    result.push(envelope.statement);
  }
  return Object.freeze(result);
}

function sourceCompleteRefs(view, refs) {
  for (const ref of refs) {
    if (view.substrate.witnessState(ref) !== "admitted" || !view.envelopes.has(ref)) {
      throw unavailable("evidence-unavailable", "selected-witness-incomplete");
    }
  }
}

function sourceAsOfRefs(view, selection) {
  const closure = new Set();
  const pending = [...selection.frontier];
  while (pending.length > 0) {
    const ref = pending.pop();
    if (closure.has(ref)) continue;
    if (view.substrate.witnessState(ref) !== "admitted") {
      throw unavailable("evidence-unavailable", "as-of-frontier-incomplete");
    }
    const witness = view.substrate.witness(ref);
    if (witness === undefined) throw unavailable("evidence-unavailable", "as-of-frontier-missing");
    closure.add(ref);
    for (const cause of witness.core.causes) pending.push(cause);
  }
  const membership = view.feedEvents.get(selection.feed) ?? new Set();
  const refs = [...closure].filter((ref) => membership.has(ref));
  sourceCompleteRefs(view, refs);
  return Object.freeze({ refs, requiredRefs: Object.freeze([...closure]) });
}

function sourceWitness(state, reference) {
  const operation = state.operation;
  operation.assertLive();
  const ref = scopeReference(reference, "journal witness reference");
  const view = state.view;
  const envelope = view.envelopes.get(ref);
  const stateName = view.substrate.witnessState(ref);
  const missing = stateName === "quarantined" ? view.substrate.missingDependencies(ref) : Object.freeze([]);
  const decisions = new Map();
  for (const obstruction of view.historicalObstructions.get(ref) ?? []) {
    decisions.set(canonicalJson(obstruction), obstruction);
  }
  const derived = view.substrate.obstruction(ref);
  if (derived !== undefined) decisions.set(canonicalJson(derived), derived);
  const obstructions = Object.freeze([...decisions].sort(([left], [right]) => sourceOrdinal(left, right))
    .map(([, obstruction]) => obstruction));
  return Object.freeze({
    event: ref,
    statement: envelope?.statement ?? null,
    state: stateName,
    missing: Object.freeze([...missing]),
    obstructions,
  });
}

function sourceArtifact(state, reference) {
  state.operation.assertLive();
  const ref = scopeReference(reference, "journal artifact reference");
  const artifact = state.view.substrate.artifact(ref);
  return artifact === undefined ? null : Object.freeze({ ref, canonicalText: artifact.canonical.text });
}

function sourceFeeds(state, selectionValue) {
  state.operation.assertLive();
  const selection = scopeSelection(selectionValue);
  if (selection.kind !== "date" && selection.kind !== "territory") {
    throw new TypeError("journal feeds selection is invalid");
  }
  return Object.freeze(sourceSelectionFeeds(state.view, selection));
}

function sourceEvents(state, selectionValue) {
  state.operation.assertLive();
  const selection = scopeSelection(selectionValue);
  const view = state.view;
  let refs;
  let requiredRefs;
  if (selection.kind === "as-of") {
    const asOf = sourceAsOfRefs(view, selection);
    refs = asOf.refs;
    requiredRefs = asOf.requiredRefs;
  } else {
    const selected = new Set();
    for (const feed of sourceSelectionFeeds(view, selection)) {
      for (const ref of view.feedEvents.get(feed) ?? []) selected.add(ref);
    }
    refs = [...selected];
    sourceCompleteRefs(view, refs);
  }
  return sourceOrderedEnvelopes(view, refs, requiredRefs ?? refs);
}

function sourceStatus(state, feedValue) {
  state.operation.assertLive();
  const feed = scopeFeed(feedValue);
  const view = state.view;
  const refs = [...(view.feedEvents.get(feed) ?? [])];
  let admittedEvents = 0;
  let pendingEvents = 0;
  let blockedEvents = 0;
  const admitted = [];
  for (const ref of refs) {
    const status = view.substrate.witnessState(ref);
    if (status === "admitted") {
      admittedEvents += 1;
      admitted.push(ref);
    } else if (status === "quarantined") pendingEvents += 1;
    else if (status === "blocked") blockedEvents += 1;
    else throw unavailable("source-corrupt", "feed-membership-without-witness");
  }
  admitted.sort(sourceOrdinal);
  let representationBytes = 0;
  for (const ref of admitted) {
    const envelope = view.envelopes.get(ref);
    if (envelope === undefined) throw unavailable("source-corrupt", "admitted-envelope-missing");
    representationBytes += Buffer.byteLength(`${canonicalJson(envelope.statement)}\n`, "utf8");
  }
  if (!Number.isSafeInteger(representationBytes)) throw unavailable("resource-limit", "feed-representation-bytes");
  return Object.freeze({
    exists: refs.length > 0,
    retainedEvents: refs.length,
    admittedEvents,
    pendingEvents,
    blockedEvents,
    representationBytes,
    representationEncoding: "metroplat.journal.admitted-witness-jsonl.v1",
  });
}

function sourceUsage(state) {
  state.operation.assertLive();
  const { sourceFiles, sourceBytes } = state.view;
  if (!Number.isSafeInteger(sourceFiles) || sourceFiles < 0
    || !Number.isSafeInteger(sourceBytes) || sourceBytes < 0) {
    throw unavailable("source-corrupt", "source-usage-invalid");
  }
  return Object.freeze({ sourceFiles, sourceBytes });
}

function sourceUniqueRecord(state, digestValue) {
  state.operation.assertLive();
  if (typeof digestValue !== "string" || !/^[0-9a-f]{64}$/u.test(digestValue)) {
    throw new TypeError("unique slot digest is invalid");
  }
  const parsed = state.view.uniqueEntries.get(digestValue);
  return parsed === undefined ? null : Object.freeze({
    record: parsed.record,
    command: parsed.command,
    slotDigest: parsed.slotDigest,
    reference: parsed.reference,
  });
}

function retainedInputArray(entries) {
  if (!Array.isArray(entries) || Object.getPrototypeOf(entries) !== Array.prototype) {
    throw new TypeError("retained entries must be an ordinary array");
  }
  const keys = Reflect.ownKeys(entries);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(entries, "length");
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
    throw new TypeError("retained entries must be a dense array");
  }
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length <= 0 || keys.length !== length + 1) {
    throw new TypeError("retained entries must be a nonempty dense array");
  }
  const values = new Array(length);
  for (const key of keys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)) {
      throw new TypeError("retained entries must be a dense array");
    }
    const index = Number(key);
    const descriptor = Object.getOwnPropertyDescriptor(entries, key);
    if (!Number.isSafeInteger(index) || index >= length || descriptor === undefined
      || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError("retained entries must be a dense data array");
    }
    values[index] = descriptor.value;
  }
  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(values, index)) throw new TypeError("retained entries must be dense");
  }
  return values;
}

function retainedDiscoveryAddition(operation) {
  const opened = [sourceDirectory(operation.root, "", false)];
  let failed = false;
  let primary;
  let addition = 0;
  try {
    operation.assertLive();
    operation.assertBindings();
    let parent = opened[0];
    const names = ["retained", "v1"];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const relativeName = index === 0 ? "retained" : "retained/v1";
      checkSourceDirectory(parent);
      const filename = path.join(parent.path, name);
      let stat;
      try {
        stat = lstatSync(filename);
      } catch (error) {
        if (error?.code !== "ENOENT") throw ioFailure(error, "retained-parent-stat");
        for (let missing = index; missing < names.length; missing += 1) {
          const missingName = missing === 0 ? "retained" : "retained/v1";
          addition += sourcePathBytes(missingName);
        }
        break;
      }
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw unavailable("storage-unavailable", "retained-parent-type");
      }
      parent = sourceDirectory(filename, relativeName, false, parent);
      opened.push(parent);
    }
    operation.assertBindings();
  } catch (error) {
    failed = true;
    primary = error;
  }
  for (let index = opened.length - 1; index >= 0; index -= 1) {
    try {
      closeSync(opened[index].fd);
    } catch (error) {
      if (!failed) {
        failed = true;
        primary = ioFailure(error, "retained-parent-close");
      }
    }
  }
  if (failed) throw primary;
  return addition;
}

function retainedParents(operation) {
  const root = sourceDirectory(operation.root, "", false);
  const opened = [root];
  let failed = false;
  let primary;
  try {
    operation.assertLive();
    operation.assertBindings();
    function child(parent, name, relativeName) {
      checkSourceDirectory(parent);
      const filename = path.join(parent.path, name);
      let stat;
      try {
        stat = lstatSync(filename);
      } catch (error) {
        if (error?.code !== "ENOENT") sourceIo(error, "retained-parent-stat");
        try {
          mkdirSync(`/proc/self/fd/${parent.fd}/${name}`, { mode: 0o700 });
        } catch (createError) {
          if (createError?.code !== "EEXIST") sourceIo(createError, "retained-parent-create");
        }
        stat = sourceEntryStat(filename);
      }
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw unavailable("storage-unavailable", "retained-parent-type");
      }
      const bound = sourceDirectory(filename, relativeName, false, parent);
      opened.push(bound);
      return bound;
    }
    const retained = child(root, "retained", "retained");
    const version = child(retained, "v1", "retained/v1");
    operation.assertBindings();
    checkSourceDirectory(root);
    checkSourceDirectory(retained);
    checkSourceDirectory(version);
    return { root, retained, version, opened };
  } catch (error) {
    failed = true;
    primary = error;
  }
  for (let index = opened.length - 1; index >= 0; index -= 1) {
    try { closeSync(opened[index].fd); } catch (error) {
      if (!failed) { failed = true; primary = ioFailure(error, "retained-parent-close"); }
    }
  }
  throw primary;
}

function closeRetainedParents(parents, failurePresent, primaryFailure) {
  let failed = failurePresent;
  let primary = primaryFailure;
  for (let index = parents.opened.length - 1; index >= 0; index -= 1) {
    try { closeSync(parents.opened[index].fd); } catch (error) {
      if (!failed) { failed = true; primary = ioFailure(error, "retained-parent-close"); }
    }
  }
  if (failed) throw primary;
}

function publishRetainedInScope(state, entries) {
  const operation = state.operation;
  operation.assertLive();
  const supplied = retainedInputArray(entries);
  const limits = operation.configuration.limits;
  const bodyLimit = limits.maxLineBytes - 1;
  if (bodyLimit <= 0) throw unavailable("resource-limit", "retained-line-capacity");
  const lineEnvelope = Object.freeze({
    maxSourceBytes: bodyLimit, maxCanonicalBytes: bodyLimit, maxDepth: bodyLimit,
    maxNodes: bodyLimit, maxObjectMembers: bodyLimit, maxArrayLength: bodyLimit,
    maxStringBytes: bodyLimit, maxKeyBytes: bodyLimit,
  });
  const uniqueTextBytes = new Map();
  let uniqueBatchBytes = 0;
  for (const entry of supplied) {
    let canonical;
    try {
      canonical = canonicalizeJson(entry, lineEnvelope);
    } catch (error) {
      if (isJournalUnavailable(error)) throw error;
      if (["source-limit", "canonical-limit", "depth-limit", "node-limit", "object-member-limit",
        "array-length-limit", "string-limit", "key-limit"].includes(error?.code)) {
        throw unavailable("resource-limit", "retained-line-envelope", error);
      }
      throw new TypeError("retained entry is not admissible JSON");
    }
    const lineBytes = canonical.byteLength + 1;
    if (lineBytes > limits.maxLineBytes) {
      throw unavailable("resource-limit", "retained-line-bytes");
    }
    if (!uniqueTextBytes.has(canonical.text)) {
      if (lineBytes > limits.maxBatchBytes - uniqueBatchBytes) {
        throw unavailable("resource-limit", "source-batch-bytes");
      }
      uniqueTextBytes.set(canonical.text, lineBytes);
      uniqueBatchBytes += lineBytes;
    }
  }
  const uniqueTexts = [...uniqueTextBytes.keys()].sort(sourceOrdinal);
  const content = Buffer.from(`${uniqueTexts.join("\n")}\n`, "utf8");
  const digest = createHash("sha256").update(content).digest("hex");
  const relativeName = `retained/v1/${digest}.jsonl`;
  const sourceName = `${digest}.jsonl`;
  const candidate = Object.freeze({
    name: relativeName, kind: "retained", identity: Object.freeze({ dev: 0, ino: 0 }),
    size: content.length, digest, bytes: content,
  });
  try {
    parseRetainedSource(candidate, limits);
  } catch (error) {
    if (isJournalUnavailable(error) && error.reason === "resource-limit") throw error;
    throw new TypeError("retained entries do not satisfy the retained source laws");
  }

  const beforeView = state.view;
  const priorRetainedIds = new Set(beforeView.envelopeCustody.keys());
  const priorAdmittedIds = new Set(beforeView.substrate.admittedWitnessRefs());
  const proposedEnvelopes = new Map();
  for (const entry of parseRetainedSource(candidate, limits)) {
    if (entry.kind !== "witness") continue;
    const canonicalText = canonicalJson(entry.verified, lineEnvelope);
    const prior = proposedEnvelopes.get(entry.verified.id) ?? beforeView.envelopes.get(entry.verified.id);
    if (prior !== undefined && (typeof prior === "string" ? prior : prior.canonicalText) !== canonicalText) {
      throw new TypeError("retained batch conflicts with an existing normalized witness envelope");
    }
    proposedEnvelopes.set(entry.verified.id, canonicalText);
  }
  const existing = beforeView.sources.get(relativeName);
  if (existing !== undefined) {
    if (!existing.bytes.equals(content)) {
      throw unavailable("source-corrupt", "retained-digest-collision");
    }
    synchronizeExistingSources(operation.root, [Object.freeze({
      name: relativeName, identity: existing.identity, bytes: existing.bytes,
      size: existing.size, digest: existing.digest,
    })], operation.assertBindings);
    operation.assertLive();
    operation.assertBindings();
    return Object.freeze({ disposition: "existing", digest, retainedEvents: Object.freeze([]), admittedEvents: Object.freeze([]) });
  }

  if (beforeView.sourceFiles >= limits.maxSourceFiles) {
    throw unavailable("resource-limit", "source-file-count");
  }
  if (content.length > limits.maxScanBytes - beforeView.sourceBytes) {
    throw unavailable("resource-limit", "source-bytes");
  }
  const directoryAddition = retainedDiscoveryAddition(operation);
  const publicationDiscoveryAddition = sourcePathBytes(relativeName) + directoryAddition;
  if (publicationDiscoveryAddition > limits.maxScanBytes - beforeView.discoveryWork) {
    throw unavailable("resource-limit", "source-discovery-work");
  }
  operation.assertLive();
  operation.assertBindings();

  const parents = retainedParents(operation);
  let failed = false;
  let primary;
  try {
    checkSourceDirectory(parents.root);
    checkSourceDirectory(parents.retained);
    checkSourceDirectory(parents.version);
    operation.assertBindings();
    operation.markPublicationPossible();
    writeFileAtomicNew(path.join(parents.version.path, sourceName), content, {
      mode: 0o600, directoryMode: 0o700, durable: true,
    });
    operation.assertBindings();
    checkSourceDirectory(parents.root);
    checkSourceDirectory(parents.retained);
    checkSourceDirectory(parents.version);
    state.view = refreshSourceView(operation);
  } catch (error) {
    failed = true;
    primary = error;
  }
  closeRetainedParents(parents, failed, primary);
  if (failed) throw primary;

  const newlyRetained = [];
  for (const entry of parseRetainedSource(candidate, limits)) {
    if (entry.kind === "witness" && !priorRetainedIds.has(entry.verified.id)) newlyRetained.push(entry.verified.id);
  }
  newlyRetained.sort(sourceOrdinal);
  const admittedEvents = state.view.substrate.admittedWitnessRefs()
    .filter((reference) => !priorAdmittedIds.has(reference)).sort(sourceOrdinal);
  operation.assertLive();
  operation.assertBindings();
  return Object.freeze({ disposition: "created", digest,
    retainedEvents: Object.freeze([...new Set(newlyRetained)]),
    admittedEvents: Object.freeze([...new Set(admittedEvents)]) });
}

function publishUniqueInScope(state, record) {
  state.operation.assertLive();
  void record;
  throw new TypeError(SOURCE_EFFECTS_INCOMPLETE);
}

function requiredReferenceArray(value, label, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${label} is invalid`);
  }
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
    || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
    || keys.length !== lengthDescriptor.value + 1
    || keys.some((key) => key !== "length"
      && (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)
        || Number(key) >= lengthDescriptor.value))) {
    throw new TypeError(`${label} is invalid`);
  }
  if (lengthDescriptor.value > maximum) throw unavailable("resource-limit", `${label}-count`);
  const refs = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable
      || !isArtifactRef(descriptor.value)) throw new TypeError(`${label} is invalid`);
    const ref = descriptor.value;
    if (index > 0 && sourceOrdinal(refs[index - 1], ref) >= 0) {
      throw new TypeError(`${label} must be strictly ordinal-sorted`);
    }
    refs.push(ref);
  }
  return refs;
}

function requiredSourceClosure(state, requirement) {
  const operation = state.operation;
  operation.assertLive();
  operation.assertBindings();
  const input = scopeInput(requirement, ["events", "artifacts", "uniqueSlot"], "journal durability requirement");
  const limits = operation.configuration.limits;
  const requestedEvents = requiredReferenceArray(input.events, "required events", limits.maxClosureWitnesses);
  const requestedArtifacts = requiredReferenceArray(input.artifacts, "required artifacts", limits.maxClosureArtifacts);
  const view = state.view;
  const roots = new Set();
  const requiredArtifacts = new Set();
  const eventRecords = new Map();
  const orderedSources = new Set();
  const pending = [];
  const scheduledEvents = new Set();

  function scheduleEvent(reference, isRoot = false) {
    if (!scheduledEvents.has(reference)) {
      if (scheduledEvents.size >= limits.maxClosureWitnesses) {
        throw unavailable("resource-limit", "closure-witness-count");
      }
      scheduledEvents.add(reference);
      pending.push(reference);
    }
    if (isRoot) roots.add(reference);
  }

  for (const reference of requestedEvents) scheduleEvent(reference, true);
  let closureBytes = 0;

  function chargeBytes(text, label) {
    const amount = Buffer.byteLength(text, "utf8");
    if (!Number.isSafeInteger(amount) || amount > limits.maxClosureBytes - closureBytes) {
      throw unavailable("resource-limit", label);
    }
    closureBytes += amount;
  }

  function addArtifact(reference) {
    if (requiredArtifacts.has(reference)) return;
    if (requiredArtifacts.size >= limits.maxClosureArtifacts) {
      throw unavailable("resource-limit", "closure-artifact-count");
    }
    const artifact = view.substrate.artifact(reference);
    const custody = view.artifactCustody.get(reference);
    if (artifact === undefined || custody === undefined || custody.size === 0) {
      throw unavailable("evidence-unavailable", "required-artifact-custody");
    }
    requiredArtifacts.add(reference);
    chargeBytes(artifact.canonical.text, "closure-bytes");
  }

  let uniqueSource;
  if (input.uniqueSlot !== null) {
    const slot = scopeInput(input.uniqueSlot, ["journal", "slotDigest"], "unique slot");
    if (slot.journal !== operation.configuration.journal
      || typeof slot.slotDigest !== "string" || !/^[0-9a-f]{64}$/u.test(slot.slotDigest)) {
      throw new TypeError("unique slot is invalid");
    }
    const parsed = view.uniqueEntries.get(slot.slotDigest);
    const name = `unique-admissions/v1/${slot.slotDigest}.json`;
    const source = view.sources.get(name);
    if (parsed === undefined || parsed.slotDigest !== slot.slotDigest
      || source === undefined || source.kind !== "unique" || source.parsed !== parsed) {
      throw unavailable("evidence-unavailable", "original-unique-occupancy");
    }
    let verified;
    try { verified = parseJournalWitness(parsed.record.witness); }
    catch (error) { sourceCorrupt("required-unique-witness", error); }
    if (!isArtifactRef(parsed.reference?.payload)) {
      throw unavailable("source-corrupt", "unique-command-reference");
    }
    scheduleEvent(verified.id, true);
    addArtifact(parsed.reference.payload);
    uniqueSource = name;
  }

  while (pending.length > 0) {
    const reference = pending.pop();
    if (eventRecords.has(reference)) continue;
    const witness = view.substrate.witness(reference);
    if (witness === undefined || view.substrate.witnessState(reference) !== "admitted") {
      throw unavailable("evidence-unavailable", "required-event-not-admitted");
    }
    if (eventRecords.size >= limits.maxClosureWitnesses) {
      throw unavailable("resource-limit", "closure-witness-count");
    }
    eventRecords.set(reference, witness);
    const envelope = view.envelopes.get(reference);
    if (envelope !== undefined) {
      if (view.envelopeCustody.get(reference)?.size === 0
        || view.envelopeCustody.get(reference) === undefined) {
        throw unavailable("evidence-unavailable", "required-envelope-custody");
      }
      chargeBytes(envelope.canonicalText, "closure-bytes");
    } else {
      const coreArtifact = view.substrate.artifact(reference);
      if (coreArtifact === undefined) throw unavailable("evidence-unavailable", "required-core-body");
      chargeBytes(coreArtifact.canonical.text, "closure-bytes");
    }

    addArtifact(reference);
    const siteReference = view.substrate.site?.ref;
    const siteArtifact = typeof siteReference === "string" ? view.substrate.artifact(siteReference) : undefined;
    if (siteArtifact === undefined || view.artifactCustody.get(siteReference)?.size === 0
      || view.artifactCustody.get(siteReference) === undefined) {
      throw unavailable("evidence-unavailable", "required-site-custody");
    }
    try {
      if (addressSiteConstitution(siteArtifact.canonical.value).ref !== siteReference) {
        throw new TypeError("site address mismatch");
      }
    } catch (error) { sourceCorrupt("required-site-body", error); }
    addArtifact(siteReference);

    addArtifact(witness.core.articulation);
    const articulationArtifact = view.substrate.artifact(witness.core.articulation);
    let articulation;
    try {
      if (articulationArtifact === undefined) throw new TypeError("articulation body is missing");
      articulation = addressPrimitiveArticulation(articulationArtifact.canonical.value);
      if (articulation.ref !== witness.core.articulation) throw new TypeError("articulation address mismatch");
    } catch (error) { sourceCorrupt("required-articulation", error); }
    addArtifact(articulation.articulation.token);
    addArtifact(articulation.articulation.claim);
    for (const reference of witness.core.referencedArtifacts) addArtifact(reference);
    for (const cause of witness.core.causes) scheduleEvent(cause);
  }

  for (const reference of requestedArtifacts) addArtifact(reference);

  const causalEntries = [...eventRecords].map(([id, witness]) => ({ id, core: witness.core }));
  let orderedEvents;
  try { orderedEvents = topologicalOrder(causalGraphOf(causalEntries)); }
  catch (error) { sourceCorrupt("required-causal-order", error); }
  const depths = new Map([...roots].map((reference) => [reference, 0]));
  for (let index = orderedEvents.length - 1; index >= 0; index -= 1) {
    const event = orderedEvents[index];
    const depth = depths.get(event.id);
    if (depth === undefined) continue;
    for (const cause of event.core.causes) {
      const candidate = depth + 1;
      if (candidate > limits.maxClosureDepth) throw unavailable("resource-limit", "closure-depth");
      if (candidate > (depths.get(cause) ?? -1)) depths.set(cause, candidate);
    }
  }

  function supplyingNames(map, reference) {
    const names = map.get(reference);
    return names === undefined ? [] : [...names].sort(sourceOrdinal);
  }

  function selectRepresentation(reference, names) {
    const available = names.filter((name) => view.sources.has(name));
    if (available.length === 0) throw unavailable("evidence-unavailable", "required-source-custody");
    const alreadySelected = available.find((name) => orderedSources.has(name));
    orderedSources.add(alreadySelected ?? available[0]);
  }

  if (uniqueSource !== undefined) orderedSources.add(uniqueSource);
  for (const reference of [...eventRecords.keys()].sort(sourceOrdinal)) {
    const envelope = view.envelopes.get(reference);
    if (envelope !== undefined) {
      selectRepresentation(reference, supplyingNames(view.envelopeCustody, reference));
    } else {
      selectRepresentation(reference, supplyingNames(view.artifactCustody, reference));
    }
  }
  for (const reference of [...requiredArtifacts].sort(sourceOrdinal)) {
    selectRepresentation(reference, supplyingNames(view.artifactCustody, reference));
  }

  operation.assertLive();
  operation.assertBindings();
  return Object.freeze({
    journal: operation.configuration.journal,
    events: Object.freeze([...eventRecords.keys()].sort(sourceOrdinal)),
    artifacts: Object.freeze([...requiredArtifacts].sort(sourceOrdinal)),
    sources: Object.freeze([...orderedSources].sort(sourceOrdinal)),
  });
}

const sourceDurabilityReceipts = new WeakMap();

function synchronizeExistingSources(root, descriptions, bindingAssertion) {
  const directories = new Map();
  const files = [];
  const openedFiles = [];
  let failed = false;
  let primary;
  let assertionFailure = false;

  function rememberFailure(error) {
    if (!failed) {
      failed = true;
      primary = error;
    }
  }

  function assertBindings() {
    try {
      bindingAssertion();
    } catch (error) {
      assertionFailure = true;
      rememberFailure(error);
      throw error;
    }
  }

  function checkedDirectory(absolutePath) {
    const existing = directories.get(absolutePath);
    if (existing !== undefined) return existing;
    const pieces = rootComponents(absolutePath);
    let parent;
    for (const piece of pieces) {
      let bound = directories.get(piece);
      if (bound === undefined) {
        bound = sourceDirectory(piece, path.relative(root, piece), false, parent);
        directories.set(piece, bound);
      } else {
        checkSourceDirectory(bound);
      }
      parent = bound;
    }
    return directories.get(absolutePath);
  }

  function checkFileName(file) {
    checkSourceDirectory(file.parent);
    const named = lstatSync(file.openPath);
    const opened = fstatSync(file.fd);
    if (named.isSymbolicLink() || !named.isFile() || !opened.isFile()
      || !sourceIdentity(file.identity, named) || !sourceIdentity(file.identity, opened)
      || (file.expectedSize !== undefined
        && (named.size !== file.expectedSize || opened.size !== file.expectedSize))) {
      throw unavailable("storage-unavailable", "source-file-binding-changed");
    }
  }

  try {
    if (typeof root !== "string" || !path.isAbsolute(root) || !Array.isArray(descriptions)
      || typeof bindingAssertion !== "function") {
      throw new TypeError("existing source barrier input is invalid");
    }
    assertBindings();
    for (const description of descriptions) {
      if (description === null || typeof description !== "object"
        || typeof description.name !== "string" || description.name.length === 0
        || path.isAbsolute(description.name) || description.name.includes("\\")
        || description.name.split("/").some((piece) => piece === "" || piece === "." || piece === "..")) {
        throw unavailable("evidence-unavailable", "source-name-invalid");
      }
      const filename = path.join(root, ...description.name.split("/"));
      const parentPath = path.dirname(filename);
      const parent = checkedDirectory(parentPath);
      checkSourceDirectory(parent);
      const basename = path.basename(filename);
      const openPath = `/proc/self/fd/${parent.fd}/${basename}`;
      let fd = description.fd;
      if (fd === undefined) {
        fd = openSync(openPath, fsConstants.O_RDONLY | NOFOLLOW | CLOEXEC);
        openedFiles.push(fd);
      }
      const opened = fstatSync(fd);
      const identity = description.identity;
      if (identity === null || typeof identity !== "object" || !opened.isFile()
        || !sourceIdentity(identity, opened)) {
        throw unavailable("storage-unavailable", "source-file-binding-changed");
      }
      const file = {
        description, fd, identity,
        expectedSize: description.bytes === undefined ? undefined : description.size,
        openPath, parent, filename,
      };
      checkFileName(file);
      if (description.bytes !== undefined) {
        const expected = description.bytes;
        const size = description.size;
        if (!Buffer.isBuffer(expected) || !Number.isSafeInteger(size) || size < 0
          || size !== expected.length
          || typeof description.digest !== "string" || !/^[0-9a-f]{64}$/u.test(description.digest)
          || createHash("sha256").update(expected).digest("hex") !== description.digest
          || opened.size !== size) {
          throw unavailable("source-corrupt", "source-barrier-description");
        }
        const actual = Buffer.alloc(size);
        let offset = 0;
        while (offset < size) {
          const count = readSync(fd, actual, offset, size - offset, offset);
          if (count <= 0) throw unavailable("storage-unavailable", "source-read-short");
          offset += count;
        }
        const afterRead = fstatSync(fd);
        checkFileName(file);
        if (!afterRead.isFile() || afterRead.size !== size
          || !sourceIdentity(identity, afterRead) || !actual.equals(expected)
          || createHash("sha256").update(actual).digest("hex") !== description.digest) {
          throw unavailable("source-corrupt", "source-bytes-changed");
        }
      }
      const physicalKey = `${String(opened.dev)}:${String(opened.ino)}`;
      let physical = files.find((item) => item.physicalKey === physicalKey);
      if (physical === undefined) {
        physical = { physicalKey, fd, identity, names: [] };
        files.push(physical);
      }
      physical.names.push(file);
    }

    assertBindings();
    for (const physical of files) {
      for (const file of physical.names) checkFileName(file);
      fsyncSync(physical.fd);
      for (const file of physical.names) checkFileName(file);
      if (!sourceIdentity(physical.identity, fstatSync(physical.fd))) {
        throw unavailable("storage-unavailable", "source-file-binding-changed");
      }
    }
    const orderedDirectories = [...directories.values()].sort((left, right) => {
      const depth = (value) => value.path === path.parse(value.path).root
        ? 0 : value.path.split(path.sep).filter(Boolean).length;
      return depth(right) - depth(left) || sourceOrdinal(right.path, left.path);
    });
    for (const directory of orderedDirectories) {
      checkSourceDirectory(directory);
      fsyncSync(directory.fd);
      checkSourceDirectory(directory);
    }
    for (const physical of files) {
      for (const file of physical.names) checkFileName(file);
    }
    for (const directory of directories.values()) checkSourceDirectory(directory);
    assertBindings();
  } catch (error) {
    rememberFailure(error);
  } finally {
    for (let index = openedFiles.length - 1; index >= 0; index -= 1) {
      try {
        closeSync(openedFiles[index]);
      } catch (error) {
        if (!failed) {
          failed = true;
          primary = ioFailure(error, "source-barrier-file-close");
        }
      }
    }
    const ownedDirectories = [...directories.values()];
    for (let index = ownedDirectories.length - 1; index >= 0; index -= 1) {
      try {
        closeSync(ownedDirectories[index].fd);
      } catch (error) {
        if (!failed) {
          failed = true;
          primary = ioFailure(error, "source-barrier-directory-close");
        }
      }
    }
  }
  if (failed) {
    if (assertionFailure || isJournalUnavailable(primary) || primary instanceof TypeError) throw primary;
    sourceIo(primary, "source-barrier");
  }
}

function requireDurableInScope(state, requirement) {
  const operation = state.operation;
  operation.assertLive();
  operation.assertBindings();
  const closure = requiredSourceClosure(state, requirement);
  const view = state.view;
  const descriptions = closure.sources.map((name) => {
    const source = view.sources.get(name);
    if (source === undefined || source.name !== name
      || source.identity === null || typeof source.identity !== "object"
      || !("dev" in source.identity) || !("ino" in source.identity)
      || !Buffer.isBuffer(source.bytes) || !Number.isSafeInteger(source.size)
      || source.size < 0 || source.size !== source.bytes.length) {
      throw unavailable("evidence-unavailable", "required-source-custody");
    }
    return source;
  });
  synchronizeExistingSources(operation.root, descriptions, operation.assertBindings);
  operation.assertLive();
  operation.assertBindings();
  const selected = Object.freeze(descriptions.map((source) => Object.freeze({
    name: source.name,
    identity: Object.freeze({ dev: source.identity.dev, ino: source.identity.ino }),
    digest: source.digest,
    size: source.size,
  })).sort((left, right) => sourceOrdinal(left.name, right.name)));
  const evidence = Object.freeze({
    journal: closure.journal,
    events: closure.events,
    artifacts: closure.artifacts,
    sources: selected,
  });
  const receipt = Object.freeze(Object.create(null));
  sourceDurabilityReceipts.set(receipt, Object.freeze({ state, operation, evidence }));
  return receipt;
}

function createSourceScope(operation) {
  operation.assertLive();
  const state = { operation, view: refreshSourceView(operation) };
  const scope = Object.freeze({
    witness(reference) { return sourceWitness(state, reference); },
    artifact(reference) { return sourceArtifact(state, reference); },
    feeds(selection) { return sourceFeeds(state, selection); },
    events(selection) { return sourceEvents(state, selection); },
    sourceStatus(feed) { return sourceStatus(state, feed); },
    sourceUsage() { return sourceUsage(state); },
    uniqueRecord(slotDigest) { return sourceUniqueRecord(state, slotDigest); },
    publishRetained(entries) { operation.assertLive(); return publishRetainedInScope(state, entries); },
    publishUnique(record) { operation.assertLive(); return publishUniqueInScope(state, record); },
    requireDurable(requirement) { operation.assertLive(); return requireDurableInScope(state, requirement); },
  });
  sourceScopeStates.set(scope, state);
  return scope;
}

export function openSourceOwner(storeDirectory) {
  const root = bindDirectory(storeDirectory);
  const initialLock = openLock(root);
  const lockIdentity = Object.freeze({ dev: initialLock.dev, ino: initialLock.ino });
  let host;
  let release;
  let initializationFailed = false;
  let initializationFailure;
  try {
    release = acquire(initialLock);
    assertBindings(root, initialLock, lockIdentity, parseHost(root));
    host = parseHost(root);
    assertBindings(root, initialLock, lockIdentity, host);
  } catch (error) {
    initializationFailed = true;
    initializationFailure = error;
  }
  if (release !== undefined) {
    try { release(); } catch (error) {
      if (!initializationFailed) {
        initializationFailed = true;
        initializationFailure = ioFailure(error, "lock-release");
      }
    }
  }
  try { closeSync(initialLock.fd); } catch (error) {
    if (!initializationFailed) {
      initializationFailed = true;
      initializationFailure = ioFailure(error, "lock-close");
    }
  }
  if (initializationFailed) throw initializationFailure;

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
      let failed = false;
      let primary;
      let primaryIsCallback = false;
      let result;
      const rejectBinding = (error) => {
        invalidated = true;
        throw error;
      };
      try {
        try { lock = openLock(root); } catch (error) { rejectBinding(error); }
        if (!sameIdentity(lockIdentity, lock)) {
          rejectBinding(unavailable("storage-unavailable", "lock-binding-changed"));
        }
        releaseGate = acquire(lock);
        try { assertBindings(root, lock, lockIdentity, host); } catch (error) { rejectBinding(error); }
        const operation = Object.freeze({
          root: root.path,
          configuration: host.configuration,
          cache,
          assertLive() {
            if (!live) throw new TypeError("journal operation scope expired");
          },
          assertBindings() {
            if (!live) throw new TypeError("journal operation scope expired");
            try { assertBindings(root, lock, lockIdentity, host); } catch (error) { rejectBinding(error); }
          },
          markPublicationPossible() {
            if (!live) throw new TypeError("journal operation scope expired");
            publicationPossible = true;
          },
        });
        operation.assertBindings();
        const scope = createSourceScope(operation);
        try {
          result = perform(scope);
          if (result !== null && (typeof result === "object" || typeof result === "function")
            && typeof result.then === "function") throw new TypeError("journal operation callback must be synchronous");
          operation.assertBindings();
        } catch (error) {
          primaryIsCallback = true;
          throw error;
        }
      } catch (error) {
        failed = true;
        primary = error;
      }
      live = false;
      if (releaseGate !== undefined) {
        try { releaseGate(); } catch (error) {
          if (!failed) {
            failed = true;
            primary = ioFailure(error, "lock-release");
          }
        }
      }
      if (lock !== undefined) {
        try { closeSync(lock.fd); } catch (error) {
          if (!failed) {
            failed = true;
            primary = ioFailure(error, "lock-close");
          }
        }
      }
      if (failed) {
        if (publicationPossible) throw unavailable("publication-uncertain", "operation-acknowledgment", primary);
        if (primaryIsCallback) throw primary;
        if (isJournalUnavailable(primary) || primary instanceof TypeError) throw primary;
        throw ioFailure(primary, "operation");
      }
      return result;
    },
  });
  return owner;
}

export function initializeJournal(storeDirectory, configuration) {
  const admitted = validateConfiguration(configuration);
  const root = bindDirectory(storeDirectory);
  const publication = { possible: false };
  return withGate(root, (lock) => {
    const boundLock = Object.freeze({ dev: lock.dev, ino: lock.ino });
    assertRoot(root);
    checkLockBinding(root, lock, boundLock);
    verifyUniqueCustody(root, admitted.configuration);
    const hostPath = path.join(root.path, HOST_NAME);
    let existing;
    try { existing = lstatSync(hostPath); } catch (error) {
      if (error?.code !== "ENOENT") throw ioFailure(error, "host-initialize-check");
    }
    let disposition;
    if (existing !== undefined) {
      const current = parseHost(root);
      if (!current.bytes.equals(Buffer.from(admitted.bytes, "utf8"))) {
        throw unavailable("storage-unavailable", "host-configuration-conflict");
      }
      disposition = "existing";
    } else {
      assertRoot(root);
      checkLockBinding(root, lock, boundLock);
      publication.possible = true;
      writeFileAtomicNew(hostPath, admitted.bytes, { mode: 0o600, durable: true });
      disposition = "created";
    }

    const verified = parseHost(root);
    if (!verified.bytes.equals(Buffer.from(admitted.bytes, "utf8"))) {
      throw unavailable("source-corrupt", "host-initialization-bytes");
    }
    const bindingAssertion = () => {
      assertRoot(root);
      checkLockBinding(root, lock, boundLock);
      const current = parseHost(root);
      if (!sameIdentity(verified.identity, current.identity)
        || current.digest !== verified.digest
        || !current.bytes.equals(verified.bytes)) {
        throw unavailable("storage-unavailable", "host-binding-changed");
      }
    };
    bindingAssertion();
    synchronizeExistingSources(root.path, [
      {
        name: HOST_NAME,
        identity: verified.identity,
        bytes: verified.bytes,
        size: verified.bytes.length,
        digest: verified.digest,
      },
      { name: LOCK_NAME, identity: boundLock, fd: lock.fd },
    ], bindingAssertion);
    bindingAssertion();
    return Object.freeze({ disposition, journal: admitted.configuration.journal });
  }, publication);
}
