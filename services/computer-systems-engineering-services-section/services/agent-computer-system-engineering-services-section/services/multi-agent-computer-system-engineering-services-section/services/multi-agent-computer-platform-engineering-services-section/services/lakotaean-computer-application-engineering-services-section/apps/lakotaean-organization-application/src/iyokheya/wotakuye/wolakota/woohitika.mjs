/**
 * woohitika — bravery, the third of the four Lakota virtues, as an evaluation predicate
 * over conduct cells.
 *
 * lakotaTerm: Wóohitika — bravery; standing in danger for the people.
 *
 * Corpus: lakota/.../four-virtues-as-evaluation-predicates. This is ONE virtue of the
 * four whose cumulative MEET (∧) is standing-as-wólakȟota; the fold lives in the
 * positing hub ../wolakota.mjs, which gathers this carrier into `fourVirtues`. The
 * Virtue union and VirtueCarrier interface are declared in the hub and imported here as
 * a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** wóohitika — bravery. */
const lakota = "wóohitika";

/** The bravery virtue carrier. */
export const woohitika = Object.freeze({
  kind: "organizing-as-lakota.virtue",
  lakota,
  gloss: "bravery — standing in danger for the people",
});
