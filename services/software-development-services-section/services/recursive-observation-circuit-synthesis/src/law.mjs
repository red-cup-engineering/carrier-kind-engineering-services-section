import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const RECURSIVE_OBSERVATION_SYNTHESIS_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/synthesize-recursive-observation-circuit.rml", import.meta.url), "utf8"));
