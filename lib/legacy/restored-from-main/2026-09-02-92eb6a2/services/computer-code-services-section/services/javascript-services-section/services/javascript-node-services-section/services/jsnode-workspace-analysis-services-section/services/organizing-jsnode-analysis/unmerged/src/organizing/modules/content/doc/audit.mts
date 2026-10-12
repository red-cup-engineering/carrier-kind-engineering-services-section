/**
 * audit — documentation state check for a jsnode workspace package.
 *
 * Each package is expected to carry: README.md, AGENTS.md, CLAUDE.md, and a
 * dev/ tree (dev/docs/{explanations,guides,tutorials,references} and
 * dev/planning). `auditPackageDoc` reports which artifacts are present or
 * missing given the package directory; `auditWorkspaceDocs` maps over a list
 * of packages. No I/O side-effects — reads the filesystem, returns a value.
 */
import path from "node:path";
import { existsSync } from "node:fs";

export type DocArtifact =
  | "README.md"
  | "AGENTS.md"
  | "CLAUDE.md"
  | "dev/docs/explanations"
  | "dev/docs/guides"
  | "dev/docs/tutorials"
  | "dev/docs/references"
  | "dev/planning";

export interface PackageDocArtifactAudit {
  readonly name: string;
  readonly dir: string;
  readonly present: readonly DocArtifact[];
  readonly missing: readonly DocArtifact[];
}

export const ALL_DOC_ARTIFACTS: readonly DocArtifact[] = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "dev/docs/explanations",
  "dev/docs/guides",
  "dev/docs/tutorials",
  "dev/docs/references",
  "dev/planning",
];

export function auditPackageDoc(name: string, dir: string): PackageDocArtifactAudit {
  const present: DocArtifact[] = [];
  const missing: DocArtifact[] = [];
  for (const artifact of ALL_DOC_ARTIFACTS) {
    if (existsSync(path.join(dir, artifact))) {
      present.push(artifact);
    } else {
      missing.push(artifact);
    }
  }
  return { name, dir, present, missing };
}

export function auditWorkspaceDocs(
  packages: readonly { readonly name: string; readonly dir: string }[],
): readonly PackageDocArtifactAudit[] {
  return packages.map(({ name, dir }) => auditPackageDoc(name, dir));
}
