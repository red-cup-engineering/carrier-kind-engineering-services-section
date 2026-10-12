// evaluate-relconlang.mjs — CLI over src/speak.mjs's evaluateSaturationAcrossSeeds: loads the
// RelConLang corpus (agency + dialogue + register JSONL), collects expect.features, and prints
// the honest per-seed and mean held-out numbers (baseline vs fiber vs closure-with-features) on
// the SAME candidate pool per case. All evaluation logic stays in src/speak.mjs.

import { readFileSync, existsSync } from "node:fs";
import { collectExpectFeatures } from "@red-cup-engineering/signcraft/inference/relconlang";
import { evaluateSaturationAcrossSeeds } from "@red-cup-engineering/signcraft/inference/speak";

const CORPUS_DIR =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/communication-science-services-section/services/linguistics-services-section/lib/legacy/2026-07-02-communicating-in-relation-conlang/corpus";
const FILES = ["agency-samples.jsonl", "dialogue-samples.jsonl", "register-samples.jsonl"];

function loadRecords(log) {
  const records = [];
  for (const file of FILES) {
    const path = `${CORPUS_DIR}/${file}`;
    if (!existsSync(path)) {
      log(`skipping ${file}: not found at ${path}`);
      continue;
    }
    for (const line of readFileSync(path, "utf8").trim().split("\n")) records.push(JSON.parse(line));
  }
  return records;
}

/** The runnable declaration: prints the per-seed and mean held-out numbers on standard output. */
export const command = Object.freeze({
  run({ stdout }) {
    const log = (line) => stdout.write(`${line}\n`);
    const records = loadRecords(log);
    if (records.length === 0) {
      log("no RelConLang corpus records found; nothing to evaluate.");
      return;
    }

    const featuresByWord = collectExpectFeatures(records);
    const report = evaluateSaturationAcrossSeeds(records, { seeds: 5, featuresByWord });

    log(`distinct (s,P,o) facts (deduplicated): ${report.perSeed[0].distinctFacts}`);
    log("seed | n | baseline | fiber | closure | closureFired");
    for (const r of report.perSeed) {
      log(`${r.seed}    | ${r.n} | ${r.baselineHits}/${r.n}    | ${r.fiberHits}/${r.n}   | ${r.closureHits}/${r.n}    | ${r.closureFired}`);
    }
    log(`mean n=${report.meanN.toFixed(1)} baseline=${report.meanBaselineHits.toFixed(2)} fiber=${report.meanFiberHits.toFixed(2)} closure=${report.meanClosureHits.toFixed(2)}`);
  },
});
