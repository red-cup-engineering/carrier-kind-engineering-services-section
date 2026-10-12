/**
 * analysis/settling-local-constancy - finite executable runtime surface.
 *
 * Lean's strict-regime model treats restriction isomorphisms as equality of
 * section maps. We reuse the KZ sheaf and the finite bitopological site:
 * predicate-local constancy is KZ coherence plus pinned identity restrictions,
 * and settling-local constancy is equality along same predicate-leg routes.
 */
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
} from "@lenticule-science/articulating/predicating/positing/settling";
import { cohomologyVanishesInRegime } from "../../fixpoint/value-category.mts";
import { bitopologicalSettlingSiteReceipt as bitopologicalSiteReceipt, type BitopologicalSettlingSiteReceipt } from "./bitopological-settling-site.mts";
import {
  defaultSheaf,
  kzCoherenceReceipt,
  oneCell,
  oneCellKey,
  sheaf,
  type KZCoherenceReceipt,
  type OneCell,
  type Sheaf,
} from "./kz-coherent-sheaf.mts";

export interface SectionIsoReceipt {
  readonly kind: "settlingLocalConstancy.sectionIso:witness";
  readonly left: string;
  readonly right: string;
  readonly equal: true;
  readonly reflexive: true;
  readonly symmetric: true;
  readonly transitiveOnSample: true;
}

export interface PredicateLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.predicate:witness";
  readonly sheaf: Sheaf;
  readonly coherence: KZCoherenceReceipt;
  readonly identityPinned: true;
  readonly predicateUniform: true;
  readonly predicateLocallyConstantIffUniform: true;
}

export interface SettlingLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.settling:witness";
  readonly sheaf: Sheaf;
  readonly samePredicateLegPairs: readonly (readonly [OneCell, OneCell])[];
  readonly sectionMapsEqual: true;
  readonly everySheafSettlingLocallyConstantStrict: true;
  readonly temporalLegProofIrrelevant: true;
}

export interface ConstantSheafLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.constantSheaf:witness";
  readonly sheaf: Sheaf;
  readonly value: string;
  readonly predicateLocallyConstant: PredicateLocalConstancyReceipt;
  readonly settlingLocallyConstant: SettlingLocalConstancyReceipt;
  readonly restrictionsAreIdentityIsomorphisms: true;
}

export interface VanishingRegimeLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.vanishingRegime:witness";
  readonly h1VanishesInStrict: true;
  readonly h1VanishesInScott: true;
  readonly h1VanishesInTransfinite: false;
  readonly h1VanishesInAperiodic: false;
  readonly vanishingRegimeIsStrictOrScott: true;
  readonly h1VanishingUnconditionalInStrictModel: true;
  readonly aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model";
}

export interface SettlingLocalConstancyModuleReceipt {
  readonly kind: "settlingLocalConstancy.receipt:witness";
  readonly site: BitopologicalSettlingSiteReceipt;
  readonly predicate: PredicateLocalConstancyReceipt;
  readonly settling: SettlingLocalConstancyReceipt;
  readonly constantSheaf: ConstantSheafLocalConstancyReceipt;
  readonly regime: VanishingRegimeLocalConstancyReceipt;
  readonly frontier: readonly string[];
}

const sectionOf = (sheafValue: Sheaf, cell: OneCell): string =>
  sheafValue.sections[oneCellKey(cell)] ?? "";

const identityPinned = (sheafValue: Sheaf): boolean =>
  sheafValue.zeroCells.every((cell) => {
    const restId = sheafValue.restId[cell.name];
    return typeof restId === "string" && restId.length > 0;
  });

const samePredicateLeg = (left: OneCell, right: OneCell): boolean =>
  left.source === right.source && left.target === right.target && left.predicateLeg === right.predicateLeg;

const samePredicateLegPairs = (sheafValue: Sheaf): readonly (readonly [OneCell, OneCell])[] =>
  Object.freeze(sheafValue.oneCells.flatMap((left) =>
    sheafValue.oneCells
      .filter((right) => samePredicateLeg(left, right))
      .map((right) => Object.freeze([left, right] as const))));

export function sectionIso(left: string, right: string): SectionIsoReceipt {
  if (left !== right) throw new TypeError("sectionIso: strict-regime section isomorphism requires equality");
  return Object.freeze({
    kind: "settlingLocalConstancy.sectionIso:witness" as const,
    left,
    right,
    equal: true as const,
    reflexive: true as const,
    symmetric: true as const,
    transitiveOnSample: true as const,
  });
}

export function predicateLocalConstancyReceipt(sheafValue: Sheaf = defaultSheaf): PredicateLocalConstancyReceipt {
  const coherence = kzCoherenceReceipt(sheafValue);
  const pinned = identityPinned(sheafValue);
  if (!pinned || !coherence.identifiesParallel) {
    throw new TypeError("predicateLocalConstancyReceipt: KZ coherence or identity pinning failed");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.predicate:witness" as const,
    sheaf: sheafValue,
    coherence,
    identityPinned: true as const,
    predicateUniform: true as const,
    predicateLocallyConstantIffUniform: true as const,
  });
}

export function settlingLocalConstancyReceipt(sheafValue: Sheaf = defaultSheaf): SettlingLocalConstancyReceipt {
  const pairs = samePredicateLegPairs(sheafValue);
  const sectionMapsEqual = pairs.every(([left, right]) => sectionOf(sheafValue, left) === sectionOf(sheafValue, right));
  if (!sectionMapsEqual) {
    throw new TypeError("settlingLocalConstancyReceipt: same-predicate-leg section maps diverged");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.settling:witness" as const,
    sheaf: sheafValue,
    samePredicateLegPairs: pairs,
    sectionMapsEqual: true as const,
    everySheafSettlingLocallyConstantStrict: true as const,
    temporalLegProofIrrelevant: true as const,
  });
}

export function constantSheaf(value = "constant:section"): Sheaf {
  const idStart = oneCell("id:start", "start", "start", "id");
  const idDone = oneCell("id:done", "done", "done", "id");
  const advanceA = oneCell("constant:advance-a", "start", "done", "advance");
  const advanceB = oneCell("constant:advance-b", "start", "done", "advance");
  return sheaf(
    ["start", "done"],
    [idStart, idDone, advanceA, advanceB],
    {
      [oneCellKey(idStart)]: value,
      [oneCellKey(idDone)]: value,
      [oneCellKey(advanceA)]: value,
      [oneCellKey(advanceB)]: value,
    },
    { start: value, done: value },
  );
}

export function constantSheafLocalConstancyReceipt(value = "constant:section"): ConstantSheafLocalConstancyReceipt {
  const sheafValue = constantSheaf(value);
  return Object.freeze({
    kind: "settlingLocalConstancy.constantSheaf:witness" as const,
    sheaf: sheafValue,
    value,
    predicateLocallyConstant: predicateLocalConstancyReceipt(sheafValue),
    settlingLocallyConstant: settlingLocalConstancyReceipt(sheafValue),
    restrictionsAreIdentityIsomorphisms: true as const,
  });
}

export function vanishingRegimeLocalConstancyReceipt(): VanishingRegimeLocalConstancyReceipt {
  const strict = cohomologyVanishesInRegime(finiteClosureRegime);
  const scott = cohomologyVanishesInRegime(scottClosureRegime);
  const transfinite = cohomologyVanishesInRegime(transfiniteClosureRegime);
  const aperiodic = cohomologyVanishesInRegime(aperiodicClosureRegime);
  if (!strict || !scott || transfinite || aperiodic) {
    throw new TypeError("vanishingRegimeLocalConstancyReceipt: regime cohomology table drifted");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.vanishingRegime:witness" as const,
    h1VanishesInStrict: true as const,
    h1VanishesInScott: true as const,
    h1VanishesInTransfinite: false as const,
    h1VanishesInAperiodic: false as const,
    vanishingRegimeIsStrictOrScott: true as const,
    h1VanishingUnconditionalInStrictModel: true as const,
    aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model" as const,
  });
}

export function settlingLocalConstancyModuleReceipt(sheafValue: Sheaf = defaultSheaf): SettlingLocalConstancyModuleReceipt {
  return Object.freeze({
    kind: "settlingLocalConstancy.receipt:witness" as const,
    site: bitopologicalSiteReceipt(),
    predicate: predicateLocalConstancyReceipt(sheafValue),
    settling: settlingLocalConstancyReceipt(sheafValue),
    constantSheaf: constantSheafLocalConstancyReceipt(),
    regime: vanishingRegimeLocalConstancyReceipt(),
    frontier: Object.freeze([
      "The runtime model treats section isomorphism as equality, matching the strict-regime Lean shadow.",
      "Aperiodic failure of local constancy at every countable tau0 remains outside this runtime; this Nat-indexed model records the boundary.",
      "General sheaves over arbitrary bitopological Grothendieck sites are not synthesized by this finite receipt.",
    ]),
  });
}
