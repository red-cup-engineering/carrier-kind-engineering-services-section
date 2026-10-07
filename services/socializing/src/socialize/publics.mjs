/**
 * publics - address, circulation, and counterpublic cost.
 *
 * A public is not just a crowd. In socializing's carrier it is an observer category
 * whose members can address one another, reach common knowledge about an issue, and glue
 * without an H1 obstruction. Counterpublics are modeled without treating them as failures:
 * they are subaltern circulations whose isolation from the dominant address field is an
 * explicit coordination cost.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { isCell, knowledgeReading } from "@red-cup-engineering/signcell/cell";

import { sheafEvidence } from "./consensus.mjs";
import { coordinationCurrency } from "./currency.mjs";
import { commonKnowledge } from "./epistemics.mjs";
import { comparisonEdges } from "./field.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const THEORY = Object.freeze({
  publicSphere: "a public is an addressed audience whose issue becomes common knowledge",
  counterpublics: "counterpublic circulation is a real public-making capacity, not mere noise",
  massIntellectuality: "publicness prices distributed semiotic labor across the social factory",
  spectacle: "address without common knowledge leaves circulation visible but not collectively held",
  h1Obstruction: "opposed circulation cycles price the public's unresolved coordination premium",
});

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function agentName(member, index) {
  const identity = member.agent.identity;
  if (typeof identity === "string" && identity !== "") return identity;
  const name = member.agent.name;
  if (typeof name === "string" && name !== "") return name;
  return `observer:${index}`;
}

function memeMentionsIssue(meme, issue) {
  if (issue === "") return true;
  return JSON.stringify(meme).includes(issue);
}

function memeReading(meme) {
  if (!isCell(meme)) return null;
  try {
    return knowledgeReading(meme);
  } catch {
    return null;
  }
}

function issueValue(member, issue) {
  let value = null;
  for (const meme of member.memes) {
    if (!memeMentionsIssue(meme, issue)) continue;
    const next = memeReading(meme);
    if (next === null) continue;
    value = value === null ? next : knowledgeJoinReading(value, next);
  }
  return value?.name ?? "absurd";
}

function publicCells(input

) {
  return Object.freeze([
    Object.freeze({
      id: `publics:${input.name}:audience-threshold`,
      source: "publics",
      spreadH1: input.audienceDeficit,
      noArbitrage: input.audienceDeficit === 0,
      coherentConsensus: input.audienceDeficit === 0,
    }),
    Object.freeze({
      id: `publics:${input.name}:address-gap`,
      source: "publics",
      spreadH1: input.missingAddressEdges,
      noArbitrage: input.missingAddressEdges === 0,
      coherentConsensus: input.missingAddressEdges === 0,
    }),
    Object.freeze({
      id: `publics:${input.name}:common-knowledge`,
      source: "publics",
      spreadH1: input.commonKnowledge.attained ? 0 : 1,
      noArbitrage: input.commonKnowledge.attained,
      coherentConsensus: input.commonKnowledge.attained,
    }),
    Object.freeze({
      id: `publics:${input.name}:h1-obstruction`,
      source: "publics",
      spreadH1: input.obstruction,
      noArbitrage: input.obstruction === 0,
      coherentConsensus: input.obstruction === 0,
    }),
    Object.freeze({
      id: `publics:${input.name}:contested-issue-values`,
      source: "publics",
      spreadH1: input.contestedIssueValues,
      noArbitrage: input.contestedIssueValues === 0,
      coherentConsensus: input.contestedIssueValues === 0,
    }),
    Object.freeze({
      id: `publics:${input.name}:counterpublic-isolation`,
      source: "publics",
      spreadH1: input.counterpublicIsolation,
      noArbitrage: input.counterpublicIsolation === 0,
      coherentConsensus: input.counterpublicIsolation === 0,
    }),
  ]);
}

export function publics(input) {
  const name = input.name ?? "public";
  const issue = input.issue ?? "";
  const audience = Object.freeze(input.field.members.map(agentName));
  const minimumAudience = input.minimumAudience ?? Math.min(2, audience.length);
  if (!Number.isInteger(minimumAudience) || minimumAudience < 0) {
    throw new TypeError("publics: minimumAudience must be a nonnegative integer");
  }
  const directedAddressEdges = input.field.base.translations.filter((translation) => translation.source !== translation.target).length;
  const maxDirectedEdges = audience.length * Math.max(0, audience.length - 1);
  const missingAddressEdges = Math.max(0, maxDirectedEdges - directedAddressEdges);
  const issueValues = Object.freeze(input.field.members.map((member) => issueValue(member, issue)));
  const reliable = (input.reliableChannel ?? true) && missingAddressEdges === 0;
  const ck = commonKnowledge(issueValues, reliable);
  const consensus = sheafEvidence(issueValues.map((value, index) => witnessedReading(value ?? "absurd", `member:${index}`)), comparisonEdges(input.field.base));
  const audienceDeficit = Math.max(0, minimumAudience - audience.length);
  const contestedIssueValues = issueValues.filter((value) => value === "stable").length;
  const subalternAgents = Object.freeze([...(input.subalternAgents ?? [])].filter((agent) => audience.includes(agent)).sort());
  const subalternHasVoice = subalternAgents.some((agent) => {
    const index = audience.indexOf(agent);
    return issueValues[index] === "potential" || issueValues[index] === "stable";
  });
  const isPublic = audienceDeficit === 0 && missingAddressEdges === 0 && ck.attained && consensus.obstruction === 0;
  const counterpublic = subalternAgents.length > 0 && subalternHasVoice && !isPublic;
  const counterpublicIsolation = counterpublic ? 1 : 0;
  const currency = coordinationCurrency(publicCells({
    name,
    audienceDeficit,
    missingAddressEdges,
    commonKnowledge: ck,
    obstruction: consensus.obstruction,
    contestedIssueValues,
    counterpublicIsolation,
  }));
  return Object.freeze({
    kind: "socializing.publics",
    name,
    issue,
    audience,
    minimumAudience,
    audienceDeficit,
    directedAddressEdges,
    missingAddressEdges,
    issueValues,
    commonKnowledge: ck,
    consensus,
    contestedIssueValues,
    subalternAgents,
    counterpublic,
    public: isPublic,
    currency,
    theory: THEORY,
  });
}

function admitPublicsInput(value) {
  if (!isRecord(value) || !isRecord(value.field)) {
    throw new TypeError("publics: expected { field, issue?, minimumAudience?, reliableChannel?, subalternAgents? }");
  }
  const input

 = {
    field: value.field,
  };
  if (typeof value.name === "string") input.name = value.name;
  if (typeof value.issue === "string") input.issue = value.issue;
  if (typeof value.minimumAudience === "number") input.minimumAudience = value.minimumAudience;
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  if (Array.isArray(value.subalternAgents) && value.subalternAgents.every((agent) => typeof agent === "string")) {
    input.subalternAgents = Object.freeze([...value.subalternAgents]);
  }
  return Object.freeze(input);
}

const PUBLICS_SCHEMA = Object.freeze({
  title: "Publics",
  type: "object",
  description:
    "Public and counterpublic formation over a social field: address reach, common knowledge, H1 obstruction, contested issue values, and counterpublic isolation priced through coordination-currency.",
});

export const publicsInputCarrier = schemaFrom({
  $id: "socializing/publics-input",
  title: "PublicsInput",
  type: "object",
  description:
    "Public/counterpublic request carrying a social field, issue, minimum audience, channel reliability, and optional subaltern agents.",
});

export const publicsCarrier = schemaFrom({
  $id: "socializing/publics",
  ...PUBLICS_SCHEMA,
});

export const publicsAction = operation({
  verb: "publics",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read public/counterpublic formation and price the unresolved coordination work.",
  description:
    "Composes social field translations, commonKnowledge, and sheafEvidence. Missing address edges, audience threshold gaps, failed common knowledge, H1 obstruction, contested issue values, and counterpublic isolation emit h1-coordination-credit cells.",
  domain: publicsInputCarrier,
  codomain: publicsCarrier,
  run: (input) =>
    jsonResource(publics(admitPublicsInput(jsonResource(input, "publics input"))), "publics"),
});

export const publicsActions = Object.freeze([
  publicsAction,
]);
