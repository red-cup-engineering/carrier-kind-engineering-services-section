import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { jsonId } from "@lenticule-science/latin-language-algebra/semantic-identity";

test("Lakota die IDs preserve the exact SCIS v2 object-kind/value/witness-root law", () => {
  const value = { text: "Sunka kiŋ yawá." };
  const objectKind = "lenticule.lakota-language-algebra.tagging-request";
  const expected = identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
  assert.equal(jsonId(value, objectKind), expected.token);
  assert.notEqual(jsonId(value, `${objectKind}.other`), expected.token);
  assert.throws(() => jsonId(value, ""), /object kind is required/);
});
