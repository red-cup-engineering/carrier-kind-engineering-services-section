/**
 * @packageDocumentation
 *
 * settling/bigraded-cohomology — the bigraded refinement of settling cohomology.
 *
 * The paraconsistent settling sheaf splits F^(k) ≅ F^(t) ⊕ F^(⊤): the consistent
 * TRUTH row (m=0) ⊕ the held-CONTRADICTION row (m=1), corresponding to the two adjoint
 * systems of the predication hyperdoctrine (content/…/settling-cohomology/content/
 * bigraded-settling-cohomology/2026-06-18-reference-on-bigraded-settling-cohomology.md). A FOUR cell is placed by
 * its twist-product coordinates ⟨truth, falsity⟩: exactly one evidence side present ↦ the
 * truth row (potential ⟨1,0⟩ / active ⟨0,1⟩, the non-contradictory directions); BOTH sides
 * present ↦ the contradiction row (contested ⟨1,1⟩ = told-both); neither ↦ unknown ⟨0,0⟩
 * (outside the F^(k) non-unknown content).
 *
 * Regime reading: when F^(⊤) = 0 the bigrading collapses to single-graded truth
 * cohomology (H^{1,n} = 0, H^{0,n} = H^n_t). Lean's
 * input data and the strict/Scott collapse reading at the cochain level; the
 * cohomology-level long exact sequence remains a frontier. This Node module implements
 * the executable FOUR-census read: truth row, contradiction row, and collapse
 * witness/obstruction.
 *
 * Pure proof-tree math, sited beside settling/cohomology; faculties parameterize it (a face
 * supplies its own FOUR census or settled charges; the decomposition law lives here).
 */

/** Witness that the contradiction row F^(⊤) vanishes: the bigrading collapses to single-graded
 *  truth cohomology — the consistent (strict/Scott) regime, fully CALM-compatible. */
export const bigradingCollapseWitnessSchema = {
  $id: "metroplat/closure/bigraded-cohomology/bigrading-collapse-witness",
  type: "object",
  required: ["kind", "contradiction"],
  properties: {
    kind: { const: "predication.bigradedCohomology.collapse:witness" },
    contradiction: { type: "number" },
  },
  additionalProperties: false,
  title: "BigradingCollapseWitness",
  description: "The contradiction row F^(top) vanishes: the bigrading collapses to single-graded truth cohomology.",
};

/** Obstruction recording a non-empty contradiction row F^(⊤): a genuinely 2-dimensional
 *  bigrading — an inconsistent (transfinite/aperiodic) settling with merged contradictions. */
export const bigradingObstructionSchema = {
  $id: "metroplat/closure/bigraded-cohomology/bigrading-obstruction",
  type: "object",
  required: ["kind", "contradiction"],
  properties: {
    kind: { const: "predication.bigradedCohomology.collapse-obstruction" },
    contradiction: { type: "number" },
  },
  additionalProperties: false,
  title: "BigradingObstruction",
  description: "The contradiction row F^(top) is non-empty: a genuinely 2-dimensional bigrading.",
};

/** The result of the bigrading-collapse check: F^(⊤) = 0 (witness) or F^(⊤) ≠ 0 (obstruction). */

/** The bigraded decomposition F^(k) ≅ F^(t) ⊕ F^(⊤) of a settled FOUR census. */

   

    

/** Whether the contradiction row vanishes (the bigrading collapses; the consistent CALM regime). */
export function bigradingCollapse(contradiction) {
  return contradiction === 0
    ? Object.freeze({ kind: "predication.bigradedCohomology.collapse:witness", contradiction })
    : Object.freeze({ kind: "predication.bigradedCohomology.collapse-obstruction", contradiction });
}

/** The bigraded settling-cohomology decomposition of a FOUR census: F^(t) = potential + active
 *  (the consistent truth directions), F^(⊤) = stable (the held contradictions). */
export function bigradedCohomology(census) {
  const truth = census.unknown + census.held;
  const contradiction = census.denied;
  return Object.freeze({
    kind: "predication.bigradedCohomology",
    truth,
    contradiction,
    collapse: bigradingCollapse(contradiction),
  });
}

/** Place a single charge value in its bigraded row by its twist-product coordinates:
 *  both evidence sides present ↦ contradiction (⊤), exactly one ↦ truth, neither ↦ unknown (⊥). */
export function bigradedRow(value) {
  const [truthSide, falsitySide] = value.coordinates;
  const truthPresent = truthSide.name === "present";
  const falsityPresent = falsitySide.name === "present";
  if (truthPresent && falsityPresent) return "contradiction";
  if (truthPresent || falsityPresent) return "truth";
  return "contested";
}

/** The bigraded decomposition of a list of settled charge values, read off their twist-product
 *  coordinates (the faithful charge-level form of `bigradedCohomology`). */
export function bigradedCohomologyOfCharges(values) {
  const census = { contested: 0, unknown: 0, held: 0, denied: 0 };
  for (const value of values) {
    const row = bigradedRow(value);
    if (row === "contradiction") census.denied += 1;
    else if (row === "truth") census.unknown += 1; // truth row F^(t) (sign folded; only the row rank matters)
    else census.contested += 1;
  }
  return bigradedCohomology(census);
}
