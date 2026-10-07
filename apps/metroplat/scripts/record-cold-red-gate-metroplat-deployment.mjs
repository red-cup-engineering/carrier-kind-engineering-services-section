#!/usr/bin/env node
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

const JOURNAL_ROOT = new URL("..", import.meta.url).pathname;
const JOURNAL_OBJECT_KIND = "agentic-enterprise-computer-platform-engineering-services-section.cold-red-gate-deployment-receipt";
const JOURNAL_CATEGORY = "cold-red-gate.metroplat-deployment";

/**
 * Record a cold-red-gate MetroPlat release-cutover deployment receipt
 * through the canonical semantic record journal, in this section's own
 * custody (metroplat's owning section).
 *
 * @param {object} record - the deployment record to persist verbatim.
 * @returns {{id: string, objectKind: string, appended: boolean, appended: boolean}}
 */
export function recordColdRedGateMetroplatDeployment(record) {
  const recordedAt = new Date().toISOString();
  return createSemanticRecordJournal({ root: JOURNAL_ROOT, objectKind: JOURNAL_OBJECT_KIND }).record({
    category: JOURNAL_CATEGORY,
    recordedAt,
    told: { for: true, against: false },
    record: { timestamp: recordedAt, ...record },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const record = JSON.parse(process.argv[2]);
  const result = recordColdRedGateMetroplatDeployment(record);
  console.log(JSON.stringify(result, null, 2));
}
