/**
 * embodying/boundary — the agent's in/out membrane as a settled relating carrier.
 *
 * An agent's boundary is the membrane across which it perceives (input) and acts
 * (output). This module settles a log of membrane utterances into a relating
 * fixed-point reading whose section is the agent's standing perspective: what it
 * has prehended, at what bilattice reading, across what predicates. The handedness
 * coordinates (`../handedness`) polarize that membrane — recv/observe inbound,
 * send/actuate outbound — but the membrane's *content* is this settled section.
 *
 * This is the seed the agency descent (becoming → doing → working → governing)
 * reads as its settled-individual codomain: the boundary carrier IS the glued
 * sheaf the governing stage produces, read at its knowledge-least section. The
 * package keeps domain logic over carriers here; wire codecs live at the actions.
 */

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";



import { descend } from "../../../descending.mjs";
export { conesOfUtterances, settleUtterances } from "../../../descending.mjs";
import {
  cellKey,
  predicateMatches,
  termTouches,

} from "./relation-boundary.mjs";
import { sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

export { transition } from "./transition.mjs";

// ---------- private boundary helpers ----------

const truthPresent = (name) => sidesOfReading(name)[0];

const sameCell = (left, right) => cellKey(left) === cellKey(right);

const sectionValues = (carrier) => carrier.state.section.map((told) => ({ cell: told, value: knowledgeReading(told) }));

// ---------- boundary settlement ----------

/**
 * An agent's settled boundary: the carrier whose readings present the agent's
 * perspective on what it has prehended across its membrane.
 */

const buildBoundary = (utterances) => {
  if (utterances.length === 0) throw new TypeError("a boundary settlement requires at least one utterance");
  const log = Object.freeze([...utterances]);
  const state = descend(log);
  return Object.freeze({
    kind: "animating.agent.boundary.carrier",
    utterances: log,
    state,
    settlement: state.settlement,
  });
};

/** Settle a membrane log into the agent's boundary carrier. */
export function settleBoundary(utterances) {
  return buildBoundary(utterances);
}

/** Settle a list of membrane utterances into an AgentBoundaryCarrier. */
export function induceAgentBoundary(utterances) {
  return buildBoundary(utterances);
}

/** Extend an existing agent boundary with a delta of further utterances, re-settled. */
export function extendAgentBoundary(
  carrier,
  delta,
) {
  return buildBoundary([...carrier.utterances, ...delta]);
}

/** The knowledge-least section of a settled boundary — the agent's standing perspective. */
export function boundarySection(carrier) {
  return carrier.state.section;
}

// ---------- bearing — did a claim's potential appear between two states? ----------

/**
 * A bearing reading where a claim's potential appeared at a cell: the cell with
 * its reading value before and after settlement.
 */

/**
 * A bearing reading where a cell's truth-presence stayed put between two
 * settled states: the cell and its unchanged reading value.
 */

/**
 * A bearing reading where a claim's potential withdrew at a cell: the cell with
 * its reading value before and after. Evidence is monotone, so withdrawal
 * refuses a bearing name.
 */

/** The outcome of a bearing read at a cell: an affirmation, a silence, or an obstruction. */

/** Between two settled states, at a cell, did the claim's potential appear (affirmation),
 *  stay put (silence), or withdraw (obstruction)?  Evidence is monotone, so withdrawal
 *  refuses a bearing name.  There is no denial: a contrary fact is its own claim. */
export function bearing(before, after, cell) {
  const find = (carrier) => {
    const match = sectionValues(carrier).find((entry) => sameCell(entry.cell, cell));
    return match?.value ?? "absurd";
  };
  const earlier = find(before);
  const later = find(after);
  if (truthPresent(earlier) && !truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing-obstruction", cell, before: earlier, after: later });
  }
  if (!truthPresent(earlier) && truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing.affirmation", cell, before: earlier, after: later });
  }
  return Object.freeze({ kind: "animating.agent.bearing.silence", cell, value: later });
}

// ---------- membrane — a term's boundary situation ----------

/**
 * A term's boundary situation: every section entry whose subject or object is
 * the term, with the contested (stable) and open (absurd) entries singled out.
 */

  

  

/**
 * Build a BoundaryCarrier for a term over a section: collect the entries
 * mentioning the term as subject or object and partition out those reading
 * stable and absurd.
 */
export function boundary(section, term) {
  const entries = section.filter((told) => termTouches(told.subject, term) || termTouches(told.object, term));
  const named = (name) => Object.freeze(entries.filter((told) => knowledgeReading(told) === name));
  return Object.freeze({
    kind: "animating.agent.boundary",
    entries: Object.freeze(entries),
    stable: named("stable"),
    absurd: named("absurd"),
  });
}

/** The stable and absurd entries of a boundary, where the situation is contested
 *  or open, optionally restricted to predicates the locus can perceive. */
export function affordances(
  boundaryCarrier,
  perceivable,
) {
  const open = [...boundaryCarrier.stable, ...boundaryCarrier.absurd];
  if (perceivable === undefined) return Object.freeze(open);
  return Object.freeze(open.filter((told) => perceivable.some((input) => predicateMatches(told.predicate, input))));
}
