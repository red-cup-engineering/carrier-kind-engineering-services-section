import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { deriveBusinessCatalog } from "@red-cup-engineering/computer-business-systems-engineering-services-section/business-catalog";

/** Query source evidence refreshed by push-ops-data; never infer cash or live status. */
export async function readOpsBusinesses(dataDir, query = {}) {
  const snapshot = JSON.parse(await readFile(join(dataDir, "records", "business-catalog.json"), "utf8"));
  if (!Array.isArray(snapshot?.records) || !snapshot.scan
    || typeof snapshot.scan.scannedAt !== "string" || !Number.isFinite(Date.parse(snapshot.scan.scannedAt))) {
    throw new TypeError("Business source snapshot is malformed");
  }
  return {
    ...deriveBusinessCatalog({ records: snapshot.records, ...query }),
    scan: snapshot.scan,
    links: { books: "/books", incomeStatement: "/books/report?report=income-statement" },
  };
}

/** HTTP paging is bounded; the shared query owns record grouping and filtering. */
export function businessQuery(params = new URLSearchParams()) {
  const allowed = new Set(["query", "kind", "accountPrefix", "offset", "limit"]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) throw new TypeError(`Invalid query parameter: ${key}`);
  }
  const input = {};
  for (const key of ["query", "kind", "accountPrefix"]) if (params.has(key)) input[key] = params.get(key);
  for (const key of ["offset", "limit"]) {
    if (!params.has(key)) continue;
    const text = params.get(key);
    if (!/^\d+$/u.test(text)) throw new TypeError(`${key} must be an integer`);
    input[key] = Number(text);
    if (!Number.isSafeInteger(input[key]) || input[key] < (key === "limit" ? 1 : 0)) throw new TypeError(`${key} is out of range`);
  }
  if ((input.limit ?? 50) > 200) throw new TypeError("limit must be at most 200");
  return input;
}
