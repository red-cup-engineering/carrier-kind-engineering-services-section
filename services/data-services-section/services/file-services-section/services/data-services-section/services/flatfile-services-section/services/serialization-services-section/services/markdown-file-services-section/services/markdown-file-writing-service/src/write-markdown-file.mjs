import { chmod, mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { readMarkdownFile, resolveMarkdownFilePath } from "@red-cup-engineering/markdown-file-reading-service";
import { semanticLinefeedNormalization } from "@red-cup-engineering/semantic-linefeed-normalization-service";

const MODES = new Set(["create", "replace", "upsert"]);

export function prepareMarkdownFileText(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return semanticLinefeedNormalization(text).text;
}

async function currentFile(address) {
  try {
    return await readMarkdownFile({ root: address.root, path: address.relativePath });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeMarkdownFile({ root, path, text, mode = "create" }) {
  if (!MODES.has(mode)) throw new TypeError("mode must be create, replace, or upsert");
  const address = resolveMarkdownFilePath({ root, path });
  const current = await currentFile(address);
  if (mode === "create" && current) throw new Error("create refused because the Markdown file already exists");
  if (mode === "replace" && !current) throw new Error("replace refused because the Markdown file does not exist");

  const normalized = prepareMarkdownFileText(text);
  if (current?.text === normalized) {
    return Object.freeze({ ...address, text: normalized, bytes: Buffer.byteLength(normalized), changed: false, created: false });
  }

  await mkdir(dirname(address.path), { recursive: true });
  const temporaryPath = `${dirname(address.path)}/.${basename(address.path)}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, normalized, { encoding: "utf8", flag: "wx" });
    if (current) {
      const metadata = await stat(address.path);
      await chmod(temporaryPath, metadata.mode);
    }
    await rename(temporaryPath, address.path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return Object.freeze({
    ...address,
    relativePath: relative(address.root, address.path),
    text: normalized,
    bytes: Buffer.byteLength(normalized),
    changed: true,
    created: current === null,
  });
}
