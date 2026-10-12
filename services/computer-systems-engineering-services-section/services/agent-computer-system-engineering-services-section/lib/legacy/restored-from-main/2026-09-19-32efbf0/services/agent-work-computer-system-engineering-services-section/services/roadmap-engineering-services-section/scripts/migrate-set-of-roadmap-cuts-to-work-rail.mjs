#!/usr/bin/env node
// One-time migration (2026-09-06 ruling: roadmaps are derived from journaled
// work, never handwritten): reads the thirty-two hand-written goal-stack
// roadmap cuts in true chronological order (each cut's own `recordedAt`,
// never filename order, which is not reliable for same-day cuts), derives
// one structured-work-intent per cut through the published operation package,
// and admits each to the production work rail. A roadmap cut contains an
// obligation, not an office, incumbent, duty, work, or skill, so it cannot
// lawfully manufacture an agency allocation. Allocation is a later operation
// over canonical firm authority and a declared work item.
import { readTextFile } from "@red-cup-engineering/read-text-file-service";
import { deriveSetOfWorkIntentsFromRoadmapCut } from "@red-cup-engineering/derive-set-of-work-intents-from-roadmap-cut-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const CUT_DIRECTORY = "561-group-enterprise-project-management-services-section/data/records";
const CUT_ABSOLUTE_DIRECTORY = "/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-enterprise-services-section/services/561-group-enterprise-project-management-services-section/data/records";

const CUT_FILENAMES = Object.freeze([
  "2026-08-30-goal-stack-roadmap.json",
  "2026-08-30-2325-goal-stack-roadmap.json",
  "2026-08-30-knowledge-applications-goal-stack-roadmap.json",
  "2026-08-31-2100-goal-stack-roadmap.json",
  "2026-08-31-2330-goal-stack-roadmap.json",
  "2026-08-31-2350-goal-stack-roadmap.json",
  "2026-09-01-0300-goal-stack-roadmap.json",
  "2026-09-02-0140-goal-stack-roadmap.json",
  "2026-09-02-1840-goal-stack-roadmap.json",
  "2026-09-03-0520-goal-stack-roadmap.json",
  "2026-09-03-2230-goal-stack-roadmap.json",
  "2026-09-04-0330-goal-stack-roadmap.json",
  "2026-09-04-0444-goal-stack-roadmap.json",
  "2026-09-04-0700-goal-stack-roadmap.json",
  "2026-09-04-0910-goal-stack-roadmap.json",
  "2026-09-04-1200-goal-stack-roadmap.json",
  "2026-09-04-2000-goal-stack-roadmap.json",
  "2026-09-04-2330-goal-stack-roadmap.json",
  "2026-09-05-0200-goal-stack-roadmap.json",
  "2026-09-05-0400-goal-stack-roadmap.json",
  "2026-09-05-0509-goal-stack-roadmap.json",
  "2026-09-05-0703-goal-stack-roadmap.json",
  "2026-09-05-1430-goal-stack-roadmap.json",
  "2026-09-05-1700-goal-stack-roadmap.json",
  "2026-09-05-1736-goal-stack-roadmap.json",
  "2026-09-05-1900-goal-stack-roadmap.json",
  "2026-09-05-2300-goal-stack-roadmap.json",
  "2026-09-06-0150-goal-stack-roadmap.json",
  "2026-09-06-0200-goal-stack-roadmap.json",
  "2026-09-06-0335-goal-stack-roadmap.json",
  "2026-09-06-0500-goal-stack-roadmap.json",
  "2026-09-06-0640-goal-stack-roadmap.json",
]);

const PRODUCER_ID = "roadmap-engineering-services-section:derive-set-of-work-intents-from-roadmap-cut";
const PRODUCER_REVISION = "0.1.0";

async function loadCut(filename) {
  const reading = await readTextFile({ path: `${CUT_ABSOLUTE_DIRECTORY}/${filename}` });
  return { filename, sourceText: reading.text, cut: JSON.parse(reading.text) };
}

/**
 * Migrates the thirty-two hand-written goal-stack roadmap cuts onto the
 * work rail: reads every cut, sorts by its own `recordedAt` (never filename
 * order), derives one structured-work-intent per cut with the running
 * `priorItems` for cross-cut dedupe, and admits each intent through the given
 * rail. Assigning an office is deliberately outside this source migration.
 * @param {ReturnType<typeof resolveWorkRail>} rail
 * @returns {Promise<object>} `{cuts, perCut:[{cut, itemsInIntent, newItems,
 *   foldedItems, rowsAppended, refusals}], totals}`
 */
export async function migrateSetOfRoadmapCutsToWorkRail(rail) {
  const loaded = await Promise.all(CUT_FILENAMES.map(loadCut));
  loaded.sort((a, b) => {
    const ta = Date.parse(a.cut.recordedAt);
    const tb = Date.parse(b.cut.recordedAt);
    if (ta !== tb) return ta - tb;
    return a.filename.localeCompare(b.filename);
  });

  let priorItems = [];
  const perCut = [];
  let totalRefusals = 0;
  let totalNew = 0;
  let totalFolded = 0;
  let totalRowsAppended = 0;

  for (const { filename, sourceText, cut } of loaded) {
    const priorCells = new Set(priorItems.map((item) => item.cell));
    const request = { ...cut, source: `${CUT_DIRECTORY}/${filename}`, sourceText, priorItems, producerId: PRODUCER_ID, producerRevision: PRODUCER_REVISION };
    const result = deriveSetOfWorkIntentsFromRoadmapCut(request);
    const { refusals, ...intent } = result;
    const at = new Date().toISOString();
    const subject = `structured-work-intent-${intent.id}`;
    const admission = await rail.admitFn(rail.binding, intent, { at, subject });

    const newItems = intent.items.filter((item) => !priorCells.has(item.cell)).length;
    const foldedItems = intent.items.length - newItems;
    totalRefusals += refusals.length;
    totalNew += newItems;
    totalFolded += foldedItems;
    totalRowsAppended += admission.appended ?? 0;
    perCut.push({ cut: filename, recordedAt: cut.recordedAt, itemsInIntent: intent.items.length, newItems, foldedItems, rowsAppended: admission.appended, refusals: refusals.length });

    const byCell = new Map(priorItems.map((item) => [item.cell, item]));
    for (const item of intent.items) byCell.set(item.cell, item);
    priorItems = [...byCell.values()];
  }

  return {
    cuts: loaded.length,
    perCut,
    totals: { newItems: totalNew, foldedItems: totalFolded, refusals: totalRefusals, rowsAppended: totalRowsAppended },
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "migrate-set-of-roadmap-cuts-to-work-rail", description: "Migrates the thirty-two hand-written goal-stack roadmap cuts onto the work rail: reads every cut, sorts by its own `recordedAt` (never filename order), derives one structured-work-intent per cut with the running `priorItems` for cross-cut dedupe, and admits each intent through the given rail.", operation: migrateSetOfRoadmapCutsToWorkRail }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
