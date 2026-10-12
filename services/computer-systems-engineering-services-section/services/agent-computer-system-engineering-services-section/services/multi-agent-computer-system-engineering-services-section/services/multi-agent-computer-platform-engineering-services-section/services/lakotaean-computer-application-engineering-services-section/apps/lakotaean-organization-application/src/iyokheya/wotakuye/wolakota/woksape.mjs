/**
 * woksape — wisdom, the second of the four Lakota virtues, as an evaluation predicate
 * over conduct cells.
 *
 * lakotaTerm: Wóksape — wisdom; knowing the right relation and the right time.
 *
 * Corpus: lakota/.../four-virtues-as-evaluation-predicates. This is ONE virtue of the
 * four whose cumulative MEET (∧) is standing-as-wólakȟota; the fold lives in the
 * positing hub ../wolakota.mjs, which gathers this carrier into `fourVirtues`. The
 * Virtue union and VirtueCarrier interface are declared in the hub and imported here as
 * a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** wóksape — wisdom. */
const lakota = "wóksape";

/** The wisdom virtue carrier. */
export const woksape = Object.freeze({
  kind: "organizing-as-lakota.virtue",
  lakota,
  gloss: "wisdom — knowing the right relation and the right time",
});
