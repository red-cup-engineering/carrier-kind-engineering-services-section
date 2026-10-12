import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import {
  actions,
  analyzeLakotaFrames,
  analyzeLakotaParticles,
  corpus,
  generateLakotaForm,
  generateLakotaParadigms,
  manifest,
  normalizeLakotaOrthography,
  readLakotaMaturity,
  readLakotaResearchObligations,
  settle,
} from "../src/index.mjs";

function onlyWord(text) {
  const result = settle(text);
  assert.equal(result.words.length, 1);
  return result.words[0];
}

function assertVerbFeatures(text, expected) {
  const word = onlyWord(text);
  assert.ok(word.tags.includes("verb"), `${text} should be admitted as a verb`);
  for (const feature of expected) {
    assert.ok(word.feats.includes(feature), `${text} missing ${feature}`);
  }
}

test("Lakota manifest admits finite pronominal-affix verb features", () => {
  assertVerbFeatures("wačhíŋ.", [
    "root:čhíŋ",
    "template:class-i-wa+stem",
    "morphotactic:pronominal-prefix",
    "agreement:actor:1sg",
  ]);
  assertVerbFeatures("yačhíŋ.", [
    "root:čhíŋ",
    "template:class-i-ya+stem",
    "agreement:actor:2sg",
  ]);
  assertVerbFeatures("bluhá.", [
    "root:yuhá",
    "template:class-ii-y-stem-1sg",
    "morphotactic:y-stem-pronominal-alternation",
    "agreement:actor:1sg",
  ]);
  assertVerbFeatures("emáčiyapi.", [
    "root:ečíyapi",
    "template:ma-infix+stem",
    "morphotactic:pronominal-infix",
    "agreement:undergoer:1sg",
  ]);
});

test("Lakota manifest records the admitted analysis as manifest evidence", () => {
  const morphotacticRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.pronominalAffixSeries");

  assert.equal(morphotacticRows.length, 3);
  assert.ok(morphotacticRows.some((row) => row.entity === "language:lkt:morphotactics:class-i"));
  assert.ok(morphotacticRows.some((row) => row.entity === "language:lkt:morphotactics:class-ii-y-stem"));
  assert.ok(morphotacticRows.some((row) => row.entity === "language:lkt:morphotactics:patient-series"));
});

test("Lakota manifest records finite particle evidence as underdetermined RWIL rows", () => {
  const particleRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.particleSeries");

  assert.equal(particleRows.length, 3);
  assert.ok(particleRows.every((row) => row.value.certainty === "underdetermined"));
  assert.ok(particleRows.some((row) => row.entity === "language:lkt:particle:weló-yeló"));
  assert.ok(particleRows.some((row) => row.entity === "language:lkt:particle:he-hwo"));
  assert.ok(particleRows.some((row) => row.entity === "language:lkt:particle:kštó"));
});

test("Lakota manifest records finite semantic frame and implicit-argument evidence", () => {
  const semanticRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.semanticFrame");
  const implicitRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.implicitArgumentStrategy");
  const valenceRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.valenceFrame");

  assert.equal(semanticRows.length, 4);
  assert.equal(implicitRows.length, 1);
  assert.equal(valenceRows.length, 1);
  assert.ok(semanticRows.every((row) => row.value.certainty === "underdetermined"));
  assert.ok(semanticRows.some((row) => row.entity === "language:lkt:semantic-frame:čhíŋ"));
  assert.ok(semanticRows.some((row) => row.entity === "language:lkt:semantic-frame:yuhá"));
  assert.ok(semanticRows.some((row) => row.entity === "language:lkt:semantic-frame:úŋ"));
  assert.ok(semanticRows.some((row) => row.entity === "language:lkt:semantic-frame:ečíyapi"));
});

test("Lakota manifest records variant-preserving orthography evidence", () => {
  const rows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.orthographyNormalization");

  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.value.preserveObservedVariant === true));
  assert.ok(rows.every((row) => row.value.certainty === "underdetermined"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:orthography:sentence-final-declarative-yelo"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:orthography:class-ii-yuha-1sg"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:orthography:class-ii-yuha-2sg"));
});

test("Lakota manifest records finite witnessed paradigms", () => {
  const rows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.morphotacticParadigm");

  assert.equal(rows.length, 4);
  assert.ok(rows.every((row) => row.value.certainty === "witnessed-finite"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:paradigm:čhíŋ"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:paradigm:yuhá"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:paradigm:úŋ"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:paradigm:ečíyapi"));
});

test("Lakota manifest records roadmap research obligations", () => {
  const rows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.researchObligation");

  assert.equal(rows.length, 7);
  assert.ok(rows.every((row) => row.value.maturity === "Roadmap"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:obligation:contextual-syntax-arcs"));
  assert.ok(rows.some((row) => row.entity === "language:lkt:obligation:source-governance"));
});

test("Lakota manifest records the maturity report without claiming Lean proof", () => {
  const rows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.maturityReport");

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.entity, "language:lkt:maturity");
  assert.equal(rows[0]?.value.provenInLean, "none-claimed");
  assert.deepEqual(rows[0]?.value.maturityTags, ["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"]);
});

test("Lakota parser admits finite witnessed sentence-final particles", () => {
  const welo = onlyWord("weló.");
  assert.ok(welo.tags.includes("enclitic"));
  for (const feature of [
    "particle:attested-declarative-final",
    "particle:orthographic-variant:weló",
    "function:underdetermined",
    "root:weló",
    "template:sentence-final-particle",
  ]) {
    assert.ok(welo.feats.includes(feature), `weló missing ${feature}`);
  }

  const he = onlyWord("he?");
  assert.ok(he.tags.includes("aux"));
  assert.ok(he.feats.includes("particle:attested-interrogative-final"));

  const ksto = onlyWord("kštó.");
  assert.ok(ksto.tags.includes("enclitic"));
  assert.ok(ksto.feats.includes("particle:attested-emphatic-final"));
});

test("Lakota parser admits finite Class II alternate surfaces without erasing features", () => {
  assertVerbFeatures("bduhá.", [
    "root:yuhá",
    "template:class-ii-y-stem-1sg",
    "morphotactic:y-stem-pronominal-alternation",
    "agreement:actor:1sg",
  ]);
  assertVerbFeatures("duhá.", [
    "root:yuhá",
    "template:class-ii-y-stem-2sg",
    "morphotactic:y-stem-pronominal-alternation",
    "agreement:actor:2sg",
  ]);
});

for (const entry of corpus) {
  test(`Lakota corpus parses ${entry.id}`, () => {
    const result = settle(entry.text);
    for (const expected of entry.expect.words) {
      const parsed = result.words.find((word) => word.text === expected.text);
      assert.ok(parsed, `${expected.text} should be tokenized`);
      for (const tag of expected.tags) {
        assert.ok(parsed.tags.includes(tag), `${expected.text} missing tag ${tag}`);
      }
      for (const feature of expected.features) {
        assert.ok(parsed.feats.includes(feature), `${expected.text} missing feature ${feature}`);
      }
    }
    if (entry.expect.arcs !== undefined) {
      assert.equal(result.arcs.length, entry.expect.arcs.length);
    }
  });
}

test("Lakota contextual corpus entries leave syntax underdetermined", () => {
  const contextual = corpus.filter((entry) => entry.id.endsWith("-context"));

  assert.equal(contextual.length, 3);
  assert.ok(contextual.every((entry) => entry.maturity === "Research-grade"));
  assert.ok(contextual.every((entry) => entry.expect.arcs === undefined));
  assert.ok(contextual.every((entry) => entry.expect.words.length > 1));
});

test("Lakota generation is finite corpus readback", () => {
  const result = generateLakotaForm({
    root: "čhíŋ",
    features: ["agreement:actor:1sg"],
  });

  assert.deepEqual(result.candidates.map((candidate) => candidate.surface), ["wačhíŋ"]);
  assert.equal(result.candidates[0]?.corpusEntry, "ldl121-class-i-ching-1sg");
});

test("Lakota particle analysis exposes line-cited underdetermined witnesses", () => {
  const result = analyzeLakotaParticles("Míš-eyá héčha waŋží wačhíŋ kštó.");

  assert.equal(result.kind, "communicating-in-lakota.particle-analysis");
  assert.equal(result.particles.length, 1);
  assert.equal(result.particles[0]?.text, "kštó");
  assert.equal(result.particles[0]?.function, "attested-emphatic-final");
  assert.equal(result.particles[0]?.certainty, "underdetermined");
  assert.match(result.particles[0]?.witnesses[0]?.locator ?? "", /2026-06-26-lakota-corpus\.md:196/u);
});

test("Lakota frame analysis exposes agreement-derived implicit participants", () => {
  const result = analyzeLakotaFrames("wačhíŋ. luhá. ečíyapi.");

  assert.equal(result.kind, "communicating-in-lakota.frame-analysis");
  assert.equal(result.frames.length, 3);

  const want = result.frames.find((frame) => frame.root === "čhíŋ");
  assert.equal(want?.frame, "desire/want");
  assert.equal(want?.participants[0]?.role, "actor");
  assert.equal(want?.participants[0]?.value, "speaker");
  assert.equal(want?.participants[0]?.implicit, true);

  const have = result.frames.find((frame) => frame.root === "yuhá");
  assert.equal(have?.participants[0]?.role, "actor");
  assert.equal(have?.participants[0]?.value, "listener");

  const named = result.frames.find((frame) => frame.root === "ečíyapi");
  assert.equal(named?.participants[0]?.role, "undergoer");
  assert.equal(named?.participants[0]?.value, "third-or-unmarked");
  assert.equal(named?.participants[0]?.certainty, "underdetermined");
});

test("Lakota orthography normalization preserves observed variants", () => {
  const result = normalizeLakotaOrthography("bduhá weló duhÁ");

  assert.equal(result.kind, "communicating-in-lakota.orthography-normalization");
  assert.deepEqual(result.tokens.map((token) => token.text), ["bduhá", "weló", "duhÁ"]);
  assert.deepEqual(result.tokens.map((token) => token.normalized), ["bluhá", "yeló", "luhá"]);
  assert.deepEqual(result.tokens.map((token) => token.preservedVariant), ["bduhá", "weló", "duhÁ"]);
  assert.ok(result.tokens.every((token) => token.certainty === "underdetermined"));
  assert.equal(result.normalizedText, "bluhá yeló luhá");
});

test("Lakota paradigm generation reads finite corpus cells with variants", () => {
  const result = generateLakotaParadigms({ root: "yuhá" });

  assert.equal(result.kind, "communicating-in-lakota.paradigms");
  assert.equal(result.paradigms.length, 1);
  assert.equal(result.paradigms[0]?.root, "yuhá");
  assert.equal(result.paradigms[0]?.certainty, "witnessed-finite");
  assert.deepEqual(result.paradigms[0]?.cells.map((cell) => cell.surface), ["bluhá", "luhá", "yuhá"]);
  assert.deepEqual(result.paradigms[0]?.cells[0]?.variants, ["bluhá", "bduhá"]);
  assert.deepEqual(result.paradigms[0]?.cells[1]?.variants, ["luhá", "duhá"]);
  assert.equal(result.paradigms[0]?.cells[2]?.agreement, "actor:3sg-or-unmarked");
});

test("Lakota research obligations are machine-readable and maturity-tagged", () => {
  const report = readLakotaResearchObligations();
  const manifestRows = manifest.witnessJournal.filter((row) =>
    row.attribute === "communicating.researchObligation");

  assert.equal(report.kind, "communicating-in-lakota.research-obligations");
  assert.deepEqual(report.maturityTags, ["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"]);
  assert.equal(report.obligations.length, manifestRows.length);
  assert.ok(report.obligations.every((obligation) => obligation.maturity === "Roadmap"));
  assert.ok(report.obligations.every((obligation) => obligation.upgradeEvidence.length > 0));
  assert.ok(report.obligations.some((obligation) => obligation.id === "contextual-syntax-arcs"));
  assert.ok(report.obligations.some((obligation) => obligation.id === "source-governance"));
});

test("Lakota maturity report distinguishes built, research, proof, and roadmap status", () => {
  const report = readLakotaMaturity();

  assert.equal(report.kind, "communicating-in-lakota.maturity");
  assert.deepEqual(report.maturityTags, ["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"]);
  assert.ok(report.entries.some((entry) => entry.maturity === "Built+green"));
  assert.ok(report.entries.some((entry) => entry.maturity === "Research-grade"));
  assert.ok(report.entries.every((entry) => entry.maturity !== "Proven-in-Lean"));
  assert.equal(report.provenInLean.status, "none-claimed");
  assert.equal(report.roadmapObligations.length, readLakotaResearchObligations().obligations.length);
  assert.ok(report.roadmapObligations.includes("source-governance"));
});

test("Lakota current-surfaces example runs against built package", () => {
  const result = spawnSync(process.execPath, ["examples/current-surfaces.mjs"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.kind, "communicating-in-lakota.example.current-surfaces");
  assert.equal(output.finiteForm.surface, "wačhíŋ");
  assert.equal(output.finiteParadigm.root, "yuhá");
  assert.equal(output.orthography.normalizedText, "bluhá yeló luhá");
  assert.equal(output.particles.particles[0]?.text, "kštó");
  assert.equal(output.frames.frames.length, 3);
  assert.equal(output.maturity.provenInLean.status, "none-claimed");
  assert.ok(output.obligations.obligations.some((obligation) => obligation.id === "source-governance"));
});

test("Lakota package actions expose corpus and generation surfaces", () => {
  const verbs = actions.map((act) => act.verb);
  assert.ok(verbs.includes("read-lakota-corpus"));
  assert.ok(verbs.includes("generate-lakota-form"));
  assert.ok(verbs.includes("analyze-lakota-particles"));
  assert.ok(verbs.includes("analyze-lakota-frames"));
  assert.ok(verbs.includes("normalize-lakota-orthography"));
  assert.ok(verbs.includes("generate-lakota-paradigm"));
  assert.ok(verbs.includes("read-lakota-research-obligations"));
  assert.ok(verbs.includes("read-lakota-maturity"));
});

test("Lakota package exposes stable subpath interfaces", async () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const expectedExports = [
    "./actions",
    "./compiled",
    "./corpus",
    "./frames",
    "./manifest",
    "./maturity",
    "./obligations",
    "./orthography",
    "./paradigms",
    "./particles",
    "./raw-bundle",
  ];

  for (const subpath of expectedExports) {
    const entry = packageJson.exports[subpath];
    assert.equal(typeof entry?.import, "string", `${subpath} should expose an import target`);
    assert.equal(typeof entry?.types, "string", `${subpath} should expose a type target`);
    assert.ok(
      existsSync(new URL(`../${entry.import.slice(2)}`, import.meta.url)),
      `${subpath} import target should exist after build`,
    );
    assert.ok(
      existsSync(new URL(`../${entry.types.slice(2)}`, import.meta.url)),
      `${subpath} type target should exist after build`,
    );
    await import(`../${entry.import.slice(2)}`);
    await import(`${packageJson.name}${subpath.slice(1)}`);
  }
});
