import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_LAW = compileRmlLaw(readFileSync(
  new URL("../content/contracts/fixed-fork-beefy-vault-exit-observation.rml", import.meta.url), "utf8"));

export const FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_CONTRACT =
  FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_LAW.id;
