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
import { gradedAdd, gradedIsZero, gradedNegate, } from "./graded.mjs";
import { ratAdd, ratIsZero, ratSubtract, ratZero } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/exact-number.mjs";
import { termCoincides } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/predication.mjs";
import {} from "../section.mjs";
import { relationGraph } from "./laplacian.mjs";
const sameTerm = (left, right) => termCoincides(left, right);
/** The flow network of a section (reflexive cells are not edges). */
export function flowNetwork(section) {
    const graph = relationGraph(section);
    const indexOf = (term) => graph.terms.findIndex((candidate) => sameTerm(candidate, term));
    const edges = [];
    for (const entry of section.entries) {
        const fromIndex = indexOf(entry.cell.subject);
        const toIndex = indexOf(entry.cell.object);
        if (fromIndex === toIndex)
            continue;
        edges.push(Object.freeze({ kind: "meme-analysis.conservation.edge", from: graph.terms[fromIndex], to: graph.terms[toIndex], fromIndex, toIndex }));
    }
    return Object.freeze({ kind: "meme-analysis.conservation.network", graph, terms: graph.terms, edges: Object.freeze(edges) });
}
const requireFlow = (network, flow) => {
    if (flow.length !== network.edges.length)
        throw new TypeError("a flow assigns a value to every oriented edge of the network");
};
/** The boundary ∂(flow): net accumulation (inflow − outflow) at every term. */
export function divergence(network, flow) {
    requireFlow(network, flow);
    const net = network.terms.map(() => ratZero);
    network.edges.forEach((edge, index) => {
        const value = flow[index];
        net[edge.toIndex] = ratAdd(net[edge.toIndex], value);
        net[edge.fromIndex] = ratSubtract(net[edge.fromIndex], value);
    });
    return Object.freeze(net);
}
/** Whether a flow is conserved (Kirchhoff balance / ker ∂). */
export function conserved(network, flow) {
    const div = divergence(network, flow);
    const leaking = div.findIndex((value) => !ratIsZero(value));
    if (leaking !== -1) {
        return Object.freeze({
            kind: "meme-analysis.conservation.conserved-obstruction",
            network,
            flow: Object.freeze([...flow]),
            divergence: div,
            atTerm: network.terms[leaking],
            residual: div[leaking],
        });
    }
    return Object.freeze({ kind: "meme-analysis.conservation.conserved:witness", network, flow: Object.freeze([...flow]), divergence: div });
}
/** Solve for the value on an elided edge that makes the whole flow conserve. */
export function complete(network, flow, holeIndex) {
    requireFlow(network, flow);
    if (holeIndex < 0 || holeIndex >= network.edges.length)
        throw new RangeError("the elided edge must be an edge of the network");
    const edge = network.edges[holeIndex];
    const rest = flow.map((value, index) => (index === holeIndex ? ratZero : value));
    const restDivergence = divergence(network, rest);
    const inferred = restDivergence[edge.fromIndex];
    const completed = Object.freeze(rest.map((value, index) => (index === holeIndex ? inferred : value)));
    const judgment = conserved(network, completed);
    if (judgment.kind === "meme-analysis.conservation.conserved:witness") {
        return Object.freeze({ kind: "meme-analysis.conservation.completion:witness", network, edge, inferred, flow: completed });
    }
    return Object.freeze({
        kind: "meme-analysis.conservation.completion-obstruction",
        network,
        edge,
        inferred,
        flow: completed,
        atTerm: judgment.atTerm,
        residual: judgment.residual,
    });
}
/** The signed per-sector residual of a 0-chain, in first-seen order, nonzero sectors only. */
export function gradedResidualBy(amounts, ops) {
    const order = [];
    const sums = new Map();
    for (const amount of amounts) {
        const grade = ops.gradeOf(amount);
        const prior = sums.get(grade);
        if (prior === undefined) {
            order.push(grade);
            sums.set(grade, amount);
        }
        else {
            sums.set(grade, ops.add(prior, amount));
        }
    }
    return Object.freeze(order.map((grade) => sums.get(grade)).filter((sum) => !ops.isZero(sum)));
}
/** Conservation over any GradedAdditive: conserved when the residual is empty. */
export function gradedConservedBy(amounts, ops) {
    const residual = gradedResidualBy(amounts, ops);
    return Object.freeze({ conserved: residual.length === 0, residual });
}
/** Infer the one quantity missing so the 0-chain conserves (residual in one sector). */
export function gradedCompleteBy(known, ops) {
    const residual = gradedResidualBy(known, ops);
    if (residual.length === 1)
        return { kind: "witness", inferred: ops.negate(residual[0]) };
    return { kind: "obstruction", reason: residual.length === 0 ? "balanced" : "ambiguous", residual };
}
const carrierAdditive = Object.freeze({
    gradeOf: (quantity) => quantity.grade,
    add: gradedAdd,
    isZero: gradedIsZero,
    negate: gradedNegate,
});
/** The signed per-sector residual of a carrier 0-chain. */
export function gradedResidual(amounts) {
    return gradedResidualBy(amounts, carrierAdditive);
}
/** Graded conservation judgment. */
export function gradedConserved(amounts) {
    const { conserved, residual } = gradedConservedBy(amounts, carrierAdditive);
    if (conserved)
        return Object.freeze({ kind: "meme-analysis.conservation.graded:witness", amounts: Object.freeze([...amounts]) });
    return Object.freeze({ kind: "meme-analysis.conservation.graded-obstruction", amounts: Object.freeze([...amounts]), residual });
}
/** Infer the one graded amount missing so the 0-chain conserves. */
export function gradedComplete(known) {
    const completion = gradedCompleteBy(known, carrierAdditive);
    if (completion.kind === "witness") {
        return Object.freeze({ kind: "meme-analysis.conservation.graded-completion:witness", known: Object.freeze([...known]), inferred: completion.inferred });
    }
    return Object.freeze({
        kind: "meme-analysis.conservation.graded-completion-obstruction",
        known: Object.freeze([...known]),
        reason: completion.reason,
        residual: completion.residual,
    });
}
