import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export function resolveMarkdownFilePath({ root, path }) {
  if (typeof root !== "string" || root.length === 0) throw new TypeError("root must be a nonempty string");
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  const admittedRoot = resolve(root);
  const absolutePath = resolve(admittedRoot, path);
  if (absolutePath !== admittedRoot && !absolutePath.startsWith(`${admittedRoot}${sep}`)) {
    throw new RangeError("path must remain inside root");
  }
  if (!MARKDOWN_EXTENSIONS.has(extname(absolutePath).toLowerCase())) {
    throw new TypeError("path must name a .md or .markdown file");
  }
  return Object.freeze({ root: admittedRoot, path: absolutePath, relativePath: relative(admittedRoot, absolutePath) });
}

export async function readMarkdownFile(input) {
  const admitted = resolveMarkdownFilePath(input);
  const [text, metadata] = await Promise.all([
    readFile(admitted.path, "utf8"),
    stat(admitted.path),
  ]);
  if (!metadata.isFile()) throw new TypeError("path must name a regular file");
  return Object.freeze({
    ...admitted,
    text,
    bytes: Buffer.byteLength(text),
    modifiedAt: metadata.mtime.toISOString(),
  });
}
