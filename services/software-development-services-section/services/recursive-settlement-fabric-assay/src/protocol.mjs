import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";

export const FABRIC_ASSAY_REQUEST_KIND = "RecursiveSettlementFabricAssayRequest";
export const FABRIC_ASSAY_RECEIPT_KIND = "RecursiveSettlementFabricAssayReceipt";
const exact = (value, fields) => value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0");

function typed(value) {
  const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term];
  return { value, type: encoded.type, term: encoded.term, bytes: semanticBytes(term), id: semanticId(term) };
}

export function encodeFabricAssayRequest({ territoryRoot }) {
  if (typeof territoryRoot !== "string" || !territoryRoot.startsWith("/")) throw new TypeError("fabric assay territoryRoot must be one absolute path");
  return typed({ kind: FABRIC_ASSAY_REQUEST_KIND, territoryRoot });
}

export function decodeFabricAssayRequest(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new TypeError("fabric assay request must use the relational RMN carrier");
  const value = decodeRelationalValue(type, term);
  if (!exact(value, ["kind", "territoryRoot"]) || value.kind !== FABRIC_ASSAY_REQUEST_KIND || typeof value.territoryRoot !== "string" || !value.territoryRoot.startsWith("/")) throw new TypeError("fabric assay request has an unknown, absent, or malformed field");
  return value;
}

export function encodeFabricAssayReceipt({ provider, law, request, assay }) {
  if (typeof provider !== "string" || !provider.startsWith("eip155:") || typeof law !== "string" || !law.startsWith("ni:///sha-256;") || typeof request !== "string" || !request.startsWith("ni:///sha-256;")) throw new TypeError("fabric assay receipt identity is malformed");
  return typed({ kind: FABRIC_ASSAY_RECEIPT_KIND, provider, law, request, assay });
}

export function authorizeFabricTerritory(territoryRoot, allowedRoots) {
  if (typeof allowedRoots !== "string" || allowedRoots.length === 0) throw new TypeError("FABRIC_ASSAY_ALLOWED_ROOTS must explicitly authorize one or more absolute roots");
  const normalized = territoryRoot.replace(/\/+$/u, "") || "/";
  const roots = allowedRoots.split("\n").map((root) => root.replace(/\/+$/u, "") || "/").filter((root) => root.startsWith("/"));
  if (roots.length === 0 || !roots.some((root) => normalized === root || normalized.startsWith(`${root}/`))) throw new TypeError("fabric assay territory falls outside the deployment's explicit read grant");
  return normalized;
}
