// bundle.ts — Lakȟótiyapi (Lakota) as a syntaxis fiber-algebra bundle.
// SOV word order; articles and adjectives are postposed (RIGHT attachment).
// NOTE: Lakota's true verb morphology is prefixal/infixal person/agent/patient marking.
// That frontier is left ⊥ here — it is not captured and not faked. Only the most
// common verb stems are listed; productive morphology requires a different engine.

export const rawBundle = {
  meta: {
    name: "Lakȟótiyapi",
    code: "lkt",
    script: "Latin",
    direction: "ltr",
  },
  lexicon: {
    // Determiners are postposed (RIGHT attachment). Schema has no "postdeterminer"
    // class, so they are filed here with attachment.determiner = "right".
    determiners: [
      "kiŋ",      // the (definite, current referent)
      "waŋ",      // a (indefinite)
      "k'uŋ",    // the (aforementioned, more distal)
      "kiŋháŋ",  // that/when (conditional/temporal)
      "lé",       // this (proximal demonstrative)
      "hé",       // that (distal demonstrative)
      "ká",       // yonder (remote demonstrative)
    ],
    // These are actually POSTPOSITIONS (follow their NP) — filed here because
    // the schema has no postposition class.
    prepositions: [
      "el",        // at/in/on (location)
      "ektá",     // at/to (goal)
      "etkiya",   // toward
      "kičhí",    // with (comitative)
      "uŋ",        // with (instrumental)
      "etáŋhaŋ",  // from
    ],
    // Emphatic pronoun forms. Real agreement is via pronominal affixes on the verb
    // (wa-/ya-/uŋk-…) — that system is ⊥ in this bundle.
    pronouns: ["miyé", "niyé", "iyé", "uŋkíyepi", "niyépi", "iyépi"],
    conjunctions: [
      "na",       // and (clausal conjunction)
      "čhaŋké",  // and so / therefore
      "k'éyaš",  // but
      "čha",      // and then (sequential)
    ],
    // Post-verbal enclitics encoding evidentiality and illocutionary force.
    auxiliaries: [
      "kte",   // future
      "kta",   // future (variant)
      "yeló",  // declarative (masculine)
      "ye",    // declarative (feminine/neutral)
      "he",    // interrogative enclitic
    ],
    copula: [],  // Lakota uses verbs/enclitics directly; no inflected "to be"
  },
  morphology: {
    // Curated allowlist of common verb stems. Productive derivational morphology
    // (prefixal/infixal person marking) is ⊥ — cannot be captured by suffix rules.
    suffixRules: [
      {
        pattern: "^(yawá|kté|lowáŋ|waŋyáŋka|čhíŋ|yatkáŋ|yúta|maní|ínyaŋka|škáta)$",
        tag: "verb",
      },
    ],
    // Lakota does not mark number with a suffix. The animate-plural enclitic -pi
    // is left ⊥: it collides with stem-final "pi" in nouns (wówapi, thípi).
    numberSuffixPattern: "",
    verbFormRules: [],  // Tense/mood rides on post-verbal enclitics; no suffix rules
    numberWords: [
      "waŋží", "núŋpa", "yámni", "tópa", "záptaŋ",
      "šákpe", "šakówiŋ", "šaglóǧaŋ", "napčíŋyuŋka", "wikčémna",
    ],
  },
  reference: {
    // No grammatical gender in Lakota.
    pronouns: {
      "miyé": { person: 1, number: "sg" },
      "niyé": { person: 2, number: "sg" },
      "iyé": { person: 3, number: "sg" },
      "uŋkíyepi": { person: 1, number: "pl" },
      "niyépi": { person: 2, number: "pl" },
      "iyépi": { person: 3, number: "pl" },
    },
    nameGender: {},
  },
  wordOrder: "SOV",
  attachment: {
    determiner: "right",   // postposed in Lakota
    adjective: "right",    // adjectives follow the noun
    subject: "left",
    object: "left",
  },
  segmentation: {
    sentenceTerminatorPattern: "[.!?]",
    abbreviations: [],
  },
};
