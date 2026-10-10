/**
 * The listening algebra over readings: a reading's parse status, and Lambek fusion in the truth
 * order with its right residual — all SignChain's reading operations.
 */
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { truthJoinReading, truthLeqReading, truthMeetReading, readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** A settled value's parse status: ambiguous (told both), void (told nothing), or decided. */
export const readingStatus = (value) => {
  const name = typeof value === "string" ? value : knowledgeReading(value);
  if (name === "stable") return "ambiguous";
  if (name === "absurd") return "void";
  return "decided";
};

/** Lambek fusion: combine a grammatical predicate and argument in the truth order. */
export const fuse = (left, right) => truthMeetReading(left, right);

/** Right residual of fusion: the largest reading a in the truth order such that fuse(a, b) ≤ c. */
export const implies = (b, c) => readingFamilies.knowledge
  .filter((a) => truthLeqReading(fuse(a, b), c))
  .reduce((acc, a) => truthJoinReading(acc, a), "active");
