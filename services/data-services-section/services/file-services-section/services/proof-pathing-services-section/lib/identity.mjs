import { jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
  IDENTITY_SETTLEMENT_PROFILE,
  RMN_NORMALIZATION_PROFILE,
} from "@red-cup-engineering/semantic-content-identify-service";
import {
  settleProofCoordinate,
} from "@red-cup-engineering/proof-path-structuration-service";

export const PROOF_COORDINATE_OBJECT_KIND = "proof-path-addressing.settled-coordinate";

/** Translate an earned PPA coordinate into the existing closed RMN term grammar. */
export function proofCoordinateTerm(coordinate) {
  const checked = settleProofCoordinate(coordinate?.settlement);
  if (!checked.ok || coordinate.type !== "rmn-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("a settled proof coordinate is required");
  }
  return jsonToTerm(checked.coordinate);
}

/** Identify one earned coordinate through the sole normalized v2 semantic envelope. */
export function identifyProofCoordinate(coordinate) {
  const term = proofCoordinateTerm(coordinate);
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    throw new TypeError("a proof coordinate must translate to an inferable closed RMN term");
  }
  return identifyNormalizedSemanticContent({
    objectKind: PROOF_COORDINATE_OBJECT_KIND,
    semanticType,
    term,
    normalizationProfile: RMN_NORMALIZATION_PROFILE,
    settlementProfile: IDENTITY_SETTLEMENT_PROFILE,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
}

/** Settle a coordinate request and identify only the successful settlement. */
export function settleAndIdentifyProofCoordinate(input) {
  const settled = settleProofCoordinate(input);
  if (!settled.ok) return settled;
  return Object.freeze({
    ...settled,
    identity: identifyProofCoordinate(settled.coordinate),
  });
}
