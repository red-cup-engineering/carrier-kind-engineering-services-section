
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { cell } from "@red-cup-engineering/signcell/cell";
import {
  arenaForPlayers,
  createPool,
  encodePool,
  formMatches,
  matchmakeAction,
  queueTicket,

} from "@red-cup-engineering/gaming";

import { officeEligibility } from "../authority.mjs";
import {
  assignWork,
  officeTerm,
  termKey,
  workAgent,
  workItem,
  workTask,
  workTerm,

} from "../work.mjs";

import {
  coordinateByCalmOrRaft,
  emptyRaftLog,

} from "../writing/raft/index.mjs";
import { readCalmFederation } from "../writing/calm/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const jsonSlotSchema = {
  description: "Caller-owned JSON carrier slot.",
};

export const TroupeSchema = {
  $id: "organizing/casting/troupe",
  title: "OrganizingTroupe",
  description:
    "The cast selected from a standing camp for one situation, with the gaming matchmaking pool and formed match as witness.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "camp", "situation", "memberIds", "members", "pool", "match", "matchmaking", "matchmakingAction"],
  properties: {
    kind: { const: "organizing.casting.troupe" },
    camp: { type: "string", minLength: 1 },
    situation: { type: "string", minLength: 1 },
    memberIds: { type: "array", items: { type: "string", minLength: 1 } },
    members: { type: "array", items: { type: "object" } },
    pool: { type: "object" },
    match: { type: "object" },
    matchmaking: { type: "object" },
    matchmakingAction: jsonSlotSchema,
  },
};

export const WorkLocusClaimSchema = {
  $id: "organizing/casting/work-locus-claim",
  title: "OrganizingWorkLocusClaim",
  description:
    "A jural claim over governed substrate: a WorkAssignment over a WorkItem whose subject is the claimed substrate region.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "situation", "region", "assignment", "eligibility"],
  properties: {
    kind: { const: "organizing.casting.work-locus-claim" },
    situation: { type: "string", minLength: 1 },
    region: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    assignment: { type: "object" },
    eligibility: { type: "object" },
  },
};

export const WorkLocusGovernanceSchema = {
  $id: "organizing/casting/work-locus-governance",
  title: "OrganizingWorkLocusGovernance",
  description:
    "CALM/Raft governance over work-locus claims: monotone claims lift coordination-free; non-monotone overlaps are leader ordered.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "monotone", "calm", "frontier", "assignmentsByIndex", "log"],
  properties: {
    kind: { const: "organizing.casting.work-locus-governance" },
    monotone: { type: "boolean" },
    calm: { type: "object" },
    frontier: { type: "object" },
    assignmentsByIndex: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["substrateIndex", "assignment"],
        properties: {
          substrateIndex: { type: "string", minLength: 1 },
          assignment: { type: "object" },
        },
      },
    },
    log: { type: "object" },
    append: { type: "object" },
  },
};

export const troupeCarrier = schemaFrom(TroupeSchema);
export const workLocusClaimCarrier = schemaFrom(WorkLocusClaimSchema);
export const workLocusGovernanceCarrier = schemaFrom(WorkLocusGovernanceSchema);

export function cast(camp, scene) {
  if (camp.members.length < scene.matchSize) {
    throw new TypeError("cast: camp does not have enough members for the situation match size");
  }
  const playerIds = camp.members.map((member) => member.id);
  let pool = createPool({
    id: `${camp.id}:${scene.id}`,
    arena: arenaForPlayers(playerIds),
    matchSize: scene.matchSize,
  });
  for (const member of [...camp.members].sort((left, right) => left.id.localeCompare(right.id))) {
    pool = queueTicket(pool, member.id).pool;
  }
  const matchmakingAction = matchmakeAction.execute({ pool: encodePool(pool) }, {});
  const matchmaking = formMatches(pool);
  const match = matchmaking.matches[0];
  if (match === undefined) throw new TypeError("cast: matchmaking did not form a troupe");
  const selected = new Set(match.playerIds);
  const members = Object.freeze(camp.members.filter((member) => selected.has(member.id)));
  const troupe = Object.freeze({
    kind: "organizing.casting.troupe",
    camp: camp.id,
    situation: scene.id,
    memberIds: Object.freeze([...match.playerIds]),
    members,
    pool: matchmaking.pool,
    match,
    matchmaking,
    matchmakingAction,
  });
  return troupeCarrier.assert(jsonResource(troupe), "troupe");
}

export function stageTroupeMember(input) {
  const actor = input.designs[input.memberId];
  if (actor === undefined) throw new TypeError(`stageTroupeMember: no design for member ${input.memberId}`);
  const troupe = input.troupe.memberIds
    .filter((memberId) => memberId !== input.memberId)
    .map((memberId) => input.designs[memberId])
    .filter((design) => design !== undefined);
  return input.stage(actor, troupe, input.universe);
}

export function claimWorkLocus(input) {
  const region = Object.freeze([...(input.region ?? input.situation.substrate)]);
  if (region.length === 0) throw new TypeError("claimWorkLocus: region is required");
  const requiresCapabilities = Object.freeze([...(input.requiresCapabilities ?? input.situation.requiresCapabilities)]);
  const requiresAuthorities = Object.freeze([...(input.requiresAuthorities ?? input.situation.requiresAuthorities)]);
  const capabilities = Object.freeze([...(input.capabilities ?? [])]);
  const officeAuthorities = Object.freeze([...(input.officeAuthorities ?? [])]);
  const eligibility = officeEligibility({
    kind: "organizing.office-eligibility-request",
    capabilities,
    officeAuthorities,
    requiresCapabilities,
    requiresAuthorities,
  });
  if (!eligibility.eligible) {
    throw new TypeError(`claimWorkLocus: office eligibility failed with ${eligibility.gap} gap`);
  }
  const office = typeof input.office === "string" ? officeTerm(input.office) : input.office;
  const assignee = typeof input.assignee === "string"
    ? workAgent({
        term: workTerm(["agent", input.assignee]),
        capabilities: capabilities.map((capability) => workTerm(["capability", capability])),
      })
    : input.assignee;
  const title = input.title ?? `${input.situation.id} work locus`;
  const workSubject = workTerm(["substrate-region", ...region]);
  const goal = cell(
    workSubject,
    "claimed-work-locus",
    { situation: input.situation.id, region: [...region] },
  );
  const task = workTask({
    term: workTerm(["task", "situation", input.situation.id, ...region]),
    goals: [goal],
    evidence: [workTerm(["title", title]), workTerm(["situation", input.situation.id])],
  });
  const item = workItem({
    term: workSubject,
    task,
    office,
    evidence: [workTerm(["title", title]), workTerm(["substrate-region", ...region])],
  });
  const assignment = assignWork({
    term: workTerm(["assignment", input.situation.id, termKey(office), termKey(assignee.term), ...region]),
    work: item,
    office,
    assignee,
    duties: (input.duties ?? []).map((duty) => workTerm(["duty", duty])),
    evidence: [workTerm(["situation", input.situation.id]), workTerm(["jural-face", "office"])],
  });
  const locusClaim = Object.freeze({
    kind: "organizing.casting.work-locus-claim",
    situation: input.situation.id,
    region,
    assignment,
    eligibility,
  });
  return workLocusClaimCarrier.assert(jsonResource(locusClaim), "work locus claim");
}

export function governWorkLocusClaims(
  claims,
  options = {},
) {
  if (claims.length === 0) throw new TypeError("governWorkLocusClaims: claims are required");
  const byIndex = claimsBySubstrateIndex(claims);
  const contendedIndexes = [...byIndex.entries()].filter(([, entries]) => distinctAssignments(entries).length > 1);
  const calm = readCalmFederation(calmFederation(claims.length, contendedIndexes.length));
  const cluster = options.cluster ?? options.leadership?.cluster ?? "organizing-work-locus";
  const log = options.log ?? emptyRaftLog(cluster);
  const proposals = contendedIndexes.length === 0 ? [] : raftProposals(byIndex, options.leadership);
  const coordinated = coordinateByCalmOrRaft(calm, {
    log,
    ...(options.leadership === undefined ? {} : { leadership: options.leadership }),
    operation: "work-locus-claim",
    proposals,
  });
  const assignmentsByIndex = contendedIndexes.length === 0
    ? monotoneAssignments(byIndex)
    : raftAssignments(coordinated.log, claims);
  const governance = Object.freeze({
    kind: "organizing.casting.work-locus-governance",
    monotone: calm.monotone,
    calm,
    frontier: coordinated.frontier,
    assignmentsByIndex,
    log: coordinated.log,
    ...(coordinated.append === undefined ? {} : { append: coordinated.append }),
  });
  return workLocusGovernanceCarrier.assert(jsonResource(governance), "work locus governance");
}

function claimsBySubstrateIndex(claims) {
  const byIndex = new Map();
  for (const entry of claims) {
    for (const substrateIndex of entry.region) {
      const existing = byIndex.get(substrateIndex) ?? [];
      existing.push(entry);
      byIndex.set(substrateIndex, existing);
    }
  }
  return byIndex;
}

function distinctAssignments(claims) {
  return Object.freeze([...new Set(claims.map((entry) => termKey(entry.assignment.term)))]);
}

function calmFederation(claimCount, contested) {
  return Object.freeze({
    kind: "organizing.federation",
    monoidal: "parallel-composition",
    constituents: claimCount,
    members: claimCount,
    nameMobility: 0,
    shared: contested === 0 ? claimCount : Math.max(0, claimCount - contested),
    contested,
    federationOnly: 0,
    glued: contested === 0,
    coordination: contested === 0 ? "coordination-free" : "consensus-required",
  });
}

function monotoneAssignments(byIndex) {
  return Object.freeze([...byIndex.entries()].map(([substrateIndex, claims]) => Object.freeze({
    substrateIndex,
    assignment: claims[0].assignment,
  })));
}

function raftProposals(
  byIndex,
  leadership,
) {
  if (leadership === undefined) return [];
  const ordinals = substrateOrdinals([...byIndex.keys()]);
  return Object.freeze([...byIndex.entries()].flatMap(([substrateIndex, claims]) => {
    if (distinctAssignments(claims).length <= 1) return [];
    return claims.map((entry) => Object.freeze({
      cluster: leadership.cluster,
      index: ordinals.get(substrateIndex),
      term: leadership.term,
      leader: leadership.leader,
      command: assignmentCommand(substrateIndex, entry.assignment),
      witness: termKey(entry.assignment.term),
    }));
  }));
}

function raftAssignments(log, claims) {
  const byTerm = new Map(claims.map((entry) => [termKey(entry.assignment.term), entry.assignment]));
  return Object.freeze(log.entries.map((entry) => {
    const command = entry.command;
    const substrateIndex = typeof command.substrateIndex === "string" ? command.substrateIndex : String(entry.index);
    const assignmentTerm = typeof command.assignmentTerm === "string" ? command.assignmentTerm : "";
    const assignment = byTerm.get(assignmentTerm);
    if (assignment === undefined) throw new TypeError(`governWorkLocusClaims: raft log references unknown assignment ${assignmentTerm}`);
    return Object.freeze({ substrateIndex, assignment });
  }));
}

function substrateOrdinals(indexes) {
  return new Map([...indexes].sort().map((index, ordinal) => [index, ordinal + 1]));
}

function assignmentCommand(substrateIndex, assignment) {
  return {
    kind: "organizing.casting.assignment-command",
    substrateIndex,
    assignmentTerm: termKey(assignment.term),
    workTerm: termKey(assignment.work.term),
    office: termKey(assignment.office),
  };
}
