#!/usr/bin/env node
// Cross-reference the Duluth land business's seller call list against heir search: an owner
// listed as an estate, heirs or trust is a land lead on Duluth's list and a probable open or
// unopened probate on this one. Reads Duluth's already-pulled sellers.csv (no live fetch; this
// is the two businesses sharing one already-pulled dataset) and writes
// data/records/lead-lists/<date>/duluth-estate-leads.csv.
// Usage: node scripts/cross-reference-duluth-estates.mjs [--sellers <path>] [--out <dir>]
import { readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { decodeCsv, encodeCsv } from "@red-cup-engineering/csv-services-section/csv-codec";
import { heirSearchLeadsFromLandRows } from "../src/leads.mjs";

const { values } = parseArgs({ options: { sellers: { type: "string" }, out: { type: "string" } } });
const today = new Date().toISOString().slice(0, 10);
const duluthLists = path.join(import.meta.dirname, "..", "..", "land-contracts-services-section", "data", "records", "call-lists", "duluth");
const sellersPath = values.sellers ?? path.join(duluthLists, readdirSync(duluthLists).sort().at(-1), "sellers.csv");
const out = values.out ?? path.join(import.meta.dirname, "..", "data", "records", "lead-lists", today);

const sellers = decodeCsv(await readFile(sellersPath, "utf8"));
const leads = heirSearchLeadsFromLandRows(sellers, { county: "St. Louis County", state: "MN" });

await mkdir(out, { recursive: true });
await writeFile(path.join(out, "duluth-estate-leads.csv"), encodeCsv(leads.map((lead, index) => ({ rank: index + 1, ...lead }))));
console.log(JSON.stringify({ sellersPath, sellers: sellers.length, estateLeads: leads.length, out }, null, 2));
