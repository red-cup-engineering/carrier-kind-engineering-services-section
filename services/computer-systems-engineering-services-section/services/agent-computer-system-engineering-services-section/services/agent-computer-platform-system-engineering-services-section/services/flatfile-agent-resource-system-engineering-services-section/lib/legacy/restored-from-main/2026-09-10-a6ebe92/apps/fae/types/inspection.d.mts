import type { FrogResource, FrogResourceInspection } from "@red-cup-engineering/frog";
import type { RelationObservation, SerializedComposition } from "./compositor.d.mts";
import type { ProviderOutcome } from "./provider.d.mts";

export type FaeResource = FrogResource;
export interface FaeInspectionObservation { readonly provider: string; readonly outcome: ProviderOutcome }
export interface FaeResourceInspectionInput { readonly fernPath: string; readonly resource: FaeResource; readonly observations: readonly FaeInspectionObservation[] }
export interface FaeResourceInspection { readonly frog: FrogResourceInspection; readonly composition: SerializedComposition; readonly occurrences: readonly RelationObservation[] }
export function inspectFaeResource(input: FaeResourceInspectionInput): Promise<FaeResourceInspection>;
