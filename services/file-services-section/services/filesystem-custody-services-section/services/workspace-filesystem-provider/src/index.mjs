import { createHash, randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_READ_BYTES = 256 * 1024;
export const MAX_WRITE_BYTES = 1024 * 1024;

const digest = value => createHash("sha256").update(value).digest("hex");
const canonical = value => JSON.stringify(value, Object.keys(value).sort());

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

async function custodyRoot(root) {
  if (typeof root !== "string" || root.length === 0) fail("invalid-root", "custody root is required");
  return realpath(root);
}

/** Resolve one relative path without accepting an escape or a symlink target. */
async function targetAt(root, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) fail("invalid-path", "path must be a non-empty relative path");
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) fail("outside-root", "path escapes the custody root");
  const parent = await realpath(path.dirname(target));
  if (parent !== root && !parent.startsWith(`${root}${path.sep}`)) fail("outside-root", "resolved parent escapes the custody root");
  try {
    if ((await lstat(target)).isSymbolicLink()) fail("symlink-target", "custody provider does not write through symlinks");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return target;
}

async function appendReceipt(outbox, receipt) {
  await mkdir(path.dirname(outbox), { recursive: true });
  const handle = await open(outbox, "a", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(receipt)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function readWorkspaceFile({ root, path: relativePath, maxBytes = MAX_READ_BYTES }) {
  const resolvedRoot = await custodyRoot(root);
  const target = await targetAt(resolvedRoot, relativePath);
  const stat = await lstat(target);
  if (!stat.isFile()) fail("not-file", "read target is not a regular file");
  const bound = Math.min(MAX_READ_BYTES, Number.isSafeInteger(maxBytes) && maxBytes > 0 ? maxBytes : MAX_READ_BYTES);
  if (stat.size > bound) fail("read-too-large", `read target exceeds ${bound} bytes`);
  const content = await readFile(target, "utf8");
  return Object.freeze({ kind: "filesystem-read-receipt/v1", root: resolvedRoot, path: path.relative(resolvedRoot, target).split(path.sep).join("/"), bytes: Buffer.byteLength(content), sha256: digest(content), content });
}

/**
 * Write only after exact content-address admission. The lock makes the
 * compare-and-swap explicit; host isolation remains the enforcement layer for
 * foreign processes. Every successful change has one durable outbox receipt.
 */
export async function writeWorkspaceFile({ root, path: relativePath, expectedSha256, content, outbox }) {
  if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(expectedSha256)) fail("invalid-expected", "expectedSha256 must be a SHA-256 hex digest");
  if (typeof content !== "string" || Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) fail("write-too-large", `content must be UTF-8 and at most ${MAX_WRITE_BYTES} bytes`);
  if (typeof outbox !== "string" || outbox.length === 0) fail("invalid-outbox", "outbox path is required");
  const resolvedRoot = await custodyRoot(root);
  const target = await targetAt(resolvedRoot, relativePath);
  const resolvedOutbox = path.resolve(outbox);
  const lock = `${target}.filesystem-custody.lock`;
  let lockHandle;
  try {
    lockHandle = await open(lock, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") fail("busy", "target has an active custody write");
    throw error;
  }
  try {
    const beforeContent = await readFile(target, "utf8");
    const before = digest(beforeContent);
    if (before !== expectedSha256) fail("stale-source", "target no longer matches the admitted content identity");
    const after = digest(content);
    const relative = path.relative(resolvedRoot, target).split(path.sep).join("/");
    if (before === after) return Object.freeze({ kind: "filesystem-write-receipt/v1", changed: false, root: resolvedRoot, path: relative, before, after, bytes: Buffer.byteLength(content), outbox: resolvedOutbox });
    const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, content, { encoding: "utf8", mode: 0o600, flush: true });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    const receiptCore = { kind: "filesystem-write-receipt/v1", changed: true, root: resolvedRoot, path: relative, before, after, bytes: Buffer.byteLength(content), occurredAt: new Date().toISOString() };
    const receipt = Object.freeze({ ...receiptCore, id: `sha256:${digest(canonical(receiptCore))}`, outbox: resolvedOutbox });
    await appendReceipt(resolvedOutbox, receipt);
    return receipt;
  } finally {
    await lockHandle.close();
    await rm(lock, { force: true });
  }
}
