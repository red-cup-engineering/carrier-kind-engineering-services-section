import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const defaultGit = path.resolve(import.meta.dirname, "../bin/git");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", value => { stdout += value; });
    child.stderr.on("data", value => { stderr += value; });
    child.once("error", reject);
    child.once("close", code => code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(stderr || `${command} exited ${code}`), { code, stdout, stderr })));
  });
}

function receiptError(message) {
  const error = new Error(message);
  error.code = "invalid-filesystem-receipt";
  return error;
}

/** Read one receipt, prove the exact on-disk content it witnesses, and settle
 * only that path. This intentionally refuses a pre-staged index: an ambient
 * index is indistinguishable from the uncontrolled dirt that caused the
 * incident. */
export async function settleFilesystemReceipt({ repository, receiptPath, message, gitBin = defaultGit }) {
  const repo = await path.resolve(repository);
  const rows = (await readFile(receiptPath, "utf8")).trim().split("\n").filter(Boolean);
  if (rows.length !== 1) throw receiptError("receipt file must contain exactly one settlement receipt");
  let receipt;
  try { receipt = JSON.parse(rows[0]); } catch { throw receiptError("receipt is not JSON"); }
  if (receipt?.kind !== "filesystem-write-receipt/v1" || receipt.changed !== true) throw receiptError("receipt does not witness a changed filesystem write");
  if (typeof receipt.path !== "string" || typeof receipt.root !== "string" || !/^[a-f0-9]{64}$/u.test(receipt.after ?? "")) throw receiptError("receipt lacks a valid custody identity");
  const root = path.resolve(receipt.root);
  const file = path.resolve(root, receipt.path);
  if (!file.startsWith(`${root}${path.sep}`)) throw receiptError("receipt path escapes its custody root");
  const repoRoot = (await run(gitBin, ["rev-parse", "--show-toplevel"], repo)).stdout.trim();
  if (path.resolve(repoRoot) !== root) throw receiptError("receipt custody root is not this repository");
  const relative = path.relative(repoRoot, file).split(path.sep).join("/");
  const content = await readFile(file, "utf8");
  if (sha256(content) !== receipt.after) throw receiptError("witnessed content no longer matches the receipt");
  await run(gitBin, ["diff", "--cached", "--quiet"], repo);
  await run(gitBin, ["add", "--", relative], repo);
  await run(gitBin, ["commit", "-m", message ?? `chore: settle filesystem receipt ${receipt.id}`, "--", relative], repo);
  return Object.freeze({ kind: "git-settlement-receipt/v1", filesystemReceipt: receipt.id, repository: repoRoot, path: relative, settledAt: new Date().toISOString() });
}
