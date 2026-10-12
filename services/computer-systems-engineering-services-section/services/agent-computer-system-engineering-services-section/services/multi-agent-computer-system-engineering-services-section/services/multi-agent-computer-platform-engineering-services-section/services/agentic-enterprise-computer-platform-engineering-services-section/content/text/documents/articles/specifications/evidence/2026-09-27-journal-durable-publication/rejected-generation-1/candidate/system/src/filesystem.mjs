/**
 * The host filesystem effects every engine shares: existence and stat checks,
 * directory walks, bounded UTF-8 and line reads, and atomic writes (replace,
 * replace-if-current, create-only) that never leave a torn target.
 */
import { appendFileSync, closeSync, createReadStream, createWriteStream, existsSync, linkSync, mkdirSync, openSync, promises as fsp, readdirSync, readFileSync, readSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** True when a host filesystem path exists. */
export function pathExists(filePath) {
  return existsSync(filePath);
}

/** Read host directory entries as Dirent records. */
export function readDirectoryEntries(dirPath) {
  return Object.freeze(readdirSync(dirPath, { withFileTypes: true }));
}

/** Visit admitted files depth-first in sorted-name order without retaining the
 * traversal.  Use this when a caller can keep its own bounded accumulator. */
export function visitFiles(start, visitFile, options = {}) {
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const visit = (dir, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readDirectoryEntries(dir);
    } catch {
      return;
    }
    for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
      if (options.skipSymbolicLinks === true && entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (options.pruneDirectory?.(entry.name, full) === true) continue;
        visit(full, depth + 1);
      } else if (entry.isFile() && (options.includeFile?.(entry.name, full) ?? true)) {
        visitFile(full);
      }
    }
  };
  visit(start, 0);
}

/**
 * Walk a directory tree depth-first in sorted-name order and return the
 * admitted file paths. The ONE tree-walk law for service boundaries:
 * unreadable directories degrade to silence (host boundary), and pruning and
 * admission are the caller's filters — services differ only in those
 * filters, never in the recursion.
 */
export function walkFiles(start, options = {}) {
  const files = [];
  visitFiles(start, (full) => files.push(full), options);
  return Object.freeze(files);
}

/** Read host directory child names. */
export function readDirectoryNames(dirPath) {
  return Object.freeze(readdirSync(dirPath));
}

/** Read host filesystem stat information, returning null when unavailable. */
export function statPathOrNull(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

/** Canonical host path of one existing filesystem entry, or null when the
 * entry cannot be resolved. Boundary services use this before scoped effects
 * so a symlink cannot turn a lexically in-root path into an out-of-root one. */
export function realPathOrNull(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return null;
  }
}

/** Read UTF-8 file content at a host filesystem boundary. */
export function readFileUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

/** Read UTF-8 file content, or undefined when the file cannot be read. */
export function readFileUtf8IfPresent(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

/** Read at most `maxBytes` from the start of a UTF-8 file. */
export function readFileHeadUtf8(filePath, maxBytes) {
  if (maxBytes <= 0) return "";
  const stat = statPathOrNull(filePath);
  if (stat === null || stat.size === 0) return "";
  const size = Math.min(maxBytes, stat.size);
  const fd = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(size);
    const bytesRead = readSync(fd, buffer, 0, size, 0);
    return new StringDecoder("utf8").write(buffer.subarray(0, bytesRead));
  } finally {
    closeSync(fd);
  }
}

/** Read raw file bytes at a host filesystem boundary, encoding-agnostic. */
export function readFileBuffer(filePath) {
  return readFileSync(filePath);
}

/**
 * Fold a UTF-8 file line by line, in bounded chunks, without ever holding the
 * whole file or its full line array resident.
 *
 * A whole-file read dies on V8's maximum string length (~1GiB), which made a
 * grown day log silently unreadable; `readFileLinesUtf8` fixed that ceiling
 * but still materializes every line in one array, so a source with unbounded
 * row count still grows the reader's memory with it. This is the sync
 * primitive both are built from: only each line and the caller's own
 * accumulator need fit in memory.
 */
export function foldFileLinesUtf8(filePath, onLine, chunkBytes = 64 * 1024 * 1024) {
  const fd = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(chunkBytes);
    const decoder = new StringDecoder("utf8");
    let carry = "";
    for (;;) {
      const bytesRead = readSync(fd, buffer, 0, chunkBytes, null);
      if (bytesRead === 0) break;
      const text = carry + decoder.write(buffer.subarray(0, bytesRead));
      const parts = text.split("\n");
      carry = parts.pop() ?? "";
      for (const part of parts) onLine(part);
    }
    carry += decoder.end();
    if (carry !== "") onLine(carry);
  } finally {
    closeSync(fd);
  }
}

/** Read a UTF-8 file as lines, in bounded chunks. Only each line must fit in a
 *  string, so line-recorded files (JSONL) stay readable at any file size —
 *  but the returned array still holds every line resident; callers whose row
 *  count is itself unbounded should fold via `foldFileLinesUtf8` instead. */
export function readFileLinesUtf8(filePath, chunkBytes = 64 * 1024 * 1024) {
  const lines = [];
  foldFileLinesUtf8(filePath, (line) => lines.push(line), chunkBytes);
  return lines;
}

/**
 * Stream a UTF-8 file as lines, one at a time, via a real Node read stream.
 *
 * Unlike `readFileLinesUtf8` (which still returns every line resident in one
 * array), this never holds more than the current line and Node's internal
 * stream buffers — the only shape that keeps a caller's memory bounded when
 * the source file's row count is itself unbounded (a growing day log).
 *
 * `maxBytes`, when given, bounds the read to exactly that many bytes from the
 * start of the file — the fixed-snapshot read a caller needs when the source
 * is itself still being appended to concurrently (an active day log), so two
 * independent passes over "the same" file (e.g. a row stream and a whole-file
 * hash) agree on exactly what "the file" was at the moment the caller stat'd
 * it, regardless of what gets appended after.
 */
export async function* readFileLinesStream(filePath, maxBytes) {
  const options = { encoding: "utf8" };
  if (maxBytes !== undefined && maxBytes > 0) options.end = maxBytes - 1;
  if (maxBytes === 0) return;
  const rl = createInterface({ input: createReadStream(filePath, options), crlfDelay: Infinity });
  try {
    for await (const line of rl) yield line;
  } finally {
    rl.close();
  }
}

/**
 * Write lines to a file synchronously by writing a temp sibling and renaming
 * it, where the caller drives production itself and calls the given `emit`
 * as each line becomes available — the sync sibling of `writeFileAtomic` for
 * a caller whose own source is a push-based fold (a line-by-line reader) over
 * an unbounded row count, so no line array is ever resident on either side.
 */
export function foldToLinesAtomicSync(filePath, produce) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  ensureDirectory(path.dirname(filePath));
  const fd = openSync(temp, "w");
  try {
    produce((line) => {
      writeSync(fd, `${line}\n`, null, "utf8");
    });
    closeSync(fd);
    renameSync(temp, filePath);
  } catch (error) {
    try {
      closeSync(fd);
    } catch {
      // Already closed.
    }
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/rename failure.
    }
    throw error;
  }
}

/** Write lines to a temp sibling, then publish only when the caller confirms
 *  the source it just folded is still current. A false commit predicate removes
 *  the temp file and reports `false`, so callers can refold from the newer
 *  source without ever publishing a known-stale projection. */
export function foldToLinesAtomicSyncIf(
  filePath,
  produce,
  shouldCommit,
) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  ensureDirectory(path.dirname(filePath));
  const fd = openSync(temp, "w");
  let closed = false;
  try {
    produce((line) => {
      writeSync(fd, `${line}\n`, null, "utf8");
    });
    closeSync(fd);
    closed = true;
    if (!shouldCommit()) {
      rmSync(temp, { force: true });
      return false;
    }
    renameSync(temp, filePath);
    return true;
  } catch (error) {
    if (!closed) {
      try {
        closeSync(fd);
      } catch {
        // Already closed.
      }
    }
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/rename failure.
    }
    throw error;
  }
}

/**
 * Write lines to a new immutable file by streaming them into a temp sibling,
 * hard-linking that temp into place, and removing the temp. This is the
 * source-admission sibling of `foldToLinesAtomicSync`: attempt artifacts are
 * facts, so an existing final path fails with `EEXIST` instead of being
 * overwritten, while callers still avoid constructing one resident body
 * string for a large row batch.
 */
export function foldToLinesAtomicSyncNew(filePath, produce) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  ensureDirectory(path.dirname(filePath));
  const fd = openSync(temp, "w");
  let closed = false;
  try {
    produce((line) => {
      writeSync(fd, `${line}\n`, null, "utf8");
    });
    closeSync(fd);
    closed = true;
    linkSync(temp, filePath);
    rmSync(temp, { force: true });
  } catch (error) {
    if (!closed) {
      try {
        closeSync(fd);
      } catch {
        // Already closed.
      }
    }
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/link failure.
    }
    throw error;
  }
}

/**
 * Write lines to a file by writing a temp sibling and renaming it, without
 * ever holding the whole body as one resident string — the streaming sibling
 * of `writeFileAtomic` for callers whose line count is itself unbounded.
 */
export async function writeLinesAtomic(filePath, lines) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  ensureDirectory(path.dirname(filePath));
  const stream = createWriteStream(temp, { encoding: "utf8" });
  try {
    for await (const line of lines) {
      if (!stream.write(`${line}\n`)) await new Promise((resolve) => stream.once("drain", resolve));
    }
    await new Promise((resolve, reject) => stream.end((error) => (error ? reject(error) : resolve())));
    renameSync(temp, filePath);
  } catch (error) {
    stream.destroy();
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/rename failure.
    }
    throw error;
  }
}

/** Ensure one host filesystem directory exists; `options.mode` sets the
 *  permissions of directories it creates. */
export function ensureDirectory(dirPath, options = {}) {
  mkdirSync(dirPath, { recursive: true, ...(options.mode === undefined ? {} : { mode: options.mode }) });
}

function fileOptions(options) {
  return { encoding: "utf8", ...(options.mode === undefined ? {} : { mode: options.mode }) };
}

/** Publish an existing immutable file at one additional path without copying
 * or replacing content. The source and target name the same inode; `EEXIST`
 * remains visible so the caller can verify an idempotent publication. */
export function linkFileNew(sourcePath, targetPath) {
  ensureDirectory(path.dirname(targetPath));
  linkSync(sourcePath, targetPath);
}

/** Remove one host filesystem directory and its contents, if present. */
export function removeDirectory(dirPath) {
  rmSync(dirPath, { recursive: true, force: true });
}

/** Remove one filesystem entry when present. */
export function removeFile(filePath) {
  rmSync(filePath, { force: true });
}

/** Append UTF-8 content to a file, creating the parent directory first. */
export function appendFileUtf8(filePath, content) {
  ensureDirectory(path.dirname(filePath));
  appendFileSync(filePath, content, "utf8");
}

function temporarySibling(filePath) {
  return `${filePath}.${process.pid}.${randomUUID()}.tmp`;
}

/** Atomically replace a file with UTF-8 text or bytes: write a temp sibling,
 *  then rename it over the target, so a crash never leaves a torn file.
 *  `options.mode` sets the file's permissions, `options.directoryMode`
 *  those of any parent directory it creates. */
export function writeFileAtomic(filePath, content, options = {}) {
  const temp = temporarySibling(filePath);
  ensureDirectory(path.dirname(filePath), { mode: options.directoryMode });
  try {
    writeFileSync(temp, content, fileOptions(options));
    renameSync(temp, filePath);
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/rename failure.
    }
    throw error;
  }
}

/** The asynchronous sibling of `writeFileAtomic`. */
export async function writeFileAtomicAsync(filePath, content, options = {}) {
  const temp = temporarySibling(filePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true, ...(options.directoryMode === undefined ? {} : { mode: options.directoryMode }) });
  try {
    await fsp.writeFile(temp, content, fileOptions(options));
    await fsp.rename(temp, filePath);
  } catch (error) {
    await fsp.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

/** Read one JSON document, or null when it is absent or unreadable. */
export function readJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/** Atomically write UTF-8 content only when the caller confirms the source it
 *  just read is still current. A false commit predicate removes the temp file
 *  and returns `false`, leaving the previously published projection untouched. */
export function writeFileAtomicIf(filePath, content, shouldCommit) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  ensureDirectory(path.dirname(filePath));
  try {
    writeFileSync(temp, content, "utf8");
    if (!shouldCommit()) {
      rmSync(temp, { force: true });
      return false;
    }
    renameSync(temp, filePath);
    return true;
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/rename failure.
    }
    throw error;
  }
}

/** Atomically create a new UTF-8 file without replacing an existing target.
 *
 * This is the source-admission sibling of `writeFileAtomic`: projections are
 * replaceable, but source attempt artifacts are immutable facts. The temp file
 * is hard-linked into place, so an existing final path fails with `EEXIST`
 * instead of being overwritten; the temp sibling is then removed.
 *
 * Set `options.durable` to true to write and synchronize a unique staging file
 * before linking it into place, then synchronize the file and bottom-up
 * directory chain. If the final path already exists, its file and directory
 * chain are synchronized before `EEXIST` is propagated. A failure after the
 * link may leave the published final name in place, so callers must treat that
 * outcome as uncertain. Durable mode assumes a local filesystem whose storage
 * binding honors hard-link exclusion and file and directory synchronization;
 * `fsync` does not establish physical-media durability on every provider. */
function syncDescriptorAndClose(fd) {
  let failed = false;
  let failure;
  try {
    fsyncSync(fd);
  } catch (error) {
    failed = true;
    failure = error;
  }
  try {
    closeSync(fd);
  } catch (error) {
    if (!failed) {
      failed = true;
      failure = error;
    }
  }
  if (failed) throw failure;
}

function syncDirectoryChain(filePath) {
  let directory = path.dirname(path.resolve(filePath));
  for (;;) {
    const fd = openSync(directory, "r");
    syncDescriptorAndClose(fd);
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

function syncExistingFile(filePath) {
  const fd = openSync(filePath, "r");
  syncDescriptorAndClose(fd);
}

function writeFileAtomicNewDurable(filePath, content, options) {
  const temp = temporarySibling(filePath);
  ensureDirectory(path.dirname(filePath), { mode: options.directoryMode });
  let fd;
  try {
    fd = openSync(temp, "wx", options.mode === undefined ? 0o600 : options.mode);
    writeFileSync(fd, content);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try {
      linkSync(temp, filePath);
    } catch (error) {
      if (error.code === "EEXIST") {
        syncExistingFile(filePath);
        syncDirectoryChain(filePath);
      }
      throw error;
    }
    rmSync(temp, { force: true });
    syncDirectoryChain(filePath);
  } catch (error) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // Preserve the primary write, synchronization, or close failure.
      }
    }
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the primary operation failure.
    }
    throw error;
  }
}

export function writeFileAtomicNew(filePath, content, options = {}) {
  if (Object.hasOwn(options, "durable") && typeof options.durable !== "boolean") {
    throw new TypeError("options.durable must be a Boolean");
  }
  if (options.durable === true) return writeFileAtomicNewDurable(filePath, content, options);

  const temp = temporarySibling(filePath);
  ensureDirectory(path.dirname(filePath), { mode: options.directoryMode });
  try {
    writeFileSync(temp, content, fileOptions(options));
    linkSync(temp, filePath);
    rmSync(temp, { force: true });
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Preserve the original write/link failure.
    }
    throw error;
  }
}
