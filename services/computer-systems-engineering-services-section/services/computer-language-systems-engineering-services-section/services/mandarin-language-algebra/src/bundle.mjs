// bundle.ts — 普通话 (Standard Mandarin) syntaxis fiber-algebra bundle.
// SVO word order, preposed (LEFT) determiners/adjectives; isolating — no
// person/number/tense/case inflection, relations ride on word order and
// structural particles. Tone (声调) is unmodeled: no phonological/tonal
// feature slot exists; pinyin belongs to emsenn-mandarin-services-section's
// glossary content, not here.
import coreVocabulary from "../content/wordlists/mandarin-core-vocabulary.json" with { type: "json" };
import verbStems from "../content/wordlists/mandarin-verb-stems.json" with { type: "json" };
import { createMandarinSegmenter } from "./segmentation.mjs";

// ── Dictionary-based segmenter's word list ──────────────────────────────
// No whitespace between Mandarin words, so greedy longest-match scans a
// dictionary built from four sources: closed-class lexicon, the classifier
// characters (below), a curated open-class vocabulary file, and the
// curated verb-stem allowlist (below) — see each file's own "note" field
// and data/research-obligations.json (core-vocabulary-sourcing,
// predicate-tagging) for how provisional/curated each source is.

// Grammatical particles. BundleLexicon (see fiber.mts) has no "particle"
// slot — Mandarin's function-word particles are structural markers, not
// determiners, but this schema's closest fit is "determiners" (the same
// shoehorn tokipona-language-algebra's bundle.mts uses for its five
// structural particles li/e/pi/la/o). Filed here for the same reason:
// closed-class, positionally fixed, no better-fitting BundleLexicon slot.
const PARTICLES = [
  "的",  // attributive/possessive marker ("de"): NP-de-NP, adj-de-noun
  "了",  // aspect marker (completed action) / sentence-final change-of-state
  "吗",  // yes/no question particle (sentence-final)
  "呢",  // continuation / mild question particle (sentence-final)
  "吧",  // suggestion / softened-imperative particle (sentence-final)
  "把",  // object-preposing marker (the 把-construction: S 把 O V)
  "被",  // passive-voice marker (the 被-construction: O 被 S V)
  "着",  // aspect marker (durative/progressive state)
];
// Real demonstrative determiners (not shoehorned — these are actually
// determiners under any schema).
const DEMONSTRATIVES = [
  "这",  // this
  "那",  // that
];

const PRONOUNS = [
  "我",    // I / me
  "你",    // you (singular)
  "您",    // you (singular, honorific)
  "他",    // he / him
  "她",    // she / her
  "它",    // it
  "我们",  // we / us
  "你们",  // you (plural)
  "他们",  // they / them
];

const CONJUNCTIONS = [
  "和",    // and (joins nouns/NPs)
  "或",    // or
  "但是",  // but
  "因为",  // because
  "所以",  // so / therefore
];

// Modal auxiliaries (precede the main verb).
const AUXILIARIES = [
  "会",    // will / know how to
  "能",    // can / to be able to
  "可以",  // may / to be allowed to
  "要",    // want to / need to / will (intention)
  "想",    // want to / would like to
];

const COPULA = [
  "是",  // to be (equative copula)
];

// Coverbs — function like prepositions (precede their object NP) but derive
// historically from verbs. Filed under "prepositions", the schema's closest
// slot; BundleLexicon has no separate "coverb" class.
const PREPOSITIONS = [
  "在",  // at / in / on (location)
  "从",  // from
  "到",  // to / until (goal)
  "给",  // to / for (benefactive/recipient)
  "对",  // to / toward (directed at)
];

// Classifiers (measure words) — obligatory between a numeral/determiner and
// its noun ("三 个 人", "这 本 书"). BundleMorphology has no classifier
// class either, so these are curated as morphotactic root-pattern rules,
// each tagged "classifier" with features noting measure-word status and
// (where confidently known) which noun class it pairs with. This is a
// small, curated allowlist, not a generated inventory — Mandarin has
// dozens of productive classifiers; see data/maturity.json.
const CLASSIFIER_RULES = [
  { pattern: "^个$", tag: "classifier", features: ["measure-word", "noun-class:general-default"] },       // 一个人, 一个苹果 — general-purpose default classifier
  { pattern: "^条$", tag: "classifier", features: ["measure-word", "noun-class:long-flexible-objects"] }, // 一条鱼, 一条路 — long, thin, or flexible objects
  { pattern: "^本$", tag: "classifier", features: ["measure-word", "noun-class:bound-volumes"] },         // 一本书 — bound volumes (books)
  { pattern: "^张$", tag: "classifier", features: ["measure-word", "noun-class:flat-objects"] },          // 一张纸, 一张桌子 — flat objects / objects with a flat surface
  { pattern: "^只$", tag: "classifier", features: ["measure-word", "noun-class:small-animals"] },         // 一只猫, 一只狗 — small animals; also paired body parts
  { pattern: "^位$", tag: "classifier", features: ["measure-word", "noun-class:people-honorific"] },      // 一位老师 — people, honorific register
  { pattern: "^家$", tag: "classifier", features: ["measure-word", "noun-class:organizations"] },         // 一家公司 — organizations/businesses (also a plain noun "home/family")
  { pattern: "^次$", tag: "classifier", features: ["measure-word", "noun-class:verbal-events"] },         // 三次 — verbal events (occurrences), not a noun classifier
];

const CLASSIFIER_CHARS = ["个", "条", "本", "张", "只", "位", "家", "次"];

// Curated, source-cited verb-stem allowlist (single/two-character HSK 1-3
// stems), closing the predicate-tagging gap named in data/research-
// obligations.json (id: predicate-tagging). See content/wordlists/
// mandarin-verb-stems.json's own "note" field for how each stem was
// compiled and reviewed. Wired the same way CLASSIFIER_RULES is above:
// one morphology.rootPatternRules entry per stem, tagged "verb".
const escapeForPattern = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VERB_STEM_RULES = verbStems.entries.map((entry) => ({
  pattern: `^${escapeForPattern(entry.stem)}$`,
  tag: "verb",
  features: ["verb-stem", entry.hskLevel],
}));
const VERB_STEMS = verbStems.entries.map((entry) => entry.stem);

// ── Segment: dictionary-based greedy longest-match, left to right ──────
const wordList = [
  ...PARTICLES,
  ...DEMONSTRATIVES,
  ...PRONOUNS,
  ...CONJUNCTIONS,
  ...AUXILIARIES,
  ...COPULA,
  ...PREPOSITIONS,
  ...CLASSIFIER_CHARS,
  ...VERB_STEMS,
  ...coreVocabulary.words,
];

// The segment hook: maximum-probability segmentation over the frequency
// lexicon (segmentation.mjs), with the curated lists above added as words so
// every closed-class item and verb stem stays one token. Punctuation and
// whitespace are never tokens, matching the engine's per-character fallback.
const segment = createMandarinSegmenter({ extraWords: wordList }).segment;

export const rawBundle = {
  meta: {
    name: "普通话 (Putonghua)",
    code: "cmn",
    script: "Han",
    direction: "ltr",
  },
  lexicon: {
    determiners: [...PARTICLES, ...DEMONSTRATIVES],
    prepositions: PREPOSITIONS,
    pronouns: PRONOUNS,
    conjunctions: CONJUNCTIONS,
    auxiliaries: AUXILIARIES,
    copula: COPULA,
  },
  morphology: {
    // Mandarin is isolating: there is no productive suffixal morphology to
    // curate, so this stays honestly empty rather than faked.
    suffixRules: [],
    numberSuffixPattern: "",
    verbFormRules: [],
    numberWords: ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千"],
    rootPatternRules: [...CLASSIFIER_RULES, ...VERB_STEM_RULES],
  },
  reference: {
    // No grammatical gender marking in speech; 他/她/它 differ only in
    // writing. Recorded here as a reading distinction, not a spoken one.
    pronouns: {
      "我": { person: 1, number: "sg" },
      "你": { person: 2, number: "sg" },
      "您": { person: 2, number: "sg" },
      "他": { person: 3, number: "sg", gender: "m" },
      "她": { person: 3, number: "sg", gender: "f" },
      "它": { person: 3, number: "sg", gender: "n" },
      "我们": { person: 1, number: "pl" },
      "你们": { person: 2, number: "pl" },
      "他们": { person: 3, number: "pl" },
    },
    nameGender: {},
  },
  wordOrder: "SVO",
  grammar: {
    kind: "communicating.language-grammar-profile",
    wordOrder: "SVO",
    // Mandarin has no case marking; grammatical relations ride on word order,
    // with a handful of role-marking particles (把/被) for the marked
    // constructions — closer to "semantic-particle" than to a case system.
    alignment: "semantic-particle",
    headDirectionality: {
      determiner: "left",   // 这本书 — demonstrative precedes
      adjective: "left",    // 红色的书 — modifier precedes the noun
      subject: "left",
      object: "right",
      adposition: "left",   // coverbs precede their object: 在家, 从北京
    },
    // 把/被 are filed as "obl" (not "case") strategies: relating.mts's
    // obliqueParticles() scans roleStrategies for a "particle" marker,
    // attaches the marked NP as an oblique dependent of the nearest verb,
    // and emits a "case" arc for the marker itself. Both require a
    // verb-tagged word to attach to — now reachable for any sentence whose
    // verb is in the curated allowlist above (see test/engine.test.mjs for
    // verified 把/被 sentences; the allowlist is still curated, not full
    // morphosyntactic verb detection — data/research-obligations.json).
    roleStrategies: [
      { relation: "nsubj", by: "position", direction: "left", distance: "nearest" },
      { relation: "dobj", by: "position", direction: "right", distance: "nearest" },
      { relation: "obl", by: "particle", marker: "把", markerPosition: "before", note: "把-construction: preposes the object before the verb" },
      { relation: "obl", by: "particle", marker: "被", markerPosition: "before", note: "被-construction: marks the passive agent (or stands agentless)" },
    ],
    morphology: {
      type: "isolating",
      caseMarking: "none",
      agreement: "none",
    },
    segmentation: {
      sentenceBoundary: "punctuation",
      wordBoundary: "script",
    },
    notes: [
      "wordBoundary is 'script' as the documented fallback (per-character tokenization) for when the segment hook is absent; this bundle always supplies `segment`, which takes precedence.",
    ],
  },
  attachment: {
    determiner: "left",
    adjective: "left",
    subject: "left",
    object: "right",
  },
  segmentation: {
    sentenceTerminatorPattern: "[。！？.!?]",
    abbreviations: [],
  },
  segment,
};
