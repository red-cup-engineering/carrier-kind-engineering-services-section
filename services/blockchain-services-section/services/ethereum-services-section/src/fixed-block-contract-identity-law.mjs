import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const FIXED_BLOCK_CONTRACT_IDENTITY_OBSERVATION_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/fixed-block-contract-identity-observation.rml", import.meta.url), "utf8"),
);

export const FIXED_BLOCK_CONTRACT_IDENTITY_OBSERVATION_CONTRACT =
  FIXED_BLOCK_CONTRACT_IDENTITY_OBSERVATION_LAW.id;

