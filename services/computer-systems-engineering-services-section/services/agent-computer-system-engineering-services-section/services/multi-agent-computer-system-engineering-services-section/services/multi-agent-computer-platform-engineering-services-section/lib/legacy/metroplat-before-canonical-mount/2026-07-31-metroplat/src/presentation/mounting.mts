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
import { projectSurface, type ProjectedSurface, type SurfaceAssemblyOptions } from "./surface.mts";
import { escapeHtml } from "@red-cup-engineering/html-structural-projection-service/string-rendering";
import type { Operation } from "../rpc/index.mts";
import {
  schemaNodeId,
  schemaNodePath,
  schemaSiteNodes,
} from "../lib/schema/site.mts";
import {
  consumedIds,
  admitServedRequestArrival,
  html,
  json,
  producedIds,
  routeRequest,
  type ServedRequest,
  type ServedResponse,
  type ServeOptions,
} from "./serving.mts";
import {
  operationsManifoldGraphOf,
  operationsManifoldOf,
  type OperationsManifoldGraph,
  type PackageOperationsManifold,
} from "./manifold.mts";
import { resource, type ResourceRegistration } from "./resources.mts";

/** A schema-node mount: a guest apex plus the schema `$id` its domain acts on. */
export interface SchemaMount {
  /** Stable mount key used in indexes and path maps. */
  readonly name: string;
  /** The program surface projected at this schema node. */
  readonly induced: ProjectedSurface;
  /**
   * Boundary options owned by this mounted apex. The schema namespace supplies
   * the base path; mount-local options supply the package's own journal admission,
   * root site, caller, and clocks.
   */
  readonly options?: ServeOptions;
  /**
   * The schema `$id`-path this mount mounts at, usually its domain schema.
   * When omitted, it is derived from the mount's action domain slots.
   */
  readonly nodeId?: string;
}

/** One node of the namespace tree: a schema `$id`-path and the mounts at it. */
export interface SchemaNode {
  /** Bare descent path, for example `metroplat/articulation/utterance`. */
  readonly id: string;
  /** URL base for this node, equal to `/${id}`. */
  readonly path: string;
  /** Nearest visible prefix node in the schema namespace, if present. */
  readonly parent?: string;
  /** Visible child schema nodes under this node. */
  readonly children: readonly string[];
  /** Guest apices mounted at this schema node. */
  readonly mounts: readonly SchemaMount[];
  /** True when at least one mounted apex is a self-loop at this schema. */
  readonly endo: boolean;
}

/** Serializable read of one mounted apex inside the schema namespace. */
export interface SchemaNamespaceMountReport {
  readonly name: string;
  readonly package: string;
  readonly nodeId: string;
  readonly path: string;
  readonly endo: boolean;
  readonly operations: readonly string[];
  readonly resources: readonly string[];
  readonly prompts: readonly string[];
  readonly operationsManifold: PackageOperationsManifold;
  readonly boundary: {
    readonly rootRouteConfigured: boolean;
    readonly journalFeedConfigured: boolean;
    readonly arrivalAdmissionConfigured: boolean;
    readonly callerConfigured: boolean;
  };
}

/** Serializable read of one schema namespace node. */
export interface SchemaNamespaceNodeReport {
  readonly id: string;
  readonly path: string;
  readonly parent?: string;
  readonly children: readonly string[];
  readonly mounts: readonly string[];
  readonly endo: boolean;
}

/** Package-level schema namespace: mounted apices, schema nodes, and the cross-package operations graph. */
export interface SchemaNamespaceReport {
  readonly kind: "metroplat.schema-namespace";
  readonly nodes: readonly SchemaNamespaceNodeReport[];
  readonly mounts: readonly SchemaNamespaceMountReport[];
  readonly graph: OperationsManifoldGraph;
  readonly evidence: readonly string[];
}

/** Local context resource carried by a materialized schema node's own endpoint. */
export interface SchemaNodeContextReport {
  readonly kind: "metroplat.schema-node-context";
  readonly node: SchemaNamespaceNodeReport;
  readonly frontier: OperationsManifoldGraph["frontier"];
  readonly edges: readonly OperationsManifoldGraph["edges"][number][];
  readonly localHoareEdges: readonly SchemaNodeHoareEdgeReport[];
  readonly rejectedLocalHoareEdges: readonly SchemaNodeHoareEdgeReport[];
  readonly evidence: readonly string[];
}

/** A local Hoare edge at one schema node, paired with the mounted apex that generated it. */
export interface SchemaNodeHoareEdgeReport {
  readonly mount: string;
  readonly package: string;
  readonly edge: PackageOperationsManifold["extrema"]["edges"][number];
}

/** First-class generated endpoint readout for one schema path:
 *  GER = (LC, p, y(p), R, omega). */
export interface SchemaNodeGeneratedEndpointReadout {
  readonly kind: "metroplat.generated-endpoint-readout";
  readonly equation: "endpoint(path)=presentation_omega(GER)";
  readonly path: string;
  readonly generatedEndpoint: {
    readonly languageCone: {
      readonly apex: {
        readonly node: string;
        readonly mounts: readonly string[];
        readonly programs: readonly string[];
        readonly resources: readonly string[];
        readonly prompts: readonly string[];
      };
      readonly extrema: {
        readonly selected: string;
        readonly domains: readonly string[];
        readonly codomains: readonly string[];
        readonly incomingFrontier: readonly string[];
        readonly outgoingFrontier: readonly string[];
        readonly children: readonly string[];
      };
      readonly generators: readonly {
        readonly verb: string;
        readonly mount: string;
        readonly package: string;
        readonly term: "rmn" | "host-boundary";
        readonly contract: string;
      }[];
      readonly reductions: readonly {
        readonly verb: string;
        readonly settlement: string;
        readonly finality: string;
        readonly transport: string;
      }[];
      readonly resourceStructure: {
        readonly resources: readonly string[];
        readonly prompts: readonly string[];
      };
      readonly settlement: {
        readonly evidencePolicies: readonly string[];
        readonly phases: readonly string[];
      };
    };
    readonly selectedExtremum: string;
    readonly yonedaReadout: {
      readonly formula: "y(p)=Hom(-,p)";
      readonly arrowsInto: readonly OperationsManifoldGraph["edges"][number][];
      readonly localHoareEdges: readonly SchemaNodeHoareEdgeReport[];
      readonly rejectedLocalHoareEdges: readonly SchemaNodeHoareEdgeReport[];
    };
    readonly readout: SchemaNodeContextReport;
    readonly carrier: {
      readonly arrowRecoveredObject: string;
      readonly causalSupport: {
        readonly events: readonly string[];
        readonly precedence: readonly string[];
      };
      readonly siteSupport: {
        readonly path: string;
        readonly children: readonly string[];
      };
      readonly valuation: {
        readonly phases: readonly string[];
        readonly evidencePolicies: readonly string[];
      };
      readonly settlementEvidence: readonly string[];
      readonly artifactAddresses: readonly string[];
      readonly boundaryPresentation: readonly string[];
    };
    readonly hoarePrograms: readonly {
      readonly verb: string;
      readonly judgment?: string;
      readonly domain?: string;
      readonly codomain?: string;
      readonly precondition: string;
      readonly postcondition: string;
      readonly coordination: "coordination-free" | "coordination-required";
      readonly evidencePolicy: string;
      readonly carrierLaw: readonly string[];
      readonly standing: import("../lib/values/index.mts").ChargeValueName;
      readonly openCarrierObligations: readonly string[];
    }[];
    readonly presentation: {
      readonly html: string;
      readonly endpointReadout: string;
      readonly discovery: string;
      readonly openapi: string;
      readonly mcp: string;
      readonly health: string;
      readonly journalFeed: string;
      readonly operationsManifold: string;
    };
  };
  readonly evidence: readonly string[];
}

/** The mount's domain schema `$id` — the node it mounts at. Deterministic
 *  (first by schema address) when several domain schemas are referenced. Undefined for a
 *  pure source (no domain `$ref`). */
export function domainNodeOf(induced: ProjectedSurface): string | undefined {
  return [...consumedIds(induced)].sort()[0];
}

/**
 * The explicit schema-node address for a source apex whose material enters
 * from a wire boundary instead of a declared domain schema. A typed source
 * still has a produced schema, so it mounts at that codomain; only a source
 * with no schema extrema falls back to its wire presentation.
 */
export function boundaryNodeOf(induced: ProjectedSurface): string {
  const produced = [...producedIds(induced)].sort()[0];
  if (produced !== undefined) return produced;
  const formats = new Set(induced.operations.map((act) => act.inputFormat));
  return `wire/${[...formats].sort()[0] ?? "void"}`;
}

/** The schema-node address a mount occupies. */
export function mountNodeOf(mount: SchemaMount): string {
  return schemaNodeId(mount.nodeId ?? domainNodeOf(mount.induced) ?? boundaryNodeOf(mount.induced));
}

/** True iff the mount both consumes and produces `nodeId` — the self-loop case
 *  (communicating is endomorphic on the meme schema: meme in, meme out). */
export function isEndoMount(induced: ProjectedSurface, nodeId: string): boolean {
  return consumedIds(induced).has(nodeId) && producedIds(induced).has(nodeId);
}

function behaviorNodePrefix(module: string): string {
  const leaf = module.split("/").filter((part) => part.length > 0).at(-1) ?? "action";
  return leaf.replace(/^@/, "") || "action";
}

function behaviorNodeOf(module: string | undefined, act: Operation): string {
  return `${module === undefined ? "action" : behaviorNodePrefix(module)}/${act.verb}`;
}

/** The schema node one action acts on: its domain schema `$id`, its produced
 *  codomain schema for typed source operations, or its behavior address when no
 *  schema extrema exist. */
export function operationNodeOf(act: Operation): string {
  return schemaNodeId(act.domain?.id ?? act.codomain?.id ?? behaviorNodeOf(undefined, act));
}

function moduleOperationNodeOf(module: string, act: Operation): string {
  return schemaNodeId(act.domain?.id ?? act.codomain?.id ?? behaviorNodeOf(module, act));
}

function operationsByNode(
  operations: readonly Operation[],
  nodeOf: (act: Operation) => string = operationNodeOf,
): ReadonlyMap<string, readonly Operation[]> {
  const byNode = new Map<string, Operation[]>();
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
export function schemaMountsOf(operations: readonly Operation[]): readonly SchemaMount[] {
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
export function moduleMounts(
  module: string,
  operations: readonly Operation[],
  options: Omit<SurfaceAssemblyOptions, "catalog" | "packageName"> = {},
): readonly SchemaMount[] {
  const byNode = operationsByNode(operations, (act) => moduleOperationNodeOf(module, act));
  return Object.freeze([...byNode.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeId, at]) => Object.freeze({
      name: byNode.size === 1 ? module : `${module}:${nodeId}`,
      induced: projectSurface([...at], { ...options, packageName: module }),
      nodeId,
    })));
}

/** Stable MCP resource URI for a mesh's schema-namespace report. */
export function schemaNamespaceUri(): string {
  return "metroplat://schema-namespace";
}

/**
 * Publish the mounted mesh as an MCP resource, computed at read time from the
 * live mounts — the same report `GET /schema-namespace` serves over HTTP.
 */
export function schemaNamespaceResource(
  mounts: () => readonly SchemaMount[],
): ResourceRegistration {
  return resource({
    uri: schemaNamespaceUri(),
    name: "schema namespace",
    description: "The mounted schema-node mesh: namespace nodes, module mounts, per-mount operations manifolds, and the cross-module composition graph.",
    read: () => `${JSON.stringify(schemaNamespaceReport(mounts()), null, 2)}\n`,
  });
}

/** The schema `$id`s a mount's operations reference on either slot. */
function referencedIds(induced: ProjectedSurface): readonly string[] {
  const ids = new Set<string>();
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
  mounts: readonly SchemaMount[],
): readonly SchemaNode[] {
  const universe = new Set<string>();
  for (const m of mounts) for (const id of referencedIds(m.induced)) universe.add(id);
  for (const m of mounts) universe.add(mountNodeOf(m));

  const byNode = new Map<string, SchemaMount[]>();
  for (const m of mounts) {
    const id = mountNodeOf(m);
    universe.add(id);
    const bucket = byNode.get(id);
    if (bucket === undefined) byNode.set(id, [m]);
    else bucket.push(m);
  }

  const nodes: SchemaNode[] = [];
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
  mounts: readonly SchemaMount[],
): ReadonlyMap<string, string> {
  const nodes = new Set(schemaNodeTree(mounts).map((n) => n.id));
  const paths = new Map<string, string>();
  for (const m of mounts) {
    const id = mountNodeOf(m);
    if (nodes.has(id)) paths.set(m.name, schemaNodePath(id));
  }
  return paths;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function countItems<T extends { readonly length: number }>(items: readonly T[]): number {
  return items.reduce((total, item) => total + item.length, 0);
}

function plural(count: number, noun: string): string {
  if (noun === "apex") return `${count} ${count === 1 ? "apex" : "apices"}`;
  if (noun.endsWith(" apex")) return `${count} ${count === 1 ? noun : `${noun.slice(0, -" apex".length)} apices`}`;
  if (noun === "more") return `${count} more`;
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function schemaRefHtml(
  schema: string,
  nodesById: ReadonlyMap<string, SchemaNamespaceNodeReport>,
  href: (path: string) => string,
): string {
  const id = schemaNodeId(schema);
  const path = nodesById.get(id)?.path ?? schemaNodePath(id);
  return `<a href="${escapeHtml(href(path))}"><code>${escapeHtml(schema)}</code></a>`;
}

function limitedList(values: readonly string[], limit: number): string {
  const shown = values.slice(0, limit).map((value) => `<code>${escapeHtml(value)}</code>`).join(", ");
  const rest = values.length - limit;
  if (shown === "") return "none";
  return rest > 0 ? `${shown} + ${plural(rest, "more")}` : shown;
}

function localHoareEdgesForNode(
  report: SchemaNamespaceReport,
  nodeId: string,
  kind: "accepted" | "rejected",
): readonly SchemaNodeHoareEdgeReport[] {
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

function edgeItemsHtml(edges: readonly SchemaNodeHoareEdgeReport[]): string {
  return edges.map((row) => [
    "<li>",
    `<code>${escapeHtml(row.edge.from)}</code> -> <code>${escapeHtml(row.edge.to)}</code>`,
    ` through <code>${escapeHtml(row.edge.schema)}</code>`,
    `; <code>${escapeHtml(row.package)}</code>`,
    `; ${escapeHtml(row.edge.relation)}`,
    `; ${row.edge.ok ? "accepted" : "rejected"}`,
    "</li>",
  ].join("")).join("\n") || "<li>none</li>";
}

function frontierItemsHtml(
  frontiers: readonly OperationsManifoldGraph["frontier"]["incoming"][number][],
  nodesById: ReadonlyMap<string, SchemaNamespaceNodeReport>,
  href: (path: string) => string,
  label: "consumed by" | "produced by",
): string {
  return frontiers.map((frontier) =>
    `<li>${schemaRefHtml(frontier.schema, nodesById, href)} ${label} <code>${escapeHtml(frontier.package)}</code> via ${limitedList(frontier.operations, 4)}</li>`,
  ).join("\n") || "<li>none</li>";
}

function schemaRefOf(schema: Record<string, unknown> | undefined): string | undefined {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? schemaNodeId(ref) : undefined;
}

function schemaNodeEndpointReadoutUri(nodeId: string): string {
  return `metroplat://schema-node/${encodeURIComponent(nodeId)}/endpoint-readout`;
}

function schemaNodeGeneratedEndpointReadout(
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
  mounts: readonly SchemaMount[],
  basePath: string,
): SchemaNodeGeneratedEndpointReadout {
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
  const phases = sortedUnique(mountedPrograms.map(({ program }) => program.contract.contract.settlement.closureRegime));
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
    kind: "metroplat.generated-endpoint-readout" as const,
    equation: "endpoint(path)=presentation_omega(GER)" as const,
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
          term: program.runTerm === undefined ? "host-boundary" as const : "rmn" as const,
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
        formula: "y(p)=Hom(-,p)" as const,
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
        settlementEvidence: Object.freeze(mountedPrograms.map(({ program }) => `${program.contract.contract.id}:${program.contract.charge}`)),
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
            judgment: `${program.contract.contract.id} : ${domain} -> ${codomain} [${program.contract.charge}]`,
          }),
          ...(domain === undefined ? {} : { domain }),
          ...(codomain === undefined ? {} : { codomain }),
          precondition: program.contract.contract.precondition.id,
          postcondition: program.contract.contract.postcondition.id,
          coordination: program.contract.contract.coordination.mode,
          evidencePolicy: "charged-journal-evidence",
          carrierLaw: Object.freeze(program.contract.contract.laws.map((law) => law.theorem)),
          standing: program.contract.charge,
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

function schemaNodeReadoutHtml(
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
  mounts: readonly SchemaMount[],
  basePath: string,
): string {
  const root = basePath.endsWith(node.path) ? basePath.slice(0, -node.path.length).replace(/\/+$/, "") : "";
  const href = (path: string): string => `${root}${path}`.replace(/\/+/g, "/") || "/";
  const nodesById = new Map(report.nodes.map((nodeReport) => [nodeReport.id, nodeReport] as const));
  const context = schemaNodeContextReport(report, node);
  const programs = mounts.flatMap((mount) => mount.induced.discovery.programs.map((program) => Object.freeze({ mount, program })));
  const resources = sortedUnique(mounts.flatMap((mount) => mount.induced.discovery.resources.map((res) => res.uri)));
  const prompts = sortedUnique(mounts.flatMap((mount) => mount.induced.discovery.prompts.map((prompt) => prompt.name)));
  const operationOptions = programs.map(({ program }) =>
    `<option value="${escapeHtml(program.name)}">${escapeHtml(program.name)}</option>`,
  ).join("\n");
  const operationChoice = programs.length === 0
    ? "<p>No operation is mounted at this node. The node still has discovery, OpenAPI, MCP, health, journal-feed, and context faces.</p>"
    : [
      `<form method="get" action="${escapeHtml(basePath)}">`,
      "<label>Operation ",
      `<select name="operation">${operationOptions}</select>`,
      "</label>",
      "<button type=\"submit\">Open operation form</button>",
      "</form>",
    ].join("");
  const operationItems = programs.map(({ mount, program }) => [
    "<li>",
    `<a href="${escapeHtml(`${basePath}/${program.name}`)}"><code>${escapeHtml(program.name)}</code></a>`,
    ` <small>mount <code>${escapeHtml(mount.name)}</code>; package <code>${escapeHtml(mount.induced.discovery.package)}</code>; contract <code>${escapeHtml(program.contract.contract.id)}</code>; standing <code>${escapeHtml(program.contract.charge)}</code></small>`,
    "</li>",
  ].join("")).join("\n") || "<li>none</li>";
  const mountItems = node.mounts.map((mountName) => {
    const mount = report.mounts.find((candidate) => candidate.name === mountName);
    if (mount === undefined) return `<li><code>${escapeHtml(mountName)}</code></li>`;
    return `<li><code>${escapeHtml(mount.name)}</code> <small>package <code>${escapeHtml(mount.package)}</code>; ${plural(mount.operations.length, "action")}; ${plural(mount.resources.length, "resource")}; ${plural(mount.prompts.length, "prompt")}; ${mount.endo ? "self-loop" : "non-endo"}</small></li>`;
  }).join("\n") || "<li>none</li>";
  const childItems = node.children.map((child) => {
    const childNode = nodesById.get(child);
    const path = childNode?.path ?? schemaNodePath(child);
    return `<li><a href="${escapeHtml(path)}"><code>${escapeHtml(child)}</code></a></li>`;
  }).join("\n") || "<li>none</li>";
  const parent = node.parent === undefined
    ? "root"
    : schemaRefHtml(node.parent, nodesById, href);
  return [
    "<!doctype html><meta charset=utf-8>",
    `<title>${escapeHtml(node.id)} endpoint readout</title>`,
    "<main>",
    `<h1><code>${escapeHtml(node.id)}</code></h1>`,
    "<p>This path is a generated endpoint readout: its schema node is the apex, its mounted programs/resources/prompts are extrema, and its incoming/outgoing/frontier edges are read from the namespace graph.</p>",
    "<nav>",
    `<a href="${escapeHtml(`${basePath}/discovery`)}">Discovery</a>`,
    `<a href="${escapeHtml(`${basePath}/endpoint-readout`)}">Endpoint readout JSON</a>`,
    `<a href="${escapeHtml(`${basePath}/openapi.json`)}">OpenAPI</a>`,
    `<a href="${escapeHtml(`${basePath}/operations-manifold`)}">Operations manifold</a>`,
    `<a href="${escapeHtml(`${basePath}/feed`)}">Journal feed</a>`,
    `<a href="${escapeHtml(href("/schema-namespace"))}">Namespace</a>`,
    `<code>POST ${escapeHtml(`${basePath}/mcp`)}</code>`,
    "</nav>",
    "<section>",
    "<h2>Read cone</h2>",
    `<p>Parent ${parent}; children ${plural(node.children.length, "schema node")}; mounted ${plural(node.mounts.length, "apex")}; ${node.endo ? "self-loop present" : "no local self-loop"}.</p>`,
    `<p>Programs ${plural(programs.length, "action")}; resource handles ${resources.length}; prompt handles ${prompts.length}; context <code>${escapeHtml(schemaNodeContextUri(node.id))}</code>; generated endpoint <code>${escapeHtml(schemaNodeEndpointReadoutUri(node.id))}</code>.</p>`,
    "</section>",
    "<section>",
    "<h2>Operation forms</h2>",
    operationChoice,
    `<ol>${operationItems}</ol>`,
    "</section>",
    "<section>",
    "<h2>Composition frontier</h2>",
    "<h3>Incoming</h3>",
    `<ol>${frontierItemsHtml(context.frontier.incoming, nodesById, href, "consumed by")}</ol>`,
    "<h3>Outgoing</h3>",
    `<ol>${frontierItemsHtml(context.frontier.outgoing, nodesById, href, "produced by")}</ol>`,
    "<h3>Cross-package edges</h3>",
    `<ol>${context.edges.map((edge) => `<li><code>${escapeHtml(edge.fromPackage)}</code>/<code>${escapeHtml(edge.from)}</code> -> <code>${escapeHtml(edge.toPackage)}</code>/<code>${escapeHtml(edge.to)}</code> through ${schemaRefHtml(edge.schema, nodesById, href)}</li>`).join("\n") || "<li>none</li>"}</ol>`,
    "<h3>Local Hoare edges</h3>",
    `<ol>${edgeItemsHtml(context.localHoareEdges)}</ol>`,
    "<h3>Rejected local Hoare edges</h3>",
    `<ol>${edgeItemsHtml(context.rejectedLocalHoareEdges)}</ol>`,
    "</section>",
    "<section>",
    "<h2>Mounted apices</h2>",
    `<ol>${mountItems}</ol>`,
    "</section>",
    "<section>",
    "<h2>Children</h2>",
    `<ol>${childItems}</ol>`,
    "</section>",
    "</main>",
  ].join("\n");
}

/** The HTML index of the whole namespace: every node at its `$id` path, with the
 *  mount package names, apex/extrema summaries, and frontier readouts — the
 *  space navigable as one endpoint category. */
export function schemaNamespaceIndexHtml(report: SchemaNamespaceReport, basePath = ""): string {
  const base = basePath.replace(/\/+$/, "");
  const href = (path: string): string => `${base}${path}`.replace(/\/+/g, "/") || "/";
  const nodesById = new Map(report.nodes.map((node) => [node.id, node] as const));
  const packages = sortedUnique(report.mounts.map((mount) => mount.package));
  const operationCount = countItems(report.mounts.map((mount) => mount.operations));
  const resourceCount = sortedUnique(report.mounts.flatMap((mount) => [...mount.resources])).length;
  const promptCount = sortedUnique(report.mounts.flatMap((mount) => [...mount.prompts])).length;
  const localEdgeCount = report.mounts.reduce((total, mount) => total + mount.operationsManifold.extrema.edges.length, 0);
  const rejectedEdgeCount = report.mounts.reduce((total, mount) => total + mount.operationsManifold.extrema.rejectedEdges.length, 0);
  const incomingFrontierCount = report.graph.frontier.incoming.length;
  const outgoingFrontierCount = report.graph.frontier.outgoing.length;

  const incomingItems = report.graph.frontier.incoming.map((frontier) =>
    `<li>${schemaRefHtml(frontier.schema, nodesById, href)} consumed by <code>${escapeHtml(frontier.package)}</code> via ${limitedList(frontier.operations, 4)}</li>`,
  ).join("\n") || "<li>none</li>";
  const outgoingItems = report.graph.frontier.outgoing.map((frontier) =>
    `<li>${schemaRefHtml(frontier.schema, nodesById, href)} produced by <code>${escapeHtml(frontier.package)}</code> via ${limitedList(frontier.operations, 4)}</li>`,
  ).join("\n") || "<li>none</li>";

  const nodeItems = [...report.nodes].sort((left, right) => left.path.localeCompare(right.path)).map((node) => {
    const mounts = node.mounts.length === 0 ? "frontier only" : limitedList(node.mounts, 3);
    const children = node.children.length === 0 ? "" : `; children ${limitedList(node.children, 3)}`;
    const endo = node.endo ? "; self-loop" : "";
    return `<li><a href="${escapeHtml(href(node.path))}"><code>${escapeHtml(node.id)}</code></a> <small>${mounts}${children}${endo}</small></li>`;
  }).join("\n");

  const mountItems = report.mounts.map((mount) => {
    const manifold = mount.operationsManifold;
    const extrema = [
      plural(manifold.extrema.domains.length, "domain"),
      plural(manifold.extrema.codomains.length, "codomain"),
      plural(manifold.extrema.incoming.length, "incoming frontier"),
      plural(manifold.extrema.outgoing.length, "outgoing frontier"),
      plural(manifold.extrema.edges.length, "local Hoare edge"),
    ].join(", ");
    const boundary = [
      mount.boundary.rootRouteConfigured ? "root" : "",
      mount.boundary.journalFeedConfigured ? "journal-feed" : "",
      mount.boundary.arrivalAdmissionConfigured ? "arrival-admission" : "",
      mount.boundary.callerConfigured ? "caller" : "",
    ].filter((flag) => flag !== "").join(", ") || "default boundary";
    return [
      `<li><a href="${escapeHtml(href(mount.path))}"><code>${escapeHtml(mount.name)}</code></a>`,
      `<small>package <code>${escapeHtml(mount.package)}</code>; ${plural(mount.operations.length, "action")}; ${extrema}; ${boundary}</small>`,
      `<br><a href="${escapeHtml(href(`${mount.path}/operations-manifold`))}">operations manifold</a>`,
      `; operations ${limitedList(mount.operations, 5)}</li>`,
    ].join(" ");
  }).join("\n");

  return [
    "<!doctype html><meta charset=utf-8>",
    "<title>schema namespace endpoint category</title>",
    "<main>",
    "<h1>schema namespace endpoint-category index</h1>",
    "<p>A namespace of schema nodes. Each path is its own mounted program surface with HTML forms, OpenAPI, MCP, health, discovery, journal, and operations-manifold faces.</p>",
    "<nav>",
    `<a href="${escapeHtml(href("/schema-namespace"))}">schema namespace JSON</a>`,
    `<a href="${escapeHtml(href("/discovery"))}">root discovery</a>`,
    `<a href="${escapeHtml(href("/openapi.json"))}">root OpenAPI</a>`,
    `<a href="${escapeHtml(href("/health"))}">health</a>`,
    "</nav>",
    "<section>",
    "<h2>Read cone</h2>",
    `<p>Apex <code>schema-namespace</code>; legs ${plural(report.nodes.length, "schema node")}, ${plural(report.mounts.length, "mounted apex")}, ${plural(packages.length, "package")}; extrema ${plural(incomingFrontierCount, "incoming frontier")} and ${plural(outgoingFrontierCount, "outgoing frontier")}.</p>`,
    `<p>Programs ${plural(operationCount, "action")}; resource handles ${resourceCount}; prompt handles ${promptCount}; cross-package ${plural(report.graph.edges.length, "edge")}; local Hoare ${plural(localEdgeCount, "edge")}; rejected local ${plural(rejectedEdgeCount, "edge")}.</p>`,
    `<p>Packages ${limitedList(packages, 8)}.</p>`,
    "</section>",
    "<section>",
    "<h2>Frontier</h2>",
    "<h3>Incoming</h3>",
    `<ol>${incomingItems}</ol>`,
    "<h3>Outgoing</h3>",
    `<ol>${outgoingItems}</ol>`,
    "</section>",
    "<section>",
    "<h2>Mounted apices</h2>",
    `<ol>${mountItems}</ol>`,
    "</section>",
    "<section>",
    "<h2>Schema nodes</h2>",
    `<ol>${nodeItems}</ol>`,
    "</section>",
    "</main>",
  ].join("\n");
}

/** One four-faced apex over several guests co-mounted at one route point: the coproduct
 *  of their operations through the existing `projectSurface`. The node-level `GET /`,
 *  `GET /openapi.json`, and `POST /mcp` are projected from this pooled apex; each
 *  individual operation dispatches through the OWNING mount so journal admission lands
 *  in the right per-package ledger. */
export function aggregateNodeApex(
  mounts: readonly SchemaMount[],
  nodeId: string,
  resources: readonly ResourceRegistration[] = [],
): ProjectedSurface {
  const operations = mounts.flatMap((m) => [...m.induced.operations]);
  return projectSurface(operations, {
    packageName: nodeId,
    resources,
    deriveLspResources: false,
  });
}

function schemaNodeContextUri(nodeId: string): string {
  return `metroplat://schema-node/${encodeURIComponent(nodeId)}`;
}

function schemaNodeContextReport(
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
): SchemaNodeContextReport {
  const edges = report.graph.edges.filter((edge) => edge.schema === node.id);
  const localHoareEdges = localHoareEdgesForNode(report, node.id, "accepted");
  const rejectedLocalHoareEdges = localHoareEdgesForNode(report, node.id, "rejected");
  const incoming = report.graph.frontier.incoming.filter((frontier) => frontier.schema === node.id);
  const outgoing = report.graph.frontier.outgoing.filter((frontier) => frontier.schema === node.id);
  return Object.freeze({
    kind: "metroplat.schema-node-context" as const,
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
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
): ResourceRegistration {
  return resource({
    uri: schemaNodeContextUri(node.id),
    name: `${node.id} schema node context`,
    description: "The local namespace read of one schema node: its mounts, children, graph edges, and frontier role.",
    read: () => `${JSON.stringify(schemaNodeContextReport(report, node), null, 2)}\n`,
  });
}

function schemaNodeEndpointReadoutResource(
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
  mounts: readonly SchemaMount[],
): ResourceRegistration {
  return resource({
    uri: schemaNodeEndpointReadoutUri(node.id),
    name: `${node.id} generated endpoint readout`,
    description: "The generated endpoint tuple GER=(LC,p,y(p),R,omega) for one schema-node path.",
    read: () => `${JSON.stringify(schemaNodeGeneratedEndpointReadout(report, node, mounts, node.path), null, 2)}\n`,
  });
}

function schemaNodeApex(
  report: SchemaNamespaceReport,
  node: SchemaNamespaceNodeReport,
  mounts: readonly SchemaMount[],
): ProjectedSurface {
  return aggregateNodeApex(mounts, node.id, [
    schemaNodeContextResource(report, node),
    schemaNodeEndpointReadoutResource(report, node, mounts),
  ]);
}

function emptySchemaNodeApex(report: SchemaNamespaceReport, node: SchemaNamespaceNodeReport): ProjectedSurface {
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
export interface SchemaNamespaceRouteOptions extends ServeOptions {
  /** Package name of the namespace root surface; defaults to `schema-namespace`. */
  readonly rootPackage?: string;
}

function nodeScopedOptions(options: SchemaNamespaceRouteOptions): ServeOptions {
  const { rootPackage: _rootPackage, rootRoute: _rootRoute, routeOwner: _routeOwner, ...shared } = options;
  return shared;
}

function mountServeOptions(options: ServeOptions, mount: SchemaMount, basePath: string): ServeOptions {
  return { ...options, ...(mount.options ?? {}), basePath };
}

function nodeServeOptions(options: ServeOptions, basePath: string): ServeOptions {
  return { ...options, basePath };
}

function acceptsHtml(request: ServedRequest): boolean {
  return (request.accept ?? "").split(",").some((part) => part.trim().toLowerCase().startsWith("text/html"));
}

function isNodeFace(verb: string): boolean {
  return verb === "" ||
    verb === "mcp" ||
    verb === "openapi.json" ||
    verb === "health" ||
    verb === "discovery" ||
    verb === "feed" ||
    verb === "operations-manifold";
}

function admitNamespaceRead(request: ServedRequest, options: ServeOptions, path: string): ServedResponse | undefined {
  const arrival = admitServedRequestArrival(request, options, path);
  return arrival !== undefined && "status" in arrival ? arrival : undefined;
}

/** Read the whole mounted namespace as a schema-namespace report. */
export function schemaNamespaceReport(
  mounts: readonly SchemaMount[],
): SchemaNamespaceReport {
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
    kind: "metroplat.schema-namespace" as const,
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
interface SchemaRouteTarget {
  readonly induced: ProjectedSurface;
  readonly options: ServeOptions;
}

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
  mounts: readonly SchemaMount[],
  request: ServedRequest,
  options: SchemaNamespaceRouteOptions,
): ServedResponse | SchemaRouteTarget {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;

  const routeOwnerOwnsRoot = options.rootRoute !== undefined || options.routeOwner !== undefined;
  if (request.method === "GET" && (path === "" || path === "/") && (!routeOwnerOwnsRoot || acceptsHtml(request))) {
    const admitted = admitNamespaceRead(request, options, path);
    if (admitted !== undefined) return admitted;
    return html(schemaNamespaceIndexHtml(schemaNamespaceReport(mounts), root));
  }
  // The namespace's own report face: the mounted namespace as serializable data.
  if (request.method === "GET" && path === "/schema-namespace") {
    const admitted = admitNamespaceRead(request, options, path);
    if (admitted !== undefined) return admitted;
    return json(schemaNamespaceReport(mounts));
  }

  const report = schemaNamespaceReport(mounts);
  const nodes = report.nodes;
  const nodeByPath = new Map(nodes.map((node) => [node.path, node] as const));
  const paths = mountSchemaNodes(mounts);
  // Group mounts by their resolved base so a node with several guests is one apex.
  // Every materialized schema node is present even when the group is empty: the
  // sheaf law is four faces at every node, not only at nodes with runnable verbs.
  const byBase = new Map<string, SchemaMount[]>();
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
  const rootApex = projectSurface([], {
    packageName: options.rootPackage ?? "schema-namespace",
    // The mesh itself travels with the root node's faces.
    resources: [schemaNamespaceResource(() => mounts)],
  });
  return { induced: rootApex, options: { ...rootOptions, basePath: root } };
}

/** Route one request against a schema namespace through the asynchronous RPC path. */
export async function routeSchemaNamespace(
  mounts: readonly SchemaMount[],
  request: ServedRequest,
  options: SchemaNamespaceRouteOptions,
): Promise<ServedResponse> {
  const resolved = resolveSchemaRoute(mounts, request, options);
  return "induced" in resolved ? routeRequest(resolved.induced, request, resolved.options) : resolved;
}
