import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { acquirePublicWebSources } from "@causeway-services/web-source-acquisition/acquire";
import { admitKindleMarketSnapshot, analyzeKindleMarket } from "@red-cup-engineering/business-research-system-services-section/kindle-market";

const USER_AGENT = "Koios-Source-Acquisition";
const AMAZON = /(^|\.)amazon\.(com|ca|co\.uk|com\.au)$/u;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function amazonUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !AMAZON.test(url.hostname.toLowerCase())) throw new TypeError(`Kindle market source must be an HTTPS Amazon marketplace URL: ${value}`);
  return url;
}

export function robotsAllows(robotsText, target, userAgent = USER_AGENT) {
  const path = new URL(target).pathname;
  let applies = false;
  const rules = [];
  for (const raw of String(robotsText).split(/\r?\n/u)) {
    const line = raw.replace(/#.*/u, "").trim();
    const [name, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (name?.trim().toLowerCase() === "user-agent") { applies = value === "*" || userAgent.toLowerCase().includes(value.toLowerCase()); continue; }
    if (applies && ["allow", "disallow"].includes(name?.trim().toLowerCase()) && value) rules.push({ allow: name.trim().toLowerCase() === "allow", path: value });
  }
  const matching = rules.filter((rule) => path.startsWith(rule.path)).sort((left, right) => right.path.length - left.path.length);
  return matching[0]?.allow ?? true;
}

export async function acquireOne(url, at, acquire, io) {
  const delivery = await acquire({
    purpose: "commercial-market-research", representation: "bounded-source-markup", urls: [url],
    ceilings: { maximumSources: 1, maximumBytesPerSource: 2_000_000, maximumTextCharacters: 100_000 },
  }, at, io);
  if (delivery.status !== "settled" || delivery.results.length !== 1) throw new Error(delivery.obstructions?.[0]?.reason ?? "market source acquisition was not delivered");
  return delivery.results[0];
}

export async function writeMarketSnapshot(dataRoot, cell) {
  const directory = join(dataRoot, "snapshots");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${cell.id.replace("ni:///sha-256;", "")}.json`);
  try { await writeFile(path, `${JSON.stringify(cell, null, 2)}\n`, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error?.code !== "EEXIST") throw error; }
  return path;
}

async function writeMarketAnalysis(dataRoot, cell) {
  const directory = join(dataRoot, "analyses"); await mkdir(directory, { recursive: true });
  const path = join(directory, `${cell.id.replace("ni:///sha-256;", "")}.json`);
  try { await writeFile(path, `${JSON.stringify(cell, null, 2)}\n`, { flag: "wx", mode: 0o600 }); } catch (error) { if (error?.code !== "EEXIST") throw error; }
  return path;
}

/** Monitor and analyze Kindle categories through the existing bounded Web acquisition service. */
export async function acquireKindleMarketSnapshots({ categories, dataRoot, observedAt = new Date().toISOString(), policy, demands = [], feedback = [] }, capabilities = {}) {
  if (!Array.isArray(categories) || categories.length === 0) throw new TypeError("at least one Kindle category source is required");
  if (!dataRoot) throw new TypeError("market acquisition dataRoot is required");
  if (typeof policy?.termsBasis !== "string" || !policy.termsBasis || policy.permission !== "permitted" || !/^\d{4}-\d{2}-\d{2}/u.test(policy.reviewedAt ?? "") || !Number.isInteger(policy.minimumIntervalMs) || policy.minimumIntervalMs < 5_000) {
    throw new TypeError("market policy needs a dated terms review, permission=permitted, and minimumIntervalMs of at least 5000");
  }
  const acquire = capabilities.acquire ?? acquirePublicWebSources;
  const sleep = capabilities.sleep ?? delay;
  const io = capabilities.io ?? {};
  const robotsByOrigin = new Map();
  const snapshots = [], obstructions = [];
  for (const [index, category] of categories.entries()) {
    const url = amazonUrl(category.url);
    try {
      let robots = robotsByOrigin.get(url.origin);
      if (!robots) {
        robots = await acquireOne(`${url.origin}/robots.txt`, observedAt, acquire, io);
        robotsByOrigin.set(url.origin, robots);
        await sleep(policy.minimumIntervalMs);
      }
      if (!robotsAllows(robots.text, url.href)) { obstructions.push({ category: category.id, code: "robots-disallowed", source: url.href }); continue; }
      const source = await acquireOne(url.href, observedAt, acquire, io);
      const cell = admitKindleMarketSnapshot({ category: category.id, source: { requestedUrl: source.requestedUrl, finalUrl: source.finalUrl, textDigest: source.textDigest, responseDigest: source.responseDigest, rights: source.rights }, observedAt, html: source.markup ?? source.text });
      await writeMarketSnapshot(dataRoot, cell);
      snapshots.push(cell);
      if (index < categories.length - 1) await sleep(policy.minimumIntervalMs);
    } catch (error) { obstructions.push({ category: category.id, code: "acquisition-obstructed", reason: String(error?.message ?? error) }); }
  }
  const analysis = snapshots.length ? analyzeKindleMarket({ snapshots, demands, feedback, analyzedAt: observedAt }) : null;
  if (analysis) await writeMarketAnalysis(dataRoot, analysis);
  return Object.freeze({ type: "KindleMarketMonitorResult", version: 1, observedAt, snapshots: Object.freeze(snapshots), analysis, opportunities: analysis?.content.opportunities ?? Object.freeze([]), obstructions: Object.freeze(obstructions), policy: Object.freeze({ termsBasis: policy.termsBasis, permission: policy.permission, reviewedAt: policy.reviewedAt, minimumIntervalMs: policy.minimumIntervalMs }) });
}
