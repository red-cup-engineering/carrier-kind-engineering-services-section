// segmentation.mjs — Mandarin word segmentation by maximum probability over
// a frequency lexicon (content/wordlists/mandarin-lexicon.json, from the
// jieba project's dictionary, MIT). Text has no spaces between words, so
// every dictionary word starting at every position is a candidate edge of a
// graph over the character positions, and the segmentation is the path whose
// words have the greatest product of probabilities (the sum of log
// frequency minus log total). A character no word covers stands alone with
// frequency one. Runs of Latin letters and digits stay one token;
// punctuation and spaces are not tokens, as in the engine's own
// per-character fallback. No filesystem is read, so it runs on any host.
import lexicon from "../content/wordlists/mandarin-lexicon.json" with { type: "json" };

const HAN = /\p{Script=Han}/u;
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

function lexiconEntries() {
  const words = new Map();
  for (const line of lexicon.entries.split("\n")) {
    const [word, frequency, tag] = line.split(" ");
    words.set(word, { frequency: Number(frequency), tag });
  }
  return words;
}

let baseWords;

/**
 * A segmenter over the lexicon plus any extra words (a module's glossary, a
 * series' names). An extra word absent from the lexicon enters at the
 * lexicon's median frequency unless it says otherwise, so a known compound
 * (离婚协议) wins over its parts without dominating ordinary text.
 * @param {{ extraWords?: Iterable<string | { word: string, frequency?: number, tag?: string }> }} [options]
 */
export function createMandarinSegmenter({ extraWords = [] } = {}) {
  baseWords ??= lexiconEntries();
  const words = new Map(baseWords);
  const median = [...baseWords.values()].map((entry) => entry.frequency).sort((a, b) => a - b)[Math.floor(baseWords.size / 2)];
  for (const extra of extraWords) {
    const { word, frequency = median, tag = "x" } = typeof extra === "string" ? { word: extra } : extra;
    if (!words.has(word)) words.set(word, { frequency, tag });
  }
  const logTotal = Math.log(lexicon.total);
  const maxLength = Math.max(...[...words.keys()].map((word) => [...word].length));

  /** Best path through one run of Han characters, as [word, entry | undefined] pairs. */
  function segmentRun(chars) {
    const n = chars.length;
    const best = new Array(n + 1).fill(null);
    best[n] = { score: 0, next: n };
    for (let i = n - 1; i >= 0; i -= 1) {
      let choice = { score: -logTotal + best[i + 1].score, next: i + 1 };
      for (let length = 2; length <= Math.min(maxLength, n - i); length += 1) {
        const entry = words.get(chars.slice(i, i + length).join(""));
        if (entry === undefined) continue;
        const score = Math.log(entry.frequency) - logTotal + best[i + length].score;
        if (score > choice.score) choice = { score, next: i + length };
      }
      const single = words.get(chars[i]);
      if (single !== undefined && Math.log(single.frequency) - logTotal + best[i + 1].score > choice.score) {
        choice = { score: Math.log(single.frequency) - logTotal + best[i + 1].score, next: i + 1 };
      }
      best[i] = choice;
    }
    const tokens = [];
    for (let i = 0; i < n; i = best[i].next) {
      const word = chars.slice(i, best[i].next).join("");
      tokens.push({ word, entry: words.get(word) });
    }
    return tokens;
  }

  /** Words with their lexicon tag, and whether the lexicon knows them. */
  function segmentTagged(text) {
    const chars = Array.from(String(text));
    const tokens = [];
    let i = 0;
    while (i < chars.length) {
      if (HAN.test(chars[i])) {
        let j = i;
        while (j < chars.length && HAN.test(chars[j])) j += 1;
        for (const { word, entry } of segmentRun(chars.slice(i, j))) tokens.push(Object.freeze({ word, tag: entry?.tag ?? null, known: entry !== undefined }));
        i = j;
      } else if (WORD_CHAR.test(chars[i])) {
        let j = i;
        while (j < chars.length && !HAN.test(chars[j]) && WORD_CHAR.test(chars[j])) j += 1;
        tokens.push(Object.freeze({ word: chars.slice(i, j).join(""), tag: "eng", known: false }));
        i = j;
      } else {
        i += 1;
      }
    }
    return tokens;
  }

  return Object.freeze({
    segment: (text) => segmentTagged(text).map((token) => token.word),
    segmentTagged,
    has: (word) => words.has(word),
  });
}

/** The lexicon's provenance, for anything that reports what the segmentation rests on. */
export const mandarinLexiconSource = Object.freeze({ source: lexicon.source, license: lexicon.license, threshold: lexicon.threshold, count: lexicon.count });
