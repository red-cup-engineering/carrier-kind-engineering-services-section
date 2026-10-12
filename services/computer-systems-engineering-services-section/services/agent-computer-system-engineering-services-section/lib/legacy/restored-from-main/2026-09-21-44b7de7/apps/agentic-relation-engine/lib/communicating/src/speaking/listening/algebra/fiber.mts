








import type { LanguageGrammarProfile, MorphotacticPatternRule } from "./profile.mjs";
import type { RegisterFiberData, LanguageRegisterFiber } from "./register-fiber.mjs";

export interface BundleMeta {
  readonly name: string;
  readonly code: string;
  readonly script: string;
  readonly direction: "ltr" | "rtl";
}

export interface BundleLexicon {
  readonly determiners: readonly string[];
  readonly prepositions: readonly string[];
  readonly pronouns: readonly string[];
  readonly conjunctions: readonly string[];
  readonly auxiliaries: readonly string[];
  readonly copula: readonly string[];
}

export interface SuffixRule {
  readonly pattern: string;
  readonly tag: string;
}

export interface BundleMorphology {
  readonly suffixRules: readonly SuffixRule[];
  readonly featureRules?: readonly SuffixRule[];
  readonly rootPatternRules?: readonly MorphotacticPatternRule[];
  readonly numberSuffixPattern: string;
  readonly verbFormRules: readonly SuffixRule[];
  readonly numberWords: readonly string[];
  readonly irregularPlurals?: Readonly<Record<string, string>>;
  readonly irregularVerbs?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Base-form (bare present) verb lemmas with no morphological marking of their
   *  own — e.g. "chase" — that would otherwise floor to "noun" for lack of any
   *  suffix or irregular-table evidence. Unlike a suffix-only 3sg match, a stem
   *  listed here is unambiguous, non-defeasible "verb" evidence (like a
   *  closed-class listing or the irregular-verb table), never dual-tagged. */
  readonly verbStems?: readonly string[];
}

export interface PronounFeatures {
  readonly person: 1 | 2 | 3;
  readonly number: "sg" | "pl" | "both" | null;
  readonly gender?: "m" | "f" | "n";
}

export interface BundleReference {
  readonly pronouns: Readonly<Record<string, PronounFeatures>>;
  readonly nameGender?: Readonly<Record<string, "m" | "f" | "n">>;
}

export interface BundleAttachment {
  readonly determiner: "left" | "right";
  readonly adjective: "left" | "right";
  readonly subject: "left" | "right";
  readonly object: "left" | "right";
}

export interface BundleSegmentation {
  readonly sentenceTerminatorPattern: string;
  readonly abbreviations: readonly string[];
}

export interface RawBundle {
  readonly meta: BundleMeta;
  readonly lexicon: BundleLexicon;
  readonly morphology: BundleMorphology;
  readonly reference: BundleReference;
  readonly wordOrder: "SVO" | "SOV" | "VSO" | "VOS" | "OVS" | "OSV" | "free" | "topic-comment";
  readonly roleBy?: "case";
  readonly grammar?: LanguageGrammarProfile;
  readonly registerFiber?: Partial<RegisterFiberData>;
  readonly attachment: BundleAttachment;
  readonly segmentation: BundleSegmentation;
  /** Bundle-supplied word segmentation, overriding the pipeline's default word
   *  tokenization: given one clause's text, returns its words in order (as
   *  substrings of that text — the pipeline locates each one sequentially to
   *  recover absolute offsets). Absent = existing behavior (the regex tokenizer,
   *  or per-character tokenization when `grammar.segmentation.wordBoundary` is
   *  `"script"`). */
  readonly segment?: (text: string) => readonly string[];
  /** Reporting-verb lemmas (e.g. "say", "tell", "report") that license an
   *  attribution reading when found inflected in a sentence. Absent = no
   *  reporting-verb attributions are read. */
  readonly reportingVerbs?: readonly string[];
  /** Multi-word attribution markers (e.g. "according to", "per") that license
   *  a marker-based attribution reading when found sentence-initial. Absent =
   *  no marker attributions are read. */
  readonly attributionMarkers?: readonly string[];
  /** Epistemic-hedge surface forms (e.g. "likely", "reportedly", "appears")
   *  surfaced in the modality reading. Absent = no hedges are read. */
  readonly hedges?: readonly string[];
}

/** Compiled language bundle: raw data resolved into fast lookup functions. */
export interface CompiledBundle {
  readonly raw: RawBundle;
  readonly meta: BundleMeta;
  readonly wordOrder: RawBundle["wordOrder"];
  readonly roleBy?: "case";
  readonly grammar: LanguageGrammarProfile;
  readonly registerFiber: LanguageRegisterFiber;
  readonly attachment: BundleAttachment;
  readonly closedClassTags: (lowerWord: string) => readonly string[];
  /** Case-preserved closed-class lookup: matches `word` verbatim (no
   *  lowercasing) against the bundle's closed-class lexicon entries in their
   *  original case. Used to look up all-caps acronyms without collapsing them
   *  onto a lowercase closed-class reading (e.g. "US" vs. the pronoun "us"). */
  readonly closedClassTagsCased: (word: string) => readonly string[];
  readonly morphologyTags: (word: string) => readonly string[];
  readonly featureTags: (word: string, tags: readonly string[]) => readonly string[];
  readonly numberFeatures: (word: string, tags: readonly string[]) => readonly ("sg" | "pl")[];
  readonly verbForm: (word: string, tags: readonly string[]) => string | null;
  readonly isCopula: (lowerWord: string) => boolean;
  readonly isPronoun: (lowerWord: string) => boolean;
  readonly pronounFeatures: (lowerWord: string) => PronounFeatures | null;
  readonly isAbbreviation: (word: string) => boolean;
  readonly sentenceTerminators: RegExp;
  /** Bundle-supplied word segmentation, passed through unchanged from `RawBundle`
   *  (see there). Absent = existing behavior. */
  readonly segment?: (text: string) => readonly string[];
  /** Reporting-verb lemmas, passed through unchanged from `RawBundle` (see there). */
  readonly reportingVerbs?: readonly string[];
  /** Attribution markers, passed through unchanged from `RawBundle` (see there). */
  readonly attributionMarkers?: readonly string[];
  /** Hedge surface forms, passed through unchanged from `RawBundle` (see there). */
  readonly hedges?: readonly string[];
}
