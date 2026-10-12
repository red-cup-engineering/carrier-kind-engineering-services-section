/**
 * settling/ranked-judgments — ranked judgment helpers.
 *
 * A small helper: wrap a list of judgments with its Natural rank, and select a
 * sub-kind of judgments into its own ranked group. Used by the gap and
 * consistency analyses to bundle and partition their per-cell judgments.
 */
import { count, type Natural } from "../math/rational/exact-number.mts";

/** A list of judgments with its Natural rank. */
export interface RankedJudgments<Kind extends string, Judgment> {
  readonly kind: Kind;
  readonly judgments: readonly Judgment[];
  readonly rank: Natural;
}

/** Wrap judgments with their count as rank. */
export const rankedJudgments = <Kind extends string, Judgment>(
  kind: Kind,
  judgments: readonly Judgment[],
): RankedJudgments<Kind, Judgment> => Object.freeze({
  kind,
  judgments: Object.freeze([...judgments]),
  rank: count(judgments),
});

/** Select a sub-kind of judgments into its own ranked group. */
export const selectRankedJudgments = <Kind extends string, Judgment, Selected extends Judgment>(
  kind: Kind,
  judgments: readonly Judgment[],
  select: (judgment: Judgment) => judgment is Selected,
): RankedJudgments<Kind, Selected> => rankedJudgments(kind, judgments.filter(select));
