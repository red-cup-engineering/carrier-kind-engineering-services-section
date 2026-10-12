export const documentOrderSchema = {
    $id: "metroplat/closure/document/document-order",
    type: "object",
    required: ["kind", "before", "after"],
    properties: {
        kind: { const: "settledDocument.order" },
        before: { type: "string" },
        after: { type: "string" },
    },
    additionalProperties: false,
    title: "DocumentOrder",
    description: "An ordering constraint between two document addresses.",
};
export const documentFixedPointObstructionSchema = {
    $id: "metroplat/closure/document/document-fixed-point-obstruction",
    type: "object",
    required: ["kind", "reason"],
    properties: {
        kind: { const: "settledDocument.fixedPoint-obstruction" },
        reason: { enum: ["knowledge-least-not-fixed", "empty-fixed-point"] },
    },
    additionalProperties: false,
    title: "DocumentFixedPointObstruction",
    description: "The predication/valuation closure has not stabilized at a knowledge-least fixed point.",
};
export function html_presentation_is_not_document(document, presentationKind) {
    return Object.freeze({
        kind: "settledDocument.html_presentation_is_not_document:witness",
        documentKind: document.kind,
        presentationKind,
        distinct: true,
    });
}
