/**
 * english/pragmatics — utterance-level readings: false-closure claims and
 * correction-shaped utterances, both read structurally off the real
 * dependency parse rather than a literal phrase/keyword match.
 *
 * - `falseClosureClaim`: an authored assertion that some information is
 *   "genuinely" unresolved (a copula's predicate-adjective complement,
 *   modified by a genuineness-degree adverb — the same `acomp`/`advmod` arcs
 *   any other predication in this codec produces). A direct paraphrase of
 *   "here's what's genuinely open" (different subject, different
 *   genuineness adverb) is caught the same way, because the check is over
 *   arc structure, not surface text.
 * - `classifyCorrectionCue`: repeated/leading negation read off the real `neg`
 *   closed class, and exclamation density read off real sentence-terminator
 *   segmentation — see its own doc for why mood/clause-type classification
 *   (imperative vs. declarative) is deliberately not attempted yet.
 */
import { admitCommunication, parseCommunicationForest } from "@red-cup-engineering/communicating";
import { tokenizeWithBundle } from "@red-cup-engineering/communicating/speaking/listening/parsing/articulating";
import { tag } from "@red-cup-engineering/communicating/speaking/listening/parsing/tagging";
import english from "./compiled.mjs";

const parseForest = (text, bundle) => parseCommunicationForest(admitCommunication(text), bundle);
/** Predicate adjectives this reading treats as claiming an epistemic
 *  boundary — hand-authored vocabulary scoped to this one reading, the same
 *  kind of closed fact list `lexicon.mts` carries for the shared tagger, not
 *  promoted there because no other reading needs it. */
const EPISTEMIC_BOUNDARY_ADJECTIVES = new Set(["open", "unresolved", "unknown", "undetermined", "unclear"]);

/** Adverbs asserting the boundary is not merely present but *genuine* — the
 *  ingredient distinguishing an ordinary claim ("this remains open") from a
 *  false-closure claim ("this is genuinely open"). */
const GENUINENESS_ADVERBS = new Set(["genuinely", "truly", "actually", "really", "honestly"]);

/** The correction a matched false-closure claim owes: the single source of
 *  truth for both the durable claim `executing/session.mts` mints (an
 *  obligation, read back on the next turn/fleet cut) and the immediate
 *  in-turn warning a `Stop` hook returns before the same turn ends. */
export const FALSE_CLOSURE_WARNING = "Do not presume that because you don't know something in your training data or live context that the information does not exist. If you are using the \"openness\" of this information to in any way change your work, you must immediately stop and find the resolution.";

function isFalseClosureAcomp(arcs, acomp) {
  if (!EPISTEMIC_BOUNDARY_ADJECTIVES.has(acomp.depText.toLowerCase())) return false;
  return arcs.some((arc) =>
    arc.rel === "advmod" && arc.head === acomp.dependent && GENUINENESS_ADVERBS.has(arc.depText.toLowerCase()));
}

/** One reading of a false-closure claim: an authored assertion that treats an
 *  absence of information (in training data or live context) as if it were
 *  evidence the information does not exist. */

/**
 * Read whether text contains a false-closure claim: a copula predicating a
 * genuineness-marked epistemic-boundary adjective ("here's what's genuinely
 * open", "this remains truly unresolved"). Structural recognition off the
 * real dependency parse (`acomp` + `advmod` arcs over `parseForest`) — the
 * same tag/relate pipeline every other reading in this codec uses, not a
 * literal string search — so direct paraphrases are caught, not only the one
 * named phrase.
 */
export function falseClosureClaim(text, bundle = english) {
  const forest = parseForest(text, bundle);
  for (const reading of forest.readings) {
    const acompArcs = reading.parse.arcs.filter((arc) => arc.rel === "acomp");
    if (acompArcs.some((acomp) => isFalseClosureAcomp(reading.parse.arcs, acomp))) {
      return Object.freeze({ kind: "english.false-closure-claim", matched: true, span: reading.span.text });
    }
  }
  return Object.freeze({ kind: "english.false-closure-claim", matched: false });
}

const REPEATED_NEGATION_THRESHOLD = 3;
const EXCLAMATIVE_SENTENCE_THRESHOLD = 3;
const CAPS_RUN_THRESHOLD = 4;
const LEADING_NEGATION_MIN_LENGTH = 20;

function negatorWords(forest) {
  return forest.readings.flatMap((reading) => reading.parse.words.filter((word) => word.tags.includes("neg")));
}

/** The utterance opens on a negator ("No,", "Never mind", "Nope —") — read
 *  off the real closed-class `neg` tag on the first reading's first word,
 *  not a `no+\b|nope\b|stop\b` surface-text guess (the prior guess also
 *  folded in "stop", an ordinary verb with no negation content, purely
 *  because it tends to open correction-shaped replies — a coincidence of
 *  this corpus's register, not a fact about negation). */
function opensOnNegation(forest) {
  const first = forest.readings[0]?.parse.words[0];
  return first !== undefined && first.tags.includes("neg") && forest.text.trim().length > LEADING_NEGATION_MIN_LENGTH;
}

/** Sentences whose real segmentation (`articulate`'s terminator split, the
 *  same boundary every other sentence reading in this codec uses) ends on
 *  "!" — reused directly rather than re-counting "!" characters over raw
 *  text, so a run like "!!!" still reads as the segmentation actually saw
 *  it (three terminator-bearing spans), and an aside/quote containing a
 *  mid-sentence "!" is not counted as if it closed a sentence. */
function exclamativeSentenceCount(forest) {
  return forest.readings.filter((reading) => reading.span.text.trimEnd().endsWith("!")).length;
}

/** ALL-CAPS word runs: a real property of the utterance's orthography, not a
 *  guess about its meaning. This codec's parser has no morphological concept
 *  of a "shouting register" to derive this from — it stays a literal scan,
 *  same as any other typographic feature, unlike the negation/exclamation
 *  readings above, which now go through the real tagger and real sentence
 *  segmentation instead of a bespoke regex. */
function capsRunLength(text) {
  return text.split(/\s+/u).filter((word) => word.length >= 2 && word === word.toUpperCase() && /[A-Z]/u.test(word)).length;
}

/**
 * Read whether text reads as a correction: repeated or utterance-initial
 * negation (the real `neg` closed class over the dependency parse),
 * exclamation density (real sentence-terminator segmentation), or ALL-CAPS
 * emphasis (a literal orthographic scan — no syntactic reading of "shouting"
 * exists in this codec).
 *
 * Mood/clause-type classification (imperative vs. declarative) is
 * deliberately NOT attempted here: this codec's tagger has no rule for
 * bare-stem present-tense verbs ("stop", "check", "verify" default to
 * "noun", the same way any unrecognized open-class word does — see
 * `lexicon.mts`'s `irregularVerbs`/`irregularAdjectives` gap lists), so a
 * subjectless-clause heuristic would misfire on ordinary present-tense
 * declaratives ("Morgan wants this fixed" finds no verb either, and would
 * misread as subjectless) just as often as on real imperatives. Faking that
 * distinction would be a new regex-shaped guess wearing a parser's clothes,
 * not a fix. See memory `jural-position-parsing-integration-plan`'s Stage
 * A/B split: this is Stage A's negation/exclamation slice; imperative mood
 * is Stage B, blocked on the tagger gap above.
 */
export function classifyCorrectionCue(text, bundle = english) {
  const forest = parseForest(text, bundle);
  const reasons = [];
  if (negatorWords(forest).length >= REPEATED_NEGATION_THRESHOLD) reasons.push("repeated-negation");
  if (opensOnNegation(forest)) reasons.push("leading-negation");
  if (exclamativeSentenceCount(forest) >= EXCLAMATIVE_SENTENCE_THRESHOLD) reasons.push("exclamation-density");
  if (capsRunLength(text) >= CAPS_RUN_THRESHOLD) reasons.push("caps-emphasis");
  return Object.freeze({ kind: "english.correction-cue-classification", matched: reasons.length > 0, reasons: Object.freeze(reasons) });
}

/** A leading `!` or `-` is a wire-format negation glyph, not English — admitted
 *  here as host-format parsing, then the linguistic reading takes over. */
const SYMBOLIC_NEGATION_PREFIX = /^\s*[!-]\s*/u;

/**
 * Read a claim's polarity through the English lexicon: the claim is denied
 * when any of its words carries the `neg` closed-class tag, or when it opens
 * with a wire negation glyph. Contracted negation ("don't", "isn't") reads as
 * `neg` for free: `tokenize` (`articulating.mts`) splits the clitic "n't" into
 * its own word, and `n't` is a `negators` lexicon entry like any other. `base`
 * is the claim with negator words removed — two claims conflict-on-negation
 * exactly when their bases coincide and their polarities differ. A handful of
 * irregular modal contractions (can't, won't, shan't) leave a bare stem
 * fragment ("ca", "wo", "sha") in `base` once split — a known, narrow gap in
 * those three closed-class irregulars, not a general defect.
 */
export function claimPolarity(text, bundle = english) {
  const glyph = SYMBOLIC_NEGATION_PREFIX.exec(text);
  const body = glyph === null ? text : text.slice(glyph[0].length);
  const bodyOffset = glyph === null ? 0 : glyph[0].length;
  const words = tokenizeWithBundle(body, bodyOffset, bundle);
  const negatorSpans = words.filter((word) => tag(word.text, bundle).includes("neg"));
  const denied = glyph !== null || negatorSpans.length > 0;

  let base = "";
  let cursor = bodyOffset;
  for (const span of negatorSpans) {
    if (span.start === null || span.end === null) continue;
    base += text.slice(cursor, span.start);
    cursor = span.end;
  }
  base += text.slice(cursor);
  base = base.replace(/\s+/gu, " ").trim();

  return Object.freeze({
    kind: "english.claim-polarity",
    polarity: denied ? "denied" : "affirmed",
    base,
    negators: Object.freeze([
      ...(glyph === null ? [] : [glyph[0].trim()]),
      ...negatorSpans.map((span) => span.text),
    ]),
  });
}
