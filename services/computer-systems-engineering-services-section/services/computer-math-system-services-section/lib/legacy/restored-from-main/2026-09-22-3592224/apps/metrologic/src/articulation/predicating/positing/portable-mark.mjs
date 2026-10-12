/** Portable utterance marks.
 *
 * A mark is an opaque JSON-shaped datum.  Its carrier does not require the
 * type-system registry; keeping that registry out of this leaf lets packet
 * projection run in a browser or Worker without loading specification files.
 */
export const MarkSchema = Object.freeze({
  type: "object", required: ["kind", "value"],
  properties: { kind: { const: "utterance.mark" }, value: {} },
  additionalProperties: false,
});

export class Mark {
  kind = "utterance.mark";
  constructor(value) {
    this.value = value;
    Object.freeze(this);
  }
}
export const mark = (value) => new Mark(value);

export function coincides(left, right) {
  const pending = [[left, right, false]];
  const leftAncestors = new WeakSet();
  const rightAncestors = new WeakSet();
  while (pending.length) {
    const [a, b, leaving] = pending.pop();
    if (leaving) { leftAncestors.delete(a); rightAncestors.delete(b); continue; }
    if (Object.is(a, b)) continue;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    } else {
      const plain = value => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
      if (!plain(a) || !plain(b)) return false;
    }
    if (leftAncestors.has(a) || rightAncestors.has(b)) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length || keys.some(key => !Object.hasOwn(b, key))) return false;
    leftAncestors.add(a); rightAncestors.add(b); pending.push([a, b, true]);
    for (const key of keys) pending.push([a[key], b[key], false]);
  }
  return true;
}

export function isMark(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && value.kind === "utterance.mark" && Object.hasOwn(value, "value")
    && Object.keys(value).every(key => key === "kind" || key === "value");
}
