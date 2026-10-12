export interface PredicationCell { readonly subject: string; readonly predicate: string; readonly object: string }
export interface Diagnostic { readonly code?: string; readonly message: string; readonly [key: string]: unknown }
export interface ResourceGraph {
  readonly resource: string;
  readonly focus: string;
  readonly observedAt: string;
  readonly cells: readonly PredicationCell[];
  readonly diagnostics?: readonly Diagnostic[];
}
export interface ProviderOutcome { readonly resources: readonly ResourceGraph[]; readonly diagnostics?: readonly Diagnostic[] }
export interface Provider<Context = Record<string, unknown>> { readonly id: string; observe(context: Context): ProviderOutcome | Promise<ProviderOutcome> }
export function defineProvider<Context = Record<string, unknown>>(input: Provider<Context>): Provider<Context>;
export function validateResourceGraph(value: unknown, label?: string): ResourceGraph;
export function validateProviderOutcome(value: unknown, providerId: string): ProviderOutcome;
