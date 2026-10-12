import {
  bestAsk,
  bestBid,
  midpoint,
  moneyFromParts as amount,
  relativeSpread,
  spread,
  toDecimalString,
  toExactString,
} from "@red-cup-engineering/gaming/market";

export function foldFileTouchMarket(entries, options = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const generatedAt = requiredText(options.generatedAt, "generatedAt");
  const assetsByPath = new Map();
  for (const entry of entries.filter((item) => item.event === "file-read" || item.event === "file-write")) {
    for (const touchedPath of Array.isArray(entry.paths) ? entry.paths : []) {
      const normalized = normalizeLedgerPath(touchedPath);
      if (normalized === null) continue;
      const current = assetsByPath.get(normalized) ?? {
        path: normalized, reads: 0, writes: 0, readDemand: 0, writePressure: 0,
        attention: 0, firstTouchedAt: entry.at, lastTouchedAt: entry.at,
        traces: new Set(), tools: new Set(), evidence: [],
      };
      const weight = fileTouchWeight(entry);
      if (entry.event === "file-read") { current.reads += 1; current.readDemand += weight; }
      else { current.writes += 1; current.writePressure += weight * 2; }
      current.attention += weight;
      if (entry.at < current.firstTouchedAt) current.firstTouchedAt = entry.at;
      if (entry.at > current.lastTouchedAt) current.lastTouchedAt = entry.at;
      if (typeof entry.trace === "string") current.traces.add(entry.trace);
      if (typeof entry.tool === "string") current.tools.add(entry.tool);
      if (Array.isArray(entry.evidence)) current.evidence.push(...entry.evidence.filter((value) => typeof value === "string"));
      assetsByPath.set(normalized, current);
    }
  }
  const assets = [...assetsByPath.values()].map(fileTouchAsset).sort(fileTouchAssetOrder);
  return Object.freeze({
    kind: "file-touch-market.projection",
    generatedAt,
    source: "explicit-operation-entries",
    pricing: "read demand bids against write pressure ask using exact order-book laws",
    totals: totalsFor(assets),
    assets: Object.freeze(assets),
    topAttention: Object.freeze(assets.slice(0, 24)),
    topReadDemand: topBy(assets, "readDemand", 24),
    topWritePressure: topBy(assets, "writePressure", 24),
  });
}

export function projectFileTouchMarket(market, params = {}) {
  const focus = optionalText(params.focus);
  const limit = marketLimit(params.limit);
  const assets = market.assets.filter((asset) => focus === null || asset.path.includes(focus)).slice(0, limit);
  return Object.freeze({
    ...market,
    totals: totalsFor(assets),
    assets: Object.freeze(assets),
    topAttention: Object.freeze(assets.slice(0, limit)),
    topReadDemand: topBy(assets, "readDemand", limit),
    topWritePressure: topBy(assets, "writePressure", limit),
  });
}

function fileTouchAsset(input) {
  const touches = input.reads + input.writes;
  return Object.freeze({
    kind: "file-touch-market.asset",
    path: input.path,
    reads: input.reads,
    writes: input.writes,
    touches,
    readDemand: input.readDemand,
    writePressure: input.writePressure,
    attention: input.attention,
    churn: input.writes === 0 ? 0 : roundRatio(input.writes, touches),
    regime: fileTouchRegime(input.reads, input.writes, input.attention),
    firstTouchedAt: input.firstTouchedAt,
    lastTouchedAt: input.lastTouchedAt,
    traces: Object.freeze([...input.traces].sort().slice(0, 12)),
    tools: Object.freeze([...input.tools].sort().slice(0, 12)),
    evidence: Object.freeze([...new Set(input.evidence)].slice(0, 12)),
    quote: fileTouchQuote(input),
  });
}

function fileTouchQuote(input) {
  const bidPrice = Math.max(1, input.readDemand + input.reads);
  const askPrice = bidPrice + Math.max(1, input.writePressure + input.writes);
  const book = Object.freeze({
    bids: Object.freeze([{ price: amount(BigInt(bidPrice), 1n, "file-attention"), quantity: amount(BigInt(Math.max(1, input.reads)), 1n, "file-touch") }]),
    asks: Object.freeze([{ price: amount(BigInt(askPrice), 1n, "file-attention"), quantity: amount(BigInt(Math.max(1, input.writes)), 1n, "file-touch") }]),
  });
  const bid = bestBid(book)?.price ?? amount(0n, 1n, "file-attention");
  const ask = bestAsk(book)?.price ?? amount(0n, 1n, "file-attention");
  const quotedSpread = spread(book) ?? amount(0n, 1n, "file-attention");
  const quotedMidpoint = midpoint(book) ?? amount(0n, 1n, "file-attention");
  const quotedRelativeSpread = relativeSpread(book);
  return Object.freeze({
    bestBid: toExactString(bid), bestAsk: toExactString(ask), spread: toExactString(quotedSpread),
    midpoint: toExactString(quotedMidpoint),
    relativeSpread: quotedRelativeSpread === undefined ? "0/1" : `${quotedRelativeSpread.num}/${quotedRelativeSpread.den}`,
    bid: Number(toDecimalString(bid)), ask: Number(toDecimalString(ask)),
    spreadValue: Number(toDecimalString(quotedSpread)), midpointValue: Number(toDecimalString(quotedMidpoint)),
  });
}

function totalsFor(assets) {
  return Object.freeze({
    files: assets.length,
    reads: assets.reduce((sum, item) => sum + item.reads, 0),
    writes: assets.reduce((sum, item) => sum + item.writes, 0),
    touches: assets.reduce((sum, item) => sum + item.touches, 0),
    hot: assets.filter((item) => item.regime === "hot").length,
    volatile: assets.filter((item) => item.regime === "volatile").length,
  });
}

function topBy(assets, property, limit) {
  return Object.freeze([...assets].sort((left, right) => right[property] - left[property] || fileTouchAssetOrder(left, right)).slice(0, limit));
}
function fileTouchWeight(entry) {
  const score = Number.isFinite(entry.score) ? entry.score : 0;
  const estimatedTokens = Number.isFinite(entry.estimatedTokens) ? entry.estimatedTokens : 0;
  return Math.max(1, score + Math.ceil(estimatedTokens / 1000) + (["over", "huge"].includes(entry.budgetBand) ? 8 : 0));
}
function fileTouchRegime(reads, writes, attention) {
  if (writes >= 3 || writes >= reads) return "volatile";
  if (attention >= 120 || reads >= 5) return "hot";
  return reads + writes >= 2 ? "watched" : "cold";
}
function fileTouchAssetOrder(left, right) { return right.attention - left.attention || right.touches - left.touches || left.path.localeCompare(right.path); }
function normalizeLedgerPath(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//u, "");
  return normalized === "" || normalized.startsWith("/tmp/") ? null : normalized;
}
function roundRatio(numerator, denominator) { return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 1000; }
function optionalText(value) { const text = value === undefined ? "" : String(value).trim(); return text === "" ? null : text; }
function requiredText(value, name) { const text = optionalText(value); if (text === null) throw new TypeError(`${name} must be a nonempty string`); return text; }
function marketLimit(value) { const parsed = value === undefined ? 24 : Number(value); return Number.isFinite(parsed) ? Math.max(1, Math.min(200, Math.trunc(parsed))) : 24; }
