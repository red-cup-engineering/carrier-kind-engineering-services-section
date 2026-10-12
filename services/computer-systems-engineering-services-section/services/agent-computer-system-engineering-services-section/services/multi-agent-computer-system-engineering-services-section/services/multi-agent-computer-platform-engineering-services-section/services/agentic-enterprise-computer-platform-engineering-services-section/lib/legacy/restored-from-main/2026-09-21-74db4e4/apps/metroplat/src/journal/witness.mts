import {
  addressCanonicalJson,
  admitCanonicalJson,
  canonicalizeJsonValue,
  addressSiteConstitution,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  INITIAL_SITE_CONSTITUTION,
  isIdentityWitness,
  parseArtifactRef,
  validateSiteConstitution,
  type AddressedArtifact,
  type ArtifactRef,
  type CanonicalJson,
  type CanonicalJsonValue,
  type IdentityProfileRegistry,
  type SiteConstitution,
  type SiteRef,
} from "../lib/identity/index.mts";
import {
  isCausalWitness,
  causalObstruction,
  causalWitness,
  type CausalJudgment,
} from "./judgment.mts";

declare const witnessRefBrand: unique symbol;
export type WitnessRef = ArtifactRef & { readonly [witnessRefBrand]: true };

export interface CausalResourceEnvelope {
  readonly maxCauses: number;
  readonly maxReferencedArtifacts: number;
  readonly maxObservedWitnesses: number;
}

export const INITIAL_CAUSAL_RESOURCE_ENVELOPE: CausalResourceEnvelope = Object.freeze({
  maxCauses: 256,
  maxReferencedArtifacts: 1_024,
  maxObservedWitnesses: 4_096,
});

export interface WitnessCore {
  readonly kind: "metroplat.witness-core";
  readonly version: 1;
  readonly site: SiteRef;
  readonly articulation: ArtifactRef;
  readonly causes: readonly WitnessRef[];
  readonly referencedArtifacts: readonly ArtifactRef[];
  readonly attestationRefs: readonly ArtifactRef[];
  readonly boundaryObservationRefs: readonly ArtifactRef[];
}

export interface AddressedWitnessCore extends AddressedArtifact {
  readonly core: WitnessCore;
  readonly ref: WitnessRef;
}

const witnessKeys = Object.freeze([
  "articulation",
  "attestationRefs",
  "boundaryObservationRefs",
  "causes",
  "kind",
  "referencedArtifacts",
  "site",
  "version",
]);

function isRecord(value: CanonicalJsonValue): value is { readonly [key: string]: CanonicalJsonValue } {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

function exactKeys(value: { readonly [key: string]: CanonicalJsonValue }): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === witnessKeys.length && actual.every((key, index) => key === witnessKeys[index]);
}

function parseReferenceSet(
  value: CanonicalJsonValue | undefined,
  path: string,
  limit: number,
  registry: IdentityProfileRegistry,
): CausalJudgment<readonly ArtifactRef[]> {
  if (!Array.isArray(value)) return causalObstruction("witness-shape", path, "reference set must be an array");
  if (value.length > limit) return causalObstruction("dependency-limit", path, `reference set exceeds ${limit} entries`);
  const references: ArtifactRef[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const reference = value[index];
    const parsed = parseArtifactRef(reference, registry);
    if (!isIdentityWitness(parsed)) {
      return causalObstruction("witness-shape", `${path}[${index}]`, parsed.message);
    }
    references.push(reference as ArtifactRef);
  }
  for (let index = 1; index < references.length; index += 1) {
    if (references[index - 1] === references[index]) {
      return causalObstruction("duplicate-reference", `${path}[${index}]`, "reference set contains a duplicate", [references[index]!]);
    }
    if (references[index - 1]! > references[index]!) {
      return causalObstruction("reference-set-order", path, "reference set must be canonically sorted");
    }
  }
  return causalWitness(Object.freeze(references));
}

function validateCanonicalWitnessCore(
  canonical: CanonicalJson,
  site: SiteConstitution,
  causalEnvelope: CausalResourceEnvelope,
  registry: IdentityProfileRegistry,
): CausalJudgment<WitnessCore> {
  const mounted = validateSiteConstitution(site);
  if (!isIdentityWitness(mounted)) return causalObstruction("site-mismatch", "$.site", mounted.message);
  const siteAddress = addressSiteConstitution(site, registry);
  if (!isIdentityWitness(siteAddress)) return causalObstruction("site-mismatch", "$.site", siteAddress.message);
  const carried = canonical.value;
  if (!isRecord(carried) || !exactKeys(carried)) {
    return causalObstruction("witness-shape", "$", "WitnessCore must have exactly the target properties");
  }
  if (carried.kind !== "metroplat.witness-core" || carried.version !== 1) {
    return causalObstruction("witness-shape", "$", "unsupported WitnessCore kind or version");
  }
  if (carried.site !== siteAddress.value.ref) {
    return causalObstruction("site-mismatch", "$.site", "WitnessCore does not name the mounted site");
  }
  const articulation = parseArtifactRef(carried.articulation, registry);
  if (!isIdentityWitness(articulation)) return causalObstruction("witness-shape", "$.articulation", articulation.message);
  const causes = parseReferenceSet(carried.causes, "$.causes", causalEnvelope.maxCauses, registry);
  if (!isCausalWitness(causes)) return causes;
  const referenced = parseReferenceSet(
    carried.referencedArtifacts,
    "$.referencedArtifacts",
    causalEnvelope.maxReferencedArtifacts,
    registry,
  );
  if (!isCausalWitness(referenced)) return referenced;
  const attestations = parseReferenceSet(
    carried.attestationRefs,
    "$.attestationRefs",
    0,
    registry,
  );
  if (!isCausalWitness(attestations)) {
    return carried.attestationRefs instanceof Array && carried.attestationRefs.length > 0
      ? causalObstruction("unsupported-attestation", "$.attestationRefs", "mounted site admits no identity-attestation profile")
      : attestations;
  }
  const observations = parseReferenceSet(
    carried.boundaryObservationRefs,
    "$.boundaryObservationRefs",
    0,
    registry,
  );
  if (!isCausalWitness(observations)) {
    return carried.boundaryObservationRefs instanceof Array && carried.boundaryObservationRefs.length > 0
      ? causalObstruction("unsupported-attestation", "$.boundaryObservationRefs", "mounted site admits no boundary-observation profile")
      : observations;
  }
  return causalWitness(Object.freeze({
    kind: "metroplat.witness-core" as const,
    version: 1 as const,
    site: carried.site as SiteRef,
    articulation: carried.articulation as ArtifactRef,
    causes: causes.value as readonly WitnessRef[],
    referencedArtifacts: referenced.value,
    attestationRefs: attestations.value,
    boundaryObservationRefs: observations.value,
  }));
}

function addressValidatedWitness(
  canonical: CanonicalJson,
  core: WitnessCore,
  registry: IdentityProfileRegistry,
): CausalJudgment<AddressedWitnessCore> {
  const addressed = addressCanonicalJson(canonical, registry);
  return isIdentityWitness(addressed)
    ? causalWitness(Object.freeze({ ...addressed.value, core, ref: addressed.value.ref as WitnessRef }))
    : causalObstruction("artifact-invalid", "$", addressed.message);
}

export function addressWitnessCore(
  value: unknown,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): CausalJudgment<AddressedWitnessCore> {
  const canonical = canonicalizeJsonValue(value);
  if (!isIdentityWitness(canonical)) return causalObstruction("artifact-invalid", canonical.path, canonical.message);
  const core = validateCanonicalWitnessCore(canonical.value, site, causalEnvelope, registry);
  return isCausalWitness(core) ? addressValidatedWitness(canonical.value, core.value, registry) : core;
}

export function admitWitnessCore(
  source: string | Uint8Array,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): CausalJudgment<AddressedWitnessCore> {
  const canonical = admitCanonicalJson(source);
  if (!isIdentityWitness(canonical)) return causalObstruction("artifact-invalid", canonical.path, canonical.message);
  const core = validateCanonicalWitnessCore(canonical.value, site, causalEnvelope, registry);
  return isCausalWitness(core) ? addressValidatedWitness(canonical.value, core.value, registry) : core;
}

export function validateAddressedWitnessCore(
  canonical: CanonicalJson,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  causalEnvelope: CausalResourceEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): CausalJudgment<AddressedWitnessCore> {
  const core = validateCanonicalWitnessCore(canonical, site, causalEnvelope, registry);
  return isCausalWitness(core) ? addressValidatedWitness(canonical, core.value, registry) : core;
}
