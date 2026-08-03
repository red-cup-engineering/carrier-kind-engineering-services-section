import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
  verifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import {
  inferSemioticResourceNameType,
  readSemioticResourceName,
  renderSemioticResourceName,
} from "../src/punctuated-name-derivation-service.mjs";

test("one SRN path derives one typed claim and one independently verifiable opaque token", () => {
  const surface = "order.payment:receipt-delay";
  const term = readSemioticResourceName(surface);
  const semanticType = inferSemioticResourceNameType(term);

  const addressed = identifyNormalizedSemanticContent({
    objectKind: "semiotic-resource-name.path-claim",
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });

  assert.equal(renderSemioticResourceName(addressed.envelope.settledBody), surface);
  assert.equal(verifyNormalizedSemanticContent(addressed.token, addressed.envelope), true);
});
