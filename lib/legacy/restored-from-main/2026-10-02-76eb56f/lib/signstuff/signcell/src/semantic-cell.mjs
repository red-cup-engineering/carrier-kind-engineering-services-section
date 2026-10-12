import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { semanticCellType, semanticReferenceType as signCellReferenceType } from "./semantic-carriers.mjs";

const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
function copyJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (typeof value !== "object" || ancestors.has(value)) throw new TypeError("semantic cell content must be acyclic JSON");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("semantic cell content must be plain JSON data");
  ancestors.add(value);
  const copied = Array.isArray(value) ? value.map(item => copyJson(item, ancestors)) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyJson(item, ancestors)]));
  ancestors.delete(value);
  return Object.freeze(copied);
}
export const signCellIdentity = (type, content) => semanticId(Object.freeze({ kind: "sign.cell", type, content }));
/** Construct one immutable cell only after its named data type admits its content. */
export function createSignCell(type, content) {
  const admitted = admit(type, content);
  if (!admitted.ok) return refused("invalid-content", admitted.refusal.issues.map(issue => `${issue.path || "/"} ${issue.message}`).join("; "));
  try {
    const copied = copyJson(admitted.value);
    return accepted(Object.freeze({ kind: "sign.cell", id: signCellIdentity(type.id, copied), type: type.id, content: copied }));
  } catch (error) { return refused("invalid-content", error instanceof Error ? error.message : String(error)); }
}
/** Re-admit an addressed cell against the receiver's type declaration. */
export function admitSignCell(type, input) {
  const carrier = admit(semanticCellType, input);
  if (!carrier.ok) return refused("invalid-cell", "cell must have kind, id, declared type, and content");
  if (carrier.value.type !== type.id) return refused("invalid-cell", "cell declared type does not match the receiving data type");
  const created = createSignCell(type, carrier.value.content);
  if (!created.ok) return created;
  return carrier.value.id === created.value.id ? created : refused("identity-mismatch", "cell bytes do not match its advertised identity");
}
/** Check the portable carrier and its address when the content type is intentionally unresolved. */
export function admitSignCellCarrier(input) {
  const carrier = admit(semanticCellType, input);
  if (!carrier.ok) return refused("invalid-cell", "cell must have kind, id, declared type, and content");
  const value = carrier.value;
  return value.id === signCellIdentity(value.type, value.content) ? accepted(value) : refused("identity-mismatch", "cell bytes do not match its advertised identity");
}
export function referenceOf(cell) {
  return Object.freeze({ id: cell.id, type: cell.type });
}
/** Generated schema type for relation endpoint admission. */
export { signCellReferenceType };
