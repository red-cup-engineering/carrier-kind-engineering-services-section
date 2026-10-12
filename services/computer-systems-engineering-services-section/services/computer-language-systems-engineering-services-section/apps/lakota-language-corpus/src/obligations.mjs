import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readFileSync } from "node:fs";

import { jsonResource } from "@red-cup-engineering/json-services-section";

const obligationsUrl = new URL("../data/research-obligations.json", import.meta.url);

function parseObligations() {
  return Object.freeze(JSON.parse(readFileSync(obligationsUrl, "utf8")));
}

export const lakotaResearchObligations = parseObligations();

export function readLakotaResearchObligations() {
  return Object.freeze({
    kind: "communicating-in-lakota.research-obligations",
    maturityTags: Object.freeze(["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"]),
    obligations: lakotaResearchObligations,
  });
}

export const readLakotaResearchObligationsAction = operation({
  verb: "read-lakota-research-obligations",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read remaining computational Lakota research obligations.",
  description: "Domain: ignored JSON input. Codomain: package-local obligations with maturity tags, current evidence, and upgrade evidence.",
  run: () =>
    jsonResource(readLakotaResearchObligations(), "Lakota research obligations"),
});
