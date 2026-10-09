// Thin CLI over src/evaluate.mjs: reads one incidence corpus (stdin or a
// file argument), runs masked-incidence evaluation once per requested seed
// with a deterministic RNG, and prints held-out numbers per seed. All
// evaluation logic stays in src/evaluate.mjs.

import { jsonCommand } from "./json-command.mjs";
import { maskedIncidenceEval } from "@red-cup-engineering/signcraft/inference/evaluate";
import { mulberry32 } from "@red-cup-engineering/signcraft/inference/learn";

const HELP = `Usage: evaluate-corpus.mjs [corpus.json] [--seeds n]

Reads {objects, attributes, pairs, maskFrac?} as JSON from the given file,
or from stdin when no file is given, and prints masked-incidence held-out
numbers for each of n deterministic seeds (mulberry32(0)..mulberry32(n-1))
as JSON on stdout.

  objects      object ids (required)
  attributes   the attribute universe (required)
  pairs        [[object, attribute], ...] witnessed incidence (required)
  maskFrac     fraction of pairs held out per seed (default 0.2)
  --seeds n    number of seeds to evaluate (default 1)

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h   print this text and exit
`;

/**
 * Validates and normalizes one evaluate-corpus input.
 * @param {unknown} input the parsed JSON input
 * @returns {{objects: string[], attributes: string[], pairs: Array<[string,string]>, maskFrac?: number}}
 * @throws {Error} with `.code = "malformed-input"` when the shape is wrong
 */
export function evaluateCorpusRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { objects, attributes, pairs, maskFrac } = input;
  if (!Array.isArray(objects) || !Array.isArray(attributes) || !Array.isArray(pairs)) {
    throwMalformed("input requires objects, attributes, and pairs arrays");
  }
  return { objects, attributes, pairs, maskFrac };
}

/**
 * Runs maskedIncidenceEval once per seed in [0, seeds), each with its own
 * mulberry32 RNG, so a caller gets a reproducible held-out-accuracy
 * distribution instead of one noisy sample.
 * @param {unknown} input the parsed JSON input
 * @param {number} [seeds] number of seeds to run (default 1)
 * @returns {{seeds: number, perSeed: object[], meanKernelAccuracy: number, meanBaselineAccuracy: number}}
 * @throws {Error} with `.code = "malformed-input"` when the shape or seed count is wrong
 */
export function evaluateCorpusAcrossSeeds(input, seeds = 1) {
  if (!Number.isInteger(seeds) || seeds < 1) throwMalformed("--seeds must be a positive integer");
  const request = evaluateCorpusRequest(input);
  const perSeed = [];
  for (let seed = 0; seed < seeds; seed++) {
    const rng = mulberry32(seed);
    const opts = request.maskFrac === undefined ? { rng } : { rng, maskFrac: request.maskFrac };
    const run = maskedIncidenceEval(request.objects, request.attributes, request.pairs, opts);
    perSeed.push({
      seed,
      maskedCount: run.maskedCount,
      keptCount: run.keptCount,
      kernelHits: run.kernelHits,
      baselineHits: run.baselineHits,
      kernelAccuracy: run.kernelAccuracy,
      baselineAccuracy: run.baselineAccuracy,
    });
  }
  const mean = (key) => perSeed.reduce((sum, row) => sum + row[key], 0) / perSeed.length;
  return { seeds, perSeed, meanKernelAccuracy: mean("kernelAccuracy"), meanBaselineAccuracy: mean("baselineAccuracy") };
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}


function parseArgs(args) {
  const rest = [...args];
  const seedsIdx = rest.indexOf("--seeds");
  let seeds = 1;
  if (seedsIdx >= 0) {
    seeds = Number(rest[seedsIdx + 1]);
    rest.splice(seedsIdx, 2);
  }
  return { seeds, path: rest.find((a) => !a.startsWith("-")) };
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "evaluation-error", execute: (input, parsed) => evaluateCorpusAcrossSeeds(input, parsed.seeds), parseArgs: (argv) => parseArgs(argv) });
