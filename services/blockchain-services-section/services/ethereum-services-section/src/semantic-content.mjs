import {
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  RMN_NORMALIZATION_PROFILE,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

export function semanticIdentity(objectKind, value) {
  const identified = identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
  if (identified.envelope.normalizationProfile !== RMN_NORMALIZATION_PROFILE
      || identified.envelope.settlementProfile !== IDENTITY_SETTLEMENT_PROFILE) {
    throw new TypeError("ethereum semantic identity profile mismatch");
  }
  return identified.token;
}
