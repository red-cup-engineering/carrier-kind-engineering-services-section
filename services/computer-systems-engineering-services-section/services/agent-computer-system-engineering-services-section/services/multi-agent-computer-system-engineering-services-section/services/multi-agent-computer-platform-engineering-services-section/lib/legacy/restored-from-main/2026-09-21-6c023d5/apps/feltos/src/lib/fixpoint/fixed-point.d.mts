import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import type { Document } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/document";
export declare const documentOrderSchema: {
    readonly $id: "metroplat/closure/document/document-order";
    readonly type: "object";
    readonly required: readonly ["kind", "before", "after"];
    readonly properties: {
        readonly kind: {
            readonly const: "settledDocument.order";
        };
        readonly before: {
            readonly type: "string";
        };
        readonly after: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly title: "DocumentOrder";
    readonly description: "An ordering constraint between two document addresses.";
};
export type DocumentOrder = FromJsonSchema<typeof documentOrderSchema>;
export declare const documentFixedPointObstructionSchema: {
    readonly $id: "metroplat/closure/document/document-fixed-point-obstruction";
    readonly type: "object";
    readonly required: readonly ["kind", "reason"];
    readonly properties: {
        readonly kind: {
            readonly const: "settledDocument.fixedPoint-obstruction";
        };
        readonly reason: {
            readonly enum: readonly ["knowledge-least-not-fixed", "empty-fixed-point"];
        };
    };
    readonly additionalProperties: false;
    readonly title: "DocumentFixedPointObstruction";
    readonly description: "The predication/valuation closure has not stabilized at a knowledge-least fixed point.";
};
export type DocumentFixedPointObstruction = FromJsonSchema<typeof documentFixedPointObstructionSchema>;
export interface HtmlPresentationNotDocumentWitness {
    readonly kind: "settledDocument.html_presentation_is_not_document:witness";
    readonly documentKind: Document["kind"];
    readonly presentationKind: string;
    readonly distinct: true;
}
export declare function html_presentation_is_not_document(document: Document, presentationKind: string): HtmlPresentationNotDocumentWitness;
