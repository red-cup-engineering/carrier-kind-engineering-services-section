/**
 * presentation/mounting — the schema-node mounting layer: a four-faced apex at every
 * schema `$id`-node of a served subtree.
 *
 * A package apex is mounted at the schema node its operations act on. Domain
 * schema `$id`s win; source operations with no domain mount at their codomain
 * schema when they produce one; untyped boundary operations mount at a behavior
 * path under their module family. Every schema node then gets the package faces —
 * optional site-owned `GET /` / `POST /`, `GET /:verb`, `POST /:verb`,
 * `GET /openapi.json`, `POST /mcp`,
 * `GET /health`, `GET /discovery` — because routing delegates to `routeRequest`
 * at the node's base path with no per-node hand-wiring.
 *
 * The live HTTP binding lives in `services/http/server`; this module is the pure
 * schema-node routing projection.
 */
import { projectSurface } from "./surface.mjs";
import { fromSection, ref } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";

import {
  schemaNodeId,
  schemaNodePath,
  schemaSiteNodes,
} from "@red-cup-engineering/metrologic/settling/schema/site";
import {
  consumedIds,
  admitServedRequestArrival,
  html,
  json,
  producedIds,
  routeRequest,

} from "@red-cup-engineering/metroplat/presentation/serving";
import {
  operationsManifoldGraphOf,
  operationsManifoldOf,

} from "@red-cup-engineering/computer-system-engine/rpc/manifold";
import { resource } from "@red-cup-engineering/computer-system-engine/rpc/resource";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { moduleMounts, schemaNamespaceResource, schemaNamespaceUri } from "./operation-mounting.mjs";
export { moduleMounts, schemaNamespaceResource, schemaNamespaceUri } from "./operation-mounting.mjs";

/** A schema-node mount: a guest apex plus the schema `$id` its domain acts on. */

/** One node of the namespace tree: a schema `$id`-path and the mounts at it. */

/** Serializable read of one mounted apex inside the schema namespace. */

/** Serializable read of one schema namespace node. */

/** Package-level schema namespace: mounted apices, schema nodes, and the cross-package operations graph. */

/** Local context resource carried by a materialized schema node's own endpoint. */

/** A local Hoare edge at one schema node, paired with the mounted apex that generated it. */

/** First-class generated endpoint readout for one schema path:
 *  GER = (LC, p, y(p), R, omega). */

/** The mount's domain schema `$id` — the node it mounts at. Deterministic
 *  (first by schema address) when several domain schemas are referenced. Undefined for a
 *  pure source (no domain `$ref`). */
export function domainNodeOf(induced) {
  return [...consumedIds(induced)].sort()[0];
}

/**
 * The explicit schema-node address for a source apex whose material enters
 * from a wire boundary instead of a declared domain schema. A typed source
 * still has a produced schema, so it mounts at that codomain; only a source
 * with no schema extrema falls back to its wire presentation.
 */
export function boundaryNodeOf(induced) {
  const produced = [...producedIds(induced)].sort()[0];
  if (produced !== undefined) return produced;
  const formats = new Set(induced.operations.map((act) => act.inputFormat));
  return `wire/${[...formats].sort()[0] ?? "void"}`;
}

/** The schema-node address a mount occupies. */
export function mountNodeOf(mount) {
  return schemaNodeId(mount.nodeId ?? domainNodeOf(mount.induced) ?? boundaryNodeOf(mount.induced));
}

/** True iff the mount both consumes and produces `nodeId` — the self-loop case
 *  (communicating is endomorphic on the meme schema: meme in, meme out). */
export function isEndoMount(induced, nodeId) {
  return consumedIds(induced).has(nodeId) && producedIds(induced).has(nodeId);
}

function behaviorNodePrefix(module) {
  const leaf = module.split("/").filter((part) => part.length > 0).at(-1) ?? "action";
  return leaf.replace(/^@/, "") || "action";
}

function behaviorNodeOf(module, act) {
  return `${module === undefined ? "action" : behaviorNodePrefix(module)}/${act.verb}`;
}

/** The schema node one action acts on: its domain schema `$id`, its produced
 *  codomain schema for typed source operations, or its behavior address when no
 *  schema extrema exist. */
export function operationNodeOf(act) {
  return schemaNodeId(act.domain?.id ?? act.codomain?.id ?? behaviorNodeOf(undefined, act));
}

function moduleOperationNodeOf(module, act) {
  return schemaNodeId(act.domain?.id ?? act.codomain?.id ?? behaviorNodeOf(module, act));
}

function operationsByNode(
  operations,
  nodeOf = operationNodeOf,
) {
  const byNode = new Map();
  for (const act of operations) {
    const id = nodeOf(act);
    const bucket = byNode.get(id);
    if (bucket === undefined) byNode.set(id, [act]);
    else bucket.push(act);
  }
  return byNode;
}

/**
 * Derive the schema-node mesh of an operation family: one mount per schema node,
 * each an induced four-faced apex of exactly the operations acting at that node.
 * No hand-grouping enters — the operations' own domain schemas generate the mesh,
 * so a flat action list and the mounted namespace stay the same information.
 */
export function schemaMountsOf(operations) {
  return Object.freeze([...operationsByNode(operations).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeId, at]) => Object.freeze({
      name: nodeId,
      induced: projectSurface([...at], { packageName: nodeId }),
      nodeId,
    })));
}

/**
 * Mount one MODULE's operation family into the mesh, keeping the module's identity.
 *
 * The module is the unit of authorship (its own apex, discovery, journal admission under
 * `module`); the schema node is the unit of placement. A module whose operations
 * act at several schema nodes contributes one mount per node — its morphisms
 * appear at the nodes they act on, all carrying the module as their package.
 */
/** The schema `$id`s a mount's operations reference on either slot. */
function referencedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) {
    if (act.domain !== undefined) ids.add(act.domain.id);
    if (act.codomain !== undefined) ids.add(act.codomain.id);
  }
  return [...ids];
}

/** Build the namespace tree from schema `$id`s. The node-id universe is every
 *  domain/codomain `$id` any mount references, so every schema the mounted
 *  operations touch gets a node. Mounts are bucketed by their `nodeId`; a
 *  referenced node with no mounts is still materialized (an empty, navigable
 *  schema node) so the tree is whole.
 *  Returned sorted by path length descending — longest-base-first for routing. */
export function schemaNodeTree(
  mounts,
) {
  const universe = new Set();
  for (const m of mounts) for (const id of referencedIds(m.induced)) universe.add(id);
  for (const m of mounts) universe.add(mountNodeOf(m));

  const byNode = new Map();
  for (const m of mounts) {
    const id = mountNodeOf(m);
    universe.add(id);
    const bucket = byNode.get(id);
    if (bucket === undefined) byNode.set(id, [m]);
    else bucket.push(m);
  }

  const nodes = [];
  for (const node of schemaSiteNodes(universe)) {
    const at = byNode.get(node.id) ?? [];
    nodes.push({
      id: node.id,
      path: node.path,
      ...(node.parent === undefined ? {} : { parent: node.parent }),
      children: node.children,
      mounts: at,
      endo: at.some((m) => isEndoMount(m.induced, node.id)),
    });
  }
  nodes.sort((a, b) => b.path.length - a.path.length);
  return nodes;
}

/** The base path of each mount, keyed by name. */
export function mountSchemaNodes(
  mounts,
) {
  const nodes = new Set(schemaNodeTree(mounts).map((n) => n.id));
  const paths = new Map();
  for (const m of mounts) {
    const id = mountNodeOf(m);
    if (nodes.has(id)) paths.set(m.name, schemaNodePath(id));
  }
  return paths;
}

function sortedUnique(values) {
  return Object.freeze([...new Set(values)].sort());
}

function countItems(items) {
  return items.reduce((total, item) => total + item.length, 0);
}

function localHoareEdgesForNode(
  report,
  nodeId,
  kind,
) {
  const rows = report.mounts.flatMap((mount) => {
    const edges = kind === "accepted"
      ? mount.operationsManifold.extrema.edges
      : mount.operationsManifold.extrema.rejectedEdges;
    return edges
      .filter((edge) => edge.schema === nodeId)
      .map((edge) => Object.freeze({
        mount: mount.name,
        package: mount.package,
        edge,
      }));
  });
  return Object.freeze(rows);
}

function schemaRefOf(schema) {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? schemaNodeId(ref) : undefined;
}

function schemaNodeEndpointReadoutUri(nodeId) {
  return `metroplat://schema-node/${encodeURIComponent(nodeId)}/endpoint-readout`;
}

function schemaNodeGeneratedEndpointReadout(
  report,
  node,
  mounts,
  basePath,
) {
  const context = schemaNodeContextReport(report, node);
  const mountedPrograms = mounts.flatMap((mount) =>
    mount.induced.discovery.programs.map((program) => Object.freeze({ mount, program })),
  );
  const programs = sortedUnique(mountedPrograms.map(({ program }) => program.name));
  const resources = sortedUnique(mounts.flatMap((mount) => mount.induced.discovery.resources.map((res) => res.uri)));
  const prompts = sortedUnique(mounts.flatMap((mount) => mount.induced.discovery.prompts.map((prompt) => prompt.name)));
  const domains = sortedUnique(mountedPrograms.flatMap(({ program }) => {
    const ref = schemaRefOf(program.domainSchema);
    return ref === undefined ? [] : [ref];
  }));
  const codomains = sortedUnique(mountedPrograms.flatMap(({ program }) => {
    const ref = schemaRefOf(program.codomainSchema);
    return ref === undefined ? [] : [ref];
  }));
  const evidencePolicies = sortedUnique(mountedPrograms.flatMap(({ program }) => program.contract.evidence.map((evidence) => evidence.source)));
  const phases = sortedUnique(mountedPrograms.map(({ program }) => program.contract.contract.settlement.regime));
  const mountedNames = sortedUnique(mounts.map((mount) => mount.name));
  const endpointReadout = schemaNodeEndpointReadoutUri(node.id);
  const presentation = Object.freeze({
    html: basePath,
    endpointReadout: `${basePath}/endpoint-readout`,
    discovery: `${basePath}/discovery`,
    openapi: `${basePath}/openapi.json`,
    mcp: `POST ${basePath}/mcp`,
    health: `${basePath}/health`,
    journalFeed: `${basePath}/feed`,
    operationsManifold: `${basePath}/operations-manifold`,
  });
  return Object.freeze({
    kind: "metroplat.generated-endpoint-readout",
    equation: "endpoint(path)=presentation_omega(GER)",
    path: basePath,
    generatedEndpoint: Object.freeze({
      languageCone: Object.freeze({
        apex: Object.freeze({
          node: node.id,
          mounts: mountedNames,
          programs,
          resources,
          prompts,
        }),
        extrema: Object.freeze({
          selected: node.id,
          domains,
          codomains,
          incomingFrontier: Object.freeze(context.frontier.incoming.map((frontier) => frontier.schema)),
          outgoingFrontier: Object.freeze(context.frontier.outgoing.map((frontier) => frontier.schema)),
          children: node.children,
        }),
        generators: Object.freeze(mountedPrograms.map(({ mount, program }) => Object.freeze({
          verb: program.name,
          mount: mount.name,
          package: mount.induced.discovery.package,
          term: program.runTerm === undefined ? "host-boundary" : "sen",
          contract: program.contract.contract.id,
        }))),
        reductions: Object.freeze(mountedPrograms.map(({ program }) => Object.freeze({
          verb: program.name,
          settlement: program.settlement.regime,
          finality: program.settlement.finality,
          transport: program.settlement.transport,
        }))),
        resourceStructure: Object.freeze({
          resources,
          prompts,
        }),
        settlement: Object.freeze({
          evidencePolicies,
          phases,
        }),
      }),
      selectedExtremum: node.id,
      yonedaReadout: Object.freeze({
        formula: "y(p)=Hom(-,p)",
        arrowsInto: context.edges,
        localHoareEdges: context.localHoareEdges,
        rejectedLocalHoareEdges: context.rejectedLocalHoareEdges,
      }),
      readout: context,
      carrier: Object.freeze({
        arrowRecoveredObject: node.id,
        causalSupport: Object.freeze({
          events: Object.freeze([
            ...programs.map((program) => `program:${program}`),
            ...context.edges.map((edge) => `edge:${edge.fromPackage}/${edge.from}->${edge.toPackage}/${edge.to}`),
          ]),
          precedence: Object.freeze(context.localHoareEdges.map((row) => `${row.edge.from}->${row.edge.to}`)),
        }),
        siteSupport: Object.freeze({
          path: node.path,
          children: node.children,
        }),
        valuation: Object.freeze({
          phases,
          evidencePolicies,
        }),
        settlementEvidence: Object.freeze(mountedPrograms.map(({ program }) => `${program.contract.contract.id}:${program.contract.reading}`)),
        artifactAddresses: Object.freeze([schemaNodeContextUri(node.id), endpointReadout, ...resources]),
        boundaryPresentation: Object.freeze(Object.values(presentation)),
      }),
      hoarePrograms: Object.freeze(mountedPrograms.map(({ program }) => {
        const domain = program.contract.contract.precondition.id ?? schemaRefOf(program.domainSchema);
        const codomain = program.contract.contract.postcondition.id ?? schemaRefOf(program.codomainSchema);
        const openCarrierObligations = Object.freeze([
          ...(domain === undefined ? ["domain carrier not recovered from arrow bundle"] : []),
          ...(codomain === undefined ? ["codomain carrier not recovered from arrow bundle"] : []),
        ]);
        return Object.freeze({
          verb: program.name,
          ...(domain === undefined || codomain === undefined ? {} : {
            judgment: `${program.contract.contract.id} : ${domain} -> ${codomain} [${program.contract.reading}]`,
          }),
          ...(domain === undefined ? {} : { domain }),
          ...(codomain === undefined ? {} : { codomain }),
          precondition: program.contract.contract.precondition.id,
          postcondition: program.contract.contract.postcondition.id,
          coordination: program.contract.contract.coordination.mode,
          evidencePolicy: "valued-journal-evidence",
          carrierLaw: Object.freeze(program.contract.contract.laws.map((law) => law.theorem)),
          standing: program.contract.reading,
          openCarrierObligations,
        });
      })),
      presentation,
    }),
    evidence: Object.freeze([
      "formula:GER=(LC,p,y(p),R,omega)",
      "language-cone:apex-extrema-generators-programs-resources-settlement",
      "yoneda:y(p)=Hom(-,p)",
      "carrier:read-from-schema-node-context-and-mounted-program-contracts",
      "carrier-open-obligations:unrecovered-domain-or-codomain-is-frontier-not-substitute",
      "hoare:program-contract-pre-post-lens-evidence",
      `node:${node.id}`,
      `mounts:${mounts.length}`,
      `programs:${programs.length}`,
      `resources:${resources.length}`,
      `prompts:${prompts.length}`,
    ]),
  });
}

function schemaLink(schema, nodes, href) {
  const id = schemaNodeId(schema);
  return { href: href(nodes.get(id)?.path ?? schemaNodePath(id)), label: schema, text: schema };
}

function frontierTile(title, rows, link) {
  return { id: title.toLowerCase(), title, span: 6, table: { columns: ["Schema", "Package", "Operations"], rows: rows.map((row) => [link(row.schema), row.package, row.operations.join(", ")]) } };
}

function localEdgesTile(title, rows, link) {
  return { id: title.toLowerCase().replaceAll(" ", "-"), title, span: 12, table: {
    columns: ["Schema", "From", "To", "Package", "Relation", "Accepted"],
    rows: rows.map(({ edge, package: owner }) => [link(edge.schema), edge.from, edge.to, owner, edge.relation, String(edge.ok)]),
  } };
}

function schemaNodeReadoutHtml(report, node, mounts, basePath) {
  const root = basePath.endsWith(node.path) ? basePath.slice(0, -node.path.length).replace(/\/+$/, "") : "";
  const href = (path) => `${root}${path}`.replace(/\/+/g, "/") || "/";
  const nodes = new Map(report.nodes.map((entry) => [entry.id, entry]));
  const link = (schema) => schemaLink(schema, nodes, href);
  const context = schemaNodeContextReport(report, node);
  const readout = schemaNodeGeneratedEndpointReadout(report, node, mounts, basePath);
  const programs = mounts.flatMap((mount) => mount.induced.discovery.programs.map((program) => ({ mount, program })));
  const source = jsonResource(readout);
  const reading = fromSection({ affirmed: [
    { predicate: "endpoint-readout", object: source, citation: schemaNodeEndpointReadoutUri(node.id) },
    ...[...(node.parent ? [node.parent] : []), ...node.children].map((id) => ({ predicate: "schema-neighbor", object: ref(id), citation: node.id })),
  ] }, { subject: node.id });
  return renderTuftePacket(reading, { source, evidence: readout.evidence, resolveHref: (id) => link(id).href }, {
    title: node.id, subtitle: "Schema node endpoint readout",
    tiles: [
      { id: "interfaces", title: "Interfaces", span: 8, links: [
        ["discovery", "Discovery"], ["endpoint-readout", "Endpoint readout JSON"], ["openapi.json", "OpenAPI"], ["operations-manifold", "Operations manifold"], ["feed", "Journal feed"], ["health", "Health"],
      ].map(([path, label]) => ({ href: `${basePath}/${path}`, label: label })).concat([{ href: href("/schema-namespace"), label: "Namespace" }]) },
      { id: "mcp", title: "MCP", content: `POST ${basePath}/mcp`, span: 4 },
      { id: "parent", title: "Parent", span: 4, ...(node.parent ? { links: [link(node.parent)] } : { content: "root" }) },
      { id: "children", title: "Children", span: 8, links: node.children.map(link) },
      ...(programs.length ? [{ id: "operation-choice", title: "Open operation form", span: 12, form: {
        action: basePath, method: "get",
        fields: [{ name: "operation", label: "Operation", kind: "select", options: programs.map(({ program }) => ({ value: program.name, label: program.name })) }],
        submitters: [{ kind: "submit", label: "Open operation form" }],
      } }] : [{ id: "operation-choice", title: "Operations", content: "No operation is mounted at this node. Discovery, OpenAPI, MCP, health, journal feed, and context remain available.", span: 12 }]),
      { id: "operations", title: "Operations", span: 12, table: { columns: ["Operation", "Mount", "Package", "Contract", "Standing"], rows: programs.map(({ mount, program }) => [
        { href: `${basePath}/${encodeURIComponent(program.name)}`, text: program.name }, mount.name, mount.induced.discovery.package, program.contract.contract.id, program.contract.reading,
      ]) } },
      frontierTile("Incoming", context.frontier.incoming, link), frontierTile("Outgoing", context.frontier.outgoing, link),
      { id: "cross-package-edges", title: "Cross-package edges", span: 12, table: { columns: ["Schema", "From package", "From", "To package", "To"], rows: context.edges.map((edge) => [link(edge.schema), edge.fromPackage, edge.from, edge.toPackage, edge.to]) } },
      localEdgesTile("Local Hoare edges", context.localHoareEdges, link), localEdgesTile("Rejected local Hoare edges", context.rejectedLocalHoareEdges, link),
      { id: "mounts", title: "Mounted apices", span: 12, data: report.mounts.filter((mount) => node.mounts.includes(mount.name)) },
      { id: "endpoint-readout", title: "Endpoint readout", span: 12, data: readout },
    ],
  }).html;
}

/**
 * Render schema nodes, mounted operation packages, and graph frontier as one packet.
 * @param report - Current namespace report.
 * @param basePath - Local namespace mount path.
 * @returns A TUFTE-rendered SHP document preserving graph and mount evidence.
 */
export function schemaNamespaceIndexHtml(report, basePath = "", instanceTitle) {
  const base = basePath.replace(/\/+$/, "");
  const href = (path) => `${base}${path}`.replace(/\/+/g, "/") || "/";
  const nodes = new Map(report.nodes.map((node) => [node.id, node]));
  const link = (schema) => schemaLink(schema, nodes, href);
  const source = jsonResource(report);
  const reading = fromSection({ affirmed: [
    ...report.nodes.map((node) => ({ predicate: "schema-node", object: ref(node.id), citation: schemaNamespaceUri() })),
    { predicate: "graph", object: jsonResource(report.graph), citation: schemaNamespaceUri() },
  ] }, { subject: "schema-namespace" });
  return renderTuftePacket(reading, { source, evidence: report.evidence, resolveHref: (id) => link(id).href }, {
    title: instanceTitle ?? "Schema namespace", subtitle: "Schema nodes and mounted operation surfaces",
    tiles: [
      { id: "interfaces", title: "Interfaces", span: 12, links: [
        ["/schema-namespace", "Schema namespace JSON"], ["/discovery", "Root discovery"], ["/openapi.json", "Root OpenAPI"], ["/health", "Health"],
      ].map(([path, label]) => ({ href: href(path), label: label })) },
      { id: "summary", title: "Read cone", span: 12, table: { columns: ["Nodes", "Mounts", "Packages", "Programs", "Resources", "Prompts"], rows: [[
        String(report.nodes.length), String(report.mounts.length), String(sortedUnique(report.mounts.map((mount) => mount.package)).length),
        String(countItems(report.mounts.map((mount) => mount.operations))), String(sortedUnique(report.mounts.flatMap((mount) => mount.resources)).length), String(sortedUnique(report.mounts.flatMap((mount) => mount.prompts)).length),
      ]] } },
      { id: "nodes", title: "Schema nodes", span: 12, table: { columns: ["Node", "Mounts", "Children", "Self-loop"], rows: [...report.nodes].sort((a, b) => a.path.localeCompare(b.path)).map((node) => [link(node.id), node.mounts.join(", "), node.children.join(", "), String(node.endo)]) } },
      { id: "mounts", title: "Mounted apices", span: 12, table: { columns: ["Mount", "Package", "Operations", "Boundary", "Operations manifold"], rows: report.mounts.map((mount) => [
        { href: href(mount.path), text: mount.name }, mount.package, mount.operations.join(", "), JSON.stringify(mount.boundary), { href: href(`${mount.path}/operations-manifold`), text: "Operations manifold" },
      ]) } },
      frontierTile("Incoming", report.graph.frontier.incoming, link), frontierTile("Outgoing", report.graph.frontier.outgoing, link),
      { id: "graph", title: "Composition graph", span: 12, data: report.graph },
      { id: "mount-details", title: "Mount details", span: 12, data: report.mounts },
    ],
  }).html;
}

/** One four-faced apex over several guests co-mounted at one route point: the coproduct
 *  of their operations through the existing `projectSurface`. The node-level `GET /`,
 *  `GET /openapi.json`, and `POST /mcp` are projected from this pooled apex; each
 *  individual operation dispatches through the OWNING mount so journal admission lands
 *  in the right per-package ledger. */
export function aggregateNodeApex(
  mounts,
  nodeId,
  resources = [],
) {
  const operations = mounts.flatMap((m) => [...m.induced.operations]);
  return projectSurface(operations, {
    packageName: nodeId,
    resources,
    deriveLspResources: false,
  });
}

function schemaNodeContextUri(nodeId) {
  return `metroplat://schema-node/${encodeURIComponent(nodeId)}`;
}

function schemaNodeContextReport(
  report,
  node,
) {
  const edges = report.graph.edges.filter((edge) => edge.schema === node.id);
  const localHoareEdges = localHoareEdgesForNode(report, node.id, "accepted");
  const rejectedLocalHoareEdges = localHoareEdgesForNode(report, node.id, "rejected");
  const incoming = report.graph.frontier.incoming.filter((frontier) => frontier.schema === node.id);
  const outgoing = report.graph.frontier.outgoing.filter((frontier) => frontier.schema === node.id);
  return Object.freeze({
    kind: "metroplat.schema-node-context",
    node,
    frontier: Object.freeze({
      incoming: Object.freeze(incoming),
      outgoing: Object.freeze(outgoing),
    }),
    edges: Object.freeze(edges),
    localHoareEdges,
    rejectedLocalHoareEdges,
    evidence: Object.freeze([
      `node:${node.id}`,
      `mounts:${node.mounts.length}`,
      `children:${node.children.length}`,
      `edges:${edges.length}`,
      `local-hoare:${localHoareEdges.length}`,
      `rejected-local-hoare:${rejectedLocalHoareEdges.length}`,
      `incoming:${incoming.length}`,
      `outgoing:${outgoing.length}`,
    ]),
  });
}

function schemaNodeContextResource(
  report,
  node,
) {
  return resource({
    uri: schemaNodeContextUri(node.id),
    name: `${node.id} schema node context`,
    description: "The local namespace read of one schema node: its mounts, children, graph edges, and frontier role.",
    read: () => `${JSON.stringify(schemaNodeContextReport(report, node), null, 2)}\n`,
  });
}

function schemaNodeEndpointReadoutResource(
  report,
  node,
  mounts,
) {
  return resource({
    uri: schemaNodeEndpointReadoutUri(node.id),
    name: `${node.id} generated endpoint readout`,
    description: "The generated endpoint tuple GER=(LC,p,y(p),R,omega) for one schema-node path.",
    read: () => `${JSON.stringify(schemaNodeGeneratedEndpointReadout(report, node, mounts, node.path), null, 2)}\n`,
  });
}

function schemaNodeApex(
  report,
  node,
  mounts,
) {
  return aggregateNodeApex(mounts, node.id, [
    schemaNodeContextResource(report, node),
    schemaNodeEndpointReadoutResource(report, node, mounts),
  ]);
}

function emptySchemaNodeApex(report, node) {
  return projectSurface([], {
    packageName: node.id,
    resources: [
      schemaNodeContextResource(report, node),
      schemaNodeEndpointReadoutResource(report, node, []),
    ],
    deriveSchemaResources: false,
    deriveEndpointProjectionResources: false,
    deriveLspResources: false,
    derivePrompts: false,
  });
}

/**
 * Route options for a schema namespace. `rootRoute` and `routeOwner` here
 * are root-node options: they own the namespace root only and are not
 * inherited by mounted schema nodes (a mount opts in through its own
 * `options`).
 */

function nodeScopedOptions(options) {
  const { rootPackage: _rootPackage, rootApex: _rootApex, rootRoute: _rootRoute, routeOwner: _routeOwner, ...shared } = options;
  return shared;
}

function mountServeOptions(options, mount, basePath) {
  return { ...options, ...(mount.options ?? {}), basePath };
}

function nodeServeOptions(options, basePath) {
  return { ...options, basePath };
}

function acceptsHtml(request) {
  return (request.accept ?? "").split(",").some((part) => part.trim().toLowerCase().startsWith("text/html"));
}

function isNodeFace(verb) {
  return verb === "" ||
    verb === "mcp" ||
    verb === "openapi.json" ||
    verb === "health" ||
    verb === "discovery" ||
    verb === "feed" ||
    verb === "operations-manifold";
}

function admitNamespaceRead(request, options, path) {
  const arrival = admitServedRequestArrival(request, options, path);
  return arrival !== undefined && "status" in arrival ? arrival : undefined;
}

/** Read the whole mounted namespace as a schema-namespace report. */
export function schemaNamespaceReport(
  mounts,
) {
  const nodes = schemaNodeTree(mounts);
  const paths = mountSchemaNodes(mounts);
  const manifolds = Object.freeze(mounts.map((mount) => operationsManifoldOf(mount.induced.discovery)));
  const graph = operationsManifoldGraphOf(manifolds);
  const nodeReports = Object.freeze(nodes.map((node) => Object.freeze({
    id: node.id,
    path: node.path,
    ...(node.parent === undefined ? {} : { parent: node.parent }),
    children: Object.freeze([...node.children]),
    mounts: Object.freeze(node.mounts.map((mount) => mount.name).sort()),
    endo: node.endo,
  })));
  const mountReports = Object.freeze([...mounts].map((mount, index) => {
    const nodeId = mountNodeOf(mount);
    const operationsManifold = manifolds[index] ?? operationsManifoldOf(mount.induced.discovery);
    return Object.freeze({
      name: mount.name,
      package: mount.induced.discovery.package,
      nodeId,
      path: paths.get(mount.name) ?? schemaNodePath(nodeId),
      endo: isEndoMount(mount.induced, nodeId),
      operations: Object.freeze(mount.induced.discovery.programs.map((program) => program.name).sort()),
      resources: Object.freeze(mount.induced.discovery.resources.map((res) => res.uri).sort()),
      prompts: Object.freeze(mount.induced.discovery.prompts.map((prompt) => prompt.name).sort()),
      operationsManifold,
      boundary: Object.freeze({
        rootRouteConfigured: mount.options?.rootRoute !== undefined,
        journalFeedConfigured: mount.options?.journalFeed !== undefined,
        arrivalAdmissionConfigured: mount.options?.onArrival !== undefined,
        callerConfigured: mount.options?.caller !== undefined,
      }),
    });
  }).sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name)));
  return Object.freeze({
    kind: "metroplat.schema-namespace",
    nodes: nodeReports,
    mounts: mountReports,
    graph,
    evidence: Object.freeze([
      `mounts:${mounts.length}`,
      `nodes:${nodes.length}`,
      `packages:${new Set(manifolds.map((manifold) => manifold.package)).size}`,
      `graph-edges:${graph.edges.length}`,
    ]),
  });
}

/** A resolved manifold route: either a finished response or an apex to route through. */

/**
 * One route law shared by the sync and async manifold routers.
 *
 * Longest schema-node base match wins, so `/a/b/verb` routes to the node at
 * `/a/b`, not the one at `/a`. Co-mounted guests at one node are disambiguated
 * by verb (each POST dispatches through the OWNING mount so journal admission lands in
 * the right per-package ledger); node-level `GET /`, OpenAPI, and MCP go through
 * the pooled node apex. A schema node with no mounted operations still gets an
 * empty apex, because the namespace site supplies the same four faces at every
 * materialized node. A path under no schema node belongs to the ROOT node,
 * whose surface carries namespace resources but no executable coproduct. A
 * configured `rootRoute`/`routeOwner` owns the non-HTML settlement root
 * there and only there.
 */
function resolveSchemaRoute(
  mounts,
  request,
  options,
) {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;

  const routeOwnerOwnsRoot = options.rootRoute !== undefined || options.routeOwner !== undefined;
  if (request.method === "GET" && (path === "" || path === "/") && (!routeOwnerOwnsRoot || acceptsHtml(request))) {
    const admitted = admitNamespaceRead(request, options, path);
    if (admitted !== undefined) return admitted;
    return html(schemaNamespaceIndexHtml(schemaNamespaceReport(mounts), root, options.title));
  }
  // The namespace's own report face: the mounted namespace as serializable data.
  if (request.method === "GET" && path === "/schema-namespace") {
    const admitted = admitNamespaceRead(request, options, path);
    if (admitted !== undefined) return admitted;
    return json(schemaNamespaceReport(mounts));
  }

  const report = schemaNamespaceReport(mounts);
  const nodes = report.nodes;
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const paths = mountSchemaNodes(mounts);
  // Group mounts by their resolved base so a node with several guests is one apex.
  // Every materialized schema node is present even when the group is empty: the
  // sheaf law is four faces at every node, not only at nodes with runnable verbs.
  const byBase = new Map();
  for (const node of nodes) byBase.set(node.path, []);
  for (const m of mounts) {
    const base = paths.get(m.name);
    if (base === undefined) continue;
    const bucket = byBase.get(base);
    if (bucket === undefined) byBase.set(base, [m]);
    else bucket.push(m);
  }

  const shared = nodeScopedOptions(options);
  const ranked = [...byBase.entries()].sort((x, y) => y[0].length - x[0].length);
  for (const [base, at] of ranked) {
    if (path !== base && !path.startsWith(`${base}/`)) continue;
    const basePath = `${root}${base}`;
    const node = nodeByPath.get(base);
    const tail = path === base ? "" : path.slice(base.length + 1);
    const verb = decodeURIComponent(tail);
    const selectedOperation = request.query["operation"];
    if (node !== undefined && verb === "" && request.method === "GET" && selectedOperation !== undefined && selectedOperation.length > 0) {
      const owner = at.find((m) => m.induced.discovery.programs.some((bin) => bin.name === selectedOperation));
      if (owner !== undefined) {
        return {
          status: 303,
          type: "text/plain; charset=utf-8",
          headers: { location: `${basePath}/${encodeURIComponent(selectedOperation)}` },
          body: "",
        };
      }
    }
    if (node !== undefined && verb === "" && request.method === "GET" && (!routeOwnerOwnsRoot || acceptsHtml(request))) {
      const admitted = admitNamespaceRead(request, shared, path);
      if (admitted !== undefined) return admitted;
      return html(schemaNodeReadoutHtml(report, node, at, basePath));
    }
    if (node !== undefined && verb === "endpoint-readout" && request.method === "GET") {
      const admitted = admitNamespaceRead(request, shared, path);
      if (admitted !== undefined) return admitted;
      return json(schemaNodeGeneratedEndpointReadout(report, node, at, basePath));
    }
    if (at.length === 0 && node !== undefined) return { induced: emptySchemaNodeApex(report, node), options: nodeServeOptions(shared, basePath) };
    if (node !== undefined && isNodeFace(verb)) {
      return { induced: schemaNodeApex(report, node, at), options: nodeServeOptions(shared, basePath) };
    }
    const owner = at.find((m) => m.induced.discovery.programs.some((bin) => bin.name === verb));
    if (owner !== undefined) {
      return { induced: owner.induced, options: mountServeOptions(shared, owner, basePath) };
    }
    return { induced: aggregateNodeApex(at, base.replace(/^\//, "")), options: nodeServeOptions(shared, basePath) };
  }

  const { rootPackage: _rootPackage, ...rootOptions } = options;
  const rootApex = options.rootApex ?? projectSurface([], {
    packageName: options.rootPackage ?? "schema-namespace",
    // The mesh itself travels with the root node's faces.
    resources: [schemaNamespaceResource(() => mounts)],
  });
  return { induced: rootApex, options: { ...rootOptions, basePath: root } };
}

/** Route one request against a schema namespace through the asynchronous RPC path. */
export async function routeSchemaNamespace(
  mounts,
  request,
  options,
) {
  const resolved = resolveSchemaRoute(mounts, request, options);
  return "induced" in resolved ? routeRequest(resolved.induced, request, resolved.options) : resolved;
}
