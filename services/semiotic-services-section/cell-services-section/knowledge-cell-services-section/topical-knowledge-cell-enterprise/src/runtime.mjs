import { resolve } from "node:path";
import { loadBoundRuntime } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
const ROOT = resolve(import.meta.dirname, "..");
export function loadCellEnterpriseRuntime(boundaryPath = process.env.TOPICAL_CELL_ENTERPRISE_BOUNDARY ?? resolve(ROOT, "content/deployment/runtime-boundary.json")) {
  return loadBoundRuntime({ boundaryPath, boundaryType: "DeploymentBoundary", factoryExport: "createTopicalKnowledgeCellEnterpriseRuntime", root: ROOT, inactiveMessage: "topical-cell-enterprise deployment is not activated" });
}
