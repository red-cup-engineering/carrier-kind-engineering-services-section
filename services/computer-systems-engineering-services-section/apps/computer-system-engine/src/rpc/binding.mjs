/**
 * @packageDocumentation
 *
 * integrations/filesystem/services/read-write — the kernel edge for
 * `./read-write-verbs.mjs`'s pure read/write verbs.
 *
 * `read-write-verbs.mjs` itself imports no effect: every function there that
 * touches the host filesystem receives its `binding` as a parameter from its
 * own caller. This module is where that binding's effectful defaults are
 * actually produced — `node:os` for the host's home directory, `node:fs`'s
 * directory/file primitives from the system engine's filesystem module, and
 * the two `node:fs/promises` primitives (`readFile`/`writeFile`) that
 * `work/duty-discharge.mjs`'s exact-deps hand needs verbatim (not the atomic
 * variants the engine's filesystem module otherwise offers, which refuse or
 * append rather than plainly overwrite) — so every kernel-edge caller of
 * `defaultFilesystemBinding` can supply one bag covering both concerns
 * without importing `node:fs`/`node:fs/promises` itself.
 *
 * This one export stays at this path (rather than moving beside the verbs it
 * binds) because a held-area test still imports it from exactly here; moving
 * it would either break that import or require a re-export shim, both worse
 * than the file split being slightly asymmetric.
 */
import { homedir } from "node:os";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import * as filesystemEffects from "@red-cup-engineering/computer-system-engine/filesystem";
import { resolveMarkdownNode } from "@red-cup-engineering/computer-system-engine/addressing/markdown-node";

/** The default binding for a node serving one data root: Claude Code transcripts
 *  under the host's project slug for that root, Codex sessions under the host's
 *  session store, and the package itself as the module-topology target. Lean and
 *  TeX workspaces need NO binding — they are recognized at their own paths. */
export function defaultFilesystemBinding(
  dataRoot,
  options = {},
) {
  const resolvedRoot = path.resolve(dataRoot);
  return Object.freeze({
    // Every hull service that receives this binding reaches the host filesystem only
    // through these functions on the bag it was handed, never by importing
    // the engine's filesystem module (or node:fs/node:fs/promises) itself: the effect
    // arrives as a value the kernel edge (this factory, and the scripts that call
    // it) supplies, per the house's hull/kernel split.
    ...filesystemEffects,
    resolveMarkdownNode,
    readFile,
    writeFile,
    dataRoot: resolvedRoot,
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: path.resolve(options.repositoryRoot) }),
    ...(options.clockStateRoot === undefined ? {} : { clockStateRoot: path.resolve(options.clockStateRoot) }),
    claudeSessionRoot: options.claudeSessionRoot ?? path.join(homedir(), ".claude", "projects", resolvedRoot.split(path.sep).join("-")),
    codexSessionRoot: options.codexSessionRoot ?? path.join(homedir(), ".codex", "sessions"),
    codexMemoryRoot: options.codexMemoryRoot ?? path.join(homedir(), ".codex", "memories"),
    ...(options.packageRoot === undefined ? {} : { packageRoot: options.packageRoot }),
    now: options.now ?? (() => new Date().toISOString()),
  });
}
