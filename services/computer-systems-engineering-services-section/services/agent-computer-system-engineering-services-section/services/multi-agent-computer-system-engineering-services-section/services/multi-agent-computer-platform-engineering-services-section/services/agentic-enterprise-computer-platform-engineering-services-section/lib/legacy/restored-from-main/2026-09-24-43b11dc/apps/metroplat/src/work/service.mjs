
import { chargeValue, chargeValueName, chargeValueNameOfNotationName, joinKnowledgeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { necessitate, possibilize } from "@lenticule-science/metrologic/articulation/predicating/positing/modal-kripke-four-valued";
import { modalKripkeFrame } from "@lenticule-science/metrologic/articulation/predicating/positing/modal-kripke-four-valued";
import { operation } from "../rpc/operation.mjs";

import { basename } from "node:path";
import { dataArtifactHandlePath, parseArtifactStem } from "@red-cup-engineering/computer-system-engine/addressing/data-artifact-address";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import {
  agentWorkReadoutCollector,
} from "@red-cup-engineering/organizing/work/readout";
import {
  agentWorkDispatchReadoutOfWork,
  pageAgentWorkDispatchReadout,

} from "@red-cup-engineering/organizing/work/dispatch";
import {
  dutiesViewCollector,
  governanceViewCollector,
  workItemViewCollector,
} from "@red-cup-engineering/organizing/work/read-models";
import {
  deriveMilestoneStatus,

} from "@red-cup-engineering/organizing/work/milestones";
import { admitStructuredWorkIntent } from "./structured-intent.mjs";
import { createSignRoadmap, deriveMilestones, parseSignRoadmapInput, signRoadmapAdmissionContract, signRoadmapInputContract } from "@red-cup-engineering/organizing/work/sign-roadmap";
import { admitSignRoadmap, readSignRoadmap } from "./sign-roadmap-journal.mjs";
import { admitWorkDischarge } from "./work-discharge.mjs";
import { admitWorkResultProposal } from "./work-result-proposal.mjs";
import { admitAgencyWorkAllocation } from "./agency-work-allocation.mjs";

import {
  agencyWorkAllocationAdmissionContract,
  agencyWorkAllocationContract,
  structuredWorkIntentAdmissionContract,
  structuredWorkIntentContract,
  workDischargeAdmissionContract,
  workDischargeContract,
  agentWorkDispatchInputContract,
  agentWorkDispatchOutputContract,
  agencyWorkExecutionContract,
  agencyWorkExecutionProposalContract,
} from "@red-cup-engineering/organizing/work/schema";

/** Journal/claim rows carry the relation model notation's own charge vocabulary
 *  (`held`/`denied`/`contested`/`unknown` — see `claims/session.mjs`); every reader
 *  here folds them through the computer-data-engine's bilattice, so it converts at
 *  this one boundary and works in the data engine's vocabulary from there on. */
function notationChargeNameOrUndefined(value) {
  try {
    return chargeValueNameOfNotationName(value);
  } catch {
    return undefined;
  }
}

function todayIso(binding) {
  return binding.now().slice(0, 10);
}

function workCoordinationInputOf(input, binding) {
  const record = input !== null && typeof input === "object" && !Array.isArray(input)
    ? input
    : {};
  const date = typeof record["date"] === "string" ? record["date"] : todayIso(binding);
  const id = typeof record["id"] === "string" ? record["id"] : undefined;
  return Object.freeze({
    date,
    ...(id === undefined ? {} : { id }),
  });
}

function subjectLogPath(binding, date, subject) {
  return journal.feed(binding.dataRoot, subject, date, { subject });
}

export function readClaimModalityReadout(
  binding,
  date,
  subject,
) {
  if (subject === undefined) return undefined;
  const logPath = subjectLogPath(binding, date, subject);
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const cellCharges = new Map();
  const folded = journal.scanCausal(logPath, undefined, (_accum, row) => {
    const [, attribute] = row;
    if (attribute === null || typeof attribute !== "object" || Array.isArray(attribute)) return undefined;
    const record = attribute;
    const cell = record["cell"];
    const charge = typeof record["charge"] === "string" ? notationChargeNameOrUndefined(record["charge"]) : undefined;
    if (typeof cell !== "string" || charge === undefined) return undefined;
    const prior = cellCharges.get(cell);
    cellCharges.set(cell, prior === undefined
      ? charge
      : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))));
    return undefined;
  });
  if (folded.rows === 0 || cellCharges.size === 0) return undefined;
  const worlds = Object.freeze([...cellCharges.keys()]);
  const accessibility = {};
  for (const world of worlds) accessibility[world] = worlds;
  const frame = modalKripkeFrame(worlds, accessibility);
  const valuation = Object.freeze(Object.fromEntries(cellCharges));
  const possibly = possibilize(frame, valuation);
  const necessarily = necessitate(frame, valuation);
  const cells = {};
  for (const world of worlds) {
    cells[world] = Object.freeze({
      charge: valuation[world],
      possibly: possibly[world],
      necessarily: necessarily[world],
    });
  }
  return Object.freeze({
    kind: "metroplat.holography.claim-modality-settlement",
    subject,
    date,
    frameClass: frame.frameClass,
    cells: Object.freeze(cells),
  });
}

/** Fold the recorded claim feeds into derived milestone states. */
export function readMilestoneReadout(
  binding,
  date,
  _id,
) {
  const logFiles = journal.listFeeds(binding.dataRoot, date);
  if (logFiles.length === 0) return undefined;

  const judgement = new Map();
  const foldCellCharge = (cell, charge) => {
    const prior = judgement.get(cell);
    judgement.set(cell, prior === undefined
      ? charge
      : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))));
  };

  const definitions = new Map();
  const bypassWitnesses = new Map();
  for (const logPath of logFiles) {
    try {
      journal.scan(logPath, undefined, (_accum, row) => {
        const [, attribute, value] = row;
        if (attribute !== null && typeof attribute === "object" && !Array.isArray(attribute)) {
          const attributeRecord = attribute;
          const attributeCell = attributeRecord["cell"];
          const attributeCharge = typeof attributeRecord["charge"] === "string" ? notationChargeNameOrUndefined(attributeRecord["charge"]) : undefined;
          if (typeof attributeCell === "string" && attributeCharge !== undefined) {
            foldCellCharge(attributeCell, attributeCharge);
          }
        }
        if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
        const claimBody = value;
        const cell = claimBody["cell"];
        const charge = typeof claimBody["charge"] === "string" ? notationChargeNameOrUndefined(claimBody["charge"]) : undefined;
        if (typeof cell === "string" && charge !== undefined) foldCellCharge(cell, charge);
        if (typeof cell !== "string" || !cell.startsWith("milestone:")) return undefined;
        const slugName = cell.slice("milestone:".length);
        if (claimBody["bypass"] === true) {
          const evidence = Array.isArray(claimBody["evidence"])
            ? claimBody["evidence"].filter((item) => typeof item === "string")
            : [];
          if (evidence.length > 0) bypassWitnesses.set(slugName, [...(bypassWitnesses.get(slugName) ?? []), ...evidence]);
          return undefined;
        }
        if (!Array.isArray(claimBody["conditions"])) return undefined;
        const conditions = [];
        for (const raw of claimBody["conditions"]) {
          if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
          const conditionRecord = raw;
          const conditionCell = conditionRecord["cell"];
          const target = typeof conditionRecord["target"] === "string" ? notationChargeNameOrUndefined(conditionRecord["target"]) : undefined;
          if (typeof conditionCell === "string" && target !== undefined) {
            conditions.push(Object.freeze({ cell: conditionCell, target }));
          }
        }
        const composesInto = typeof claimBody["composesInto"] === "string" ? claimBody["composesInto"] : undefined;
        definitions.set(slugName, Object.freeze({
          slug: slugName,
          conditions: Object.freeze(conditions),
          ...(composesInto === undefined ? {} : { composesInto }),
        }));
        return undefined;
      });
    } catch {
      continue;
    }
  }
  if (definitions.size === 0) return undefined;

  const conditionCells = new Set();
  for (const definition of definitions.values()) {
    for (const condition of definition.conditions) conditionCells.add(condition.cell);
  }
  let necessarily;
  if (conditionCells.size > 0) {
    const worlds = Object.freeze([...conditionCells]);
    const accessibility = {};
    for (const world of worlds) accessibility[world] = worlds;
    const frame = modalKripkeFrame(worlds, accessibility);
    const valuation = Object.freeze(Object.fromEntries(
      worlds.map((world) => [world, judgement.get(world) ?? "absurd"]),
    ));
    necessarily = new Map(Object.entries(necessitate(frame, valuation)));
  }

  const statuses = new Map();
  for (const [slugName, definition] of definitions) {
    const bypassWitness = bypassWitnesses.get(slugName);
    statuses.set(slugName, deriveMilestoneStatus(definition, judgement, {
      ...(necessarily === undefined ? {} : { necessarily }),
      ...(bypassWitness === undefined ? {} : { bypassWitness }),
    }));
  }

  const children = new Map();
  for (const definition of definitions.values()) {
    if (definition.composesInto === undefined) continue;
    children.set(definition.composesInto, [...(children.get(definition.composesInto) ?? []), definition.slug]);
  }
  for (let pass = 0; pass < definitions.size; pass += 1) {
    let changed = false;
    for (const [slugName, status] of statuses) {
      if (status.status !== "pending") continue;
      const kids = children.get(slugName);
      if (kids === undefined || kids.length === 0) continue;
      if (!kids.every((child) => statuses.get(child)?.reached === true)) continue;
      const own = definitions.get(slugName);
      if (own === undefined || own.conditions.some((condition) => judgement.get(condition.cell) !== condition.target)) continue;
      statuses.set(slugName, Object.freeze({ ...status, reached: true, status: "reached" }));
      changed = true;
    }
    if (!changed) break;
  }

  const gap = {};
  for (const [slugName, status] of statuses) {
    if (status.status === "pending") gap[slugName] = status.gap;
  }
  return Object.freeze({
    kind: "metroplat.holography.milestone-settlement",
    date,
    milestones: Object.freeze(Object.fromEntries([...statuses])),
    gap: Object.freeze(gap),
  });
}

/** Read the canonical roadmap directly from its SignGraph journal cuts. */
export function readSignRoadmapReadout(
  binding,
  date,
  subject,
) {
  const roadmap = readSignRoadmap(binding, date, subject);
  if (roadmap === undefined) return undefined;
  return Object.freeze({
    kind: "metroplat.sign-roadmap-readout",
    graph: roadmap.graph,
    milestones: deriveMilestones(roadmap),
  });
}

export function readGovernanceView(
  binding,
  date,
  subject,
) {
  if (subject === undefined) return undefined;
  const logPath = subjectLogPath(binding, date, subject);
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const collector = governanceViewCollector();
  try {
    journal.scanCausal(logPath, undefined, (_accum, row) => {
      collector.push(row);
      return undefined;
    });
  } catch {
    return undefined;
  }
  return collector.read(subject, date);
}

export function readWorkItemView(
  binding,
  date,
  feedName,
) {
  if (feedName === undefined) return undefined;
  const collector = workItemViewCollector();
  try {
    if (feedName === "daily-claim-sessions") {
      journal.scanCausalAll(binding.dataRoot, date, undefined, (_accum, row, event) => {
        collector.push(row, event);
        return undefined;
      });
    } else {
      journal.scanCausalSubject(binding.dataRoot, feedName, date, undefined, (_accum, row, event) => {
        collector.push(row, event);
        return undefined;
      });
    }
  } catch {
    return undefined;
  }
  return collector.read(feedName, date);
}

export function readDutiesView(
  binding,
  date,
  agent,
) {
  if (agent === undefined) return undefined;
  const logFiles = journal.listFeeds(binding.dataRoot, date);
  if (logFiles.length === 0) return undefined;
  const collector = dutiesViewCollector();
  let sourceRows = 0;
  let malformed = 0;
  try {
    const folded = journal.scanCausalAll(binding.dataRoot, date, undefined, (_accum, row) => {
      collector.push(row);
      return undefined;
    });
    sourceRows = folded.rows;
    malformed = folded.malformed;
  } catch {
    malformed = 1;
  }
  const settled = collector.read(agent, date);
  if (settled === undefined) return undefined;
  if (malformed === 0) return settled;
  return Object.freeze({
    ...(settled),
    sourceRows,
    malformed,
  });
}

/** Shared read behind both the unpaged and paged agent-work-dispatch readers. */
function dispatchReadoutOf(
  binding,
  date,
  agent,
) {
  const logFiles = journal.listFeeds(binding.dataRoot, date);
  if (logFiles.length === 0) return undefined;
  const collector = agentWorkReadoutCollector();
  const subjectByWitness = new Map();
  let sourceRows = 0;
  let malformed = 0;
  try {
    for (const feed of logFiles) {
      const subject = parseArtifactStem(basename(dataArtifactHandlePath(feed.artifact, "log"), ".jsonl"))?.token;
      if (subject === undefined) continue;
      for (const witness of openJournal(binding.dataRoot).read(feed)) {
        const prior = subjectByWitness.get(witness.id);
        if (prior !== undefined && prior !== subject) throw new Error("one witness cannot belong to two admitted subjects");
        subjectByWitness.set(witness.id, subject);
      }
    }
    const folded = journal.scanCausalAll(binding.dataRoot, date, undefined, (_accum, row, witness) => {
      collector.push(row, subjectByWitness.get(witness.id));
      return undefined;
    });
    sourceRows = folded.rows;
    malformed = folded.malformed;
  } catch {
    malformed = 1;
  }
  const workReadout = collector.read({
    subject: agent ?? "agent-work-dispatch",
    date,
    feed: "daily-claim-sessions",
    ...(agent === undefined ? {} : { agents: Object.freeze([agent]) }),
  });
  return { dispatch: agentWorkDispatchReadoutOfWork(workReadout), sourceRows, malformed };
}

/** The full, unpaged readout — used by internal consumers (agent context images, checkout-health) that need every item. */
export function readAgentWorkDispatchReadout(
  binding,
  date,
  agent,
) {
  const read = dispatchReadoutOf(binding, date, agent);
  if (read === undefined) return undefined;
  return Object.freeze({
    ...(read.dispatch),
    sourceRows: read.sourceRows,
    malformed: read.malformed,
  });
}

/**
 * The `agent-work-dispatch` RPC verb's reader: the same readout, paged.
 *
 * A live causal territory's full readout readily exceeds the identity
 * module's 1 MiB canonical-JSON limit and crashes the content-addressed
 * receipt (see `pageAgentWorkDispatchReadout`'s doc comment); this is the
 * only reader that verb should ever use.
 */
export function readPagedAgentWorkDispatchReadout(
  binding,
  date,
  agent,
  limit,
  cursor,
) {
  const read = dispatchReadoutOf(binding, date, agent);
  if (read === undefined) return undefined;
  const paged = pageAgentWorkDispatchReadout(read.dispatch, { limit, cursor });
  return Object.freeze({
    ...(paged),
    sourceRows: read.sourceRows,
    malformed: read.malformed,
  });
}

/** Configuration supplied by the service boundary that owns the lawful firm
 * pool.  Authority is deliberately absent from an allocation payload. */

export function workCoordinationOperations(
  binding,
  { resolveAgencyWorkAuthority, resolveModelCharacter, authorizeProviderDelegation, authorizeWorkDischargeReceiver, executeAgencyWork } = {},
) {
  const operationOf = (
    verb,
    read,
  ) => operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    summary: `Read ${verb} work coordination material.`,
    description: "Domain: { date?, id? }. date is an inclusive observation frontier and defaults to the binding clock day; id selects the claim feed or agent when the reading needs one.",
    run: (input) => {
      const readInput = workCoordinationInputOf(input, binding);
      return read(binding, readInput.date, readInput.id) ?? null;
    },
  });
  return Object.freeze([
    operation({
      verb: "sign-roadmap-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit one typed graph cut to the sole shared roadmap.",
      description: "Records typed SignCells and witnessed SignGraph edges. It refuses free-form work rows, undeclared node kinds, invalid edge predicates, and any graph whose content address cannot be re-admitted.",
      domain: signRoadmapInputContract,
      codomain: signRoadmapAdmissionContract,
      relation: "boundary",
      effects: {
        class: "journal-write",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input) => {
        signRoadmapInputContract.assert(input, "sign roadmap input");
        const parsed = parseSignRoadmapInput(input);
        if (!parsed.ok) return parsed;
        const roadmap = createSignRoadmap(parsed.value);
        if (!roadmap.ok) return roadmap;
        return signRoadmapAdmissionContract.assert(admitSignRoadmap(binding, roadmap.value, { at: todayIso(binding) }), "sign roadmap admission");
      },
    }),
    operation({
      verb: "structured-work-intent-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit provider-neutral structured work intent.",
      description: "Validates one structured intent, projects it through the canonical work-obligation carrier, and appends ordinary claim-session journal rows.",
      domain: structuredWorkIntentContract,
      codomain: structuredWorkIntentAdmissionContract,
      relation: "boundary",
      effects: {
        class: "journal-write",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input) => admitStructuredWorkIntent(binding, input, { at: todayIso(binding) }),
    }),
    operation({
      verb: "agency-work-allocation-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit one eligible Character's bounded office-service allocation.",
      description: "Validates the declared Character capability inclusion, provider-neutral office service, and bounded allocation; refuses undeclared scopes; and appends one character-duty allocation claim to the target work feed.",
      domain: agencyWorkAllocationContract,
      codomain: agencyWorkAllocationAdmissionContract,
      relation: "boundary",
      effects: {
        class: "journal-write",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input) => admitAgencyWorkAllocation(binding, input, {
        at: todayIso(binding),
        ...(resolveAgencyWorkAuthority === undefined ? {} : { resolveAuthority: resolveAgencyWorkAuthority }),
        ...(resolveModelCharacter === undefined ? {} : { resolveModelCharacter }),
        ...(authorizeProviderDelegation === undefined ? {} : { authorizeProviderDelegation }),
      }),
    }),
    operation({
      verb: "work-discharge-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit evidence that discharges one structured work scope.",
      description: "Validates one provider-neutral discharge and appends it causally after the exact obligation in the originating structured intent feed.",
      domain: workDischargeContract,
      codomain: workDischargeAdmissionContract,
      relation: "boundary",
      effects: {
        class: "journal-write",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input, _args, context) => {
        const discharge = workDischargeContract.assert(input, "work discharge");
        if (context === undefined || authorizeWorkDischargeReceiver === undefined || context.invocation.subject !== discharge.receiver.id) throw new TypeError("work discharge: authenticated receiver authority is required");
        return admitWorkDischarge(binding, discharge, { at: todayIso(binding), receiverAuthorization: authorizeWorkDischargeReceiver({ receiver: context.invocation.subject, scope: discharge.scope, operation: context.operation.ref, at: context.startedAt }) });
      },
    }),
    operation({
      verb: "agency-work-execute",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Run one ready office duty through its declared provider method and admit its typed outcome.",
      description: "Selects only a ready scope held by the named actor and returns a witnessed typed result proposal. A later independent receiver admits work-discharge against its exact receipt.",
      domain: agencyWorkExecutionContract,
      codomain: agencyWorkExecutionProposalContract,
      relation: "boundary",
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: async (input) => {
        const execution = agencyWorkExecutionContract.assert(input, "agency work execution");
        if (executeAgencyWork === undefined) throw new TypeError("agency work execution: configured provider adapter is required");
        const item = dispatchReadoutOf(binding, todayIso(binding), execution.actor)?.dispatch.frontier
          .find((candidate) => candidate.scope === execution.scope);
        if (item === undefined || item.intent === undefined || item.subject === undefined || item.closureKind === undefined || item.work === undefined || item.skill === undefined) {
          throw new TypeError("agency work execution: scope is not a ready canonical office duty");
        }
        if (item.allocation === undefined || item.method === undefined || item.receiverCondition === undefined) throw new TypeError("agency work execution: canonical method and receiver condition are required");
        const delegation = item.delegation;
        if (delegation === undefined || authorizeProviderDelegation === undefined) throw new TypeError("agency work execution: current canonical provider authority is required");
        const executionAuthorization = authorizeProviderDelegation({
          holder: item.agent, provider: delegation.provider, scope: item.scope, operations: delegation.operations,
          effects: delegation.effects, authority: delegation.authority, at: todayIso(binding),
        });
        if (executionAuthorization.authority !== delegation.authority || executionAuthorization.evidence.length === 0) throw new TypeError("agency work execution: provider authority is not current");
        const outcome = await executeAgencyWork(item);
        const proposal = admitWorkResultProposal(binding, {
          execution: outcome.execution, allocation: item.allocation ?? "", intent: item.intent, subject: item.subject, scope: item.scope, producer: outcome.producer, authorization: executionAuthorization,
          work: item.work, skill: item.skill, closureKind: item.closureKind,
          requiresCapabilities: item.requiresCapabilities ?? [], method: item.method,
          receiverCondition: item.receiverCondition, result: outcome.result,
          providerEvidence: outcome.providerEvidence,
        }, { at: todayIso(binding) });
        return agencyWorkExecutionProposalContract.assert(Object.freeze({
          kind: "metroplat.work.agency-work-execution-proposal",
          execution: proposal.execution, intent: proposal.intent, scope: proposal.scope,
          producer: proposal.producer, result: proposal.result, receipt: proposal.receipt, evidence: proposal.providerEvidence,
        }), "agency work execution proposal");
      },
    }),
    operationOf("claim-modality", readClaimModalityReadout),
    operationOf("milestone", readMilestoneReadout),
    operationOf("governance", readGovernanceView),
    operationOf("work-item", readWorkItemView),
    operationOf("duties", readDutiesView),
    operationOf("sign-roadmap", readSignRoadmapReadout),
    operation({
      verb: "agent-work-dispatch",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read a paged agent-work-dispatch settlement.",
      description: "Domain: { date?, id?, limit?, cursor? }. date is an inclusive observation frontier and defaults to the binding clock day; id selects the agent when the reading needs one. limit bounds the returned queue page (default 50, max 500); cursor resumes from a prior response's nextCursor. ready/blocked/done are counts computed over the whole, unpaged queue; each returned queue item's reasons are capped to 8 entries with a reasonsTruncated count when more were dropped.",
      domain: agentWorkDispatchInputContract,
      codomain: agentWorkDispatchOutputContract,
      run: (input) => {
        const readInput = workCoordinationInputOf(input, binding);
        const record = input !== null && typeof input === "object" && !Array.isArray(input)
          ? input
          : {};
        const limit = typeof record["limit"] === "number" ? record["limit"] : undefined;
        const cursor = typeof record["cursor"] === "string" ? record["cursor"] : undefined;
        return readPagedAgentWorkDispatchReadout(binding, readInput.date, readInput.id, limit, cursor) ?? null;
      },
    }),
  ]);
}
