/**
 * recuperation — the AFFECTIVE-cluster detectors of the californication note (§9, affective battery):
 * the readings that watch DESIRE rather than structure. Kept distinct from the structural cluster
 * (`integrity.mts`) by the note's Proposition 2 — a polity can pass every structural audit and be
 * wholly californicated, so these measure something the structural battery cannot see.
 *
 * The keystone is the SETTLING TRAJECTORY and its best-mathematics reading. The corpus proves the
 * social settling is ≤_k-MONOTONE: a synchronous gossip-merge (∨_k) only ever ACCUMULATES — surfacing
 * disagreement, never resolving it (joining a `potential` with an `active` yields ⊤, and ⊤ is the
 * knowledge-order top, absorbing). So along a NATURAL settling trajectory the contested-cell count is
 * non-decreasing. It follows that ANY DROP in contestation is a violation of settling-monotonicity —
 * it cannot arise from the settling itself, only from an external INTERVENTION on the field. That is
 * exactly recuperation: the anti-monotone move that takes a live ⊤ and returns a managed value. We tell
 * a recuperative discharge (the ⊤ vanished into managed consensus, membership intact) from an organized
 * exit (the ⊤ resolved by fission — a coincident drop in membership, a secession) structurally.
 *
 *   affectiveRecuperationIndex — discharge rate: of the contestation removed along the trajectory, how
 *                                much vanished as managed mood vs how much organized into exit.
 *   recursiveGovernance        — the feedback-containment loop: disturbances absorbed back to quiet by
 *                                discharge rather than by structural change (Result 3, forced convergence).
 *   harmGovernance             — care turned to risk-management: a reparative duty shadowed by a
 *                                surveillance/pre-emptive power over the same offender.
 *
 * Consumes the settling family `settleTrajectory` (`settle.mts`) and relating's bilattice value algebra;
 * re-derives no closure math.
 */
import { address, isCell, knowledgeReading } from "@red-cup-engineering/signcell/cell";

import { settleTrajectory } from "./settle.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// ── The settling-trajectory carrier ──

/** A recorded settling trajectory — the monotone family (v_τ) of field stages across the gossip-merge
 *  rounds, the first-class temporal object the affective readings work over. */

   

    

/** Record the natural settling trajectory of a field (the monotone ∨_k gossip family). */
export function settlingTrajectory(field) {
  const { stages, closureOrdinal } = settleTrajectory(field);
  return Object.freeze({ kind: "socializing.settling-trajectory", stages: Object.freeze([...stages]), closureOrdinal });
}

/** Build a trajectory from an explicit sequence of field stages — e.g. a history that interleaves
 *  governance INTERVENTIONS between settling rounds (the case where recuperation can actually occur,
 *  since the natural settling alone is monotone and never discharges). */
export function trajectoryFromStages(stages) {
  return Object.freeze({
    kind: "socializing.settling-trajectory",
    stages: Object.freeze([...stages]),
    closureOrdinal: Math.max(0, stages.length - 1),
  });
}

/** The number of CONTESTED cells in a field: cells whose ∨_k aggregate over the observers' evidence is
 *  ⊤ stable (told-both). The held-contradiction surface of the field at one stage. */
export function contestedCells(field) {
  const aggregate = new Map();
  for (const member of field.members) {
    for (const raw of member.memes) {
      const meme = raw;
      if (!isCell(meme)) continue;
      const value = knowledgeReading(meme);
      const key = address(meme);
      const prior = aggregate.get(key);
      aggregate.set(key, prior === undefined ? value : knowledgeJoinReading(prior, value));
    }
  }
  let contested = 0;
  for (const value of aggregate.values()) if (value === "stable") contested += 1;
  return contested;
}

// ── affectiveRecuperationIndex ──

/** The affective-recuperation reading over a settling trajectory. */

    

    

    

  

  

/**
 * affectiveRecuperationIndex — measure, along a settling trajectory, the rate at which live contestation
 * (⊤) is DISCHARGED as managed mood versus ORGANIZED into exit. Because the natural settling is
 * ≤_k-monotone, every contestation drop is an anti-monotone intervention; a drop with membership intact
 * is a managed discharge, a drop coincident with a membership loss is an organized secession. A trajectory
 * whose contestation falls below its starting level chiefly by discharge is in forced convergence — the
 * note's Result 3, consensus reached by affect-management rather than agreement.
 */
export function affectiveRecuperationIndex(trajectory) {
  const stages = trajectory.stages;
  let discharged = 0;
  let organized = 0;
  for (let i = 0; i + 1 < stages.length; i += 1) {
    const before = contestedCells(stages[i]);
    const after = contestedCells(stages[i + 1]);
    const drop = before - after;
    if (drop > 0) {
      const membersLost = stages[i].members.length - stages[i + 1].members.length;
      if (membersLost > 0) organized += drop;
      else discharged += drop;
    }
  }
  const removed = discharged + organized;
  const initialContested = stages.length > 0 ? contestedCells(stages[0]) : 0;
  const finalContested = stages.length > 0 ? contestedCells(stages[stages.length - 1]) : 0;
  return Object.freeze({
    kind: "socializing.recuperation-index",
    rounds: Math.max(0, stages.length - 1),
    discharged,
    organized,
    index: removed > 0 ? discharged / removed : 0,
    recuperated: discharged > organized,
    finalContested,
    forcedConvergence: discharged > organized && finalContested < initialContested,
  });
}

// ── recursiveGovernance ──

/** The feedback-containment reading over a trajectory. */

/**
 * recursiveGovernance — read whether a polity governs by CONTAINMENT: meeting each disturbance (a rise
 * in contestation) with a discharge that re-tunes the subjects back to quiet, rather than letting the
 * disturbance force a structural change. The cybernetic feedback loop as governance — the mechanism that
 * keeps a system in a bounded, coordination-free regime by absorbing exactly the excess that would
 * otherwise keep it alive and unsettled.
 */
export function recursiveGovernance(trajectory) {
  const stages = trajectory.stages;
  let absorptions = 0;
  let rose = false;
  for (let i = 0; i + 1 < stages.length; i += 1) {
    const before = contestedCells(stages[i]);
    const after = contestedCells(stages[i + 1]);
    if (after > before) rose = true;
    else if (after < before && rose && stages[i].members.length === stages[i + 1].members.length) {
      absorptions += 1; // a rise was discharged back down with membership intact — a containment loop
      rose = false;
    }
  }
  const index = affectiveRecuperationIndex(trajectory);
  return Object.freeze({
    kind: "socializing.recursive-governance",
    absorptions,
    contained: absorptions > 0 && index.recuperated,
  });
}

// ── harmGovernance ──

/** The harm-governance reading over a restoration and the surrounding field. */

  

const SURVEILLANCE = /(monitor|surveil|surveillance|pre-?empt|risk|watch|flag|score)/i;
const held = (relation) =>
  relation.standing === "potential" || relation.standing === "stable";

/**
 * harmGovernance — detect care curdling into risk-management. A restoration is reparative by construction
 * (it aims at reintegration, not punishment); it becomes harm-governance when the same offender is also
 * placed under a held surveillance/pre-emptive power — the reparative gesture shadowed by control, the
 * worked example of californication's inversion of care.
 */
export function harmGovernance(restoration, relations) {
  const offender = restoration.reparation.active;
  const surveillance = relations.some((relation) =>
    relation.kind === "power"
    && held(relation)
    && relation.passive === offender
    && SURVEILLANCE.test(relation.scope));
  return Object.freeze({
    kind: "socializing.harm-governance",
    reparative: restoration.reintegrative,
    surveillance,
    mode: surveillance ? "risk-management" : "reparative",
  });
}
