import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { prepareAcceptanceCapsule } from "./acceptance-capsule.mjs";

export const PROFILE = "org.emsenn.software.protected-acceptance.v1";
export const PROVIDER_ACCOUNT = "eip155:31337:0xba80a836ba2d7fa3938e71da7a1bfa8aeb29c435";

function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function typed(value) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { bytes: semanticBytes(term), id: semanticId(term), term }; }
export function normalizeRequest(value) {
  if (!exactKeys(value, ["input", "kind"]) || value.kind !== "ProtectedAcceptancePreparationRequest" || !value.input || Object.getPrototypeOf(value.input) !== Object.prototype) throw new Error("protected acceptance request has an unknown, absent, or legacy field");
  return value;
}
export function encodeRequest(value) { return typed(normalizeRequest(value)); }
export function decodeRequest(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("protected acceptance request must use relational RMN"); return normalizeRequest(decodeRelationalValue(type, term)); }
export async function performRequest(value, options = {}) {
  const request = normalizeRequest(value), subject = typed(request).id;
  const capsule = await prepareAcceptanceCapsule(request.input, options);
  const receipt = { kind: "ProtectedAcceptancePreparationReceipt", profile: PROFILE, provider: PROVIDER_ACCOUNT, subject, capsule };
  const document = typed(receipt);
  return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}
export function decodeReceipt(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("protected acceptance receipt must use relational RMN");
  const value = decodeRelationalValue(type, term);
  if (!exactKeys(value, ["capsule", "kind", "profile", "provider", "subject"]) || value.kind !== "ProtectedAcceptancePreparationReceipt" || value.profile !== PROFILE || value.provider !== PROVIDER_ACCOUNT) throw new Error("protected acceptance receipt is malformed or foreign");
  return value;
}
