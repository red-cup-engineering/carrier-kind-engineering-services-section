/**
 * boundary-work - classification, translation, and policing priced as coordination cost.
 *
 * Boundary-work is the labor of saying who counts, who does not, and which crossings
 * are possible. The reading combines socializing's observer-category translations with
 * Hohfeldian jural relations: a boundary can be legible, porous, exclusionary, contested,
 * or policed. The anarchist/autonomist pressure is to keep exodus/refusal visible as a
 * priced relation rather than naturalizing the border.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { coordinationCurrency } from "./currency.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const THEORY = Object.freeze({
  gieryn: "boundary-work is the labor of demarcating a legitimate inside from an outside",
  barth: "boundaries persist through regulated crossings, not through cultural essence",
  douglas: "pollution and purity name classification pressure at the boundary",
  exodus: "refusal and flight are boundary-making capacities, not merely failures to belong",
  noBorders: "policed exclusion is priced as coordination debt rather than treated as natural order",
});

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const uniqueSorted = (values) =>
  Object.freeze([...new Set(values)].sort());

function fieldAgents(field) {
  if (field === undefined) return Object.freeze([]);
  return Object.freeze(field.members.map((member, index) => {
    const identity = member.agent.identity;
    if (typeof identity === "string" && identity !== "") return identity;
    const name = member.agent.name;
    if (typeof name === "string" && name !== "") return name;
    return `observer:${index}`;
  }));
}

function relationAgents(relations) {
  return Object.freeze([...new Set(relations.flatMap((relation) => [relation.active, relation.passive]))]);
}

function crossesBoundary(relation, insiders, outsiders) {
  return (insiders.has(relation.active) && outsiders.has(relation.passive))
    || (outsiders.has(relation.active) && insiders.has(relation.passive));
}

function policingKind(kind) {
  return kind === "power" || kind === "liability" || kind === "no-right" || kind === "disability";
}

function crossTranslations(field, insiders, outsiders, names) {
  if (field === undefined) return 0;
  let count = 0;
  for (const translation of field.base.translations) {
    const source = names[translation.source];
    const target = names[translation.target];
    if (source === undefined || target === undefined) continue;
    if ((insiders.has(source) && outsiders.has(target)) || (outsiders.has(source) && insiders.has(target))) count += 1;
  }
  return count;
}

function boundaryCells(input

) {
  return Object.freeze([
    Object.freeze({
      id: `boundary-work:${input.name}:classification-gap`,
      source: "boundary-work",
      spreadH1: input.ambiguous,
      noArbitrage: input.ambiguous === 0,
      coherentConsensus: input.ambiguous === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:translation-gap`,
      source: "boundary-work",
      spreadH1: input.missingCrossings,
      noArbitrage: input.missingCrossings === 0,
      coherentConsensus: input.missingCrossings === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:contested-boundary`,
      source: "boundary-work",
      spreadH1: input.contested,
      noArbitrage: input.contested === 0,
      coherentConsensus: input.contested === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:policing`,
      source: "boundary-work",
      spreadH1: input.policing,
      noArbitrage: input.policing === 0,
      coherentConsensus: input.policing === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:subaltern-exclusion`,
      source: "boundary-work",
      spreadH1: input.subalternExcluded,
      noArbitrage: input.subalternExcluded === 0,
      coherentConsensus: input.subalternExcluded === 0,
    }),
  ]);
}

export function boundaryWork(input) {
  const name = input.name ?? "boundary";
  const criterion = input.criterion ?? "";
  const insiders = uniqueSorted(input.insiders);
  const outsiders = uniqueSorted(input.outsiders);
  const inside = new Set(insiders);
  const outside = new Set(outsiders);
  const relations = input.relations ?? Object.freeze([]);
  const agents = uniqueSorted([...fieldAgents(input.field), ...relationAgents(relations)]);
  const ambiguousAgents = Object.freeze(agents.filter((agent) => !inside.has(agent) && !outside.has(agent)));
  const names = fieldAgents(input.field);
  const crossBoundaryTranslations = crossTranslations(input.field, inside, outside, names);
  const possibleCrossings = input.field === undefined ? 0 : 2 * insiders.length * outsiders.length;
  const missingCrossBoundaryTranslations = Math.max(0, possibleCrossings - crossBoundaryTranslations);
  const boundaryRelations = relations.filter((relation) => crossesBoundary(relation, inside, outside));
  const contestedBoundaryRelations = boundaryRelations.filter((relation) => relation.standing === "stable").length;
  const policingRelations = boundaryRelations.filter((relation) =>
    policingKind(relation.kind) && (relation.standing === "potential" || relation.standing === "stable")).length;
  const subaltern = new Set(input.subalternAgents ?? []);
  const subalternExcluded = outsiders.filter((agent) => subaltern.has(agent)).length;
  const currency = coordinationCurrency(boundaryCells({
    name,
    ambiguous: ambiguousAgents.length,
    missingCrossings: missingCrossBoundaryTranslations,
    contested: contestedBoundaryRelations,
    policing: policingRelations,
    subalternExcluded,
  }));
  return Object.freeze({
    kind: "socializing.boundary-work",
    name,
    criterion,
    insiders,
    outsiders,
    ambiguousAgents,
    crossBoundaryTranslations,
    missingCrossBoundaryTranslations,
    policingRelations,
    contestedBoundaryRelations,
    subalternExcluded,
    legible: ambiguousAgents.length === 0 && criterion !== "",
    porous: crossBoundaryTranslations > 0 && missingCrossBoundaryTranslations === 0,
    exclusionary: policingRelations > 0 || subalternExcluded > 0,
    currency,
    theory: THEORY,
  });
}

function stringArray(value, label) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`boundary-work: expected ${label} as string[]`);
  }
  return Object.freeze([...value]);
}

function admitBoundaryWorkInput(value) {
  if (!isRecord(value)) throw new TypeError("boundary-work: expected an object input");
  const input

 = {
    insiders: stringArray(value.insiders, "insiders"),
    outsiders: stringArray(value.outsiders, "outsiders"),
  };
  if (typeof value.name === "string") input.name = value.name;
  if (isRecord(value.field) && Array.isArray(value.field.members)) input.field = value.field;
  if (Array.isArray(value.relations)) input.relations = value.relations;
  if (typeof value.criterion === "string") input.criterion = value.criterion;
  if (value.subalternAgents !== undefined) input.subalternAgents = stringArray(value.subalternAgents, "subalternAgents");
  return Object.freeze(input);
}

const BOUNDARY_WORK_SCHEMA = Object.freeze({
  title: "BoundaryWork",
  type: "object",
  description:
    "Boundary legibility, porosity, policing, contested classification, and subaltern exclusion priced through coordination-currency.",
});
const boundaryWorkInputCarrier = schemaFrom({
  $id: "socializing/boundary-work/input",
  type: "object",
  required: ["insiders", "outsiders"],
  properties: {
    insiders: { type: "array", items: { type: "string" } },
    outsiders: { type: "array", items: { type: "string" } },
  },
  additionalProperties: true,
  title: "BoundaryWorkInput",
});
const boundaryWorkCarrier = schemaFrom({
  $id: "socializing/boundary-work",
  type: "object",
  required: ["kind"],
  properties: { kind: { const: "socializing.boundary-work" } },
  additionalProperties: true,
  title: BOUNDARY_WORK_SCHEMA.title,
  description: BOUNDARY_WORK_SCHEMA.description,
});

export const boundaryWorkAction = operation({
  verb: "boundary-work",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read boundary formation and price classification, crossing, policing, and exclusion costs.",
  description:
    "Composes social-field translations and Hohfeldian boundary relations. Ambiguous classification, missing crossings, contested boundary cells, policing relations, and subaltern exclusion emit h1-coordination-credit cells.",
  domain: boundaryWorkInputCarrier,
  codomain: boundaryWorkCarrier,
  run: (input) =>
    jsonResource(boundaryWork(admitBoundaryWorkInput(jsonResource(input, "boundary-work input"))), "boundary-work"),
});

export const boundaryWorkActions = Object.freeze([
  boundaryWorkAction,
]);
