// realize.ts — surface realization: ClauseSpec → grammatical surface form.
// This is the GENERATION inverse of syntaxis's parse direction.
// Uses language-parsing inflection and the English bundle for morphological agreement.

import { rawBundle } from "@lenticule-science/english-language-algebra";

import { conjugate } from "../listening/algebra/morphology.mjs";
import { load } from "../listening/algebra/compile.mjs";
const bundle = load(rawBundle);

/** Determine if a subject is plural (heuristic: pronoun lookup or plural form). */
function isPlural(subject) {
  const lower = subject.toLowerCase();
  const pf = bundle.pronounFeatures(lower);
  if (pf?.number === "pl") return true;
  if (pf?.number === "sg") return false;
  // Heuristic: ends in s and not a known singular
  return /s$/.test(lower) && !/(ss|us|is|ous)$/.test(lower);
}

/** Realize a noun phrase: add "the" if bare noun, keep pronouns/proper nouns. */
function realizeNP(noun) {
  if (noun.trim() === "") return "";
  const lower = noun.toLowerCase();
  // Pronoun: keep as-is
  if (bundle.isPronoun(lower)) return noun;
  // Capitalized: likely proper noun, keep as-is
  if (/^[A-Z]/.test(noun)) return noun;
  // Bare noun: add "the"
  return `the ${noun}`;
}

/** Realize a single clause from a ClauseSpec. */
export function realizeClause(spec) {
  const tense = spec.tense ?? "present";
  const plural = isPlural(spec.subject);
  const tokens = [];

  // Subject
  const subject = realizeNP(spec.subject);
  if (subject !== "") tokens.push(subject);

  // Verb with do-support for negation
  if (spec.negated) {
    const doForm = tense === "past"
      ? "did"
      : plural ? "do" : "does";
    tokens.push(`${doForm} not`);
    // Base form of verb after do-support
    const baseVerb = bundle.raw.morphology.irregularVerbs?.[spec.verb.toLowerCase()]
      ? spec.verb.toLowerCase()
      : spec.verb.toLowerCase();
    tokens.push(baseVerb);
  } else {
    const conjugOpts = plural
      ? { tense, number: "pl" }
      : { tense, person: 3, number: "sg" };
    tokens.push(conjugate(spec.verb, conjugOpts, bundle));
  }

  // Object
  if (spec.object !== undefined) {
    tokens.push(realizeNP(spec.object));
  }

  // Obliques (prepositional phrases, in order, never dropped)
  for (const obl of spec.obliques ?? []) {
    tokens.push(obl.prep);
    tokens.push(realizeNP(obl.object));
  }

  const text = tokens.join(" ");

  return { text, tokens, ...(spec.evidence !== undefined ? { evidence: spec.evidence } : {}) };
}

/** Realize a role frame into a ClauseSpec. */
export function frameToClause(frame, opts) {
  const obliques = [];
  if (frame.instrument) obliques.push({ prep: "with", object: frame.instrument });
  if (frame.recipient) obliques.push({ prep: "to", object: frame.recipient });
  if (frame.location) obliques.push({ prep: "in", object: frame.location });

  return {
    subject: frame.agent ?? "someone",
    verb: frame.verb,
    ...(frame.patient !== undefined ? { object: frame.patient } : {}),
    ...(opts?.tense !== undefined ? { tense: opts.tense } : {}),
    ...(opts?.negated !== undefined ? { negated: opts.negated } : {}),
    ...(obliques.length > 0 ? { obliques } : {}),
  };
}
