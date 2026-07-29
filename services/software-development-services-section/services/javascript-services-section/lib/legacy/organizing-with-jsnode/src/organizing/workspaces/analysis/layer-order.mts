import type { JSNodeLayer } from "../../packages/carrier.mjs";

export const ANALYSIS_LAYER_ORDER: readonly JSNodeLayer[] = ["lib", "apps", "services", "sites", "ops"];

export const analysisLayerRank = (layer: JSNodeLayer): number => {
  const index = ANALYSIS_LAYER_ORDER.indexOf(layer);
  return index === -1 ? 99 : index;
};
