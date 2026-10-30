import { workspaceTypeIndex, type AttributedFunction, type AttributedType, type WorkspaceTypeIndex } from "./type-index.mjs";

export type WorkspaceApiSurfaceOptions = Readonly<{
  package?: string;
  match?: string;
  taking?: string;
  producing?: string;
  limit?: number;
}>;

export type WorkspaceApiSurface = Readonly<{
  kind: "jsnode.api-surface";
  filters: {
    readonly package?: string;
    readonly match?: string;
    readonly taking?: string;
    readonly producing?: string;
    readonly limit: number;
  };
  totals: {
    readonly types: number;
    readonly functions: number;
    readonly matchedTypes: number;
    readonly matchedFunctions: number;
  };
  types: readonly AttributedType[];
  functions: readonly AttributedFunction[];
}>;

export type WorkspaceApiSurfaceReader = Readonly<{
  index(): WorkspaceTypeIndex;
  refresh(): void;
  surface(options?: WorkspaceApiSurfaceOptions): WorkspaceApiSurface;
}>;

function normalized(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next === undefined || next === "" ? undefined : next;
}

function includesNeedle(value: string | undefined, needle: string | undefined): boolean {
  return needle === undefined || (value ?? "").toLowerCase().includes(needle.toLowerCase());
}

function limited<T>(items: readonly T[], limit: number): readonly T[] {
  return Object.freeze(items.slice(0, limit));
}

function normalizedLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 120;
  return Math.max(1, Math.min(500, Math.floor(value)));
}

export function workspaceApiSurfaceFromIndex(index: WorkspaceTypeIndex, options: WorkspaceApiSurfaceOptions = {}): WorkspaceApiSurface {
  const packageName = normalized(options.package);
  const match = normalized(options.match);
  const taking = normalized(options.taking);
  const producing = normalized(options.producing);
  const limit = normalizedLimit(options.limit);

  const types = index.types
    .filter((type) => packageName === undefined || type.pkg === packageName)
    .filter((type) => includesNeedle(type.name, match) || includesNeedle(type.kind, match))
    .sort((a, b) => a.pkg.localeCompare(b.pkg) || a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));

  const functions = index.functions
    .filter((fn) => packageName === undefined || fn.pkg === packageName)
    .filter((fn) => includesNeedle(fn.name, match) || fn.domain.some((domain) => includesNeedle(domain, match)) || includesNeedle(fn.codomain, match))
    .filter((fn) => taking === undefined || fn.domain.some((domain) => includesNeedle(domain, taking)))
    .filter((fn) => producing === undefined || includesNeedle(fn.codomain, producing))
    .sort((a, b) => a.pkg.localeCompare(b.pkg) || a.name.localeCompare(b.name));

  return Object.freeze({
    kind: "jsnode.api-surface" as const,
    filters: Object.freeze({
      ...(packageName === undefined ? {} : { package: packageName }),
      ...(match === undefined ? {} : { match }),
      ...(taking === undefined ? {} : { taking }),
      ...(producing === undefined ? {} : { producing }),
      limit,
    }),
    totals: Object.freeze({
      types: index.types.length,
      functions: index.functions.length,
      matchedTypes: types.length,
      matchedFunctions: functions.length,
    }),
    types: limited(types, limit),
    functions: limited(functions, limit),
  });
}

export function workspaceApiSurface(repoRoot: string, options: WorkspaceApiSurfaceOptions = {}): WorkspaceApiSurface {
  const packageName = normalized(options.package);
  return workspaceApiSurfaceFromIndex(
    workspaceTypeIndex(repoRoot, packageName === undefined ? {} : { include: [packageName] }),
    options,
  );
}

export function createWorkspaceApiSurfaceReader(repoRoot: string): WorkspaceApiSurfaceReader {
  let held: WorkspaceTypeIndex | undefined;
  const heldByPackage = new Map<string, WorkspaceTypeIndex>();
  function index(): WorkspaceTypeIndex {
    held ??= workspaceTypeIndex(repoRoot);
    return held;
  }
  function packageIndex(packageName: string): WorkspaceTypeIndex {
    const heldPackage = heldByPackage.get(packageName);
    if (heldPackage !== undefined) return heldPackage;
    const next = workspaceTypeIndex(repoRoot, { include: [packageName] });
    heldByPackage.set(packageName, next);
    return next;
  }
  return Object.freeze({
    index,
    refresh() {
      held = undefined;
      heldByPackage.clear();
    },
    surface(options: WorkspaceApiSurfaceOptions = {}) {
      const packageName = normalized(options.package);
      return workspaceApiSurfaceFromIndex(packageName === undefined ? index() : packageIndex(packageName), options);
    },
  });
}
