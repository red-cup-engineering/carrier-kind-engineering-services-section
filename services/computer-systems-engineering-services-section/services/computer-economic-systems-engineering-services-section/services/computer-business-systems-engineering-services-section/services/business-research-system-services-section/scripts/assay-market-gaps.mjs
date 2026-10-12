#!/usr/bin/env node
/**
 * Assay a market-gap study record and print its readings.
 *   node scripts/assay-market-gaps.mjs <study.json> [--out <readings.json>]
 * The study is { type: "MarketGapStudy", version: 1, question, works: [{id, title, has, lacks, sources}], demands: [{id, wants, evidence: {for, against}}] }.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { assayMarketGaps } from "../src/market-gap.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, "occupied-at": { type: "string" } } });
if (!positionals[0]) throw new Error("usage: assay-market-gaps.mjs <study.json> [--out <readings.json>] [--occupied-at <n>]");
const study = JSON.parse(readFileSync(resolve(positionals[0]), "utf8"));
if (study.type !== "MarketGapStudy" || study.version !== 1) throw new TypeError("expected a MarketGapStudy version 1 record");
const result = assayMarketGaps({ works: study.works, demands: study.demands, ...(values["occupied-at"] ? { occupiedAt: Number(values["occupied-at"]) } : {}) });
const readings = { type: "MarketGapReadings", version: 1, study: positionals[0], question: study.question, ...result };
const text = `${JSON.stringify(readings, null, 2)}\n`;
if (values.out) writeFileSync(resolve(values.out), text);
process.stdout.write(text);
