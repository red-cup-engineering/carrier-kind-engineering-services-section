import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const ACCEPTANCE_ORACLE_ASSAY_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/assay-acceptance-oracle.rml", import.meta.url), "utf8"));
