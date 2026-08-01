/** Pure placement-independent RMN die types. */
import type { Four } from "./index.d.mts";

export interface CircuitPort {
  readonly name: string;
  readonly direction: "input" | "output";
  readonly predicate: string;
  readonly carrier: string;
  readonly mode: "tensor" | "par";
}
export interface CircuitInstance { readonly name: string; readonly component: string }
export interface CircuitEndpoint { readonly instance: string | null; readonly port: string }
export interface CircuitNet {
  readonly name: string;
  readonly driver: CircuitEndpoint;
  readonly sinks: readonly CircuitEndpoint[];
  readonly mode: "tensor" | "par";
  readonly chain: string | null;
  readonly contract: string | null;
}
export interface CircuitBehaviorRow { readonly input: readonly Four[]; readonly output: readonly Four[] }
export interface HierarchicalCircuit {
  readonly profile: string;
  readonly law: string;
  readonly ports: readonly CircuitPort[];
  readonly instances: readonly CircuitInstance[];
  readonly nets: readonly CircuitNet[];
  readonly behavior: Readonly<{ rows: readonly CircuitBehaviorRow[] }>;
}
export interface SovereignCircuitInterface {
  readonly account: string;
  readonly authority: string;
  readonly custody: string;
  readonly territory: string;
  readonly component: HierarchicalCircuit;
}

export const HIERARCHICAL_CIRCUIT_PROFILE: string;
export const CIRCUIT_ASSEMBLY_PROFILE: string;
export const SOVEREIGN_CIRCUIT_INTERFACE_PROFILE: string;
export const SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION: string;
export declare function circuitInterfaceFromAgentCard(card: unknown): SovereignCircuitInterface;
export declare function normalizeHierarchicalCircuit(source: unknown): HierarchicalCircuit;
export declare function hierarchicalCircuitId(source: unknown): string;
export declare function behaviorAt(source: unknown, input: readonly Four[]): readonly Four[];
export declare function verifyCircuitRealization(source: { interface: unknown; circuit: unknown; components?: unknown[]; assembly: unknown }): {
  interface: string;
  circuit: string;
  assembly: string;
  behavior: string;
  components: string[];
  realized: true;
};
