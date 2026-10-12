/**
 * predicating/bilattice-relation — four-valued relations as Chu-style matrices.
 *
 * A relation is a matrix of charge values over points × states, read with
 * witness/obstruction judgments. Point and state profiles are its rows and
 * columns; a state's extension is the points it charges present. `transpose`
 * swaps points and states; `dual` swaps and negates (the Chu involution). A
 * `RelationTransform` is an adjoint pair (forward on points, backward on states)
 * checked cell-by-cell. The check returns either a transform witness or a ranked
 * obstruction relation whose atoms name domain or adjointness failures; successful
 * transforms compose and dualize. Self-contained over the charge algebra and the
 * exact `count`.
 */
import {
  asChargeValue,
  chargeValue,
  sameChargeValue,
  negateValue,
  joinKnowledgeValue,
  truthLeq,
  type ChargeValue,
  type OrderLeqJudgment,
} from "../../values/index.mts";
import { type EntitySet, type PredicateSet } from "./predication.mts";
import { count, type Natural } from "../../math/rational/exact-number.mts";

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
export interface BilatticeRelation<Point, State> {
  readonly kind: "bilattice.relation";
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
export interface RelationMatrix<Point, State> {
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
export interface PointProfile<Point, State> {
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
export interface StateProfile<Point, State> {
  readonly kind: "bilattice.relation.stateProfile";
  readonly state: State;
  readonly entries: readonly StateProfileEntry<Point>[];
  readonly rank: Natural;
}

/** The extension of a state: the points whose truth coordinate is present. */
export interface StateExtension<Point, State> {
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
  readonly source: BilatticeRelation<SourcePoint, SourceState>;
  readonly target: BilatticeRelation<TargetPoint, TargetState>;
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
export type RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState> =
  | RelationTransformForwardDomainObstruction<SourcePoint, TargetPoint>
  | RelationTransformBackwardDomainObstruction<TargetState, SourceState>
  | RelationTransformAdjointnessObstruction<SourcePoint, TargetState>;

/** A successful transform check. */
export interface RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState> {
  readonly kind: "bilattice.relation.transform:witness";
  readonly source: BilatticeRelation<SourcePoint, SourceState>;
  readonly target: BilatticeRelation<TargetPoint, TargetState>;
  readonly forward: RelationForward<SourcePoint, TargetPoint>;
  readonly backward: RelationBackward<TargetState, SourceState>;
}

/** A failed transform check, with the obstruction atoms and their count. */
export interface RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState> {
  readonly kind: "bilattice.relation.transform-obstruction";
  readonly source: BilatticeRelation<SourcePoint, SourceState>;
  readonly target: BilatticeRelation<TargetPoint, TargetState>;
  readonly failures: readonly RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState>[];
  readonly rank: Natural;
}

/** The outcome of checking a relation transform. */
export type RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState> =
  | RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState>
  | RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState>;

/** One context-cell comparison used when reading play/game dominance. */
export interface PointTruthDominanceCell<State> {
  readonly kind: "bilattice.relation.pointTruthDominanceCell";
  readonly state: State;
  readonly dominatedValue: ChargeValue;
  readonly dominatingValue: ChargeValue;
  readonly judgment: OrderLeqJudgment;
}

/** A point named for dominance was not present in the relation. */
export interface PointTruthDominanceDomainObstruction<Point> {
  readonly kind: "bilattice.relation.pointTruthDominance.domain-obstruction";
  readonly role: "dominated" | "dominating";
  readonly point: Point;
}

/** A context where the candidate dominating point does not truth-dominate. */
export interface PointTruthDominanceContextObstruction<State> {
  readonly kind: "bilattice.relation.pointTruthDominance.context-obstruction";
  readonly cell: PointTruthDominanceCell<State>;
}

/** A single obstruction atom for point truth-dominance. */
export type PointTruthDominanceObstructionAtom<Point, State> =
  | PointTruthDominanceDomainObstruction<Point>
  | PointTruthDominanceContextObstruction<State>;

/** A witness that one point truth-dominates another across all states. */
export interface PointTruthDominanceWitness<Point, State> {
  readonly kind: "bilattice.relation.pointTruthDominance:witness";
  readonly relation: BilatticeRelation<Point, State>;
  readonly dominated: Point;
  readonly dominating: Point;
  readonly cells: readonly PointTruthDominanceCell<State>[];
  readonly rank: Natural;
}

/** A failed point truth-dominance read, carrying the exact obstructing cells. */
export interface PointTruthDominanceObstruction<Point, State> {
  readonly kind: "bilattice.relation.pointTruthDominance-obstruction";
  readonly relation: BilatticeRelation<Point, State>;
  readonly dominated: Point;
  readonly dominating: Point;
  readonly failures: readonly PointTruthDominanceObstructionAtom<Point, State>[];
  readonly rank: Natural;
}

/** The outcome of checking whether one point truth-dominates another. */
export type PointTruthDominanceJudgment<Point, State> =
  | PointTruthDominanceWitness<Point, State>
  | PointTruthDominanceObstruction<Point, State>;

/** The undominated play frontier of a relation under point truth-dominance. */
export interface TruthDominanceFrontier<Point, State> {
  readonly kind: "bilattice.relation.truthDominanceFrontier";
  readonly relation: BilatticeRelation<Point, State>;
  readonly points: EntitySet<Point>;
  readonly dominated: readonly PointTruthDominanceWitness<Point, State>[];
  readonly rank: Natural;
}

/** Construct a relation over points and states from a cell-reading function. */
export function relation<Point, State>(
  points: EntitySet<Point>,
  states: PredicateSet<State>,
  read: RelationReadFunction<Point, State>,
  options: RelationOptions<Point, State>,
): BilatticeRelation<Point, State> {
  const samePoint = options.samePoint;
  const sameState = options.sameState;
  const absent = asChargeValue(options.absent ?? chargeValue("unknown"));
  const readCell = (point: Point, state: State): RelationReadJudgment<Point, State> => {
    if (!states.predicates.some((candidate) => sameState(candidate, state))) {
      return Object.freeze({ kind: "bilattice.relation.read-obstruction" as const, point, state, absent });
    }
    return read(point, state);
  };
  return Object.freeze({
    kind: "bilattice.relation" as const,
    points,
    states,
    absent,
    samePoint,
    sameState,
    read: readCell,
    at: (point: Point, state: State): ChargeValue => {
      const reading = readCell(point, state);
      return reading.kind === "bilattice.relation.read:witness" ? asChargeValue(reading.value) : reading.absent;
    },
  });
}

/** A successful relation read of a value at a cell. */
export function relationRead<Point, State>(point: Point, state: State, value: ChargeValue): RelationReadWitness<Point, State> {
  return Object.freeze({ kind: "bilattice.relation.read:witness" as const, point, state, value: asChargeValue(value) });
}

/** A failed relation read carrying an absent value. */
export function relationReadAbsence<Point, State>(point: Point, state: State, absent: ChargeValue): RelationReadObstruction<Point, State> {
  return Object.freeze({ kind: "bilattice.relation.read-obstruction" as const, point, state, absent: asChargeValue(absent) });
}

/** Build a relation matrix from entries; duplicate coordinates are knowledge-joined. */
export function relationMatrix<Point, State>(
  points: EntitySet<Point>,
  states: PredicateSet<State>,
  entries: Iterable<readonly [point: Point, state: State, value: ChargeValue]>,
  options: Pick<RelationOptions<Point, State>, "samePoint" | "sameState">,
): RelationMatrix<Point, State> {
  const samePoint = options.samePoint;
  const sameState = options.sameState;
  const values: RelationMatrixEntry<Point, State>[] = [];
  for (const [point, state, value] of entries) {
    const existing = values.find((entry) => samePoint(entry.point, point) && sameState(entry.state, state));
    const entry = Object.freeze({
      kind: "bilattice.relation.matrixEntry" as const,
      point,
      state,
      value: existing ? joinKnowledgeValue(existing.value, asChargeValue(value)) : asChargeValue(value),
    });
    if (existing) values.splice(values.indexOf(existing), 1, entry);
    else values.push(entry);
  }
  return Object.freeze({
    kind: "bilattice.relation.matrix" as const,
    points,
    states,
    values: Object.freeze(values),
    rank: count(values),
    samePoint,
    sameState,
  });
}

/** Look up the entry at a coordinate in a relation matrix. */
export function matrixEntryReading<Point, State>(
  matrix: RelationMatrix<Point, State>,
  point: Point,
  state: State,
): RelationMatrixEntryJudgment<Point, State> {
  const entry = matrix.values.find((candidate) => matrix.samePoint(candidate.point, point) && matrix.sameState(candidate.state, state));
  return entry
    ? Object.freeze({ kind: "bilattice.relation.matrixEntry:witness" as const, entry })
    : Object.freeze({ kind: "bilattice.relation.matrixEntry-obstruction" as const, point, state });
}

/** Build a relation relation backed by a relation matrix. */
export function relationFromMatrix<Point, State>(
  matrix: RelationMatrix<Point, State>,
  options: { readonly absent?: ChargeValue } = {},
): BilatticeRelation<Point, State> {
  return relation(
    matrix.points,
    matrix.states,
    (point, state) => {
      const reading = matrixEntryReading(matrix, point, state);
      return reading.kind === "bilattice.relation.matrixEntry:witness"
        ? relationRead(point, state, reading.entry.value)
        : relationReadAbsence(point, state, asChargeValue(options.absent ?? chargeValue("unknown")));
    },
    { ...options, samePoint: matrix.samePoint, sameState: matrix.sameState },
  );
}

/** Type guard for a bilattice relation. */
export function isBilatticeRelation(value: object): value is BilatticeRelation<object, object> {
  return "kind" in value && value.kind === "bilattice.relation";
}

/** The point profile (row) for a point. */
export function pointProfile<Point, State>(relation: BilatticeRelation<Point, State>, point: Point): PointProfile<Point, State> {
  const entries = Object.freeze(relation.states.predicates.map((state) => Object.freeze({
    kind: "bilattice.relation.pointProfileEntry" as const,
    state,
    value: relation.at(point, state),
  })));
  return Object.freeze({ kind: "bilattice.relation.pointProfile" as const, point, entries, rank: count(entries) });
}

/** The state profile (column) for a state. */
export function stateProfile<Point, State>(relation: BilatticeRelation<Point, State>, state: State): StateProfile<Point, State> {
  const entries = Object.freeze(relation.points.entities.map((point) => Object.freeze({
    kind: "bilattice.relation.stateProfileEntry" as const,
    point,
    value: relation.at(point, state),
  })));
  return Object.freeze({ kind: "bilattice.relation.stateProfile" as const, state, entries, rank: count(entries) });
}

/** The extension of a state: the points whose value is held or contested. */
export function stateExtension<Point, State>(relation: BilatticeRelation<Point, State>, state: State): StateExtension<Point, State> {
  const points = Object.freeze(stateProfile(relation, state).entries.filter((entry) =>
    sameChargeValue(entry.value, chargeValue("held")) || sameChargeValue(entry.value, chargeValue("contested"))).map((entry) => entry.point));
  return Object.freeze({
    kind: "bilattice.relation.stateExtension" as const,
    state,
    points: Object.freeze({ kind: "predication.entitySet" as const, entities: points }),
    rank: count(points),
  });
}

/** Swap points and states (the matrix transpose). */
export function transpose<Point, State>(relationValue: BilatticeRelation<Point, State>): BilatticeRelation<State, Point> {
  return relation(
    { kind: "predication.entitySet" as const, entities: relationValue.states.predicates },
    { kind: "predication.predicateSet" as const, predicates: relationValue.points.entities },
    (state, point) => relationRead(state, point, relationValue.at(point, state)),
    { absent: relationValue.absent, samePoint: relationValue.sameState, sameState: relationValue.samePoint },
  );
}

/** Swap points and states and negate every value (the Chu dual). */
export function dual<Point, State>(relationValue: BilatticeRelation<Point, State>): BilatticeRelation<State, Point> {
  return relation(
    { kind: "predication.entitySet" as const, entities: relationValue.states.predicates },
    { kind: "predication.predicateSet" as const, predicates: relationValue.points.entities },
    (state, point) => relationRead(state, point, negateValue(relationValue.at(point, state))),
    { absent: negateValue(relationValue.absent), samePoint: relationValue.sameState, sameState: relationValue.samePoint },
  );
}

/** Fold a state's profile to a single charge value. */
export function settleStateProfile<Point, State>(
  relation: BilatticeRelation<Point, State>,
  state: State,
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue = joinKnowledgeValue,
  identity: ChargeValue = chargeValue("unknown"),
): ChargeValue {
  return stateProfile(relation, state).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}

/** Fold a point's profile to a single charge value. */
export function settlePointProfile<Point, State>(
  relation: BilatticeRelation<Point, State>,
  point: Point,
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue = joinKnowledgeValue,
  identity: ChargeValue = chargeValue("unknown"),
): ChargeValue {
  return pointProfile(relation, point).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}

/** Check whether `dominating` is at least `dominated` in the truth order for every state.
 *
 * This is the native finite play/game read over a FOUR-valued relation: points
 * are moves, strategies, actors, or positions; states are the contexts that test
 * them; each cell is the charge read in that context. A dominance witness means
 * every context preserves the truth-order inequality. An obstruction names the
 * missing point or the exact context cells where the inequality fails.
 */
export function checkPointTruthDominance<Point, State>(
  relation: BilatticeRelation<Point, State>,
  dominated: Point,
  dominating: Point,
): PointTruthDominanceJudgment<Point, State> {
  const failures: PointTruthDominanceObstructionAtom<Point, State>[] = [];
  const dominatedPresent = relation.points.entities.some((candidate) => relation.samePoint(candidate, dominated));
  const dominatingPresent = relation.points.entities.some((candidate) => relation.samePoint(candidate, dominating));
  if (!dominatedPresent) failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.domain-obstruction" as const, role: "dominated" as const, point: dominated }));
  if (!dominatingPresent) failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.domain-obstruction" as const, role: "dominating" as const, point: dominating }));
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.pointTruthDominance-obstruction" as const, relation, dominated, dominating, failures: Object.freeze(failures), rank: count(failures) });
  }

  const cells: PointTruthDominanceCell<State>[] = [];
  for (const state of relation.states.predicates) {
    const dominatedValue = relation.at(dominated, state);
    const dominatingValue = relation.at(dominating, state);
    const judgment = truthLeq(dominatedValue, dominatingValue);
    const cell = Object.freeze({
      kind: "bilattice.relation.pointTruthDominanceCell" as const,
      state,
      dominatedValue,
      dominatingValue,
      judgment,
    });
    cells.push(cell);
    if (judgment.kind === "charge.orderLeq-obstruction") {
      failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.context-obstruction" as const, cell }));
    }
  }
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.pointTruthDominance-obstruction" as const, relation, dominated, dominating, failures: Object.freeze(failures), rank: count(failures) });
  }
  return Object.freeze({ kind: "bilattice.relation.pointTruthDominance:witness" as const, relation, dominated, dominating, cells: Object.freeze(cells), rank: count(cells) });
}

/** Read the points not truth-dominated by any distinct point in the same relation. */
export function truthDominanceFrontier<Point, State>(
  relation: BilatticeRelation<Point, State>,
): TruthDominanceFrontier<Point, State> {
  const dominated: PointTruthDominanceWitness<Point, State>[] = [];
  const frontier = relation.points.entities.filter((point) => {
    for (const candidate of relation.points.entities) {
      if (relation.samePoint(point, candidate)) continue;
      const judgment = checkPointTruthDominance(relation, point, candidate);
      if (judgment.kind === "bilattice.relation.pointTruthDominance:witness") {
        dominated.push(judgment);
        return false;
      }
    }
    return true;
  });
  return Object.freeze({
    kind: "bilattice.relation.truthDominanceFrontier" as const,
    relation,
    points: Object.freeze({ kind: "predication.entitySet" as const, entities: Object.freeze(frontier) }),
    dominated: Object.freeze(dominated),
    rank: count(frontier),
  });
}

/** Check whether forward/backward form an adjoint transform.
 *
 * This is the total inspection form of `relationTransform`: it never throws.
 * Domain failures are reported before cell equality is inspected; otherwise each
 * failed FOUR equality becomes an adjointness obstruction atom. The rank is an
 * exact natural, not a native number counter.
 */
export function checkRelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  source: BilatticeRelation<SourcePoint, SourceState>,
  target: BilatticeRelation<TargetPoint, TargetState>,
  forward: RelationForward<SourcePoint, TargetPoint>,
  backward: RelationBackward<TargetState, SourceState>,
): RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState> {
  const failures: RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState>[] = [];
  for (const point of source.points.entities) {
    const mapped = forward(point);
    if (!target.points.entities.some((candidate) => target.samePoint(candidate, mapped))) {
      failures.push(Object.freeze({ kind: "bilattice.relation.transform.forwardDomain-obstruction" as const, point, mapped }));
    }
  }
  for (const state of target.states.predicates) {
    const mapped = backward(state);
    if (!source.states.predicates.some((candidate) => source.sameState(candidate, mapped))) {
      failures.push(Object.freeze({ kind: "bilattice.relation.transform.backwardDomain-obstruction" as const, state, mapped }));
    }
  }
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.transform-obstruction" as const, source, target, failures: Object.freeze(failures), rank: count(failures) });
  }
  for (const point of source.points.entities) {
    for (const state of target.states.predicates) {
      const left = target.at(forward(point), state);
      const right = source.at(point, backward(state));
      if (!sameChargeValue(left, right)) {
        failures.push(Object.freeze({ kind: "bilattice.relation.transform.adjointness-obstruction" as const, point, state, left, right }));
      }
    }
  }
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.transform-obstruction" as const, source, target, failures: Object.freeze(failures), rank: count(failures) });
  }
  return Object.freeze({ kind: "bilattice.relation.transform:witness" as const, source, target, forward, backward });
}

/** Construct a relation transform after checking adjointness; throws if not adjoint. */
export function relationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  source: BilatticeRelation<SourcePoint, SourceState>,
  target: BilatticeRelation<TargetPoint, TargetState>,
  forward: RelationForward<SourcePoint, TargetPoint>,
  backward: RelationBackward<TargetState, SourceState>,
): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
  const check = checkRelationTransform(source, target, forward, backward);
  if (check.kind === "bilattice.relation.transform-obstruction") throw new TypeError(`relationTransform: not adjoint (${check.failures.length} violation(s))`);
  return Object.freeze({ kind: "bilattice.relation.transform" as const, source, target, forward, backward });
}

/** Type guard for a relation transform. */
export function isRelationTransform(value: object): value is RelationTransform<object, object, object, object> {
  return "kind" in value && value.kind === "bilattice.relation.transform";
}

/** The identity transform on a relation. */
export function idTransform<Point, State>(relationValue: BilatticeRelation<Point, State>): RelationTransform<Point, State, Point, State> {
  return relationTransform(relationValue, relationValue, (point) => point, (state) => state);
}

/** Compose two transforms sharing an object (left.target === right.source). */
export function composeTransforms<SourcePoint, SourceState, MiddlePoint, MiddleState, TargetPoint, TargetState>(
  left: RelationTransform<SourcePoint, SourceState, MiddlePoint, MiddleState>,
  right: RelationTransform<MiddlePoint, MiddleState, TargetPoint, TargetState>,
): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
  if (left.target !== right.source) throw new TypeError("composeTransforms: left.target must be right.source");
  return relationTransform(
    left.source,
    right.target,
    (point) => right.forward(left.forward(point)),
    (state) => left.backward(right.backward(state)),
  );
}

/** The dual of a transform (forward becomes backward over the duals). */
export function dualTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  transform: RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>,
): RelationTransform<TargetState, TargetPoint, SourceState, SourcePoint> {
  return relationTransform(
    dual(transform.target),
    dual(transform.source),
    transform.backward,
    transform.forward,
  );
}
