import {
  addressJsonValue,
  CAUSAL_PROFILE_ID,
  isIdentityWitness,
  type AddressedArtifact,
  type ArtifactRef,
  type IdentityProfileRegistry,
} from "../lib/identity/index.mts";
import { CausalSubstrate } from "./substrate.mts";
import {
  isCausalWitness,
  causalObstruction,
  causalWitness,
  type CausalJudgment,
} from "./judgment.mts";
import {
  type CausalResourceEnvelope,
  type WitnessRef,
} from "./witness.mts";

declare const frontierRefBrand: unique symbol;
export type FrontierRef = ArtifactRef & { readonly [frontierRefBrand]: true };

export interface ObservedWitnessClosure {
  readonly kind: "metroplat.witness-closure";
  readonly version: 1;
  readonly site: ArtifactRef;
  readonly witnesses: readonly WitnessRef[];
}

export interface ClosureValidationReceipt {
  readonly kind: "metroplat.witness-closure-validation";
  readonly version: 1;
  readonly causalProfile: typeof CAUSAL_PROFILE_ID;
  readonly closureRoot: ArtifactRef;
}

export interface FrontierManifest {
  readonly kind: "metroplat.frontier";
  readonly version: 1;
  readonly causalProfile: typeof CAUSAL_PROFILE_ID;
  readonly tips: readonly WitnessRef[];
  readonly closureRoot: ArtifactRef;
  readonly closureWitnessRoot: ArtifactRef;
}

export interface AddressedObservedClosure extends AddressedArtifact {
  readonly closure: ObservedWitnessClosure;
}

export interface AddressedClosureValidation extends AddressedArtifact {
  readonly validation: ClosureValidationReceipt;
}

export interface AddressedFrontier extends AddressedArtifact {
  readonly frontier: FrontierManifest;
  readonly ref: FrontierRef;
}

export interface DerivedFrontier {
  readonly kind: "metroplat.journal.derived-frontier";
  readonly closure: AddressedObservedClosure;
  readonly validation: AddressedClosureValidation;
  readonly frontier: AddressedFrontier;
}

function addressFrontierArtifact(value: unknown, registry: IdentityProfileRegistry): CausalJudgment<AddressedArtifact> {
  const addressed = addressJsonValue(value, registry);
  return isIdentityWitness(addressed)
    ? causalWitness(addressed.value)
    : causalObstruction("artifact-invalid", addressed.path, addressed.message);
}

function normalizeSelection(
  selected: readonly WitnessRef[],
  substrate: CausalSubstrate,
  causalEnvelope: CausalResourceEnvelope,
): CausalJudgment<readonly WitnessRef[]> {
  if (selected.length > causalEnvelope.maxObservedWitnesses) {
    return causalObstruction("closure-limit", "$.witnesses", `observed closure exceeds ${causalEnvelope.maxObservedWitnesses} witnesses`);
  }
  const ordered = [...selected].sort();
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1] === ordered[index]) {
      return causalObstruction("duplicate-reference", `$.witnesses[${index}]`, "observed closure contains a duplicate WitnessRef", [ordered[index]!]);
    }
  }
  const selectedSet = new Set(ordered);
  for (const ref of ordered) {
    if (substrate.witnessState(ref) !== "admitted") {
      return causalObstruction("closure-not-admitted", "$.witnesses", "observed closure contains a witness that is not structurally admitted", [ref]);
    }
    const witness = substrate.witness(ref)!;
    const absentCauses = witness.core.causes.filter((cause) => !selectedSet.has(cause));
    if (absentCauses.length > 0) {
      return causalObstruction("closure-not-downclosed", "$.witnesses", "observed witness set omits causal dependencies", absentCauses);
    }
  }
  return causalWitness(Object.freeze(ordered));
}

export function deriveFrontier(
  substrate: CausalSubstrate,
  selected: readonly WitnessRef[] = substrate.admittedWitnessRefs(),
  causalEnvelope: CausalResourceEnvelope = substrate.causalEnvelope,
): CausalJudgment<DerivedFrontier> {
  const normalized = normalizeSelection(selected, substrate, causalEnvelope);
  if (!isCausalWitness(normalized)) return normalized;
  const witnesses = normalized.value;
  const closure: ObservedWitnessClosure = Object.freeze({
    kind: "metroplat.witness-closure" as const,
    version: 1 as const,
    site: substrate.site.ref,
    witnesses,
  });
  const addressedClosure = addressFrontierArtifact(closure, substrate.registry);
  if (!isCausalWitness(addressedClosure)) return addressedClosure;
  const validation: ClosureValidationReceipt = Object.freeze({
    kind: "metroplat.witness-closure-validation" as const,
    version: 1 as const,
    causalProfile: CAUSAL_PROFILE_ID,
    closureRoot: addressedClosure.value.ref,
  });
  const addressedValidation = addressFrontierArtifact(validation, substrate.registry);
  if (!isCausalWitness(addressedValidation)) return addressedValidation;
  const dominated = new Set<WitnessRef>();
  for (const ref of witnesses) {
    for (const cause of substrate.witness(ref)!.core.causes) dominated.add(cause);
  }
  const tips = Object.freeze(witnesses.filter((ref) => !dominated.has(ref)));
  const manifest: FrontierManifest = Object.freeze({
    kind: "metroplat.frontier" as const,
    version: 1 as const,
    causalProfile: CAUSAL_PROFILE_ID,
    tips,
    closureRoot: addressedClosure.value.ref,
    closureWitnessRoot: addressedValidation.value.ref,
  });
  const addressedManifest = addressFrontierArtifact(manifest, substrate.registry);
  if (!isCausalWitness(addressedManifest)) return addressedManifest;
  return causalWitness(Object.freeze({
    kind: "metroplat.journal.derived-frontier" as const,
    closure: Object.freeze({ ...addressedClosure.value, closure }),
    validation: Object.freeze({ ...addressedValidation.value, validation }),
    frontier: Object.freeze({ ...addressedManifest.value, frontier: manifest, ref: addressedManifest.value.ref as FrontierRef }),
  }));
}

export function mergeObservedFrontiers(
  substrate: CausalSubstrate,
  left: DerivedFrontier,
  right: DerivedFrontier,
  causalEnvelope: CausalResourceEnvelope = substrate.causalEnvelope,
): CausalJudgment<DerivedFrontier> {
  const union = new Set<WitnessRef>([
    ...left.closure.closure.witnesses,
    ...right.closure.closure.witnesses,
  ]);
  return deriveFrontier(substrate, [...union], causalEnvelope);
}
