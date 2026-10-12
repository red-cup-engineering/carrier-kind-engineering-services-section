#!/usr/bin/env node
// Records the salvaged Cross+Critic phases of the entity-actor-resource-map
// sweep (13 readers already run; Cross and Critic died on a session limit)
// into this section's semantic record journal. This section owns the
// actor/entity lineage (agent-computer-system-engineering-services-section),
// so its journal is the lawful custody root for this record.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OBJECT_KIND = "entity-actor-resource-map";
export const CATEGORY = "cross-critic";

/**
 * Records the finished cross-check + completeness-critic record for the
 * entity-actor-resource-map sweep.
 * @param {object} record shape: {concepts, contradictions, duplicateShapes, missed, urnAmeResidue}
 * @param {{dataRoot?: string, recordedAt?: string}} [options]
 * @returns {{id: string, objectKind: string, appended: number, appended: number, charge: {support: boolean, refutation: boolean}}}
 */
export function recordCrossCritic(record, options = {}) {
  const dataRoot = resolve(options.dataRoot ?? NODE_ROOT);
  const journal = createSemanticRecordJournal({ root: dataRoot, objectKind: OBJECT_KIND });
  return journal.record({
    category: CATEGORY,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
    record,
    charge: { support: true, refutation: false },
  });
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) {
    process.stderr.write("usage: record-entity-actor-resource-map-cross-critic.mjs <record.json>\n");
    process.exitCode = 2;
  } else {
    const record = JSON.parse(readFileSync(resolve(path), "utf8"));
    process.stdout.write(`${JSON.stringify(recordCrossCritic(record), null, 2)}\n`);
  }
}
