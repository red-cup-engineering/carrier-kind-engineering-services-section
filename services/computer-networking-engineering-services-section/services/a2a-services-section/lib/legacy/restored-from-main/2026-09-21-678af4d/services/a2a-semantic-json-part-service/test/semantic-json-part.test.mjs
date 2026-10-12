import assert from "node:assert/strict";
import test from "node:test";

import {
  agentSemanticJsonMessage,
  extractSemanticJsonPart,
  parseA2aMessage,
  semanticJsonPart,
  userSemanticJsonMessage,
} from "../src/semantic-json-part.mjs";

const objectKind = "test.a2a.semantic-json";
const value = Object.freeze({ operation: "observe", subject: "urn:test:one", count: 3 });

test("one addressed semantic JSON value round-trips as one exact A2A part", () => {
  const part = semanticJsonPart({ objectKind, value });
  const admitted = extractSemanticJsonPart([part], { objectKind });
  assert.deepEqual(admitted.value, value);
  assert.match(admitted.token, /^ni:\/\/\/sha-256;/u);
});

test("user and agent messages preserve role while sharing the same carrier law", () => {
  const user = parseA2aMessage(userSemanticJsonMessage({ objectKind, value }, "00000000-0000-4000-8000-000000000001"));
  const agent = parseA2aMessage(agentSemanticJsonMessage({ objectKind, value }, "00000000-0000-4000-8000-000000000002"));
  assert.notEqual(user.role, agent.role);
  assert.deepEqual(extractSemanticJsonPart(user.parts, { objectKind }).value, value);
  assert.deepEqual(extractSemanticJsonPart(agent.parts, { objectKind }).value, value);
});

test("object-kind substitution and extra matching parts are refused", () => {
  const part = semanticJsonPart({ objectKind, value });
  assert.throws(() => extractSemanticJsonPart([part], { objectKind: "test.foreign" }), /instead of/u);
  assert.throws(() => extractSemanticJsonPart([part, part], { objectKind }), /exactly one/u);
});
