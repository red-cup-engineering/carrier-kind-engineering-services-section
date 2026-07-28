import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const SEMANTIC_CANDIDATE_REVIEW_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/review-semantic-candidate.rml", import.meta.url), "utf8"),
);
