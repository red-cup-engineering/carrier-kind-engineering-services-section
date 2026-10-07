import { appOpticDescriptorContract, blueprintAppDocumentContract, } from "../apps-schema.mjs";
export function blueprintAppOptic() {
    return appOpticDescriptorContract.assert(Object.freeze({
        kind: "metroplat.apps.optic",
        id: "metroplat.apps.blueprint.claim-frontier",
        app: "blueprint",
        optic: "blueprint-claim-frontier",
        mode: "inspector",
        domain: "metroplat/blueprint/claim-graph",
        codomain: "metroplat/apps/blueprint/document",
        evidence: Object.freeze(["apps/blueprint:blueprintAppDocument"]),
    }), "Blueprint app optic descriptor");
}
/** Assemble an authored Blueprint optic from an admitted claim graph. */
export function blueprintAppDocument(graph) {
    const incoming = new Map();
    const outgoing = new Map();
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
    const sections = ["frontier", "unstated", "settled"].map((status) => Object.freeze({
        status: status,
        nodes: Object.freeze(appNodes
            .filter((node) => node.status === status)
            .sort((left, right) => left.source.localeCompare(right.source) || left.line - right.line || left.id.localeCompare(right.id))),
    }));
    return blueprintAppDocumentContract.assert(Object.freeze({
        kind: "metroplat.apps.blueprint.document",
        optic: "blueprint-claim-frontier",
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
    }), "Blueprint app document");
}
