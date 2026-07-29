import { readFileSync } from "node:fs";
import path from "node:path";

import { packageScriptCatalogFromPackage, type PackageScriptCatalog } from "@emsenn/jsnode-ick/package-bin-transport";
import { eachWorkspacePackageDir, type DiscoveredPackage } from "@emsenn/jsnode-ick/topology";

import { boundaryTextParam, type BoundaryParams } from "./records.mts";

export const OPERATIONS_MANIFOLD_PACKAGE_PATH = "sites/ops.561.group";

export function operationsManifoldPackageDir(repoRoot: string): string {
  return path.join(repoRoot, ...OPERATIONS_MANIFOLD_PACKAGE_PATH.split("/"));
}

export function operationsManifoldRelativePath(...parts: readonly string[]): string {
  return path.join(OPERATIONS_MANIFOLD_PACKAGE_PATH, ...parts);
}

export function operationsManifoldLogPath(name: string): string {
  return operationsManifoldRelativePath("data", "logs", `${name}.jsonl`);
}

export function operationsManifoldLogGlob(): string {
  return operationsManifoldRelativePath("data", "logs", "*.jsonl");
}

export function operationsManifoldStatePath(name: string): string {
  return operationsManifoldRelativePath("data", "state", `${name}.json`);
}

export function operationsManifoldRecordPath(name: string): string {
  return operationsManifoldRelativePath("data", "record", `${name}.jsonl`);
}

export function operationsManifoldStateGlob(): string {
  return operationsManifoldRelativePath("data", "state", "*.json");
}

export function operationsManifoldStateDir(name: string): string {
  return operationsManifoldRelativePath("data", "state", name);
}

export function operationsManifoldScriptCatalog(repoRoot: string): PackageScriptCatalog {
  return packageScriptCatalogFromPackage({ packageDir: operationsManifoldPackageDir(repoRoot), basePath: "/" }).catalog;
}

export function workspacePackageAliases(name: string, packagePath: string): readonly string[] {
  const normalizedPath = packagePath.split(path.sep).join("/");
  const aliases = [name, normalizedPath, `./${normalizedPath}`, path.basename(normalizedPath)];
  if (normalizedPath.startsWith("sites/")) aliases.push(normalizedPath.slice("sites/".length));
  return Object.freeze([...new Set(aliases)]);
}

export function findWorkspacePackage(repoRoot: string, focus: string | undefined): DiscoveredPackage | undefined {
  const requested = focus?.trim();
  if (requested === undefined || requested === "") return undefined;
  for (const pkg of eachWorkspacePackageDir(repoRoot)) {
    const packagePath = path.relative(repoRoot, pkg.dir).split(path.sep).join("/");
    if (workspacePackageAliases(pkg.name, packagePath).includes(requested)) return pkg;
  }
  return undefined;
}

export function resolveWorkspacePackageFocusPath(repoRoot: string, focus: string | undefined): string | undefined {
  const requested = focus?.trim();
  if (requested === undefined || requested === "") return undefined;
  const pkg = findWorkspacePackage(repoRoot, requested);
  return pkg === undefined ? requested : path.relative(repoRoot, pkg.dir).split(path.sep).join("/");
}

export type PackageDescriptionUpdatePlan = Readonly<{
  kind: "jsnode-ick.package-description-update-plan";
  move: "jsnode-ick.package.description.update";
  settlement: "admitted" | "blocked" | "noop";
  package: string;
  packageDir: string;
  manifestPath: string;
  currentDescription: string;
  nextDescription: string;
  changed: boolean;
  admissible: boolean;
  obstructions: readonly string[];
  previewManifest: Readonly<Record<string, unknown>>;
  doneWhen: readonly string[];
}>;

function cleanDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function readPackageJson(packageDir: string): Readonly<Record<string, unknown>> {
  const manifestPath = path.join(packageDir, "package.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${manifestPath} must contain a JSON object`);
  }
  return parsed as Readonly<Record<string, unknown>>;
}

export function planWorkspacePackageDescription(
  repoRoot: string,
  params: BoundaryParams = {},
): PackageDescriptionUpdatePlan {
  const name = boundaryTextParam(params, "package", "name", "focus") ?? "";
  const description = boundaryTextParam(params, "description") ?? "";
  const pkg = findWorkspacePackage(repoRoot, name);
  if (pkg === undefined) throw new Error(`jsnode package not found: ${name}`);
  const rawHasLineBreak = /[\r\n]/.test(description);
  const next = cleanDescription(description);
  const current = pkg.description;
  const obstructions: string[] = [];
  if (next === "") obstructions.push("description is empty");
  if (next.length > 220) obstructions.push("description is longer than 220 characters");
  if (rawHasLineBreak) obstructions.push("description must be a single line");
  const changed = current !== next;
  const previewManifest = Object.freeze({ ...readPackageJson(pkg.dir), description: next });
  return Object.freeze({
    kind: "jsnode-ick.package-description-update-plan" as const,
    move: "jsnode-ick.package.description.update" as const,
    settlement: obstructions.length > 0 ? "blocked" as const : changed ? "admitted" as const : "noop" as const,
    package: pkg.name,
    packageDir: pkg.dir,
    manifestPath: path.join(pkg.dir, "package.json"),
    currentDescription: current,
    nextDescription: next,
    changed,
    admissible: obstructions.length === 0 && changed,
    obstructions: Object.freeze(obstructions),
    previewManifest,
    doneWhen: Object.freeze([
      "package.json description equals nextDescription",
      "jsnode-ick workspace reader reads the updated description into the package carrier",
      "jsnode-ick package atlas room displays the updated description",
    ]),
  });
}
