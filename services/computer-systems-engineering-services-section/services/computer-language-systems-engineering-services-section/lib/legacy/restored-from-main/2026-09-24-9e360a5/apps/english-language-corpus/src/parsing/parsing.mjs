/**
 * english/parsing — parse one sentence span into a full ParseResult.
 *
 * Every accepted dependency arc becomes a real predication `Cell` (subject/object
 * are Tokens wrapping the two word ids; the predicate wraps the relation name).
 * `cohomologyOfCells` — metroplat's own graph cohomology over predication cells —
 * reads the arc graph directly: H⁰ is the union-find component count, H¹ is the
 * incidence-matrix cycle rank. A word with two competing heads (the classic PP-
 * attachment case) closes a cycle, so H¹ > 0 finds genuine structural ambiguity
 * with no bespoke "conflict" bookkeeping.
 */
import { claim, mark, token } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { predicateOfClaim } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { cohomologyOfCells } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/cohomology";

import { construe, wordsInSentence } from "./construing.mjs";
import { fold } from "@red-cup-engineering/communicating/speaking/listening/parsing/folding";

const wordToken = (id) => token(mark(id));
const relPredicate = (rel) => predicateOfClaim(claim(mark(rel)));

/** One arc as a predication cell: subject = head word, object = dependent word. */
function arcCell(arc) {
  return { subject: wordToken(arc.head), predicate: relPredicate(arc.rel), object: wordToken(arc.dependent) };
}

/** Subject-verb number agreement, read directly off morphological features. Not
 *  a graph fact: an agreement holding is not an extra edge, so it stays outside
 *  the arc cohomology rather than inflating its cycle rank. */
function agreementOf(verb, subject) {
  const verbForm = verb.feats.find((f) => f === "3sg" || f === "base");
  const subjectNumber = subject.feats.find((f) => f === "sg" || f === "pl");
  if (verbForm === undefined || subjectNumber === undefined) return "unknown";
  const agrees = (subjectNumber === "sg" && verbForm === "3sg") || (subjectNumber === "pl" && verbForm === "base");
  return agrees ? "agrees" : "disagrees";
}

/** Parse a sentence span (given the full articulation base) into a ParseResult. */
export function parse(sentenceSpan, allSpans, bundle) {
  const wordSpans = wordsInSentence(sentenceSpan, allSpans);
  const { words, arcs } = construe(wordSpans, bundle);

  const connected = new Set();
  for (const a of arcs) { connected.add(a.head); connected.add(a.dependent); }

  const parsedWords = words.map((w) => ({
    i: w.i, id: w.id, text: w.span.text, tags: w.tags, feats: w.feats, connected: connected.has(w.id),
  }));

  const parsedArcs = [];
  const seen = new Set();
  for (const a of arcs) {
    const key = `${a.head}\x00${a.rel}\x00${a.dependent}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const headWord = words.find((w) => w.id === a.head);
    const depWord = words.find((w) => w.id === a.dependent);
    parsedArcs.push({
      rel: a.rel,
      head: a.head,
      dependent: a.dependent,
      headText: headWord?.span.text ?? a.head,
      depText: depWord?.span.text ?? a.dependent,
      agreement: a.rel === "nsubj" && headWord && depWord ? agreementOf(headWord, depWord) : "unknown",
    });
  }

  const cells = arcs.map(arcCell);
  const cohomology = cohomologyOfCells(cells);
  const fullyConnected = words.every((w) => connected.has(w.id));

  const { paths: compositions, tower } = fold(arcs);

  return { words: parsedWords, arcs: parsedArcs, compositions, tower, cohomology, fullyConnected };
}
