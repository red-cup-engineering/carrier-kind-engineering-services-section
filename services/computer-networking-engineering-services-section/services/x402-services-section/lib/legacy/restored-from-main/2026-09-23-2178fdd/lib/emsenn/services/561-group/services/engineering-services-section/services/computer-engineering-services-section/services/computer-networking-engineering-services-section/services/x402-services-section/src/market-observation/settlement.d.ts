export interface RangeMeasurement {
  readonly ok: true; readonly fromBlock: number; readonly toBlock: number; readonly blocks: number;
  readonly authorizations: number; readonly distinctAuthorizers: number; readonly authorizers: readonly string[];
  readonly rangeObservation: true;
  readonly provenance: { readonly chainId: number; readonly verificationBoundary: object; readonly providerId: string;
    readonly endpoint: string; readonly attempts: readonly object[]; readonly failures: readonly object[] };
}
export interface Failure { readonly ok: false; readonly reason: string; readonly fromBlock?: number; readonly toBlock?: number }
export interface SettlementObservation {
  readonly ok: true; readonly asset: string;
  readonly measured: RangeMeasurement;
  readonly authorizers: readonly string[];
  readonly extrapolated: { readonly dayFactor: number; readonly monthFactor: number;
    readonly authorizationsPerDay: number; readonly authorizationsPer30Days: number; readonly basis: string };
  readonly caveat: string;
}
export interface CatalogAuthorizationProjection {
  readonly available: boolean; readonly catalogCalls: number; readonly sampleDerivedAuthorizationProjection: number;
  readonly catalogCallsPerAuthorizationProjection?: number; readonly reason?: string; readonly note?: string;
}
export declare const BASE_USDC: string;
export declare const AUTHORIZATION_USED_TOPIC: string;
export declare const BASE_BLOCKS_PER_DAY: number;
export declare function authorizerOf(log: { topics?: readonly string[] }): string | null;
export declare function measureRange(input: { readPool?: object; fromBlock: number; toBlock: number; asset?: string }): Promise<RangeMeasurement | Failure>;
export declare function chainTip(input: { readPool?: object }): Promise<{ ok: true; value: number; provenance: object } | { ok: false; reason: string }>;
export declare function observeSettlement(input: { readPool?: object; windowBlocks?: number; asset?: string; blocksPerDay?: number }): Promise<SettlementObservation | Failure>;
export declare function catalogAuthorizationProjection(input: { catalogCalls: number; sampleDerivedAuthorizationProjection: number }): CatalogAuthorizationProjection;
