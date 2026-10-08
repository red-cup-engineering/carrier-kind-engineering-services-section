/**
 * consensus — bilattice network-sheaf consensus over a fleet of observer pairs.
 *
 * socializing's own collective-decision read (multi-observer settlement): many
 * agents observe the same subject and each contributes a evidence; consensus is read
 * off the network sheaf on the observer graph. The obstruction to agreement is
 * exactly the H¹ of the opposition subgraph — disagreement is a topological
 * obstruction, not a mere mismatch. Theory:
 * `work/archive/quorum-as-colimit-of-voter-fibers.md`, `consensus-closure.md`, and
 * the bilattice-network-sheaf-consensus theorem.
 *
 * Per component (a connected group of observers):
 *   pooled = ⋀_k over the component  (knowledge-join — everything anyone knows)
 *   common = ⋁_k over the component  (knowledge-meet — what all agree on)
 * Two observers are *opposed* on an edge when one settled positive-only
 * (`potential`) and the other negative-only (`active`): a direct contradiction in
 * truth direction. The obstruction is the first Betti number of the opposition
 * subgraph (edges − touched-vertices + components); zero means coordination-free,
 * and the fleet is *confident* only when coordination-free and every component
 * pooled to a definite (non-⊥, non-⊤) evidence.
 *
 * This is socializing's home for the consensus read — the off-diagonal observer
 * category O settling its plurality into one decision. (Relocated from animating;
 * a fleet's collective settlement is a social, not an interior-agent, concern.)
 */

import { cell } from "@red-cup-engineering/signcell/cell";
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { members, intZero, intOne, intNegate, intIsZero as intIsZero_2, isNegative, magnitude, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { createGraph, weaklyConnectedComponents } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";
import { isHarmonicOfWeights, hodgeDecompositionOfWeights, diffusionDirections, weightsOfEdges, graphSpectrum } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { knowledgeJoin, knowledgeMeet } from "@red-cup-engineering/signchain/bilattice";
import { sidesOf } from "@red-cup-engineering/signcell/cell";

/**
 * An undirected comparison edge in the observer graph: a [left, right] pair of
 * observer indices whose settled pairs are compared for opposition.
 */

/**
 * The settled consensus over one connected component of observers: its member
 * indices, the knowledge-join `pooled` evidence (everything anyone in the
 * component knows), and the knowledge-meet `common` evidence (only what every
 * member shares).
 */

  

  

/**
 * The network-sheaf consensus read off a fleet of observer pairs:
 * per-component consensus, the indices of opposed edges, the H1 obstruction
 * (first Betti number of the opposition subgraph) and whether it is zero
 * (coordinationFree), per-component confidence, and the overall `confident`
 * flag (coordination-free and every component pooled to a definite evidence).
 */

    

/** The complete graph on `size` observers — every observer compared with every other. */
export function completeGraph(size) {
  const edges = [];
  for (let left = 0; left < size; left++) {
    for (let right = left + 1; right < size; right++) edges.push([left, right]);
  }
  return edges;
}

/** Which sides of an evidence pair are told: [for, against]. */
const present = sidesOf;

/** A evidence with a definite truth direction (potential or active, not ⊥/⊤). */
export function definite(evidence) {
  const [positive, negative] = present(evidence);
  return positive !== negative;
}

/** Two pairs in directly opposed truth directions: one positive-only, the
 *  other negative-only. ⊥ and ⊤ are never opposed (no definite direction). */
export function opposed(left, right) {
  const [leftPositive, leftNegative] = present(left);
  const [rightPositive, rightNegative] = present(right);
  return (leftPositive && !leftNegative && rightNegative && !rightPositive) ||
    (rightPositive && !rightNegative && leftNegative && !leftPositive);
}

/** Network-sheaf consensus over the observer pairs and the comparison graph
 *  (default: complete graph — every pair compared). */
export function sheafEvidence(
  pairs,
  edges = completeGraph(pairs.length),
) {
  validateEdges(pairs.length, edges);
  const components = connectedComponents(pairs.length, edges);
  const componentConsensus = components.map((members) => {
    const first = pairs[members[0]];
    if (!first) throw new TypeError("sheafEvidence: component without a evidence");
    const rest = members.slice(1).map((index) => pairs[index]);
    return {
      members,
      pooled: rest.reduce((left, right) => knowledgeJoin(left, right), first),
      common: rest.reduce((left, right) => knowledgeMeet(left, right), first),
    };
  });

  const opposedEdges = [];
  edges.forEach(([left, right], index) => {
    if (opposed(pairs[left], pairs[right])) opposedEdges.push(index);
  });
  const opposedPairs = opposedEdges.map((index) => edges[index]);
  const cohomology = oppositionCohomology(opposedPairs);
  const obstruction = cohomology.h1;
  const coordinationFree = obstruction === 0;
  const confidentByComponent = componentConsensus.map(({ pooled }) => coordinationFree && definite(pooled));

  return {
    componentConsensus,
    opposedEdges,
    cohomology: cohomology.receipt,
    obstruction,
    coordinationFree,
    confidentByComponent,
    confident: coordinationFree && confidentByComponent.every(Boolean),
  };
}

function oppositionCohomology(opposedPairs)

 {
  const opposes = "opposes";
  const cells = opposedPairs.map(([left, right]) =>
    cell(`observer:${left}`, opposes, `observer:${right}`));
  const cohomology = cohomologyOfCells(cells);
  const receipt = Object.freeze({
    kind: "socializing.consensus.cohomology",
    cells: opposedPairs.length,
    h0: cohomology.zeroCohomology.rank,
    h1: cohomology.firstCohomology.rank,
    vanishing: cohomology.firstCohomology.vanishing,
    carrier: cohomology,
  });
  return { h1: receipt.h1, receipt };
}

/** Consensus over any observations that carry `evidence`. */
export function sheafObservations(
  observations,
  edges = completeGraph(observations.length),
) {
  return sheafEvidence(observations.map((observation) => observation.evidence), edges);
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */

/**
 * The consensus read through the substrate graph Laplacian (`@red-cup-engineering/relating` analysis.laplacian).
 * Where `sheafEvidence` computes the opposition subgraph's first Betti number by hand, this grounds the
 * CONSENSUS (agreement) structure in the spectral Laplacian over the fixed observer set: the AGREEMENT
 * graph is the comparison edges whose endpoints are not opposed.
 *   • clusters = the connected-component count H⁰ (the Laplacian's zero-eigenvalue multiplicity) — how
 *     many independent agreement groups the fleet settles into (consensus = a single global section,
 *     H⁰ of the cover, per the consensus-as-H⁰-construction theorem; isolated observers count).
 *   • agreementTrees = the Matrix-Tree spanning-tree count — the consensus ROBUSTNESS: `0` the fleet
 *     fragments into several clusters, `1` a single fragile thread of agreement (one lost link
 *     fragments it), `> 1` redundant agreement paths (resilient to a few disagreements).
 */

  

  

  

      

  

  

         

/** An observer's TRUTH-LEAN as an exact integer: +1 leaning FOR (potential), −1 leaning AGAINST
 *  (active), 0 for no definite direction (⊥ absurd / ⊤ stable). The observable whose harmonicity on
 *  the comparison graph IS consensus equilibrium. */
const leanInteger = (evidence) => {
  const [positive, negative] = present(evidence);
  if (positive && !negative) return intOne;
  if (negative && !positive) return intNegate(intOne);
  return intZero;
};

/** Read a fleet's consensus through the substrate graph Laplacian: the agreement graph's component
 *  count (H⁰) and spanning-tree robustness. */
export function spectralConsensus(
  pairs,
  edges = completeGraph(pairs.length),
) {
  validateEdges(pairs.length, edges);
  const agreement = edges.filter(([left, right]) => !opposed(pairs[left], pairs[right]));
  const spectrum = graphSpectrum(pairs.length, agreement.map(([left, right]) => [left, right]));
  const clusters = toCount(spectrum.components);
  const agreementTrees = toCount(magnitude(spectrum.spanningTrees));
  const comparisonWeights = weightsOfEdges(pairs.length, edges.map(([left, right]) => [left, right]));
  const atEquilibrium = isHarmonicOfWeights(comparisonWeights, pairs.map(leanInteger));
  const hodge = hodgeDecompositionOfWeights(weightsOfEdges(pairs.length, agreement.map(([left, right]) => [left, right])));
  return Object.freeze({
    kind: "socializing.spectral-consensus",
    observers: pairs.length,
    clusters,
    unified: clusters === 1,
    agreementTrees,
    robust: agreementTrees > 1,
    fragile: agreementTrees === 1,
    atEquilibrium,
    derivable: toCount(hodge.exact),
    irreducible: toCount(hodge.harmonic),
  });
}

/** The diffusion endpoint of a fleet's pairs: where each observer's agreement-community settles. */

  

  

/**
 * diffusedField — diffuse the fleet's pairs to consensus. Each observer relaxes to the net
 * truth-DIRECTION of its agreement-community (`sign` of the harmonic projection `lim_{t→∞} e^{−tL}`
 * onto `ker L` — the per-community mean lean), read through the substrate `diffusionDirections`. Where
 * `spectralConsensus.atEquilibrium` asks WHETHER the leans are already harmonic, this reads what the
 * fleet settles TO: how many observers land for / against / balanced once consensus diffuses.
 */
export function diffusedField(
  pairs,
  edges = completeGraph(pairs.length),
) {
  validateEdges(pairs.length, edges);
  const agreement = edges.filter(([left, right]) => !opposed(pairs[left], pairs[right]));
  const weights = weightsOfEdges(pairs.length, agreement.map(([left, right]) => [left, right]));
  const directions = diffusionDirections(weights, pairs.map(leanInteger));
  let leansFor = 0;
  let leansAgainst = 0;
  let balanced = 0;
  for (const direction of directions) {
    if (intIsZero_2(direction)) balanced += 1;
    else if (isNegative(direction)) leansAgainst += 1;
    else leansFor += 1;
  }
  return Object.freeze({ kind: "socializing.diffused-field", observers: pairs.length, leansFor, leansAgainst, balanced });
}

function validateEdges(size, edges) {
  for (const [left, right] of edges) {
    if (left < 0 || right < 0 || left >= size || right >= size || left === right) {
      throw new RangeError(`sheafEvidence: edge [${left},${right}] out of range or self-loop`);
    }
  }
}

/** The observer groups the comparison edges connect, each ascending, ordered by their first observer. */
function connectedComponents(size, edges) {
  const graph = createGraph({ nodes: Array.from({ length: size }, (_, index) => ({ id: String(index) })), edges: edges.map(([left, right]) => ({ from: String(left), to: String(right) })) });
  return weaklyConnectedComponents(graph).map((component) => component.map(Number).sort((left, right) => left - right)).sort((left, right) => left[0] - right[0]);
}
