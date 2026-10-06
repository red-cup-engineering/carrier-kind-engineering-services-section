import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { semanticIdOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { ARTIFACT_KIND, addressArtifact, addressPrimitiveArticulation, addressSiteConstitution, addressTextDocument, admitArtifact, admitPrimitiveArticulation, artifactId, INITIAL_SITE_CONSTITUTION, isArtifactRef, verifyArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";

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

test("the initial SiteConstitution is exact, articulation-only, and content addressed", () => {
  const site = addressSiteConstitution();
  assert.equal(site.constitution.languageAndTypingProfiles.length, 0);
  assert.equal(site.constitution.identityAttestationProfiles.length, 0);
  assert.equal(site.constitution.coordinationAndReconciliationProfiles.length, 0);
  assert.equal(site.constitution.formalCorrespondenceRefs.length, 0);
  assert.equal(Object.isFrozen(site.constitution.languageAndTypingProfiles), true);
  assert.equal(
    site.canonical.text,
    '{"FOURProfile":"obsmetrologia-four-1","appraisalKernelProfile":"metroplat-no-semantic-appraisal-1","causalProfile":"metroplat-causal-witness-1","coordinationAndReconciliationProfiles":[],"formalCorrespondenceRefs":[],"identityAttestationProfiles":[],"kind":"metroplat.site-constitution","languageAndTypingProfiles":[],"markAndArticulationProfile":"metroplat-mark-articulation-1","measurementKernelProfile":"metroplat-no-measurement-1","resourceEnvelopeProfile":"metroplat-resource-envelope-1","version":1}',
  );
  assert.equal(site.ref, artifactId(JSON.parse(site.canonical.text)));
  refused(() => addressSiteConstitution({ ...INITIAL_SITE_CONSTITUTION, languageAndTypingProfiles: ["ambient-language"] }), "site-constitution");
});

test("primitive articulation preserves token/claim roles without granting semantic standing", () => {
  const mark = artifactId({ mark: "same opaque artifact" });
  const claim = artifactId({ mark: "different opaque artifact" });
  const first = addressPrimitiveArticulation({ kind: "metroplat.primitive-articulation", version: 1, token: mark, claim });
  const permuted = admitPrimitiveArticulation(JSON.stringify({ claim, token: mark, version: 1, kind: "metroplat.primitive-articulation" }));
  assert.equal(first.ref, permuted.ref);
  assert.equal(first.articulation.token, mark);
  assert.equal(first.articulation.claim, claim);
  assert.equal(addressPrimitiveArticulation({ kind: "metroplat.primitive-articulation", version: 1, token: mark, claim: mark }).articulation.claim, mark);
  refused(() => addressPrimitiveArticulation({ kind: "metroplat.primitive-articulation", version: 1, token: mark, claim, standing: "held" }), "primitive-articulation");
});

test("identity source has no dependency on journal or later runtime layers", async () => {
  const files = (await readdir("src/identity")).filter((file) => file.endsWith(".mjs"));
  const forbidden = /(?:journal|rpc|catalog|handler|encounter|protocol|application)/u;
  for (const file of files) {
    const source = await readFile(`src/identity/${file}`, "utf8");
    const specifiers = [...source.matchAll(/(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/gu)].map((match) => match[1]);
    assert.ok(specifiers.length > 0, `dependency scan found no module specifiers in ${file}`);
    for (const specifier of specifiers) assert.doesNotMatch(specifier, forbidden, `${file}: ${specifier}`);
  }
});
