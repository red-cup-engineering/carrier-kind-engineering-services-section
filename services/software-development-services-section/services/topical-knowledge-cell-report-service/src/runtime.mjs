import { resolve } from "node:path";
import { loadBoundRuntime } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";

const ROOT = resolve(import.meta.dirname, "..");

export function loadReportRuntime(boundaryPath = process.env.TOPICAL_REPORT_BOUNDARY
  ?? resolve(ROOT, "content/deployment/boundary.json")) {
  return loadBoundRuntime({
    boundaryPath,
    boundaryType: "TopicalKnowledgeCellReportServiceDeploymentBoundary",
    factoryExport: "createTopicalKnowledgeCellReportRuntime",
    root: ROOT,
    inactiveMessage: "report-service deployment is not activated",
  });
}
