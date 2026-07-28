import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const TENSOR_CIRCUIT_BOARD_SYNTHESIS_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/synthesize-tensor-circuit-board.rml", import.meta.url), "utf8"),
);
