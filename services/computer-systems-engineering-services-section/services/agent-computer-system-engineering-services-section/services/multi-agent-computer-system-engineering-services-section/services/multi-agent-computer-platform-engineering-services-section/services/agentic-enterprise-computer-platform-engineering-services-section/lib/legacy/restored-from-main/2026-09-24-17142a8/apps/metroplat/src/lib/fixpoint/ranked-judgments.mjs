/**
 * settling/ranked-judgments — ranked judgment helpers.
 *
 * A small helper: wrap a list of judgments with its Natural rank, and select a
 * sub-kind of judgments into its own ranked group. Used by the gap and
 * consistency analyses to bundle and partition their per-cell judgments.
 */
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";

/** A list of judgments with its Natural rank. */

/** Wrap judgments with their count as rank. */
export const rankedJudgments = (
  kind,
  judgments,
) => Object.freeze({
  kind,
  judgments: Object.freeze([...judgments]),
  rank: count(judgments),
});

/** Select a sub-kind of judgments into its own ranked group. */
export const selectRankedJudgments = (
  kind,
  judgments,
  select,
) => rankedJudgments(kind, judgments.filter(select));
