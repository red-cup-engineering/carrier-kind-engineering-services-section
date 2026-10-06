/**
 * @packageDocumentation
 * The markdown node address: a node named `file` under `some/path` is spelled
 * either flat (`some/path/file.md`) or as its own folder
 * (`some/path/file/file.md`). Both spellings address the SAME node, so a
 * lookup that admits one admits the other. The law here is one canonical
 * logical node path plus its derived carrier presentations; request spelling
 * never chooses identity.
 *
 * Paths are the `/`-separated boundary encoding; host-separator conversion is
 * the filesystem caller's leg, not this law's.
 *
 * @metroplatSubject addressing
 */
import path from "node:path";
import { statPathOrNull } from "@red-cup-engineering/computer-system-engine/filesystem";

const MARKDOWN_EXTENSION = /\.(?:md|markdown)$/iu;

/** True when a path carries a markdown extension. */
export function isMarkdownPath(target) {
  return MARKDOWN_EXTENSION.test(target);
}

/** The canonical logical Markdown node path for a boundary target.
 *
 * The operation is idempotent:
 * `canonicalMarkdownNodePath(canonicalMarkdownNodePath(x)) =
 * canonicalMarkdownNodePath(x)`. A target with no extension takes `.md`.
 */
export function canonicalMarkdownNodePath(target) {
  const trimmed = target.replace(/\/+$/u, "");
  if (trimmed === "") return null;
  const extension = MARKDOWN_EXTENSION.exec(trimmed)?.[0] ?? ".md";
  const base = isMarkdownPath(trimmed) ? trimmed.slice(0, -extension.length) : trimmed;
  const cut = base.lastIndexOf("/");
  const name = cut < 0 ? base : base.slice(cut + 1);
  const parent = cut < 0 ? "" : base.slice(0, cut);
  const parentName = parent.slice(parent.lastIndexOf("/") + 1);
  return parent !== "" && parentName === name ? `${parent}${extension}` : `${base}${extension}`;
}

/**
 * The host carrier spellings of one logical Markdown node, in canonical stable
 * order: flat path first, own-folder path second.
 */
export function markdownNodePresentationPaths(target) {
  const canonical = canonicalMarkdownNodePath(target);
  if (canonical === null) return Object.freeze([]);
  const extension = MARKDOWN_EXTENSION.exec(canonical)?.[0] ?? ".md";
  const base = canonical.slice(0, -extension.length);
  const name = base.slice(base.lastIndexOf("/") + 1);
  return Object.freeze([canonical, `${base}/${name}${extension}`]);
}

/**
 * Resolve a Markdown node at a host boundary. The requested spelling is a
 * carrier coordinate, not authority: both carrier presentations are checked in
 * stable canonical order, and simultaneous files are an explicit ambiguity.
 */
export function resolveMarkdownNode(filePath, options = {}) {
  if (!isMarkdownPath(filePath) && options.acceptExtensionless !== true) return Object.freeze({ kind: "not-markdown" });
  const presentations = markdownNodePresentationPaths(filePath.split(path.sep).join("/"));
  const canonicalPath = presentations[0];
  if (canonicalPath === undefined) return Object.freeze({ kind: "not-markdown" });
  const existing = presentations
    .map((presentation) => presentation.split("/").join(path.sep))
    .filter((host) => statPathOrNull(host)?.isFile() === true);
  if (existing.length === 0) return Object.freeze({ kind: "absent", canonicalPath: canonicalPath.split("/").join(path.sep), presentations });
  if (existing.length > 1) return Object.freeze({ kind: "ambiguous", canonicalPath: canonicalPath.split("/").join(path.sep), paths: Object.freeze(existing), presentations });
  return Object.freeze({ kind: "located", canonicalPath: canonicalPath.split("/").join(path.sep), path: existing[0], presentations });
}
