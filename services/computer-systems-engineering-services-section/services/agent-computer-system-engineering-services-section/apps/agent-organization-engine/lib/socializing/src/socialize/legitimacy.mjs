/**
 * legitimacy - recognized authority priced as coordination currency.
 *
 * Legitimacy is not mere power. It requires a basis of authority, common knowledge of
 * the claim, accountability for powers, and an absence of symbolic violence. This bridge
 * composes Weber's authority bases, Bourdieu's misrecognition, and the Hohfeldian
 * accountability rule into one priced receipt.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { capitalConcentration, symbolicViolence } from "./bourdieu.mjs";
import { coordinationCurrency } from "./currency.mjs";
import { routinize } from "./deciding.mjs";
import { commonKnowledge } from "./epistemics.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const THEORY = Object.freeze({
  weber: "authority becomes legitimate through traditional, charismatic, or rational-legal recognition",
  routinization: "charisma carries an instability cost until it settles into a durable basis",
  bourdieu: "misrecognized domination is symbolic violence, not legitimacy",
  marxist: "legitimacy resting on concentrated symbolic capital is a command relation with a price",
  autonomist: "accountable authority must remain refusible; otherwise legitimacy becomes capture",
});

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function relationsOf(input) {
  if (input.relations !== undefined) return input.relations;
  if (input.governance !== undefined) return input.governance.relations;
  return Object.freeze([]);
}

function claimantAccountabilityGap(relations, claimant, governance) {
  if (governance !== undefined) {
    return relations.filter((relation) =>
      relation.kind === "power"
      && relation.active === claimant
      && (relation.standing === "potential" || relation.standing === "stable"))
      .filter(() => !relations.some((relation) =>
        relation.kind === "duty"
        && relation.active === claimant
        && (relation.standing === "potential" || relation.standing === "stable"))).length;
  }
  const accountable = relations.some((relation) =>
    relation.kind === "duty"
    && relation.active === claimant
    && (relation.standing === "potential" || relation.standing === "stable"));
  return accountable ? 0 : relations.filter((relation) =>
    relation.kind === "power"
    && relation.active === claimant
    && (relation.standing === "potential" || relation.standing === "stable")).length;
}

function authoritySymbolicViolence(relations, claimant, scope) {
  const candidates = new Set();
  for (const relation of relations) {
    if (relation.scope !== scope) continue;
    if (relation.kind === "power" && relation.active === claimant) candidates.add(relation.passive);
    if (relation.kind === "duty" && relation.passive === claimant) candidates.add(relation.active);
  }
  for (const agent of candidates) {
    const violence = symbolicViolence(relations, agent, scope);
    if (violence.symbolicViolence) return violence;
  }
  return symbolicViolence(relations, claimant, scope);
}

function legitimacyCells(input

) {
  return Object.freeze([
    Object.freeze({
      id: `legitimate:${input.name}:common-knowledge`,
      source: "legitimate",
      spreadH1: input.commonKnowledge.attained ? 0 : 1,
      noArbitrage: input.commonKnowledge.attained,
      coherentConsensus: input.commonKnowledge.attained,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:symbolic-violence`,
      source: "legitimate",
      spreadH1: input.symbolicViolence.symbolicViolence ? 1 : 0,
      noArbitrage: !input.symbolicViolence.symbolicViolence,
      coherentConsensus: !input.symbolicViolence.symbolicViolence,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:accountability-gap`,
      source: "legitimate",
      spreadH1: input.accountabilityGap,
      noArbitrage: input.accountabilityGap === 0,
      coherentConsensus: input.accountabilityGap === 0,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:charismatic-instability`,
      source: "legitimate",
      spreadH1: input.charismaticInstability ? 1 : 0,
      noArbitrage: !input.charismaticInstability,
      coherentConsensus: !input.charismaticInstability,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:symbolic-monopoly`,
      source: "legitimate",
      spreadH1: input.symbolicMonopoly ? 1 : 0,
      noArbitrage: !input.symbolicMonopoly,
      coherentConsensus: !input.symbolicMonopoly,
    }),
  ]);
}

export function legitimate(input) {
  const name = input.name ?? "legitimacy";
  const relations = relationsOf(input);
  const basis = input.basis ?? "rational-legal";
  const routinizedBasis = routinize(basis, input.routinizeToward ?? "rational-legal");
  const values = input.commonKnowledgeValues ?? relations
    .filter((relation) => relation.scope === input.scope)
    .map((relation) => relation.standing);
  const ck = commonKnowledge(values, input.reliableChannel ?? true);
  const violence = authoritySymbolicViolence(relations, input.claimant, input.scope);
  const symbolic = input.holders === undefined || input.holders.length === 0
    ? null
    : capitalConcentration(input.holders, "symbolic");
  const symbolicTopHolder = symbolic?.topHolder ?? "";
  const symbolicTopShare = symbolic?.topShare ?? 0;
  const symbolicMonopoly = symbolicTopHolder === input.claimant && symbolicTopShare > 0.5;
  const accountabilityGap = claimantAccountabilityGap(relations, input.claimant, input.governance);
  const charismaticInstability = basis === "charismatic";
  const currency = coordinationCurrency(legitimacyCells({
    name,
    commonKnowledge: ck,
    symbolicViolence: violence,
    accountabilityGap,
    charismaticInstability,
    symbolicMonopoly,
  }));
  const legitimateValue = ck.attained && !violence.symbolicViolence && accountabilityGap === 0 && !charismaticInstability && !symbolicMonopoly;
  return Object.freeze({
    kind: "socializing.legitimacy",
    name,
    claimant: input.claimant,
    scope: input.scope,
    basis,
    routinizedBasis,
    commonKnowledge: ck,
    symbolicViolence: violence,
    symbolicTopHolder,
    symbolicTopShare,
    accountabilityGap,
    charismaticInstability,
    symbolicMonopoly,
    legitimate: legitimateValue,
    legitimacyCrisis: !legitimateValue,
    currency,
    theory: THEORY,
  });
}

function readingNames(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`legitimate: expected ${label} as reading names`);
  return Object.freeze(value);
}

function admitLegitimacyInput(value) {
  if (!isRecord(value) || typeof value.claimant !== "string" || typeof value.scope !== "string") {
    throw new TypeError("legitimate: expected { claimant, scope, relations?, governance?, basis?, holders? }");
  }
  const input

 = {
    claimant: value.claimant,
    scope: value.scope,
  };
  if (typeof value.name === "string") input.name = value.name;
  if (Array.isArray(value.relations)) input.relations = value.relations;
  if (isRecord(value.governance) && Array.isArray(value.governance.relations)) input.governance = value.governance;
  if (typeof value.basis === "string") input.basis = value.basis;
  if (value.routinizeToward === "traditional" || value.routinizeToward === "rational-legal") input.routinizeToward = value.routinizeToward;
  if (Array.isArray(value.holders)) input.holders = value.holders;
  if (value.commonKnowledgeValues !== undefined) input.commonKnowledgeValues = readingNames(value.commonKnowledgeValues, "commonKnowledgeValues");
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  return Object.freeze(input);
}

const LEGITIMACY_SCHEMA = Object.freeze({
  title: "Legitimacy",
  type: "object",
  description:
    "Legitimacy of authority priced through coordination-currency: common knowledge, symbolic violence, accountability, charismatic instability, and symbolic monopoly.",
});

export const legitimacyInputCarrier = schemaFrom({
  $id: "socializing/legitimacy-input",
  title: "LegitimacyInput",
  type: "object",
  description:
    "Authority-legitimacy request carrying claimant, scope, optional governance/relations, recognition basis, capital holders, and channel evidence.",
});

export const legitimacyCarrier = schemaFrom({
  $id: "socializing/legitimacy",
  ...LEGITIMACY_SCHEMA,
});

export const legitimateAction = operation({
  verb: "legitimate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read whether authority is legitimate and price the unresolved legitimacy crisis.",
  description:
    "Composes Weber routinization, commonKnowledge, Bourdieu symbolic violence/capital concentration, and Hohfeldian accountability. Failed recognition, misrecognized domination, unaccountable power, charismatic instability, and symbolic monopoly emit h1-coordination-credit cells.",
  domain: legitimacyInputCarrier,
  codomain: legitimacyCarrier,
  run: (input) =>
    jsonResource(legitimate(admitLegitimacyInput(jsonResource(input, "legitimate input"))), "legitimacy"),
});

export const legitimacyActions = Object.freeze([
  legitimateAction,
]);
