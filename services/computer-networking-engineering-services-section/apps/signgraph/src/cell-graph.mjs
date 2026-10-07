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
import { count, fromNatural } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";
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
    const weights = terms.map((_term, row) => terms.map((__term, column) => fromNatural(count(pairs.filter(([a, b]) => (a === row && b === column) || (a === column && b === row))))));
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

/** The flow network of a section: its terms and one oriented edge per cell, subject to object
 *  (reflexive cells are not edges), for metrologic's boundary operator and conservation law. */
export function flowNetwork(section) {
    const graph = relationGraph(section);
    const indexOf = (term) => graph.terms.findIndex((candidate) => coincides(candidate, term));
    const edges = [];
    for (const entry of section.entries) {
        const fromIndex = indexOf(entry.cell.subject);
        const toIndex = indexOf(entry.cell.object);
        if (fromIndex === toIndex)
            continue;
        edges.push(Object.freeze({ kind: "signgraph.flowNetwork.edge", from: graph.terms[fromIndex], to: graph.terms[toIndex], fromIndex, toIndex }));
    }
    return Object.freeze({ kind: "signgraph.flowNetwork", graph, terms: graph.terms, edges: Object.freeze(edges) });
}
