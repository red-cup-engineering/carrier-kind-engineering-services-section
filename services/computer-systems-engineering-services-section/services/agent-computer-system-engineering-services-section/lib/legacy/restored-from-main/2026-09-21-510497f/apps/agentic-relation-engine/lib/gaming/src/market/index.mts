/**
 * Market microstructure as gaming law.
 *
 * A limit order book is a small concurrent game surface: bids and asks expose
 * playable liquidity, and a marketable order walks the available side until it
 * is exhausted or the book runs dry. This module owns the reusable order-book
 * mechanics; financial/product packages may name the venue, but the game-shaped
 * book walk belongs to gaming.
 */
import {
  addMoney,
  admitMoney,
  cmpMoney,
  commodityOf,
  moneyFromParts,
  moneyZero,
  ratioOf,
  scaleMoney,
  subMoney,
  timesMoney,
  type Money,
} from "./economy.mjs";

export * from "./economy.mjs";

const oneHalf = Object.freeze({ num: 1n, den: 2n });
const signMoney = (value: Money): -1 | 0 | 1 => cmpMoney(value, moneyZero(commodityOf(value)));

/** One price level of an order book. */
export interface BookLevel {
  /** Quote commodity per one unit of base. */
  readonly price: Money;
  /** Available size at this price, in the base commodity. */
  readonly quantity: Money;
}

/** An order book snapshot. Sides may arrive unsorted; the laws sort copies. */
export interface OrderBook {
  readonly bids: readonly BookLevel[];
  readonly asks: readonly BookLevel[];
}

const asBookRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label}: expected an object`);
  }
  return value as Record<string, unknown>;
};

const admitLevel = (value: unknown, label: string): BookLevel => {
  const record = asBookRecord(value, label);
  const keys = Object.keys(record);
  if (keys.length !== 2 || keys.some((key) => key !== "price" && key !== "quantity")) {
    throw new TypeError(`${label}: expected exactly price, quantity`);
  }
  return Object.freeze({
    price: admitMoney(record.price, `${label}.price`),
    quantity: admitMoney(record.quantity, `${label}.quantity`),
  });
};

/** Admit an order-book snapshot from JSON and reconstruct its exact money carriers. */
export function admitOrderBook(value: unknown, label = "order book"): OrderBook {
  const record = asBookRecord(value, label);
  const keys = Object.keys(record);
  if (keys.length !== 2 || keys.some((key) => key !== "bids" && key !== "asks")) {
    throw new TypeError(`${label}: expected exactly bids, asks`);
  }
  if (!Array.isArray(record.bids) || !Array.isArray(record.asks)) {
    throw new TypeError(`${label}: bids and asks must be arrays`);
  }
  const book = Object.freeze({
    bids: Object.freeze(record.bids.map((level, index) => admitLevel(level, `${label}.bids[${index}]`))),
    asks: Object.freeze(record.asks.map((level, index) => admitLevel(level, `${label}.asks[${index}]`))),
  });
  assertBookCoherent(book);
  return book;
}

function assertSideCoherent(side: readonly BookLevel[], label: string): void {
  const first = side[0];
  if (first === undefined) return;
  for (const level of side) {
    if (commodityOf(level.price) !== commodityOf(first.price)) {
      throw new TypeError(`gaming.market: mixed price commodities in ${label}`);
    }
    if (commodityOf(level.quantity) !== commodityOf(first.quantity)) {
      throw new TypeError(`gaming.market: mixed quantity commodities in ${label}`);
    }
    if (signMoney(level.quantity) < 0 || signMoney(level.price) < 0) {
      throw new RangeError(`gaming.market: negative price or quantity in ${label}`);
    }
  }
}

function assertBookCoherent(book: OrderBook): void {
  assertSideCoherent(book.bids, "bids");
  assertSideCoherent(book.asks, "asks");
  const bid = book.bids[0];
  const ask = book.asks[0];
  if (bid === undefined || ask === undefined) return;
  if (commodityOf(bid.price) !== commodityOf(ask.price)) {
    throw new TypeError("gaming.market: bid and ask price commodities differ");
  }
  if (commodityOf(bid.quantity) !== commodityOf(ask.quantity)) {
    throw new TypeError("gaming.market: bid and ask quantity commodities differ");
  }
}

function sortedAsks(book: OrderBook): readonly BookLevel[] {
  assertSideCoherent(book.asks, "asks");
  return [...book.asks].sort((a, b) => cmpMoney(a.price, b.price));
}

function sortedBids(book: OrderBook): readonly BookLevel[] {
  assertSideCoherent(book.bids, "bids");
  return [...book.bids].sort((a, b) => cmpMoney(b.price, a.price));
}

/** The highest bid level, if any. */
export function bestBid(book: OrderBook): BookLevel | undefined {
  return sortedBids(book)[0];
}

/** The lowest ask level, if any. */
export function bestAsk(book: OrderBook): BookLevel | undefined {
  return sortedAsks(book)[0];
}

/** Exact spread, best ask minus best bid, absent when either side is empty. */
export function spread(book: OrderBook): Money | undefined {
  const bid = bestBid(book);
  const ask = bestAsk(book);
  if (bid === undefined || ask === undefined) return undefined;
  return subMoney(ask.price, bid.price);
}

/** Exact midpoint, average of best bid and best ask. */
export function midpoint(book: OrderBook): Money | undefined {
  const bid = bestBid(book);
  const ask = bestAsk(book);
  if (bid === undefined || ask === undefined) return undefined;
  return scaleMoney(addMoney(bid.price, ask.price), oneHalf);
}

/** Spread over midpoint as a dimensionless exact ratio. */
export function relativeSpread(book: OrderBook): { readonly num: bigint; readonly den: bigint } | undefined {
  const s = spread(book);
  const m = midpoint(book);
  if (s === undefined || m === undefined) return undefined;
  if (signMoney(m) === 0) return undefined;
  return ratioOf(s, m);
}

/** The outcome of walking one side of a book with a marketable order. */
export interface BookWalk {
  /** Base quantity actually filled. */
  readonly filled: Money;
  /** Quote spent by a buy, or received by a sell. */
  readonly cost: Money;
  /** Base quantity left unfilled; positive means the book was too thin. */
  readonly shortfall: Money;
  /** Exact average price, absent when nothing filled. */
  readonly averagePrice?: Money;
}

function walk(levels: readonly BookLevel[], baseQuantity: Money): BookWalk {
  if (signMoney(baseQuantity) < 0) {
    throw new RangeError("gaming.market: negative walk quantity");
  }
  const first = levels[0];
  const baseCommodity = commodityOf(baseQuantity);
  const quoteCommodity = first === undefined ? baseCommodity : commodityOf(first.price);
  let remaining = baseQuantity;
  let filled = moneyZero(baseCommodity);
  let cost = moneyZero(quoteCommodity);
  for (const level of levels) {
    if (signMoney(remaining) === 0) break;
    if (commodityOf(level.quantity) !== baseCommodity) {
      throw new TypeError(
        `gaming.market: walk quantity commodity ${baseCommodity} does not match book base ${commodityOf(level.quantity)}`,
      );
    }
    const take = cmpMoney(remaining, level.quantity) <= 0 ? remaining : level.quantity;
    filled = addMoney(filled, take);
    cost = addMoney(cost, timesMoney(level.price, take, commodityOf(level.price)));
    remaining = subMoney(remaining, take);
  }
  const averagePrice = signMoney(filled) === 0
    ? undefined
    : (() => {
        const ratio = ratioOf(cost, filled);
        return moneyFromParts(ratio.num, ratio.den, commodityOf(cost));
      })();
  return Object.freeze({
    filled,
    cost,
    shortfall: remaining,
    ...(averagePrice !== undefined ? { averagePrice } : {}),
  });
}

/** Walk the asks with a market buy of `baseQuantity`. */
export function marketBuyWalk(book: OrderBook, baseQuantity: Money): BookWalk {
  return walk(sortedAsks(book), baseQuantity);
}

/** Walk the bids with a market sell of `baseQuantity`. */
export function marketSellWalk(book: OrderBook, baseQuantity: Money): BookWalk {
  return walk(sortedBids(book), baseQuantity);
}

export * from "./arena.mjs";
