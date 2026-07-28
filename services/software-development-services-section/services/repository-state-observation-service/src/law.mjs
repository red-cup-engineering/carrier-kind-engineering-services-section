import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const REPOSITORY_STATE_OBSERVATION_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/repository-state-observation.rml", import.meta.url), "utf8"),
);
