/**
 * @packageDocumentation
 *
 * package-surface - admitted package membrane readers.
 *
 * Export and bin surfaces are separate boundary faces. This module combines
 * them into one package-surface record so the package's public import
 * commitments and process-entrypoint commitments can be observed as one
 * phase-indexed relational contract.
 */
import { jsonResource } from "../lib/codecs/json/core.mts";
import type { BinSurface, BinSurfaceEntry } from "./schemas/bins.mts";
import type { ExportSurface, ExportSurfaceEntry } from "./schemas/exports.mts";
import {
  packageSurfaceContract as packageSurfaceSchemaContract,
  type PackageSurface,
  type PackageSurfaceCommitment,
} from "./schemas/package-surface.mts";
import { projectionSegmentKey } from "../lib/codecs/javascript/segment-key.mts";
import type { ModuleTopologyRead, ModuleTopologySymbol } from "../monitoring/source-code/index.mts";

export interface PackageEndpointSymbolReadout {
  readonly name: string;
  readonly kind: ModuleTopologySymbol["kind"];
  readonly line: number;
  readonly summary?: string;
}

export interface PackageEndpointCandidate {
  readonly kind: "metroplat.jsnode.package-endpoint-candidate";
  readonly packageName: string;
  readonly path: string;
  readonly specifier: string;
  readonly modulePath: string;
  readonly target: string;
  readonly symbol: PackageEndpointSymbolReadout;
  readonly authority: "package-export-map";
  readonly invocation: "readout-only-unless-action-or-rmn-boundary";
  readonly evidence: readonly string[];
}

export interface PackageEndpointReadout {
  readonly kind: "metroplat.jsnode.package-endpoint-readout";
  readonly packageName: string;
  readonly endpoints: readonly PackageEndpointCandidate[];
  readonly evidence: readonly string[];
}

function packagePathSegments(packageName: string): readonly string[] {
  return packageName.split("/").filter((part) => part.length > 0);
}

function exportSpecifierSegments(specifier: string): readonly string[] {
  if (specifier === ".") return Object.freeze([]);
  const relative = specifier.startsWith("./") ? specifier.slice(2) : specifier;
  return Object.freeze(relative.split("/").filter((part) => part.length > 0));
}

function endpointPath(packageName: string, specifier: string, symbol: string, basePath = ""): string {
  const prefix = basePath.replace(/\/+$/, "");
  const segments = [
    ...packagePathSegments(packageName),
    ...exportSpecifierSegments(specifier),
    symbol,
  ].map((segment) => encodeURIComponent(segment));
  return `${prefix}/${segments.join("/")}`.replace(/\/+/g, "/");
}

function sourcePathOfExportTarget(target: string): string {
  const stripped = target.replace(/^\.\//, "").replace(/^dist\//, "");
  if (stripped.endsWith(".d.mts")) return `${stripped.slice(0, -".d.mts".length)}.mts`;
  if (stripped.endsWith(".d.ts")) return `${stripped.slice(0, -".d.ts".length)}.ts`;
  if (stripped.endsWith(".mjs")) return `${stripped.slice(0, -".mjs".length)}.mts`;
  if (stripped.endsWith(".js")) return `${stripped.slice(0, -".js".length)}.ts`;
  return stripped;
}

function entryTarget(entry: ExportSurfaceEntry): string | undefined {
  return entry.import ?? entry.types;
}

/** Project an admitted package export membrane through an observed source topology. */
export function packageEndpointReadoutOf(
  surface: ExportSurface,
  read: ModuleTopologyRead,
  options: { readonly basePath?: string } = {},
): PackageEndpointReadout {
  const modulesByPath = new Map(read.modules.map((moduleEntry) => [moduleEntry.path, moduleEntry] as const));
  const endpoints: PackageEndpointCandidate[] = [];
  for (const entry of surface.entries) {
    const target = entryTarget(entry);
    if (target === undefined) continue;
    const modulePath = sourcePathOfExportTarget(target);
    const moduleEntry = modulesByPath.get(modulePath);
    if (moduleEntry === undefined) continue;
    for (const symbol of moduleEntry.symbols) {
      endpoints.push(Object.freeze({
        kind: "metroplat.jsnode.package-endpoint-candidate" as const,
        packageName: surface.packageName,
        path: endpointPath(surface.packageName, entry.specifier, symbol.name, options.basePath),
        specifier: entry.specifier,
        modulePath,
        target,
        symbol: Object.freeze({
          name: symbol.name,
          kind: symbol.kind,
          line: symbol.line,
          ...(symbol.summary === undefined ? {} : { summary: symbol.summary }),
        }),
        authority: "package-export-map" as const,
        invocation: "readout-only-unless-action-or-rmn-boundary" as const,
        evidence: Object.freeze([
          `package:${surface.packageName}`,
          `specifier:${entry.specifier}`,
          `target:${target}`,
          `module:${modulePath}`,
          `symbol:${symbol.name}`,
        ]),
      }));
    }
  }
  endpoints.sort((left, right) => left.path.localeCompare(right.path));
  return Object.freeze({
    kind: "metroplat.jsnode.package-endpoint-readout" as const,
    packageName: surface.packageName,
    endpoints: Object.freeze(endpoints),
    evidence: Object.freeze([
      "projection:package-name/export-subpath/exported-symbol",
      "authority:package-json-exports-plus-typescript-ast",
      "execution:not-admitted-here;action-or-rmn-boundary-required",
      `exports:${surface.entries.length}`,
      `modules:${read.modules.length}`,
      `endpoints:${endpoints.length}`,
    ]),
  });
}

function exportCommitments(surface: ExportSurface): readonly PackageSurfaceCommitment[] {
  const entries = surface.entries as readonly ExportSurfaceEntry[];
  return Object.freeze(entries.map((entry) => Object.freeze({
    kind: "metroplat.package-surface.commitment" as const,
    face: "export" as const,
    name: entry.specifier,
    mode: entry.mode,
    ...((entry.import ?? entry.types) === undefined ? {} : { target: entry.import ?? entry.types }),
  })));
}

function binCommitments(surface: BinSurface): readonly PackageSurfaceCommitment[] {
  const entries = surface.entries as readonly BinSurfaceEntry[];
  return Object.freeze(entries.map((entry) => Object.freeze({
    kind: "metroplat.package-surface.commitment" as const,
    face: "bin" as const,
    name: entry.command,
    mode: entry.mode,
    target: entry.target,
  })));
}

/**
 * Combine already-admitted export and bin surfaces into one package membrane.
 */
export function packageSurfaceOf(exportSurface: ExportSurface, binSurface: BinSurface): PackageSurface {
  if (exportSurface.packageName !== binSurface.packageName) {
    throw new TypeError(`packageSurfaceOf: package names differ: ${exportSurface.packageName} and ${binSurface.packageName}`);
  }
  if (exportSurface.source !== binSurface.source) {
    throw new TypeError(`packageSurfaceOf: sources differ: ${exportSurface.source} and ${binSurface.source}`);
  }
  const commitments = Object.freeze([
    ...exportCommitments(exportSurface),
    ...binCommitments(binSurface),
  ].sort((left, right) => `${left.face}:${left.name}`.localeCompare(`${right.face}:${right.name}`)));

  return packageSurfaceSchemaContract.assert({
    kind: "metroplat.package-surface",
    source: exportSurface.source,
    packageName: exportSurface.packageName,
    exports: exportSurface,
    bins: binSurface,
    commitments,
  }, "package surface");
}
