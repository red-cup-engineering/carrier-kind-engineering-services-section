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
import { asChargeValue, chargeValue, sameChargeValue, negateValue, joinKnowledgeValue, } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import {} from "./predication.mjs";
import { count } from "./positing/settling/analysis/exact-number.mjs";
/** Construct a relation over points and states from a cell-reading function. */
export function relation(points, states, read, options) {
    const samePoint = options.samePoint;
    const sameState = options.sameState;
    const absent = asChargeValue(options.absent ?? chargeValue("active"));
    const carrierRead = (point, state) => {
        if (!states.predicates.some((candidate) => sameState(candidate, state))) {
            return Object.freeze({ kind: "bilattice.relation.read-obstruction", point, state, absent });
        }
        return read(point, state);
    };
    return Object.freeze({
        kind: "bilattice.relation.carrier",
        points,
        states,
        absent,
        samePoint,
        sameState,
        read: carrierRead,
        at: (point, state) => {
            const reading = carrierRead(point, state);
            return reading.kind === "bilattice.relation.read:witness" ? asChargeValue(reading.value) : reading.absent;
        },
    });
}
/** A successful relation read of a value at a cell. */
export function relationRead(point, state, value) {
    return Object.freeze({ kind: "bilattice.relation.read:witness", point, state, value: asChargeValue(value) });
}
/** A failed relation read carrying an absent value. */
export function relationReadAbsence(point, state, absent) {
    return Object.freeze({ kind: "bilattice.relation.read-obstruction", point, state, absent: asChargeValue(absent) });
}
/** Build a relation matrix from entries; duplicate coordinates are knowledge-joined. */
export function relationMatrix(points, states, entries, options) {
    const samePoint = options.samePoint;
    const sameState = options.sameState;
    const values = [];
    for (const [point, state, value] of entries) {
        const existing = values.find((entry) => samePoint(entry.point, point) && sameState(entry.state, state));
        const entry = Object.freeze({
            kind: "bilattice.relation.matrixEntry",
            point,
            state,
            value: existing ? joinKnowledgeValue(existing.value, asChargeValue(value)) : asChargeValue(value),
        });
        if (existing)
            values.splice(values.indexOf(existing), 1, entry);
        else
            values.push(entry);
    }
    return Object.freeze({
        kind: "bilattice.relation.matrix",
        points,
        states,
        values: Object.freeze(values),
        rank: count(values),
        samePoint,
        sameState,
    });
}
/** Look up the entry at a coordinate in a relation matrix. */
export function matrixEntryReading(matrix, point, state) {
    const entry = matrix.values.find((candidate) => matrix.samePoint(candidate.point, point) && matrix.sameState(candidate.state, state));
    return entry
        ? Object.freeze({ kind: "bilattice.relation.matrixEntry:witness", entry })
        : Object.freeze({ kind: "bilattice.relation.matrixEntry-obstruction", point, state });
}
/** Build a relation carrier backed by a relation matrix. */
export function relationFromMatrix(matrix, options = {}) {
    return relation(matrix.points, matrix.states, (point, state) => {
        const reading = matrixEntryReading(matrix, point, state);
        return reading.kind === "bilattice.relation.matrixEntry:witness"
            ? relationRead(point, state, reading.entry.value)
            : relationReadAbsence(point, state, asChargeValue(options.absent ?? chargeValue("active")));
    }, { ...options, samePoint: matrix.samePoint, sameState: matrix.sameState });
}
/** Type guard for a relation carrier. */
export function isRelationCarrier(value) {
    return "kind" in value && value.kind === "bilattice.relation.carrier";
}
/** The point profile (row) for a point. */
export function pointProfile(carrier, point) {
    const entries = Object.freeze(carrier.states.predicates.map((state) => Object.freeze({
        kind: "bilattice.relation.pointProfileEntry",
        state,
        value: carrier.at(point, state),
    })));
    return Object.freeze({ kind: "bilattice.relation.pointProfile", point, entries, rank: count(entries) });
}
/** The state profile (column) for a state. */
export function stateProfile(carrier, state) {
    const entries = Object.freeze(carrier.points.entities.map((point) => Object.freeze({
        kind: "bilattice.relation.stateProfileEntry",
        point,
        value: carrier.at(point, state),
    })));
    return Object.freeze({ kind: "bilattice.relation.stateProfile", state, entries, rank: count(entries) });
}
/** The extension of a state: the points whose value is potential or stable. */
export function stateExtension(carrier, state) {
    const points = Object.freeze(stateProfile(carrier, state).entries.filter((entry) => sameChargeValue(entry.value, chargeValue("potential")) || sameChargeValue(entry.value, chargeValue("stable"))).map((entry) => entry.point));
    return Object.freeze({
        kind: "bilattice.relation.stateExtension",
        state,
        points: Object.freeze({ kind: "predication.entitySet", entities: points }),
        rank: count(points),
    });
}
/** Swap points and states (the matrix transpose). */
export function transpose(carrier) {
    return relation({ kind: "predication.entitySet", entities: carrier.states.predicates }, { kind: "predication.predicateSet", predicates: carrier.points.entities }, (state, point) => relationRead(state, point, carrier.at(point, state)), { absent: carrier.absent, samePoint: carrier.sameState, sameState: carrier.samePoint });
}
/** Swap points and states and negate every value (the Chu dual). */
export function dual(carrier) {
    return relation({ kind: "predication.entitySet", entities: carrier.states.predicates }, { kind: "predication.predicateSet", predicates: carrier.points.entities }, (state, point) => relationRead(state, point, negateValue(carrier.at(point, state))), { absent: negateValue(carrier.absent), samePoint: carrier.sameState, sameState: carrier.samePoint });
}
/** Fold a state's profile to a single charge value. */
export function settleStateProfile(carrier, state, join = joinKnowledgeValue, identity = chargeValue("absurd")) {
    return stateProfile(carrier, state).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}
/** Fold a point's profile to a single charge value. */
export function settlePointProfile(carrier, point, join = joinKnowledgeValue, identity = chargeValue("absurd")) {
    return pointProfile(carrier, point).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}
/** Check whether forward/backward form an adjoint transform.
 *
 * This is the total inspection form of `relationTransform`: it never throws.
 * Domain failures are reported before cell equality is inspected; otherwise each
 * failed FOUR equality becomes an adjointness obstruction atom. The rank is an
 * exact natural, not a native number counter.
 */
export function checkRelationTransform(source, target, forward, backward) {
    const failures = [];
    for (const point of source.points.entities) {
        const mapped = forward(point);
        if (!target.points.entities.some((candidate) => target.samePoint(candidate, mapped))) {
            failures.push(Object.freeze({ kind: "bilattice.relation.transform.forwardDomain-obstruction", point, mapped }));
        }
    }
    for (const state of target.states.predicates) {
        const mapped = backward(state);
        if (!source.states.predicates.some((candidate) => source.sameState(candidate, mapped))) {
            failures.push(Object.freeze({ kind: "bilattice.relation.transform.backwardDomain-obstruction", state, mapped }));
        }
    }
    if (failures.length > 0) {
        return Object.freeze({ kind: "bilattice.relation.transform-obstruction", source, target, failures: Object.freeze(failures), rank: count(failures) });
    }
    for (const point of source.points.entities) {
        for (const state of target.states.predicates) {
            const left = target.at(forward(point), state);
            const right = source.at(point, backward(state));
            if (!sameChargeValue(left, right)) {
                failures.push(Object.freeze({ kind: "bilattice.relation.transform.adjointness-obstruction", point, state, left, right }));
            }
        }
    }
    if (failures.length > 0) {
        return Object.freeze({ kind: "bilattice.relation.transform-obstruction", source, target, failures: Object.freeze(failures), rank: count(failures) });
    }
    return Object.freeze({ kind: "bilattice.relation.transform:witness", source, target, forward, backward });
}
/** Construct a relation transform after checking adjointness; throws if not adjoint. */
export function relationTransform(source, target, forward, backward) {
    const check = checkRelationTransform(source, target, forward, backward);
    if (check.kind === "bilattice.relation.transform-obstruction")
        throw new TypeError(`relationTransform: not adjoint (${check.failures.length} violation(s))`);
    return Object.freeze({ kind: "bilattice.relation.transform", source, target, forward, backward });
}
/** Type guard for a relation transform. */
export function isRelationTransform(value) {
    return "kind" in value && value.kind === "bilattice.relation.transform";
}
/** The identity transform on a carrier. */
export function idTransform(carrier) {
    return relationTransform(carrier, carrier, (point) => point, (state) => state);
}
/** Compose two transforms sharing an object (left.target === right.source). */
export function composeTransforms(left, right) {
    if (left.target !== right.source)
        throw new TypeError("composeTransforms: left.target must be right.source");
    return relationTransform(left.source, right.target, (point) => right.forward(left.forward(point)), (state) => left.backward(right.backward(state)));
}
/** The dual of a transform (forward becomes backward over the duals). */
export function dualTransform(transform) {
    return relationTransform(dual(transform.target), dual(transform.source), transform.backward, transform.forward);
}
