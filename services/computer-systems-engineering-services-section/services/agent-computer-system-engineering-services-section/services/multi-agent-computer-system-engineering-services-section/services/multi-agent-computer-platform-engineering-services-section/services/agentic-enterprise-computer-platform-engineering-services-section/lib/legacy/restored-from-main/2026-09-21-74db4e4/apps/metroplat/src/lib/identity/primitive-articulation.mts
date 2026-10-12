/**
 * @packageDocumentation
 * Identity admission for the primitive token/claim articulation carrier.
 *
 * @metroplatSubject identity
 */
import {
  addressCanonicalJson,
  parseArtifactRef,
  type AddressedArtifact,
  type ArtifactRef,
} from "./artifact-ref.mts";
import {
  admitCanonicalJson,
  canonicalizeJsonValue,
  type CanonicalJson,
  type CanonicalJsonValue,
} from "./canonical-json.mts";
import {
  identityObstruction,
  identityWitness,
  isIdentityWitness,
  type IdentityJudgment,
} from "./judgment.mts";
import {
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  type IdentityProfileRegistry,
} from "./profiles.mts";
import {
  INITIAL_SITE_CONSTITUTION,
  validateSiteConstitution,
  type SiteConstitution,
} from "./site.mts";

export interface PrimitiveArticulation {
  readonly kind: "metroplat.primitive-articulation";
  readonly version: 1;
  readonly token: ArtifactRef;
  readonly claim: ArtifactRef;
}

export interface AddressedPrimitiveArticulation extends AddressedArtifact {
  readonly articulation: PrimitiveArticulation;
}

const articulationKeys = Object.freeze(["claim", "kind", "token", "version"]);

function exactKeys(value: Record<string, CanonicalJsonValue>): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === articulationKeys.length && actual.every((key, index) => key === articulationKeys[index]);
}

function validateCanonicalArticulation(
  canonical: CanonicalJson,
  site: SiteConstitution,
  registry: IdentityProfileRegistry,
): IdentityJudgment<PrimitiveArticulation> {
  const mountedSite = validateSiteConstitution(site);
  if (!isIdentityWitness(mountedSite)) return mountedSite;
  const carried = canonical.value;
  if (carried === null || Array.isArray(carried) || typeof carried !== "object") {
    return identityObstruction("primitive-articulation", "$", "primitive articulation must be an object");
  }
  const record = carried as Record<string, CanonicalJsonValue>;
  if (!exactKeys(record)) return identityObstruction("primitive-articulation", "$", "primitive articulation has missing or additional properties");
  if (record.kind !== "metroplat.primitive-articulation" || record.version !== 1) {
    return identityObstruction("primitive-articulation", "$", "unsupported primitive articulation kind or version");
  }
  const token = parseArtifactRef(record.token, registry);
  if (!isIdentityWitness(token)) return identityObstruction(token.code, "$.token", token.message);
  const claim = parseArtifactRef(record.claim, registry);
  if (!isIdentityWitness(claim)) return identityObstruction(claim.code, "$.claim", claim.message);
  return identityWitness(Object.freeze({
    kind: "metroplat.primitive-articulation" as const,
    version: 1 as const,
    token: record.token as ArtifactRef,
    claim: record.claim as ArtifactRef,
  }));
}

function addressValidated(
  canonical: CanonicalJson,
  articulation: PrimitiveArticulation,
  registry: IdentityProfileRegistry,
): IdentityJudgment<AddressedPrimitiveArticulation> {
  const addressed = addressCanonicalJson(canonical, registry);
  return isIdentityWitness(addressed)
    ? identityWitness(Object.freeze({ ...addressed.value, articulation }))
    : addressed;
}

export function addressPrimitiveArticulation(
  value: unknown,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedPrimitiveArticulation> {
  const canonical = canonicalizeJsonValue(value);
  if (!isIdentityWitness(canonical)) return canonical;
  const articulation = validateCanonicalArticulation(canonical.value, site, registry);
  return isIdentityWitness(articulation)
    ? addressValidated(canonical.value, articulation.value, registry)
    : articulation;
}

export function admitPrimitiveArticulation(
  source: string | Uint8Array,
  site: SiteConstitution = INITIAL_SITE_CONSTITUTION,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedPrimitiveArticulation> {
  const canonical = admitCanonicalJson(source);
  if (!isIdentityWitness(canonical)) return canonical;
  const articulation = validateCanonicalArticulation(canonical.value, site, registry);
  return isIdentityWitness(articulation)
    ? addressValidated(canonical.value, articulation.value, registry)
    : articulation;
}
