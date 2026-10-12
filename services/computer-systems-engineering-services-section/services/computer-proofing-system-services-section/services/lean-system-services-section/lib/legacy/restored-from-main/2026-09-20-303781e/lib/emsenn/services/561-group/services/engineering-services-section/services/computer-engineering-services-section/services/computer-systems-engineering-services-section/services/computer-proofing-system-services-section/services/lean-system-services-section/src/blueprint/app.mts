import type { BlueprintClaimGraph } from "./schema.mts";
import {
  appOpticDescriptorContract,
  blueprintAppDocumentContract,
  type AppOpticDescriptor,
} from "../apps-schema.mts";


export interface BlueprintAppNode {
  readonly id: string;
  readonly title?: string;
  readonly statementKind: string;
  readonly status: "settled" | "frontier" | "unstated";
  readonly source: string;
  readonly line: number;
  readonly leanDeclarations: readonly string[];
  readonly uses: readonly string[];
  readonly usedBy: readonly string[];
}

export interface BlueprintAppSection {
  readonly status: "settled" | "frontier" | "unstated";
  readonly nodes: readonly BlueprintAppNode[];
}

export interface BlueprintAppDocument {
  readonly kind: "metroplat.apps.blueprint.document";
  readonly optic: "blueprint-claim-frontier";
  readonly sources: readonly string[];
  readonly settled: number;
  readonly frontier: number;
  readonly unstated: number;
  readonly missingDependencies: readonly string[];
  readonly sections: readonly BlueprintAppSection[];
  readonly edges: BlueprintClaimGraph["edges"];
  readonly evidence: readonly string[];
}

export function blueprintAppOptic(): AppOpticDescriptor {
  return appOpticDescriptorContract.assert(Object.freeze({
    kind: "metroplat.apps.optic" as const,
    id: "metroplat.apps.blueprint.claim-frontier",
    app: "blueprint" as const,
    optic: "blueprint-claim-frontier",
    mode: "inspector" as const,
    domain: "metroplat/blueprint/claim-graph",
    codomain: "metroplat/apps/blueprint/document",
    evidence: Object.freeze(["apps/blueprint:blueprintAppDocument"]),
  }), "Blueprint app optic descriptor") as AppOpticDescriptor;
}

/** Assemble an authored Blueprint optic from an admitted claim graph. */
export function blueprintAppDocument(graph: BlueprintClaimGraph): BlueprintAppDocument {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge.from]);
  }
  const appNodes = graph.nodes.map((node) => Object.freeze({
    id: node.id,
    ...(node.title === undefined ? {} : { title: node.title }),
    statementKind: node.statementKind,
    status: node.status,
    source: node.source,
    line: node.line,
    leanDeclarations: node.leanDeclarations,
    uses: [...new Set(outgoing.get(node.id) ?? [])].sort(),
    usedBy: [...new Set(incoming.get(node.id) ?? [])].sort(),
  }));
  const sections: BlueprintAppSection[] = ["frontier", "unstated", "settled"].map((status) => Object.freeze({
    status: status as BlueprintAppSection["status"],
    nodes: Object.freeze(appNodes
      .filter((node) => node.status === status)
      .sort((left, right) => left.source.localeCompare(right.source) || left.line - right.line || left.id.localeCompare(right.id))),
  }));
  return blueprintAppDocumentContract.assert(Object.freeze({
    kind: "metroplat.apps.blueprint.document" as const,
    optic: "blueprint-claim-frontier" as const,
    sources: graph.sources,
    settled: graph.settled,
    frontier: graph.frontier,
    unstated: graph.unstated,
    missingDependencies: graph.missingDependencies,
    sections: Object.freeze(sections),
    edges: graph.edges,
    evidence: Object.freeze([
      `blueprint-claim-graph:${graph.sources.length}`,
      `frontier:${graph.frontier}`,
      `missing-dependencies:${graph.missingDependencies.length}`,
    ]),
  }), "Blueprint app document") as BlueprintAppDocument;
}
