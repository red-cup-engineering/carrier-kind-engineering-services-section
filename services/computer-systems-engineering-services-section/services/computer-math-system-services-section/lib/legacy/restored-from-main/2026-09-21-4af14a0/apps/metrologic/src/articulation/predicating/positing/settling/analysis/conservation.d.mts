/**
 * analysis/conservation — the boundary operator ∂ and the conservation law.
 *
 * Where the Laplacian L = ∂∂* is the symmetric second-order operator, this is
 * the first-order ∂ underneath it, which keeps the orientation L throws away: a
 * cell relates subject → object, value flows from subject into object. A FLOW is
 * a Rational per oriented edge (a 1-chain); its boundary ∂f is the net
 * accumulation per term (a 0-chain). ∂f = 0 everywhere is Kirchhoff's current
 * law / a circulation / ker ∂ / a conserved current. The syndrome names the
 * leaking term; an elided edge can be solved for. Generalized to any
 * GradedAdditive quantity (superselection by sector). Carrier-valued throughout.
 */
import { type GradedRational } from "./graded.mjs";
import { type Rational } from "./exact-number.mjs";
import { type PredicationTerm } from "../../../predication.mjs";
import { type SectionCarrier } from "../section.mjs";
import { type RelationGraphCarrier } from "./laplacian.mjs";
/** One oriented edge of the flow network: a directed transfer subject → object. */
export interface FlowEdge {
    readonly kind: "meme-analysis.conservation.edge";
    readonly from: PredicationTerm;
    readonly to: PredicationTerm;
    readonly fromIndex: number;
    readonly toIndex: number;
}
/** The flow network of a section: terms (nodes) and oriented per-cell edges. */
export interface FlowNetworkCarrier {
    readonly kind: "meme-analysis.conservation.network";
    readonly graph: RelationGraphCarrier;
    readonly terms: readonly PredicationTerm[];
    readonly edges: readonly FlowEdge[];
}
/** The flow network of a section (reflexive cells are not edges). */
export declare function flowNetwork(section: SectionCarrier): FlowNetworkCarrier;
/** The boundary ∂(flow): net accumulation (inflow − outflow) at every term. */
export declare function divergence(network: FlowNetworkCarrier, flow: readonly Rational[]): readonly Rational[];
/** A conserved flow (boundary vanishes everywhere). */
export interface ConservedWitness {
    readonly kind: "meme-analysis.conservation.conserved:witness";
    readonly network: FlowNetworkCarrier;
    readonly flow: readonly Rational[];
    readonly divergence: readonly Rational[];
}
/** A non-conserved flow (the first leaking term and its residual). */
export interface ConservedObstruction {
    readonly kind: "meme-analysis.conservation.conserved-obstruction";
    readonly network: FlowNetworkCarrier;
    readonly flow: readonly Rational[];
    readonly divergence: readonly Rational[];
    readonly atTerm: PredicationTerm;
    readonly residual: Rational;
}
/** The result of judging a flow for conservation. */
export type ConservedJudgment = ConservedWitness | ConservedObstruction;
/** Whether a flow is conserved (Kirchhoff balance / ker ∂). */
export declare function conserved(network: FlowNetworkCarrier, flow: readonly Rational[]): ConservedJudgment;
/** The elided edge was solved for and the flow now conserves. */
export interface CompletionWitness {
    readonly kind: "meme-analysis.conservation.completion:witness";
    readonly network: FlowNetworkCarrier;
    readonly edge: FlowEdge;
    readonly inferred: Rational;
    readonly flow: readonly Rational[];
}
/** The elided edge could not close the imbalance globally. */
export interface CompletionObstruction {
    readonly kind: "meme-analysis.conservation.completion-obstruction";
    readonly network: FlowNetworkCarrier;
    readonly edge: FlowEdge;
    readonly inferred: Rational;
    readonly flow: readonly Rational[];
    readonly atTerm: PredicationTerm;
    readonly residual: Rational;
}
/** The result of completing an elided edge. */
export type CompletionJudgment = CompletionWitness | CompletionObstruction;
/** Solve for the value on an elided edge that makes the whole flow conserve. */
export declare function complete(network: FlowNetworkCarrier, flow: readonly Rational[], holeIndex: number): CompletionJudgment;
/** A grade-tagged additive structure: read a sector, add within it, recognize zero, negate. */
export interface GradedAdditive<Q> {
    readonly gradeOf: (quantity: Q) => string;
    readonly add: (left: Q, right: Q) => Q;
    readonly isZero: (quantity: Q) => boolean;
    readonly negate: (quantity: Q) => Q;
}
/** The signed per-sector residual of a 0-chain, in first-seen order, nonzero sectors only. */
export declare function gradedResidualBy<Q>(amounts: readonly Q[], ops: GradedAdditive<Q>): readonly Q[];
/** Conservation over any GradedAdditive: conserved when the residual is empty. */
export declare function gradedConservedBy<Q>(amounts: readonly Q[], ops: GradedAdditive<Q>): {
    readonly conserved: boolean;
    readonly residual: readonly Q[];
};
/** Completion over any GradedAdditive: the missing quantity, or why it cannot be inferred. */
export type GradedCompletionBy<Q> = {
    readonly kind: "witness";
    readonly inferred: Q;
} | {
    readonly kind: "obstruction";
    readonly reason: "balanced" | "ambiguous";
    readonly residual: readonly Q[];
};
/** Infer the one quantity missing so the 0-chain conserves (residual in one sector). */
export declare function gradedCompleteBy<Q>(known: readonly Q[], ops: GradedAdditive<Q>): GradedCompletionBy<Q>;
/** The signed per-sector residual of a carrier 0-chain. */
export declare function gradedResidual(amounts: readonly GradedRational[]): readonly GradedRational[];
/** A graded 0-chain that conserves in every sector. */
export interface GradedConservedWitness {
    readonly kind: "meme-analysis.conservation.graded:witness";
    readonly amounts: readonly GradedRational[];
}
/** A graded 0-chain with surviving per-sector residuals. */
export interface GradedConservedObstruction {
    readonly kind: "meme-analysis.conservation.graded-obstruction";
    readonly amounts: readonly GradedRational[];
    readonly residual: readonly GradedRational[];
}
/** The result of judging a graded 0-chain for conservation. */
export type GradedConservedJudgment = GradedConservedWitness | GradedConservedObstruction;
/** Graded conservation judgment. */
export declare function gradedConserved(amounts: readonly GradedRational[]): GradedConservedJudgment;
/** An elided graded amount solved for (residual confined to one sector). */
export interface GradedCompletionWitness {
    readonly kind: "meme-analysis.conservation.graded-completion:witness";
    readonly known: readonly GradedRational[];
    readonly inferred: GradedRational;
}
/** An elided graded amount that cannot be inferred (balanced or ambiguous). */
export interface GradedCompletionObstruction {
    readonly kind: "meme-analysis.conservation.graded-completion-obstruction";
    readonly known: readonly GradedRational[];
    readonly reason: "balanced" | "ambiguous";
    readonly residual: readonly GradedRational[];
}
/** The result of completing an elided graded amount. */
export type GradedCompletionJudgment = GradedCompletionWitness | GradedCompletionObstruction;
/** Infer the one graded amount missing so the 0-chain conserves. */
export declare function gradedComplete(known: readonly GradedRational[]): GradedCompletionJudgment;
