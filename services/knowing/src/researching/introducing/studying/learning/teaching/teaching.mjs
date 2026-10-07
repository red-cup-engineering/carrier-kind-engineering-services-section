/**
 * teaching — KnowingLessons → Curriculum: a leaf under learning.
 *
 * Fourth derivative (a leaf). Teaching takes the lessons learning distilled and
 * presents them as a course — the ordered sequence of lessons to deliver. learning
 * answers "what is learned"; teaching answers "in what order is it delivered". The
 * codomain holds the live upstream lessons (composable) in delivery order. Reads only
 * @red-cup-engineering/relating (through the knowing learning carrier).
 */

/** The curriculum carrier: a research act's lessons ordered for delivery. */

/** teach : KnowingLessons → Curriculum. */
export function teaching(learning) {
  return Object.freeze({
    kind: "knowing.curriculum",
    learning,
    lessons: Object.freeze([...learning.lessons]),
  });
}
