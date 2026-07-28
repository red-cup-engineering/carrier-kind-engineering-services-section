import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const FABRIC_ASSAY_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/assay-recursive-settlement-fabric.rml", import.meta.url), "utf8"));
