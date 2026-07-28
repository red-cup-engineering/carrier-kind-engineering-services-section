import { lstatSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { checkTerm, decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { PHASE2_RULESET_ID } from "./scan-territory.mjs";

function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }

export function encodeTerritoryScanRequest(relativePath = ".") {
  const value = { kind: "Phase2TerritoryScanRequest", relativePath, ruleset: PHASE2_RULESET_ID };
  const encoded = encodeRelationalValue(value);
  return semanticBytes(["ascribe", encoded.type, encoded.term]);
}

export function decodeTerritoryScanRequest(bytes) {
  const term = decodeSemantic(bytes);
  if (!semanticBytes(term).equals(bytes) || term?.[0] !== "ascribe" || term.length !== 3 || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("territory scan request must be canonical relational RMN");
  checkTerm(term[2], term[1]);
  const value = decodeRelationalValue(term[1], term[2]);
  if (!exactKeys(value, ["kind", "relativePath", "ruleset"]) || value.kind !== "Phase2TerritoryScanRequest" || typeof value.relativePath !== "string" || isAbsolute(value.relativePath) || value.relativePath.includes("\0") || value.relativePath.split(/[\\/]/u).includes("..") || value.ruleset !== PHASE2_RULESET_ID) throw new Error("territory scan request has an unknown, escaping, or drifted field");
  return value;
}

export function authorizeTerritory(root, relativePath) {
  const base = resolve(root), territory = resolve(base, relativePath), rel = relative(base, territory);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("requested territory escapes the provider grant");
  const stat = lstatSync(territory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("requested territory must be one real directory");
  return territory;
}
