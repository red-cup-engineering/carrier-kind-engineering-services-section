/**
 * predicating/bilattice-relation — four-valued relations as Chu-style matrices.
 *
 * A relation is a matrix of charge values over points × states, read with
 * witness/obstruction judgments. Point and state profiles are its rows and
 * columns; a state's extension is the points it charges present. `transpose`
 * swaps points and states; `dual` swaps and negates (the Chu involution). A
 * `RelationTransform` is an adjoint pair (forward on points, backward on states)
 * checked cell-by-cell. The check returns either a transform witness or a ranked
 * obstruction carrier whose atoms name domain or adjointness failures; successful
 * transforms compose and dualize. Self-contained over the charge algebra and the
 * exact `count`.
 */
import { type ChargeValue } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type EntitySet, type PredicateSet } from "./predication.mjs";
import { type Natural } from "./positing/settling/analysis/exact-number.mjs";
/** An equivalence test for relation coordinates. */
export type RelationSameness<T> = (left: T, right: T) => boolean;
/** A successful relation read. */
export interface RelationReadWitness<Point, State> {
    readonly kind: "bilattice.relation.read:witness";
    readonly point: Point;
    readonly state: State;
    readonly value: ChargeValue;
}
/** A failed relation read, carrying the absent value used in its place. */
export interface RelationReadObstruction<Point, State> {
    readonly kind: "bilattice.relation.read-obstruction";
    readonly point: Point;
    readonly state: State;
    readonly absent: ChargeValue;
}
/** The outcome of reading a relation cell. */
export type RelationReadJudgment<Point, State> = RelationReadWitness<Point, State> | RelationReadObstruction<Point, State>;
/** A bilattice relation: a charge-valued matrix over points × states. */
export interface RelationCarrier<Point, State> {
    readonly kind: "bilattice.relation.carrier";
    readonly points: EntitySet<Point>;
    readonly states: PredicateSet<State>;
    readonly absent: ChargeValue;
    readonly samePoint: RelationSameness<Point>;
    readonly sameState: RelationSameness<State>;
    readonly read: (point: Point, state: State) => RelationReadJudgment<Point, State>;
    readonly at: (point: Point, state: State) => ChargeValue;
}
/** A single populated cell of a relation matrix. */
export interface RelationMatrixEntry<Point, State> {
    readonly kind: "bilattice.relation.matrixEntry";
    readonly point: Point;
    readonly state: State;
    readonly value: ChargeValue;
}
/** A successful matrix lookup. */
export interface RelationMatrixEntryWitness<Point, State> {
    readonly kind: "bilattice.relation.matrixEntry:witness";
    readonly entry: RelationMatrixEntry<Point, State>;
}
/** A failed matrix lookup. */
export interface RelationMatrixEntryObstruction<Point, State> {
    readonly kind: "bilattice.relation.matrixEntry-obstruction";
    readonly point: Point;
    readonly state: State;
}
/** The outcome of a matrix lookup. */
export type RelationMatrixEntryJudgment<Point, State> = RelationMatrixEntryWitness<Point, State> | RelationMatrixEntryObstruction<Point, State>;
/** A relation in sparse matrix form. */
export interface RelationMatrixCarrier<Point, State> {
    readonly kind: "bilattice.relation.matrix";
    readonly points: EntitySet<Point>;
    readonly states: PredicateSet<State>;
    readonly values: readonly RelationMatrixEntry<Point, State>[];
    readonly rank: Natural;
    readonly samePoint: RelationSameness<Point>;
    readonly sameState: RelationSameness<State>;
}
/** One cell of a point's profile. */
export interface PointProfileEntry<State> {
    readonly kind: "bilattice.relation.pointProfileEntry";
    readonly state: State;
    readonly value: ChargeValue;
}
/** The row of a relation for a fixed point. */
export interface PointProfileCarrier<Point, State> {
    readonly kind: "bilattice.relation.pointProfile";
    readonly point: Point;
    readonly entries: readonly PointProfileEntry<State>[];
    readonly rank: Natural;
}
/** One cell of a state's profile. */
export interface StateProfileEntry<Point> {
    readonly kind: "bilattice.relation.stateProfileEntry";
    readonly point: Point;
    readonly value: ChargeValue;
}
/** The column of a relation for a fixed state. */
export interface StateProfileCarrier<Point, State> {
    readonly kind: "bilattice.relation.stateProfile";
    readonly state: State;
    readonly entries: readonly StateProfileEntry<Point>[];
    readonly rank: Natural;
}
/** The extension of a state: the points whose truth coordinate is present. */
export interface StateExtensionCarrier<Point, State> {
    readonly kind: "bilattice.relation.stateExtension";
    readonly state: State;
    readonly points: EntitySet<Point>;
    readonly rank: Natural;
}
/** The forward leg of a relation transform (source point → target point). */
export type RelationForward<SourcePoint, TargetPoint> = (point: SourcePoint) => TargetPoint;
/** The backward leg of a relation transform (target state → source state). */
export type RelationBackward<TargetState, SourceState> = (state: TargetState) => SourceState;
/** The cell-reading function supplied to `relation`. */
export type RelationReadFunction<Point, State> = (point: Point, state: State) => RelationReadJudgment<Point, State>;
/** Construction options for a relation. */
export interface RelationOptions<Point, State> {
    readonly absent?: ChargeValue;
    readonly samePoint: RelationSameness<Point>;
    readonly sameState: RelationSameness<State>;
}
/** An adjoint pair between two relations. */
export interface RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
    readonly kind: "bilattice.relation.transform";
    readonly source: RelationCarrier<SourcePoint, SourceState>;
    readonly target: RelationCarrier<TargetPoint, TargetState>;
    readonly forward: RelationForward<SourcePoint, TargetPoint>;
    readonly backward: RelationBackward<TargetState, SourceState>;
}
/** A transform failure: the forward image of a point falls outside the target. */
export interface RelationTransformForwardDomainObstruction<Point, TargetPoint> {
    readonly kind: "bilattice.relation.transform.forwardDomain-obstruction";
    readonly point: Point;
    readonly mapped: TargetPoint;
}
/** A transform failure: the backward image of a state falls outside the source. */
export interface RelationTransformBackwardDomainObstruction<State, SourceState> {
    readonly kind: "bilattice.relation.transform.backwardDomain-obstruction";
    readonly state: State;
    readonly mapped: SourceState;
}
/** A transform failure: adjointness breaks at a cell. */
export interface RelationTransformAdjointnessObstruction<Point, State> {
    readonly kind: "bilattice.relation.transform.adjointness-obstruction";
    readonly point: Point;
    readonly state: State;
    readonly left: ChargeValue;
    readonly right: ChargeValue;
}
/** A single transform-check failure. */
export type RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState> = RelationTransformForwardDomainObstruction<SourcePoint, TargetPoint> | RelationTransformBackwardDomainObstruction<TargetState, SourceState> | RelationTransformAdjointnessObstruction<SourcePoint, TargetState>;
/** A successful transform check. */
export interface RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState> {
    readonly kind: "bilattice.relation.transform:witness";
    readonly source: RelationCarrier<SourcePoint, SourceState>;
    readonly target: RelationCarrier<TargetPoint, TargetState>;
    readonly forward: RelationForward<SourcePoint, TargetPoint>;
    readonly backward: RelationBackward<TargetState, SourceState>;
}
/** A failed transform check, with the obstruction atoms and their count. */
export interface RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState> {
    readonly kind: "bilattice.relation.transform-obstruction";
    readonly source: RelationCarrier<SourcePoint, SourceState>;
    readonly target: RelationCarrier<TargetPoint, TargetState>;
    readonly failures: readonly RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState>[];
    readonly rank: Natural;
}
/** The outcome of checking a relation transform. */
export type RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState> = RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState> | RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState>;
/** Construct a relation over points and states from a cell-reading function. */
export declare function relation<Point, State>(points: EntitySet<Point>, states: PredicateSet<State>, read: RelationReadFunction<Point, State>, options: RelationOptions<Point, State>): RelationCarrier<Point, State>;
/** A successful relation read of a value at a cell. */
export declare function relationRead<Point, State>(point: Point, state: State, value: ChargeValue): RelationReadWitness<Point, State>;
/** A failed relation read carrying an absent value. */
export declare function relationReadAbsence<Point, State>(point: Point, state: State, absent: ChargeValue): RelationReadObstruction<Point, State>;
/** Build a relation matrix from entries; duplicate coordinates are knowledge-joined. */
export declare function relationMatrix<Point, State>(points: EntitySet<Point>, states: PredicateSet<State>, entries: Iterable<readonly [point: Point, state: State, value: ChargeValue]>, options: Pick<RelationOptions<Point, State>, "samePoint" | "sameState">): RelationMatrixCarrier<Point, State>;
/** Look up the entry at a coordinate in a relation matrix. */
export declare function matrixEntryReading<Point, State>(matrix: RelationMatrixCarrier<Point, State>, point: Point, state: State): RelationMatrixEntryJudgment<Point, State>;
/** Build a relation carrier backed by a relation matrix. */
export declare function relationFromMatrix<Point, State>(matrix: RelationMatrixCarrier<Point, State>, options?: {
    readonly absent?: ChargeValue;
}): RelationCarrier<Point, State>;
/** Type guard for a relation carrier. */
export declare function isRelationCarrier(value: object): value is RelationCarrier<object, object>;
/** The point profile (row) for a point. */
export declare function pointProfile<Point, State>(carrier: RelationCarrier<Point, State>, point: Point): PointProfileCarrier<Point, State>;
/** The state profile (column) for a state. */
export declare function stateProfile<Point, State>(carrier: RelationCarrier<Point, State>, state: State): StateProfileCarrier<Point, State>;
/** The extension of a state: the points whose value is potential or stable. */
export declare function stateExtension<Point, State>(carrier: RelationCarrier<Point, State>, state: State): StateExtensionCarrier<Point, State>;
/** Swap points and states (the matrix transpose). */
export declare function transpose<Point, State>(carrier: RelationCarrier<Point, State>): RelationCarrier<State, Point>;
/** Swap points and states and negate every value (the Chu dual). */
export declare function dual<Point, State>(carrier: RelationCarrier<Point, State>): RelationCarrier<State, Point>;
/** Fold a state's profile to a single charge value. */
export declare function settleStateProfile<Point, State>(carrier: RelationCarrier<Point, State>, state: State, join?: (left: ChargeValue, right: ChargeValue) => ChargeValue, identity?: ChargeValue): ChargeValue;
/** Fold a point's profile to a single charge value. */
export declare function settlePointProfile<Point, State>(carrier: RelationCarrier<Point, State>, point: Point, join?: (left: ChargeValue, right: ChargeValue) => ChargeValue, identity?: ChargeValue): ChargeValue;
/** Check whether forward/backward form an adjoint transform.
 *
 * This is the total inspection form of `relationTransform`: it never throws.
 * Domain failures are reported before cell equality is inspected; otherwise each
 * failed FOUR equality becomes an adjointness obstruction atom. The rank is an
 * exact natural, not a native number counter.
 */
export declare function checkRelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(source: RelationCarrier<SourcePoint, SourceState>, target: RelationCarrier<TargetPoint, TargetState>, forward: RelationForward<SourcePoint, TargetPoint>, backward: RelationBackward<TargetState, SourceState>): RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState>;
/** Construct a relation transform after checking adjointness; throws if not adjoint. */
export declare function relationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(source: RelationCarrier<SourcePoint, SourceState>, target: RelationCarrier<TargetPoint, TargetState>, forward: RelationForward<SourcePoint, TargetPoint>, backward: RelationBackward<TargetState, SourceState>): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>;
/** Type guard for a relation transform. */
export declare function isRelationTransform(value: object): value is RelationTransform<object, object, object, object>;
/** The identity transform on a carrier. */
export declare function idTransform<Point, State>(carrier: RelationCarrier<Point, State>): RelationTransform<Point, State, Point, State>;
/** Compose two transforms sharing an object (left.target === right.source). */
export declare function composeTransforms<SourcePoint, SourceState, MiddlePoint, MiddleState, TargetPoint, TargetState>(left: RelationTransform<SourcePoint, SourceState, MiddlePoint, MiddleState>, right: RelationTransform<MiddlePoint, MiddleState, TargetPoint, TargetState>): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>;
/** The dual of a transform (forward becomes backward over the duals). */
export declare function dualTransform<SourcePoint, SourceState, TargetPoint, TargetState>(transform: RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>): RelationTransform<TargetState, TargetPoint, SourceState, SourcePoint>;
