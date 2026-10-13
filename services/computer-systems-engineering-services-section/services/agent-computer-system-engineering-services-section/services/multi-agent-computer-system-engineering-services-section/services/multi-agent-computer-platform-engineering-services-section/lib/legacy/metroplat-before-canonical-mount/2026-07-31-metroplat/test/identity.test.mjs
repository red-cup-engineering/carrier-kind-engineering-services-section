import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  addressJsonValue,
  addressPrimitiveArticulation,
  addressSiteConstitution,
  addressTextDocument,
  admitCanonicalJson,
  admitPrimitiveArticulation,
  canonicalizeJsonValue,
  INITIAL_RESOURCE_ENVELOPE,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  INITIAL_SITE_CONSTITUTION,
  isIdentityWitness,
  parseArtifactRef,
  verifyArtifact,
} from "../src/lib/identity/index.mts";

function witnessed(judgment) {
  assert.equal(judgment.kind, "metroplat.identity:witness", judgment.message);
  return judgment.value;
}

function obstructed(judgment, code) {
  assert.equal(judgment.kind, "metroplat.identity:obstruction");
  assert.equal(judgment.code, code);
  return judgment;
}

test("text documents exceed one string envelope through bounded JCS Merkle artifacts", () => {
  const text = `${"α".repeat(140_000)}\n${"z".repeat(140_000)}`;
  const left = addressTextDocument(text);
  const right = addressTextDocument(text);
  assert.equal(left.ref, right.ref);
  assert.equal(left.utf8Bytes, Buffer.byteLength(text, "utf8"));
  assert.ok(left.leaves > 1);
  assert.ok(left.artifacts.length > left.leaves);
  for (const artifact of left.artifacts) {
    assert.equal(witnessed(verifyArtifact(artifact.ref, artifact.canonicalText)).ref, artifact.ref);
    assert.ok(Buffer.byteLength(JSON.parse(artifact.canonicalText).text ?? "", "utf8") <= 65_536);
  }
});

test("rfc8785-jcs canonicalizes structural permutations and JCS number spellings", () => {
  const left = witnessed(admitCanonicalJson(' { "b": 2, "a": [333333333.33333329, 1E30, 4.50, 2e-3, -0] } '));
  const right = witnessed(canonicalizeJsonValue({ a: [333333333.3333333, 1e30, 4.5, 0.002, 0], b: 2 }));
  assert.equal(left.text, '{"a":[333333333.3333333,1e+30,4.5,0.002,0],"b":2}');
  assert.equal(left.text, right.text);
});

test("rfc8785-jcs orders property names by UTF-16 code units without Unicode normalization", () => {
  const canonical = witnessed(canonicalizeJsonValue({ "\ufb33": 7, "😀": 6, "€": 5, "ö": 4, "\u0080": 3, "1": 2, "\r": 1 }));
  assert.equal(canonical.text, '{"\\r":1,"1":2,"":3,"ö":4,"€":5,"😀":6,"דּ":7}');

  const composed = witnessed(canonicalizeJsonValue("é"));
  const decomposed = witnessed(canonicalizeJsonValue("e\u0301"));
  assert.notEqual(composed.text, decomposed.text);
});

test("strict byte ingress rejects duplicate names, malformed UTF-8, lone surrogates, and trailing material", () => {
  obstructed(admitCanonicalJson('{"a":1,"a":2}'), "duplicate-key");
  obstructed(admitCanonicalJson(Uint8Array.from([0xc3, 0x28])), "malformed-utf8");
  obstructed(admitCanonicalJson('"\\ud800"'), "unicode-scalar");
  obstructed(admitCanonicalJson("true false"), "malformed-json");
});

test("strict byte ingress carries prototype-shaped property names as inert JSON data", () => {
  const canonical = witnessed(admitCanonicalJson('{"constructor":2,"__proto__":1}'));
  assert.equal(canonical.text, '{"__proto__":1,"constructor":2}');
  assert.equal(Object.getPrototypeOf(canonical.value), Object.prototype);
  assert.equal(Object.hasOwn(canonical.value, "__proto__"), true);
  assert.equal(canonical.value.__proto__, 1);
});

test("runtime value admission rejects non-JSON and observable object behavior", () => {
  obstructed(canonicalizeJsonValue(Number.POSITIVE_INFINITY), "invalid-json-value");
  obstructed(canonicalizeJsonValue(undefined), "invalid-json-value");
  obstructed(canonicalizeJsonValue(new Date(0)), "invalid-json-value");
  obstructed(canonicalizeJsonValue([, 1]), "invalid-json-value");

  let observed = false;
  const accessor = {};
  Object.defineProperty(accessor, "secret", {
    enumerable: true,
    get() {
      observed = true;
      return 1;
    },
  });
  obstructed(canonicalizeJsonValue(accessor), "invalid-json-value");
  assert.equal(observed, false);

  const accessorArray = [0];
  Object.defineProperty(accessorArray, "0", {
    enumerable: true,
    get() {
      observed = true;
      return 1;
    },
  });
  obstructed(canonicalizeJsonValue(accessorArray), "invalid-json-value");
  assert.equal(observed, false);

  const cyclic = {};
  cyclic.self = cyclic;
  obstructed(canonicalizeJsonValue(cyclic), "invalid-json-value");
});

test("resource envelopes obstruct work at the bounded stage", () => {
  assert.equal(witnessed(admitCanonicalJson("true", { ...INITIAL_RESOURCE_ENVELOPE, maxSourceBytes: 4 })).text, "true");
  const sourceBound = { ...INITIAL_RESOURCE_ENVELOPE, maxSourceBytes: 3 };
  obstructed(admitCanonicalJson("true", sourceBound), "source-limit");

  assert.equal(witnessed(admitCanonicalJson("[0]", { ...INITIAL_RESOURCE_ENVELOPE, maxDepth: 1 })).text, "[0]");
  const depthBound = { ...INITIAL_RESOURCE_ENVELOPE, maxDepth: 1 };
  obstructed(admitCanonicalJson("[[]]", depthBound), "depth-limit");

  assert.equal(witnessed(admitCanonicalJson("[1,2]", { ...INITIAL_RESOURCE_ENVELOPE, maxNodes: 3 })).text, "[1,2]");
  const nodeBound = { ...INITIAL_RESOURCE_ENVELOPE, maxNodes: 2 };
  obstructed(admitCanonicalJson("[1,2]", nodeBound), "node-limit");

  assert.equal(witnessed(admitCanonicalJson('{"a":1}', { ...INITIAL_RESOURCE_ENVELOPE, maxObjectMembers: 1 })).text, '{"a":1}');
  const memberBound = { ...INITIAL_RESOURCE_ENVELOPE, maxObjectMembers: 1 };
  obstructed(admitCanonicalJson('{"a":1,"b":2}', memberBound), "object-member-limit");

  assert.equal(witnessed(admitCanonicalJson("[1]", { ...INITIAL_RESOURCE_ENVELOPE, maxArrayLength: 1 })).text, "[1]");
  const arrayBound = { ...INITIAL_RESOURCE_ENVELOPE, maxArrayLength: 1 };
  obstructed(admitCanonicalJson("[1,2]", arrayBound), "array-length-limit");

  assert.equal(witnessed(admitCanonicalJson('"é"', { ...INITIAL_RESOURCE_ENVELOPE, maxStringBytes: 2 })).text, '"é"');
  const stringBound = { ...INITIAL_RESOURCE_ENVELOPE, maxStringBytes: 1 };
  obstructed(admitCanonicalJson('"é"', stringBound), "string-limit");

  assert.equal(witnessed(admitCanonicalJson('{"ab":1}', { ...INITIAL_RESOURCE_ENVELOPE, maxKeyBytes: 2 })).text, '{"ab":1}');
  const keyBound = { ...INITIAL_RESOURCE_ENVELOPE, maxKeyBytes: 1 };
  obstructed(admitCanonicalJson('{"ab":1}', keyBound), "key-limit");

  assert.equal(witnessed(admitCanonicalJson("true", { ...INITIAL_RESOURCE_ENVELOPE, maxCanonicalBytes: 4 })).text, "true");
  const canonicalBound = { ...INITIAL_RESOURCE_ENVELOPE, maxCanonicalBytes: 3 };
  obstructed(admitCanonicalJson("true", canonicalBound), "canonical-limit");
});

test("ArtifactRef has one canonical external spelling and a frozen digest vector", () => {
  const addressed = witnessed(addressJsonValue({ b: 2, a: 1 }));
  assert.equal(addressed.canonical.text, '{"a":1,"b":2}');
  assert.equal(
    addressed.ref,
    "metroplat:artifact:1:rfc8785-jcs:sha-256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
  );
  assert.deepEqual(witnessed(parseArtifactRef(addressed.ref)), addressed.fields);
  assert.equal(witnessed(verifyArtifact(addressed.ref, ' { "b": 2, "a": 1 } ')).ref, addressed.ref);
  obstructed(verifyArtifact(addressed.ref, '{"a":1,"b":3}'), "digest-mismatch");
});

test("ArtifactRef rejects bootstrap forms, aliases, unknown profiles, algorithms, and noncanonical digest spelling", () => {
  const digest = "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777";
  const rejected = [
    `sha256:${digest}`,
    `urn:sha256:${digest}`,
    `blob:sha256:${digest}`,
    `metroplat:artifact:2:rfc8785-jcs:sha-256:${digest}`,
    `metroplat:artifact:1:unknown:sha-256:${digest}`,
    `metroplat:artifact:1:constructor:sha-256:${digest}`,
    `metroplat:artifact:1:rfc8785-jcs:sha-512:${digest}`,
    `metroplat:artifact:1:rfc8785-jcs:sha-256:abc`,
    `metroplat:artifact:1:rfc8785-jcs:sha-256:${digest}:extra`,
    `metroplat:artifact:1:rfc8785-jcs:sha-256:${digest.toUpperCase()}`,
    ` metroplat:artifact:1:rfc8785-jcs:sha-256:${digest}`,
    `metroplat:artifact:1:rfc8785-jcs:sha-256:%${digest}`,
  ];
  for (const reference of rejected) assert.equal(isIdentityWitness(parseArtifactRef(reference)), false, reference);
});

test("the initial SiteConstitution is exact, articulation-only, and content addressed", () => {
  const site = witnessed(addressSiteConstitution());
  assert.equal(site.constitution.languageAndTypingProfiles.length, 0);
  assert.equal(site.constitution.identityAttestationProfiles.length, 0);
  assert.equal(site.constitution.coordinationAndReconciliationProfiles.length, 0);
  assert.equal(site.constitution.formalCorrespondenceRefs.length, 0);
  assert.equal(Object.isFrozen(site.constitution.languageAndTypingProfiles), true);
  assert.equal(Object.isFrozen(INITIAL_IDENTITY_PROFILE_REGISTRY.canonicalProfiles), true);
  assert.equal(Object.isFrozen(INITIAL_IDENTITY_PROFILE_REGISTRY.digestAlgorithms), true);
  assert.equal(
    site.canonical.text,
    '{"FOURProfile":"obsmetrologia-four-1","appraisalKernelProfile":"metroplat-no-semantic-appraisal-1","causalProfile":"metroplat-causal-witness-1","coordinationAndReconciliationProfiles":[],"formalCorrespondenceRefs":[],"identityAttestationProfiles":[],"kind":"metroplat.site-constitution","languageAndTypingProfiles":[],"markAndArticulationProfile":"metroplat-mark-articulation-1","measurementKernelProfile":"metroplat-no-measurement-1","resourceEnvelopeProfile":"metroplat-resource-envelope-1","version":1}',
  );
  // Derived, never typed. The ref is a pure function of the canonical text
  // asserted above, so pinning both states one fact in two places — and the two
  // drift. They did: `3905db6a Rename Infomaterial references -> Obsmetrologia`
  // changed the text (infomaterial-four-1 -> obsmetrologia-four-1) and so
  // changed the digest, the text literal was updated, and this line was not.
  // The constitution is pinned by the canonical-text literal above; this checks
  // that the address pipeline agrees with an independent SHA-256, which is a
  // real check rather than a tautology only because the hash is node's own.
  assert.equal(
    site.ref,
    `metroplat:artifact:1:rfc8785-jcs:sha-256:${createHash("sha256").update(site.canonical.text).digest("hex")}`,
  );
  obstructed(addressSiteConstitution({ ...INITIAL_SITE_CONSTITUTION, languageAndTypingProfiles: ["ambient-language"] }), "site-constitution");
});

test("primitive articulation preserves token/claim roles without granting semantic standing", () => {
  const mark = witnessed(addressJsonValue({ mark: "same opaque artifact" })).ref;
  const claim = witnessed(addressJsonValue({ mark: "different opaque artifact" })).ref;
  const first = witnessed(addressPrimitiveArticulation({
    kind: "metroplat.primitive-articulation",
    version: 1,
    token: mark,
    claim,
  }));
  const permuted = witnessed(admitPrimitiveArticulation(JSON.stringify({ claim, token: mark, version: 1, kind: "metroplat.primitive-articulation" })));
  assert.equal(first.ref, permuted.ref);
  assert.equal(first.articulation.token, mark);
  assert.equal(first.articulation.claim, claim);

  assert.equal(witnessed(addressPrimitiveArticulation({
    kind: "metroplat.primitive-articulation",
    version: 1,
    token: mark,
    claim: mark,
  })).articulation.claim, mark);

  obstructed(addressPrimitiveArticulation({
    kind: "metroplat.primitive-articulation",
    version: 1,
    token: mark,
    claim,
    standing: "held",
  }), "primitive-articulation");
});

test("identity source has no dependency on journal or later runtime layers", async () => {
  const files = (await readdir("src/lib/identity")).filter((file) => file.endsWith(".mts"));
  const forbidden = /(?:journal|rpc|catalog|handler|encounter|protocol|application)/u;
  for (const file of files) {
    const source = await readFile(`src/lib/identity/${file}`, "utf8");
    const specifiers = [...source.matchAll(/(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/gu)].map((match) => match[1]);
    assert.ok(specifiers.length > 0 || file === "index.mts" || file.endsWith("judgment.mts"), `dependency scan found no module specifiers in ${file}`);
    for (const specifier of specifiers) assert.doesNotMatch(specifier, forbidden, `${file}: ${specifier}`);
  }
});
