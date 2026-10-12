/**
 * cognizing/same-pattern — { left, right } → knowing/derivability: knowledge EQUIVALENCE.
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md);
 * its richer carrier is the comonad context C(Meme) = a held SECTION of memes. Two held
 * sections are MUTUALLY LOCALLY DERIVABLE when an invertible settling-morphism connects
 * them — knowledge equivalence — and that invertibility is classified by agreement of
 * their H¹ invariants. Made concrete: equivalent iff their canonical fingerprints agree
 * (sectionSignature, the sorted multiset of predicate-label ≤_k-standing pairs). This is
 * how knowing classifies even NON-settling (aperiodic) knowings, which escape fixed-point
 * theorems yet still carry an H¹ class. Pure, total over any pair of states.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { admitState, sectionSignature } from "./section.mjs";
import { derivabilityCarrier, knowledgeStatePairCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const STATE_CARRIER_ID = "knowing/knowledge-state";
const DERIVABILITY_CARRIER_ID = "knowing/derivability";

/** same-pattern — are two held sections mutually locally derivable (knowledge equivalence)? */
export const samePatternAction = operation({
  verb: "same-pattern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Classify whether two held knowledge-state sections are mutually locally derivable (equivalent by H¹ class).",
  description: `Domain: a pair { left, right } of knowledge-state carriers (${STATE_CARRIER_ID}). Codomain: ${DERIVABILITY_CARRIER_ID}. Two settlings are mutually-locally-derivable iff an invertible settling-morphism connects them, classified by agreement of their H¹ invariants — concretely, equivalent iff their canonical fingerprints (sectionSignature) agree. This classifies even non-settling (aperiodic) knowings, which escape fixed-point theorems but carry an H¹ class. Grounded in mutually-locally-derivable.`,
  domain: knowledgeStatePairCarrier,
  codomain: derivabilityCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("same-pattern: expected a pair { left, right } of knowledge-state carriers");
    }
    const rec = input;
    const leftSignature = sectionSignature(admitState(rec.left, "same-pattern.left"));
    const rightSignature = sectionSignature(admitState(rec.right, "same-pattern.right"));
    const equivalent = leftSignature === rightSignature;
    const sharedInvariant = equivalent;
    const result = {
      kind: "knowing.derivability",
      equivalent,
      leftSignature,
      rightSignature,
      sharedInvariant,
    };
    return jsonResource(result, "derivability");
  },
});
