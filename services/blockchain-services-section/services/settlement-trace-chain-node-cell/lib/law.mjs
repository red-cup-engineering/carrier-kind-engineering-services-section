import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
export const SETTLEMENT_TRACE_CHAIN_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/serve-settlement-trace-chain.rml", import.meta.url), "utf8"));
