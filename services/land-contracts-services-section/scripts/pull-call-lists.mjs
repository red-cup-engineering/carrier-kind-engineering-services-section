#!/usr/bin/env node
// Pull one market's parcels from its county layer and write the call lists: sellers (owners
// likely to sell, every kind of property), buyers (owners already holding several lots), and
// forfeited parcels the county will auction. Usage:
//   node scripts/pull-call-lists.mjs [--market duluth] [--out <dir>] [--min-score <n>]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { queryFeatures } from "@red-cup-engineering/arcgis-rest-services-section/client";
import { encodeCsv } from "@red-cup-engineering/csv-services-section/csv-codec";
import { buyerRows, ownerCanSell, parcelLocation, propertyKind, pullMarket, sellerRow } from "../src/leads.mjs";

const { values } = parseArgs({
  options: {
    market: { type: "string", default: "duluth" },
    out: { type: "string" },
    "min-score": { type: "string", default: "12" },
  },
});

const today = new Date().toISOString().slice(0, 10);
const out = values.out ?? path.join(import.meta.dirname, "..", "data", "records", "call-lists", values.market, today);
const minScore = Number(values["min-score"]);

const { market, parcels } = await pullMarket(values.market, { queryFeatures });
const sellers = parcels
  .filter((parcel) => ownerCanSell(parcel) && propertyKind(parcel) !== "forfeited")
  .map((parcel) => sellerRow(parcel))
  .filter((row) => row.score >= minScore)
  .sort((a, b) => b.score - a.score || b.estimate - a.estimate)
  .map((row, index) => ({ rank: index + 1, ...row }));
const buyers = buyerRows(parcels);
const forfeited = parcels
  .filter((parcel) => propertyKind(parcel) === "forfeited")
  .map((parcel) => ({ parcel: parcel.parcel, location: parcelLocation(parcel), place: parcel.place, acres: Number(parcel.acres.toFixed(3)), class: parcel.useClass, land_estimate: parcel.landValue }))
  .sort((a, b) => b.land_estimate - a.land_estimate);

await mkdir(out, { recursive: true });
await writeFile(path.join(out, "sellers.csv"), encodeCsv(sellers));
await writeFile(path.join(out, "buyers.csv"), encodeCsv(buyers));
await writeFile(path.join(out, "forfeited.csv"), encodeCsv(forfeited));
const byKind = {};
for (const row of sellers) byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
console.log(JSON.stringify({ market: market.id, layer: market.layer, pulled: parcels.length, sellers: sellers.length, byKind, buyers: buyers.length, forfeited: forfeited.length, out }, null, 2));
