/**
 * wowacantognaka — generosity, the first of the four Lakota virtues, as an evaluation
 * predicate over conduct cells.
 *
 * lakotaTerm: Wówačhaŋtognaka — generosity; giving from one's substance to the
 * relatives.
 *
 * Corpus: lakota/.../four-virtues-as-evaluation-predicates. This is ONE virtue of the
 * four whose cumulative MEET (∧) is standing-as-wólakȟota; the fold lives in the
 * positing hub ../wolakota.mjs, which gathers this carrier into `fourVirtues`. The
 * Virtue union and VirtueCarrier interface are declared in the hub and imported here as
 * a TYPE ONLY, so this file adds no runtime import cycle.
 */
import type { Virtue, VirtueCarrier } from "./wolakota.mjs";

/** wówačhaŋtognaka — generosity. */
const lakota: Virtue = "wówačhaŋtognaka";

/** The generosity virtue carrier. */
export const wowacantognaka: VirtueCarrier = Object.freeze({
  kind: "organizing-as-lakota.virtue",
  lakota,
  gloss: "generosity — giving from one's substance to the relatives",
});
