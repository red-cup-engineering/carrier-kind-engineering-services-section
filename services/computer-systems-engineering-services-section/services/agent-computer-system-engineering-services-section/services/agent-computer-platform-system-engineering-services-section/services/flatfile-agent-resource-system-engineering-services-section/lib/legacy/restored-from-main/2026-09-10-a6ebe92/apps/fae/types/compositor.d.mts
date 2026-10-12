import type { Diagnostic, PredicationCell, Provider } from "./provider.d.mts";
export interface ResourceMembership { readonly provider: string; readonly resource: string; readonly focus: string; readonly observedAt: string; readonly cellCount: number }
export interface ProviderReport { readonly provider: string; readonly status: "observed" | "failed"; readonly resources: number; readonly cells: number }
export interface Composition {
  readonly store: { readonly values: Map<string, unknown>; readonly order: readonly PredicationCell[]; readonly identityKey: (cell: PredicationCell) => string };
  readonly cells: readonly PredicationCell[];
  readonly resources: readonly ResourceMembership[];
  readonly providers: readonly ProviderReport[];
  readonly diagnostics: readonly Diagnostic[];
  readonly origins: Map<string, readonly { readonly provider: string; readonly resource: string }[]>;
  readonly relationWeb: {
    query(pattern?: Partial<PredicationCell>): readonly RelationObservation[];
    neighbors(term: string, options?: { direction?: "incoming" | "outgoing" | "both"; predicate?: string }): RelationNeighborhood;
    events(): readonly unknown[];
  };
}
export interface RelationObservation extends PredicationCell {
  readonly kind: "drew.relation-observation";
  readonly address: string;
  readonly eventId: string;
  readonly source: { readonly kind: "fae.provider-resource-observation"; readonly provider: string; readonly resource: string; readonly focus: string; readonly observedAt: string };
}
export interface SerializedComposition {
  readonly resources: readonly ResourceMembership[];
  readonly providers: readonly ProviderReport[];
  readonly diagnostics: readonly Diagnostic[];
  readonly cells: readonly (PredicationCell & {
    readonly reading: "BOT" | "T" | "F" | "TOP";
    readonly designated: boolean;
    readonly origins: readonly { readonly provider: string; readonly resource: string }[];
  })[];
}
export interface RelationNeighborhood { readonly kind: "drew.neighborhood-observation"; readonly term: string; readonly incoming: readonly RelationObservation[]; readonly outgoing: readonly RelationObservation[] }
export const FARS_PROVIDED_BY: string;
export const FARS_OBSERVED_AT: string;
export const FARS_FOCUS: string;
export function cellKey(cell: PredicationCell): string;
export function composeProviders<Context>(providers: readonly Provider<Context>[], options?: { context?: Context; onProviderError?: "throw" | "diagnose" }): Promise<Composition>;
export function originsOf(composition: Composition, cell: PredicationCell): readonly { readonly provider: string; readonly resource: string }[];
export function queryRelations(composition: Composition, pattern?: Partial<PredicationCell>): readonly RelationObservation[];
export function queryDesignatedRelations(composition: Composition, pattern?: Partial<PredicationCell>): readonly PredicationCell[];
export function neighborhoodOf(composition: Composition, term: string, options?: { direction?: "incoming" | "outgoing" | "both"; predicate?: string }): RelationNeighborhood;
export function serializeComposition(composition: Composition): SerializedComposition;
