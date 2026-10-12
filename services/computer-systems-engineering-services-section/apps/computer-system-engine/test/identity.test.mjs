import assert from "node:assert/strict";
import test from "node:test";

import { semanticIdOf } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { ARTIFACT_KIND, addressArtifact, addressTextDocument, admitArtifact, artifactId, isArtifactRef, verifyArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";

const refused = (thunk, code) => assert.throws(thunk, (error) => error.code === code);

test("text documents exceed one string envelope through bounded Merkle artifacts", () => {
  const text = `${"α".repeat(140_000)}\n${"z".repeat(140_000)}`;
  const left = addressTextDocument(text);
  const right = addressTextDocument(text);
  assert.equal(left.ref, right.ref);
  assert.equal(left.utf8Bytes, Buffer.byteLength(text, "utf8"));
  assert.ok(left.leaves > 1);
  assert.ok(left.artifacts.length > left.leaves);
  for (const artifact of left.artifacts) {
    assert.equal(verifyArtifact(artifact.ref, artifact.canonicalText).ref, artifact.ref);
    assert.ok(Buffer.byteLength(JSON.parse(artifact.canonicalText).text ?? "", "utf8") <= 65_536);
  }
});

test("an artifact is named by SEN identity under the MetroPlat artifact kind", () => {
  const addressed = addressArtifact({ b: 2, a: 1 });
  assert.equal(addressed.canonical.text, '{"a":1,"b":2}');
  assert.equal(addressed.ref, semanticIdOf(ARTIFACT_KIND)({ a: 1, b: 2 }));
  assert.equal(addressed.ref, artifactId({ a: 1, b: 2 }));
  assert.equal(isArtifactRef(addressed.ref), true);
  assert.equal(admitArtifact(' { "b": 2, "a": 1 } ').ref, addressed.ref);
  assert.equal(verifyArtifact(addressed.ref, ' { "b": 2, "a": 1 } ').ref, addressed.ref);
  refused(() => verifyArtifact(addressed.ref, '{"a":1,"b":3}'), "digest-mismatch");
  refused(() => verifyArtifact("metroplat:artifact:1:rfc8785-jcs:sha-256:00", '{"a":1,"b":2}'), "reference-syntax");
});

test("artifact references are exactly RFC 6920 SHA-256 ni URIs", () => {
  const ref = artifactId({ a: 1 });
  for (const reference of [`${ref}x`, ` ${ref}`, ref.toUpperCase(), `urn:sha256:${ref.slice(14)}`, ref.replace("sha-256", "sha-512")]) {
    assert.equal(isArtifactRef(reference), false, reference);
  }
});
