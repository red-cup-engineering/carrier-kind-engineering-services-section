/**
 * Action projections for the researching spine.
 *
 * The executable morphisms live in the nested researching modules. These actions
 * only admit a memory carrier at the wire and project the real codomain carriers
 * to bounded JSON-safe forms.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { curriculumProjectionCarrier, learningProjectionCarrier, researchProjectionCarrier } from "../projecting/schemas.mjs";
import { projectCurriculum, projectLearning, projectResearch } from "../projecting/projecting.mjs";
import { introducing } from "./introducing/introducing.mjs";
import { studying } from "./introducing/studying/studying.mjs";
import { learning } from "./introducing/studying/learning/learning.mjs";
import { teaching } from "./introducing/studying/learning/teaching/teaching.mjs";
import { certified, research } from "./researching.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const memoryCarrier = schemaFrom({
  $id: "knowing/memory",
  title: "MemoryCarrier",
  description: "The settled body of knowing memory admitted by researching projections.",
  type: "object",
  required: ["kind", "root", "documents"],
  properties: {
    kind: { const: "knowing.memory" },
    root: { type: "string" },
    documents: { type: "array" },
    utterances: { type: "array" },
  },
  additionalProperties: true,
});

function admitMemory(input, verb) {
  const value = jsonResource(input, `${verb} memory`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected a knowing.memory carrier`);
  }
  const record = value;
  if (record["kind"] !== "knowing.memory") throw new TypeError(`${verb}: expected kind "knowing.memory"`);
  if (typeof record["root"] !== "string") throw new TypeError(`${verb}: memory.root must be a string`);
  if (!Array.isArray(record["documents"])) throw new TypeError(`${verb}: memory.documents must be an array`);
  return record;
}

function settledResearch(input, verb) {
  const settled = research(admitMemory(input, verb));
  if (settled === null) throw new TypeError(`${verb}: no memory documents to research`);
  return settled;
}

export const researchAction = operation({
  verb: "research",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory into its settled topology and certification judgment.",
  description: "Domain: knowing.memory. Codomain: the projected SettledResearch carrier: closure regime, on-shell judgment, certification, and stage count.",
  domain: memoryCarrier,
  codomain: researchProjectionCarrier,
  run: (input) => {
    const settled = settledResearch(input, "research");
    return jsonResource(projectResearch(settled, certified(settled)), "research projection");
  },
});

export const learningAction = operation({
  verb: "learning",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory and project the learning lessons its trace yields.",
  description: "Domain: knowing.memory. Codomain: the projected learning carrier induced by research -> introducing -> studying -> learning.",
  domain: memoryCarrier,
  codomain: learningProjectionCarrier,
  run: (input) => {
    const settled = settledResearch(input, "learning");
    return jsonResource(projectLearning(learning(studying(introducing(settled)))), "learning projection");
  },
});

export const curriculumAction = operation({
  verb: "curriculum",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory and project its curriculum.",
  description: "Domain: knowing.memory. Codomain: the projected curriculum carrier induced by research -> introducing -> studying -> learning -> teaching.",
  domain: memoryCarrier,
  codomain: curriculumProjectionCarrier,
  run: (input) => {
    const settled = settledResearch(input, "curriculum");
    return jsonResource(projectCurriculum(teaching(learning(studying(introducing(settled))))), "curriculum projection");
  },
});

export const researchActions = Object.freeze([
  researchAction,
  learningAction,
  curriculumAction,
]);
