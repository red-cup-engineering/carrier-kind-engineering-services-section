/**
 * presentation/manifold — the operations manifold projected from an induced package.
 *
 * An operations manifold is not owned by an operations site. It is the runtime
 * shape every induced package already has: one program surface, its schema-slot
 * extrema, and the producer/consumer edges admitted by equal `$ref`s plus
 * measured contract standing at each endpoint.
 */
import type { UtteranceObject } from "../lib/records/utterance/index.mts";
import { schemaSiteIncidence, schemaSlotRef, type SchemaSiteExtremum } from "../lib/schema/site.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { fact } from "../rpc/index.mts";
import type { ProgramDiscovery, ProgramEndpoint } from "./surface.mts";
import { resource, type ResourceRegistration } from "./resources.mts";

/** A schema slot where package operations meet the outside category. */
export interface OperationManifoldExtremum {
  /** SchemaContract `$id` consumed or produced at this extremum. */
  readonly schema: string;
  /** Operation verbs touching this extremum. */
  readonly operations: readonly string[];
}

/** A local edge whose producer codomain is another operation's domain. */
export interface OperationManifoldEdge {
  /** The producing action verb. */
  readonly from: string;
  /** The consuming action verb. */
  readonly to: string;
  /** The schema `$id` that makes the codomain/domain composition lawful. */
  readonly schema: string;
  /** Derived contract identities and their independently settled standing. */
  readonly contractComposition: {
    readonly producer: string;
    readonly producerCharge: ProgramEndpoint["contract"]["charge"];
    readonly consumer: string;
    readonly consumerCharge: ProgramEndpoint["contract"]["charge"];
  };
  /** Runtime relation evidenced by this edge. */
  readonly relation: "schema-contract-composition";
  /** Whether this edge is a valid local Hoare composition. */
  readonly ok: boolean;
}

/**
 * The apex summary whose projections define this package's operation surface.
 *
 * This is the compact, serializable read of an induced program surface: which
 * package was induced, which mounted programs it exposes, and which resource/prompt legs
 * travel with it. It intentionally stores names and URIs rather than executable
 * closures, so the manifold can be logged, served as an MCP resource, or folded
 * into a cross-package graph.
 */
export interface OperationManifoldApex {
  /** Discovery tag copied from the induced apex. */
  readonly kind: ProgramDiscovery["kind"];
  /** Package or module namespace whose apex was induced. */
  readonly package: string;
  /** Process protocol described by the discovery object. */
  readonly protocol: ProgramDiscovery["protocol"];
  /** Mounted program names available at this surface. */
  readonly programs: readonly string[];
  /** Resource URIs published with this apex. */
  readonly resources: readonly string[];
  /** Prompt names published with this apex. */
  readonly prompts: readonly string[];
}

/**
 * Package-level operations manifold induced from one program discovery.
 *
 * The manifold is the program surface read as schema incidence data. Domain
 * extrema are the schema `$id`s this package consumes; codomain extrema are the
 * schema `$id`s it produces; local edges are the places where a produced
 * schema is also consumed by another action in the same apex and the
 * producer's postcondition satisfies the consumer's precondition. Incoming and
 * outgoing frontiers are therefore not guessed dependency metadata: they are
 * derived from missing local producers or consumers.
 */
export interface PackageOperationsManifold {
  /** Runtime tag for a package operations manifold. */
  readonly kind: "metroplat.operations-manifold";
  /** Package or module namespace whose discovery object was read. */
  readonly package: string;
  /** Process protocol described by the discovery object. */
  readonly protocol: ProgramDiscovery["protocol"];
  /** Compact apex summary: programs, resources, and prompts by public handle. */
  readonly apex: OperationManifoldApex;
  /** SchemaContract-incidence reads around the apex. */
  readonly extrema: {
    /** Domain schema extrema: schemas the package consumes. */
    readonly domains: readonly OperationManifoldExtremum[];
    /** Codomain schema extrema: schemas the package produces. */
    readonly codomains: readonly OperationManifoldExtremum[];
    /** Domain extrema with no local producer; likely an upstream apex. */
    readonly incoming: readonly OperationManifoldExtremum[];
    /** Codomain extrema with no local consumer; likely a downstream domain. */
    readonly outgoing: readonly OperationManifoldExtremum[];
    /** Local edges where a final codomain is another action's first domain and Q=>P holds. */
    readonly edges: readonly OperationManifoldEdge[];
    /** SchemaContract-identity candidates rejected by Hoare post/pre compatibility. */
    readonly rejectedEdges: readonly OperationManifoldEdge[];
  };
  /** RMN utterances that make the manifold inspectable as relational data. */
  readonly utterances: readonly UtteranceObject[];
}

/** One package node in a cross-package operations-manifold graph. */
export interface OperationsManifoldGraphNode {
  /** Package or module namespace. */
  readonly package: string;
  /** Process protocol described by the package discovery object. */
  readonly protocol: ProgramDiscovery["protocol"];
  /** Mounted program names exposed by the package surface. */
  readonly programs: readonly string[];
  /** SchemaContract `$id`s consumed by the package apex. */
  readonly domains: readonly string[];
  /** SchemaContract `$id`s produced by the package apex. */
  readonly codomains: readonly string[];
}

/** A cross-package composition candidate by shared schema identity. */
export interface OperationsManifoldGraphEdge {
  /** Producing package namespace. */
  readonly fromPackage: string;
  /** Producing action verb. */
  readonly from: string;
  /** Consuming package namespace. */
  readonly toPackage: string;
  /** Consuming action verb. */
  readonly to: string;
  /** SchemaContract `$id` that makes the codomain-domain match. */
  readonly schema: string;
  /** Runtime relation evidenced by this edge. */
  readonly relation: "codomain-domain";
}

/** A schema frontier where the graph has only one visible side. */
export interface OperationsManifoldGraphFrontier {
  /** Package or module namespace at the frontier. */
  readonly package: string;
  /** SchemaContract `$id` that lacks a visible opposite side in the graph. */
  readonly schema: string;
  /** Operation verbs touching the frontier schema. */
  readonly operations: readonly string[];
}

/**
 * Cross-package operations graph derived from package manifolds.
 *
 * The graph relates package apices by schema identity candidates: if one
 * package produces a schema that another package consumes, the edge exists.
 * Incoming and outgoing frontiers remain visible so agent tooling can see where
 * the current package mesh has an unserved input or an unconsumed output.
 */
export interface OperationsManifoldGraph {
  /** Runtime tag for the cross-package graph read. */
  readonly kind: "metroplat.operations-manifold.graph";
  /** Package nodes participating in the read. */
  readonly packages: readonly OperationsManifoldGraphNode[];
  /** Cross-package edges induced by matching schema `$id`s. */
  readonly edges: readonly OperationsManifoldGraphEdge[];
  /** Visible unresolved schema fronts in the supplied package set. */
  readonly frontier: {
    /** Consumed schemas that no supplied package produces. */
    readonly incoming: readonly OperationsManifoldGraphFrontier[];
    /** Produced schemas that no supplied package consumes. */
    readonly outgoing: readonly OperationsManifoldGraphFrontier[];
  };
  /** Relational facts describing graph package membership and edges. */
  readonly utterances: readonly UtteranceObject[];
}

function endpointsBySlot(
  endpoints: readonly ProgramEndpoint[],
  side: "domain" | "codomain",
): ReadonlyMap<string, readonly string[]> {
  const incidence = schemaSiteIncidence(endpoints.map((endpoint) => ({
    id: endpoint.name,
    ...(schemaSlotRef(endpoint.domainSchema) === undefined ? {} : { domain: schemaSlotRef(endpoint.domainSchema) as string }),
    ...(schemaSlotRef(endpoint.codomainSchema) === undefined ? {} : { codomain: schemaSlotRef(endpoint.codomainSchema) as string }),
  })));
  const extrema: readonly SchemaSiteExtremum[] = side === "domain" ? incidence.domains : incidence.codomains;
  return new Map(extrema.map((extremum) => [extremum.schema, Object.freeze([...extremum.legs])] as const));
}

function extremaFrom(bySchema: ReadonlyMap<string, readonly string[]>): readonly OperationManifoldExtremum[] {
  return Object.freeze([...bySchema.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schema, verbs]) => Object.freeze({ schema, operations: verbs })));
}

function filterExtrema(
  extrema: readonly OperationManifoldExtremum[],
  absentFrom: ReadonlyMap<string, readonly string[]>,
): readonly OperationManifoldExtremum[] {
  return Object.freeze(extrema.filter((extremum) => !absentFrom.has(extremum.schema)));
}

function edgesFrom(
  endpoints: readonly ProgramEndpoint[],
): { readonly edges: readonly OperationManifoldEdge[]; readonly rejectedEdges: readonly OperationManifoldEdge[] } {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint]));
  const candidates = [...schemaSiteIncidence([
    ...endpoints.map((endpoint) => ({
      id: endpoint.name,
      ...(schemaSlotRef(endpoint.domainSchema) === undefined ? {} : { domain: schemaSlotRef(endpoint.domainSchema) as string }),
      ...(schemaSlotRef(endpoint.codomainSchema) === undefined ? {} : { codomain: schemaSlotRef(endpoint.codomainSchema) as string }),
    })),
  ]).edges];
  const accepted: OperationManifoldEdge[] = [];
  const rejected: OperationManifoldEdge[] = [];
  for (const candidate of candidates) {
    const producer = byName.get(candidate.from);
    const consumer = byName.get(candidate.to);
    if (producer === undefined || consumer === undefined) continue;
    const contractComposition = Object.freeze({
      producer: producer.contract.contract.id,
      producerCharge: producer.contract.charge,
      consumer: consumer.contract.contract.id,
      consumerCharge: consumer.contract.charge,
    });
    const edge = Object.freeze({
      from: candidate.from,
      to: candidate.to,
      schema: candidate.schema,
      contractComposition,
      relation: "schema-contract-composition" as const,
      ok: true,
    });
    (edge.ok ? accepted : rejected).push(edge);
  }
  return Object.freeze({
    edges: Object.freeze(accepted),
    rejectedEdges: Object.freeze(rejected),
  });
}

function manifoldUtterances(
  discovery: ProgramDiscovery,
  domains: readonly OperationManifoldExtremum[],
  codomains: readonly OperationManifoldExtremum[],
  edges: readonly OperationManifoldEdge[],
): readonly UtteranceObject[] {
  const term = `metroplat.operations-manifold.${discovery.package}`;
  const utterances: UtteranceObject[] = [
    fact(term, "metroplat.operations-manifold.of-package", discovery.package),
    fact(term, "metroplat.operations-manifold.has-apex", `metroplat://${encodeURIComponent(discovery.package)}/discovery`),
  ];
  for (const extremum of domains) {
    utterances.push(fact(term, "metroplat.operations-manifold.has-domain-extremum", extremum.schema));
  }
  for (const extremum of codomains) {
    utterances.push(fact(term, "metroplat.operations-manifold.has-codomain-extremum", extremum.schema));
  }
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.from}.${edge.to}`;
    utterances.push(fact(edgeTerm, "metroplat.operations-manifold.composes-through", edge.schema));
    utterances.push(fact(edgeTerm, "metroplat.operations-manifold.composition-report", edge.contractComposition as unknown as JsonValue));
  }
  return Object.freeze(utterances);
}

/** Project a program discovery object into its package operations manifold. */
export function operationsManifoldOf(discovery: ProgramDiscovery): PackageOperationsManifold {
  const domainMap = endpointsBySlot(discovery.programs, "domain");
  const codomainMap = endpointsBySlot(discovery.programs, "codomain");
  const domains = extremaFrom(domainMap);
  const codomains = extremaFrom(codomainMap);
  const { edges, rejectedEdges } = edgesFrom(discovery.programs);

  return Object.freeze({
    kind: "metroplat.operations-manifold" as const,
    package: discovery.package,
    protocol: discovery.protocol,
    apex: Object.freeze({
      kind: discovery.kind,
      package: discovery.package,
      protocol: discovery.protocol,
      programs: Object.freeze(discovery.programs.map((program) => program.name).sort()),
      resources: Object.freeze(discovery.resources.map((res) => res.uri).sort()),
      prompts: Object.freeze(discovery.prompts.map((prompt) => prompt.name).sort()),
    }),
    extrema: Object.freeze({
      domains,
      codomains,
      incoming: filterExtrema(domains, codomainMap),
      outgoing: filterExtrema(codomains, domainMap),
      edges,
      rejectedEdges,
    }),
    utterances: manifoldUtterances(discovery, domains, codomains, edges),
  });
}

function graphNodeOf(manifold: PackageOperationsManifold): OperationsManifoldGraphNode {
  return Object.freeze({
    package: manifold.package,
    protocol: manifold.protocol,
    programs: manifold.apex.programs,
    domains: Object.freeze(manifold.extrema.domains.map((extremum) => extremum.schema).sort()),
    codomains: Object.freeze(manifold.extrema.codomains.map((extremum) => extremum.schema).sort()),
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
      if (absentFrom.has(extremum.schema)) continue;
      frontier.push(Object.freeze({ package: manifold.package, schema: extremum.schema, operations: extremum.operations }));
    }
  }
  return Object.freeze(frontier.sort((left, right) =>
    left.schema.localeCompare(right.schema) || left.package.localeCompare(right.package)));
}

function graphUtterances(
  manifolds: readonly PackageOperationsManifold[],
  edges: readonly OperationsManifoldGraphEdge[],
): readonly UtteranceObject[] {
  const term = "metroplat.operations-manifold.graph";
  const utterances: UtteranceObject[] = [];
  for (const manifold of manifolds) utterances.push(fact(term, "metroplat.operations-manifold.graph.has-package", manifold.package));
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.fromPackage}.${edge.from}.${edge.toPackage}.${edge.to}`;
    utterances.push(fact(edgeTerm, "metroplat.operations-manifold.graph.composes-through", edge.schema));
  }
  return Object.freeze(utterances);
}

/**
 * Relate several package manifolds by schema `$id` equality.
 *
 * This is the package-mesh read behind the "operations manifold" product: no
 * package imports another here, and no route table is inspected. The only edge
 * law is the schema-boundary half of action composition: a produced schema
 * identity equals a consumed schema identity. Local manifolds additionally
 * attach Hoare post/pre composition reports when both contracts are present in
 * one induced apex.
 */
export function operationsManifoldGraphOf(
  manifolds: readonly PackageOperationsManifold[],
): OperationsManifoldGraph {
  const domainSchemas = new Set<string>();
  const codomainSchemas = new Set<string>();
  for (const manifold of manifolds) {
    for (const extremum of manifold.extrema.domains) domainSchemas.add(extremum.schema);
    for (const extremum of manifold.extrema.codomains) codomainSchemas.add(extremum.schema);
  }

  const edges: OperationsManifoldGraphEdge[] = [];
  for (const source of manifolds) {
    for (const produced of source.extrema.codomains) {
      for (const target of manifolds) {
        if (source.package === target.package) continue;
        const consumed = target.extrema.domains.find((extremum) => extremum.schema === produced.schema);
        if (consumed === undefined) continue;
        for (const from of produced.operations) {
          for (const to of consumed.operations) {
            edges.push(Object.freeze({
              fromPackage: source.package,
              from,
              toPackage: target.package,
              to,
              schema: produced.schema,
              relation: "codomain-domain" as const,
            }));
          }
        }
      }
    }
  }
  edges.sort((left, right) =>
    left.schema.localeCompare(right.schema)
    || left.fromPackage.localeCompare(right.fromPackage)
    || left.from.localeCompare(right.from)
    || left.toPackage.localeCompare(right.toPackage)
    || left.to.localeCompare(right.to));

  return Object.freeze({
    kind: "metroplat.operations-manifold.graph" as const,
    packages: Object.freeze(manifolds.map(graphNodeOf).sort((left, right) => left.package.localeCompare(right.package))),
    edges: Object.freeze(edges),
    frontier: Object.freeze({
      incoming: graphFrontierOf(manifolds, "domains", codomainSchemas),
      outgoing: graphFrontierOf(manifolds, "codomains", domainSchemas),
    }),
    utterances: graphUtterances(manifolds, edges),
  });
}

/**
 * Stable MCP resource URI for a package's operations manifold.
 *
 * `projectSurface` publishes this beside the discovery resource so MCP clients can
 * read not only what tools/resources/prompts exist, but how the operation family is
 * wired through schema extrema.
 */
export function operationsManifoldUri(packageName: string): string {
  return `metroplat://${encodeURIComponent(packageName)}/operations-manifold`;
}

/**
 * Publish the package operations manifold as an MCP resource.
 *
 * The resource body is computed at read time from the live discovery object,
 * so it follows the same apex as `tools/list`, `resources/list`, and
 * `prompts/list` without maintaining a second registry.
 */
export function operationsManifoldResource(
  packageName: string,
  discovery: () => ProgramDiscovery,
): ResourceRegistration {
  return resource({
    uri: operationsManifoldUri(packageName),
    name: `${packageName} operations manifold`,
    description: "The package's runtime operations manifold: apex, schema extrema, Hoare local edges, rejected local candidates, and cross-package schema candidates.",
    read: () => `${JSON.stringify(operationsManifoldOf(discovery()), null, 2)}\n`,
  });
}
