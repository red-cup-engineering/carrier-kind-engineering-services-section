/**
 * capability — query the workspace's carriers by free-text capability terms.
 *
 * A carrier is a queryable unit of capability: a package, an exported function,
 * an exported type, or an extra carrier supplied by the caller (e.g. a host's
 * own public surface that is not discoverable from the package graph). Each
 * carrier reduces to searchable text; `search` returns the carriers that hold
 * every query term, and `coverage` reports, term by term, which carriers cover
 * it and which terms are gaps.
 *
 * This is the workspace-reading half of the capability question and belongs to
 * the computer. Persisting the carrier snapshot, or attributing a host's own
 * capabilities, is a caller concern: pass them as `extraCarriers` and cache the
 * built carriers yourself.
 */
import { discoverWorkspace } from "./workspace.mjs";
import { workspaceTypeIndex } from "./type-index.mjs";
import type { WorkspaceFilter } from "./workspace.mjs";

export type CapabilityCarrierKind = "package" | "function" | "type";

export interface CapabilityCarrier {
  readonly kind: CapabilityCarrierKind;
  readonly id: string;
  readonly pkg?: string;
  readonly name: string;
  readonly field?: string;
  readonly text: string;
  readonly description?: string;
  readonly layer?: string;
  readonly href?: string;
  readonly domain?: readonly string[];
  readonly codomain?: string;
  readonly typeKind?: string;
}

export interface CapabilitySearchResult {
  readonly kind: "jsnode.capability-search";
  readonly query: string;
  readonly packages: readonly {
    readonly name: string;
    readonly field: string;
    readonly description: string;
    readonly layer: string;
    readonly href: string;
  }[];
  readonly functions: readonly {
    readonly pkg: string;
    readonly name: string;
    readonly domain: readonly string[];
    readonly codomain?: string;
  }[];
  readonly types: readonly {
    readonly pkg: string;
    readonly name: string;
    readonly kind: string;
  }[];
}

export interface CapabilityCarrierCoverage {
  readonly kind: CapabilityCarrierKind;
  readonly id: string;
  readonly pkg?: string;
  readonly name: string;
  readonly field?: string;
  readonly codomain?: string;
  readonly terms: readonly string[];
  readonly score: number;
}

export interface CapabilityCoverageResult {
  readonly kind: "jsnode.capability-coverage";
  readonly query: string;
  readonly terms: readonly string[];
  readonly coveredTerms: readonly string[];
  readonly gaps: readonly string[];
  readonly carriers: readonly CapabilityCarrierCoverage[];
  readonly termCoverage: readonly Readonly<{
    term: string;
    carriers: readonly string[];
  }>[];
}

export interface WorkspaceCapabilityOptions {
  /** Carriers to include beyond those discovered from the package graph — e.g.
   *  a host's own public capability surface. */
  readonly extraCarriers?: readonly CapabilityCarrier[];
  /** Restrict the package scan (include/exclude) the same way the type-index does. */
  readonly filter?: WorkspaceFilter;
}

export function capabilitySearchTerms(query: string): readonly string[] {
  return Object.freeze(
    query
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((term) => term.length > 0),
  );
}

function searchableText(values: readonly unknown[]): string {
  return values.map((value) => String(value ?? "")).join(" ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function carrierCoverage(carrier: CapabilityCarrier, terms: readonly string[]): CapabilityCarrierCoverage {
  const matchedTerms = terms.filter((term) => carrier.text.includes(term));
  return Object.freeze({
    kind: carrier.kind,
    id: carrier.id,
    name: carrier.name,
    ...(carrier.pkg === undefined ? {} : { pkg: carrier.pkg }),
    ...(carrier.field === undefined ? {} : { field: carrier.field }),
    ...(carrier.codomain === undefined ? {} : { codomain: carrier.codomain }),
    terms: Object.freeze(matchedTerms),
    score: terms.length === 0 ? 0 : matchedTerms.length / terms.length,
  });
}

/** Build the workspace's capability carriers: one per package, plus one per
 *  exported function and type from the workspace type-index, plus any extra
 *  carriers the caller supplies. Pure read; caller owns caching. */
export async function workspaceCapabilityCarriers(
  root: string,
  options: WorkspaceCapabilityOptions = {},
): Promise<readonly CapabilityCarrier[]> {
  const workspace = await discoverWorkspace(root, options.filter);
  const packageCarriers: CapabilityCarrier[] = workspace.packages.map((pkg) => Object.freeze({
    kind: "package" as const,
    id: pkg.name,
    name: pkg.name,
    field: "package",
    text: searchableText([pkg.name, pkg.description, pkg.layer, pkg.lifecycle, pkg.maturity]),
    description: pkg.description,
    layer: pkg.layer,
    href: `/jsnode?focus=${encodeURIComponent(pkg.name)}`,
  }));

  const index = workspaceTypeIndex(root, options.filter ?? {});
  const functionCarriers: CapabilityCarrier[] = index.functions.map((fn) => Object.freeze({
    kind: "function" as const,
    id: `${fn.pkg}:${fn.name}`,
    pkg: fn.pkg,
    name: fn.name,
    field: "exported-function",
    text: searchableText([fn.name, fn.pkg, ...fn.domain, fn.codomain]),
    domain: fn.domain,
    ...(fn.codomain === undefined ? {} : { codomain: fn.codomain }),
  }));
  const typeCarriers: CapabilityCarrier[] = index.types.map((type) => Object.freeze({
    kind: "type" as const,
    id: `${type.pkg}:${type.name}`,
    pkg: type.pkg,
    name: type.name,
    field: type.kind,
    text: searchableText([type.name, type.pkg, type.kind]),
    typeKind: type.kind,
  }));

  return Object.freeze([...(options.extraCarriers ?? []), ...functionCarriers, ...typeCarriers, ...packageCarriers]);
}

/** Carriers that hold every query term, projected into packages/functions/types. */
export function capabilitySearchOverCarriers(carriers: readonly CapabilityCarrier[], query: string): CapabilitySearchResult {
  const q = query.trim();
  if (q === "") return { kind: "jsnode.capability-search", query, packages: [], functions: [], types: [] };
  const terms = capabilitySearchTerms(q);
  const matches = carriers.filter((carrier) => terms.every((term) => carrier.text.includes(term)));
  const packages = matches
    .filter((carrier) => carrier.kind === "package")
    .map((carrier) => ({
      name: carrier.name,
      field: carrier.field ?? "package",
      description: carrier.description ?? carrier.text,
      layer: carrier.layer ?? "",
      href: carrier.href ?? `/jsnode?focus=${encodeURIComponent(carrier.name)}`,
    }))
    .slice(0, 24);
  const functions = matches
    .filter((carrier) => carrier.kind === "function")
    .sort((a, b) => (a.pkg ?? "").localeCompare(b.pkg ?? "") || a.name.localeCompare(b.name))
    .map((carrier) => ({
      pkg: carrier.pkg ?? "",
      name: carrier.name,
      domain: carrier.domain ?? [],
      ...(carrier.codomain === undefined ? {} : { codomain: carrier.codomain }),
    }))
    .slice(0, 40);
  const types = matches
    .filter((carrier) => carrier.kind === "type")
    .sort((a, b) => (a.pkg ?? "").localeCompare(b.pkg ?? "") || a.name.localeCompare(b.name))
    .map((carrier) => ({
      pkg: carrier.pkg ?? "",
      name: carrier.name,
      kind: carrier.typeKind ?? carrier.field ?? "type",
    }))
    .slice(0, 40);

  return { kind: "jsnode.capability-search", query, packages, functions, types };
}

/** Term-by-term coverage of `query` over `carriers`: which carriers cover each
 *  term, which terms are covered, and which are gaps. */
export function capabilityCoverageOverCarriers(carriers: readonly CapabilityCarrier[], query: string): CapabilityCoverageResult {
  const terms = capabilitySearchTerms(query);
  if (terms.length === 0) {
    return { kind: "jsnode.capability-coverage", query, terms: [], coveredTerms: [], gaps: [], carriers: [], termCoverage: [] };
  }
  const carrierMatches = carriers
    .map((carrier) => carrierCoverage(carrier, terms))
    .filter((carrier) => carrier.terms.length > 0)
    .sort((a, b) => b.terms.length - a.terms.length || a.id.localeCompare(b.id))
    .slice(0, 40);
  const termCoverage = terms.map((term) => Object.freeze({
    term,
    carriers: Object.freeze(carrierMatches
      .filter((carrier) => carrier.terms.includes(term))
      .map((carrier) => carrier.id)
      .slice(0, 8)),
  }));
  const coveredTerms = termCoverage.filter((item) => item.carriers.length > 0).map((item) => item.term);
  const gaps = termCoverage.filter((item) => item.carriers.length === 0).map((item) => item.term);

  return Object.freeze({
    kind: "jsnode.capability-coverage" as const,
    query,
    terms: Object.freeze(terms),
    coveredTerms: Object.freeze(coveredTerms),
    gaps: Object.freeze(gaps),
    carriers: Object.freeze(carrierMatches),
    termCoverage: Object.freeze(termCoverage),
  });
}
