import { readFileSync } from "node:fs";

import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const PUBLIC_EVM_WALLET_OBSERVATION_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/public-evm-wallet-observation-service.rml", import.meta.url), "utf8"),
);

export const PUBLIC_EVM_WALLET_OBSERVATION_CONTRACT = PUBLIC_EVM_WALLET_OBSERVATION_LAW.id;
