/**
 * tutoring — KnowingLessons → NextStep: a leaf under learning.
 *
 * Fourth derivative (a leaf). Tutoring is the head of learning: where teaching
 * delivers the whole ordered course, tutoring returns only the leading edge — the
 * one next lesson to take up, with the reason it comes next. The codomain holds the
 * live head lesson (or null when the trace adds no cells to learn from). Reads only
 * @red-cup-engineering/relating (through the knowing learning carrier).
 */

/** The next-step carrier: the single head lesson to take up next. */

/** tutor : KnowingLessons → NextStep. */
export function tutoring(learning) {
  const head = learning.lessons[0] ?? null;
  return Object.freeze({
    kind: "knowing.next-step",
    learning,
    lesson: head,
    reason:
      head === null
        ? "no lessons yet — the settling trace adds no cells to learn from"
        : "the first lesson of the settling trace — the next restriction to take up",
  });
}
