import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";

export const ACTOR = "urn:ame:software-program-synthesis-service";
export const SYNTHESIS_EFFECTS = Object.freeze([
  "provider-local-compute",
  "provider-local-rwil",
  "contracted-mission-provider-egress",
]);
export const SYNTHESIS_LAW = compileRmlLaw(readFileSync(fileURLToPath(new URL("../content/contracts/software-program-synthesis.rml", import.meta.url)), "utf8"));

function rmnId(value) { return semanticId(relationalRwilDocument(value)); }
export function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
export function operationBytes(value) { return semanticBytes(relationalRwilDocument(value)); }
export function operationFromBytes(bytes) {
  const term = decodeSemantic(bytes);
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("program operation is not one typed relational RMN document");
  return decodeRelationalValue(term[1], term[2]);
}
export function exactOperation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id"));
  return value.id === rmnId(body);
}
