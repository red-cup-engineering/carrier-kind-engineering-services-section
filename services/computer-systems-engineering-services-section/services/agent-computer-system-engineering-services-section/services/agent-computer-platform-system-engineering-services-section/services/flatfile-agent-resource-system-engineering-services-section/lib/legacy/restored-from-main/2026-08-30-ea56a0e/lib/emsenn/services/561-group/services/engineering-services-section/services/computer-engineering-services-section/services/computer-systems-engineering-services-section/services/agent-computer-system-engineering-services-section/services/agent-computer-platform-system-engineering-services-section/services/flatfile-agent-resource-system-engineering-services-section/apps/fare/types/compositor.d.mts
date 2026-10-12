import type { Diagnostic, PredicationCell, Provider } from "./provider.d.mts";
export interface ResourceMembership { readonly provider: string; readonly resource: string; readonly focus: string; readonly observedAt: string; readonly cellCount: number }
export interface ProviderReport { readonly provider: string; readonly status: "observed" | "failed"; readonly resources: number; readonly cells: number }
export interface Composition {
  readonly store: { readonly values: Map<string, unknown>; readonly order: readonly PredicationCell[] };
  readonly cells: readonly PredicationCell[];
  readonly resources: readonly ResourceMembership[];
  readonly providers: readonly ProviderReport[];
  readonly diagnostics: readonly Diagnostic[];
  readonly origins: Map<string, readonly { readonly provider: string; readonly resource: string }[]>;
}
export const FARS_PROVIDED_BY: string;
export const FARS_OBSERVED_AT: string;
export const FARS_FOCUS: string;
export function cellKey(cell: PredicationCell): string;
export function composeProviders<Context>(providers: readonly Provider<Context>[], options?: { context?: Context; onProviderError?: "throw" | "diagnose" }): Promise<Composition>;
export function originsOf(composition: Composition, cell: PredicationCell): readonly { readonly provider: string; readonly resource: string }[];
export function serializeComposition(composition: Composition): { readonly resources: readonly ResourceMembership[]; readonly providers: readonly ProviderReport[]; readonly diagnostics: readonly Diagnostic[]; readonly cells: readonly (PredicationCell & { readonly origins: readonly { readonly provider: string; readonly resource: string }[] })[] };
