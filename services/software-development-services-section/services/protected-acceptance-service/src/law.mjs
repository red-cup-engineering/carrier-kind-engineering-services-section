import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const PROTECTED_ACCEPTANCE_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/prepare-protected-acceptance.rml", import.meta.url), "utf8"));
