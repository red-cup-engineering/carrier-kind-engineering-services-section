/**
 * english/articulating — segment text into the tiered span hierarchy.
 *
 * document > block (paragraph) > sentence > clause > word, with containment and
 * reading-order sequence edges recorded alongside the spans themselves.
 */

export function span(tier, text, start, end) {
  return Object.freeze({ tier, start, end, text });
}

/** English's closed set of clitics: a host word carries a reduced auxiliary or
 *  negator as a word-final apostrophe suffix ("here's", "they're", "isn't").
 *  Split, each half tags through the ordinary closed-class lexicon exactly
 *  like any other word ("'s"/"'re"/"'m" are copula-auxiliary entries, "n't" is
 *  a negator entry — see `lexicon.mts`); unsplit, the whole contraction has no
 *  lexicon entry and silently defaults to "noun", losing the auxiliary/copula
 *  or negation the sentence actually carries. */
const CLITIC_RE = /^(.+?)(n['ʼ’]t|['ʼ’](?:s|re|ll|ve|m|d))$/iu;

function splitClitic(word) {
  const m = CLITIC_RE.exec(word);
  return m === null ? null : { base: m[1], clitic: m[2] };
}

/** Unicode-aware tokenizer: extracts words as spans, preserving absolute offsets.
 *  A word token is one or more Unicode letter/mark/number runs, connected by
 *  word-internal joiners (apostrophes, hyphens) — except a trailing clitic
 *  (`splitClitic`), which is split into its own word span so it tags as the
 *  auxiliary/negator it actually is. */
export function tokenize(text, baseOffset) {
  const wordRe = /[\p{L}\p{M}\p{N}](?:['ʼ’‐-]?[\p{L}\p{M}\p{N}])*/gu;
  const result = [];
  let m;
  while ((m = wordRe.exec(text)) !== null) {
    const start = baseOffset + m.index;
    const end = start + m[0].length;
    const split = splitClitic(m[0]);
    if (split === null) {
      result.push(span("word", m[0], start, end));
      continue;
    }
    const baseEnd = start + split.base.length;
    result.push(span("word", split.base, start, baseEnd));
    result.push(span("word", split.clitic, baseEnd, end));
  }
  return result;
}

function splitOn(parent, tier, separatorRe) {
  const text = parent.text;
  const baseStart = parent.start ?? 0;
  const parts = [];
  let last = 0;
  const re = new RegExp(separatorRe.source, separatorRe.flags.includes("g") ? separatorRe.flags : `${separatorRe.flags}g`);
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const raw = text.slice(last, m.index);
      const trimmed = raw.trim();
      const startOff = raw.length - raw.trimStart().length;
      const endOff = raw.length - raw.trimEnd().length;
      if (trimmed.length > 0) parts.push(span(tier, trimmed, baseStart + last + startOff, baseStart + m.index - endOff));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const raw = text.slice(last);
    const trimmed = raw.trim();
    const startOff = raw.length - raw.trimStart().length;
    if (trimmed.length > 0) parts.push(span(tier, trimmed, baseStart + last + startOff, baseStart + text.length - (raw.length - raw.trimEnd().length)));
  }
  return parts;
}

const BLOCK_RE = /\n[ \t]*\n/g;
const CLAUSE_RE = /[,;:—–]|--/g;

function splitBlocks(doc) {
  return splitOn(doc, "block", BLOCK_RE);
}

/** Split a block into sentences using the bundle's terminator pattern.
 *  Preserves the terminator as part of the sentence text. */
function splitSentences(block, bundle) {
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
    if (raw.length > 0) sentences.push(span("sentence", raw, baseStart + last + startOff, baseStart + text.length));
  }
  return sentences;
}

function splitClauses(sentence) {
  return splitOn(sentence, "clause", CLAUSE_RE);
}

function splitWords(clause) {
  return tokenize(clause.text, clause.start ?? 0);
}

/** Segment text into the full span hierarchy and build containment + sequence edges. */
export function articulate(text, bundle) {
  const doc = span("document", text, 0, text.length);
  const spans = [doc];
  const inside = [];
  const after = [];

  const rawBlocks = splitBlocks(doc);
  const blocks = rawBlocks.length > 0 ? [...rawBlocks] : [span("block", text.trim(), 0, text.length)];

  for (const block of blocks) {
    spans.push(block);
    inside.push({ child: block, parent: doc });

    const rawSentences = splitSentences(block, bundle);
    const sentences = rawSentences.length > 0 ? [...rawSentences] : [span("sentence", block.text, block.start, block.end)];

    let prevSentence = null;
    for (const sentence of sentences) {
      spans.push(sentence);
      inside.push({ child: sentence, parent: block });
      if (prevSentence !== null) after.push({ span: sentence, prev: prevSentence });
      prevSentence = sentence;

      const rawClauses = splitClauses(sentence);
      const clauses = rawClauses.length > 0 ? [...rawClauses] : [span("clause", sentence.text, sentence.start, sentence.end)];

      let prevClause = null;
      for (const clause of clauses) {
        spans.push(clause);
        inside.push({ child: clause, parent: sentence });
        if (prevClause !== null) after.push({ span: clause, prev: prevClause });
        prevClause = clause;

        const words = splitWords(clause);
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
