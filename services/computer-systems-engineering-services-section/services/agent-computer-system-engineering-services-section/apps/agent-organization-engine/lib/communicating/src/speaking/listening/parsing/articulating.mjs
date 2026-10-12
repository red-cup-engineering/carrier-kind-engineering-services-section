import { tokenizeWords, isNumericWord } from "@red-cup-engineering/computer-text-content-engineering-services-section/text";

import { communicationDocument } from "./carrier.mjs";

/** Build a frozen span. `numeric` (word-tier only) marks a recognized numeric token. */
export function span(tier, text, start, end, numeric) {
  return Object.freeze(numeric ? { tier, start, end, text, numeric: true } : { tier, start, end, text });
}

/** A rule-span (synthesized — no offsets, carries a rule id as text). */
export function ruleSpan(ruleId) {
  return Object.freeze({ tier: "rule", start: null, end: null, text: ruleId });
}

/** Per-character tokenization: one Span per Unicode letter/mark/number character —
 * branch (b) of `tokenizeWithBundle`, used for script-segmented languages
 * (`grammar.segmentation.wordBoundary === "script"`, e.g. unspaced logographic
 * text) that supply no bundle `segment` hook. */
function tokenizeByScript(text, baseOffset) {
  const charRe = /[\p{L}\p{M}\p{N}]/gu;
  const result = [];
  let m;
  while ((m = charRe.exec(text)) !== null) {
    const start = baseOffset + m.index;
    const end = start + m[0].length;
    result.push(span("word", m[0], start, end, isNumericWord(m[0])));
  }
  return result;
}

/** Convert a bundle `segment` hook's returned words into Spans with absolute
 * offsets, preserving the offset-preservation contract: each returned substring
 * is located in `text` sequentially, starting the search from the END of the
 * previous match (so repeated words resolve to their successive occurrences, not
 * all to the first). A returned word not found from the current cursor (the
 * segmenter promised substrings of `text`; if it doesn't hold, skip rather than
 * mis-locate) is dropped. */
function spansFromSegments(text, baseOffset, words) {
  const result = [];
  let cursor = 0;
  for (const word of words) {
    if (word.length === 0) continue;
    const index = text.indexOf(word, cursor);
    if (index < 0) continue;
    const start = baseOffset + index;
    const end = start + word.length;
    result.push(span("word", word, start, end, isNumericWord(word)));
    cursor = index + word.length;
  }
  return result;
}

/** Bundle-aware word tokenization, threading the compiled bundle through to
 * `tokenize`'s three branches:
 *   (a) `bundle.segment` supplied — call it and locate each returned word
 *       sequentially in `text` to recover absolute offsets (`spansFromSegments`).
 *   (b) no `segment` but `grammar.segmentation.wordBoundary === "script"` —
 *       per-character tokenization (`tokenizeByScript`).
 *   (c) else — today's regex `tokenize`, unchanged.
 * The single call site for word tokenization in the pipeline (`splitWords`) goes
 * through here so every caller picks up bundle-supplied segmentation. */
export function tokenizeWithBundle(text, baseOffset, bundle) {
  if (bundle.segment !== undefined) {
    return spansFromSegments(text, baseOffset, bundle.segment(text));
  }
  if (bundle.grammar.segmentation.wordBoundary === "script") {
    return tokenizeByScript(text, baseOffset);
  }
  return tokenizeWords(text, baseOffset);
}

/** Split a parent span's text using a regex, yielding child spans with absolute offsets.
 * The regex matches SEPARATORS (the content between matches becomes a child span).
 * Empty spans after trimming are discarded. */
function splitOn(parent, tier, separatorRe) {
  const text = parent.text;
  const baseStart = parent.start ?? 0;
  const parts = [];
  let last = 0;
  const re = new RegExp(separatorRe.source, separatorRe.flags.includes("g") ? separatorRe.flags : separatorRe.flags + "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const raw = text.slice(last, m.index);
      const trimmed = raw.trimStart();
      const trimmedEnd = raw.trimEnd();
      const startOff = raw.length - raw.trimStart().length;
      const endOff = raw.length - trimmedEnd.length;
      if (trimmed.trim().length > 0) {
        parts.push(span(tier, trimmed.trim(), baseStart + last + startOff, baseStart + m.index - endOff));
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const raw = text.slice(last);
    const trimmed = raw.trim();
    const startOff = raw.length - raw.trimStart().length;
    if (trimmed.length > 0) {
      parts.push(span(tier, trimmed, baseStart + last + startOff, baseStart + text.length - (raw.length - raw.trimEnd().length)));
    }
  }
  return parts;
}

const BLOCK_RE = /\n[ \t]*\n/g;
// Comma splits a clause EXCEPT one flanked by a digit on both sides (a thousands
// separator, e.g. "150,000"): the two alternatives require a non-digit on one side.
const CLAUSE_RE = /,(?!\d)|(?<!\d),|[;:—–]|--/g;
const SPACE_RE = /\s+/g;

/** Split into blocks (paragraph breaks). */
function splitBlocks(doc) {
  return splitOn(doc, "block", BLOCK_RE);
}

/** True when `absoluteIndex` falls inside (start ≤ index < end of) one of `quoteSpans`. */
function isInsideQuote(absoluteIndex, quoteSpans) {
  return quoteSpans.some(
    (q) => q.start !== null && q.end !== null && absoluteIndex >= q.start && absoluteIndex < q.end,
  );
}

/** Split a block into sentences using bundle's terminator pattern.
 * Preserves the terminator as part of the sentence text. A terminator that falls
 * inside one of `quoteSpans` never ends the sentence — the quoted material's own
 * punctuation doesn't fracture the sentence that carries it. */
function splitSentences(block, bundle, quoteSpans) {
  const text = block.text;
  const baseStart = block.start ?? 0;
  const sentences = [];
  const re = new RegExp(bundle.sentenceTerminators.source, "gu");
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const termEnd = m.index + m[0].length;

    const before = text.slice(0, m.index);
    const word = before.split(/\s+/).pop() ?? "";
    if (bundle.isAbbreviation(word)) continue;
    if (/\d$/.test(before) && m[0] === ".") continue;
    if (isInsideQuote(baseStart + m.index, quoteSpans)) continue;
    const raw = text.slice(last, termEnd).trim();
    if (raw.length > 0) {
      const startOff = text.slice(last, termEnd).length - text.slice(last, termEnd).trimStart().length;
      sentences.push(span("sentence", raw, baseStart + last + startOff, baseStart + termEnd));
    }
    last = termEnd;
  }

  if (last < text.length) {
    const raw = text.slice(last).trim();
    const startOff = text.slice(last).length - text.slice(last).trimStart().length;
    if (raw.length > 0) {
      sentences.push(span("sentence", raw, baseStart + last + startOff, baseStart + text.length));
    }
  }
  return sentences;
}

/** Split a sentence into clauses (comma/semicolon/colon/dash). */
function splitClauses(sentence) {
  return splitOn(sentence, "clause", CLAUSE_RE);
}

/** Split a clause into word-spans, via the bundle-aware tokenizer (bundle `segment`
 * hook, else script per-character, else the default regex tokenizer). */
function splitWords(clause, bundle) {
  return tokenizeWithBundle(clause.text, clause.start ?? 0, bundle);
}

/** True when the character before `idx` (or the start of `text`) is not a letter
 * or digit — the position a quote mark can plausibly OPEN a quote from. */
function isWordBoundaryBefore(text, idx) {
  if (idx === 0) return true;
  return !/[\p{L}\p{N}]/u.test(text[idx - 1]);
}

/** True when the character after `idx` (or the end of `text`) is not a letter or
 * digit — the position a quote mark can plausibly CLOSE a quote at. Requiring this
 * before treating a same-glyph or apostrophe-shaped mark as a closer is what keeps
 * contractions and possessives ("Fry's", "rivals'") from being read as quotes. */
function isWordBoundaryAfter(text, idx) {
  if (idx + 1 >= text.length) return true;
  return !/[\p{L}\p{N}]/u.test(text[idx + 1]);
}

/** Scan `text` for quotation-mark pairs — straight (`"`, `'`) and curly
 * (“”, ‘’), single and double — yielding "quote" tier spans that include the
 * delimiting marks (so `text.slice(start, end) === span.text`, matching every
 * other span in this module). The curly open marks (“, ‘) are unambiguous and
 * always open; the curly right-single mark (’) and both straight marks double as
 * apostrophes, so those close only where `isWordBoundaryAfter` holds — a straight
 * or curly apostrophe inside a word ("Fry's", "OpenAI’s") is never mistaken for a
 * closing quote. Unmatched opens at end of text are simply dropped. */
export function findQuoteSpans(text, baseOffset) {
  const doubleStack = [];
  const singleStack = [];
  const result = [];
  const emit = (tier, start, end) => {
    result.push(span(tier, text.slice(start, end), baseOffset + start, baseOffset + end));
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "“") {
      doubleStack.push(i);
    } else if (ch === "‘") {
      singleStack.push(i);
    } else if (ch === "”") {
      if (doubleStack.length > 0) emit("quote", doubleStack.pop(), i + 1);
    } else if (ch === "’") {
      if (singleStack.length > 0 && isWordBoundaryAfter(text, i)) emit("quote", singleStack.pop(), i + 1);
    } else if (ch === "\"") {
      if (doubleStack.length > 0 && isWordBoundaryAfter(text, i)) emit("quote", doubleStack.pop(), i + 1);
      else if (isWordBoundaryBefore(text, i)) doubleStack.push(i);
    } else if (ch === "'") {
      if (singleStack.length > 0 && isWordBoundaryAfter(text, i)) emit("quote", singleStack.pop(), i + 1);
      else if (isWordBoundaryBefore(text, i)) singleStack.push(i);
    }
  }

  return result.slice().sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

/** Segment text into the full span hierarchy and build containment + sequence edges.
 * Quote spans (tier "quote") are computed once over the whole text and added to
 * `spans` alongside the block/sentence/clause/word tiers; sentence articulation
 * consults them so a terminator inside a quote never ends the sentence. */
export function articulate(text, bundle) {
  const doc = span("document", text, 0, text.length);
  const spans = [doc];
  const inside = [];
  const after = [];

  const quoteSpans = findQuoteSpans(text, 0);
  spans.push(...quoteSpans);

  const rawBlocks = splitBlocks(doc);
  const blocks = rawBlocks.length > 0
    ? [...rawBlocks]
    : [span("block", text.trim(), 0, text.length)];

  for (const block of blocks) {
    spans.push(block);
    inside.push({ child: block, parent: doc });

    const rawSentences = splitSentences(block, bundle, quoteSpans);
    const sentences = rawSentences.length > 0
      ? [...rawSentences]
      : [span("sentence", block.text, block.start, block.end)];

    let prevSentence = null;
    for (const sentence of sentences) {
      spans.push(sentence);
      inside.push({ child: sentence, parent: block });
      if (prevSentence !== null) after.push({ span: sentence, prev: prevSentence });
      prevSentence = sentence;

      const rawClauses = splitClauses(sentence);
      const clauses = rawClauses.length > 0
        ? [...rawClauses]
        : [span("clause", sentence.text, sentence.start, sentence.end)];

      let prevClause = null;
      for (const clause of clauses) {
        spans.push(clause);
        inside.push({ child: clause, parent: sentence });
        if (prevClause !== null) after.push({ span: clause, prev: prevClause });
        prevClause = clause;

        const words = splitWords(clause, bundle);
        let prevWord = null;
        for (const word of words) {
          spans.push(word);
          inside.push({ child: word, parent: clause });
          if (prevWord !== null) after.push({ span: word, prev: prevWord });
          prevWord = word;
        }
      }
    }
  }

  return { text, document: doc, spans, inside, after };
}

export function articulateCommunication(carrier, bundle) {
  const text = communicationDocument(carrier);
  if (text === null) {
    throw new TypeError("articulateCommunication: carrier token is not a communicating.document mark");
  }
  return articulate(text, bundle);
}
