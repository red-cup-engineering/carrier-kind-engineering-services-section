/**
 * acting/manifold — the operations manifold projected from an induced package.
 *
 * An operations manifold is not owned by an operations site. It is the runtime
 * shape every induced package already has: one action apex, its schema-slot
 * extrema, and the producer/consumer edges implied by equal `$ref`s.
 */


import { fact } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { resource, } from "./resource.mjs";

/** A schema slot where package actions meet the outside category. */

/** A local edge whose producer codomain is another action's domain. */

/**
 * The apex summary whose projections define this package's operation surface.
 *
 * This is the compact, serializable read of an induced action family: which
 * package was induced, which verbs it exposes, and which resource/prompt legs
 * travel with it. It intentionally stores names and URIs rather than executable
 * closures, so the manifold can be logged, served as an MCP resource, or folded
 * into a cross-package graph.
 */

/**
 * Package-level operations manifold induced from one action discovery.
 *
 * The manifold is the action apex read as schema incidence data. Domain
 * extrema are the schema `$id`s this package consumes; codomain extrema are the
 * schema `$id`s it produces; local edges are the places where a produced
 * schema is also consumed by another action in the same apex. Incoming and
 * outgoing frontiers are therefore not guessed dependency metadata: they are
 * derived from missing local producers or consumers.
 */

/** One package node in a cross-package operations-manifold graph. */

/** A cross-package composition candidate by shared schema identity. */

/** A schema frontier where the graph has only one visible side. */

/**
 * Cross-package operations graph derived from package manifolds.
 *
 * The graph relates package apices by schema identity alone: if one package
 * produces a schema that another package consumes, the edge exists. Incoming
 * and outgoing frontiers remain visible so agent tooling can see where the
 * current package mesh has an unserved input or an unconsumed output.
 */

function endpointsBySlot(
  endpoints,
  side,
) {
  const bySchema = new Map();
  for (const endpoint of endpoints) {
    const schema = slotRef(side === "domain" ? endpoint.domainSchema : endpoint.codomainSchema);
    if (schema === undefined) continue;
    const verbs = bySchema.get(schema);
    if (verbs === undefined) bySchema.set(schema, [endpoint.name]);
    else verbs.push(endpoint.name);
  }
  return new Map([...bySchema.entries()].map(([schema, verbs]) => [schema, Object.freeze([...verbs].sort())]));
}

function extremaFrom(bySchema) {
  return Object.freeze([...bySchema.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schema, verbs]) => Object.freeze({ schema, operations: verbs })));
}

function filterExtrema(
  extrema,
  absentFrom,
) {
  return Object.freeze(extrema.filter((extremum) => !absentFrom.has(extremum.schema)));
}

/**
 * Local edges between endpoints of one apex, where a produced schema is also
 * consumed. When both the producer and the consumer carry their own `contract`
 * standing (a MetroPlat-shaped endpoint, not every action does), the edge also
 * carries the Hoare post/pre `contractComposition` the two contracts report,
 * under `relation: "schema-contract-composition"`; an edge whose endpoints
 * carry no contract standing is the plain `"codomain-domain"` edge. Rejected
 * candidates are reported alongside accepted ones rather than silently
 * dropped, though no endpoint shape known here fails a candidate outright.
 */
function edgesFrom(
  endpoints,
  domains,
  codomains,
) {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint]));
  const accepted = [];
  const rejected = [];
  for (const [schema, froms] of codomains) {
    const tos = domains.get(schema);
    if (tos === undefined) continue;
    for (const from of froms) {
      for (const to of tos) {
        const producer = byName.get(from);
        const consumer = byName.get(to);
        const base = { from, to, schema, relation: "codomain-domain" };
        const edge = producer?.contract === undefined || consumer?.contract === undefined
          ? Object.freeze(base)
          : Object.freeze({
            ...base,
            relation: "schema-contract-composition",
            contractComposition: Object.freeze({
              producer: producer.contract.contract.id,
              producerReading: producer.contract.reading,
              consumer: consumer.contract.contract.id,
              consumerReading: consumer.contract.reading,
            }),
            ok: true,
          });
        accepted.push(edge);
      }
    }
  }
  const sortEdges = (edges) => Object.freeze(edges.sort((left, right) =>
    left.schema.localeCompare(right.schema)
    || left.from.localeCompare(right.from)
    || left.to.localeCompare(right.to)));
  return Object.freeze({ edges: sortEdges(accepted), rejectedEdges: sortEdges(rejected) });
}

function manifoldUtterances(
  discovery,
  domains,
  codomains,
  edges,
) {
  const term = `operations-manifold.${discovery.package}`;
  const utterances = [
    fact(term, "operations-manifold.of-package", discovery.package),
    fact(term, "operations-manifold.has-apex", `${discovery.scheme ?? "operations"}://${encodeURIComponent(discovery.package)}/discovery`),
  ];
  for (const extremum of domains) {
    utterances.push(fact(term, "operations-manifold.has-domain-extremum", extremum.schema));
  }
  for (const extremum of codomains) {
    utterances.push(fact(term, "operations-manifold.has-codomain-extremum", extremum.schema));
  }
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.from}.${edge.to}`;
    utterances.push(fact(edgeTerm, "operations-manifold.composes-through", edge.schema));
    if (edge.contractComposition !== undefined) {
      utterances.push(fact(edgeTerm, "operations-manifold.composition-report", edge.contractComposition));
    }
  }
  return Object.freeze(utterances);
}

/** Project an action discovery schema into its package operations manifold. */
export function operationsManifoldOf(discovery) {
  const domainMap = endpointsBySlot(discovery.programs, "domain");
  const codomainMap = endpointsBySlot(discovery.programs, "codomain");
  const domains = extremaFrom(domainMap);
  const codomains = extremaFrom(codomainMap);
  const { edges, rejectedEdges } = edgesFrom(discovery.programs, domainMap, codomainMap);

  return Object.freeze({
    kind: "operations-manifold",
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

function graphNodeOf(manifold) {
  return Object.freeze({
    package: manifold.package,
    protocol: manifold.protocol,
    programs: manifold.apex.programs,
    domains: Object.freeze(manifold.extrema.domains.map((extremum) => extremum.schema).sort()),
    codomains: Object.freeze(manifold.extrema.codomains.map((extremum) => extremum.schema).sort()),
  });
}

function graphFrontierOf(
  manifolds,
  side,
  absentFrom,
) {
  const frontier = [];
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
  manifolds,
  edges,
) {
  const term = "operations-manifold.graph";
  const utterances = [];
  for (const manifold of manifolds) utterances.push(fact(term, "operations-manifold.graph.has-package", manifold.package));
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.fromPackage}.${edge.from}.${edge.toPackage}.${edge.to}`;
    utterances.push(fact(edgeTerm, "operations-manifold.graph.composes-through", edge.schema));
  }
  return Object.freeze(utterances);
}

/**
 * Relate several package manifolds by schema `$id` equality.
 *
 * This is the package-mesh read behind the "operations manifold" product: no
 * package imports another here, and no route table is inspected. The only edge
 * law is the same one used for action composition inside one apex: a produced
 * schema identity equals a consumed schema identity.
 */
export function operationsManifoldGraphOf(
  manifolds,
) {
  const domainSchemas = new Set();
  const codomainSchemas = new Set();
  for (const manifold of manifolds) {
    for (const extremum of manifold.extrema.domains) domainSchemas.add(extremum.schema);
    for (const extremum of manifold.extrema.codomains) codomainSchemas.add(extremum.schema);
  }

  const edges = [];
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
              relation: "codomain-domain",
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
    kind: "operations-manifold.graph",
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
 * `induceSurface` publishes this beside the discovery resource so MCP clients can
 * read not only what tools/resources/prompts exist, but how the action family is
 * wired through schema extrema.
 */
export function operationsManifoldUri(packageName, scheme = "operations") {
  return `${scheme}://${encodeURIComponent(packageName)}/operations-manifold`;
}

/**
 * Publish the package operations manifold as an MCP resource.
 *
 * The resource body is computed at read time from the live discovery schema,
 * so it follows the same apex as `tools/list`, `resources/list`, and
 * `prompts/list` without maintaining a second registry.
 */
export function operationsManifoldResource(
  packageName,
  discovery,
  scheme = "operations",
) {
  return resource({
    uri: operationsManifoldUri(packageName, scheme),
    name: `${packageName} operations manifold`,
    description: "The package's runtime operations manifold: apex, schema extrema, and codomain-domain edges.",
    read: () => `${JSON.stringify(operationsManifoldOf(discovery()), null, 2)}\n`,
  });
}

export function slotRef(schema) {
  const ref = schema?.["$ref"] ?? schema?.["$id"];
  return typeof ref === "string" ? ref : undefined;
}
