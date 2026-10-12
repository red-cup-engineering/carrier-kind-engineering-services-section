import type { BazaarItem, Catalog } from "./discovery.d.ts";
export interface EntryPrice { readonly raw: string; readonly asset: string | null; readonly network: string | null; readonly scheme: string | null; readonly assumedDecimals: number }
export interface Summary {
  readonly resource: string | null; readonly description: string | null;
  readonly calls: number; readonly payers: number; readonly callsPerPayer: number | null;
  readonly concentrated: boolean; readonly price: EntryPrice | null;
  readonly priceDecimal: string | null; readonly estimatedRevenue: string | null;
  readonly lastCalledAt: string | null; readonly live: boolean;
}
export declare function entryPrice(item: BazaarItem): EntryPrice | null;
export declare function priceDecimal(price: EntryPrice | null): string | null;
export declare function summarize(item: BazaarItem): Summary;
export declare function demandRanked(catalog: Catalog, options?: { limit?: number; minPayers?: number }): Summary[];
export declare function priceDistribution(catalog: Catalog, options?: { onlyLive?: boolean }): Record<string, number>;
export declare function demandByCategory(catalog: Catalog, categories: Record<string, readonly string[]>): Record<string, unknown>;
export declare function catalogTotals(catalog: Catalog): Record<string, unknown>;
