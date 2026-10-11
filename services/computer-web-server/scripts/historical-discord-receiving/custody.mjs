import { createHash } from "node:crypto";
import { closeSync, constants, copyFileSync, chmodSync, fstatSync, lstatSync, mkdtempSync, openSync, readSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const historicalIndexCustodyPaths = file => [file, ...['-wal','-shm','-journal','.admission'].map(suffix => file + suffix)];

const MAX_SOURCE_BYTES = 16 * 1024 ** 2;
const fingerprint = (held) => [held.dev, held.ino, held.mode, held.size, held.mtimeNs, held.ctimeNs].join(":");
const within = (child, parent) => { const relative = path.relative(parent, child); return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)); };

/** Resolve an existing path or future destination without admitting symbolic-link ancestors. */
function plainPath(file) {
  const resolved = path.resolve(file), parts = resolved.split(path.sep).filter(Boolean);
  let current = path.parse(resolved).root;
  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    let held;
    try { held = lstatSync(current); }
    catch (error) { if (error.code === "ENOENT") return resolved; throw error; }
    if (held.isSymbolicLink()) throw new Error("Historical receiving refuses symbolic-link custody or destination ancestors");
    if (i < parts.length - 1 && !held.isDirectory()) throw new Error("Historical receiving requires directory ancestors");
  }
  return realpathSync(resolved);
}

function noArtifacts(file) {
  for (const carrier of historicalIndexCustodyPaths(file).filter((name) => name !== path.resolve(file))) {
    try { lstatSync(carrier); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    throw new Error(`Historical receiving refuses unresolved sidecar or backup custody: ${carrier}`);
  }
}

/** Hash an unchanged, regular, no-follow source without changing any original custody. */
function identity(file) {
  plainPath(file);
  noArtifacts(file);
  const before = lstatSync(file, { bigint: true });
  if (!before.isFile() || before.size > BigInt(MAX_SOURCE_BYTES)) throw new Error("Historical Discord source requires bounded regular custody");
  const descriptor = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  const hash = createHash("sha256"), buffer = Buffer.alloc(1024 * 1024);
  try {
    if (fingerprint(fstatSync(descriptor, { bigint: true })) !== fingerprint(before)) throw new Error("Historical Discord source changed before reading");
    let bytes = 0;
    for (;;) {
      const read = readSync(descriptor, buffer, 0, buffer.length, null);
      if (read === 0) break;
      bytes += read;
      if (bytes > MAX_SOURCE_BYTES) throw new Error("Historical Discord source bound exhausted");
      hash.update(buffer.subarray(0, read));
    }
    if (fingerprint(fstatSync(descriptor, { bigint: true })) !== fingerprint(before) || fingerprint(lstatSync(file, { bigint: true })) !== fingerprint(before)) throw new Error("Historical Discord source changed while reading");
    noArtifacts(file);
    return { sha256: hash.digest("hex"), fingerprint: fingerprint(before) };
  } finally { closeSync(descriptor); }
}

/** Own only the private snapshot; the source, its siblings and native source journal stay untouched. */
export function withHistoricalSnapshot(file, root, expectedSha256, use) {
  if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(expectedSha256)) throw new Error("Historical Discord source requires an expected SHA-256 identity");
  if (typeof root !== "string" || root.length === 0) throw new Error("Historical receiving requires a named native destination");
  const source = plainPath(file), destination = plainPath(root);
  try {
    if (!lstatSync(destination).isDirectory()) throw new Error("Historical destination must be a native journal directory");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const reserved = [...historicalIndexCustodyPaths(source), `${source}.journal`];
  if (reserved.some((carrier) => within(destination, carrier) || within(carrier, destination))) throw new Error("Historical Discord receiving requires a distinct native destination");
  const before = identity(source);
  if (before.sha256 !== expectedSha256) throw new Error("Historical Discord source identity does not match");
  let snapshot, snapshotIdentity;
  const verify = () => {
    if (snapshotIdentity !== undefined) {
      const held = identity(snapshot);
      if (held.sha256 !== expectedSha256 || held.fingerprint !== snapshotIdentity.fingerprint) throw new Error("Historical Discord snapshot changed");
    }
    if (plainPath(root) !== destination) throw new Error("Historical Discord destination changed");
    const after = identity(source);
    if (after.sha256 !== expectedSha256 || after.fingerprint !== before.fingerprint) throw new Error("Historical Discord original source changed");
  };
  const scratch = mkdtempSync(path.join(tmpdir(), "historical-discord-receiving-"));
  try {
    snapshot = path.join(scratch, "source.sqlite");
    copyFileSync(source, snapshot, constants.COPYFILE_EXCL);
    chmodSync(snapshot, 0o400);
    snapshotIdentity = identity(snapshot);
    if (snapshotIdentity.sha256 !== expectedSha256) throw new Error("Historical Discord snapshot identity does not match");
    verify();
    return use(snapshot, verify);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
