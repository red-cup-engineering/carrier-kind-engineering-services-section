// Revived from linguistics-services-section/lib/legacy/2026-07-03-
// communicating-in-english/src/realizing/realize.mts.  This fiber owns
// English surface realization; communicating remains the shared operation
// algebra and supplies conjugation.
import { conjugate, load } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";

const bundle = load(rawBundle);

function plural(subject) {
  const features = bundle.pronounFeatures(subject.toLowerCase());
  if (features?.number === "pl" || features?.number === "both") return true;
  if (features?.number === "sg") return false;
  return /s$/u.test(subject.toLowerCase()) && !/(ss|us|is|ous)$/u.test(subject.toLowerCase());
}

function nounPhrase(noun) {
  if (typeof noun !== "string" || noun.trim() === "") return "";
  if (bundle.isPronoun(noun.toLowerCase()) || /^[A-Z]/u.test(noun) || /^(?:the|a|an)\s/iu.test(noun)) return noun;
  return `the ${noun}`;
}

/**
 * Realizes one typed English clause.  It is pure: a caller owns selection of
 * the semantic role frame and any publication/effect using the resulting text.
 * @param {{subject: string, verb: string, object?: string, negated?: boolean, tense?: "past"|"present"|"future", obliques?: readonly {prep: string, object: string}[]}} spec
 */
export function realizeClause(spec) {
  if (typeof spec?.subject !== "string" || typeof spec?.verb !== "string" || spec.subject === "" || spec.verb === "") throw new TypeError("realizeClause requires subject and verb");
  const tense = spec.tense ?? "present";
  const tokens = [nounPhrase(spec.subject)];
  if (spec.negated) {
    tokens.push(tense === "past" ? "did not" : plural(spec.subject) ? "do not" : "does not", spec.verb.toLowerCase());
  } else {
    tokens.push(conjugate(spec.verb, plural(spec.subject) ? { tense, number: "pl" } : { tense, person: 3, number: "sg" }, bundle));
  }
  if (spec.object !== undefined) tokens.push(nounPhrase(spec.object));
  for (const oblique of spec.obliques ?? []) tokens.push(oblique.prep, nounPhrase(oblique.object));
  const realized = tokens.filter(Boolean);
  return Object.freeze({ text: realized.join(" "), tokens: Object.freeze(realized) });
}

/** Converts the shared role-frame form to the English clause form. */
export function frameToClause(frame, { tense, negated } = {}) {
  if (typeof frame?.verb !== "string" || frame.verb === "") throw new TypeError("frame.verb is required");
  const obliques = [
    ...(frame.instrument === undefined ? [] : [{ prep: "with", object: frame.instrument }]),
    ...(frame.recipient === undefined ? [] : [{ prep: "to", object: frame.recipient }]),
    ...(frame.location === undefined ? [] : [{ prep: "in", object: frame.location }]),
    ...(frame.obliques ?? []),
  ];
  return Object.freeze({ subject: frame.agent ?? "someone", verb: frame.verb, ...(frame.patient === undefined ? {} : { object: frame.patient }), ...(tense === undefined ? {} : { tense }), ...(negated === undefined ? {} : { negated }), ...(obliques.length === 0 ? {} : { obliques: Object.freeze(obliques) }) });
}
