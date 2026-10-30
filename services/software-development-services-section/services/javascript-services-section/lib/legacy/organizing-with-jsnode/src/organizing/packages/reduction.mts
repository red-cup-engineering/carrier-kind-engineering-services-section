import { lintPackage, type PackageKind, type PackageLintReport } from "./conformance/check.mjs";
import { scaffoldPackage, type PackageScaffoldResult } from "./conformance/scaffold.mjs";

export type PackageReduction = Readonly<{
  kind: "organizing-with-jsnode.package-reduction";
  lint: PackageLintReport;
  reducibleFindings: readonly PackageLintReport["findings"][number][];
}>;

export function normalizePackageManifest(manifest: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const normalized: Record<string, unknown> = { ...manifest };
  if (normalized["type"] === undefined) normalized["type"] = "module";
  if (normalized["private"] === undefined) normalized["private"] = true;
  if (normalized["sideEffects"] === undefined) normalized["sideEffects"] = false;
  const scripts = { ...((normalized["scripts"] ?? {}) as Record<string, unknown>) };
  if (typeof scripts["check"] !== "string") scripts["check"] = "tsc --noEmit";
  if (typeof scripts["verify"] !== "string") {
    scripts["verify"] = typeof scripts["test"] === "string"
      ? "pnpm run check && pnpm run test"
      : "pnpm run check";
  }
  normalized["scripts"] = scripts;
  return Object.freeze(normalized);
}

export async function reducePackage(packageDir: string, repoRoot?: string): Promise<PackageReduction> {
  const lint = await lintPackage(packageDir, repoRoot);
  const reducibleFindings = lint.findings.filter((item) => item.charge === "active");
  return Object.freeze({
    kind: "organizing-with-jsnode.package-reduction" as const,
    lint,
    reducibleFindings: Object.freeze(reducibleFindings),
  });
}

export { lintPackage, scaffoldPackage };
export type { PackageKind, PackageLintReport, PackageScaffoldResult };
