import { moneyFromParts as amount, toDecimalString, toExactString, type Money as Amount } from "@emsenn/relating/economy";
import { bestAsk, bestBid, midpoint, relativeSpread, spread, type OrderBook } from "@red-cup-engineering/gaming/market";

export type FileTouchMarketParams = Readonly<{
  focus?: string | undefined;
  limit?: string | number | undefined;
}>;

export type FileTouchMarketQuote = Readonly<{
  bestBid: string;
  bestAsk: string;
  spread: string;
  midpoint: string;
  relativeSpread: string;
  bid: number;
  ask: number;
  spreadValue: number;
  midpointValue: number;
}>;

export type FileTouchMarketAsset = Readonly<{
  kind: "operations-manifold.file-touch.asset";
  path: string;
  reads: number;
  writes: number;
  touches: number;
  readDemand: number;
  writePressure: number;
  attention: number;
  churn: number;
  regime: "cold" | "watched" | "hot" | "volatile";
  firstTouchedAt: string;
  lastTouchedAt: string;
  traces: readonly string[];
  tools: readonly string[];
  evidence: readonly string[];
  quote: FileTouchMarketQuote;
}>;

export type FileTouchMarket = Readonly<{
  kind: "operations-manifold.file-touch.market";
  generatedAt: string;
  source: "read-operations-ledger";
  pricing: "read demand bids against write pressure ask using @red-cup-engineering/gaming/market exact order-book laws";
  totals: Readonly<{
    files: number;
    reads: number;
    writes: number;
    touches: number;
    hot: number;
    volatile: number;
  }>;
  assets: readonly FileTouchMarketAsset[];
  topAttention: readonly FileTouchMarketAsset[];
  topReadDemand: readonly FileTouchMarketAsset[];
  topWritePressure: readonly FileTouchMarketAsset[];
}>;

export type FileTouchOperationEntry = Readonly<{
  at: string;
  event: "file-read" | "file-write" | string;
  trace: string;
  tool: string | null;
  paths: readonly string[];
  evidence: readonly string[];
  estimatedTokens: number;
  budgetBand: "ok" | "watch" | "over" | "huge";
  score: number;
}>;

export function foldFileTouchMarket(entries: readonly FileTouchOperationEntry[]): FileTouchMarket {
  const touches = entries.filter((entry) => entry.event === "file-read" || entry.event === "file-write");
  const assetsByPath = new Map<string, {
    path: string;
    reads: number;
    writes: number;
    readDemand: number;
    writePressure: number;
    attention: number;
    firstTouchedAt: string;
    lastTouchedAt: string;
    traces: Set<string>;
    tools: Set<string>;
    evidence: string[];
  }>();
  for (const entry of touches) {
    for (const touchedPath of entry.paths) {
      const normalized = normalizeLedgerPath(touchedPath);
      if (normalized === null) continue;
      const existing = assetsByPath.get(normalized) ?? {
        path: normalized,
        reads: 0,
        writes: 0,
        readDemand: 0,
        writePressure: 0,
        attention: 0,
        firstTouchedAt: entry.at,
        lastTouchedAt: entry.at,
        traces: new Set<string>(),
        tools: new Set<string>(),
        evidence: [],
      };
      if (entry.event === "file-read") {
        existing.reads += 1;
        existing.readDemand += fileTouchWeight(entry);
      } else {
        existing.writes += 1;
        existing.writePressure += fileTouchWeight(entry) * 2;
      }
      existing.attention += fileTouchWeight(entry);
      if (entry.at < existing.firstTouchedAt) existing.firstTouchedAt = entry.at;
      if (entry.at > existing.lastTouchedAt) existing.lastTouchedAt = entry.at;
      existing.traces.add(entry.trace);
      if (entry.tool !== null) existing.tools.add(entry.tool);
      existing.evidence.push(...entry.evidence);
      assetsByPath.set(normalized, existing);
    }
  }
  const assets = [...assetsByPath.values()]
    .map(fileTouchAsset)
    .sort(fileTouchAssetOrder);
  return Object.freeze({
    kind: "operations-manifold.file-touch.market" as const,
    generatedAt: new Date().toISOString(),
    source: "read-operations-ledger" as const,
    pricing: "read demand bids against write pressure ask using @red-cup-engineering/gaming/market exact order-book laws" as const,
    totals: totalsFor(assets),
    assets: Object.freeze(assets),
    topAttention: Object.freeze(assets.slice(0, 24)),
    topReadDemand: Object.freeze([...assets].sort((left, right) => right.readDemand - left.readDemand || fileTouchAssetOrder(left, right)).slice(0, 24)),
    topWritePressure: Object.freeze([...assets].sort((left, right) => right.writePressure - left.writePressure || fileTouchAssetOrder(left, right)).slice(0, 24)),
  });
}

export function projectFileTouchMarket(market: FileTouchMarket, params: FileTouchMarketParams): FileTouchMarket {
  const focus = optionalText(params.focus);
  const limit = marketLimit(params.limit);
  const assets = market.assets
    .filter((asset) => focus === null || asset.path.includes(focus))
    .slice(0, limit);
  return Object.freeze({
    ...market,
    totals: totalsFor(assets),
    assets: Object.freeze(assets),
    topAttention: Object.freeze(assets.slice(0, limit)),
    topReadDemand: Object.freeze([...assets].sort((left, right) => right.readDemand - left.readDemand || fileTouchAssetOrder(left, right)).slice(0, limit)),
    topWritePressure: Object.freeze([...assets].sort((left, right) => right.writePressure - left.writePressure || fileTouchAssetOrder(left, right)).slice(0, limit)),
  });
}

function fileTouchAsset(input: {
  path: string;
  reads: number;
  writes: number;
  readDemand: number;
  writePressure: number;
  attention: number;
  firstTouchedAt: string;
  lastTouchedAt: string;
  traces: Set<string>;
  tools: Set<string>;
  evidence: string[];
}): FileTouchMarketAsset {
  const touches = input.reads + input.writes;
  const churn = input.writes === 0 ? 0 : roundRatio(input.writes, touches);
  const quote = fileTouchQuote(input);
  return Object.freeze({
    kind: "operations-manifold.file-touch.asset" as const,
    path: input.path,
    reads: input.reads,
    writes: input.writes,
    touches,
    readDemand: input.readDemand,
    writePressure: input.writePressure,
    attention: input.attention,
    churn,
    regime: fileTouchRegime(input.reads, input.writes, input.attention),
    firstTouchedAt: input.firstTouchedAt,
    lastTouchedAt: input.lastTouchedAt,
    traces: Object.freeze([...input.traces].sort().slice(0, 12)),
    tools: Object.freeze([...input.tools].sort().slice(0, 12)),
    evidence: Object.freeze([...new Set(input.evidence)].slice(0, 12)),
    quote,
  });
}

function fileTouchQuote(input: { reads: number; writes: number; readDemand: number; writePressure: number }): FileTouchMarketQuote {
  const bidPrice = Math.max(1, input.readDemand + input.reads);
  const askPrice = bidPrice + Math.max(1, input.writePressure + input.writes);
  const book: OrderBook = Object.freeze({
    bids: Object.freeze([{ price: amount(BigInt(bidPrice), 1n, "file-attention"), quantity: amount(BigInt(Math.max(1, input.reads)), 1n, "file-touch") }]),
    asks: Object.freeze([{ price: amount(BigInt(askPrice), 1n, "file-attention"), quantity: amount(BigInt(Math.max(1, input.writes)), 1n, "file-touch") }]),
  });
  const bid = bestBid(book)?.price ?? amount(0n, 1n, "file-attention");
  const ask = bestAsk(book)?.price ?? amount(0n, 1n, "file-attention");
  const quotedSpread = spread(book) ?? amount(0n, 1n, "file-attention");
  const quotedMidpoint = midpoint(book) ?? amount(0n, 1n, "file-attention");
  const quotedRelativeSpread = relativeSpread(book);
  return Object.freeze({
    bestBid: toExactString(bid),
    bestAsk: toExactString(ask),
    spread: toExactString(quotedSpread),
    midpoint: toExactString(quotedMidpoint),
    relativeSpread: quotedRelativeSpread === undefined ? "0/1" : `${quotedRelativeSpread.num}/${quotedRelativeSpread.den}`,
    bid: amountToNumber(bid),
    ask: amountToNumber(ask),
    spreadValue: amountToNumber(quotedSpread),
    midpointValue: amountToNumber(quotedMidpoint),
  });
}

function totalsFor(assets: readonly FileTouchMarketAsset[]): FileTouchMarket["totals"] {
  return Object.freeze({
    files: assets.length,
    reads: assets.reduce((sum, item) => sum + item.reads, 0),
    writes: assets.reduce((sum, item) => sum + item.writes, 0),
    touches: assets.reduce((sum, item) => sum + item.touches, 0),
    hot: assets.filter((item) => item.regime === "hot").length,
    volatile: assets.filter((item) => item.regime === "volatile").length,
  });
}

function fileTouchWeight(entry: FileTouchOperationEntry): number {
  return Math.max(1, entry.score + Math.ceil(entry.estimatedTokens / 1000) + (entry.budgetBand === "over" || entry.budgetBand === "huge" ? 8 : 0));
}

function fileTouchRegime(reads: number, writes: number, attention: number): FileTouchMarketAsset["regime"] {
  if (writes >= 3 || writes >= reads) return "volatile";
  if (attention >= 120 || reads >= 5) return "hot";
  if (reads + writes >= 2) return "watched";
  return "cold";
}

function fileTouchAssetOrder(left: FileTouchMarketAsset, right: FileTouchMarketAsset): number {
  return right.attention - left.attention || right.touches - left.touches || left.path.localeCompare(right.path);
}

function normalizeLedgerPath(value: string): string | null {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//u, "");
  if (normalized === "" || normalized.startsWith("/tmp/")) return null;
  return normalized;
}

function amountToNumber(value: Amount): number {
  return Number(toDecimalString(value));
}

function roundRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function optionalText(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function marketLimit(value: string | number | undefined): number {
  const parsed = value === undefined ? 24 : Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}
