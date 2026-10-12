import assert from "node:assert/strict";
import test from "node:test";
import { extractSemanticJsonPart, SEMANTIC_JSON_MEDIA_TYPE, semanticJsonPart, userSemanticJsonMessage } from "../scripts/semantic-json-part.mjs";

test("semantic JSON part round-trips its addressed value", () => {
  const part = semanticJsonPart({ objectKind: "test.kind", value: { a: 1 } });
  assert.equal(part.mediaType, SEMANTIC_JSON_MEDIA_TYPE);
  const extracted = extractSemanticJsonPart([part], { objectKind: "test.kind" });
  assert.deepEqual(extracted.value, { a: 1 });
});

test("semantic JSON part refuses a mismatched objectKind", () => {
  const part = semanticJsonPart({ objectKind: "test.kind", value: { a: 1 } });
  assert.throws(() => extractSemanticJsonPart([part], { objectKind: "other.kind" }), /declares/u);
});

test("userSemanticJsonMessage carries the part on a ROLE_USER envelope", () => {
  const message = userSemanticJsonMessage({ objectKind: "test.kind", value: 42 });
  assert.equal(message.role, "ROLE_USER");
  assert.equal(message.parts.length, 1);
});
