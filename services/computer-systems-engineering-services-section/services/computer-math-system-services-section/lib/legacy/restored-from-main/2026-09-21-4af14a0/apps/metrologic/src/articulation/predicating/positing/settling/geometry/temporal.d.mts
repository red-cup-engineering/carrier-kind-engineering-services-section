/**
 * settling/geometry/temporal — the causal order of a settling.
 *
 * Time is the settling itself: a cell's temporal position is the stage at which
 * it first fires. Two cells are adjacent when they share a term; causal
 * precedence is the transitive closure of stage-increasing adjacency — a strict
 * partial order (acyclic, since stages strictly increase along every edge).
 * Unrelated cells are spacelike. The ordering fraction (comparable pairs over all
 * pairs) is an exact rational; what dimension it corresponds to is not answered here.
 */
import { type Cell } from "../../../predication.mjs";
import { type Rational } from "../analysis/exact-number.mjs";
import type { SettlementFiltration } from "../object.mjs";
/** A cell paired with the stage index at which it first fired. */
export interface FiringEvent {
    readonly kind: "meme-geometry.temporal.firingEvent";
    readonly cell: Cell;
    readonly stageIndex: number;
}
/** The causal order over a settling's firing events (transitive closure). */
export interface CausalOrderCarrier {
    readonly kind: "meme-geometry.temporal.order";
    readonly events: readonly FiringEvent[];
    readonly precedes: readonly (readonly number[])[];
}
/** Each designated cell paired with the stage index of its first firing. */
export declare function readFiringEventsOfSettlementFiltration(settling: SettlementFiltration): readonly FiringEvent[];
/** A firing event: a cell stamped by the stage index at which it first fires. The unit of a causal
 *  order — any temporally-stamped cell sequence builds one (a settling's firings, or a communicating
 *  membrane with each utterance stamped by its position). */
export declare function firingEvent(cell: Cell, stageIndex: number): FiringEvent;
/** The causal order of an explicit firing-event list: transitive closure of stage-increasing term
 *  adjacency (acyclic, since stages strictly increase along every edge). The reusable core — feed it a
 *  settling's own firings or any temporally-stamped cell sequence. */
export declare function causalOrderOfFiringEvents(events: readonly FiringEvent[]): CausalOrderCarrier;
/** The causal order: transitive closure of stage-increasing term adjacency. */
export declare function readCausalOrderOfSettlementFiltration(settling: SettlementFiltration): CausalOrderCarrier;
/** Two events ordered by the causal order (earlier strictly precedes later). */
export interface TimelikeSeparation {
    readonly kind: "meme-geometry.temporal.separation.timelike";
    readonly earlier: FiringEvent;
    readonly later: FiringEvent;
}
/** Two events the causal order does not relate. */
export interface SpacelikeSeparation {
    readonly kind: "meme-geometry.temporal.separation.spacelike";
    readonly left: FiringEvent;
    readonly right: FiringEvent;
}
/** A cell that never fired (not an event). */
export interface CausalSeparationObstruction {
    readonly kind: "meme-geometry.temporal.separation-obstruction";
    readonly missing: Cell;
}
/** The result of causalSeparation. */
export type CausalSeparation = TimelikeSeparation | SpacelikeSeparation | CausalSeparationObstruction;
/** Separation of two cells under the causal order. */
export declare function causalSeparation(order: CausalOrderCarrier, left: Cell, right: Cell): CausalSeparation;
/** The causal cone at an event (past and future). */
export interface CausalConeCarrier {
    readonly kind: "meme-geometry.temporal.cone";
    readonly apex: FiringEvent;
    readonly past: readonly FiringEvent[];
    readonly future: readonly FiringEvent[];
}
/** A cone apex cell that never fired. */
export interface CausalConeObstruction {
    readonly kind: "meme-geometry.temporal.cone-obstruction";
    readonly missing: Cell;
}
/** The result of causalCone. */
export type CausalConeJudgment = CausalConeCarrier | CausalConeObstruction;
/** The cone at a cell: everything causally before and after it. */
export declare function causalCone(order: CausalOrderCarrier, apex: Cell): CausalConeJudgment;
/** The ordering fraction over a causal order (comparable pairs / all pairs). */
export interface OrderingFractionCarrier {
    readonly kind: "meme-geometry.temporal.orderingFraction";
    readonly comparablePairs: number;
    readonly totalPairs: number;
    readonly fraction: Rational;
}
/** Fewer than two events, so no fraction. */
export interface OrderingFractionObstruction {
    readonly kind: "meme-geometry.temporal.orderingFraction-obstruction";
    readonly eventCount: number;
}
/** The result of orderingFraction. */
export type OrderingFractionJudgment = OrderingFractionCarrier | OrderingFractionObstruction;
/** Comparable pairs over all pairs, exactly. */
export declare function orderingFraction(order: CausalOrderCarrier): OrderingFractionJudgment;
