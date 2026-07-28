import { readFileSync } from "node:fs"; import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const RECURSIVE_INFOMATERIAL_FABRICATION_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/fabricate-directory-patch.rml", import.meta.url), "utf8"));
