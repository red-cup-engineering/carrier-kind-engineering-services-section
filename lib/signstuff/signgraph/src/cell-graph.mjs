/**
 * cell-graph — SignCell's cells organized as a Chu space.
 *
 * Points are cells; states are observations (attributes, queries, indexes) over
 * them, each a named, total evaluator `(cell) => reading`. The organization is
 * SignChain's Chu space over FOUR, with SignCell's coincidence as point sameness
 * and observation-name equality as state sameness; Chu maps between two
 * organizations are SignChain's `chuMap`.
 */
import { coincides } from "@red-cup-engineering/signcell/cell";
import { natZero, natOne, natAdd, fromNatural } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { chuSpaceOfEntries } from "@red-cup-engineering/metrologic/chu";

/** The Chu space of a cell set under a list of named observations. */
export function cellGraph(cells, observations, options = {}) {
  const entries = cells.flatMap((cell) => observations.map((observation) => [cell, observation.name, observation.evaluate(cell)]));
  return chuSpaceOfEntries(cells, observations.map((observation) => observation.name), entries, { absent: options.absent, samePoint: coincides, sameState: (left, right) => left === right });
}

/** The relation graph of a bare list of predication CELLS — distinct subject/object terms as
 *  vertices, weighted by how many cells relate each pair. This is the part `relationGraph` actually
 *  needs: it reads only `cell.subject`/`cell.object`, never the reading or the fixed-point reading's
 *  order/bound. Exposing it lets ANY holder of cells (a faculty's held section, a membrane) read the
 *  graph (and metrologic's Laplacian over it) without first materializing a full `SectionCarrier`. */
export function relationGraphOfCells(cells) {
    if (cells.length === 0)
        throw new TypeError("an empty section presents no relation graph");
    const terms = [];
    const indexOf = (term) => {
        const found = terms.findIndex((candidate) => coincides(candidate, term));
        if (found !== -1)
            return found;
        terms.push(term);
        return terms.length - 1;
    };
    const pairs = [];
    for (const cell of cells) {
        const subject = indexOf(cell.subject);
        const object = indexOf(cell.object);
        if (subject !== object)
            pairs.push([subject, object]);
    }
    // Accumulate each unoriented relation exactly once, preserving multiplicity.
    // The old implementation rescanned the entire edge list once for each
    // matrix entry, costing O(entities² × cells). The output is necessarily
    // dense, but this construction requires only O(cells + entities²) work.
    // Reuse the exact-number tower; never sum host floats or reimplement ℕ.
    const counts = Array.from({ length: terms.length }, () => Array(terms.length).fill(natZero));
    for (const [a, b] of pairs) {
        counts[a][b] = natAdd(counts[a][b], natOne);
        counts[b][a] = natAdd(counts[b][a], natOne);
    }
    const weights = counts.map(row => row.map(fromNatural));
    return Object.freeze({
        kind: "signgraph.relationGraph",
        terms: Object.freeze(terms),
        weights: Object.freeze(weights.map((row) => Object.freeze(row))),
    });
}
/** The relation graph of a section (its entries' cells). Delegates to {@link relationGraphOfCells}. */
export function relationGraph(section) {
    return relationGraphOfCells(section.entries.map((entry) => entry.cell));
}

/**
 * The same oriented flow network as flowNetwork(section), directly from held
 * SignCells rather than a separately materialized SectionCarrier. In contrast
 * to the symmetric relationGraphOfCells, this retains the sign of the boundary
 * operator: each edge is subject -> object, fromIndex -> toIndex.
 *
 * This matters for causal proof graphs. A symmetric Laplacian can answer
 * connectivity or diffusion questions, but it cannot distinguish "source
 * proves conclusion" from the reversed (and generally invalid) claim.
 * The flow is still a SignGraph READING of existing cells, not a new journal,
 * an authenticated source, an inference, or authority to produce an order.
 *
 * Reflexive predications remain vertices but have zero boundary and therefore
 * no directed edge. Duplicate predications remain distinct incidence edges,
 * as they already do in flowNetwork(section).
 */
export function flowNetworkOfCells(cells) {
    const graph = relationGraphOfCells(cells);
    const indexOf = (term) => graph.terms.findIndex((candidate) => coincides(candidate, term));
    const edges = [];
    for (const value of cells) {
        const fromIndex = indexOf(value.subject);
        const toIndex = indexOf(value.object);
        if (fromIndex === toIndex) continue;
        edges.push(Object.freeze({
            kind: "signgraph.flowNetwork.edge",
            from: graph.terms[fromIndex], to: graph.terms[toIndex],
            fromIndex, toIndex,
        }));
    }
    return Object.freeze({
        kind: "signgraph.flowNetwork",
        graph, terms: graph.terms, edges: Object.freeze(edges),
    });
}

/** The flow network of a section delegates to its SignCell source carrier. */
export function flowNetwork(section) {
    return flowNetworkOfCells(section.entries.map((entry) => entry.cell));
}
