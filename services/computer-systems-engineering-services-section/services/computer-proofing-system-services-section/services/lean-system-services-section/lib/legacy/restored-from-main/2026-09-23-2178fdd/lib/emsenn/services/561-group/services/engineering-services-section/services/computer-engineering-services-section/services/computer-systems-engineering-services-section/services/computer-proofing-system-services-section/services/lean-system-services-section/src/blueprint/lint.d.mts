import { type BlueprintClaimGraph, type BlueprintClaimGraphFinding } from "./schema.mjs";
import type { LeanDeclarationCatalog } from "../schema.mjs";
export { blueprintClaimGraphFindingContract, blueprintClaimGraphFindingSchema, type BlueprintClaimGraphFinding, } from "./schema.mjs";
export type BlueprintClaimGraphLintOptions = Readonly<{
    /** Labels considered settled ground truth; nodes reachable from here via \uses in reverse need no further justification. */
    baseLabels?: readonly string[];
    /** Label prefixes considered external/out-of-scope; never flagged as missing. */
    externalPrefixes?: readonly string[];
    /** Which statementKind values count as "definition" for the overboxed-definition rule. */
    definitionKinds?: readonly string[];
    /** Label-prefix -> expected statementKind, for the label-kind-mismatch rule, e.g. { "def:": "definition" }. */
    labelKindPrefixes?: Readonly<Record<string, string>>;
}>;
/**
 * Pure claim-graph-shape lint checks: duplicate labels, rootless/unglued
 * nodes, overboxed definitions, label/kind mismatches, green-without-lean
 * witnesses, and nodes with no settled/frontier status. Faithfully
 * replicates obsmetrologia's scripts/audit-blueprint-incidence.mjs rule
 * semantics over the generic BlueprintClaimGraph shape.
 */
export declare function blueprintClaimGraphFindings(graph: BlueprintClaimGraph, options?: BlueprintClaimGraphLintOptions): readonly BlueprintClaimGraphFinding[];
/**
 * Lean-cross-referencing lint checks that need both the Blueprint claim
 * graph and a Lean declaration catalog: whether \lean{} references resolve
 * to real declarations, and whether sorry-bearing (admitted) declarations
 * are wrongly marked settled, or sorry-free declarations are wrongly left
 * frontier while reachable only from admitted upstreams. Faithfully
 * replicates obsmetrologia's scripts/lean-blueprint-weld.mjs rule semantics.
 */
export declare function blueprintLeanWeldFindings(graph: BlueprintClaimGraph, declarationCatalog: LeanDeclarationCatalog, options?: BlueprintClaimGraphLintOptions): readonly BlueprintClaimGraphFinding[];
