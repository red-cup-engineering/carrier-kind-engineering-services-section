import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const INFOMATERIAL_LAYOUT_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/assay-infomaterial-layout.rml", import.meta.url), "utf8"),
);
