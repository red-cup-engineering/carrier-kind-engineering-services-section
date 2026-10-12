/** Derive both orders and the linear operations without inspecting coordinates. */
export function twistProduct(algebra) {
    const { bottom, top, one, leq, meet, join, fuse, imply } = algebra;
    const value = (positive, negative) => Object.freeze([positive, negative]);
    const lift = (positive, negative) => ({ left: a, right: b }) => value(positive(a[0], b[0]), negative(a[1], b[1]));
    return Object.freeze({
        value,
        knowledgeBottom: value(bottom, bottom),
        knowledgeTop: value(top, top),
        truthBottom: value(bottom, top),
        truthTop: value(top, bottom),
        one: value(one, one),
        meetKnowledge: lift(meet, meet),
        joinKnowledge: lift(join, join),
        meetTruth: lift(meet, join),
        joinTruth: lift(join, meet),
        leqKnowledge: ({ left: a, right: b }) => leq(a[0], b[0]) && leq(a[1], b[1]),
        leqTruth: ({ left: a, right: b }) => leq(a[0], b[0]) && leq(b[1], a[1]),
        negate: (a) => value(a[1], a[0]),
        fuse: ({ left: a, right: b }) => value(fuse(a[0], b[0]), meet(imply(a[0], b[1]), imply(b[0], a[1]))),
        imply: ({ left: a, right: b }) => value(meet(imply(a[0], b[0]), imply(b[1], a[1])), fuse(a[0], b[1])),
    });
}
