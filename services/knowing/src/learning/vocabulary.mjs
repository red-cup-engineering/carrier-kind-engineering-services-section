/**
 * learning/vocabulary — the relations an articulation may tell, as one SignCell predicate vocabulary.
 *
 * An articulation turns an utterance into cells (subject, predicate, object) told for or against.
 * Consolidation can only settle what coincides, so the predicates are closed: a carrier that
 * articulates must use these, and tell a negation as the against side of the same cell rather than
 * as a new predicate ("MetroPlat is not a stdio instance" tells (metroplat, is-a, stdio-instance)
 * against). The deontic pair is the one exception, because "not required" is not "forbidden":
 * `must` and `must-not` are separate predicates, and consolidation's rules make telling both of one
 * practice a contradiction on each.
 *
 * Tokens are kebab-case names; a token that names a glossary term uses the term's identity.
 */
import { createPredicateVocabulary } from "@red-cup-engineering/signcell/predicate-vocabulary";

const admitted = createPredicateVocabulary([
  { name: "is-a", category: "taxonomy", domain: "token", range: "kind", description: "The subject is an instance or specialization of the object kind." },
  { name: "same-as", category: "identity", domain: "token", range: "token", description: "The two tokens name one thing; consolidation merges them onto one canonical token." },
  { name: "part-of", category: "placement", domain: "token", range: "whole", description: "The subject belongs inside the object: a module in a package, a package in a section, a section in a layer.", inverse: "has-part" },
  { name: "has-part", category: "placement", domain: "whole", range: "token", description: "The subject contains the object.", inverse: "part-of" },
  { name: "depends-on", category: "dependency", domain: "token", range: "token", description: "The subject uses or is built on the object; the object comes before it in dependency order." },
  { name: "precedes", category: "order", domain: "token", range: "token", description: "The subject comes before the object in an ordering the utterance states (a chain, a pipeline, a plan)." },
  { name: "composes", category: "composition", domain: "token", range: "token", description: "The subject is composed from (assembles, runs on top of) the object." },
  { name: "implements", category: "realization", domain: "software", range: "specification", description: "The subject (code, service, record) realizes the object (a theory, specification, or design)." },
  { name: "specifies", category: "realization", domain: "specification", range: "software", description: "The subject (theory, note, standard) says how the object must be built." },
  { name: "supersedes", category: "succession", domain: "token", range: "token", description: "The subject replaces the object; the object is legacy to revive into the subject." },
  { name: "is-named", category: "naming", domain: "token", range: "name", description: "The subject's proper name is the object." },
  { name: "runs-on", category: "deployment", domain: "process", range: "machine", description: "The subject process runs on the object machine or host." },
  { name: "serves", category: "service", domain: "token", range: "token", description: "The subject provides for, or is operated for, the object." },
  { name: "causes", category: "diagnosis", domain: "token", range: "token", description: "The subject produces the object: a practice and its consequence, a defect and its symptom." },
  { name: "analogous-to", category: "analogy", domain: "token", range: "token", description: "The subject stands to its context as the object stands to its own (a:b::c:d told as a analogous-to c)." },
  { name: "must", category: "directive", domain: "actor", range: "practice", description: "The subject actor is required to do the object practice." },
  { name: "must-not", category: "directive", domain: "actor", range: "practice", description: "The subject actor is forbidden the object practice." },
]);
if (!admitted.ok) throw new TypeError(`learning vocabulary: ${admitted.refusal.issues.join("; ")}`);

/** The admitted relation vocabulary. */
export const relationVocabulary = admitted.value;

/** Predicate names, in declaration order. */
export const relationPredicates = Object.freeze(relationVocabulary.definitions.map((definition) => definition.name));

/** Predicates whose told-for cells compose along a chain. */
export const transitivePredicates = Object.freeze(["is-a", "part-of", "precedes", "depends-on"]);

/** The deontic pairs whose telling for one side tells the other against. */
export const deonticOpposites = Object.freeze([["must", "must-not"]]);

const TOKEN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Whether text is a token: lowercase kebab-case. */
export const isToken = (value) => typeof value === "string" && TOKEN.test(value);

/** The nearest token to free text: lowercased, non-alphanumerics folded to single hyphens. */
export const tokenOf = (text) => String(text).normalize("NFKD").replace(/[̀-ͯ]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
