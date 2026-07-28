import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const PHASE2_TERRITORY_CONFORMANCE_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/scan-phase2-territory.rml", import.meta.url), "utf8"),
);
