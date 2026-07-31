import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const STANDING_WRITE_CAPABILITY_ASSAY_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/assay-standing-write-capability.rml", import.meta.url), "utf8"));
