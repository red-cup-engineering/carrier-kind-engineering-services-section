// bundle.ts — Toki Pona as a syntaxis fiber-algebra bundle.
// SVO word order, isolating morphology (every word is its citation form).
// Toki Pona uses structural particles (li, e, pi, la, o) instead of inflection.
// The particles are filed under "determiners" since the schema has no particle class;
// their true inventory is documented below.

// The five structural particles of Toki Pona (documented for reference):
// li — separates subject from predicate (not used after mi/sina)
// e  — marks the direct object
// pi — regroups modifier chains: "tomo pi telo nasa" = house of strange water
// la — introduces context phrase (temporal/conditional)
// o  — marks vocative or imperative

export const rawBundle = {
  meta: {
    name: "Toki Pona",
    code: "tok",
    script: "Latin",
    direction: "ltr",
  },
  lexicon: {
    // Structural particles filed here (closest schema slot).
    // These mark grammatical roles positionally, not morphologically.
    determiners: [
      "li",   // subject-predicate separator
      "e",    // object marker
      "pi",   // modifier regrouper
      "la",   // context phrase marker
      "o",    // vocative/imperative
    ],
    prepositions: [
      "lon",      // at/in/on (location or existence)
      "tan",      // from/because of
      "kepeken",  // using/with (instrumental)
      "tawa",     // to/for/moving toward
      "sama",     // like/similar to
    ],
    pronouns: [
      "mi",    // I/me/my (1st person, no number or gender)
      "sina",  // you/your (2nd person)
      "ona",   // she/he/it/they (3rd person)
    ],
    conjunctions: [
      "en",   // and (joins subjects; not used for predicates)
      "anu",  // or
    ],
    // Preverbs: precede the main verb, modifying its modality/aspect
    auxiliaries: [
      "ken",    // can/able to
      "wile",   // want/need/must
      "kama",   // become/come to (inchoative)
      "sona",   // know how to
      "lukin",  // try to
    ],
    copula: [],  // li is the predicate marker; no inflected "to be"
  },
  morphology: {
    // Toki Pona is fully isolating: no morphology at all.
    suffixRules: [],
    numberSuffixPattern: "",
    verbFormRules: [],
    numberWords: [],  // Toki Pona uses: ala (0), wan (1), tu (2), mute (many), ale (all)
  },
  reference: {
    // Toki Pona pronouns have no number or gender distinctions.
    pronouns: {
      mi: { person: 1, number: null },
      sina: { person: 2, number: null },
      ona: { person: 3, number: null },
    },
    nameGender: {},
  },
  wordOrder: "SVO",
  attachment: {
    determiner: "left",
    adjective: "right",  // modifiers follow the head in Toki Pona
    subject: "left",
    object: "right",
  },
  segmentation: {
    sentenceTerminatorPattern: "[.!?]",
    abbreviations: [],
  },
};
