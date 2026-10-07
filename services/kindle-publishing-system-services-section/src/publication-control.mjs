import { HUMAN_BOUNDARY_TYPES, FAILURE_CLASSES, classifyFailure, serviceLineControl } from "@red-cup-engineering/organizing/work/service-line";

export { HUMAN_BOUNDARY_TYPES, FAILURE_CLASSES, classifyFailure };

/** Kindle's boundaries, incidents and interventions are the service line's, kept in `kindle-publishing.*` journals by book. */
export const kindleControl = serviceLineControl({ service: "kindle-publishing", subjectField: "book" });
const journal = kindleControl.journal;
const records = kindleControl.records;
const countBy = (values, key) => Object.fromEntries([...values.reduce((counts, value) => counts.set(key(value), (counts.get(key(value)) ?? 0) + 1), new Map())]);

export function humanBoundaryTypeFor(reason) {
  if (/tax|payout|bank|beneficial-owner|identity-attestation/iu.test(reason)) return "LEGAL_NONDELEGABLE";
  if (/login|session|captcha|2fa|two-factor|one-time-password|terms|provider/iu.test(reason)) return "EXTERNAL_PROVIDER_REQUIRES_HUMAN";
  if (/declaration|disclosure|byline|adoption|reserved-authority/iu.test(reason)) return "RESERVED_HUMAN_AUTHORITY_REQUIRED";
  throw new TypeError(`unclassified human boundary: ${reason}`);
}

export function recordHumanBoundary(dataRoot, { boundaryType, ...boundary }) {
  return kindleControl.recordHumanBoundary(dataRoot, { ...boundary, boundaryType: boundaryType ?? humanBoundaryTypeFor(boundary.reason) });
}

export const recordAutonomyIncident = kindleControl.recordAutonomyIncident;
export const interventionMetrics = kindleControl.interventionMetrics;

const ZERO_COST = Object.freeze({ inferenceDollars: 0, otherApiDollars: 0, wallClockProductionMs: 0, aggregateAgentComputeMs: 0, exceptionRecoveryMs: 0, humanInterventionCount: 0, humanInterventionTypes: [], humanInterventionsByType: {}, channelFeesDollars: 0, refundCorrectionDollars: 0 });

export function titleCostRecords(dataRoot, book) {
  return records(dataRoot, "title-cost", "title-cost").filter((record) => !book || record.book === book);
}

export function recordTitleCost(dataRoot, { book, commissionedAt, updatedAt, throughStage, delta = {}, humanBoundary = null }) {
  if (!book) return null;
  const prior = titleCostRecords(dataRoot, book).at(-1);
  const costs = { ...ZERO_COST, ...(prior?.costs ?? {}) };
  for (const field of ["inferenceDollars", "otherApiDollars", "wallClockProductionMs", "aggregateAgentComputeMs", "exceptionRecoveryMs", "channelFeesDollars", "refundCorrectionDollars"]) costs[field] += Number(delta[field] ?? 0);
  if (humanBoundary) {
    costs.humanInterventionCount += 1;
    costs.humanInterventionTypes = [...new Set([...costs.humanInterventionTypes, humanBoundary.boundaryType])];
    costs.humanInterventionsByType = { ...costs.humanInterventionsByType, [humanBoundary.boundaryType]: (costs.humanInterventionsByType[humanBoundary.boundaryType] ?? 0) + 1 };
  }
  const record = Object.freeze({ type: "TitleCostRecord", version: 1, book, commissionedAt: prior?.commissionedAt ?? commissionedAt, frozenAtCommission: prior?.frozenAtCommission ?? Object.freeze({ book, commissionedAt, costs: Object.freeze({ ...costs, humanInterventionTypes: [...costs.humanInterventionTypes], humanInterventionsByType: { ...costs.humanInterventionsByType } }) }), updatedAt, throughStage, costs: Object.freeze(costs) });
  journal(dataRoot, "title-cost").record({ category: "title-cost", recordedAt: updatedAt, record, told: { for: true, against: false }, relation: { subject: book, predicate: "title-cost-through", object: throughStage } });
  return record;
}

export function validateChannelCapacity(profile) {
  if (profile?.type !== "ChannelCapacity" || profile.version !== 1 || profile.channel !== "kdp") throw new TypeError("KDP requires a versioned ChannelCapacity profile");
  if (!Number.isInteger(profile.newTitlesPerFormatPerWeek) || profile.newTitlesPerFormatPerWeek < 1) throw new TypeError("ChannelCapacity needs a positive weekly per-format limit");
  if (typeof profile.observedAt !== "string" || typeof profile.source !== "string") throw new TypeError("ChannelCapacity needs observedAt and source");
  return profile;
}

export function allocateChannelCapacity({ profile, candidates, releases = [], now = new Date().toISOString() }) {
  validateChannelCapacity(profile);
  const end = new Date(now), start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  const usedByFormat = countBy(releases.filter(({ releasedAt }) => { const date = new Date(releasedAt); return date > start && date <= end; }), ({ format }) => format);
  const ordered = [...candidates].sort((a, b) => Number(b.expectedContribution ?? 0) - Number(a.expectedContribution ?? 0) || String(a.book).localeCompare(String(b.book)));
  const allocated = [], queued = [];
  for (const candidate of ordered) {
    const format = candidate.format ?? "EPUB", used = usedByFormat[format] ?? 0;
    if (used < profile.newTitlesPerFormatPerWeek) { allocated.push(candidate); usedByFormat[format] = used + 1; }
    else queued.push(candidate);
  }
  return Object.freeze({ type: "ChannelAllocationDecision", version: 1, channel: "kdp", profileVersion: profile.version, decidedAt: now, allocated: Object.freeze(allocated), queued: Object.freeze(queued), usedByFormat: Object.freeze(usedByFormat) });
}
