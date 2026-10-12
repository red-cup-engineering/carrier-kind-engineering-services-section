import { defineType, instantiate } from "@red-cup-engineering/computer-system-engine/type-system";
/** Opaque present datum. Payload interpretation belongs to the selected type or codec. */
export const MarkSchema = {
    type: "object", required: ["kind", "value"],
    properties: { kind: { const: "utterance.mark" }, value: {} },
    additionalProperties: false,
};
const definition = defineType({
    id: "Mark", name: "Mark", description: "An opaque present datum whose interpretation belongs to its consumer.",
    schema: MarkSchema, parents: [],
});
if (!definition.ok)
    throw new TypeError(definition.refusal.message);
/** The common Mark admission contract; specialize its value for an interpreted datum. */
export const MarkType = definition.value;
export class Mark {
    kind = "utterance.mark";
    value;
    constructor(value) {
        this.value = value;
        if (!instantiate(MarkType, this).ok)
            throw new TypeError("Mark: value must be present");
        Object.freeze(this);
    }
}
export function mark(value) { return new Mark(value); }


/** Whether two mark payloads coincide: identical primitives, or structurally
 *  equal plain JSON. This is the only place core code reads a Mark payload, and
 *  it reads it only to judge coincidence — never to branch on its content.
 *
 *  Structural (value) coincidence, not reference identity: this package is
 *  boundary-first, so carriers are routinely reconstructed from JSON with no
 *  shared references. Coincidence must survive a transport round-trip; reference
 *  identity would not. (This is the one deliberate divergence from the prior
 *  reference-identity carrier coincidence.) */
export function coincides(left, right) {
    const pending = [[left, right, false]];
    const leftAncestors = new WeakSet();
    const rightAncestors = new WeakSet();
    while (pending.length) {
        const [a, b, leaving] = pending.pop();
        if (leaving) {
            leftAncestors.delete(a);
            rightAncestors.delete(b);
            continue;
        }
        if (Object.is(a, b)) continue;
        if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
        if (Array.isArray(a) || Array.isArray(b)) {
            if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        } else {
            const plain = value => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
            if (!plain(a) || !plain(b)) return false;
        }
        // Distinct cyclic values are outside the structural JSON carrier.
        if (leftAncestors.has(a) || rightAncestors.has(b)) return false;
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length || keys.some(key => !Object.hasOwn(b, key))) return false;
        leftAncestors.add(a);
        rightAncestors.add(b);
        pending.push([a, b, true]);
        for (const key of keys) pending.push([a[key], b[key], false]);
    }
    return true;
}

/** Structural guard for a Mark carrier. Boundary-first: a Mark rehydrated from JSON
 *  is a plain object, not a class instance, so membership is judged by shape (kind +
 *  a present value), the same stance `coincides` takes — never by `instanceof`, which
 *  would not survive a transport round-trip. */
export function isMark(value) {
    return instantiate(MarkType, value).ok;
}
