/**
 * @packageDocumentation
 *
 * knowledge-vault/services/notes - the filesystem aperture for treating any
 * directory as a knowledge vault: the directory into which markdown notes are
 * read and written. No process-configured data root is involved; every
 * request names its own vault, so `dev/content/notes/` in one checkout and a
 * vault anywhere else are the same object.
 *
 * The effectful legs stay thin: walk/read/write files here, and admit through
 * the pure machinery this domain folder already carries - `markdownDataform`
 * (EAVT assertions and the four-valued frontmatter conformance verdict),
 * `vaultToContent` (wikilink resolution and article/page admission, in
 * `knowledge-vault/src/wikilinks.mts`), the CSL codec (references normalized
 * to CSL-JSON in both corpus dialects), and the matter-topology receipt over
 * the note-link nerve.
 */
import path from "node:path";

import {
  vaultNoteWriteReceiptContract,
  vaultNoteWriteRequestContract,
  vaultReadRequestContract,

} from "@red-cup-engineering/markdown-engineering-services-section/vault/note";
import {
  vaultIngestionProfileOfFiles,
  vaultNoteProjectionOfMarkdown,
  vaultNoteWriteMaterial,
  vaultQueryResultOfFiles,
} from "../vault.mjs";
import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { readVaultTree } from "./publish.mjs";

/** Resolve a vault-relative path, rejecting escapes out of the vault root. */
function resolveWithinVault(vaultRoot, relativePath) {
  const root = path.resolve(vaultRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new TypeError(`knowledge-vault/services/notes: ${relativePath} escapes the vault root`);
  }
  return resolved;
}

/** Read one markdown note off a vault as its dataform plus bibliographic reads. */
export function readVaultNote(request, options) {
  const requested = resolveWithinVault(request.vaultRoot, request.notePath);
  const resolution = options.resolveMarkdownNode(requested, { acceptExtensionless: true });
  if (resolution.kind === "ambiguous") {
    throw new TypeError(`knowledge-vault note read: ambiguous markdown node ${resolution.canonicalPath} has carriers ${resolution.paths.join(", ")}`);
  }
  const located = resolution.kind === "located" ? resolution.path : requested;
  const filePath = resolveWithinVault(request.vaultRoot, located);
  const notePath = resolution.kind === "located"
    ? path.relative(path.resolve(request.vaultRoot), resolution.canonicalPath).split(path.sep).join("/")
    : path.relative(path.resolve(request.vaultRoot), filePath).split(path.sep).join("/");
  const text = options.readFileUtf8(filePath);
  return vaultNoteProjectionOfMarkdown({ vaultRoot: request.vaultRoot, notePath, text });
}

/** Write one markdown note into a vault, normalizing `references` to the
 *  canonical CSL sequence unless the request opts out. */
export function writeVaultNote(request, options) {
  const filePath = resolveWithinVault(request.vaultRoot, request.notePath);
  const material = vaultNoteWriteMaterial(request);
  options.ensureDirectory(path.dirname(filePath));
  writeFileAtomic(filePath, material.text);
  return vaultNoteWriteReceiptContract.assert({
    kind: "metroplat.knowledge-vault.note-write-receipt",
    vaultRoot: request.vaultRoot,
    notePath: request.notePath,
    bytes: Buffer.byteLength(material.text, "utf8"),
    referenceCount: material.referenceCount,
    referenceDialect: material.referenceDialect,
  }, "vault note write receipt");
}

/** Read a whole vault (optionally one subdirectory) as one ingested note collection. */
export function readVault(request, options) {
  const contentRoot = request.contentPath === undefined || request.contentPath === ""
    ? resolveWithinVault(request.vaultRoot, ".")
    : resolveWithinVault(request.vaultRoot, request.contentPath);
  const walked = readVaultTree(contentRoot, options);
  return vaultIngestionProfileOfFiles(request.vaultRoot, walked, request.contentPath);
}

/** Query a vault as one merged EAVT relation over every note's frontmatter assertions. */
export function queryVault(request, options) {
  const contentRoot = request.contentPath === undefined || request.contentPath === ""
    ? resolveWithinVault(request.vaultRoot, ".")
    : resolveWithinVault(request.vaultRoot, request.contentPath);
  const walked = readVaultTree(contentRoot, options);
  return vaultQueryResultOfFiles(request, walked);
}

// No service verbs live here: a vault is READ by the filesystem `read` (a
// directory presents as its manifest and dispatches to the vault projector,
// knowledge-vault/src/projector.mts) and a note is WRITTEN by the filesystem
// `write` (the markdown projector's write leg normalizes references on the
// way through). These path-shaped functions remain for in-package callers.
