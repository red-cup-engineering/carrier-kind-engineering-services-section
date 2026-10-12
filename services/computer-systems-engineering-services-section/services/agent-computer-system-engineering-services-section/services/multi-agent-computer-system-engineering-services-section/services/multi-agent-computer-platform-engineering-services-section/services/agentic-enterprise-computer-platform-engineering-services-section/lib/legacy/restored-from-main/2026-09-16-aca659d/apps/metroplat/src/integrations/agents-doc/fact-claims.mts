/**
 * integrations/agents-doc/src/fact-claims — fact claims for
 * AGENTS.md/CLAUDE.md facets.
 *
 * Each function here projects material metroplat already reads elsewhere
 * (module topology, package manifest, the directory-grammar doctrine, a live
 * git-state read, and a document's own prior content) into `FactClaim`s (see
 * `executing/fact-claims.mjs`, which glues them through the package's existing
 * claim-session knowledge-order-join — not a bespoke ontology) tagged by the
 * facet slugs `documentFacets` reads off `documentTypeDefinitions`'s
 * `agents-guide`/`claude-memory` schema. No filesystem I/O lives here —
 * callers supply already-admitted material, per `src/`'s admission-boundary
 * rule (host discovery stays in `services/`).
 *
 * `common-mistakes` still has no existing metroplat reader to source it from
 * on its own — it takes pre-admitted claim text (e.g. from
 * `integrations/agents-doc/services`'s `readFeedbackMemoryClaims`).
 */
import type { FactClaim } from "../../claims/fact-claims.mts";
import type { PackageManifestAdmission } from "../../workspace/schemas/admission.mts";
import type { ModuleTopologyModule, ModuleTopologyRead } from "../../monitoring/source-code/index.mts";

function factClaim(factKey: string, source: string, value: string, weight?: number): FactClaim {
  return Object.freeze({ factKey, source, value, ...(weight === undefined ? {} : { weight }) });
}

function topLevelDirOf(relativePath: string): string {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.length > 1 ? segments.slice(0, 2).join("/") : (segments[0] ?? relativePath);
}

/**
 * `project-structure` claims from a live module-topology read: one aggregate
 * fact plus one fact per top-level source subdirectory, summing
 * sloc/functions/classes within it. Source tag: `module-topology`.
 */
export function projectStructureClaims(topology: ModuleTopologyRead): readonly FactClaim[] {
  const byDir = new Map<string, { sloc: number; functions: number; classes: number; files: number }>();
  for (const moduleEntry of topology.modules as readonly ModuleTopologyModule[]) {
    const dir = topLevelDirOf(moduleEntry.path);
    const existing = byDir.get(dir) ?? { sloc: 0, functions: 0, classes: 0, files: 0 };
    byDir.set(dir, {
      sloc: existing.sloc + moduleEntry.sloc,
      functions: existing.functions + moduleEntry.functions,
      classes: existing.classes + moduleEntry.classes,
      files: existing.files + 1,
    });
  }
  const aggregate = factClaim(
    "aggregate",
    "module-topology",
    `${topology.files} files, ${topology.sloc} significant lines, ${topology.functions} functions, ${topology.classes} classes`,
  );
  const perDir = [...byDir.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dir, totals]) => factClaim(
      `dir:${dir}`,
      "module-topology",
      `${totals.files} files, ${totals.sloc} sloc, ${totals.functions} functions, ${totals.classes} classes`,
      totals.sloc,
    ));
  return Object.freeze([aggregate, ...perDir]);
}

function scriptEntries(admission: PackageManifestAdmission): ReadonlyMap<string, string> {
  const scripts = admission.manifest.scripts;
  if (scripts === undefined || scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) return new Map();
  return new Map(Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** `build-test` claims: one fact per `build`/`test`/`check`-named package script. Source tag: `package-manifest`. */
export function buildTestClaims(admission: PackageManifestAdmission): readonly FactClaim[] {
  const scripts = scriptEntries(admission);
  const relevant = [...scripts.entries()].filter(([name]) => /build|test|check/i.test(name));
  return Object.freeze(relevant.map(([name, command]) =>
    factClaim(`script:${name}`, "package-manifest", `pnpm run ${name} — ${command}`)));
}

/** `style-conventions` claims: one fact per `lint`/`format`-named package script. Source tag: `package-manifest`. */
export function styleConventionClaims(admission: PackageManifestAdmission): readonly FactClaim[] {
  const scripts = scriptEntries(admission);
  const relevant = [...scripts.entries()].filter(([name]) => /lint|format|style/i.test(name));
  return Object.freeze(relevant.map(([name, command]) =>
    factClaim(`script:${name}`, "package-manifest", `pnpm run ${name} — ${command}`)));
}

/** `security-boundaries` claims from manifest `private`/`files` fields. Source tag: `package-manifest`. */
export function securityBoundaryClaims(admission: PackageManifestAdmission): readonly FactClaim[] {
  const claims: FactClaim[] = [];
  if (admission.manifest.private === true) {
    claims.push(factClaim("private", "package-manifest", "package manifest is private — do not publish to the public npm registry"));
  }
  const files = admission.manifest["files" as keyof typeof admission.manifest];
  if (Array.isArray(files) && files.length > 0) {
    claims.push(factClaim("files", "package-manifest", `published files are limited to: ${files.join(", ")}`));
  }
  return Object.freeze(claims);
}

/**
 * `project-structure` claims sourced from the directory-grammar doctrine
 * itself. `entries` are `[directory, ownership description]` pairs — callers
 * read them from `dev/content/notes/2026/06/28/2026-06-28-research-on-the-derived-directory-grammar-for-relating.md`
 * (or its current successor); this function does not parse the note itself.
 * Source tag: `directory-grammar-doctrine`.
 */
export function directoryGrammarClaims(entries: readonly (readonly [string, string])[]): readonly FactClaim[] {
  return Object.freeze(entries.map(([directory, ownership]) =>
    factClaim(`dir:${directory}`, "directory-grammar-doctrine", `${directory}: ${ownership}`)));
}

/**
 * `git-workflow` claims from a live workspace-scanner git-state read.
 * `gitState` is whatever shape a caller's own read of
 * `@red-cup-engineering/observing-git-repository-service` (branch, HEAD,
 * clean/dirty) plus a remote-URL read already admits; this function only
 * names the facts, it does not scan git itself. Source tag: `git-state`.
 * Currently unreferenced — no caller wires a git-state read into this yet.
 */
export function gitWorkflowClaims(gitState: {
  readonly defaultBranch?: string;
  readonly remote?: string;
  readonly dirty?: boolean;
}): readonly FactClaim[] {
  const claims: FactClaim[] = [];
  if (gitState.defaultBranch !== undefined) {
    claims.push(factClaim("default-branch", "git-state", `default branch: ${gitState.defaultBranch}`));
  }
  if (gitState.remote !== undefined) {
    claims.push(factClaim("remote", "git-state", `remote: ${gitState.remote}`));
  }
  if (gitState.dirty !== undefined) {
    claims.push(factClaim("worktree-state", "git-state", gitState.dirty ? "worktree has uncommitted changes" : "worktree is clean"));
  }
  return Object.freeze(claims);
}

/**
 * `common-mistakes` claims. No existing query over the journal
 * answers "which recorded events were corrections" — callers must supply
 * already-filtered correction summaries (e.g. from
 * `integrations/agents-doc/services`'s `readFeedbackMemoryClaims`)
 * instead of this function inventing that filter. `factKey` should be a
 * stable id per correction (so re-reading the same correction twice is
 * recognized as the same fact, not a new one). Source tag: caller-supplied
 * (default `correction-history`).
 */
export function commonMistakeClaims(entries: readonly Readonly<{ factKey: string; text: string }>[], source = "correction-history"): readonly FactClaim[] {
  return Object.freeze(entries.map((entry) => factClaim(entry.factKey, source, entry.text)));
}

/**
 * Read an existing AGENTS.md/CLAUDE.md body (already generated by
 * `generateAgentsDocBody`, hence a `[{factKey}] {value}` bullet under each
 * `## {title}` heading) back into `FactClaim`s tagged `source: "existing-doc"`
 * — a second, historical source for the SAME fact-keys a fresh read
 * produces, so the glued claim-session judgement has something real to
 * compare against instead of a single always-agreeing source. Bodies that
 * predate this generator (no matching headings/bullets) simply yield no
 * claims for that facet.
 */
export function existingDocClaims(body: string, facetTitle: string): readonly FactClaim[] {
  const headingIndex = body.indexOf(`## ${facetTitle}`);
  if (headingIndex === -1) return Object.freeze([]);
  const rest = body.slice(headingIndex + `## ${facetTitle}`.length);
  const nextHeading = rest.search(/\n## /u);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  const claims: FactClaim[] = [];
  for (const line of section.split("\n")) {
    const match = /^- \[([^\]]+)\] (.+)$/u.exec(line.trim());
    if (match) claims.push(factClaim(match[1]!, "existing-doc", match[2]!));
  }
  return Object.freeze(claims);
}
