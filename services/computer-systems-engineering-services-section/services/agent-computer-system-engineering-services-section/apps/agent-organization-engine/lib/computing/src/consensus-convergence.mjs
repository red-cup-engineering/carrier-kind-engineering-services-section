/**
 * consensus-convergence — computing's EVENTUAL-CONSISTENCY reading: the corpus's escape from
 * the FLP IMPOSSIBILITY of asynchronous consensus, built on layer-1 capabilities.
 *
 * Layer-2 computing (= knowing among many; the effective topos over a society of agents)
 * inherits distributed computing's foundational impossibility: FLP (Fischer–Lynch–Paterson 1985)
 * proves NO deterministic asynchronous protocol can guarantee consensus terminates if even one
 * process may fail. But the corpus's ≤_k settling is monotone + inflationary + idempotent, so by
 * the **CALM theorem** (Consistency As Logical Monotonicity; cohomological-calm.md + settling-calm-
 * corollary.md: coordination-freeness ⟺ monotonicity ⟺ all Mayer–Vietoris δⁿ vanish, and settling-
 * associated sheaves are FULLY CALM-compatible — δ⁰=0 too) the society's monotone knowledge merge
 * is COORDINATION-FREE: it needs no consensus at all, so FLP's impossibility never applies to it.
 * And by the no-non-trivial-periodic-orbit theorem (the layer-1 capability behind knowing's
 * `attract`) that merge CONVERGES to a fixed point. So the distributed computation reaches
 * EVENTUAL CONSISTENCY coordination-free and terminating — FLP sidestepped.
 *
 * Consensus (and FLP's impossibility) is needed for ONE thing only: collapsing a CONTESTED ⊤ cell
 * (members told both for and against) into a single decided value — a NON-monotone act (it retracts
 * one side). The bilattice does not do that; it HOLDS the ⊤ (the negation involution, paraconsistent).
 * So the FLP-hard core is isolated EXACTLY to the contested ⊤ cells; everything else the society
 * computes coordination-free. This reading reports that decomposition.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { probability } from "@red-cup-engineering/relating";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { closureRegimeData } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";
import { closureRegimeName } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { markovStationaryIsClosureFixpoint, natStochSemiring, stochasticIsValueSettling, uniformWitness, witnessKernel } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/stochastic";

import { admitSeed, descend } from "@red-cup-engineering/animating/becoming/descending";
import { computingFace } from "./face.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** A finite Markov/stochastic-settling receipt for computing convergence. */

/** computing's eventual-consistency verdict — the CALM/FLP decomposition of a society's
 *  distributed knowledge computation. */

  

    

  
        
  

    
  

  

    

    

  
  

  

function recordField(record, key) {
  const value = record[key];
  if (value === undefined) throw new TypeError(`stochastic-convergence: missing ${key}`);
  return value;
}

function asRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`stochastic-convergence: ${label} is not an object`);
  }
  return value;
}

function asString(value, label) {
  if (typeof value !== "string") throw new TypeError(`stochastic-convergence: ${label} is not a string`);
  return value;
}

function asBoolean(value, label) {
  if (typeof value !== "boolean") throw new TypeError(`stochastic-convergence: ${label} is not a boolean`);
  return value;
}

/** Read computing convergence through the finite RelMath stochastic-settling witness. */
export function stochasticConvergenceReceipt() {
  const stationary = markovStationaryIsClosureFixpoint(witnessKernel, natStochSemiring, uniformWitness);
  const normalizedStationary = asRecord(
    evaluateRunTerm(probability.markovStationaryIsClosureFixpoint, stationary),
    "stationary witness",
  );
  const regimeData = closureRegimeData(true, true, true);
  if (regimeData.kind !== "settling.closureRegimeData:witness") {
    throw new TypeError("stochastic-convergence: finite regime data was obstructed");
  }
  const settling = stochasticIsValueSettling(natStochSemiring, regimeData.data);
  const normalizedSettling = asRecord(
    evaluateRunTerm(probability.stochasticIsValueSettling, settling),
    "stochastic settling witness",
  );
  const normalizedRegime = asRecord(recordField(normalizedSettling, "regime"), "stochastic regime");

  return Object.freeze({
    kind: "computing.stochastic-convergence-receipt",
    stationaryKind: asString(recordField(normalizedStationary, "kind"), "stationary kind"),
    fixedPoint: asBoolean(recordField(normalizedStationary, "fixpoint"), "stationary fixpoint"),
    equivalent: asBoolean(recordField(normalizedStationary, "equivalent"), "stationary equivalent"),
    senNormalized: asString(recordField(normalizedStationary, "kind"), "stationary kind") === stationary.kind
      && asString(recordField(normalizedSettling, "kind"), "stochastic settling kind") === settling.kind,
    regime: closureRegimeName(normalizedRegime),
    stationaryExists: asBoolean(recordField(normalizedSettling, "stationaryExists"), "stationary exists"),
  });
}

/**
 * eventualConsistency — read a society's distributed knowledge computation through the CALM/FLP
 * lens. The society's monotone ≤_k merge is coordination-free (CALM) and convergent (no-periodic-
 * orbit), so it reaches eventual consistency without consensus — FLP-immune. The reading isolates
 * the contested ⊤ concerns (the FLP-hard core, where a forced decision would need consensus) from
 * the decided ones (computed coordination-free). Reuses computing's own inside/knowledge face.
 */
export function eventualConsistency(membrane) {
  const face = computingFace(membrane);
  const decided = face.belnap.potential + face.belnap.active;
  const contested = face.belnap.stable; // = face.contested
  const undecided = face.belnap.absurd;
  return {
    kind: "computing.eventual-consistency",
    members: face.members,
    concerns: face.cover,
    monotone: true,            // the ≤_k CRDT join is inflationary + idempotent
    coordinationFree: true,    // CALM: monotone ⟺ coordination-free (δ⁰=0 for settling sheaves)
    converges: true,           // no-non-trivial-periodic-orbit: the merge terminates
    stochastic: stochasticConvergenceReceipt(),
    decided,
    contested,
    undecided,
    consensusRequired: contested > 0,
    flpEscaped: contested === 0,
  };
}

const EVENTUAL_CONSISTENCY_SCHEMA = Object.freeze({
  title: "EventualConsistency",
  type: "object",
  description: "the CALM/FLP decomposition of a society's distributed knowledge computation: monotone + coordinationFree (CALM) + converges (no-periodic-orbit) = eventual consistency without consensus (FLP-immune); decided cells computed coordination-free, contested ⊤ cells the isolated FLP-hard core, flpEscaped when none are contested.",
});

/** eventual-consistency — read a society's distributed computation: coordination-free convergence
 *  (CALM + no-periodic-orbit) and the isolated FLP-hard core (the contested ⊤ cells). */
const societyMembraneCarrier = schemaFrom({
  $id: "computing/society-membrane",
  title: "SocietyMembrane",
  description: "An inter-agent membrane: newline agent|claim lines or a JSON array of seed items.",
  type: ["string", "array"],
});

const eventualConsistencyCarrier = schemaFrom({
  $id: "computing/eventual-consistency",
  title: "EventualConsistency",
  type: "object",
  description: EVENTUAL_CONSISTENCY_SCHEMA.description,
  required: ["kind", "members", "concerns", "monotone", "coordinationFree", "converges", "stochastic", "decided", "contested", "undecided", "consensusRequired", "flpEscaped"],
  properties: {
    kind: { const: "computing.eventual-consistency" },
    members: { type: "integer", minimum: 0 },
    concerns: { type: "integer", minimum: 0 },
    monotone: { type: "boolean" },
    coordinationFree: { type: "boolean" },
    converges: { type: "boolean" },
    stochastic: { type: "object" },
    decided: { type: "integer", minimum: 0 },
    contested: { type: "integer", minimum: 0 },
    undecided: { type: "integer", minimum: 0 },
    consensusRequired: { type: "boolean" },
    flpEscaped: { type: "boolean" },
  },
  additionalProperties: false,
});

export const eventualConsistencyAction = operation({
  verb: "eventual-consistency",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a society's distributed knowledge computation: coordination-free convergence (CALM + no-periodic-orbit) sidesteps FLP; isolate the contested ⊤ cells that would need consensus.",
  description: "Domain: an inter-agent membrane — newline `agent|claim` lines, or a JSON array of `[agent, claim]` / `{ subject, predicate }` items (the society's log). Codomain: computing/eventual-consistency — the CALM/FLP decomposition: the society's monotone ≤_k merge is COORDINATION-FREE (CALM theorem: monotonicity ⟺ coordination-freeness; settling sheaves are fully CALM-compatible) and CONVERGES (no-non-trivial-periodic-orbit theorem), so it reaches eventual consistency WITHOUT consensus — FLP's impossibility never applies to it. Consensus is needed only to collapse a CONTESTED ⊤ cell to a single decision (a non-monotone act the bilattice refuses); so the FLP-hard core is isolated exactly to the contested cells, everything else computed coordination-free. Grounded in cohomological-calm.md + settling-calm-corollary.md + closure-monad-no-non-trivial-periodic-orbits.md.",
  domain: societyMembraneCarrier,
  codomain: eventualConsistencyCarrier,
  run: (input) =>
    jsonResource(eventualConsistency(descend(admitSeed(input)).utterances), "eventual-consistency"),
});
