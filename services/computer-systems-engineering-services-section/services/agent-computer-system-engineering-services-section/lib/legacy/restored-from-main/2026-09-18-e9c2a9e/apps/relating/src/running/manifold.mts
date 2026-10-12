/**
 * acting/manifold — the operations manifold projected from an induced package.
 *
 * An operations manifold is not owned by an operations site. It is the runtime
 * shape every induced package already has: one action apex, its carrier-slot
 * extrema, and the producer/consumer edges implied by equal `$ref`s.
 */
import type { UtteranceCarrier } from "@lenticule-science/articulating";
import { fact } from "./action.mjs";
import type { ActionDiscovery, ActionEndpoint } from "./induce.mjs";
import { resource, type ResourceCarrier } from "./resource.mjs";
import { slotRef } from "./serving.mjs";

/** A carrier slot where package actions meet the outside category. */
export interface OperationManifoldExtremum {
  /** Carrier `$id` consumed or produced at this extremum. */
  readonly carrier: string;
  /** Action verbs touching this extremum. */
  readonly actions: readonly string[];
}

/** A local edge whose producer codomain is another action's domain. */
export interface OperationManifoldEdge {
  /** The producing action verb. */
  readonly from: string;
  /** The consuming action verb. */
  readonly to: string;
  /** The carrier `$id` that makes the codomain/domain composition lawful. */
  readonly carrier: string;
  /** Runtime relation witnessed by this edge. */
  readonly relation: "codomain-domain";
}

/**
 * The apex summary whose projections define this package's operation surface.
 *
 * This is the compact, serializable read of an induced action family: which
 * package was induced, which verbs it exposes, and which resource/prompt legs
 * travel with it. It intentionally stores names and URIs rather than executable
 * closures, so the manifold can be logged, served as an MCP resource, or folded
 * into a cross-package graph.
 */
export interface OperationManifoldApex {
  /** Discovery-carrier tag copied from the induced apex. */
  readonly kind: ActionDiscovery["kind"];
  /** Package or module namespace whose apex was induced. */
  readonly package: string;
  /** Process protocol described by the discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Action verbs available at this apex. */
  readonly bins: readonly string[];
  /** Resource URIs published with this apex. */
  readonly resources: readonly string[];
  /** Prompt names published with this apex. */
  readonly prompts: readonly string[];
}

/**
 * Package-level operations manifold induced from one action discovery.
 *
 * The manifold is the action apex read as carrier incidence data. Domain
 * extrema are the carrier `$id`s this package consumes; codomain extrema are the
 * carrier `$id`s it produces; local edges are the places where a produced
 * carrier is also consumed by another action in the same apex. Incoming and
 * outgoing frontiers are therefore not guessed dependency metadata: they are
 * derived from missing local producers or consumers.
 */
export interface PackageOperationsManifold {
  /** Runtime tag for a package operations manifold. */
  readonly kind: "relating.operations-manifold";
  /** Package or module namespace whose discovery carrier was read. */
  readonly package: string;
  /** Process protocol described by the discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Compact apex summary: actions, resources, and prompts by public handle. */
  readonly apex: OperationManifoldApex;
  /** Carrier-incidence reads around the apex. */
  readonly extrema: {
    /** Domain carrier extrema: carriers the package consumes. */
    readonly domains: readonly OperationManifoldExtremum[];
    /** Codomain carrier extrema: carriers the package produces. */
    readonly codomains: readonly OperationManifoldExtremum[];
    /** Domain extrema with no local producer; likely an upstream apex. */
    readonly incoming: readonly OperationManifoldExtremum[];
    /** Codomain extrema with no local consumer; likely a downstream domain. */
    readonly outgoing: readonly OperationManifoldExtremum[];
    /** Local edges where a final codomain is another action's first domain. */
    readonly edges: readonly OperationManifoldEdge[];
  };
  /** RMN utterances that make the manifold inspectable as relational data. */
  readonly utterances: readonly UtteranceCarrier[];
}

/** One package node in a cross-package operations-manifold graph. */
export interface OperationsManifoldGraphNode {
  /** Package or module namespace. */
  readonly package: string;
  /** Process protocol described by the package discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Action verbs exposed by the package apex. */
  readonly bins: readonly string[];
  /** Carrier `$id`s consumed by the package apex. */
  readonly domains: readonly string[];
  /** Carrier `$id`s produced by the package apex. */
  readonly codomains: readonly string[];
}

/** A cross-package composition candidate by shared carrier identity. */
export interface OperationsManifoldGraphEdge {
  /** Producing package namespace. */
  readonly fromPackage: string;
  /** Producing action verb. */
  readonly from: string;
  /** Consuming package namespace. */
  readonly toPackage: string;
  /** Consuming action verb. */
  readonly to: string;
  /** Carrier `$id` that makes the codomain-domain match. */
  readonly carrier: string;
  /** Runtime relation witnessed by this edge. */
  readonly relation: "codomain-domain";
}

/** A carrier frontier where the graph has only one visible side. */
export interface OperationsManifoldGraphFrontier {
  /** Package or module namespace at the frontier. */
  readonly package: string;
  /** Carrier `$id` that lacks a visible opposite side in the graph. */
  readonly carrier: string;
  /** Action verbs touching the frontier carrier. */
  readonly actions: readonly string[];
}

/**
 * Cross-package operations graph derived from package manifolds.
 *
 * The graph relates package apices by carrier identity alone: if one package
 * produces a carrier that another package consumes, the edge exists. Incoming
 * and outgoing frontiers remain visible so agent tooling can see where the
 * current package mesh has an unserved input or an unconsumed output.
 */
export interface OperationsManifoldGraph {
  /** Runtime tag for the cross-package graph read. */
  readonly kind: "relating.operations-manifold.graph";
  /** Package nodes participating in the read. */
  readonly packages: readonly OperationsManifoldGraphNode[];
  /** Cross-package edges induced by matching carrier `$id`s. */
  readonly edges: readonly OperationsManifoldGraphEdge[];
  /** Visible unresolved carrier fronts in the supplied package set. */
  readonly frontier: {
    /** Consumed carriers that no supplied package produces. */
    readonly incoming: readonly OperationsManifoldGraphFrontier[];
    /** Produced carriers that no supplied package consumes. */
    readonly outgoing: readonly OperationsManifoldGraphFrontier[];
  };
  /** Relational facts describing graph package membership and edges. */
  readonly utterances: readonly UtteranceCarrier[];
}

function endpointsBySlot(
  endpoints: readonly ActionEndpoint[],
  side: "domain" | "codomain",
): ReadonlyMap<string, readonly string[]> {
  const byCarrier = new Map<string, string[]>();
  for (const endpoint of endpoints) {
    const carrier = slotRef(side === "domain" ? endpoint.domainSchema : endpoint.codomainSchema);
    if (carrier === undefined) continue;
    const verbs = byCarrier.get(carrier);
    if (verbs === undefined) byCarrier.set(carrier, [endpoint.name]);
    else verbs.push(endpoint.name);
  }
  return new Map([...byCarrier.entries()].map(([carrier, verbs]) => [carrier, Object.freeze([...verbs].sort())]));
}

function extremaFrom(byCarrier: ReadonlyMap<string, readonly string[]>): readonly OperationManifoldExtremum[] {
  return Object.freeze([...byCarrier.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([carrier, verbs]) => Object.freeze({ carrier, actions: verbs })));
}

function filterExtrema(
  extrema: readonly OperationManifoldExtremum[],
  absentFrom: ReadonlyMap<string, readonly string[]>,
): readonly OperationManifoldExtremum[] {
  return Object.freeze(extrema.filter((extremum) => !absentFrom.has(extremum.carrier)));
}

function edgesFrom(
  domains: ReadonlyMap<string, readonly string[]>,
  codomains: ReadonlyMap<string, readonly string[]>,
): readonly OperationManifoldEdge[] {
  const edges: OperationManifoldEdge[] = [];
  for (const [carrier, froms] of codomains) {
    const tos = domains.get(carrier);
    if (tos === undefined) continue;
    for (const from of froms) {
      for (const to of tos) edges.push(Object.freeze({ from, to, carrier, relation: "codomain-domain" as const }));
    }
  }
  return Object.freeze(edges.sort((left, right) =>
    left.carrier.localeCompare(right.carrier)
    || left.from.localeCompare(right.from)
    || left.to.localeCompare(right.to)));
}

function manifoldUtterances(
  discovery: ActionDiscovery,
  domains: readonly OperationManifoldExtremum[],
  codomains: readonly OperationManifoldExtremum[],
  edges: readonly OperationManifoldEdge[],
): readonly UtteranceCarrier[] {
  const term = `relating.operations-manifold.${discovery.package}`;
  const utterances: UtteranceCarrier[] = [
    fact(term, "relating.operations-manifold.of-package", discovery.package),
    fact(term, "relating.operations-manifold.has-apex", `relating://${encodeURIComponent(discovery.package)}/discovery`),
  ];
  for (const extremum of domains) {
    utterances.push(fact(term, "relating.operations-manifold.has-domain-extremum", extremum.carrier));
  }
  for (const extremum of codomains) {
    utterances.push(fact(term, "relating.operations-manifold.has-codomain-extremum", extremum.carrier));
  }
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.from}.${edge.to}`;
    utterances.push(fact(edgeTerm, "relating.operations-manifold.composes-through", edge.carrier));
  }
  return Object.freeze(utterances);
}

/** Project an action discovery carrier into its package operations manifold. */
export function operationsManifoldOf(discovery: ActionDiscovery): PackageOperationsManifold {
  const domainMap = endpointsBySlot(discovery.bins, "domain");
  const codomainMap = endpointsBySlot(discovery.bins, "codomain");
  const domains = extremaFrom(domainMap);
  const codomains = extremaFrom(codomainMap);
  const edges = edgesFrom(domainMap, codomainMap);

  return Object.freeze({
    kind: "relating.operations-manifold" as const,
    package: discovery.package,
    protocol: discovery.protocol,
    apex: Object.freeze({
      kind: discovery.kind,
      package: discovery.package,
      protocol: discovery.protocol,
      bins: Object.freeze(discovery.bins.map((bin) => bin.name).sort()),
      resources: Object.freeze(discovery.resources.map((res) => res.uri).sort()),
      prompts: Object.freeze(discovery.prompts.map((prompt) => prompt.name).sort()),
    }),
    extrema: Object.freeze({
      domains,
      codomains,
      incoming: filterExtrema(domains, codomainMap),
      outgoing: filterExtrema(codomains, domainMap),
      edges,
    }),
    utterances: manifoldUtterances(discovery, domains, codomains, edges),
  });
}

function graphNodeOf(manifold: PackageOperationsManifold): OperationsManifoldGraphNode {
  return Object.freeze({
    package: manifold.package,
    protocol: manifold.protocol,
    bins: manifold.apex.bins,
    domains: Object.freeze(manifold.extrema.domains.map((extremum) => extremum.carrier).sort()),
    codomains: Object.freeze(manifold.extrema.codomains.map((extremum) => extremum.carrier).sort()),
  });
}

function graphFrontierOf(
  manifolds: readonly PackageOperationsManifold[],
  side: "domains" | "codomains",
  absentFrom: ReadonlySet<string>,
): readonly OperationsManifoldGraphFrontier[] {
  const frontier: OperationsManifoldGraphFrontier[] = [];
  for (const manifold of manifolds) {
    for (const extremum of manifold.extrema[side]) {
      if (absentFrom.has(extremum.carrier)) continue;
      frontier.push(Object.freeze({ package: manifold.package, carrier: extremum.carrier, actions: extremum.actions }));
    }
  }
  return Object.freeze(frontier.sort((left, right) =>
    left.carrier.localeCompare(right.carrier) || left.package.localeCompare(right.package)));
}

function graphUtterances(
  manifolds: readonly PackageOperationsManifold[],
  edges: readonly OperationsManifoldGraphEdge[],
): readonly UtteranceCarrier[] {
  const term = "relating.operations-manifold.graph";
  const utterances: UtteranceCarrier[] = [];
  for (const manifold of manifolds) utterances.push(fact(term, "relating.operations-manifold.graph.has-package", manifold.package));
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.fromPackage}.${edge.from}.${edge.toPackage}.${edge.to}`;
    utterances.push(fact(edgeTerm, "relating.operations-manifold.graph.composes-through", edge.carrier));
  }
  return Object.freeze(utterances);
}

/**
 * Relate several package manifolds by carrier `$id` equality.
 *
 * This is the package-mesh read behind the "operations manifold" product: no
 * package imports another here, and no route table is inspected. The only edge
 * law is the same one used for action composition inside one apex: a produced
 * carrier identity equals a consumed carrier identity.
 */
export function operationsManifoldGraphOf(
  manifolds: readonly PackageOperationsManifold[],
): OperationsManifoldGraph {
  const domainCarriers = new Set<string>();
  const codomainCarriers = new Set<string>();
  for (const manifold of manifolds) {
    for (const extremum of manifold.extrema.domains) domainCarriers.add(extremum.carrier);
    for (const extremum of manifold.extrema.codomains) codomainCarriers.add(extremum.carrier);
  }

  const edges: OperationsManifoldGraphEdge[] = [];
  for (const source of manifolds) {
    for (const produced of source.extrema.codomains) {
      for (const target of manifolds) {
        if (source.package === target.package) continue;
        const consumed = target.extrema.domains.find((extremum) => extremum.carrier === produced.carrier);
        if (consumed === undefined) continue;
        for (const from of produced.actions) {
          for (const to of consumed.actions) {
            edges.push(Object.freeze({
              fromPackage: source.package,
              from,
              toPackage: target.package,
              to,
              carrier: produced.carrier,
              relation: "codomain-domain" as const,
            }));
          }
        }
      }
    }
  }
  edges.sort((left, right) =>
    left.carrier.localeCompare(right.carrier)
    || left.fromPackage.localeCompare(right.fromPackage)
    || left.from.localeCompare(right.from)
    || left.toPackage.localeCompare(right.toPackage)
    || left.to.localeCompare(right.to));

  return Object.freeze({
    kind: "relating.operations-manifold.graph" as const,
    packages: Object.freeze(manifolds.map(graphNodeOf).sort((left, right) => left.package.localeCompare(right.package))),
    edges: Object.freeze(edges),
    frontier: Object.freeze({
      incoming: graphFrontierOf(manifolds, "domains", codomainCarriers),
      outgoing: graphFrontierOf(manifolds, "codomains", domainCarriers),
    }),
    utterances: graphUtterances(manifolds, edges),
  });
}

/**
 * Stable MCP resource URI for a package's operations manifold.
 *
 * `induceBins` publishes this beside the discovery resource so MCP clients can
 * read not only what tools/resources/prompts exist, but how the action family is
 * wired through carrier extrema.
 */
export function operationsManifoldUri(packageName: string): string {
  return `relating://${encodeURIComponent(packageName)}/operations-manifold`;
}

/**
 * Publish the package operations manifold as an MCP resource.
 *
 * The resource body is computed at read time from the live discovery carrier,
 * so it follows the same apex as `tools/list`, `resources/list`, and
 * `prompts/list` without maintaining a second registry.
 */
export function operationsManifoldResource(
  packageName: string,
  discovery: () => ActionDiscovery,
): ResourceCarrier {
  return resource({
    uri: operationsManifoldUri(packageName),
    name: `${packageName} operations manifold`,
    description: "The package's runtime operations manifold: apex, carrier extrema, and codomain-domain edges.",
    read: () => `${JSON.stringify(operationsManifoldOf(discovery()), null, 2)}\n`,
  });
}
