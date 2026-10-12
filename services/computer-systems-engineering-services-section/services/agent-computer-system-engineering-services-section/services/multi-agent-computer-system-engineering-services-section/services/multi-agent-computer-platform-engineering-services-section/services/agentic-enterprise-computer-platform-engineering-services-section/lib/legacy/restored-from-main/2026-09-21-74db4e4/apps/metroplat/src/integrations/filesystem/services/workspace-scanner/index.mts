import path from "node:path";

import type { PackageManifestAdmissionResult } from "../../../../workspace/package-manifest.mts";
import {
  type ContractValue,
} from "../../../../lib/contracts/index.mts";
import {
  workspacePackageRootScanContract,
  workspaceScanContract,
  type PackageRootScan,
  type WorkspaceScan,
} from "./schema.mts";
import { projectionSegmentKey } from "../../../../lib/codecs/javascript/segment-key.mts";

export type {
  PackageRootScan,
  WorkspaceScan,
} from "./schema.mts";

/** Filesystem workspace-scanner move exposed by this service boundary. */
export type WorkspaceScanOperationKind = "scan-package-root" | "scan-workspace";

export const workspaceScannerIgnoredDirectories = Object.freeze([
  ".git",
  ".hg",
  ".svn",
  ".tmp",
  "coverage",
  "dist",
  "node_modules",
]);

export function workspacePackageManifestPath(root: string): string {
  return path.join(root, "package.json");
}

export function workspaceScannerShouldSkip(name: string, ignore: ReadonlySet<string> = new Set()): boolean {
  return workspaceScannerIgnoredDirectories.includes(name) || ignore.has(name);
}

export function packageRootScan(root: string, source: string, admission: PackageManifestAdmissionResult): PackageRootScan {
  return workspacePackageRootScanContract.assert(Object.freeze({
    kind: "metroplat.workspace.package-root" as const,
    root,
    source,
    admission,
  }), "workspace package-root scan") as PackageRootScan;
}

export function workspaceScan(root: string, packages: readonly PackageRootScan[]): WorkspaceScan {
  return workspaceScanContract.assert(Object.freeze({
    kind: "metroplat.workspace.scan" as const,
    root,
    packages: Object.freeze([...packages]),
  }), "workspace scan") as WorkspaceScan;
}
