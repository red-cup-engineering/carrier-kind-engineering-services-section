import assert from "node:assert/strict";
import test from "node:test";

import { contentAddress } from "../src/lib/identity/index.mts";
import * as language from "../src/lib/language/index.mts";
import { developmentProgressionOf } from "../src/lib/language/development/index.mts";
import {
  bundleFromLanguageManifest,
  defineLanguageFamily,
  defineLanguagePresentation,
  defineLanguageTranslation,
  languageArtifactOf,
  languageFamilyIsValid,
  languagePresentationIsValid,
  translationWitnessIsValid,
  translateInLanguageFamily,
} from "../src/lib/language/presentation.mts";

const claim = contentAddress({ claim: "observable behavior" });

function presentation(stage) {
  return defineLanguagePresentation({
    id: `metroplat.language.development.${stage}`,
    name: `${stage} development surface`,
    version: "1",
    corner: "assertion",
    rung: "identity",
    validationScope: Object.freeze(["declared-meaning", "FOUR assertions"]),
    contract: Object.freeze({ grammar: Object.freeze({ kind: "json-object", required: Object.freeze(["meaning"]) }), judgments: Object.freeze(["meaning is a string", "FOUR assertions are retained"]), reduction: Object.freeze({ kind: "projection", field: "meaning" }), semantics: Object.freeze({ kind: "record-fields", fields: Object.freeze(["meaning"]) }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
    canonicalExpression: (expression) => expression,
    accepts: (expression) => expression !== null && typeof expression === "object" && !Array.isArray(expression)
      && typeof expression.meaning === "string",
    semantics: (expression) => ({ meaning: expression.meaning }),
  });
}

const presentations = Object.fromEntries(
  ["dream", "plan", "architect", "spec", "tests", "docs", "code"].map((stage) => [stage, presentation(stage)]),
);

function developmentFamily(meaningOf = (expression) => expression.meaning) {
  const stages = ["dream", "plan", "architect", "spec", "tests", "docs", "code"];
  return defineLanguageFamily({
    id: "metroplat.language.development",
    name: "software development",
    sharedSemantics: { kind: "declared-meaning", version: 1 },
    presentations: Object.values(presentations),
    translations: stages.slice(1).map((stage, index) => defineLanguageTranslation({
      source: presentations[stages[index]].address,
      target: presentations[stage].address,
      contract: { kind: "development-stage-refinement", from: stages[index], to: stage },
      lossProfile: { kind: "lossless" },
      translate: (expression) => ({ surface: stage, meaning: meaningOf(expression, stage) }),
    })),
  });
}

const family = developmentFamily();

function developmentChain(options = {}) {
  const stages = ["dream", "plan", "architect", "spec", "tests", "docs", "code"];
  const artifacts = [];
  let artifact = languageArtifactOf(presentations.dream, { surface: "dream", meaning: "observable behavior" }, {
    assertions: [{ claim, charge: "held" }],
  });
  artifacts.push(Object.freeze({ ...artifact, stage: "dream", translations: Object.freeze([]) }));
  for (const stage of stages.slice(1)) {
    const translation = translateInLanguageFamily({
      family,
      source: artifact,
      targetPresentation: presentations[stage].address,
      ...(stage === "spec" && options.contested === true
        ? { targetAssertions: [{ claim, charge: "held" }, { claim, charge: "denied" }] }
        : {}),
    });
    assert.equal(translation.ok, true);
    artifact = translation.artifact;
    artifacts.push(Object.freeze({ ...artifact, stage, translations: Object.freeze([translation.witness]) }));
  }
  return artifacts;
}

test("the development analyzer is an explicit dialect surface, not a language-core runtime dependency", () => {
  assert.equal("developmentProgressionOf" in language, false);
  assert.equal(typeof language.translateInLanguageFamily, "function");
  assert.equal(typeof developmentProgressionOf, "function");
});

test("the canonical language owner retains the decidable-read bundle law", () => {
  const construction = bundleFromLanguageManifest({
    manifest: { id: "test.non-terminating-reader", name: "test", version: "1" },
    corner: "assertion",
    rung: "turing",
    readings: { read: () => [] },
  });

  assert.equal(construction.ok, false);
  assert.equal(construction.report.reports[0].law, "decidable-read");
});

test("development is a lawful dream-to-code language progression", () => {
  const receipt = developmentProgressionOf(developmentChain({ contested: true }));

  assert.equal(receipt.complete, true);
  assert.deepEqual(receipt.order, ["dream", "plan", "architect", "spec", "tests", "docs", "code"]);
  assert.equal(receipt.readings[0].charge, "contested");
  assert.equal(receipt.phase.structural.coloring.length, 7);
  assert.equal(receipt.phase.transport.translations.length, 6);
  assert.equal(receipt.phase.transport.translations.every((translation) => translation.witness.startsWith("metroplat:artifact:1:")), true);
  assert.equal(receipt.phase.topological.causalClosure.kind, "lorentzian.causalSettle:witness");
  assert.equal(receipt.phase.topological.translationCohomology.firstCohomology.rank.members.length, 0);
  assert.equal(receipt.phase.control.regime, "frozen");
  assert.equal(new Set(developmentChain().map((artifact) => artifact.semanticAddress)).size, 1);
  assert.match(receipt.address, /^metroplat:artifact:1:rfc8785-jcs:sha-256:/u);
});

test("a language family composes its deterministic addressed route", () => {
  const source = languageArtifactOf(presentations.tests, { surface: "tests", meaning: "observable behavior" }, { assertions: [{ claim, charge: "held" }] });
  const result = translateInLanguageFamily({ family, source, targetPresentation: presentations.code.address });

  assert.equal(languageFamilyIsValid(family), true);
  assert.equal(result.ok, true);
  assert.equal(result.artifact.expression.surface, "code");
  assert.equal(result.artifact.semanticAddress, source.semanticAddress);
  assert.equal(result.witness.family, family.address);
  assert.equal(result.witness.route.length, 2);
  assert.equal(translationWitnessIsValid(result.witness, source, result.artifact, family), true);
});

test("a language family obstructs an absent directed route", () => {
  const source = languageArtifactOf(presentations.code, { surface: "code", meaning: "observable behavior" });
  const result = translateInLanguageFamily({ family, source, targetPresentation: presentations.dream.address });

  assert.equal(result.ok, false);
  assert.equal(result.obstruction.code, "unrepresentable-form");
});

test("an invalid language family returns a judgment instead of throwing", () => {
  const source = languageArtifactOf(presentations.code, { surface: "code", meaning: "observable behavior" });
  const invalidFamily = Object.freeze({
    kind: "metroplat.language.family",
    version: 1,
    id: "invalid",
    name: "invalid",
    sharedSemantics: Object.freeze({}),
    presentations: Object.freeze([]),
    translations: Object.freeze([]),
    address: contentAddress({ invalid: true }),
  });
  const result = translateInLanguageFamily({ family: invalidFamily, source, targetPresentation: presentations.dream.address });

  assert.equal(result.ok, false);
  assert.equal(result.obstruction.code, "unrecognized-language");
});

test("an equal language id cannot substitute a different presentation contract", () => {
  const original = presentations.tests;
  const substituted = defineLanguagePresentation({
    ...original,
    contract: Object.freeze({ ...original.contract, semantics: Object.freeze({ kind: "record-fields", fields: Object.freeze(["meaning", "surface"]) }) }),
  });
  const source = languageArtifactOf(original, { surface: "tests", meaning: "observable behavior" });
  const translation = defineLanguageTranslation({ source: substituted.address, target: presentations.docs.address, contract: { kind: "substituted" }, lossProfile: { kind: "lossless" }, translate: (expression) => ({ surface: "docs", meaning: expression.meaning }) });
  const substitutedFamily = defineLanguageFamily({ id: "substituted", name: "substituted", sharedSemantics: { kind: "meaning" }, presentations: [substituted, presentations.docs], translations: [translation] });
  const result = translateInLanguageFamily({ family: substitutedFamily, source, targetPresentation: presentations.docs.address });

  assert.equal(languagePresentationIsValid(substituted), true);
  assert.notEqual(original.address, substituted.address);
  assert.equal(result.ok, false);
  assert.equal(result.obstruction.code, "unrecognized-language");
});

test("the progression names absent stages and non-preserved claims", () => {
  const chain = developmentChain();
  const receipt = developmentProgressionOf([
    chain[0],
    Object.freeze({ ...chain.at(-1), translations: Object.freeze([]), assertions: Object.freeze([]) }),
  ]);

  assert.equal(receipt.complete, false);
  assert.equal(receipt.phase.control.regime, "hopping");
  assert.ok(receipt.violations.some((entry) => entry.code === "missing-stage" && entry.stage === "docs"));
  assert.ok(receipt.violations.some((entry) => entry.code === "claim-not-preserved"));
});

test("explicit translation witnesses obstruct address correlation masquerading as translation", () => {
  const chain = developmentChain();
  const forgedPlan = Object.freeze({
    ...chain[1],
    translations: Object.freeze([Object.freeze({ ...chain[1].translations[0], target: chain[0].address })]),
  });
  const receipt = developmentProgressionOf([chain[0], forgedPlan]);

  assert.equal(receipt.complete, false);
  assert.equal(receipt.phase.control.regime, "hopping");
  assert.equal(receipt.phase.transport.translations.length, 0);
  assert.ok(receipt.violations.some((entry) => entry.code === "invalid-translation"));
});

test("translation returns a named obstruction when surface syntax drifts semantically", () => {
  const source = languageArtifactOf(presentations.tests, { surface: "tests", meaning: "observable behavior" }, {
    assertions: [{ claim, charge: "held" }],
  });
  const result = translateInLanguageFamily({
    family: developmentFamily(() => "different behavior"),
    source,
    targetPresentation: presentations.docs.address,
  });

  assert.equal(result.ok, false);
  assert.equal(result.obstruction.code, "semantic-drift");
});
