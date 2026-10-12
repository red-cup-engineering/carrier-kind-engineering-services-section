/**
 * wowacintanka — fortitude, the fourth of the four Lakota virtues, as an evaluation
 * predicate over conduct cells.
 *
 * lakotaTerm: Wówačhiŋtȟaŋka — fortitude; enduring hardship without complaint.
 *
 * Corpus: lakota/.../four-virtues-as-evaluation-predicates. This is ONE virtue of the
 * four whose cumulative MEET (∧) is standing-as-wólakȟota; the fold lives in the
 * positing hub ../wolakota.mjs, which gathers this carrier into `fourVirtues`. The
 * Virtue union and VirtueCarrier interface are declared in the hub and imported here as
 * a TYPE ONLY, so this file adds no runtime import cycle.
 */

/** wówačhiŋtȟaŋka — fortitude. */
const lakota = "wówačhiŋtȟaŋka";

/** The fortitude virtue carrier. */
export const wowacintanka = Object.freeze({
  kind: "organizing-as-lakota.virtue",
  lakota,
  gloss: "fortitude — enduring hardship without complaint",
});
