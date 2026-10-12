export interface BazaarAccept {
  readonly amount?: string; readonly asset?: string; readonly network?: string;
  readonly payTo?: string; readonly scheme?: string; readonly maxTimeoutSeconds?: number;
  readonly extra?: Record<string, unknown>;
}
export interface BazaarQuality {
  readonly l30DaysTotalCalls?: number; readonly l30DaysUniquePayers?: number; readonly lastCalledAt?: string;
}
export interface BazaarItem {
  readonly resource?: string; readonly description?: string; readonly type?: string;
  readonly accepts?: readonly BazaarAccept[]; readonly quality?: BazaarQuality;
  readonly extensions?: Record<string, unknown>; readonly lastUpdated?: string; readonly x402Version?: number;
}
export interface Catalog {
  readonly items: readonly BazaarItem[]; readonly total: number | null;
  readonly failures: readonly { offset: number; reason: string }[];
  readonly complete: boolean; readonly note: string;
}
export interface FindResult {
  /** true, false, or null when the catalog could not be fully read. Never coerce null to false. */
  readonly listed: boolean | null;
  readonly matches: readonly BazaarItem[];
  readonly checked: number; readonly complete: boolean; readonly reason?: string;
}
export declare const BAZAAR_URL: string;
export declare const MAX_PAGE: number;
export declare function fetchPage(options?: { offset?: number; limit?: number; fetchImpl?: typeof fetch; url?: string; timeoutMs?: number }): Promise<{ ok: true; items: BazaarItem[]; total: number | null; offset: number } | { ok: false; reason: string; offset: number }>;
export declare function fetchCatalog(options?: { fetchImpl?: typeof fetch; url?: string; maxPages?: number; timeoutMs?: number }): Promise<Catalog>;
export declare function resourceOrigin(item: BazaarItem): string | null;
export declare function findResource(catalog: Catalog, host: string): FindResult;
export declare function searchResources(catalog: Catalog, terms: string | readonly string[]): BazaarItem[];
