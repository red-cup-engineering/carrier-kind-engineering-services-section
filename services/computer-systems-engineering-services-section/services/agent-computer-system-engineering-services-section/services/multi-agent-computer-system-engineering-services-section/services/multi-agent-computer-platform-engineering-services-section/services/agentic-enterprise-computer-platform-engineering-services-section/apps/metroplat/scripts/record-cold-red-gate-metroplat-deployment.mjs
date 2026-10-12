#!/usr/bin/env node
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

const JOURNAL_ROOT = new URL("..", import.meta.url).pathname;
/** The store type of a deployment receipt. */
const RECEIPT_TYPE = "deployment-receipt";

/**
 * Record a cold-red-gate MetroPlat release-cutover deployment receipt
 * as a `deployment-receipt` record of the store, in this section's own
 * custody (metroplat's owning section).
 *
 * @param {object} record - the deployment record to persist verbatim.
 * @returns {{id: string, type: string}}
 */
export function recordColdRedGateMetroplatDeployment(record) {
  const recordedAt = new Date().toISOString();
  return Object.freeze({ id: put(JOURNAL_ROOT, RECEIPT_TYPE, { timestamp: recordedAt, ...record }), type: RECEIPT_TYPE });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const record = JSON.parse(process.argv[2]);
  const result = recordColdRedGateMetroplatDeployment(record);
  console.log(JSON.stringify(result, null, 2));
}
