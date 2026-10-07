import { knowledgeMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { closeOrdinalProcess, closureProcess, closureReadout, closureRegimeName, omegaOrdinal, stabilizingSup } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { regimeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";
/**
 * epistemics — socializing's COMMON-KNOWLEDGE fixed point, tied to the closure-regime ladder, with
 * Aumann's agreement theorem as the degenerate (gluing) case. This wires the package's epistemic face
 * (the static bigraded common-knowledge read in `face.mts`) to its dynamic machinery (the four
 * closure regimes in `regime.mts`): common knowledge is not a flat read but the limit of an iterated
 * closure, and its closure ordinal IS its regime.
 *
 * Mutual knowledge is the iterated "everyone knows" operator: E⁰φ = φ, E^{n+1}φ = "every agent knows
 * E^n φ". Realized as the iterated bilattice KNOWLEDGE-MEET ⋀_k across the agents' values (∧_k is the
 * consensus/limit operation, idempotent). COMMON KNOWLEDGE is the greatest fixed point C φ = ⋀_n E^n φ
 * — the ω-limit of the mutual-knowledge tower.
 *
 * The regime tie (the fun part): over a RELIABLE channel the tower stabilizes at a finite stage (the
 * STRICT regime, κ < ω) and common knowledge is attained = the ∧_k consensus value. Over a LOSSY
 * channel each level loses a little and the tower never closes to the shared value (Halpern–Moses:
 * common knowledge is unattainable with unreliable communication) — the APERIODIC regime, κ ≥ ω₁, the
 * limit never settling. AUMANN's agreement theorem falls out: with a common prior, if the agents'
 * posteriors are common knowledge (the tower closes to a definite value), they cannot disagree — the
 * ∧_k consensus is definite ⟺ the posteriors glue. "Agreeing to disagree" is exactly a non-closing
 * tower or a ⊤ consensus.
 *
 * Consumes relating's ∧_k knowledge-meet and socializing's `Regime`; re-authors none.
 */

/** The level-n mutual-knowledge value over the agents — the n-fold iterated ∧_k "everyone knows". */

/** The ∧_k knowledge-meet over the agents' values — what they ALL share (the consensus limit). Folded
 *  from the ≤_k top ⊤ (the meet identity); the empty set is ⊤ (vacuously shared). */
function knowledgeMeet(agentValues) {
  return agentValues.reduce((meet, value) => knowledgeMeetReading((meet), (value)), "stable");
}

/**
 * mutualKnowledge — the level-`depth` mutual knowledge of a proposition across the agents. E¹ is the
 * ∧_k meet (everyone knows it); higher levels iterate (idempotent over a flat set, so the tower
 * stabilizes from level 1 over a reliable channel — the finite closure ordinal). Returns the value at
 * each level 1..depth so the stabilization (the closure stage) is inspectable.
 */
export function mutualKnowledge(agentValues, depth) {
  const meet = knowledgeMeet(agentValues);
  const levels = [];
  let value = agentValues.length === 0 ? "stable" : meet;
  for (let level = 1; level <= Math.max(1, depth); level += 1) {
    // E^{n+1} = everyone knows E^n: meeting the shared value with itself is idempotent, so the tower
    // is stable from level 1 over a reliable channel (this is exactly why finite agents reach common
    // knowledge in a finite — strict-regime — number of rounds).
    value = knowledgeMeetReading((value), (meet));
    levels.push(Object.freeze({ level, value }));
  }
  return Object.freeze(levels);
}

/** The common-knowledge reading: the greatest fixed point of the mutual-knowledge tower, its regime,
 *  and whether it is attained. */

    

  
  

  

  
    

/**
 * commonKnowledge — the greatest fixed point of the mutual-knowledge tower over the agents' values,
 * with its regime. Over a reliable channel the tower closes finitely (strict regime) and common
 * knowledge is the ∧_k consensus, attained iff that value is definite. Over a lossy channel the tower
 * never closes (aperiodic regime, Halpern–Moses) and common knowledge is unattainable regardless of
 * the value. `reliableChannel` defaults to true (the synchronous, lossless case).
 */
export function commonKnowledge(agentValues, reliableChannel = true) {
  const value = agentValues.length === 0 ? "stable" : knowledgeMeet(agentValues);
  const definite = value === "potential" || value === "active";
  const tower = reliableChannel ? closedTower(value) : unclosedTower;
  return Object.freeze({
    kind: "socializing.common-knowledge",
    value,
    attained: reliableChannel && definite,
    closureLevel: tower.stage,
    regime: tower.regime,
  });
}

/** The reliable tower run through the closure engine: E⁰ is ⊤ ("stable", the meet identity) and
 *  E^{n+1} = E^n ∧_k shared. A meet with a constant over the finite FOUR lattice is Scott-continuous,
 *  so its closure ordinal and regime are observed, not stated. */
const closedTower = (shared) => closureReadout(closeOrdinalProcess(closureProcess(
  { bottom: "stable", eq: Object.is, sup: stabilizingSup({ eq: Object.is }) },
  (level) => knowledgeMeetReading(level, shared),
  undefined,
  true,
)));

/** The lossy tower (Halpern–Moses): no finite stage closes it, and it is neither Scott-continuous nor
 *  countably cofinal, so its regime is read off ω under those failures. */
const unclosedTower = Object.freeze({ stage: null, regime: closureRegimeName(regimeOfOrdinal(omegaOrdinal(), false, false)) });

/** Aumann's agreement reading over the agents' posteriors on a proposition. */

  

  

/**
 * aumannAgreement — Aumann's "agreeing to disagree" theorem: with a common prior, if the agents'
 * posteriors are common knowledge, they must be equal. Here the posteriors are FOUR values; they are
 * common knowledge iff their mutual-knowledge tower closes to a definite value over a reliable
 * channel. `cannotDisagree` encodes the theorem: common knowledge of the posteriors ⇒ they agree; a
 * model with common knowledge of distinct posteriors is impossible (a violated common prior).
 */
export function aumannAgreement(posteriors, reliableChannel = true) {
  const agree = posteriors.length > 0 && posteriors.every((value) => value === posteriors[0]);
  const ck = commonKnowledge(posteriors, reliableChannel);
  return Object.freeze({
    kind: "socializing.aumann",
    agree,
    commonlyKnown: ck.attained,
    cannotDisagree: !ck.attained || agree,
  });
}
