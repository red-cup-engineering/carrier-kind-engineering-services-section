import { readingAs, readingFamilies, readingSchema, samePoint, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { fusionReading, knowledgeJoinReading, negateReading, residuumReading, truthLeqReading } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/bilattice";
// === the Chu space carrier ====================================================================
/** A Chu space valued in FOUR: two named carriers and a dense matrix of readings (knowledge family). */
export const ChuSpaceSchema = {
    type: "object",
    required: ["kind", "points", "states", "absent", "matrix"],
    properties: {
        kind: { const: "linearLogicChu.space" },
        points: { type: "array", items: { type: "string" } },
        states: { type: "array", items: { type: "string" } },
        absent: readingSchema("knowledge"),
        matrix: { type: "array", items: { type: "array", items: readingSchema("knowledge") } },
    },
    description: "A Chu space valued in FOUR: the points (rows), the states (columns), the reading a read outside the matrix returns, and the dense matrix r : points × states → FOUR.",
    additionalProperties: false,
};
const admitReading = (reading) => readingAs("knowledge", reading);
const names = (carrier, label) => {
    const out = [];
    for (const name of carrier) {
        if (typeof name !== "string" || name === "")
            throw new TypeError(`${label} must be non-empty strings`);
        if (out.includes(name))
            throw new TypeError(`${label} must not repeat ${JSON.stringify(name)}`);
        out.push(name);
    }
    return Object.freeze(out);
};
/**
 * Build a Chu space from a value function. Points and states are frozen in the
 * given order, so row and column reads are deterministic. A cell whose state is
 * outside the state carrier, or whose `readingAt` returns null/undefined, reads
 * as `absent` (default `absurd` — the open-world "nothing witnessed here").
 */
export function chuSpace(points, states, readingAt, options = {}) {
    const P = names(points, "chuSpace: points");
    const X = names(states, "chuSpace: states");
    const absent = admitReading(options.absent ?? "absurd");
    const matrix = Object.freeze(P.map((point) => Object.freeze(X.map((state) => {
        const reading = readingAt(point, state);
        return reading == null ? absent : admitReading(reading);
    }))));
    return Object.freeze({
        kind: "linearLogicChu.space",
        points: P,
        states: X,
        absent,
        matrix,
    });
}
/** Build a Chu space from an explicit `{ [point]: { [state]: reading } }` matrix. */
export function chuSpaceOfMatrix(points, states, matrix, options = {}) {
    return chuSpace(points, states, (point, state) => (Object.hasOwn(matrix, point) && Object.hasOwn(matrix[point], state) ? matrix[point][state] : undefined), options);
}
/** Whether a value is a Chu space built by this module. */
export function isChuSpace(value) {
    return !!value && typeof value === "object" && value.kind === "linearLogicChu.space";
}
// === the matrix read ==========================================================================
/** `r a x` — the reading at one point/state pair; `absent` outside the matrix. */
export function at(space, point, state) {
    const a = space.points.indexOf(point);
    if (a < 0)
        return space.absent;
    const x = space.states.indexOf(state);
    if (x < 0)
        return space.absent;
    return space.matrix[a][x];
}
/** A point's costate: its reading across every state (a row of the matrix). */
export function row(space, point) {
    return Object.freeze(space.states.map((state) => Object.freeze({ state, reading: at(space, point, state) })));
}
/** A state's extension-with-readings: every point's reading on it (a column). */
export function col(space, state) {
    return Object.freeze(space.points.map((point) => Object.freeze({ point, reading: at(space, point, state) })));
}
/**
 * The positive extension of a state: the points whose reading is `potential` —
 * truth present, falsity absent, the truth-order top of FOUR.
 */
export function extension(space, state) {
    return Object.freeze(col(space, state).filter((cell) => cell.reading === "potential").map((cell) => cell.point));
}
// === the duality ==============================================================================
/** Transpose: swap points and states, transpose the matrix. `transpose ∘ transpose = id`. */
export function transpose(space) {
    return chuSpace(space.states, space.points, (state, point) => at(space, point, state), { absent: space.absent });
}
/**
 * `Obsmetrologia.ChuSpace.dual` — the linear-logic dual `(–)^⊥`: transpose the
 * matrix (`points ↔ states`) AND negate every entry. `absent` is negated
 * too, so the round trip is exact off the matrix as well.
 */
export function dual(space) {
    return chuSpace(space.states, space.points, (state, point) => negateReading(at(space, point, state)), {
        absent: negateReading(space.absent),
    });
}
/** Whether two entries name the same point of FOUR. */
export const sameChuReading = samePoint;
/** Whether two Chu spaces are the same structure — the executable form of the Lean equality. */
export function sameChuSpace(left, right) {
    if (left.points.length !== right.points.length || left.states.length !== right.states.length)
        return false;
    if (!left.points.every((point, index) => point === right.points[index]))
        return false;
    if (!left.states.every((state, index) => state === right.states[index]))
        return false;
    if (!sameChuReading(left.absent, right.absent))
        return false;
    return left.points.every((_point, a) => left.states.every((_state, x) => sameChuReading(left.matrix[a][x], right.matrix[a][x])));
}
// === settling a line through a bilattice morphism =============================================
/** Fold a column to one reading through a bilattice join (default ⊕, identity ⊥). */
export function settleColumn(space, state, join = knowledgeJoinReading, identity = "absurd") {
    return col(space, state).reduce((accumulated, cell) => join(accumulated, cell.reading), identity);
}
/** Fold a row to one reading through a bilattice join (default ⊕, identity ⊥). */
export function settleRow(space, point, join = knowledgeJoinReading, identity = "absurd") {
    return row(space, point).reduce((accumulated, cell) => join(accumulated, cell.reading), identity);
}
/** A point's witnesses: its settled reading (the knowledge join of its row) and the states whose
 *  entry tells it for, and against — the two sides as coordinates, each sorted. */
export function pointWitnesses(space, point) {
    const line = row(space, point);
    const telling = (side) => line.filter((cell) => sidesOfReading(cell.reading)[side]).map((cell) => String(cell.state)).sort();
    return Object.freeze({ settled: settleRow(space, point), for: Object.freeze(telling(0)), against: Object.freeze(telling(1)) });
}
/**
 * Check a candidate adjoint pair `source → target`. Both legs must stay in their
 * carriers (forward into `target.points`, backward into `source.states`), and
 * the adjointness equality must hold as an identity of readings on every cell.
 */
export function checkChuMap(source, target, forward, backward) {
    const failures = [];
    for (const point of source.points) {
        const mapped = forward(point);
        if (!target.points.includes(mapped)) {
            failures.push(Object.freeze({ kind: "linearLogicChu.chuMap.domain-failure", leg: "forward", from: point, mapped }));
        }
    }
    for (const state of target.states) {
        const mapped = backward(state);
        if (!source.states.includes(mapped)) {
            failures.push(Object.freeze({ kind: "linearLogicChu.chuMap.domain-failure", leg: "backward", from: state, mapped }));
        }
    }
    if (failures.length === 0) {
        for (const point of source.points) {
            for (const state of target.states) {
                const left = at(target, forward(point), state);
                const right = at(source, point, backward(state));
                if (left !== right) {
                    failures.push(Object.freeze({
                        kind: "linearLogicChu.chuMap.adjointness-failure",
                        point,
                        state,
                        target: left,
                        source: right,
                    }));
                }
            }
        }
    }
    return failures.length === 0
        ? Object.freeze({ kind: "linearLogicChu.chuMap:witness", failures: Object.freeze([]) })
        : Object.freeze({ kind: "linearLogicChu.chuMap-obstruction", failures: Object.freeze(failures) });
}
/** Construct a Chu transform from an adjoint pair, refusing a pair that is not adjoint. */
export function chuMap(source, target, forward, backward) {
    const judgment = checkChuMap(source, target, forward, backward);
    if (judgment.kind === "linearLogicChu.chuMap-obstruction") {
        throw new TypeError(`chuMap: not a Chu transform (${judgment.failures.length} failure(s)); first: ${JSON.stringify(judgment.failures[0])}`);
    }
    return Object.freeze({ kind: "linearLogicChu.map", source, target, forward, backward });
}
/** `Obsmetrologia.ChuMap.id` — the identity transform; adjointness is reflexivity. */
export function idChuMap(space) {
    return chuMap(space, space, (point) => point, (state) => state);
}
/**
 * `Obsmetrologia.ChuMap.comp` — composition. Points run forward through both;
 * states pull back through both in the OPPOSITE order, which is what makes the
 * composite well-typed.
 */
export function composeChuMaps(first, second) {
    if (!sameChuSpace(first.target, second.source)) {
        throw new TypeError("composeChuMaps: first.target must be second.source");
    }
    return chuMap(first.source, second.target, (point) => second.forward(first.forward(point)), (state) => first.backward(second.backward(state)));
}
/**
 * `Obsmetrologia.ChuMap.dualMap` — the dual of a transform `(f,g) ↦ (g,f) :
 * dual D → dual C`: forward and backward swap roles, and adjointness in the dual
 * is the original adjointness with both sides negated.
 */
export function dualChuMap(map) {
    return chuMap(dual(map.target), dual(map.source), map.backward, map.forward);
}
// === FOUR read \*-autonomously ==================================================================
/** `◇ a := a ⊗ k` at a fixed accessibility reading `k` (SignChain's fusion). */
export const diamondAt = (k) => (a) => fusionReading(a, k);
/** `□ b := k ⊸ b` at a fixed accessibility reading `k` (SignChain's residuum). */
export const boxAt = (k) => (b) => residuumReading(k, b);
const tle = truthLeqReading;
const everyValue = (predicate) => readingFamilies.knowledge.every((name) => predicate(name));
const everyValueTriple = (predicate) => readingFamilies.knowledge.every((a) => readingFamilies.knowledge.every((b) => readingFamilies.knowledge.every((c) => predicate(a, b, c))));
/**
 * Enumerate every Chu space on the given point and state carriers, at every
 * `absent` reading — the finite universe the space-level laws are checked over.
 */
export function chuSpaceUniverse(points, states) {
    const cells = points.length * states.length;
    const spaces = [];
    for (const absentName of readingFamilies.knowledge) {
        const absent = absentName;
        for (let code = 0; code < readingFamilies.knowledge.length ** cells; code += 1) {
            let remaining = code;
            const assignment = [];
            for (let cell = 0; cell < cells; cell += 1) {
                assignment.push(readingFamilies.knowledge[remaining % readingFamilies.knowledge.length]);
                remaining = Math.floor(remaining / readingFamilies.knowledge.length);
            }
            spaces.push(chuSpace(points, states, (point, state) => assignment[points.indexOf(point) * states.length + states.indexOf(state)], { absent }));
        }
    }
    return Object.freeze(spaces);
}
/**
 * Bundle the exhaustive finite receipt for `LinearLogicChu.lean`. Space-level
 * laws run over every Chu space on the given carriers at every `absent` reading;
 * alphabet-level laws run over all of FOUR (and all of FOUR³ for the
 * adjunctions). Nothing here is asserted — every field is computed.
 */
export function linearLogicChuLawReceipt(points = ["a", "b"], states = ["x", "y"]) {
    const spaces = chuSpaceUniverse(points, states);
    let comparisons = 0;
    const count = (value) => { comparisons += 1; return value; };
    const dualInvolution = spaces.every((space) => count(sameChuSpace(dual(dual(space)), space)));
    const dualDualPointwise = spaces.every((space) => space.points.every((point) => space.states.every((state) => count(sameChuReading(at(dual(dual(space)), point, state), at(space, point, state))))));
    const transposeInvolution = spaces.every((space) => count(sameChuSpace(transpose(transpose(space)), space)));
    const dualSwapsCarriers = spaces.every((space) => count(dual(space).points.join(" ") === space.states.join(" ")
        && dual(space).states.join(" ") === space.points.join(" ")));
    const fourNegateInvolution = everyValue((a) => count(negateReading(negateReading(a)) === a));
    const fuseTleIff = everyValueTriple((a, b, c) => count(tle(fusionReading(a, b), c) === tle(a, residuumReading(b, c))));
    const diamondAdjointBox = everyValueTriple((k, a, b) => count(tle(diamondAt(k)(a), b) === tle(a, boxAt(k)(b))));
    const tensorHomAdjunction = fuseTleIff;
    const fourStarAutonomous = tensorHomAdjunction && fourNegateInvolution;
    // Transform-level laws: the identity on each space, the identity composed with
    // itself, and the dual of the identity — every one re-checked for adjointness.
    const identityAdjoint = spaces.every((space) => count(checkChuMap(space, space, (point) => point, (state) => state).kind === "linearLogicChu.chuMap:witness"));
    const compositionAdjoint = spaces.every((space) => {
        const identity = idChuMap(space);
        const composed = composeChuMaps(identity, identity);
        return count(checkChuMap(composed.source, composed.target, composed.forward, composed.backward).kind === "linearLogicChu.chuMap:witness");
    });
    const dualMapAdjoint = spaces.every((space) => {
        const dualed = dualChuMap(idChuMap(space));
        return count(checkChuMap(dualed.source, dualed.target, dualed.forward, dualed.backward).kind === "linearLogicChu.chuMap:witness");
    });
    const dualMapDualMap = spaces.every((space) => {
        const identity = idChuMap(space);
        const twice = dualChuMap(dualChuMap(identity));
        return count(space.points.every((point) => twice.forward(point) === identity.forward(point))
            && space.states.every((state) => twice.backward(state) === identity.backward(state)));
    });
    return Object.freeze({
        kind: "linearLogicChu.laws:witness",
        source: "Obsmetrologia/Calculus/Logic/LinearLogicChu.lean",
        dualInvolution,
        dualDualPointwise,
        transposeInvolution,
        dualSwapsCarriers,
        fourNegateInvolution,
        tensorHomAdjunction,
        fourStarAutonomous,
        fuseTleIff,
        diamondAdjointBox,
        identityAdjoint,
        compositionAdjoint,
        dualMapAdjoint,
        dualMapDualMap,
        spacesChecked: spaces.length,
        comparisons,
    });
}
