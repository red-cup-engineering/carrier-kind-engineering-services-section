import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { witnessCorpus, holeConcepts, speak, comprehend, evaluateSaturation, evaluateSaturationAcrossSeeds } from "../../src/inference/speak.mjs";
import { collectExpectFeatures } from "../../src/inference/relconlang.mjs";
import { mulberry32 } from "../../src/inference/learn.mjs";

const readFour = (q) => q;

const CORPUS_DIR =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-language-systems-engineering-services-section/apps/relation-language-corpus/corpus";
const CORPUS_FILES = ["agency-samples.jsonl", "dialogue-samples.jsonl", "register-samples.jsonl"];

function readJsonl(path) {
  return readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

function agencyLines() {
  return readJsonl(`${CORPUS_DIR}/agency-samples.jsonl`);
}

// The kernel's real corpus path for RelConLang (as the deleted witnessed-field-machine-service
// organism read it): all three files, or a printed skip reason when the checkout lacks them.
function loadFullCorpus() {
  const missing = CORPUS_FILES.filter((f) => !existsSync(`${CORPUS_DIR}/${f}`));
  if (missing.length > 0) return { records: null, reason: `corpus files missing: ${missing.join(", ")} under ${CORPUS_DIR}` };
  return { records: CORPUS_FILES.flatMap((f) => readJsonl(`${CORPUS_DIR}/${f}`)), reason: null };
}

test("witness: saturation events fill charged hole fibers", () => {
  const model = witnessCorpus(agencyLines());
  assert.ok(model.predicates.size >= 3);
  const ran = model.predicates.get("ran");
  assert.ok(ran, "corpus predicate 'ran' not witnessed");
  assert.ok(ran.subjFiber.size >= 1 && ran.objFiber.size >= 1);
  console.log(`predicates=${model.predicates.size} cells=${model.cells.length} vocab=${model.vocabulary.size}`);
});

test("witness: a fiber is evidence-for saturation; the cell's charge comes from the stance particle", () => {
  const model = witnessCorpus(["tu ga nes do kelu.", "sha ni ga lin do tilo.", "mu sa ga mor do rama.", "ta mi ga ran do sava."]);
  assert.equal(readFour(model.predicates.get("nes").objFiber.get("kelu")), "potential");
  const charges = Object.fromEntries(model.cells.map((c) => [c.P, readFour(c.reading)]));
  assert.deepEqual(charges, { nes: "potential", lin: "stable", mor: "absurd", ran: "potential" });
});

test("witness: aspect suffix rides the cell as a feature, not a distinct predicate", () => {
  const model = witnessCorpus(["mi ga ran-en do kelu.", "mi ga ran do sava."]);
  assert.equal(model.predicates.size, 1, "ran-en must not fragment into a predicate distinct from ran");
  const ran = model.predicates.get("ran");
  assert.equal(ran.objFiber.size, 2);
  const aspects = new Set(model.cells.map((c) => c.aspect));
  assert.deepEqual(aspects, new Set([null, "aspect:process"]));
});

test("speak: novel, parseable, receipted saturations", () => {
  const model = witnessCorpus(agencyLines());
  const attested = new Set(agencyLines().map((l) => l.text.trim()));
  const rng = mulberry32(42);
  const out = [];
  for (let i = 0; i < 5; i++) out.push(speak(model, { T: 0.9, rng }));
  for (const s of out) {
    assert.equal(s.receipt.choices.length, 3);
    for (const c of s.receipt.choices) assert.ok(c.excludedMass >= 0 && c.excludedMass < 1);
    console.log(`${s.text}  ${attested.has(s.text) ? "(attested)" : "(novel)"}  excluded=[${s.receipt.choices.map((c) => c.excludedMass.toFixed(2)).join(",")}]`);
  }
  assert.ok(out.some((s) => !attested.has(s.text)), "no novel sentence in 5 draws");
});

test("comprehend: an unsaturated predicate returns typed questions, not guesses", () => {
  const model = witnessCorpus(agencyLines());
  const out = comprehend(model, "ran.");
  assert.equal(out.cell, null);
  assert.ok(out.questions.some((q) => q.kind === "unsaturated" && q.hole === "subject"));
  assert.ok(out.questions.some((q) => q.kind === "unsaturated" && q.hole === "object"));
  const full = comprehend(model, "mi ga ran do kelu.");
  assert.deepEqual(full.cell, { s: "mi", P: "ran", o: "kelu" });
  assert.equal(full.questions.length, 0);
});

test("comprehend: a fully unparseable line returns an unparsed question", () => {
  const model = witnessCorpus(agencyLines());
  const out = comprehend(model, "xyz abc.");
  assert.equal(out.cell, null);
  assert.deepEqual(out.questions, [{ kind: "unparsed", text: "xyz abc." }]);
});

test("concept mates exist for sparse holes, via metrologic's formal-context own Galois intent/extent", () => {
  const model = witnessCorpus(agencyLines());
  const concepts = holeConcepts(model);
  let mated = 0;
  for (const mates of concepts.conceptMates.values()) if (mates.size > 0) mated++;
  console.log(`arguments with concept-mates: ${mated}/${concepts.conceptMates.size}`);
  assert.ok(mated > 0);
});

test("gate: held-out object saturation, distinct facts, same-pool baseline/fiber/closure, 5 seeds — every number reported, win or not", () => {
  const { records, reason } = loadFullCorpus();
  if (!records) { console.log(`skipped: ${reason}`); return; }

  const featuresByWord = collectExpectFeatures(records);
  const report = evaluateSaturationAcrossSeeds(records, { seeds: 5, featuresByWord });

  console.log(`distinct (s,P,o) facts: ${report.perSeed[0].distinctFacts}`);
  console.log("seed | n | baseline | fiber | closure | closureFired");
  for (const r of report.perSeed) {
    console.log(`${r.seed} | ${r.n} | ${r.baselineHits}/${r.n} | ${r.fiberHits}/${r.n} | ${r.closureHits}/${r.n} | ${r.closureFired}`);
  }
  console.log(`mean n=${report.meanN.toFixed(1)} baseline=${report.meanBaselineHits.toFixed(2)} fiber=${report.meanFiberHits.toFixed(2)} closure=${report.meanClosureHits.toFixed(2)}`);

  assert.equal(report.seeds, 5);
  for (const r of report.perSeed) {
    assert.ok(r.n > 0);
    assert.ok(r.baselineHits >= 0 && r.baselineHits <= r.n);
    assert.ok(r.fiberHits >= 0 && r.fiberHits <= r.n);
    assert.ok(r.closureHits >= 0 && r.closureHits <= r.n);
  }
  // Reproducibility under a fixed seed, no hidden randomness.
  const again = evaluateSaturation(records, { seed: report.perSeed[0].seed, featuresByWord });
  assert.deepEqual(again, report.perSeed[0]);
});
