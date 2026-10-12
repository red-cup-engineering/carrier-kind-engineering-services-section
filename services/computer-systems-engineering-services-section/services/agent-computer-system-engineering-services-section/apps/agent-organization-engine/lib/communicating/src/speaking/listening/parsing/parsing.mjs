

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { articulateCommunication } from "./articulating.mjs";
import { construe, spansInSentenceOfTier, wordsInSentence } from "./construing.mjs";
import { descend } from "./descending.mjs";
import { fold } from "./folding.mjs";
import { readingStatus } from "../algebra/reading.mjs";
import { attributionsFromWords } from "./attributing.mjs";
import { modalityFromWords } from "./modalizing.mjs";

/** Parse a sentence span and return the full ParseResult. */
export function parse(
  sentenceSpan,
  base,
  bundle,
) {
  const wordSpans = wordsInSentence(sentenceSpan, base.spans);
  const constrained = construe(sentenceSpan, wordSpans, bundle);
  const { words, arcs, entries, specialization, questions } = constrained;

  const settled = descend(entries, specialization);

  const parsedWords = words.map((w) => {
    const connEvidence = settled.settledEvidence(w.id, "is-connected");

    const roles = [];
    const relNames = ["nsubj", "dobj", "prep", "pobj", "obl", "case", "det", "amod", "advmod", "discourse", "ccomp", "mark"];
    for (const r of relNames) {
      const rc = settled.settledEvidence(w.id, `is-${r}`);
      if (knowledgeReading(rc) !== "absurd") roles.push(`is-${r}`);
    }
    return {
      i: w.i,
      id: w.id,
      text: w.span.text,
      tags: w.tags,
      feats: w.feats,
      connected: readingStatus(connEvidence),
      roles,
    };
  });

  const arcSeen = new Set();
  const parsedArcs = [];
  for (const a of arcs) {
    const k = `${a.head}\x00${a.rel}\x00${a.dependent}`;
    if (arcSeen.has(k)) continue;
    arcSeen.add(k);
    const headWord = words.find((w) => w.id === a.head);
    const depWord = words.find((w) => w.id === a.dependent);
    const arcEvidence = settled.settledArc(a.head, a.rel, a.dependent);
    const arcValue = knowledgeReading(arcEvidence);
    parsedArcs.push({
      rel: a.rel,
      head: a.head,
      dependent: a.dependent,
      headText: headWord?.span.text ?? a.head,
      depText: depWord?.span.text ?? a.dependent,
      status: readingStatus(arcEvidence),
      value: arcValue,
    });
  }

  const parsedAnswers = questions.map((q) => {
    const c = settled.settledEvidence(q.subject, q.predicate);
    return {
      question: q.label,
      on: q.on,
      status: readingStatus(c),
      value: knowledgeReading(c),
    };
  });

  const { paths: compositions, tower } = fold(arcs);

  // A parse is a portable data carrier.  These are projections of answers, not
  // graph aliases into `answers`: content-addressed consumers require a tree
  // with one canonical JSON representation.
  const conflicts = parsedAnswers
    .filter((answer) => answer.status === "ambiguous")
    .map((answer) => Object.freeze({ ...answer }));
  const voids = parsedAnswers
    .filter((answer) => answer.status === "void")
    .map((answer) => Object.freeze({ ...answer }));

  const quotes = spansInSentenceOfTier(sentenceSpan, base.spans, "quote");
  const attributions = attributionsFromWords(words, parsedArcs, quotes, base.text, bundle);
  const modality = modalityFromWords(words, bundle);

  return {
    words: parsedWords,
    arcs: parsedArcs,
    answers: parsedAnswers,
    compositions,
    tower,
    conflicts,
    voids,
    attributions,
    modality,
  };
}

/** Parse the first sentence of an admitted communicating document. */
export function parseCommunication(
  carrier,
  bundle,
) {
  const base = articulateCommunication(carrier, bundle);
  const sentence = base.spans.find((span) => span.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}
