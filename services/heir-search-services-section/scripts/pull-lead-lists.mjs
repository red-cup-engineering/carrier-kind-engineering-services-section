#!/usr/bin/env node
// Pull heir search's buyer-side lead list from public data and write it as call lists:
//   funders.csv     - federal grantees paid for heirs'-property/land-tenure work (USAspending.gov)
//   nonprofits.csv  - heirs'-property and land-tenure nonprofits (ProPublica Nonprofit Explorer)
//   uphpa-states.csv, vendor-comps.csv - hand-compiled reference tables (see src/leads.mjs)
// Usage: node scripts/pull-lead-lists.mjs [--out <dir>]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { encodeCsv } from "@red-cup-engineering/csv-services-section/csv-codec";
import { searchAwardsAll } from "@red-cup-engineering/usaspending-services-section/client";
import { getOrganization, searchOrganizationsAll } from "@red-cup-engineering/propublica-nonprofit-explorer-services-section/client";
import {
  FEDERAL_LEAD_KEYWORDS, NAMED_VENDOR_COMPS, NONPROFIT_LEAD_QUERIES, UPHPA_STATES,
  funderRow, nonprofitRow, nonprofitRowWithAddress,
} from "../src/leads.mjs";

const { values } = parseArgs({ options: { out: { type: "string" } } });
const today = new Date().toISOString().slice(0, 10);
const out = values.out ?? path.join(import.meta.dirname, "..", "data", "records", "lead-lists", today);

const funders = new Map();
for (const keyword of FEDERAL_LEAD_KEYWORDS) {
  for await (const award of searchAwardsAll({ keywords: [keyword] }, { limit: 100 })) {
    funders.set(award["Award ID"], funderRow(award));
  }
}

const nonprofits = new Map();
for (const query of NONPROFIT_LEAD_QUERIES) {
  for await (const organization of searchOrganizationsAll(query, { limit: 40 })) {
    const row = nonprofitRow(organization);
    if (nonprofits.has(row.ein)) continue;
    const detail = await getOrganization(row.ein).catch(() => null);
    nonprofits.set(row.ein, nonprofitRowWithAddress(row, detail));
  }
}

const funderRows = [...funders.values()].sort((a, b) => b.amount - a.amount).map((row, index) => ({ rank: index + 1, ...row }));
const nonprofitRows = [...nonprofits.values()].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map((row, index) => ({ rank: index + 1, ...row }));

await mkdir(out, { recursive: true });
await writeFile(path.join(out, "funders.csv"), encodeCsv(funderRows));
await writeFile(path.join(out, "nonprofits.csv"), encodeCsv(nonprofitRows));
await writeFile(path.join(out, "uphpa-states.csv"), encodeCsv(UPHPA_STATES));
await writeFile(path.join(out, "vendor-comps.csv"), encodeCsv(NAMED_VENDOR_COMPS.map((comp) => ({
  name: comp.name, model: comp.model, perResearchYear: comp.perResearchYear ?? "", perHeirLocated: comp.perHeirLocated ?? "",
  contingencyPercentLow: comp.contingencyPercentLow ?? "", contingencyPercentHigh: comp.contingencyPercentHigh ?? "",
}))));
console.log(JSON.stringify({
  funders: funderRows.length, nonprofits: nonprofitRows.length,
  uphpaStates: UPHPA_STATES.length, vendorComps: NAMED_VENDOR_COMPS.length, out,
}, null, 2));
