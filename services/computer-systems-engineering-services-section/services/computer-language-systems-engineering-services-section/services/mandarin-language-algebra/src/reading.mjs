// reading.mjs — the Mandarin fiber's own reading of a text, with no model:
// each word as segmented (hanzi), its pronunciation (pinyin, tone-marked) and
// its first English sense (gloss), from the pronouncing and bilingual lexicon
// (content/wordlists/mandarin-english-lexicon.json, adapted from CC-CEDICT,
// CC BY-SA 4.0). These are the first three naturalization levels of a
// translation: hanzi, pinyin and gloss. A word the bilingual lexicon lacks is
// read character by character, so every Han character gets a pinyin; its
// gloss is then the characters' glosses joined, marked as composed.
import bilingual from "../content/wordlists/mandarin-english-lexicon.json" with { type: "json" };
import { createMandarinSegmenter } from "./segmentation.mjs";

const HAN = /\p{Script=Han}/u;
const TONE_MARKS = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };

/** One numbered pinyin syllable ("zong3", "lu:4", "le5") to its tone-marked form. */
export function markPinyinSyllable(syllable) {
  const match = /^([a-zü:v]+?)([1-5])?$/iu.exec(syllable);
  if (match === null) return syllable;
  const [, rawLetters, toneText] = match;
  const letters = rawLetters.replace(/u:|v/giu, "ü");
  const tone = Number(toneText ?? 5);
  if (tone === 5) return letters;
  const lower = letters.toLowerCase();
  const vowels = [...lower].map((ch, index) => ({ ch, index })).filter(({ ch }) => "aeiouü".includes(ch));
  if (vowels.length === 0) return letters;
  const target = vowels.find(({ ch }) => ch === "a") ?? vowels.find(({ ch }) => ch === "e")
    ?? (lower.includes("ou") ? vowels.find(({ ch }) => ch === "o") : undefined)
    ?? vowels[vowels.length - 1];
  const marked = TONE_MARKS[target.ch][tone - 1];
  const chars = [...letters];
  chars[target.index] = chars[target.index] === chars[target.index].toUpperCase() && chars[target.index] !== chars[target.index].toLowerCase() ? marked.toUpperCase() : marked;
  return chars.join("");
}

/** Numbered pinyin of a word ("zong3 cai2") to tone-marked, syllables joined as a word ("zǒngcái"). */
export function markPinyin(numbered) {
  return numbered.split(/\s+/u).map(markPinyinSyllable).join("").replace(/,/gu, ", ");
}

const NEUTRAL_TONE = /^[a-zü]+$/u;

/**
 * Order a polyphone's readings by the segmenter's part-of-speech tag: a
 * particle, auxiliary or interjection (y, u, e) takes its neutral-tone
 * reading. Otherwise the lexicon's order stands: choosing verb or noun senses
 * by tag misreads more than it fixes (会 would read kuài, not huì). A single
 * reading is returned as is.
 */
function byTag(readings, tag) {
  if (readings.length < 2 || typeof tag !== "string") return readings;
  const fit = (reading) => (/^[yue]/u.test(tag) && !NEUTRAL_TONE.test(reading.pinyin) ? 1 : 0);
  return readings.map((reading, index) => ({ reading, index })).sort((a, b) => fit(a.reading) - fit(b.reading) || a.index - b.index).map(({ reading }) => reading);
}

let readings;

function bilingualReadings() {
  if (readings !== undefined) return readings;
  readings = new Map();
  for (const line of bilingual.entries.split("\n")) {
    const [word, pinyin, gloss] = line.split("\t");
    const list = readings.get(word) ?? [];
    list.push(Object.freeze({ pinyin: markPinyin(pinyin), gloss }));
    readings.set(word, list);
  }
  return readings;
}

/**
 * A reader over the fiber's segmenter and bilingual lexicon. Extra words (a
 * module glossary) join the segmenter and, when they carry a gloss, the
 * reading: { word, gloss, pinyin? }.
 */
export function createMandarinReader({ extraWords = [] } = {}) {
  const table = bilingualReadings();
  const extras = new Map();
  for (const extra of extraWords) if (typeof extra === "object" && extra.gloss) extras.set(extra.word, extra);
  const segmenter = createMandarinSegmenter({ extraWords });

  function readWord(word, tag) {
    if (!HAN.test(word)) return Object.freeze({ hanzi: word, pinyin: word, gloss: word, tag, source: "passthrough" });
    const known = table.get(word);
    const extra = extras.get(word);
    if (extra !== undefined) {
      return Object.freeze({ hanzi: word, pinyin: extra.pinyin ?? (known?.[0]?.pinyin ?? composePinyin(word)), gloss: extra.gloss, tag, source: "glossary" });
    }
    if (known !== undefined) {
      const [chosen, ...others] = byTag(known, tag);
      return Object.freeze({ hanzi: word, pinyin: chosen.pinyin, gloss: chosen.gloss, tag, source: "lexicon", ...(others.length > 0 ? { otherReadings: Object.freeze(others) } : {}) });
    }
    const parts = [...word].map((ch) => table.get(ch)?.[0]);
    return Object.freeze({ hanzi: word, pinyin: composePinyin(word), gloss: parts.map((part, index) => part?.gloss ?? [...word][index]).join(" + "), tag, source: "composed" });
  }

  function composePinyin(word) {
    return [...word].map((ch) => table.get(ch)?.[0]?.pinyin ?? ch).join("");
  }

  return Object.freeze({
    /** Each word of the text: hanzi, pinyin, gloss, the segmenter's tag, and where the reading came from. */
    read(text) {
      return segmenter.segmentTagged(text).map(({ word, tag }) => readWord(word, tag));
    },
    segment: segmenter.segment,
  });
}

/** The bilingual lexicon's provenance. */
export const mandarinEnglishLexiconSource = Object.freeze({ source: bilingual.source, license: bilingual.license, headwords: bilingual.headwords });
