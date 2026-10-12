/**
 * @packageDocumentation
 *
 * integrations/filesystem/services/workspace-scanner - live workspace host-mark scanning.
 *
 * This service owns filesystem traversal. It reads package roots as host marks
 * and emits admitted package records from `src/workspace/schemas/admission`; it does not define
 * package-manifest law itself.
 */
import path from "node:path";

import {
  admissionFailure,
  admitPackageManifest,
  type PackageManifestAdmissionResult,
} from "../../../../workspace/package-manifest.mts";
import {
  admitPnpmLockfile,
  type PnpmLockfileAdmissionResult,
} from "../../../../workspace/lockfile.mts";
import {
  admitWorkspaceDeclaration,
  type WorkspaceDeclarationAdmissionResult,
} from "../../../../workspace/workspace-declaration.mts";
import { binSurfaceOfPackageManifest } from "../../../../workspace/bins/index.mts";
import type { PackageManifestAdmission, WorkspaceDeclarationAdmission } from "../../../../workspace/schemas/admission.mts";
import type { PackageSurface } from "../../../../workspace/schemas/package-surface.mts";
import type { PublicationReleasePolicy, PublicationStatusProof } from "../../../../workspace/schemas/publication-status.mts";
import { exportSurfaceOfPackageManifest } from "../../../../workspace/exports/index.mts";
import { packageSurfaceOf } from "../../../../workspace/package-surface.mts";
import { publicationArtifactTargetPathsOf, publicationReleasePolicyOf, publicationStatusProofOf, type PublicationArtifactFact } from "../../../../workspace/publication-status.mts";
import {
  packageRootScan,
  workspacePackageManifestPath,
  workspaceScan as workspaceScanMaterial,
  workspaceScannerShouldSkip,
  type PackageRootScan,
  type WorkspaceScan,
} from "./index.mts";
import { pathExists, readDirectoryEntries, readFileUtf8, statPathOrNull } from "../../../../lib/filesystem/index.mts";

export type {
  PackageRootScan,
  WorkspaceScan,
  WorkspaceScanOperationKind,
} from "./index.mts";

export interface PackagePublicationStatusScan {
  readonly kind: "metroplat.workspace-scanner.package-publication-status";
  readonly root: string;
  readonly surface: PackageSurface;
  readonly proof: PublicationStatusProof;
  readonly policy: PublicationReleasePolicy;
}

/** Options for bounded recursive workspace scans. */
export interface WorkspaceScanOptions {
  /** Maximum directory depth below the root. Defaults to 4. */
  readonly maxDepth?: number;
  /** Extra directory names to skip during traversal. */
  readonly ignore?: readonly string[];
}

function scanPackageRootMaterial(root: string): PackageRootScan {
  const absoluteRoot = path.resolve(root);
  const source = workspacePackageManifestPath(absoluteRoot);
  let mark: string;
  try {
    mark = readFileUtf8(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unreadable package manifest";
    return packageRootScan(absoluteRoot, source, admissionFailure(source, reason));
  }
  return packageRootScan(absoluteRoot, source, admitPackageManifest(mark, source));
}

function requirePackageManifestAdmission(result: PackageManifestAdmissionResult): PackageManifestAdmission {
  if (result.kind === "metroplat.admission.package-manifest") return result;
  throw new TypeError(`scanPackagePublicationStatus: package manifest admission failed at ${result.source}: ${result.reason}`);
}

function artifactPath(root: string, target: string): string {
  return path.resolve(root, target.startsWith("./") ? target.slice(2) : target);
}

function targetPatternExists(root: string, target: string): boolean {
  const relativeTarget = target.startsWith("./") ? target.slice(2) : target;
  const [prefix, suffix] = relativeTarget.split("*");
  if (prefix === undefined || suffix === undefined) return false;
  const base = path.resolve(root, prefix);
  const start = prefix.endsWith("/") ? base : path.dirname(base);
  const matches = (current: string): boolean => {
    let entries;
    try {
      entries = readDirectoryEntries(current);
    } catch {
      return false;
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory() && matches(entryPath)) return true;
      if (!entry.isFile()) continue;
      const relative = path.relative(root, entryPath).split(path.sep).join("/");
      if (relative.startsWith(prefix) && relative.endsWith(suffix)) return true;
    }
    return false;
  };
  return matches(start);
}

function isExecutable(mode: number): boolean {
  return (mode & 0o111) !== 0;
}

function artifactFact(root: string, target: string): PublicationArtifactFact {
  if (target.includes("*")) {
    return Object.freeze({
      target,
      exists: targetPatternExists(root, target),
    });
  }
  const stats = statPathOrNull(artifactPath(root, target));
  return Object.freeze({
    target,
    exists: stats?.isFile() ?? false,
    ...(stats === null ? {} : { executable: stats.isFile() && isExecutable(stats.mode) }),
  });
}

/** Read one package root's `package.json` as a lensed admission observation. */
export interface PackageRootScanResult {
  readonly operation: "scan-package-root";
  readonly scan: PackageRootScan;
}

export interface WorkspaceTreeScanResult {
  readonly operation: "scan-workspace";
  readonly scan: WorkspaceScan;
}

export function scanPackageRoot(root: string): PackageRootScanResult {
  const scan = scanPackageRootMaterial(root);
  return Object.freeze({ operation: "scan-package-root" as const, scan });
}

/** Read one package root's emitted targets and prove its package publication status. */
export function scanPackagePublicationStatus(root: string): PackagePublicationStatusScan {
  const scan = scanPackageRootMaterial(root);
  const admission = requirePackageManifestAdmission(scan.admission);
  const surface = packageSurfaceOf(exportSurfaceOfPackageManifest(admission), binSurfaceOfPackageManifest(admission));
  const proof = publicationStatusProofOf(surface, publicationArtifactTargetPathsOf(surface).map((target) => artifactFact(scan.root, target)));
  const policy = publicationReleasePolicyOf(admission, proof);
  return Object.freeze({
    kind: "metroplat.workspace-scanner.package-publication-status" as const,
    root: scan.root,
    surface,
    proof,
    policy,
  });
}

/** Scan a workspace tree for package roots as a lensed admission observation. */
export function scanWorkspace(root: string, options: WorkspaceScanOptions = {}): WorkspaceTreeScanResult {
  const absoluteRoot = path.resolve(root);
  const maxDepth = options.maxDepth ?? 4;
  const ignore = new Set(options.ignore ?? []);
  const packages: PackageRootScan[] = [];

  const walk = (current: string, depth: number): void => {
    if (pathExists(workspacePackageManifestPath(current))) packages.push(scanPackageRootMaterial(current));
    if (depth >= maxDepth) return;

    let entries;
    try {
      entries = readDirectoryEntries(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || workspaceScannerShouldSkip(entry.name, ignore)) continue;
      walk(path.join(current, entry.name), depth + 1);
    }
  };

  walk(absoluteRoot, 0);
  const scan = workspaceScanMaterial(absoluteRoot, packages);
  return Object.freeze({ operation: "scan-workspace" as const, scan });
}

/** Read one workspace root's `pnpm-workspace.yaml` host mark. */
export function scanWorkspaceDeclaration(root: string): WorkspaceDeclarationAdmissionResult {
  const source = path.join(path.resolve(root), "pnpm-workspace.yaml");
  let mark: string;
  try {
    mark = readFileUtf8(source);
  } catch (error) {
    return admissionFailure(source, error instanceof Error ? error.message : "unreadable workspace declaration");
  }
  return admitWorkspaceDeclaration(mark, source);
}

/** Read one workspace root's `pnpm-lock.yaml` host mark. */
export function scanLockfile(root: string): PnpmLockfileAdmissionResult {
  const source = path.join(path.resolve(root), "pnpm-lock.yaml");
  let mark: string;
  try {
    mark = readFileUtf8(source);
  } catch (error) {
    return admissionFailure(source, error instanceof Error ? error.message : "unreadable pnpm lockfile");
  }
  return admitPnpmLockfile(mark, source);
}

/** Package directories a workspace declaration resolves to. Supports exact
 *  paths and single trailing `dir/*` wildcards — the only pattern shapes this
 *  workspace's `pnpm-workspace.yaml` uses. Any other glob shape (`**`,
 *  mid-segment `*`) is named in `unsupportedPatterns` rather than silently
 *  mis-expanded. */
export interface WorkspaceDeclaredPackageRoots {
  readonly roots: readonly string[];
  readonly unsupportedPatterns: readonly string[];
}

export function packageRootsOfWorkspaceDeclaration(root: string, declaration: WorkspaceDeclarationAdmission): WorkspaceDeclaredPackageRoots {
  const absoluteRoot = path.resolve(root);
  const roots = new Set<string>();
  const unsupported: string[] = [];
  for (const pattern of declaration.packages as readonly string[]) {
    if (!pattern.includes("*")) {
      roots.add(path.resolve(absoluteRoot, pattern));
      continue;
    }
    const segments: readonly string[] = pattern.split("/");
    const last = segments.at(-1);
    if (last !== "*" || segments.slice(0, -1).some((segment: string) => segment.includes("*"))) {
      unsupported.push(pattern);
      continue;
    }
    const parent = path.resolve(absoluteRoot, segments.slice(0, -1).join("/"));
    if (!pathExists(parent)) continue;
    let entries;
    try {
      entries = readDirectoryEntries(parent);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !workspaceScannerShouldSkip(entry.name)) roots.add(path.join(parent, entry.name));
    }
  }
  return Object.freeze({
    roots: Object.freeze([...roots].sort()),
    unsupportedPatterns: Object.freeze(unsupported),
  });
}

/**
 * Scan the workspace by its declared `pnpm-workspace.yaml` member patterns
 * rather than a depth-bounded directory walk, so packages nested deeper than
 * `scanWorkspace`'s default `maxDepth` are still admitted. The workspace root
 * itself is always included (pnpm treats it as an implicit importer). Falls
 * back to `scanWorkspace`'s bounded walk when no workspace declaration is
 * admitted at `root`.
 */
export function scanDeclaredWorkspace(root: string): WorkspaceScan {
  const absoluteRoot = path.resolve(root);
  const declaration = scanWorkspaceDeclaration(absoluteRoot);
  if (declaration.kind !== "metroplat.admission.workspace-declaration") {
    return scanWorkspace(absoluteRoot).scan;
  }
  const { roots } = packageRootsOfWorkspaceDeclaration(absoluteRoot, declaration);
  const candidates = [absoluteRoot, ...roots.filter((candidate) => candidate !== absoluteRoot)];
  const packages = candidates
    .filter((candidate) => pathExists(workspacePackageManifestPath(candidate)))
    .map((candidate) => scanPackageRootMaterial(candidate));
  return workspaceScanMaterial(absoluteRoot, packages);
}
