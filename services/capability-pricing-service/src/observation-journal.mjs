import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

/** The kind price observations are kept under in the one log. */
export const PRICE_OBSERVATION_OBJECT_KIND = "capability-pricing.observation";
const OBSERVATION = "observation";
const HELD = Object.freeze({ for: true, against: false });
const pause = new Int32Array(new SharedArrayBuffer(4));

/** The journal an observations path names: `observations.jsonl` keeps its observations at `observations.journal`. */
export const observationJournalRoot = (observationsPath) => `${resolve(observationsPath).replace(/\.jsonl$/u, "")}.journal`;

/**
 * Price observations kept in the one log: a semantic-record journal beside the observations path,
 * read back in append order. A JSONL file of observations an earlier release left at the path is
 * admitted once, read only, skipping observations already held; `jsonl-admission.json` in the
 * journal marks that so it never repeats.
 */
export function openObservationJournal(observationsPath, { now = () => new Date() } = {}) {
  const root = observationJournalRoot(observationsPath);
  mkdirSync(root, { recursive: true });
  const journal = createSemanticRecordJournal({ root, objectKind: PRICE_OBSERVATION_OBJECT_KIND });
  const held = () => journal.query({ category: OBSERVATION }).filter((row) => row.told?.for && !row.told?.against);
  let last = held().reduce((latest, row) => Math.max(latest, Date.parse(row.recordedAt)), 0);
  const stamp = () => { last = Math.max(now().getTime(), last + 1); return new Date(last).toISOString(); };
  const append = (observation) => journal.record({ category: OBSERVATION, record: observation, recordedAt: stamp(), told: HELD });
  const admission = join(root, "jsonl-admission.json");
  if (!existsSync(admission)) exclusively(root, () => {
    if (existsSync(admission)) return;
    let admitted = 0;
    if (existsSync(observationsPath)) {
      const already = new Set(held().map((row) => JSON.stringify(row.record)));
      for (const line of readFileSync(observationsPath, "utf8").split("\n").filter(Boolean)) {
        const observation = JSON.parse(line);
        if (already.has(JSON.stringify(observation))) continue;
        append(observation);
        admitted += 1;
      }
    }
    writeFileSync(admission, `${JSON.stringify({ type: "PriceObservationJsonlAdmission", version: 1, from: resolve(observationsPath), at: now().toISOString(), admitted })}\n`, { flag: "wx", mode: 0o600 });
  });
  return Object.freeze({
    root,
    append: (observation) => { append(observation); return observation; },
    observations: () => held().map((row) => structuredClone(row.record)),
  });
}

function exclusively(root, work) {
  const lock = join(root, ".lock");
  const deadline = Date.now() + 15_000;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age = 0;
      try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
      if (age > 30_000) { rmSync(lock, { recursive: true, force: true }); continue; }
      if (Date.now() > deadline) throw new Error(`price observation journal ${root} is held by another writer`);
      Atomics.wait(pause, 0, 0, 5);
    }
  }
  try { return work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}
