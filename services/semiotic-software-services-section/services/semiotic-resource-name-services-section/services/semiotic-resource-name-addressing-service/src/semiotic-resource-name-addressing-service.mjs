import { isDeepStrictEqual } from "node:util";

import {
  readSemioticResourceName,
  inferSemioticResourceNameType,
  renderSemioticResourceName,
} from "@red-cup-engineering/punctuated-name-derivation-service";
import {
  admitNormalizedSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
  verifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

const SRN_PATH_CLAIM_KIND = "semiotic-resource-name.path-claim";

function refusal(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

function readCanonicalPathClaim(surface) {
  const term = readSemioticResourceName(surface);
  if (term !== null && typeof term === "object" && term.claim === "none") {
    throw refusal("srn-claim-absent", "an underscore-escaped SRN does not denote a path claim and cannot be addressed");
  }
  if (term !== null && typeof term === "object" && term.ok === false) {
    throw refusal("malformed-semiotic-resource-name", term.message);
  }

  let canonicalSurface;
  let semanticType;
  try {
    canonicalSurface = renderSemioticResourceName(term);
    semanticType = inferSemioticResourceNameType(term);
  } catch {
    throw refusal("malformed-semiotic-resource-name", "SRN must denote one renderable Three Dots and a Dash path claim");
  }
  if (canonicalSurface !== surface) {
    throw refusal("non-canonical-semiotic-resource-name", "SRN surface must equal the unique rendering of its path claim");
  }
  return Object.freeze({ semanticType, term });
}

function freezeAddress(surface, token, claim) {
  return Object.freeze({ surface, token, claim });
}

/**
 * Mint the one opaque content token that commits to a canonical SRN path
 * claim.  The returned claim is what a transformer reads; the token is only
 * a commitment to it.
 */
export function addressSemioticResourceName(surface) {
  const claim = readCanonicalPathClaim(surface);
  const identified = identifyNormalizedSemanticContent({
    objectKind: SRN_PATH_CLAIM_KIND,
    semanticType: claim.semanticType,
    term: claim.term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
  return freezeAddress(surface, identified.token, Object.freeze({
    semanticType: identified.envelope.semanticType,
    term: identified.envelope.settledBody,
  }));
}

/**
 * Refuse an address unless its surface, visible typed claim, and opaque token
 * are exactly the one coordinate induced by that surface.  No token is ever
 * decoded to discover meaning.
 */
export function assertSemioticResourceNameAddress(address) {
  if (address === null || typeof address !== "object" || Array.isArray(address)) {
    throw refusal("malformed-srn-address", "SRN address must be an object with surface, token, and claim");
  }
  const { surface, token, claim } = address;
  const expected = addressSemioticResourceName(surface);
  if (!isDeepStrictEqual(claim, expected.claim)) {
    throw refusal("srn-address-mismatch", "SRN address claim does not equal the canonical claim induced by its surface");
  }
  const envelope = identifyNormalizedSemanticContent({
    objectKind: SRN_PATH_CLAIM_KIND,
    semanticType: claim.semanticType,
    term: claim.term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).envelope;
  if (token !== expected.token || !verifyNormalizedSemanticContent(token, envelope)) {
    throw refusal("srn-address-mismatch", "SRN address token does not commit to its visible canonical claim");
  }
  return expected;
}

/** Return whether a supplied SRN coordinate is exact, without throwing. */
export function verifySemioticResourceNameAddress(address) {
  try {
    assertSemioticResourceNameAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Admit transported canonical normalized-envelope bytes into an SRN address. The
 * identity service validates canonical bytes and the optional opaque token;
 * this service then requires the supplied surface to induce that exact claim.
 */
export function admitSemioticResourceNameAddress({ surface, bytes, token } = {}) {
  const identified = admitNormalizedSemanticContent(bytes, token);
  if (identified.envelope.objectKind !== SRN_PATH_CLAIM_KIND) {
    throw refusal("srn-address-mismatch", "normalized semantic content is not an SRN path claim");
  }
  return assertSemioticResourceNameAddress({
    surface,
    token: identified.token,
    claim: {
      semanticType: identified.envelope.semanticType,
      term: identified.envelope.settledBody,
    },
  });
}
