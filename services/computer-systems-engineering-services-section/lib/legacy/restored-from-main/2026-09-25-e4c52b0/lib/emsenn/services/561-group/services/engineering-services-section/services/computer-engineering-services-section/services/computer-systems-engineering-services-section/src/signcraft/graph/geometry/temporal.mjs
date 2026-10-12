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
import { cellCoincides, termCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { fromRatio } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { readIncrementsOfSettlementFiltration } from "../../increment.mjs";
const sameCell = (left, right) => cellCoincides(left, right);
const sharesTerm = (left, right) => {
    const terms = [left.subject, left.object];
    const others = [right.subject, right.object];
    return terms.some((term) => others.some((other) => termCoincides(term, other)));
};
/** Each designated cell paired with the stage index of its first firing. */
export function readFiringEventsOfSettlementFiltration(settling) {
    const events = [];
    readIncrementsOfSettlementFiltration(settling).forEach((increment, stageIndex) => {
        for (const cell of increment.added.cells) {
            if (!events.some((event) => sameCell(event.cell, cell))) {
                events.push(Object.freeze({ kind: "meme-geometry.temporal.firingEvent", cell, stageIndex }));
            }
        }
    });
    return Object.freeze(events);
}
/** A firing event: a cell stamped by the stage index at which it first fires. The unit of a causal
 *  order — any temporally-stamped cell sequence builds one (a settling's firings, or a communicating
 *  membrane with each utterance stamped by its position). */
export function firingEvent(cell, stageIndex) {
    return Object.freeze({ kind: "meme-geometry.temporal.firingEvent", cell, stageIndex });
}
/** The causal order of an explicit firing-event list: transitive closure of stage-increasing term
 *  adjacency (acyclic, since stages strictly increase along every edge). The reusable core — feed it a
 *  settling's own firings or any temporally-stamped cell sequence. */
export function causalOrderOfFiringEvents(events) {
    const direct = events.map((earlier) => events.map((later) => earlier.stageIndex < later.stageIndex && sharesTerm(earlier.cell, later.cell)));
    for (let mid = 0; mid < events.length; mid += 1) {
        for (let from = 0; from < events.length; from += 1) {
            if (!direct[from][mid])
                continue;
            for (let to = 0; to < events.length; to += 1) {
                if (direct[mid][to])
                    direct[from][to] = true;
            }
        }
    }
    return Object.freeze({
        kind: "meme-geometry.temporal.order",
        events,
        precedes: Object.freeze(direct.map((row) => Object.freeze(row.flatMap((reachable, index) => reachable ? [index] : [])))),
    });
}
/** The causal order: transitive closure of stage-increasing term adjacency. */
export function readCausalOrderOfSettlementFiltration(settling) {
    return causalOrderOfFiringEvents(readFiringEventsOfSettlementFiltration(settling));
}
/** Separation of two cells under the causal order. */
export function causalSeparation(order, left, right) {
    const leftIndex = order.events.findIndex((event) => sameCell(event.cell, left));
    if (leftIndex === -1)
        return Object.freeze({ kind: "meme-geometry.temporal.separation-obstruction", missing: left });
    const rightIndex = order.events.findIndex((event) => sameCell(event.cell, right));
    if (rightIndex === -1)
        return Object.freeze({ kind: "meme-geometry.temporal.separation-obstruction", missing: right });
    if (order.precedes[leftIndex].includes(rightIndex)) {
        return Object.freeze({ kind: "meme-geometry.temporal.separation.timelike", earlier: order.events[leftIndex], later: order.events[rightIndex] });
    }
    if (order.precedes[rightIndex].includes(leftIndex)) {
        return Object.freeze({ kind: "meme-geometry.temporal.separation.timelike", earlier: order.events[rightIndex], later: order.events[leftIndex] });
    }
    return Object.freeze({ kind: "meme-geometry.temporal.separation.spacelike", left: order.events[leftIndex], right: order.events[rightIndex] });
}
/** The cone at a cell: everything causally before and after it. */
export function causalCone(order, apex) {
    const apexIndex = order.events.findIndex((event) => sameCell(event.cell, apex));
    if (apexIndex === -1)
        return Object.freeze({ kind: "meme-geometry.temporal.cone-obstruction", missing: apex });
    const past = order.events.filter((_, index) => order.precedes[index].includes(apexIndex));
    const future = order.precedes[apexIndex].map((index) => order.events[index]);
    return Object.freeze({ kind: "meme-geometry.temporal.cone", apex: order.events[apexIndex], past: Object.freeze(past), future: Object.freeze(future) });
}
/** Comparable pairs over all pairs, exactly. */
export function orderingFraction(order) {
    const count = order.events.length;
    if (count < 2)
        return Object.freeze({ kind: "meme-geometry.temporal.orderingFraction-obstruction", eventCount: count });
    let comparable = 0;
    for (let left = 0; left < count; left += 1) {
        for (let right = left + 1; right < count; right += 1) {
            if (order.precedes[left].includes(right) || order.precedes[right].includes(left))
                comparable += 1;
        }
    }
    const total = (count * (count - 1)) / 2;
    return Object.freeze({
        kind: "meme-geometry.temporal.orderingFraction",
        comparablePairs: comparable,
        totalPairs: total,
        fraction: fromRatio(comparable, total),
    });
}
