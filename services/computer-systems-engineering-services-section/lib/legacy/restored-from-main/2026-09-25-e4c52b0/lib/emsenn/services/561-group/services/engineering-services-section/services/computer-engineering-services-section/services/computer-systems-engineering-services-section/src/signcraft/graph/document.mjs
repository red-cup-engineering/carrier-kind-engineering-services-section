/**
 * settling/document - the document as a settled relational fixed point.
 *
 * A Document is not a syntax tree and not a file format. It is admitted only
 * after the predication/valuation closure has stabilized at the knowledge-least
 * fixed point. Representation carriers may preserve this object; they do not
 * become it.
 */
import { chargeValueName, valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { termCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { fixedPointReadings, } from "../fixed-point-reading.mjs";
// Preserve ordinary JSON address bytes while distinguishing admitted non-JSON
// scalars. Identity-only values and cyclic or sparse structures have no address
// encoding here; rejection belongs to this codec boundary, not Mark admission.
const stableStringify = (value, ancestors = new Set()) => {
    if (value === undefined)
        return "undefined";
    if (value === null)
        return "null";
    if (typeof value === "bigint")
        return `${value}n`;
    if (typeof value === "number") {
        if (Object.is(value, -0))
            return "-0";
        if (!Number.isFinite(value))
            return String(value);
    }
    if (typeof value === "symbol" || typeof value === "function") {
        throw new TypeError("documentAddressKey: symbols and functions have no structural address encoding");
    }
    if (typeof value !== "object")
        return JSON.stringify(value);
    if (ancestors.has(value))
        throw new TypeError("documentAddressKey: cyclic values have no structural address encoding");
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
                if (!Object.hasOwn(value, index))
                    throw new TypeError("documentAddressKey: sparse arrays have no structural address encoding");
            }
            return `[${value.map((item) => stableStringify(item, ancestors)).join(",")}]`;
        }
        const record = value;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key], ancestors)}`).join(",")}}`;
    }
    finally {
        ancestors.delete(value);
    }
};
const termKey = (term) => stableStringify(term.mark.value);
const predicateKey = (predicate) => stableStringify(predicate.claim.mark.value);
export const documentAddressKey = (cell) => stableStringify([termKey(cell.subject), predicateKey(cell.predicate), termKey(cell.object)]);
const addressOf = (meme) => Object.freeze({
    kind: "settledDocument.address",
    key: documentAddressKey(meme.cell),
    cell: meme.cell,
});
const referenceOf = (meme, addresses) => {
    const from = documentAddressKey(meme.cell);
    const target = addresses.find((address) => termCoincides(address.cell.subject, meme.cell.object));
    return termCoincides(meme.cell.subject, meme.cell.object) || target === undefined
        ? undefined
        : Object.freeze({
            kind: "settledDocument.reference",
            from,
            to: target.key,
            predicate: meme.cell.predicate,
        });
};
const orderedAddresses = (memes) => Object.freeze(memes.map(addressOf).sort((left, right) => left.key.localeCompare(right.key)));
const adjacencyOrder = (addresses) => Object.freeze(addresses.slice(0, -1).map((address, index) => Object.freeze({
    kind: "settledDocument.order",
    before: address.key,
    after: addresses[index + 1].key,
})));
/** Derive a document from the witnessed knowledge-least fixed point. */
export function documentOfFixedPoint(source) {
    const fixedPoint = source.knowledge.least.fixedPoint;
    if (fixedPoint.kind !== "predication.valuation.fixedPoint:witness") {
        return Object.freeze({ kind: "settledDocument.fixedPoint-obstruction", reason: "knowledge-least-not-fixed" });
    }
    const memes = fixedPoint.value.fibers.flatMap((fiber) => fiber.assignments);
    if (memes.length === 0) {
        return Object.freeze({ kind: "settledDocument.fixedPoint-obstruction", reason: "empty-fixed-point" });
    }
    const addresses = orderedAddresses(memes);
    const references = Object.freeze(memes
        .map((meme) => referenceOf(meme, addresses))
        .filter((reference) => reference !== undefined));
    return Object.freeze({
        kind: "settledDocument.fixedPoint",
        source,
        fixedPoint,
        reading: fixedPointReadings(source).knowledgeLeast,
        addresses,
        order: adjacencyOrder(addresses),
        references,
        valuationSites: Object.freeze(memes.map((meme) => Object.freeze({
            kind: "settledDocument.valuationSite",
            address: documentAddressKey(meme.cell),
            value: chargeValueName(valueOf(meme.charge)),
            meme,
        }))),
    });
}
/** HTML may carry a settled document, but it is not identical to the document. */
export function html_is_carrier_not_document(document, carrierKind) {
    return Object.freeze({
        kind: "settledDocument.html_is_carrier_not_document:witness",
        documentKind: document.kind,
        carrierKind,
        distinct: true,
    });
}

/** An ordering constraint between two document addresses (folded in from settling's other
 * tree, 2026-09-21 — this schema describes exactly the shape `adjacencyOrder` above builds). */
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

/** The shape of `documentOfFixedPoint`'s obstruction result (folded in from settling's
 * other tree, 2026-09-21 — describes exactly the two obstruction objects above). */
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
