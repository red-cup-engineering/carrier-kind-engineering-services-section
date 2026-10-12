/**
 * anomie - normlessness and strain priced as coordination currency.
 *
 * Durkheim's anomie is regulatory failure; Merton's strain is the mismatch between
 * valued goals and legitimate means. In this package both become computable gaps in a
 * jural/common-knowledge field: norms absent, norms contested, means missing, authority
 * unaccountable, or contradiction recuperated instead of organized.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { coordinationCurrency } from "./currency.mjs";
import { commonKnowledge } from "./epistemics.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const THEORY = Object.freeze({
  durkheim: "anomie is a failure of normative regulation, not mere disagreement",
  merton: "strain prices the gap between valued goals and institutionally available means",
  operaismo: "when social cooperation is commanded but means are withheld, the social factory issues debt",
  antiPsychiatry: "recuperated contradiction appears as individual maladjustment while remaining a field cost",
  noArbitrage: "an integrated field has no residual H1 coordination issue across these norm cells",
});

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function relationsOf(input) {
  if (input.relations !== undefined) return input.relations;
  if (input.governance !== undefined) return input.governance.relations;
  return Object.freeze([]);
}

function observersOf(relations, governance) {
  if (governance !== undefined) return governance.observers;
  return new Set(relations.flatMap((relation) => [relation.active, relation.passive])).size;
}

function anomieCells(input

) {
  return Object.freeze([
    Object.freeze({
      id: `anomie:${input.name}:normlessness`,
      source: "anomie",
      spreadH1: input.normless ? 1 : 0,
      noArbitrage: !input.normless,
      coherentConsensus: !input.normless,
    }),
    Object.freeze({
      id: `anomie:${input.name}:contested-norms`,
      source: "anomie",
      spreadH1: input.contestedNorms,
      noArbitrage: input.contestedNorms === 0,
      coherentConsensus: input.contestedNorms === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:goal-means-gap`,
      source: "anomie",
      spreadH1: input.goalMeansGap,
      noArbitrage: input.goalMeansGap === 0,
      coherentConsensus: input.goalMeansGap === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:accountability-gap`,
      source: "anomie",
      spreadH1: input.accountabilityGap,
      noArbitrage: input.accountabilityGap === 0,
      coherentConsensus: input.accountabilityGap === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:common-knowledge`,
      source: "anomie",
      spreadH1: input.commonKnowledge.attained ? 0 : 1,
      noArbitrage: input.commonKnowledge.attained,
      coherentConsensus: input.commonKnowledge.attained,
    }),
    Object.freeze({
      id: `anomie:${input.name}:closed-exit`,
      source: "anomie",
      spreadH1: input.exitOpen ? 0 : 1,
      noArbitrage: input.exitOpen,
      coherentConsensus: input.exitOpen,
    }),
    Object.freeze({
      id: `anomie:${input.name}:recuperation`,
      source: "anomie",
      spreadH1: input.recuperated ? 1 : 0,
      noArbitrage: !input.recuperated,
      coherentConsensus: !input.recuperated,
    }),
  ]);
}

export function anomie(input) {
  const name = input.name ?? "anomie";
  const relations = relationsOf(input);
  const observers = observersOf(relations, input.governance);
  const normClaims = relations.filter((relation) => relation.standing === "potential" || relation.standing === "stable").length;
  const normlessness = observers > 0 && normClaims === 0;
  const contestedNorms = relations.filter((relation) => relation.standing === "stable").length;
  const goalMeansGap = Math.max(0, (input.goals?.length ?? 0) - (input.means?.length ?? 0));
  const accountabilityGap = input.governance?.accountabilityGap ?? 0;
  const values = input.commonKnowledgeValues ?? relations.map((relation) => relation.standing);
  const ck = commonKnowledge(values, input.reliableChannel ?? true);
  const exitOpen = input.exitOpen ?? true;
  const recuperated = input.recuperated ?? false;
  const currency = coordinationCurrency(anomieCells({
    name,
    normless: normlessness,
    contestedNorms,
    goalMeansGap,
    accountabilityGap,
    commonKnowledge: ck,
    exitOpen,
    recuperated,
  }));
  const verdict = currency.issued === 0
    ? "integrated"
    : goalMeansGap > 0 && !normlessness
      ? "strained"
      : "anomic";
  return Object.freeze({
    kind: "socializing.anomie",
    name,
    observers,
    normClaims,
    normlessness,
    contestedNorms,
    goalMeansGap,
    accountabilityGap,
    commonKnowledge: ck,
    exitOpen,
    recuperated,
    verdict,
    currency,
    theory: THEORY,
  });
}

function readingNames(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`anomie: expected ${label} as reading names`);
  return Object.freeze(value);
}

function stringArray(value, label) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`anomie: expected ${label} as string[]`);
  }
  return Object.freeze([...value]);
}

function admitAnomieInput(value) {
  if (!isRecord(value)) throw new TypeError("anomie: expected an object input");
  const input

 = {};
  if (typeof value.name === "string") input.name = value.name;
  if (Array.isArray(value.relations)) input.relations = value.relations;
  if (isRecord(value.governance) && Array.isArray(value.governance.relations)) input.governance = value.governance;
  if (value.commonKnowledgeValues !== undefined) input.commonKnowledgeValues = readingNames(value.commonKnowledgeValues, "commonKnowledgeValues");
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  if (value.goals !== undefined) input.goals = stringArray(value.goals, "goals");
  if (value.means !== undefined) input.means = stringArray(value.means, "means");
  if (typeof value.exitOpen === "boolean") input.exitOpen = value.exitOpen;
  if (typeof value.recuperated === "boolean") input.recuperated = value.recuperated;
  return Object.freeze(input);
}

const ANOMIE_SCHEMA = Object.freeze({
  title: "Anomie",
  type: "object",
  description:
    "Normlessness and strain priced through coordination-currency: absent norms, contested norms, goal/means gaps, accountability gaps, common-knowledge failure, closed exit, and recuperation.",
});
const anomieInputCarrier = schemaFrom({
  $id: "socializing/anomie/input",
  type: "object",
  additionalProperties: true,
  title: "AnomieInput",
});
const anomieCarrier = schemaFrom({
  $id: "socializing/anomie",
  type: "object",
  required: ["kind"],
  properties: { kind: { const: "socializing.anomie" } },
  additionalProperties: true,
  title: ANOMIE_SCHEMA.title,
  description: ANOMIE_SCHEMA.description,
});

export const anomieAction = operation({
  verb: "anomie",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read anomie/strain and price the field's unresolved normative coordination work.",
  description:
    "Composes jural relations, optional governance, commonKnowledge, and Merton-style goals/means. Normlessness, contested norms, withheld means, unaccountable power, failed common knowledge, closed exit, and recuperation emit h1-coordination-credit cells.",
  domain: anomieInputCarrier,
  codomain: anomieCarrier,
  run: (input) =>
    jsonResource(anomie(admitAnomieInput(jsonResource(input, "anomie input"))), "anomie"),
});

export const anomieActions = Object.freeze([
  anomieAction,
]);
