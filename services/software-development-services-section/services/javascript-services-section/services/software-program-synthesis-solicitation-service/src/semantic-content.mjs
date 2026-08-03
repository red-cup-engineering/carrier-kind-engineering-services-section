import {
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  identifyJsonSemanticContent,
  RMN_NORMALIZATION_PROFILE,
} from "@red-cup-engineering/semantic-content-identify-service";

export function addressDesignMaterial(objectKind, value) {
  if (typeof objectKind !== "string" || objectKind.length === 0) throw new TypeError("design material requires an object kind");
  const identified = identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
  if (identified.envelope.normalizationProfile !== RMN_NORMALIZATION_PROFILE
      || identified.envelope.settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw new TypeError("design material identity used an unexpected profile");
  }
  return Object.freeze({ ...structuredClone(value), id: identified.token });
}
