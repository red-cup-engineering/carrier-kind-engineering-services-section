/**
 * settling/document - the document as a settled relational fixed point.
 *
 * A Document is not a syntax tree and not a file format. It is admitted only
 * after the predication/valuation closure has stabilized at the knowledge-least
 * fixed point. Representation carriers may preserve this object; they do not
 * become it.
 */
import { type ChargeValueName } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import type { Meme } from "../fiber.mjs";
import { type Cell, type PredicationPredicate } from "../../predication.mjs";
import { type MemeTopologyFixedPointReading } from "./fixed-point-reading.mjs";
import type { FixedPointCarrier, FixedPointWitness } from "./fixed-point.mjs";
export interface DocumentAddress {
    readonly kind: "settledDocument.address";
    readonly key: string;
    readonly cell: Cell;
}
export interface DocumentOrder {
    readonly kind: "settledDocument.order";
    readonly before: string;
    readonly after: string;
}
export interface DocumentReference {
    readonly kind: "settledDocument.reference";
    readonly from: string;
    readonly to: string;
    readonly predicate: PredicationPredicate;
}
export interface DocumentValuationSite {
    readonly kind: "settledDocument.valuationSite";
    readonly address: string;
    readonly value: ChargeValueName;
    readonly meme: Meme;
}
export interface Document {
    readonly kind: "settledDocument.fixedPoint";
    readonly source: FixedPointCarrier;
    readonly fixedPoint: FixedPointWitness;
    readonly reading: MemeTopologyFixedPointReading;
    readonly addresses: readonly DocumentAddress[];
    readonly order: readonly DocumentOrder[];
    readonly references: readonly DocumentReference[];
    readonly valuationSites: readonly DocumentValuationSite[];
}
export interface DocumentFixedPointObstruction {
    readonly kind: "settledDocument.fixedPoint-obstruction";
    readonly reason: "knowledge-least-not-fixed" | "empty-fixed-point";
}
export interface HtmlIsCarrierNotDocumentWitness {
    readonly kind: "settledDocument.html_is_carrier_not_document:witness";
    readonly documentKind: Document["kind"];
    readonly carrierKind: string;
    readonly distinct: true;
}
export type DocumentJudgment = Document | DocumentFixedPointObstruction;
export declare const documentAddressKey: (cell: Cell) => string;
/** Derive a document from the witnessed knowledge-least fixed point. */
export declare function documentOfFixedPoint(source: FixedPointCarrier): DocumentJudgment;
/** HTML may carry a settled document, but it is not identical to the document. */
export declare function html_is_carrier_not_document(document: Document, carrierKind: string): HtmlIsCarrierNotDocumentWitness;
