import { resolve } from "node:path";
import { loadBoundRuntime } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
const ROOT = resolve(import.meta.dirname, "..");
export function loadBrokerageRuntime(boundaryPath = process.env.TOPICAL_BROKERAGE_BOUNDARY ?? resolve(ROOT, "content/deployment/runtime-boundary.json")) {
  return loadBoundRuntime({ boundaryPath, boundaryType: "DeploymentBoundary", factoryExport: "createTopicalKnowledgeCellBrokerageRuntime", root: ROOT, inactiveMessage: "brokerage-service deployment is not activated" });
}
