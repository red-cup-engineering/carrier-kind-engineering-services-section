import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readFileSync } from "node:fs";

import { jsonResource } from "@red-cup-engineering/json-services-section";

const corpusUrl = new URL("../data/corpus.jsonl", import.meta.url);

function parseCorpus() {
  const text = readFileSync(corpusUrl, "utf8").trim();
  if (text === "") return Object.freeze([]);
  return Object.freeze(text.split(/\r?\n/u).map((line) =>
    Object.freeze(JSON.parse(line))));
}

function hasAll(candidate, expected) {
  return expected.every((feature) => candidate.includes(feature));
}

function generationOf(entry) {
  const generation = entry.expect.generation;
  if (generation === undefined) return null;
  return Object.freeze({
    surface: generation.surface,
    root: generation.root,
    features: generation.features,
    source: entry.source,
    corpusEntry: entry.id,
  });
}

export const corpus = parseCorpus();

export function generateLakotaForm(input) {
  const requestedFeatures = input.features ?? [];
  const candidates = corpus
    .map(generationOf)
    .filter((candidate) => candidate !== null)
    .filter((candidate) => input.root === undefined || candidate.root === input.root)
    .filter((candidate) => input.template === undefined || candidate.features.includes(`template:${input.template}`))
    .filter((candidate) => hasAll(candidate.features, requestedFeatures));

  return Object.freeze({
    kind: "communicating-in-lakota.generation",
    query: Object.freeze({
      ...(input.root === undefined ? {} : { root: input.root }),
      ...(input.features === undefined ? {} : { features: [...input.features] }),
      ...(input.template === undefined ? {} : { template: input.template }),
    }),
    candidates: Object.freeze(candidates),
  });
}

function asGenerationRequest(input) {
  if (typeof input !== "object" || input === null) return {};
  const record = input;
  const features = Array.isArray(record["features"])
    ? record["features"].filter((feature) => typeof feature === "string")
    : undefined;
  return Object.freeze({
    ...(typeof record["root"] === "string" ? { root: record["root"] } : {}),
    ...(features === undefined ? {} : { features }),
    ...(typeof record["template"] === "string" ? { template: record["template"] } : {}),
  });
}

export const readLakotaCorpusAction = operation({
  verb: "read-lakota-corpus",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the witnessed Lakota computational corpus.",
  description: "Domain: ignored JSON input. Codomain: package-local witnessed forms with expected parse features and finite generation targets.",
  run: () => jsonResource(corpus, "Lakota corpus"),
});

export const generateLakotaFormAction = operation({
  verb: "generate-lakota-form",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Generate finite witnessed Lakota forms from root and feature constraints.",
  description: "Domain: JSON with optional root, template, and features. Codomain: matching package-local corpus forms; this is finite corpus readback, not a full Lakota generator.",
  run: (input) =>
    jsonResource(generateLakotaForm(asGenerationRequest(input)), "Lakota generated form candidates"),
});
