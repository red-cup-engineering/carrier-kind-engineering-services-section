#!/usr/bin/env node
/**
 * Effect: admit the four Obsmetrologia Lean censuses (src/census-admission.mjs's
 * pure algebra) into one eavt trace, appended via eavt's own appendEavt so
 * row identity is eavt's, then derive eavt's saturate/transfer (the
 * stratify law: settled = transfer(saturate(rows))) over every theorem
 * entity and write settled/stratified summaries beside the trace.
 * @module admit-set-of-census-rows
 */
import { rm } from "node:fs/promises";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { readFileBytes } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { appendEavtRow, entities, saturateEavtTrace, sectionEavtEvidence, transferEavtEvidence, unique } from "@red-cup-engineering/eavt-services-section";
import { isMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { buildJoinQuery, buildTheoremFacts, nameOfEntity } from "../src/census-admission.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
// friction (obsmetrological-services-section-node-import-migration, 2026-09-04):
// semiotic-eavt-services-section writes an append-only JSONL log under data/logs/, never
// exact named paths under data/state/ that other carriers already cite (relate-set-of-
// theorem-facts.mjs reads the .eavt trace by this exact path). Kept as house-file-services
// writers (not raw node:fs) of these exact-path carriers until the journal grows that shape.

const DEFAULT_RECORDS_DIR = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/records", import.meta.url).href);
const DEFAULT_OUT_BASE = projectFileUrlFilepath(new URL("../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/data/state/2026-09-04-obsmetrologia-theorem-facts", import.meta.url).href);

const CARRIER_FILES = {
  axiom: "2026-09-03-theorem-axiom-census-rows.tsv",
  site: "2026-09-03-identification-site-census-rows.tsv",
  regime: "2026-09-04-regime-instantiation-census-rows.tsv",
  strata: "2026-09-04-module-strata-census.json",
};

/**
 * Parse argv into the die's options.
 * @param {string[]} argv - `process.argv.slice(2)`.
 * @returns {{recordsDir: string|undefined, outBase: string|undefined}}
 */
export function parseArgv(argv) {
  return { recordsDir: argument("--records-dir", argv), outBase: argument("--out", argv) };
}

/**
 * A carrier's dated filename stamp: the leading YYYY-MM-DD segment.
 * @param {string} fileName
 * @returns {string}
 * @throws {Error} If `fileName` does not start with a YYYY-MM-DD stamp.
 */
export function dateOfFileName(fileName) {
  const match = /^(\d{4}-\d{2}-\d{2})-/.exec(fileName);
  if (!match) throw new Error(`admit-set-of-census-rows: undated carrier filename ${fileName}`);
  return match[1];
}

/**
 * Read one census carrier off disk into census-admission.mjs's carrier shape.
 * @param {string} recordsDir
 * @param {string} fileName
 * @param {boolean} [asJson] - Also parse `text` as JSON onto `.json` (the module-strata carrier).
 * @returns {Promise<object>}
 */
export async function readCarrier(recordsDir, fileName, asJson = false) {
  const path = `${recordsDir}${recordsDir.endsWith("/") ? "" : "/"}${fileName}`;
  const buffer = await readFileBytes(path);
  const text = buffer.toString("utf8");
  const carrier = { text, bytes: new Uint8Array(buffer), date: dateOfFileName(fileName), path: fileName };
  if (asJson) carrier.json = JSON.parse(text);
  return carrier;
}

async function main() {
  const { recordsDir: argvRecordsDir, outBase: argvOutBase } = parseArgv(process.argv.slice(2));
  const recordsDir = argvRecordsDir ?? DEFAULT_RECORDS_DIR;
  const outBase = argvOutBase ?? DEFAULT_OUT_BASE;
  const tracePath = `${outBase}.eavt`;
  const settledPath = `${outBase}.settled.json`;
  const stratifiedPath = `${outBase}.stratified.json`;
  const joinPath = `${outBase}.join.json`;

  const [axiom, site, regime, strata] = await Promise.all([
    readCarrier(recordsDir, CARRIER_FILES.axiom),
    readCarrier(recordsDir, CARRIER_FILES.site),
    readCarrier(recordsDir, CARRIER_FILES.regime),
    readCarrier(recordsDir, CARRIER_FILES.strata, true),
  ]);

  const { rows } = buildTheoremFacts({ axiom, site, regime, strata });

  await rm(tracePath, { recursive: true, force: true }); // fresh admission each run, never accumulated appends
  for (const row of rows) appendEavtRow({ path: tracePath, row });

  // The stratify law (settled = transfer(saturate(rows))), hoisted across all entities: saturate
  // dedupes/retraction-closes the WHOLE trace once, rather than once per entity as stratify's own
  // per-subject wrapper would (infeasible at this trace's ~10^5-row scale).
  const deduped = unique(rows);
  const saturatedTrace = saturateEavtTrace({ rows: deduped }).rows;
  const entityList = entities(deduped);

  const settledByEntity = {};
  const stratifiedByEntity = {};
  let settledCount = 0;
  for (const entity of entityList) {
    const asserted = deduped.filter((row) => row.e === entity);
    const saturatedRows = saturatedTrace.filter((row) => row.e === entity);
    const settled = transferEavtEvidence({ subject: entity, rows: saturatedTrace });
    const settledSection = sectionEavtEvidence({ folded: settled });
    settledByEntity[entity] = settledSection;
    stratifiedByEntity[entity] = {
      assertedCount: asserted.length,
      saturatedCount: saturatedRows.length,
      settledAffirmedCount: settledSection.affirmed.length,
    };
    if (settled.fiber.length > 0) settledCount += 1;
  }
  await writeFileText(settledPath, `${JSON.stringify(settledByEntity, null, 2)}\n`);
  await writeFileText(stratifiedPath, `${JSON.stringify(stratifiedByEntity, null, 2)}\n`);

  const joinAddresses = buildJoinQuery(deduped);
  const joinTheorems = joinAddresses.map((address) => nameOfEntity(deduped, address)).sort();
  await writeFileText(
    joinPath,
    `${JSON.stringify(
      {
        query: "regime-mode=hypothesized AND axiom-profile in {Quot.sound, propext+Quot.sound} AND module-upward-import-count>0",
        count: joinTheorems.length,
        theorems: joinTheorems,
      },
      null,
      2,
    )}\n`,
  );

  const summary = {
    rows: rows.length,
    entities: entityList.length,
    settled: settledCount,
    joinCount: joinTheorems.length,
    joinFirst10: joinTheorems.slice(0, 10),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exit(0);
}

if (isMain(import.meta.url)) {
  main();
}
