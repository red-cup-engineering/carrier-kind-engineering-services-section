
import { chargeValue, chargeValueName, isChargeValueName, joinKnowledgeValue, type ChargeValueName } from "../lib/values/index.mts";
import { modalKripkeFrame, necessitate, possibilize, type KripkeValuation } from "../lib/logic/predicating/evidence/modal-kripke-four-valued.mts";
import { operation, type Operation } from "../rpc/index.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { journal, type JournalFeed } from "../journal/index.mts";
import {
  agentWorkReadoutCollector,
} from "./readout.mts";
import {
  agentWorkDispatchReadoutOfWork,
} from "./dispatch.mts";
import {
  dutiesViewCollector,
  governanceViewCollector,
  workItemViewCollector,
} from "./read-models.mts";
import {
  deriveMilestoneStatus,
  type MilestoneClaim,
  type MilestoneCondition,
  type MilestoneStatusReadout,
} from "./milestones.mts";

export interface WorkCoordinationOperationInput {
  /** Inclusive observation frontier; defaults to the binding clock day. */
  readonly date?: string;
  readonly id?: string;
}

export interface WorkCoordinationInput {
  readonly date: string;
  readonly id?: string;
}

type WorkCoordinationVerb =
  | "claim-modality"
  | "milestone"
  | "governance"
  | "work-item"
  | "duties"
  | "agent-work-dispatch";

function todayIso(binding: FilesystemBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function workCoordinationInputOf(input: unknown, binding: FilesystemBinding): WorkCoordinationInput {
  const record = input !== null && typeof input === "object" && !Array.isArray(input)
    ? input as Readonly<Record<string, JsonValue>>
    : {};
  const date = typeof record["date"] === "string" ? record["date"] : todayIso(binding);
  const id = typeof record["id"] === "string" ? record["id"] : undefined;
  return Object.freeze({
    date,
    ...(id === undefined ? {} : { id }),
  });
}

function subjectLogPath(binding: FilesystemBinding, date: string, subject: string): JournalFeed {
  return journal.feed(binding.dataRoot, subject, date, { subject });
}

export function readClaimModalityReadout(
  binding: FilesystemBinding,
  date: string,
  subject: string | undefined,
): JsonValue | undefined {
  if (subject === undefined) return undefined;
  const logPath = subjectLogPath(binding, date, subject);
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const cellCharges = new Map<string, ChargeValueName>();
  const folded = journal.scanCausal(logPath, undefined, (_accum, row) => {
    const [, attribute] = row;
    if (attribute === null || typeof attribute !== "object" || Array.isArray(attribute)) return undefined;
    const record = attribute as Readonly<Record<string, JsonValue>>;
    const cell = record["cell"];
    const charge = record["charge"];
    if (typeof cell !== "string" || typeof charge !== "string" || !isChargeValueName(charge)) return undefined;
    const prior = cellCharges.get(cell);
    cellCharges.set(cell, prior === undefined
      ? charge
      : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))));
    return undefined;
  });
  if (folded.rows === 0 || cellCharges.size === 0) return undefined;
  const worlds = Object.freeze([...cellCharges.keys()]);
  const accessibility: Record<string, readonly string[]> = {};
  for (const world of worlds) accessibility[world] = worlds;
  const frame = modalKripkeFrame(worlds, accessibility);
  const valuation: KripkeValuation = Object.freeze(Object.fromEntries(cellCharges));
  const possibly = possibilize(frame, valuation);
  const necessarily = necessitate(frame, valuation);
  const cells: Record<string, JsonValue> = {};
  for (const world of worlds) {
    cells[world] = Object.freeze({
      charge: valuation[world],
      possibly: possibly[world],
      necessarily: necessarily[world],
    }) as unknown as JsonValue;
  }
  return Object.freeze({
    kind: "metroplat.holography.claim-modality-settlement",
    subject,
    date,
    frameClass: frame.frameClass,
    cells: Object.freeze(cells),
  }) as unknown as JsonValue;
}

/** Fold the recorded claim feeds into derived milestone states. */
export function readMilestoneReadout(
  binding: FilesystemBinding,
  date: string,
  _id?: string,
): JsonValue | undefined {
  const logFiles = journal.listFeeds(binding.dataRoot, date);
  if (logFiles.length === 0) return undefined;

  const judgement = new Map<string, ChargeValueName>();
  const foldCellCharge = (cell: string, charge: ChargeValueName): void => {
    const prior = judgement.get(cell);
    judgement.set(cell, prior === undefined
      ? charge
      : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))));
  };

  const definitions = new Map<string, MilestoneClaim>();
  const bypassWitnesses = new Map<string, string[]>();
  for (const logPath of logFiles) {
    try {
      journal.scan(logPath, undefined, (_accum, row) => {
        const [, attribute, value] = row;
        if (attribute !== null && typeof attribute === "object" && !Array.isArray(attribute)) {
          const attributeRecord = attribute as Readonly<Record<string, JsonValue>>;
          const attributeCell = attributeRecord["cell"];
          const attributeCharge = attributeRecord["charge"];
          if (typeof attributeCell === "string" && typeof attributeCharge === "string" && isChargeValueName(attributeCharge)) {
            foldCellCharge(attributeCell, attributeCharge);
          }
        }
        if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
        const claimBody = value as Readonly<Record<string, JsonValue>>;
        const cell = claimBody["cell"];
        const charge = claimBody["charge"];
        if (typeof cell === "string" && typeof charge === "string" && isChargeValueName(charge)) foldCellCharge(cell, charge);
        if (typeof cell !== "string" || !cell.startsWith("milestone:")) return undefined;
        const slugName = cell.slice("milestone:".length);
        if (claimBody["bypass"] === true) {
          const evidence = Array.isArray(claimBody["evidence"])
            ? claimBody["evidence"].filter((item): item is string => typeof item === "string")
            : [];
          if (evidence.length > 0) bypassWitnesses.set(slugName, [...(bypassWitnesses.get(slugName) ?? []), ...evidence]);
          return undefined;
        }
        if (!Array.isArray(claimBody["conditions"])) return undefined;
        const conditions: MilestoneCondition[] = [];
        for (const raw of claimBody["conditions"]) {
          if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
          const conditionRecord = raw as Readonly<Record<string, JsonValue>>;
          const conditionCell = conditionRecord["cell"];
          const target = conditionRecord["target"];
          if (typeof conditionCell === "string" && typeof target === "string" && isChargeValueName(target)) {
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

  const conditionCells = new Set<string>();
  for (const definition of definitions.values()) {
    for (const condition of definition.conditions) conditionCells.add(condition.cell);
  }
  let necessarily: ReadonlyMap<string, ChargeValueName> | undefined;
  if (conditionCells.size > 0) {
    const worlds = Object.freeze([...conditionCells]);
    const accessibility: Record<string, readonly string[]> = {};
    for (const world of worlds) accessibility[world] = worlds;
    const frame = modalKripkeFrame(worlds, accessibility);
    const valuation: KripkeValuation = Object.freeze(Object.fromEntries(
      worlds.map((world) => [world, judgement.get(world) ?? "unknown"]),
    ));
    necessarily = new Map(Object.entries(necessitate(frame, valuation)));
  }

  const statuses = new Map<string, MilestoneStatusReadout>();
  for (const [slugName, definition] of definitions) {
    const bypassWitness = bypassWitnesses.get(slugName);
    statuses.set(slugName, deriveMilestoneStatus(definition, judgement, {
      ...(necessarily === undefined ? {} : { necessarily }),
      ...(bypassWitness === undefined ? {} : { bypassWitness }),
    }));
  }

  const children = new Map<string, string[]>();
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
      statuses.set(slugName, Object.freeze({ ...status, reached: true, status: "reached" as const }));
      changed = true;
    }
    if (!changed) break;
  }

  const gap: Record<string, readonly string[]> = {};
  for (const [slugName, status] of statuses) {
    if (status.status === "pending") gap[slugName] = status.gap;
  }
  return Object.freeze({
    kind: "metroplat.holography.milestone-settlement",
    date,
    milestones: Object.freeze(Object.fromEntries([...statuses] as unknown as [string, JsonValue][])),
    gap: Object.freeze(gap),
  }) as unknown as JsonValue;
}

export function readGovernanceView(
  binding: FilesystemBinding,
  date: string,
  subject: string | undefined,
): JsonValue | undefined {
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
  binding: FilesystemBinding,
  date: string,
  feedName: string | undefined,
): JsonValue | undefined {
  if (feedName === undefined) return undefined;
  const collector = workItemViewCollector();
  try {
    journal.scanCausalSubject(binding.dataRoot, feedName, date, undefined, (_accum, row, event) => {
      collector.push(row, event);
      return undefined;
    });
  } catch {
    return undefined;
  }
  return collector.read(feedName, date);
}

export function readDutiesView(
  binding: FilesystemBinding,
  date: string,
  agent: string | undefined,
): JsonValue | undefined {
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
    ...(settled as Record<string, JsonValue>),
    sourceRows,
    malformed,
  }) as unknown as JsonValue;
}

export function readAgentWorkDispatchReadout(
  binding: FilesystemBinding,
  date: string,
  agent: string | undefined,
): JsonValue | undefined {
  const logFiles = journal.listFeeds(binding.dataRoot, date);
  if (logFiles.length === 0) return undefined;
  const collector = agentWorkReadoutCollector();
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
  const workReadout = collector.read({
    subject: agent ?? "agent-work-dispatch",
    date,
    feed: "daily-claim-sessions",
    ...(agent === undefined ? {} : { agents: Object.freeze([agent]) }),
  });
  const dispatch = agentWorkDispatchReadoutOfWork(workReadout);
  return Object.freeze({
    ...(dispatch as unknown as Record<string, JsonValue>),
    sourceRows,
    malformed,
  }) as unknown as JsonValue;
}

export function workCoordinationOperations(binding: FilesystemBinding): readonly Operation[] {
  const operationOf = (
    verb: WorkCoordinationVerb,
    read: (binding: FilesystemBinding, date: string, id: string | undefined) => JsonValue | undefined,
  ): Operation => operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    summary: `Read ${verb} work coordination material.`,
    description: "Domain: { date?, id? }. date is an inclusive observation frontier and defaults to the binding clock day; id selects the claim feed or agent when the reading needs one.",
    run: (input: unknown): unknown => {
      const readInput = workCoordinationInputOf(input, binding);
      return read(binding, readInput.date, readInput.id) ?? null;
    },
  });
  return Object.freeze([
    operationOf("claim-modality", readClaimModalityReadout),
    operationOf("milestone", readMilestoneReadout),
    operationOf("governance", readGovernanceView),
    operationOf("work-item", readWorkItemView),
    operationOf("duties", readDutiesView),
    operationOf("agent-work-dispatch", readAgentWorkDispatchReadout),
  ]);
}
