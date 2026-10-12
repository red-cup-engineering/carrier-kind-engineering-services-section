import type { Provider, ProviderOutcome, ResourceGraph } from "./provider.d.mts";
export function activityPulseResourceGraph(pulse: Record<string, any>): ResourceGraph;
export function systemdInventoryResourceGraphs(inventory: { host: string; units: readonly Record<string, any>[]; timers: readonly Record<string, any>[] }, options?: { observedAt?: string }): readonly ResourceGraph[];
export function observeHostHealthResourceGraph(options: { nodeName: string; procRoot?: string; volumePath?: string; observedAt?: string }): Promise<ResourceGraph>;
export function observeLinuxProcessResourceGraphs(options: { nodeName: string; procRoot?: string; observedAt?: string }): Promise<ProviderOutcome>;
export function markdownDirectoryProvider(options: { id: string; root: string; excludes?: readonly string[]; sources?: readonly string[]; relationKeys?: readonly string[] }): Provider<{ observedAt?: string }>;
export function packageJsonDirectoryProvider(options: { id: string; root: string; excludes?: readonly string[] }): Provider<{ observedAt?: string }>;
