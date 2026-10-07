import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { recordNeedsHuman } from "./retail-submission.mjs";

const execute = promisify(execFile);
const decodeXml = (value) => String(value).replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&apos;/gu, "'");

export const kdpFeedbackType = defineSchemaType({
  $id: "org.561-group.kindle.sales-feedback.v1", title: "KDP sales feedback",
  description: "Content-addressed normalized KDP report rows and owned-ASIN rank observations.",
  type: "object", additionalProperties: false, required: ["type", "version", "importedAt", "source", "sales", "ranks"],
  properties: { type: { const: "KdpSalesFeedback" }, version: { const: 1 }, importedAt: { type: "string" }, source: { type: "object" }, sales: { type: "array", items: { type: "object" } }, ranks: { type: "array", items: { type: "object" } } },
});

export function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ",") { row.push(field); field = ""; }
    else if (!quoted && (character === "\n" || character === "\r")) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += character;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function unzipEntry(path, entry) { try { return (await execute("unzip", ["-p", path, entry], { maxBuffer: 20_000_000 })).stdout; } catch { return ""; } }
function columnOf(reference) { return reference.match(/^[A-Z]+/u)?.[0] ?? ""; }
async function parseXlsx(path) {
  const sharedXml = await unzipEntry(path, "xl/sharedStrings.xml");
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/gu)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gu)].map((part) => part[1]).join("")));
  const sheet = await unzipEntry(path, "xl/worksheets/sheet1.xml");
  const grid = [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/gu)].map((rowMatch) => {
    const row = {};
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gu)) {
      const reference = cell[1].match(/\br="([A-Z]+\d+)"/u)?.[1] ?? "";
      const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/u)?.[1] ?? cell[2].match(/<t[^>]*>([\s\S]*?)<\/t>/u)?.[1] ?? "";
      row[columnOf(reference)] = /\bt="s"/u.test(cell[1]) ? shared[Number(raw)] ?? "" : decodeXml(raw);
    }
    return row;
  });
  if (!grid.length) return [];
  const columns = Object.keys(grid[0]).sort(); const headers = Object.fromEntries(columns.map((column) => [column, grid[0][column]]));
  return grid.slice(1).map((row) => Object.fromEntries(columns.map((column) => [headers[column], row[column] ?? ""])));
}

const pick = (row, patterns) => Object.entries(row).find(([name]) => patterns.some((pattern) => pattern.test(name)))?.[1] ?? null;
const numeric = (value) => { const cleaned = String(value ?? "").replace(/[^0-9.-]/gu, ""); if (!cleaned || !/[0-9]/u.test(cleaned)) return null; const number = Number(cleaned); return Number.isFinite(number) ? number : null; };
export function normalizeKdpSales(rows, bookMetadata = {}) {
  return Object.freeze(rows.map((row) => {
    const asin = pick(row, [/asin/iu]); const title = pick(row, [/title/iu]); const units = numeric(pick(row, [/units?/iu, /net.*sold/iu])); const royaltyUsd = numeric(pick(row, [/royalt/iu]));
    const book = bookMetadata[asin] ?? bookMetadata[title] ?? {};
    return Object.freeze({ asin, title, marketplace: pick(row, [/marketplace/iu]), transactionDate: pick(row, [/date/iu]), units, royaltyUsd, niche: book.niche ?? null, book: book.id ?? null, rawUnknown: Object.freeze(Object.fromEntries(Object.entries(row).filter(([, value]) => value === ""))) });
  }));
}

export async function importKdpReport({ path, importedAt = new Date().toISOString(), bookMetadata = {}, ranks = [] }) {
  const extension = extname(path).toLowerCase();
  const sourceBytes = await readFile(path);
  const rows = extension === ".csv" ? parseCsv(await readFile(path, "utf8")) : [".xlsx", ".xlsm"].includes(extension) ? await parseXlsx(path) : (() => { throw new TypeError("KDP report must be CSV or XLSX"); })();
  const content = { type: "KdpSalesFeedback", version: 1, importedAt, source: { name: basename(path), format: extension.slice(1), bytes: sourceBytes.byteLength, sha256: createHash("sha256").update(sourceBytes).digest("hex"), rows: rows.length }, sales: normalizeKdpSales(rows, bookMetadata), ranks };
  const admitted = createTypedMark(kdpFeedbackType, content); if (!admitted.ok) throw new TypeError(admitted.refusal.message); return admitted.value;
}

/** Project our ASINs from addressed market snapshots; missing rank remains null. */
export function ownedRankReadings(snapshots, owned) {
  const readings = [];
  for (const snapshot of snapshots) for (const book of snapshot.content?.books ?? []) if (owned[book.asin]) readings.push(Object.freeze({ asin: book.asin, book: owned[book.asin].id, niche: owned[book.asin].niche, rank: book.rank, observedAt: snapshot.content.observedAt, evidence: snapshot.id }));
  return Object.freeze(readings);
}

export function feedbackForNicheScorer(receipt) {
  const grouped = new Map();
  for (const sale of receipt.content.sales) if (sale.niche && sale.units !== null) grouped.set(sale.niche, (grouped.get(sale.niche) ?? 0) + sale.units);
  return Object.freeze([...grouped].map(([niche, units]) => ({ niche, units, evidence: receipt.id })));
}

export async function writeLaunchReadout({ launchPlanPath, outputPath, feedbackReceipt, writtenAt = new Date().toISOString() }) {
  const plan = JSON.parse(await readFile(launchPlanPath, "utf8"));
  if (plan.type !== "PublicationLaunchPlan") throw new TypeError("launch readout needs a PublicationLaunchPlan");
  const sales = feedbackReceipt.content.sales.filter((row) => row.book === plan.work || row.title === plan.work);
  const readout = { type: "PublicationLaunchReadout", version: 1, work: plan.work, plan: launchPlanPath, writtenAt, evidence: feedbackReceipt.id, measures: { units: sales.some(({ units }) => units !== null) ? sales.reduce((sum, row) => sum + (row.units ?? 0), 0) : null, royaltyUsd: sales.some(({ royaltyUsd }) => royaltyUsd !== null) ? sales.reduce((sum, row) => sum + (row.royaltyUsd ?? 0), 0) : null, ranks: feedbackReceipt.content.ranks.filter((rank) => rank.book === plan.work) }, hypotheses: plan.hypotheses.map(({ id }) => ({ id, reading: "insufficient-evidence" })) };
  const text = `${JSON.stringify(readout, null, 2)}\n`;
  try { await writeFile(outputPath, text, { flag: "wx" }); } catch (error) { if (error?.code !== "EEXIST" || await readFile(outputPath, "utf8") !== text) throw error; }
  return Object.freeze(readout);
}

/** Download through the same persistent Playwright session; live effects remain host-gated. */
export async function acquireKdpReports({ config, downloadDirectory, dataRoot, book, dryRun = true, fixtures = [], now = () => new Date().toISOString() }, { allowLive = false } = {}) {
  if (dryRun) return Object.freeze(fixtures.map(resolve));
  if (!allowLive) throw new Error("live KDP report download is disabled unless the host grants allowLive");
  const { chromium } = await import("playwright"); const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: config.storageState, acceptDownloads: true }); const page = await context.newPage(); await page.goto(`${config.marketplace}/reports`, { waitUntil: "domcontentloaded" });
    if (/captcha|verify (?:it'?s|your) identity|two[- ]factor|2fa|one[- ]time password|sign in|session expired/iu.test(await page.locator("body").innerText())) {
      const error = new Error("KDP report session requires authentication"); error.code = "KDP_NEEDS_HUMAN";
      if (dataRoot && book) error.event = recordNeedsHuman(dataRoot, book, "feedback", "authentication-challenge", now());
      throw error;
    }
    const download = await Promise.all([page.waitForEvent("download"), page.locator('[data-kdp="download-report"]').click()]).then(([value]) => value);
    await mkdir(downloadDirectory, { recursive: true });
    const path = join(downloadDirectory, download.suggestedFilename()); await download.saveAs(path); return Object.freeze([path]);
  } finally { await browser.close(); }
}
