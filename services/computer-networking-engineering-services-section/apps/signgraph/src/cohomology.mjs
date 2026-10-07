/**
 * SignGraph — the cohomology of cells read as a graph: the foam's wall graph.
 *
 * Each cell (s, p, o) is a 1-cell from entity s to entity o. The zeroth
 * coboundary δ⁰ : ℤ^entities → ℤ^cells is the incidence map, (δ⁰f)(s→o) =
 * f(o) − f(s). Its kernel H⁰ is the locally constant 0-cochains — one per
 * connected component, with the component indicators as basis — and its
 * cokernel H¹ has rank the cycle rank |cells| − |entities| + |components|, the
 * first Betti number: the cycles no 0-cochain bounds. Components are found by
 * union–find; nothing here needs linear algebra.
 */
import { charPoly, fromInts, rank, toCount, toInt } from "@red-cup-engineering/exact-number-data-service/exact-number";

/** The rank of an integer matrix of host numbers, exactly. */
const integerRank = (matrix) => (matrix.length === 0 ? 0 : toCount(rank(fromInts(matrix))));
/** The characteristic polynomial det(xI − A) of a host-integer matrix, highest degree first, exactly. */
const characteristicPolynomial = (matrix) => (matrix.length === 0 ? Object.freeze([1]) : Object.freeze(charPoly(fromInts(matrix)).map(toInt).reverse()));
import { coincides } from "@red-cup-engineering/signcell/cell";
import { readingOfRecord, record, sidesOfReading, topMass } from "@red-cup-engineering/computer-data-services-section/four";
import { coverNerve, h1Rank } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";

const uniqueBy = (values, same) => {
  const out = [];
  for (const value of values) if (!out.some((item) => same(item, value))) out.push(value);
  return Object.freeze(out);
};

/** Whether two ranks are equal (a witness) or not (an obstruction). */
export const rankIdentity = (left, right) => Object.freeze({ kind: left === right ? "signgraph.rankIdentity:witness" : "signgraph.rankIdentity-obstruction", left, right });
/** Whether a rank vanishes. */
export const rankVanishing = (rank) => Object.freeze({ kind: rank === 0 ? "signgraph.rankVanishing:witness" : "signgraph.rankVanishing-obstruction", rank });
/** How two ranks compare. */
export const rankComparison = (left, right) => Object.freeze({ kind: `signgraph.rankComparison.${left === right ? "same" : left < right ? "below" : "above"}`, left, right });

/** The cohomology of a list of cells (any SignCells or triples) as a graph on their entities,
 *  with any further isolated entities. */
export function cohomologyOfCells(cells, extraEntities = []) {
  const entities = uniqueBy([...cells.flatMap((value) => [value.subject, value.object]), ...extraEntities], coincides);
  const indexOf = (term) => entities.findIndex((candidate) => coincides(candidate, term));
  const incidence = Object.freeze(cells.map((value) => {
    const row = entities.map(() => 0);
    row[indexOf(value.object)] += 1;
    row[indexOf(value.subject)] -= 1;
    return Object.freeze(row);
  }));
  const parent = entities.map((_, index) => index);
  const find = (index) => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  for (const value of cells) parent[find(indexOf(value.subject))] = find(indexOf(value.object));
  const roots = [...new Set(entities.map((_, index) => find(index)))];
  const h1 = cells.length - entities.length + roots.length;
  return Object.freeze({
    kind: "signgraph.cohomology",
    entities,
    cells: Object.freeze(cells.map((value) => Object.freeze({ subject: value.subject, predicate: value.predicate, object: value.object }))),
    incidence,
    zeroCohomology: Object.freeze({ rank: roots.length, cocycleBasis: Object.freeze(roots.map((root) => Object.freeze(entities.map((_, index) => (find(index) === root ? 1 : 0))))) }),
    firstCohomology: Object.freeze({ rank: h1, vanishing: rankVanishing(h1) }),
  });
}

/** The cohomology of a valuation's cells (a SignCell cell set). */
export const cohomologyOfValuation = (valuation, extraEntities = []) => cohomologyOfCells(valuation, extraEntities);

/** The connected components of a cohomology reading: the entities of each H⁰ basis vector. */
export const componentsOf = (cohomology) => Object.freeze(cohomology.zeroCohomology.cocycleBasis.map((row) => Object.freeze(cohomology.entities.filter((_, index) => row[index] === 1))));

/** The cohomology of a plain graph given as nodes and [from, to] edges. */
export const cohomologyOfEdgeGraph = (nodes, edges) => cohomologyOfCells(edges.map(([from, to]) => ({ subject: from, predicate: "edge", object: to })), nodes);

/** The first Betti number of a list of cells. */
export const firstCohomologyRankOfCells = (cells, extraEntities = []) => cohomologyOfCells(cells, extraEntities).firstCohomology.rank;

// — the graph Laplacian of a cohomology reading —

const transpose = (matrix, columns) => Object.freeze(Array.from({ length: columns }, (_, j) => Object.freeze(matrix.map((row) => row[j]))));
const multiply = (left, right) => Object.freeze(left.map((row) => Object.freeze(right[0] === undefined ? [] : right[0].map((_, j) => {
  const value = row.reduce((sum, entry, k) => sum + entry * right[k][j], 0);
  if (!Number.isSafeInteger(value)) throw new RangeError("signgraph laplacian: an entry left the exact integer range");
  return value;
}))));

/** The graph Laplacian of a cohomology reading: L = Iᵀ·I over its incidence I (cells × entities), its
 *  characteristic polynomial, the ranks of I and L, and the rank identities H⁰ = |entities| − rank I and
 *  H¹ = |cells| − rank I. */
export function cohomologyLaplacian(cohomology) {
  const incidence = cohomology.incidence;
  const entityLaplacian = incidence.length === 0 ? Object.freeze([]) : multiply(transpose(incidence, cohomology.entities.length), incidence);
  const incidenceRank = integerRank(incidence);
  return Object.freeze({
    kind: "signgraph.laplacian",
    incidence,
    entityLaplacian,
    characteristicPolynomial: characteristicPolynomial(entityLaplacian),
    incidenceRank,
    laplacianRank: integerRank(entityLaplacian),
    zeroCohomologyKernelRank: rankIdentity(cohomology.zeroCohomology.rank, cohomology.entities.length - incidenceRank),
    firstCohomologyCokernelRank: rankIdentity(cohomology.firstCohomology.rank, cohomology.cells.length - incidenceRank),
  });
}

/** The cohomology receipt of a list of cells: H⁰ and H¹ ranks, H¹'s vanishing, and the Laplacian. */
export function cohomologyReceiptOfCells(cells, extraEntities = []) {
  const cohomology = cohomologyOfCells(cells, extraEntities);
  return Object.freeze({
    h0: cohomology.zeroCohomology.rank,
    h1: cohomology.firstCohomology.rank,
    vanishing: cohomology.firstCohomology.vanishing,
    laplacian: cohomologyLaplacian(cohomology),
  });
}

// — the cover nerve: Euler counts of a federated cover —

/** The cover nerve of a cohomology reading. */
export const coverNerveOfCohomology = (cohomology) => coverNerve(cohomology.entities.length, cohomology.cells.length, cohomology.zeroCohomology.rank);

// — the priced nerve of a federated cover (Obsmetrologia CurrencyCocone, QuantumContextuality) —

/** One source's contribution to a logical cell in a federated cover; its stance is the local section value. */
export const federatedCoverStatementSchema = Object.freeze({
  $id: "https://schemas.561.group/signgraph/federated-cover-statement.schema.json",
  title: "FederatedCoverStatement",
  description: "One source contribution to a logical cell in a federated cover; stance is the local section value.",
  type: "object",
  additionalProperties: false,
  required: ["source", "cell", "stance"],
  properties: {
    source: { type: "string", minLength: 1 },
    cell: { type: "string", minLength: 1 },
    stance: { type: "string", minLength: 1 },
    witness: { type: "string", minLength: 1 },
  },
});

/**
 * One cell of a federated cover, priced. Each source is a context and its local record tells each of
 * the cell's measurements true, false, both or neither (QuantumContextuality `localRecord`). A cell
 * read as a register holds one value, so each stance stated at it is a Boolean measurement "the cell
 * is this value": the source tells true of the stances it states and false of the rest. A cell read
 * as a claim is one measurement and each stance is a reading, the source's local record itself (its
 * readings joined in knowledge). The counting merge at a measurement is the record of the contexts
 * telling true and telling false (`mergeTally`); it is held ⊤ exactly when both tallies are positive
 * (`incons_iff_one_le_topMass`). The base is the context incidence: sources and measurements as
 * 0-cells, each source's incidence with each measurement it covers as a 1-cell.
 */
function pricedCell(cellName, group, readings) {
  const sources = [...new Set(group.map((statement) => statement.source))].sort();
  const stated = (source) => group.filter((statement) => statement.source === source).map((statement) => statement.stance);
  const names = readings ? [cellName] : [...new Set(group.map((statement) => statement.stance))].sort();
  const told = new Map(sources.map((source) => [source, readings
    ? new Map([[cellName, stated(source).map(sidesOfReading).reduce(([f, a], [g, b]) => [f || g, a || b], [false, false])]])
    : new Map(names.map((name) => [name, stated(source).includes(name) ? [true, false] : [false, true]]))]));
  const measurements = Object.freeze(names.map((name) => {
    const tally = record(sources.filter((source) => told.get(source).get(name)[0]).length, sources.filter((source) => told.get(source).get(name)[1]).length);
    return Object.freeze({ measurement: name, record: tally, reading: readingOfRecord(tally), mass: topMass(tally) });
  }));
  const top = measurements.filter((measurement) => measurement.mass > 0).length;
  const mass = measurements.reduce((sum, measurement) => sum + measurement.mass, 0);
  const base = coverNerve(sources.length + names.length, sources.length * names.length, 1);
  return Object.freeze({ kind: "signgraph.pricedCell", cell: cellName, sources: Object.freeze(sources), measurements, top, mass, rank: h1Rank(base), base });
}

/**
 * The priced nerve of a federated cover: the currency legs CurrencyCocone `PricedNerve` reads over one
 * cover, each read here from the statements and none stated.
 *
 * - `top`, leg d: the held-⊤ measurements of the merge (`topCount` of `mergeRecord`). It vanishes exactly
 *   when the sources agree on every shared measurement (`mergeRecord_topfree_iff_compatible`), and a
 *   compatible family glues to the merge's readout (section G): zero is coordination-free at the level of
 *   values, not only of the nerve.
 * - `mass`, d with multiplicity: the counting merge's contradiction mass (`massSum`), never below `top`
 *   (`topCount_le_massSum`). The difference is the multiplicity the idempotent join erases. Dissent from
 *   the majority readout is bounded by it (`dissent_majority_le_topMass`), so it is the price of settling.
 * - `rank`, leg b: the cycle rank of the base context incidence (`CoverNerve.H1rank`). It bounds the least
 *   price a parity model can reach, not the price a given family pays, so it is reported beside the
 *   prices and never ordered against them here.
 *
 * The mint and jump legs (c) and the causal leg (e) need the settling flow and the causal order of the
 * statements, which a statement list does not carry; the colimit, max(mass, causal), is therefore read
 * here only from below, by the mass. With `readings`, every cell is a claim and every stance a reading
 * name; otherwise every cell is a register and every stance one of its values.
 */
export function pricedNerve(statements, { readings = false } = {}) {
  const byCell = new Map();
  for (const statement of statements) byCell.set(statement.cell, [...(byCell.get(statement.cell) ?? []), statement]);
  const cells = [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([cellName, group]) => pricedCell(cellName, group, readings));
  const obstructions = Object.freeze(cells.filter((entry) => entry.top > 0));
  const sum = (leg) => cells.reduce((total, entry) => total + entry[leg], 0);
  const top = sum("top");
  return Object.freeze({
    kind: "signgraph.pricedNerve",
    top,
    mass: sum("mass"),
    rank: sum("rank"),
    vanishing: rankVanishing(top),
    cells: Object.freeze(obstructions.map((entry) => entry.cell)),
    obstructions,
  });
}

/**
 * The finite cover nerve of a link graph: vertices are the distinct nodes (case-folded paths,
 * first spelling kept), links are read undirected and deduplicated, and dangling links and
 * self-links are dropped. The nerve is read off the graph's own cohomology
 * (`cohomologyOfEdgeGraph`): vertices, edges, and connected components.
 * @param {string[]} nodes
 * @param {Array<{from: string, to: string}>} links
 */
export function linkGraphNerve(nodes, links) {
  const byKey = new Map();
  for (const node of nodes) { const key = node.toLowerCase(); if (!byKey.has(key)) byKey.set(key, node); }
  const edges = new Set(), pairs = [];
  for (const { from, to } of links) {
    const source = byKey.get(from.toLowerCase()), target = byKey.get(to.toLowerCase());
    if (source === undefined || target === undefined || source === target) continue;
    const [left, right] = source < target ? [source, target] : [target, source];
    const key = `${left}\u0000${right}`;
    if (edges.has(key)) continue;
    edges.add(key); pairs.push([left, right]);
  }
  const graph = cohomologyOfEdgeGraph([...byKey.values()], pairs);
  return coverNerve(graph.entities.length, graph.cells.length, graph.zeroCohomology.rank);
}
