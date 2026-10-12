import { blueprintClaimGraphFindingContract, } from "./schema.mjs";
export { blueprintClaimGraphFindingContract, blueprintClaimGraphFindingSchema, } from "./schema.mjs";
const DEFAULT_DEFINITION_KINDS = Object.freeze(["definition"]);
const DEFAULT_LABEL_KIND_PREFIXES = Object.freeze({ "def:": "definition" });
function finding(code, severity, message, node) {
    return blueprintClaimGraphFindingContract.assert(Object.freeze({
        code,
        severity,
        message,
        ...(node === undefined ? {} : { nodeId: node.id }),
        ...(node?.source === undefined ? {} : { source: node.source }),
        ...(node?.line === undefined ? {} : { line: node.line }),
    }), "Blueprint claim-graph finding");
}
/**
 * Pure claim-graph-shape lint checks: duplicate labels, rootless/unglued
 * nodes, overboxed definitions, label/kind mismatches, green-without-lean
 * witnesses, and nodes with no settled/frontier status. Faithfully
 * replicates obsmetrologia's scripts/audit-blueprint-incidence.mjs rule
 * semantics over the generic BlueprintClaimGraph shape.
 */
export function blueprintClaimGraphFindings(graph, options = {}) {
    const baseLabels = new Set(options.baseLabels ?? []);
    const externalPrefixes = options.externalPrefixes ?? [];
    const definitionKinds = new Set(options.definitionKinds ?? DEFAULT_DEFINITION_KINDS);
    const labelKindPrefixes = options.labelKindPrefixes ?? DEFAULT_LABEL_KIND_PREFIXES;
    const isExternal = (label) => externalPrefixes.some((prefix) => label.startsWith(prefix));
    const nodesByLabel = new Map();
    const findings = [];
    for (const node of graph.nodes) {
        const previous = nodesByLabel.get(node.id);
        if (previous !== undefined) {
            findings.push(finding("duplicate-label", "error", `duplicate label already defined at ${previous.source}:${previous.line}`, node));
            continue;
        }
        nodesByLabel.set(node.id, node);
    }
    const usesByLabel = new Map();
    for (const edge of graph.edges) {
        const existing = usesByLabel.get(edge.from) ?? [];
        usesByLabel.set(edge.from, [...existing, edge.to]);
    }
    const usesOf = (label) => usesByLabel.get(label) ?? [];
    for (const to of graph.missingDependencies) {
        if (isExternal(to))
            continue;
        for (const edge of graph.edges) {
            if (edge.to !== to)
                continue;
            const fromNode = nodesByLabel.get(edge.from);
            findings.push(finding("missing-upstream", "error", `uses missing label ${to}`, fromNode));
        }
    }
    const reachMemo = new Map();
    function reachesBase(label, stack = new Set()) {
        if (baseLabels.has(label))
            return true;
        if (isExternal(label))
            return true;
        const memoized = reachMemo.get(label);
        if (memoized !== undefined)
            return memoized;
        if (stack.has(label))
            return false;
        const node = nodesByLabel.get(label);
        if (node === undefined) {
            reachMemo.set(label, false);
            return false;
        }
        stack.add(label);
        const reaches = usesOf(label).some((used) => reachesBase(used, stack));
        stack.delete(label);
        reachMemo.set(label, reaches);
        return reaches;
    }
    for (const node of nodesByLabel.values()) {
        const uses = usesOf(node.id);
        if (!baseLabels.has(node.id) && !isExternal(node.id) && uses.length === 0) {
            findings.push(finding("rootless-node", "error", "non-base claim-site has no upstream uses edge", node));
        }
        if (!baseLabels.has(node.id) && !isExternal(node.id) && !reachesBase(node.id)) {
            findings.push(finding("unglued-node", "error", "claim-site has no dependency path back to a base label", node));
        }
        if (definitionKinds.has(node.statementKind) && !baseLabels.has(node.id)) {
            findings.push(finding("overboxed-definition", "warning", "Blueprint definition box outside the base set", node));
        }
        for (const [prefix, expectedKind] of Object.entries(labelKindPrefixes)) {
            if (node.id.startsWith(prefix) && node.statementKind !== expectedKind) {
                findings.push(finding("label-kind-mismatch", "warning", `${node.statementKind} node uses ${prefix}* label`, node));
            }
        }
        if (node.status === "settled" && node.leanDeclarations.length === 0) {
            findings.push(finding("green-without-lean", "error", "settled node has no Lean witness", node));
        }
        if (node.status === "unstated") {
            findings.push(finding("missing-status", "error", "node is neither settled nor frontier", node));
        }
    }
    return Object.freeze(findings);
}
/**
 * Lean-cross-referencing lint checks that need both the Blueprint claim
 * graph and a Lean declaration catalog: whether \lean{} references resolve
 * to real declarations, and whether sorry-bearing (admitted) declarations
 * are wrongly marked settled, or sorry-free declarations are wrongly left
 * frontier while reachable only from admitted upstreams. Faithfully
 * replicates obsmetrologia's scripts/lean-blueprint-weld.mjs rule semantics.
 */
export function blueprintLeanWeldFindings(graph, declarationCatalog, options = {}) {
    const declarationsByName = new Map(declarationCatalog.entries.map((entry) => [entry.name, entry]));
    const admittedNames = new Set(declarationCatalog.entries
        .filter((entry) => entry.proofStatus === "admitted" || entry.proofStatus === "assumed")
        .map((entry) => entry.name));
    const usesByLabel = new Map();
    for (const edge of graph.edges) {
        const existing = usesByLabel.get(edge.from) ?? [];
        usesByLabel.set(edge.from, [...existing, edge.to]);
    }
    const usesOf = (label) => usesByLabel.get(label) ?? [];
    const nodesByLabel = new Map(graph.nodes.map((node) => [node.id, node]));
    const findings = [];
    const admittedLabels = new Set();
    for (const node of graph.nodes) {
        for (const lean of node.leanDeclarations) {
            if (admittedNames.has(lean))
                admittedLabels.add(node.id);
            if (!declarationsByName.has(lean)) {
                findings.push(finding("unmatched-lean-reference", "warning", `Lean reference ${lean} does not resolve to a cataloged declaration`, node));
            }
        }
    }
    const admittedReachMemo = new Map();
    function reachesAdmitted(label, stack = new Set()) {
        if (admittedLabels.has(label))
            return true;
        const memoized = admittedReachMemo.get(label);
        if (memoized !== undefined)
            return memoized;
        if (stack.has(label))
            return false;
        const node = nodesByLabel.get(label);
        if (node === undefined)
            return false;
        stack.add(label);
        const reaches = usesOf(label).some((used) => reachesAdmitted(used, stack));
        stack.delete(label);
        admittedReachMemo.set(label, reaches);
        return reaches;
    }
    for (const node of graph.nodes) {
        for (const lean of node.leanDeclarations) {
            const declaration = declarationsByName.get(lean);
            if (declaration === undefined)
                continue;
            const isAdmitted = declaration.proofStatus === "admitted" || declaration.proofStatus === "assumed";
            if (isAdmitted && node.status === "settled") {
                findings.push(finding("green-admitted", "error", `settled node references admitted Lean declaration ${lean}`, node));
            }
            if (!isAdmitted && node.status === "frontier" && !reachesAdmitted(node.id)) {
                findings.push(finding("red-settled", "warning", `frontier node references a proved Lean declaration ${lean} with no admitted upstream`, node));
            }
        }
    }
    return Object.freeze(findings);
}
