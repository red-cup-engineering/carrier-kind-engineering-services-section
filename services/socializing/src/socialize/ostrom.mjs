/**
 * ostrom — socializing's OSTROM capabilities: the Institutional Analysis and Development (IAD)
 * rule-grid, the eight design principles for enduring commons governance, graduated sanctions, and
 * polycentric nesting. Elinor Ostrom's empirical findings on how communities self-govern shared
 * resources WITHOUT a kyriarchist sovereign — the most directly applicable mode for organizing a
 * commons of agentic labor (a shared pool of work an agent swarm draws on and replenishes).
 *
 * Grounded in content/_archive .../what-is-the-theory-of-governance.md (the Ostrom-IAD 7×3 grid and
 * the eight design principles; polycentric governance survey). These consume relating's COMPLEX
 * MATH rather than re-deriving it:
 *   - graduated sanctions are a monotone DESCENT in the bilattice TRUTH ORDER ≤_t (relating's
 *     `truthMeetReading`): each violation lowers the offender's standing toward f (removal), the
 *     escalation Ostrom's principle 5 prescribes over a binary punish/not.
 *   - polycentricity is read through the graph LAPLACIAN (socializing's `spectralConsensus`:
 *     Matrix-Tree spanning-tree robustness + H⁰ cluster count) and the network-sheaf H¹
 *     (`sheafEvidence`): nested enterprises cohere when the centers glue (H¹=0) yet stay plural
 *     and redundantly connected (robust).
 */
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";

import { sheafEvidence, spectralConsensus } from "./consensus.mjs";

import { GOVERNANCE_LEVELS } from "./deciding.mjs";
import { truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// ── IAD rule grid (the 7 rule-types × 3 levels) ──

/** Ostrom's seven types of rules-in-use that structure any action situation (IAD framework). */
export const OSTROM_RULE_TYPES = Object.freeze([
  "boundary",     // who participates
  "position",     // what positions exist
  "choice",       // what actions a position may take
  "aggregation",  // how individual choices become collective outcomes
  "information",  // what is available to whom (monitoring)
  "payoff",       // what costs/benefits attach to outcomes
  "scope",        // what outcomes are in the situation
]);

/** One rule-in-use, located in the IAD grid: its type (one of seven) and the level it operates at
 *  (operational / collective-choice / constitutional — each rule-type is modifiable at each level). */

/** The IAD rule grid — the Z/7 × Z/3 graded census of a governance's rules-in-use (the governance
 *  file's "M_G is graded by rule-type as well as by level"). Reads which of the 21 (type, level)
 *  cells are populated and the marginal counts. */

/** Census a governance's rules-in-use into the IAD grid. */
export function iadGrid(rules) {
  const cells = {};
  const byType = Object.fromEntries(OSTROM_RULE_TYPES.map((t) => [t, 0]));
  const byLevel = Object.fromEntries(GOVERNANCE_LEVELS.map((l) => [l, 0]));
  for (const rule of rules) {
    const key = `${rule.ruleType}:${rule.level}`;
    cells[key] = (cells[key] ?? 0) + 1;
    byType[rule.ruleType] += 1;
    byLevel[rule.level] += 1;
  }
  return Object.freeze({
    kind: "socializing.iad-grid",
    cells: Object.freeze(cells),
    populated: Object.keys(cells).length,
    byType: Object.freeze(byType),
    byLevel: Object.freeze(byLevel),
  });
}

// ── Graduated sanctions (Ostrom principle 5) as a truth-order descent ──

/** The escalated result of applying a graduated sanction ladder for a number of violations. */

  
    

  

/**
 * graduatedSanction — Ostrom's principle 5 (graduated, not binary, sanctions): escalate a sanction
 * across a ladder as violations accumulate. Realized as a monotone DESCENT in the bilattice TRUTH
 * ORDER ≤_t via relating's `truthMeetReading`: each violation meets the offender's standing with a
 * penalty, lowering it from `potential` (good standing) through `absurd` (a diminished intermediate
 * rung) to `active` (f — removal) at the top of the ladder. Escalation is graduated because the
 * descent is monotone and bounded, never jumping straight from good standing to removal.
 */
export function graduatedSanction(ladder, violations) {
  const rung = Math.max(0, Math.min(violations, ladder.length));
  let standing = "potential";
  for (let step = 1; step <= rung; step += 1) {
    // the final rung removes (descend to f); earlier rungs diminish (descend to ⊥) — a graduated,
    // monotone ≤_t descent rather than a binary jump.
    const penalty = step >= ladder.length ? "active" : "absurd";
    standing = truthMeetReading((standing), (penalty));
  }
  return Object.freeze({
    kind: "socializing.sanction",
    rung,
    label: rung === 0 ? "none" : ladder[rung - 1],
    standing,
    removed: standing === "active",
  });
}

// ── Polycentricity / nested enterprises (Ostrom principle 8) via the graph Laplacian + sheaf H¹ ──

/** The polycentric coherence of a set of decision centers — Ostrom's nested enterprises. */

  

    
  

  

      

  
    

/**
 * polycentricCoherence — read whether a set of decision centers forms an enduring POLYCENTRIC,
 * NESTED system (Ostrom's principle 8 + polycentric governance). Consumes relating's graph math
 * through socializing's `spectralConsensus` (the substrate-graph Laplacian: H⁰ cluster count and the
 * Matrix-Tree spanning-tree robustness) and `sheafEvidence` (the H¹ disagreement obstruction). A
 * healthy polycentric commons is plural (>1 center), coheres (H¹=0), and is robust (redundant
 * overlap) — distinct from a fragile single thread or a fragmented set of non-gluing centers.
 */
export function polycentricCoherence(
  centers,
  edges,
) {
  const spectral = spectralConsensus(centers, edges);
  const sheaf = sheafEvidence(centers, edges);
  return Object.freeze({
    kind: "socializing.polycentricity",
    centers: centers.length,
    polycentric: centers.length > 1,
    clusters: spectral.clusters,
    robust: spectral.robust,
    obstruction: sheaf.obstruction,
    coheres: centers.length > 1 && spectral.clusters === 1 && sheaf.obstruction === 0,
  });
}

/** The decision centers' evidence from their alignment readings — each center's alignment is its
 *  own testimony — for `polycentricCoherence` when the centers are described by a evidence. */
export const centerEvidence = (alignments) => Object.freeze(alignments.map((name, index) => witnessedReading(name, `center:${index}`)));

// ── The eight design principles for enduring commons governance ──

/** A description of a commons governance, sufficient to evaluate Ostrom's eight design principles. */

/** The eight-principle diagnostic of an enduring commons institution. */

  

  

  

  

  

  

  

  

  

/**
 * ostromDiagnostic — score a commons governance against Ostrom's eight design principles for
 * long-enduring common-pool-resource institutions. Each principle is a STRUCTURAL predicate over the
 * institution's IAD grid, jural relations, sanction ladder, and polycentric coherence — so the
 * diagnostic composes the other Ostrom capabilities (the grid, graduatedSanction's ladder,
 * polycentricCoherence's spectral+sheaf reading) rather than asking for opinions. An institution
 * satisfying all eight is the empirically-attested profile of a commons that endures without a
 * kyriarchist sovereign — the target for a self-governing swarm of agentic labor.
 */
export function ostromDiagnostic(institution) {
  const grid = iadGrid(institution.rules);
  const monitoring = grid.byType.information > 0
    || institution.relations.some((relation) =>
      (relation.kind === "duty" || relation.kind === "power")
      && relation.standing !== "active"
      && relation.scope.includes("monitor"));

  const principles = {
    clearBoundaries: grid.byType.boundary > 0,
    congruence: grid.byType.payoff > 0 && grid.byType.scope > 0,
    collectiveChoice: grid.byLevel["collective-choice"] > 0,
    monitoring,
    graduatedSanctions: institution.sanctionLadder.length > 1,
    conflictResolution: institution.conflictResolution,
    rightToOrganize: institution.externallyRecognized,
    nestedEnterprises: institution.polycentricity.polycentric && institution.polycentricity.coheres,
  };

  const satisfied = Object.values(principles).filter(Boolean).length;
  return Object.freeze({
    kind: "socializing.ostrom-diagnostic",
    ...principles,
    satisfied,
    enduring: satisfied === 8,
  });
}
