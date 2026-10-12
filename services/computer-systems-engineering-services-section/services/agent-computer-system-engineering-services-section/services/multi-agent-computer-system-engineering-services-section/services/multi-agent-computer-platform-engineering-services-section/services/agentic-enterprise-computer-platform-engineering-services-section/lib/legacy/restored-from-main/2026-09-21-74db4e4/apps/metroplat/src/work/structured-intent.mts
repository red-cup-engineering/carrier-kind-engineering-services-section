import { validateDeterministicExecution } from "@red-cup-engineering/agent-work-computer-system-engineering-services-section/duty-discharge";
import { deriveCborNi } from "@red-cup-engineering/computer-data-engine/identity";
import { contentSlug } from "../lib/addressing/slug.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { openJournal } from "../journal/index.mts";
import { claimSessionFeed, claimSessionStatementRows, type ClaimSessionObservation } from "../claims/session.mts";
import { obsticulationObservationsOfObligations, type WorkObligationMaterial } from "./obligations.mts";
import { WORK_LEVELS, workItemOfCell } from "./model.mts";
import {
  structuredWorkIntentAdmissionContract,
  structuredWorkIntentContract,
  type StructuredWorkIntent,
  type StructuredWorkIntentAdmission,
} from "./schema.mts";

export interface StructuredWorkIntentAdmissionOptions {
  readonly at: string;
  readonly rootName?: string;
  readonly subject?: string;
}

function canonicalItem(item: StructuredWorkIntent["items"][number]): string {
  return item.item ?? item.cell;
}

/** Enforce the work model's hierarchy and sibling-relation laws before any
 * journal append. The schema establishes shape; this establishes references. */
export function assertStructuredWorkIntent(input: unknown): StructuredWorkIntent {
  const intent = structuredWorkIntentContract.assert(input, "structured work intent") as StructuredWorkIntent;
  const sourceIds = new Set<string>();
  for (const source of intent.sources) {
    if (sourceIds.has(source.id)) throw new TypeError(`structured work intent: duplicate source ${source.id}`);
    sourceIds.add(source.id);
  }
  const byItem = new Map<string, StructuredWorkIntent["items"][number]>();
  for (const entry of intent.items) {
    const item = canonicalItem(entry);
    if (byItem.has(item)) throw new TypeError(`structured work intent: duplicate item ${item}`);
    byItem.set(item, entry);
    if (entry.deterministicExecution !== undefined) {
      validateDeterministicExecution(entry.deterministicExecution);
    }
    for (const provenance of entry.provenance) {
      if (!sourceIds.has(provenance.source)) throw new TypeError(`structured work intent: unknown source ${provenance.source}`);
      const hasStart = provenance.start !== undefined;
      const hasEnd = provenance.end !== undefined;
      if (hasStart !== hasEnd || (hasStart && provenance.unit === undefined)) {
        throw new TypeError(`structured work intent: source span for ${item} requires start, end, and unit`);
      }
      if (provenance.start !== undefined && provenance.end !== undefined && provenance.end < provenance.start) {
        throw new TypeError(`structured work intent: reversed source span for ${item}`);
      }
    }
  }
  for (const entry of intent.items) {
    const item = canonicalItem(entry);
    const parsed = workItemOfCell(item);
    if (parsed == null) throw new TypeError(`structured work intent: invalid work item ${item}`);
    const level = WORK_LEVELS.indexOf(parsed.level);
    if (level === 0 && entry.parent !== undefined) throw new TypeError(`structured work intent: endeavor ${item} cannot have a parent`);
    if (level > 0) {
      if (entry.parent === undefined) throw new TypeError(`structured work intent: ${item} requires a parent`);
      const parent = byItem.get(entry.parent);
      const parentParsed = parent === undefined ? undefined : workItemOfCell(canonicalItem(parent));
      if (parentParsed == null || WORK_LEVELS.indexOf(parentParsed.level) !== level - 1) {
        throw new TypeError(`structured work intent: ${item} requires an admitted ${WORK_LEVELS[level - 1]} parent`);
      }
    }
    for (const relation of [...(entry.dependencies ?? []), ...(entry.conflicts ?? [])]) {
      if (relation === item) throw new TypeError(`structured work intent: ${item} cannot relate to itself`);
      const sibling = byItem.get(relation);
      if (sibling === undefined || canonicalItem(sibling) !== relation || sibling.parent !== entry.parent || workItemOfCell(relation)?.level !== parsed.level) {
        throw new TypeError(`structured work intent: ${relation} is not a sibling of ${item}`);
      }
    }
  }
  return intent;
}

function provenanceEvidence(intent: StructuredWorkIntent, item: StructuredWorkIntent["items"][number]): readonly string[] {
  return Object.freeze(item.provenance.flatMap((citation) => {
    const span = citation.start === undefined
      ? []
      : [`source-span:${citation.source}:${citation.unit}:${citation.start}-${citation.end}`];
    return [`source:${citation.source}`, ...span, ...(citation.evidence ?? [])];
  }));
}

export function structuredWorkIntentObligations(input: unknown): readonly WorkObligationMaterial[] {
  const intent = assertStructuredWorkIntent(input);
  return Object.freeze(intent.items.map((entry) => Object.freeze({
    cell: entry.cell,
    item: canonicalItem(entry),
    ...(entry.parent === undefined ? {} : { parent: entry.parent }),
    ...(entry.dependencies === undefined ? {} : { dependencies: Object.freeze([...entry.dependencies]) }),
    ...(entry.conflicts === undefined ? {} : { conflicts: Object.freeze([...entry.conflicts]) }),
    text: entry.text,
    ...(entry.work === undefined ? {} : { work: entry.work }),
    ...(entry.skill === undefined ? {} : { skill: entry.skill }),
    ...(entry.deterministicExecution === undefined ? {} : { deterministicExecution: validateDeterministicExecution(entry.deterministicExecution) }),
    evidence: Object.freeze([...entry.evidence, ...provenanceEvidence(intent, entry)]),
  })));
}

export function structuredWorkIntentObservations(input: unknown, subject?: string): readonly ClaimSessionObservation[] {
  const intent = assertStructuredWorkIntent(input);
  const semanticToken = deriveCborNi({ value: structuredWorkIntentObligations(intent) }).uri;
  return obsticulationObservationsOfObligations(structuredWorkIntentObligations(intent), {
    source: `structured-work-intent:${intent.id}`,
    settlementToken: semanticToken,
    sessionId: `structured-work-intent-${intent.id}`,
    ...(subject === undefined ? {} : { subject }),
    evidence: Object.freeze([
      `intent:${intent.id}`,
      `producer:${intent.producer.id}`,
      ...(intent.producer.revision === undefined ? [] : [`producer-revision:${intent.producer.revision}`]),
    ]),
  });
}

export function admitStructuredWorkIntent(
  binding: FilesystemBinding,
  input: unknown,
  options: StructuredWorkIntentAdmissionOptions,
): StructuredWorkIntentAdmission {
  const intent = assertStructuredWorkIntent(input);
  const subject = options.subject ?? `structured-work-intent-${contentSlug(intent.id)}`;
  const observations = structuredWorkIntentObservations(intent, subject);
  const rows = observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: options.at,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    subject,
    caller: Object.freeze({ transport: "structured-work-intent", session: intent.id }),
  });
  const result = Object.freeze({
    kind: "metroplat.work.structured-intent-admission" as const,
    intent: intent.id,
    subject,
    items: intent.items.length,
    appended: admission.appended,
    status: admission.appended === 0 ? "already-admitted" as const : "admitted" as const,
  });
  return structuredWorkIntentAdmissionContract.assert(result, "structured work intent admission") as StructuredWorkIntentAdmission;
}
