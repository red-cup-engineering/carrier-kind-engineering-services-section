/**
 * learning — KnowingTrace → KnowingLessons: the learning step, nested under studying.
 *
 * Third derivative. Learning distils the studied trace into lessons: every settling
 * increment that adds cells is one lesson, whose restriction is the cells it added —
 * a knowledge-increment along the knowledge order ≤_k (the verb memory has
 * actually settled: naturalized/logical induction). This is exactly the per-step
 * climb the cognizing surface names `absorb`, here over a memory-region settlement.
 * Reads only @red-cup-engineering/relating. Its codomain (KnowingLessons) is the
 * domain of `teaching` and `tutoring`.
 */

/** One lesson: the restriction (added cells) of one cell-adding settling increment. */

/** Knowing's learning carrier: the trace read through the lessons its increments yield. */

/** Derive a lesson from a cell-adding settling increment. */
function lesson(increment) {
  return Object.freeze({ kind: "knowing.lesson", increment, restriction: increment.added });
}

/** learn : KnowingTrace → KnowingLessons. Empty increments yield no retained lesson. */
export function learning(trace) {
  return Object.freeze({
    kind: "knowing.lessons",
    trace,
    lessons: Object.freeze(trace.trace.filter((increment) => increment.added.cells.length > 0).map(lesson)),
  });
}
