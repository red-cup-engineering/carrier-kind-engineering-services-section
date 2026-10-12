
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { corpus } from "./corpus.mjs";
import { lakotaOrthographyRules } from "./orthography.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

function featureValue(features, prefix) {
  const found = features.find((feature) => feature.startsWith(prefix));
  return found === undefined ? null : found.slice(prefix.length);
}

function variantsFor(surface) {
  const rule = lakotaOrthographyRules.find((candidate) => candidate.normalized === surface);
  return Object.freeze(rule?.variants ?? [surface]);
}

function cellFromCorpusEntry(entry) {
  const generation = entry.expect.generation;
  if (generation === undefined) return null;
  return Object.freeze({
    surface: generation.surface,
    normalizedSurface: generation.surface,
    variants: variantsFor(generation.surface),
    root: generation.root,
    template: featureValue(generation.features, "template:"),
    agreement: featureValue(generation.features, "agreement:"),
    features: generation.features,
    corpusEntry: entry.id,
    maturity: entry.maturity,
    source: entry.source,
  });
}

function asParadigmRequest(input) {
  if (typeof input !== "object" || input === null) return {};
  const record = input;
  return Object.freeze({
    ...(typeof record["root"] === "string" ? { root: record["root"] } : {}),
  });
}

export function generateLakotaParadigms(input = {}) {
  const cells = corpus
    .map(cellFromCorpusEntry)
    .filter((cell) => cell !== null)
    .filter((cell) => input.root === undefined || cell.root === input.root);

  const byRoot = new Map();
  for (const cell of cells) {
    const bucket = byRoot.get(cell.root) ?? [];
    bucket.push(cell);
    byRoot.set(cell.root, bucket);
  }

  const paradigms = [...byRoot.entries()].map(([root, rootCells]) => Object.freeze({
    root,
    cells: Object.freeze(rootCells),
    certainty: "witnessed-finite",
  }));

  return Object.freeze({
    kind: "communicating-in-lakota.paradigms",
    query: Object.freeze({
      ...(input.root === undefined ? {} : { root: input.root }),
    }),
    paradigms: Object.freeze(paradigms),
  });
}

export const generateLakotaParadigmAction = operation({
  verb: "generate-lakota-paradigm",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Generate finite witnessed Lakota verb paradigms.",
  description: "Domain: JSON with optional root. Codomain: corpus-backed finite paradigm cells with variant-preserving surfaces; this is witnessed paradigm readback, not productive conjugation.",
  run: (input) =>
    jsonResource(generateLakotaParadigms(asParadigmRequest(input)), "Lakota witnessed paradigms"),
});
