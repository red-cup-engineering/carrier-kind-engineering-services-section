// bundle.ts — Latin as a syntaxis fiber-algebra bundle.
// FREE word order: grammatical roles are marked by CASE ending, not position.
// The roleBy: "case" flag documents this; attachment directions are inert.
// No articles: Latin has none. Case endings are the strongest proof that
// word order is merely a parameter.

export const rawBundle = {
  meta: {
    name: "Latin",
    code: "la",
    script: "Latin",
    direction: "ltr",
  },
  lexicon: {
    determiners: [],  // Latin has NO articles (definite or indefinite)
    prepositions: [
      "in",    // in/into (+ ablative: in; + accusative: into)
      "ad",    // to/toward (+ accusative)
      "cum",   // with (+ ablative)
      "sine",  // without (+ ablative)
      "per",   // through (+ accusative)
      "pro",   // for/on behalf of (+ ablative)
      "ex",    // out of/from (+ ablative)
      "de",    // down from/about (+ ablative)
      "sub",   // under (+ ablative: at rest; + accusative: motion)
      "ante",  // before (+ accusative)
      "post",  // after (+ accusative)
    ],
    // Personal pronouns + demonstratives
    pronouns: [
      "ego", "tu",
      "is", "ea", "id",
      "nos", "vos",
      "ei", "ii",
      "hic", "haec", "hoc",
      "ille", "illa", "illud",
    ],
    conjunctions: ["et", "sed", "quod", "quia", "atque", "nec", "ut", "si"],
    auxiliaries: ["sum", "esse"],
    copula: ["sum", "esse"],
  },
  morphology: {
    // Verb endings come before noun endings in the check order.
    // Noun endings are case markers that encode grammatical role.
    suffixRules: [
      // Verb endings
      { pattern: ".{2,}re$", tag: "verb" },      // present infinitive
      { pattern: ".{2,}bant$", tag: "verb" },    // imperfect 3pl
      { pattern: ".{2,}bat$", tag: "verb" },     // imperfect 3sg
      { pattern: ".{2,}vit$", tag: "verb" },     // perfect 3sg
      { pattern: ".{2,}nt$", tag: "verb" },      // present 3pl
      { pattern: ".{2,}t$", tag: "verb" },       // present 3sg
      // Noun CASE endings (role = case, not position)
      { pattern: ".{2,}orum$", tag: "noun" },    // genitive pl, 2nd decl
      { pattern: ".{2,}arum$", tag: "noun" },    // genitive pl, 1st decl
      { pattern: ".{2,}us$", tag: "noun" },      // nominative sg, 2nd decl (SUBJECT)
      { pattern: ".{2,}um$", tag: "noun" },      // accusative sg (OBJECT) or nom/acc neuter
      { pattern: ".{2,}am$", tag: "noun" },      // accusative sg, 1st decl (OBJECT)
      { pattern: ".{2,}ae$", tag: "noun" },      // gen/dat sg or nom pl, 1st decl
      { pattern: ".{2,}is$", tag: "noun" },      // abl/dat pl; ablative = by/with/from
      { pattern: ".{2,}a$", tag: "noun" },       // nominative sg, 1st decl (SUBJECT)
      { pattern: ".{2,}o$", tag: "noun" },       // dative/ablative sg, 2nd decl
      { pattern: ".{2,}i$", tag: "noun" },       // genitive sg / nom pl, 2nd decl
    ],
    // Case belongs to the Latin fiber, not to a language-neutral parser.
    // These are the exact suffix laws used by roleBy:"case" strategies.
    featureRules: [
      { pattern: ".{2,}(us|a)$", tag: "case:nom" },
      { pattern: ".{2,}(um|am)$", tag: "case:acc" },
      { pattern: ".{2,}(o|is)$", tag: "case:abl" },
      { pattern: ".{2,}(ae|i|orum|arum)$", tag: "case:gen-dat" },
    ],
    numberSuffixPattern: "",  // pluralization is by case-ending, not single -s
    verbFormRules: [
      { pattern: ".{2,}re$", tag: "nonfin" },    // infinitive
      { pattern: ".{2,}bant$", tag: "past" },    // imperfect
      { pattern: ".{2,}bat$", tag: "past" },     // imperfect
      { pattern: ".{2,}vit$", tag: "past" },     // perfect
    ],
    numberWords: [
      "unus", "duo", "tres", "quattuor", "quinque",
      "sex", "septem", "octo", "novem", "decem",
      "centum", "mille",
    ],
  },
  reference: {
    pronouns: {
      ego: { person: 1, number: "sg" },
      nos: { person: 1, number: "pl" },
      tu: { person: 2, number: "sg" },
      vos: { person: 2, number: "pl" },
      is: { person: 3, number: "sg", gender: "m" },
      ea: { person: 3, number: "sg", gender: "f" },
      id: { person: 3, number: "sg", gender: "n" },
      ei: { person: 3, number: "pl" },
      ii: { person: 3, number: "pl" },
      hic: { person: 3, number: "sg", gender: "m" },
      haec: { person: 3, number: "sg", gender: "f" },
      hoc: { person: 3, number: "sg", gender: "n" },
      ille: { person: 3, number: "sg", gender: "m" },
      illa: { person: 3, number: "sg", gender: "f" },
      illud: { person: 3, number: "sg", gender: "n" },
    },
    nameGender: {
      marcus: "m", gaius: "m", lucius: "m", quintus: "m", titus: "m", brutus: "m",
      julia: "f", cornelia: "f", livia: "f", claudia: "f", octavia: "f", aurelia: "f",
    },
  },
  wordOrder: "free",
  roleBy: "case",  // grammatical role is resolved by case ending, NOT by position
  attachment: {
    // These are inert for Latin: case decides role, not attachment direction.
    determiner: "left",
    adjective: "left",
    subject: "left",
    object: "right",
  },
  segmentation: {
    sentenceTerminatorPattern: "[.!?]",
    // Common abbreviations: praenomina (A = Aulus, C = Gaius, L = Lucius, etc.)
    abbreviations: ["a", "c", "l", "m", "p", "q", "t"],
  },
};
