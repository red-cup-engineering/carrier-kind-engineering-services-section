/**
 * running/suit — the context spacesuit: a query-restricted, budget-packed
 * sufficient statistic over already-read materials.
 *
 * The witness-substrate note (dev/content/notes/2026/06/25/2026-06-25-rwil-relation-
 * witness-information-log.md) names the reader a channel with a bit budget:
 * "state/record/content exist to compress the source to fit it without
 * losing the bits the current query needs; the handoff object should BE a
 * sufficient statistic chosen for the query." This module is that sufficient statistic,
 * generalized past one feed: any already-read material (a claim-session
 * continuation item, a settlement excerpt, a feed row, a content document) that
 * names a cell can be ranked and packed against a query cell.
 *
 * The quarry's `conductor-cognition.mjs` (`suiting`) is the precedent this
 * supersedes: it ranked by a declared-hack provenance tier (sense >
 * remembered-sense > learning) because it had no carried structure to rank
 * by. Here the structure already exists — the FOUR bilattice's knowledge
 * order — so ranking is real math, not a hand-tuned tier table:
 *
 * 1. **charge height** — the knowledge-order height of the item's charge
 *    (`unknown`=1, `held`/`denied`=2, `contested`=4, computed from the same
 *    `leqKnowledge` comparator `session.mts` uses, not a hand-picked number).
 *    A `contested` (⊤) cell is a held CONFLICT — the witness-substrate note's "⊤ is maximal
 *    information" law, so it outranks every merely-agreeing cell.
 * 2. **evidence linkage** — whether the item's own cell equals the query
 *    cell, or the query cell appears in the item's evidence array (the
 *    `cell:<X>` tagging convention `obsticulation.mts`/`fact-claims.mts`
 *    already write). A structural check against real cell addresses, not a
 *    keyword search over prose.
 * 3. **magnitude** — `fact-claims.mts`'s `weight` field, carried through
 *    unchanged; this module is its first real consumer.
 * 4. **recency** — the item's `at` stamp, lexicographic (ISO-safe).
 *
 * Duplicate inputs fold here, they are not discarded at source admission: two
 * inputs sharing a cell are combined by the SAME knowledge-order join
 * `session.mts`'s `judge` uses, so a cell reported both `held` and
 * `denied` by different materials correctly rises to `contested`.
 *
 * Packing is greedy in rank order, breaking at the first section that would
 * exceed the budget (the quarry precedent's own `suiting()` loop) — every
 * accepted section outranks every omitted one, so a linked ⊤ item is never
 * omitted ahead of an unlinked ⊥ item. Every drop is counted in `omitted`,
 * never silently truncated (the `markdown.mts` `generateDocumentBody`
 * convention).
 */
import {
  charge,
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  leqKnowledge,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { suitContract } from "./schema.mts";

/** One already-read material offered to a suit. `charge` is absent for
 *  material that carries no FOUR assertion (a settlement excerpt, a content
 *  document) — absent reads as `unknown` (the witness substrate: ⊥ = told nothing), never as
 *  a fifth "neutral" tier of its own. */
export interface SuitInput {
  readonly cell: string;
  readonly kind: "continuation-item" | "settlement-excerpt" | "feed-row" | "content-document";
  readonly charge?: ChargeValueName;
  readonly text: string;
  readonly source?: string;
  readonly evidence: readonly string[];
  readonly magnitude?: number;
  /** A recency stamp (ISO time, or any lexicographically-sortable ordinal
   *  string); absent sorts as least recent. */
  readonly at?: string;
}

/** The work-item/obligation cell a suit is worn for, plus its own text
 *  (the obligation's claimed text, or the cell address itself when no
 *  material yet claims it). */
export interface SuitQuery {
  readonly cell: string;
  readonly text: string;
}

export interface SuitOptions {
  /** Approximate token budget (bytes/4, the quarry precedent's own
   *  approximation). Default 2000, matching `conductor-cognition.mjs`'s
   *  `remembering()` default. */
  readonly budget?: number;
}

export interface SuitOmission {
  readonly reason: "budget";
  readonly count: number;
  readonly cells: readonly string[];
}

export interface SuitSection {
  readonly cell: string;
  readonly kind: SuitInput["kind"];
  readonly charge: ChargeValueName;
  readonly linked: boolean;
  readonly magnitude?: number;
  readonly text: string;
  readonly source?: string;
  readonly evidence: readonly string[];
}

export interface Suit {
  readonly kind: "metroplat.executing.suit";
  readonly query: SuitQuery;
  readonly budget: number;
  readonly tokenEstimate: number;
  readonly sections: readonly SuitSection[];
  readonly omitted: readonly SuitOmission[];
}

const DEFAULT_SUIT_BUDGET_TOKENS = 2000;

/** Bytes/4, the same approximation `conductor-cognition.mjs`'s `suiting()`
 *  uses — a rough token estimate, not a real tokenizer. */
function approxTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

/** The knowledge-order height of a charge: how many of the four values are
 *  `leqKnowledge` below it. `unknown`=1 (only itself), `held`/`denied`=2
 *  (unknown and itself), `contested`=4 (everything) — read off the real
 *  comparator, not a hand-picked table. Absent charge reads as `unknown`. */
function chargeHeight(name: ChargeValueName | undefined): number {
  const value = chargeValue(name ?? "unknown");
  return chargeValueNames.filter((candidate) => leqKnowledge(charge(chargeValue(candidate)), charge(value))).length;
}

/** Whether an input is evidence-linked to the query cell: its own cell
 *  addresses the query cell, or the query cell (bare or `cell:`-tagged) is
 *  one of its evidence entries — the same tagging convention
 *  `obsticulation.mts`/`fact-claims.mts` already write. */
function linkedToQuery(input: Pick<SuitInput, "cell" | "evidence">, query: SuitQuery): boolean {
  if (input.cell === query.cell) return true;
  return input.evidence.some((entry) => entry === query.cell || entry === `cell:${query.cell}`);
}

interface FoldedSection extends SuitSection {
  readonly at: string;
}

/** Fold every input sharing a cell into one section: charge joins by the
 *  SAME knowledge-order join `judge`/`glueClaimSessions` use (so a cell
 *  claimed both `held` and `denied` correctly rises to `contested`,
 *  never silently picks one), evidence unions, magnitude takes the richest
 *  reading, text/source/kind/recency take the pre-fold highest-ranked
 *  input's own (so a lower-ranked duplicate's thinner text never displaces
 *  a richer one). No input is discarded: folding is a join, not a choice. */
function foldInputsByCell(inputs: readonly SuitInput[], query: SuitQuery): readonly FoldedSection[] {
  const byCell = new Map<string, SuitInput[]>();
  for (const input of inputs) {
    const group = byCell.get(input.cell);
    if (group === undefined) byCell.set(input.cell, [input]);
    else group.push(input);
  }
  const sections: FoldedSection[] = [];
  for (const [cell, group] of byCell) {
    const linked = group.some((input) => linkedToQuery(input, query));
    const joinedCharge = chargeValueName(
      group.reduce((acc, input) => joinKnowledgeValue(acc, chargeValue(input.charge ?? "unknown")), chargeValue("unknown")),
    );
    const magnitude = group.reduce<number | undefined>(
      (best, input) => (input.magnitude === undefined ? best : best === undefined ? input.magnitude : Math.max(best, input.magnitude)),
      undefined,
    );
    const evidence = Object.freeze([...new Set(group.flatMap((input) => input.evidence))]);
    const at = group.reduce((latest, input) => (input.at !== undefined && input.at > latest ? input.at : latest), "");
    // The pre-fold highest-ranked input in the group supplies text/source/kind:
    // its own individual rank (before folding raises the group's charge) is a
    // reasonable proxy for "richest single reading."
    const richest = [...group].sort((a, b) => rankTuple(b, query).charge - rankTuple(a, query).charge)[0]!;
    sections.push(Object.freeze({
      cell,
      kind: richest.kind,
      charge: joinedCharge,
      linked,
      ...(magnitude === undefined ? {} : { magnitude }),
      text: richest.text,
      ...(richest.source === undefined ? {} : { source: richest.source }),
      evidence,
      at,
    }));
  }
  return Object.freeze(sections);
}

function rankTuple(input: Pick<SuitInput, "cell" | "evidence" | "charge">, query: SuitQuery): { readonly charge: number; readonly linked: number } {
  return { charge: chargeHeight(input.charge), linked: linkedToQuery(input, query) ? 1 : 0 };
}

function compareSections(left: FoldedSection, right: FoldedSection): number {
  const leftHeight = chargeHeight(left.charge);
  const rightHeight = chargeHeight(right.charge);
  if (leftHeight !== rightHeight) return rightHeight - leftHeight;
  if (left.linked !== right.linked) return (right.linked ? 1 : 0) - (left.linked ? 1 : 0);
  const leftMagnitude = left.magnitude ?? -Infinity;
  const rightMagnitude = right.magnitude ?? -Infinity;
  if (leftMagnitude !== rightMagnitude) return rightMagnitude - leftMagnitude;
  if (left.at !== right.at) return left.at < right.at ? 1 : -1;
  return 0;
}

/** Compose a suit: rank every input against the query cell by carried
 *  structure (charge, linkage, magnitude, recency), fold duplicates by cell
 *  through the knowledge-order join, then pack greedily under the token
 *  budget — every omitted section is strictly lower-ranked than every
 *  packed one, and every drop is counted, never silently truncated. */
export function suitForCell(inputs: readonly SuitInput[], query: SuitQuery, options: SuitOptions = {}): Suit {
  if (query.cell.trim().length === 0) throw new TypeError("suitForCell: query.cell must be non-empty");
  const budget = options.budget ?? DEFAULT_SUIT_BUDGET_TOKENS;
  const ranked = [...foldInputsByCell(inputs, query)].sort(compareSections);

  const sections: SuitSection[] = [];
  for (const candidate of ranked) {
    const { at: _at, ...section } = candidate;
    const trial = Object.freeze([...sections, section]);
    if (approxTokens({ query, budget, sections: trial }) > budget) break;
    sections.push(section);
  }
  const omittedSections = ranked.slice(sections.length);
  const omitted: readonly SuitOmission[] = omittedSections.length === 0
    ? Object.freeze([])
    : Object.freeze([Object.freeze({
        reason: "budget" as const,
        count: omittedSections.length,
        cells: Object.freeze(omittedSections.map((section) => section.cell)),
      })]);

  const body = {
    kind: "metroplat.executing.suit" as const,
    query,
    budget,
    sections: Object.freeze(sections),
    omitted,
  };
  const tokenEstimate = approxTokens(body);
  return suitContract.assert(Object.freeze({ ...body, tokenEstimate }), "suit") as Suit;
}
