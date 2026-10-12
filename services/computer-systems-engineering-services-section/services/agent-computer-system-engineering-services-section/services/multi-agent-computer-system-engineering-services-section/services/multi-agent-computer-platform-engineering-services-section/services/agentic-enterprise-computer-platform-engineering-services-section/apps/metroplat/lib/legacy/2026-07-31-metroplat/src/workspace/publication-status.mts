/**
 * @packageDocumentation
 *
 * publication-status - pure release artifact proof over an admitted package surface.
 *
 * The package surface names public commitments. This module does not read the
 * filesystem; callers supply artifact facts observed by a service boundary.
 */
import type { BinSurface, BinSurfaceEntry } from "./schemas/bins.mts";
import type { PackageManifestAdmission } from "./schemas/admission.mts";
import type { ExportSurface, ExportSurfaceEntry } from "./schemas/exports.mts";
import type { PackageSurface } from "./schemas/package-surface.mts";
import type { JsonRecord } from "../lib/codecs/json/core.mts";
import {
  publicationArtifactTargetContract,
  publicationReleasePolicyContract,
  publicationStatusProofContract,
  type PublicationArtifactTarget,
  type PublicationReleasePolicy,
  type PublicationStatusProof,
} from "./schemas/publication-status.mts";

export interface PublicationArtifactFact {
  readonly target: string;
  readonly exists: boolean;
  readonly executable?: boolean;
}

export type PublicationArtifactFactInput =
  | ReadonlyMap<string, PublicationArtifactFact>
  | readonly PublicationArtifactFact[];

function artifactFactMap(facts: PublicationArtifactFactInput): ReadonlyMap<string, PublicationArtifactFact> {
  if ("get" in facts) return facts;
  return new Map(facts.map((fact) => [fact.target, fact]));
}

function withFact(
  target: Omit<PublicationArtifactTarget, "kind" | "exists" | "executable">,
  facts: ReadonlyMap<string, PublicationArtifactFact>,
): PublicationArtifactTarget {
  const fact = facts.get(target.target);
  return publicationArtifactTargetContract.assert(Object.freeze({
    kind: "metroplat.publication-status.artifact-target" as const,
    ...target,
    exists: fact?.exists ?? false,
    ...(fact?.executable === undefined ? {} : { executable: fact.executable }),
  }), "publication artifact target") as PublicationArtifactTarget;
}

function surfaceExportEntries(surface: PackageSurface): readonly ExportSurfaceEntry[] {
  const exportSurface = surface.exports as ExportSurface;
  return exportSurface.entries as readonly ExportSurfaceEntry[];
}

function surfaceBinEntries(surface: PackageSurface): readonly BinSurfaceEntry[] {
  const binSurface = surface.bins as BinSurface;
  return binSurface.entries as readonly BinSurfaceEntry[];
}

function exportTargets(surface: PackageSurface, facts: ReadonlyMap<string, PublicationArtifactFact>): readonly PublicationArtifactTarget[] {
  return Object.freeze(surfaceExportEntries(surface).flatMap((entry) => {
    const mode = entry.mode;
    const targets: PublicationArtifactTarget[] = [];
    if (entry.import !== undefined) {
      targets.push(withFact({
        face: "export" as const,
        name: entry.specifier,
        obligation: "import" as const,
        target: entry.import,
        mode,
      }, facts));
    }
    if (entry.types !== undefined) {
      targets.push(withFact({
        face: "export" as const,
        name: entry.specifier,
        obligation: "types" as const,
        target: entry.types,
        mode,
      }, facts));
    }
    return targets;
  }).sort((left, right) => `${left.name}:${left.obligation}`.localeCompare(`${right.name}:${right.obligation}`)));
}

function binTargets(surface: PackageSurface, facts: ReadonlyMap<string, PublicationArtifactFact>): readonly PublicationArtifactTarget[] {
  return Object.freeze(surfaceBinEntries(surface).map((entry) => withFact({
    face: "bin" as const,
    name: entry.command,
    obligation: "bin" as const,
    target: entry.target,
    mode: entry.mode,
  }, facts)).sort((left, right) => left.name.localeCompare(right.name)));
}

/**
 * Read the emitted artifact target paths named by one package surface.
 */
export function publicationArtifactTargetPathsOf(surface: PackageSurface): readonly string[] {
  const targets = new Set<string>();
  for (const entry of surfaceExportEntries(surface)) {
    if (entry.import !== undefined) targets.add(entry.import);
    if (entry.types !== undefined) targets.add(entry.types);
  }
  for (const entry of surfaceBinEntries(surface)) targets.add(entry.target);
  return Object.freeze([...targets].sort());
}

/**
 * Prove a package surface against supplied release artifact facts.
 */
export function publicationStatusProofOf(
  surface: PackageSurface,
  facts: PublicationArtifactFactInput,
): PublicationStatusProof {
  const factMap = artifactFactMap(facts);
  const targets = Object.freeze([
    ...exportTargets(surface, factMap),
    ...binTargets(surface, factMap),
  ]);
  const missing = Object.freeze(targets.filter((target) => !target.exists).map((target) => target.target));
  const nonExecutableBins = Object.freeze(
    targets
      .filter((target) => target.obligation === "bin" && target.exists && target.executable !== true)
      .map((target) => target.target),
  );
  return publicationStatusProofContract.assert(Object.freeze({
    kind: "metroplat.publication-status.proof" as const,
    source: surface.source,
    packageName: surface.packageName,
    surface,
    targets,
    missing,
    nonExecutableBins,
    ok: missing.length === 0 && nonExecutableBins.length === 0,
  }), "publication status proof") as PublicationStatusProof;
}

function stringArrayField(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0));
}

function manifestScripts(admission: PackageManifestAdmission): readonly string[] {
  const scripts = admission.manifest.scripts;
  if (scripts === undefined || scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) return Object.freeze([]);
  return Object.freeze(Object.keys(scripts).sort());
}

function manifestFiles(admission: PackageManifestAdmission): readonly string[] {
  return stringArrayField((admission.manifest as JsonRecord)["files"]);
}

function proofTargets(proof: PublicationStatusProof): readonly PublicationArtifactTarget[] {
  return proof.targets as readonly PublicationArtifactTarget[];
}

function packageRelativeTarget(target: string): string {
  return target.replace(/^\.\//u, "");
}

function fileEntryCoversTarget(entry: string, target: string): boolean {
  const normalizedEntry = packageRelativeTarget(entry).replace(/\/+$/u, "");
  const normalizedTarget = packageRelativeTarget(target);
  return normalizedTarget === normalizedEntry || normalizedTarget.startsWith(`${normalizedEntry}/`);
}

function excludedPublicationTargets(admission: PackageManifestAdmission, proof: PublicationStatusProof): readonly string[] {
  const includedFiles = manifestFiles(admission);
  if (includedFiles.length === 0) return Object.freeze([]);
  return Object.freeze([
    ...new Set(
      proofTargets(proof)
        .map((target) => target.target)
        .filter((target) => !includedFiles.some((entry) => fileEntryCoversTarget(entry, target))),
    ),
  ].sort());
}

function isTypeScriptRuntimeTarget(target: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/u.test(target);
}

function unsupportedNodeRuntimeTargets(proof: PublicationStatusProof): readonly string[] {
  return Object.freeze([
    ...new Set(
      proofTargets(proof)
        .filter((target) => target.obligation === "import" || target.obligation === "bin")
        .map((target) => target.target)
        .filter(isTypeScriptRuntimeTarget),
    ),
  ].sort());
}

function releasePolicyObligations(admission: PackageManifestAdmission, proof: PublicationStatusProof): readonly string[] {
  const obligations: string[] = [];
  const excludedTargets = excludedPublicationTargets(admission, proof);
  const unsupportedTargets = unsupportedNodeRuntimeTargets(proof);
  if (!proof.ok) obligations.push("Repair missing or non-executable emitted artifact targets before any release artifact can be used.");
  if (admission.manifest.private === true) obligations.push("Package manifest is private; do not publish to the public npm registry.");
  if (excludedTargets.length > 0) obligations.push(`Package files allowlist excludes public artifact targets: ${excludedTargets.join(", ")}.`);
  if (unsupportedTargets.length > 0) obligations.push(`Installed Node.js packages cannot execute TypeScript runtime targets: ${unsupportedTargets.join(", ")}.`);
  if (!manifestScripts(admission).includes("build")) obligations.push("Package scripts should expose a build procedure before release artifact proof.");
  return Object.freeze(obligations);
}

/**
 * Read an admitted manifest plus artifact proof as an explicit release policy.
 */
export function publicationReleasePolicyOf(
  admission: PackageManifestAdmission,
  proof: PublicationStatusProof,
): PublicationReleasePolicy {
  if (admission.manifest.name !== proof.packageName) {
    throw new TypeError(`publicationReleasePolicyOf: package names differ: ${admission.manifest.name} and ${proof.packageName}`);
  }
  const includedFiles = manifestFiles(admission);
  const scripts = manifestScripts(admission);
  const localArtifactOk = proof.ok
    && excludedPublicationTargets(admission, proof).length === 0
    && unsupportedNodeRuntimeTargets(proof).length === 0
    && scripts.includes("build");
  return publicationReleasePolicyContract.assert(Object.freeze({
    kind: "metroplat.publication-status.release-policy" as const,
    source: admission.source,
    packageName: admission.manifest.name,
    private: admission.manifest.private === true,
    artifactProof: proof,
    includedFiles,
    scripts,
    localArtifactOk,
    npmPublishable: localArtifactOk && admission.manifest.private !== true,
    obligations: releasePolicyObligations(admission, proof),
    evidence: Object.freeze([
      admission.source,
      "src/workspace/publication-status:publicationStatusProofOf",
      "src/workspace/publication-status:publicationReleasePolicyOf",
    ]),
  }), "publication release policy") as PublicationReleasePolicy;
}
