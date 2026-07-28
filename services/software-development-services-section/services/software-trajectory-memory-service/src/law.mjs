import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const SOFTWARE_TRAJECTORY_MEMORY_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/transact-software-trajectory-memory.rml", import.meta.url), "utf8"));
