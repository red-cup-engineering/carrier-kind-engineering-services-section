#!/usr/bin/env node
// evaluate-relconlang.mjs — CLI over src/speak.mjs's evaluateSaturationAcrossSeeds: loads the
// RelConLang corpus (agency + dialogue + register JSONL), collects expect.features, and prints
// the honest per-seed and mean held-out numbers (baseline vs fiber vs closure-with-features) on
// the SAME candidate pool per case. All evaluation logic stays in src/speak.mjs.

import { readFileSync, existsSync } from "node:fs";
import { collectExpectFeatures } from "../../../../lib/signstuff/signcraft/src/inference/relconlang.mjs";
import { evaluateSaturationAcrossSeeds } from "../../../../lib/signstuff/signcraft/src/inference/speak.mjs";

const CORPUS_DIR =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/communication-science-services-section/services/linguistics-services-section/lib/legacy/2026-07-02-communicating-in-relation-conlang/corpus";
const FILES = ["agency-samples.jsonl", "dialogue-samples.jsonl", "register-samples.jsonl"];

function loadRecords() {
  const records = [];
  for (const file of FILES) {
    const path = `${CORPUS_DIR}/${file}`;
    if (!existsSync(path)) {
      console.log(`skipping ${file}: not found at ${path}`);
      continue;
    }
    for (const line of readFileSync(path, "utf8").trim().split("\n")) records.push(JSON.parse(line));
  }
  return records;
}

const records = loadRecords();
if (records.length === 0) {
  console.log("no RelConLang corpus records found; nothing to evaluate.");
  process.exit(0);
}

const featuresByWord = collectExpectFeatures(records);
const report = evaluateSaturationAcrossSeeds(records, { seeds: 5, featuresByWord });

console.log(`distinct (s,P,o) facts (deduplicated): ${report.perSeed[0].distinctFacts}`);
console.log("seed | n | baseline | fiber | closure | closureFired");
for (const r of report.perSeed) {
  console.log(`${r.seed}    | ${r.n} | ${r.baselineHits}/${r.n}    | ${r.fiberHits}/${r.n}   | ${r.closureHits}/${r.n}    | ${r.closureFired}`);
}
console.log(`mean n=${report.meanN.toFixed(1)} baseline=${report.meanBaselineHits.toFixed(2)} fiber=${report.meanFiberHits.toFixed(2)} closure=${report.meanClosureHits.toFixed(2)}`);
