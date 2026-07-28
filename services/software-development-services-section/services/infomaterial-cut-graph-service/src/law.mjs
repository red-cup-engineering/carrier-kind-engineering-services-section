import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const INFOMATERIAL_CUT_GRAPH_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/derive-infomaterial-cut-graph.rml", import.meta.url), "utf8"),
);
