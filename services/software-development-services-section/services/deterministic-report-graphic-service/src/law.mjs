import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const DETERMINISTIC_REPORT_GRAPHIC_SERVICE_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/deterministic-report-graphic-service.rml", import.meta.url), "utf8"),
);
