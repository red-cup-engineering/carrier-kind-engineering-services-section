/**
 * animating boundary transition — measurement of change between settled agent boundaries.
 *
 * Where the boundary membrane reads structure off a settled carrier (sections,
 * affordances), transition measures the delta between two carriers. The primitive
 * is `transition`: given two settled boundary states, enumerate exactly which cells
 * shifted reading and by how much on the knowledge order. This is the per-cell delta
 * the perceive→act loop reads to know what one turn of agency changed.
 */

import { knowledgeReading, sameCell } from "@red-cup-engineering/signcell/cell";
import { sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// ---------- private helpers ----------

const knowledgeHeight = (name) => sidesOfReading(name).filter(Boolean).length;

const sectionValues = (carrier) => carrier.state.section.map((told) => ({ cell: told, value: knowledgeReading(told) }));

// ---------- transition ----------

/**
 * A single cell's reading change between two settled carriers: the cell, its
 * before and after reading values, and knowledgeShift, the signed integer in
 * -2..2 giving the movement in knowledge-order height.
 */

/**
 * The result of a transition: holds shifts, the set of every cell whose reading
 * changed between two carriers. Cells that did not change are absent, and cells
 * entering or leaving the carrier appear as shifts to or from the absurd
 * reading.
 */

/** The reading transition between two carriers, read at the knowledge-least section.
 *  Absence is data: cells that enter or leave the carrier appear as shifts from or
 *  to the absurd reading. */
export function transition(before, after) {
  const earlier = sectionValues(before);
  const later = sectionValues(after);
  const shifts = [];

  const shifted = (cell, beforeValue, afterValue) => {
    if (beforeValue === afterValue) return;
    shifts.push(Object.freeze({
      kind: "animating.analysis.shift",
      cell,
      before: beforeValue,
      after: afterValue,
      knowledgeShift: knowledgeHeight(afterValue) - knowledgeHeight(beforeValue),
    }));
  };

  for (const entry of earlier) {
    const counterpart = later.find((candidate) => sameCell(candidate.cell, entry.cell));
    shifted(entry.cell, entry.value, counterpart?.value ?? "absurd");
  }
  for (const entry of later) {
    if (!earlier.some((candidate) => sameCell(candidate.cell, entry.cell))) {
      shifted(entry.cell, "absurd", entry.value);
    }
  }
  return Object.freeze({ kind: "animating.analysis.transition", shifts: Object.freeze(shifts) });
}
