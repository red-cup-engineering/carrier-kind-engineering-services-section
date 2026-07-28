import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const CRYPTOGRAPHIC_SERVICES_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/cryptographic-services.rml", import.meta.url), "utf8"),
);
