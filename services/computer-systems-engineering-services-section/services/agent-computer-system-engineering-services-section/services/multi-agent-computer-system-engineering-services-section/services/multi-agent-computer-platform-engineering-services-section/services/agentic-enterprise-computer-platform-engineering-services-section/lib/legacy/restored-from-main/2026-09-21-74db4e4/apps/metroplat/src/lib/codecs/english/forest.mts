/**
 * english/forest — parse forests over surface text.
 *
 * Every sentence span is read as one parse whose gluing is judged by metroplat's
 * own arc-graph cohomology (`parsing.mts`'s `cohomologyOfCells` reading): `glued`
 * iff H¹ vanishes (no competing/redundant attachment), `complete` iff every word
 * is reached and the arc graph is one connected component (H⁰ = 1).
 */
import { toCount } from "@red-cup-engineering/computer-data-engine/exact-number";
import { parseForestContract, sentenceParseContract } from "./schema.mts";
import { articulate } from "./segments.mts";
import type { CompiledBundle } from "./bundle.mts";
import { parse } from "./parsing.mts";
import type { ArticulateResult, ParseForest, SentenceParse, ParseResult, Span } from "./types.mts";

function parseId(span: Span, index: number): string {
  return `reading@${span.start ?? "?"}-${span.end ?? "?"}:${index}`;
}

function gluedOf(result: ParseResult): boolean {
  return result.cohomology.firstCohomology.vanishing.kind === "predication.cohomology.rankVanishing:witness";
}

function completeOf(result: ParseResult): boolean {
  return result.fullyConnected && toCount(result.cohomology.zeroCohomology.rank) === 1;
}

function sentenceParseFromParse(span: Span, result: ParseResult, index: number): SentenceParse {
  const reading = Object.freeze({
    kind: "parsing.sentence.parse" as const,
    id: parseId(span, index),
    span,
    parse: result,
    glued: gluedOf(result),
    complete: completeOf(result),
  });
  sentenceParseContract.assert(reading, "English sentence parse");
  return reading;
}

function sentenceSpans(base: ArticulateResult): readonly Span[] {
  const sentences = base.spans.filter((span) => span.tier === "sentence");
  return sentences.length === 0 ? [base.document] : sentences;
}

/** Read every sentence span of an articulation base into a parse forest. */
export function parseForestFromArticulation(base: ArticulateResult, bundle: CompiledBundle): ParseForest {
  const readings = sentenceSpans(base).map((sentence, index) => sentenceParseFromParse(sentence, parse(sentence, base.spans, bundle), index));
  const forest = Object.freeze({
    kind: "parsing.forest" as const,
    text: base.text,
    readings: Object.freeze(readings),
    glued: readings.every((reading) => reading.glued),
    complete: readings.every((reading) => reading.complete),
  });
  parseForestContract.assert(forest, "English parse forest");
  return forest;
}

/** Articulate and parse a raw text into a parse forest. */
export function parseForest(text: string, bundle: CompiledBundle): ParseForest {
  return parseForestFromArticulation(articulate(text, bundle), bundle);
}
