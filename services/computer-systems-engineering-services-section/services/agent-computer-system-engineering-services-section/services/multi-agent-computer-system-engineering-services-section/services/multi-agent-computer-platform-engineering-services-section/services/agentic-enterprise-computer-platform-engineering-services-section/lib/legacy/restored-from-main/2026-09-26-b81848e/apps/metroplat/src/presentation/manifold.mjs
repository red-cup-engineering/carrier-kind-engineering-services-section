/**
 * presentation/manifold — the operations manifold projected from an induced package.
 *
 * The manifold itself — apex, schema extrema, local Hoare edges (with rejected
 * candidates and per-edge composition reports) and the cross-package graph — is
 * relating's (`@red-cup-engineering/relating/running`): one action apex, its
 * carrier-slot extrema, and the producer/consumer edges admitted by equal
 * `$ref`s plus measured contract standing at each endpoint. This module is
 * only the boundary: MetroPlat's discovery shape (`programs`, `extremum.schema`,
 * `produced.operations`) is mapped onto relating's (`bins`, `extremum.carrier`,
 * `produced.actions`) going in, and the result is mapped back going out, so
 * every other MetroPlat reader keeps its own vocabulary.
 */

import { operationsManifoldGraphOf as engineOperationsManifoldGraphOf, operationsManifoldOf as engineOperationsManifoldOf } from "@red-cup-engineering/computer-system-engine/rpc/manifold";
import { resource } from "@red-cup-engineering/computer-system-engine/rpc/resource";

/** MetroPlat's discovery, read as relating's: `programs` stand in for `bins`. */
function engineDiscoveryOf(discovery) {
  return { ...discovery, bins: discovery.programs };
}

/** relating's `{carrier, actions}` extremum, read as MetroPlat's `{schema, operations}`. */
function extremumOf(extremum) {
  return Object.freeze({ schema: extremum.carrier, operations: extremum.actions });
}

/** relating's `carrier`-keyed edge, read as MetroPlat's `schema`-keyed edge. */
function edgeOf(edge) {
  const { carrier, ...rest } = edge;
  return Object.freeze({ ...rest, schema: carrier });
}

/** Project a program discovery object into its package operations manifold. */
export function operationsManifoldOf(discovery) {
  const engine = engineOperationsManifoldOf(engineDiscoveryOf(discovery));
  return Object.freeze({
    kind: "metroplat.operations-manifold",
    package: engine.package,
    protocol: engine.protocol,
    apex: Object.freeze({
      kind: engine.apex.kind,
      package: engine.apex.package,
      protocol: engine.apex.protocol,
      programs: engine.apex.bins,
      resources: engine.apex.resources,
      prompts: engine.apex.prompts,
    }),
    extrema: Object.freeze({
      domains: Object.freeze(engine.extrema.domains.map(extremumOf)),
      codomains: Object.freeze(engine.extrema.codomains.map(extremumOf)),
      incoming: Object.freeze(engine.extrema.incoming.map(extremumOf)),
      outgoing: Object.freeze(engine.extrema.outgoing.map(extremumOf)),
      edges: Object.freeze(engine.extrema.edges.map(edgeOf)),
      rejectedEdges: Object.freeze(engine.extrema.rejectedEdges.map(edgeOf)),
    }),
    utterances: engine.utterances,
  });
}

/** MetroPlat's `{schema, operations}` manifold, read back as relating's `{carrier, actions}`
 *  shape — just enough of it (`package`, `protocol`, `apex.bins`, extrema domains/codomains)
 *  for `operationsManifoldGraphOf` to relate packages by carrier identity. */
function engineManifoldOf(manifold) {
  const reverseExtremumOf = (extremum) => Object.freeze({ carrier: extremum.schema, actions: extremum.operations });
  return Object.freeze({
    package: manifold.package,
    protocol: manifold.protocol,
    apex: Object.freeze({ bins: manifold.apex.programs }),
    extrema: Object.freeze({
      domains: Object.freeze(manifold.extrema.domains.map(reverseExtremumOf)),
      codomains: Object.freeze(manifold.extrema.codomains.map(reverseExtremumOf)),
    }),
  });
}

function graphNodeOf(node) {
  const { bins, ...rest } = node;
  return Object.freeze({ ...rest, programs: bins });
}

function graphFrontierOf(entry) {
  const { carrier, actions, ...rest } = entry;
  return Object.freeze({ ...rest, schema: carrier, operations: actions });
}

/**
 * Relate several package manifolds by schema `$id` equality.
 *
 * This is the package-mesh read behind the "operations manifold" product: no
 * package imports another here, and no route table is inspected. The only edge
 * law is the schema-boundary half of action composition: a produced schema
 * identity equals a consumed schema identity.
 */
export function operationsManifoldGraphOf(manifolds) {
  const graph = engineOperationsManifoldGraphOf(manifolds.map(engineManifoldOf));
  return Object.freeze({
    kind: "metroplat.operations-manifold.graph",
    packages: Object.freeze(graph.packages.map(graphNodeOf)),
    edges: Object.freeze(graph.edges.map(edgeOf)),
    frontier: Object.freeze({
      incoming: Object.freeze(graph.frontier.incoming.map(graphFrontierOf)),
      outgoing: Object.freeze(graph.frontier.outgoing.map(graphFrontierOf)),
    }),
    utterances: graph.utterances,
  });
}

/**
 * Stable MCP resource URI for a package's operations manifold.
 *
 * `projectSurface` publishes this beside the discovery resource so MCP clients can
 * read not only what tools/resources/prompts exist, but how the operation family is
 * wired through schema extrema.
 */
export function operationsManifoldUri(packageName) {
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
  packageName,
  discovery,
) {
  return resource({
    uri: operationsManifoldUri(packageName),
    name: `${packageName} operations manifold`,
    description: "The package's runtime operations manifold: apex, schema extrema, Hoare local edges, rejected local candidates, and cross-package schema candidates.",
    read: () => `${JSON.stringify(operationsManifoldOf(discovery()), null, 2)}\n`,
  });
}
