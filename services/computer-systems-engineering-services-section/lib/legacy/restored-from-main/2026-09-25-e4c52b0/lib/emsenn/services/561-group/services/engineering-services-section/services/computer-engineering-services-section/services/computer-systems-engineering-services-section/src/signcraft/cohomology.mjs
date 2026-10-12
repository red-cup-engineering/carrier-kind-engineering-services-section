import { cell as predicationCell } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { token } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { fromCount, intEqual } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { graphFirstBettiNumberOfEdgeList } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
/**
 * settling/cohomology — the cohomology of a predication complex.
 *
 * Cells are 1-cells over the entity 0-cells; the zeroth coboundary is the
 * incidence matrix (+1 on object, −1 on subject). H⁰ counts connected components
 * (union-find over entities); H¹ is the cycle rank (cells − entities +
 * components). The Laplacian view (incidenceᵀ·incidence) and its rank/char-poly
 * confirm H⁰ = ker rank and H¹ = coker rank via Smith normal form. Exact
 * throughout over the integer matrix carrier.
 */
import { charge, chargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { entitySet, predicateOfClaim, predicationSite, termCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { charPoly, count, fromNatural, intAdd, intNegate, intOne, intSubtract, intZero, magnitude, matTranspose, matmul, monus, natEqual, natIsZero, natLess, rank, } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { claim, mark } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
/** Compare two natural ranks for identity. */
export function rankIdentity(left, right) {
    return natEqual(left, right)
        ? Object.freeze({ kind: "predication.cohomology.rankIdentity:witness", left, right })
        : Object.freeze({ kind: "predication.cohomology.rankIdentity-obstruction", left, right });
}
/** Whether a natural rank vanishes. */
export function rankVanishing(rankValue) {
    return natIsZero(rankValue)
        ? Object.freeze({ kind: "predication.cohomology.rankVanishing:witness", rank: rankValue })
        : Object.freeze({ kind: "predication.cohomology.rankVanishing-obstruction", rank: rankValue });
}
/** Order two natural ranks. */
export function rankComparison(left, right) {
    if (natEqual(left, right))
        return Object.freeze({ kind: "predication.cohomology.rankComparison.same", left, right });
    return natLess(left, right)
        ? Object.freeze({ kind: "predication.cohomology.rankComparison.below", left, right })
        : Object.freeze({ kind: "predication.cohomology.rankComparison.above", left, right });
}
function uniqueBy(values, same) {
    const out = [];
    for (const value of values)
        if (!out.some((item) => same(item, value)))
            out.push(value);
    return Object.freeze(out);
}
/** The cohomology of a valuation: incidence, components (union-find), and cycle rank. */
export function cohomologyOfValuation(valuation, extraEntities = []) {
    const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
    const entities = entitySet([...cells.flatMap((cell) => [cell.subject, cell.object]), ...extraEntities], termCoincides).entities;
    const entityIndex = (entity) => {
        const index = entities.findIndex((candidate) => termCoincides(candidate, entity));
        return index < 0 ? undefined : index;
    };
    const zeroCoboundary = cells.map((cell) => {
        const row = Array.from({ length: entities.length }, () => intZero);
        const subject = entityIndex(cell.subject);
        const object = entityIndex(cell.object);
        if (object !== undefined)
            row[object] = intAdd(row[object] ?? intZero, intOne);
        if (subject !== undefined)
            row[subject] = intAdd(row[subject] ?? intZero, intNegate(intOne));
        return Object.freeze(row);
    });
    const parent = entities.map((_, index) => index);
    const find = (value) => {
        if (parent[value] === value)
            return value;
        parent[value] = find(parent[value]);
        return parent[value];
    };
    const union = (left, right) => {
        parent[find(left)] = find(right);
    };
    for (const cell of cells) {
        const subject = entityIndex(cell.subject);
        const object = entityIndex(cell.object);
        if (subject !== undefined && object !== undefined)
            union(subject, object);
    }
    const roots = uniqueBy(entities.map((_, index) => find(index)), Object.is);
    const h1RankCarrier = magnitude(intAdd(intSubtract(fromNatural(count(cells)), fromNatural(count(entities))), fromNatural(count(roots))));
    const zeroCoboundaryMatrix = Object.freeze(zeroCoboundary);
    const zeroCocycleBasis = Object.freeze(roots.map((root) => Object.freeze(entities.map((_, index) => find(index) === root ? intOne : intZero))));
    return Object.freeze({
        kind: "predication.cohomology.carrier",
        entities: Object.freeze([...entities]),
        cells: Object.freeze(cells),
        zeroCoboundary: Object.freeze({
            kind: "predication.cohomology.zeroCoboundaryMatrix",
            entities: Object.freeze([...entities]),
            cells: Object.freeze(cells),
            matrix: zeroCoboundaryMatrix,
        }),
        zeroCohomology: Object.freeze({
            kind: "predication.cohomology.zeroCohomology",
            rank: count(roots),
            cocycleBasis: zeroCocycleBasis,
        }),
        firstCohomology: Object.freeze({
            kind: "predication.cohomology.firstCohomology",
            rank: h1RankCarrier,
            vanishing: rankVanishing(h1RankCarrier),
        }),
    });
}
/** The cohomology of a sheaf carrier (its section valuation). */
export function cohomology(sheaf) {
    return cohomologyOfValuation(sheaf.section);
}
/** The cohomology of a list of cells (wrapped in a single potential-charged fiber). */
export function cohomologyOfCells(cells, extraEntities = []) {
    const predication = predicationSite(cells);
    const cohomologyPredicate = predicateOfClaim(claim(mark("cohomology")));
    const valuation = Object.freeze({
        kind: "predication.fiber.valuation",
        base: predication.base,
        fibers: Object.freeze([Object.freeze({
                kind: "predication.fiber.algebra",
                predicate: cohomologyPredicate,
                entities: predication.cells.entities,
                assignments: Object.freeze(cells.map((cell) => Object.freeze({
                    kind: "predication.fiber.meme",
                    cell,
                    charge: charge(chargeValue("potential")),
                }))),
            })]),
    });
    return cohomologyOfValuation(valuation, extraEntities);
}
/** The Laplacian view of a cohomology carrier, with kernel/cokernel rank identities. */
export function cohomologyLaplacian(cohomologyCarrier) {
    const incidence = cohomologyCarrier.zeroCoboundary.matrix;
    const entityLaplacian = incidence.length === 0 ? Object.freeze([]) : matmul(matTranspose(incidence), incidence);
    const incidenceRank = rank(incidence);
    const laplacianRank = rank(entityLaplacian);
    const entityRank = count(cohomologyCarrier.entities);
    const cellRank = count(cohomologyCarrier.cells);
    return Object.freeze({
        kind: "predication.cohomology.laplacian",
        cohomology: cohomologyCarrier,
        incidence,
        entityLaplacian,
        characteristicPolynomial: charPoly(entityLaplacian),
        incidenceRank,
        laplacianRank,
        zeroCohomologyKernelRank: rankIdentity(cohomologyCarrier.zeroCohomology.rank, monus(entityRank, incidenceRank)),
        firstCohomologyCokernelRank: rankIdentity(cohomologyCarrier.firstCohomology.rank, monus(cellRank, incidenceRank)),
    });
}
/** The Laplacian of a list of cells. */
export function cohomologyLaplacianOfCells(cells) {
    return cohomologyLaplacian(cohomologyOfCells(cells));
}

export function firstCohomologyRankOfCells(cells, extraEntities = []) {
    const entities = entitySet([...cells.flatMap((cell) => [cell.subject, cell.object]), ...extraEntities], termCoincides).entities;
    const indexOf = (entity) => {
        const index = entities.findIndex((candidate) => termCoincides(candidate, entity));
        return index < 0 ? undefined : index;
    };
    const edges = [];
    let loops = 0;
    for (const cell of cells) {
        const subject = indexOf(cell.subject);
        const object = indexOf(cell.object);
        if (subject === undefined || object === undefined)
            continue;
        if (subject === object)
            loops += 1;
        else
            edges.push([subject, object]);
    }
    return fromCount(graphFirstBettiNumberOfEdgeList(entities.length, edges) + loops);
}
export function componentsOf(cohomologyObject) {
    const { entities, zeroCohomology } = cohomologyObject;
    return Object.freeze(zeroCohomology.cocycleBasis.map((row) => Object.freeze(entities.filter((_, index) => intEqual(row[index] ?? intZero, intOne)))));
}
export function cohomologyOfEdgeGraph(nodes, edges) {
    const cells = edges.map(([left, right]) => predicationCell(token(mark(left)), edgeGraphPredicate, token(mark(right))));
    const allNodes = nodes.map((node) => token(mark(node)));
    return cohomologyOfCells(cells, allNodes);
}

const edgeGraphPredicate = predicateOfClaim(claim(mark("cohomology.edge-graph")));
