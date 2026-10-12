import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readFileSync } from "node:fs";


import { lakotaResearchObligations } from "./obligations.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const maturityUrl = new URL("../data/maturity.json", import.meta.url);

function parseMaturity() {
  return Object.freeze(JSON.parse(readFileSync(maturityUrl, "utf8")));
}

export const lakotaMaturityData = parseMaturity();

export function readLakotaMaturity() {
  return Object.freeze({
    ...lakotaMaturityData,
    maturityTags: Object.freeze(["Built+green", "Proven-in-Lean", "Research-grade", "Roadmap"]),
    roadmapObligations: Object.freeze(lakotaResearchObligations.map((obligation) => obligation.id)),
  });
}

export const readLakotaMaturityAction = operation({
  verb: "read-lakota-maturity",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the maturity-graded computational Lakota capability report.",
  description: "Domain: ignored JSON input. Codomain: Built+green, Research-grade, Proven-in-Lean, and Roadmap status for package-local Lakota capabilities.",
  run: () => jsonResource(readLakotaMaturity(), "Lakota maturity report"),
});
