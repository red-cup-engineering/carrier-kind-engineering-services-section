// posit — the scott-continuous generator. Consumes cohere's residue (the value-free fiber); packages it as a
// presheaf whose stalks take bilattice charges, and seeds the knowledge-least valuation via seed-knowledge
// (BOTTOM on every cell of Phi = E x Pi x E). The truth-axis dual seed-truth (under this category) adds the
// truth-monotone trace later; the two seeds are siblings.
import cohere from "../../cohering/scripts/cohere.mjs";
import seedKnowledge from "../library/category/seeding-knowledge/scripts/seed-knowledge.mjs";

export default function posit(category) {
  const { residue: fiber } = cohere(category);
  const fibers = seedKnowledge(fiber);
  const presheaf = { fiber, base: fiber.base, "entity-set": fiber["entity-set"], fibers };
  const valuation = { base: fiber.base, "fiber-algebras": fibers };
  return { presheaf, traces: [{ valuations: [valuation] }] };
}
