/**
 * settling/document - the document as a settled relational fixed point.
 *
 * A Document is not a syntax tree and not a file format. It is admitted only
 * after the predication/valuation closure has stabilized at the knowledge-least
 * fixed point. Representation values may preserve this object; they do not
 * become it.
 */
import { chargeValueName, valueOf, type ChargeValueName } from "../values/index.mts";
import type { Meme } from "../logic/predicating/evidence/fiber.mts";
import type { Cell, PredicationPredicate, PredicationTerm } from "../logic/predicating/predication.mts";
import {
  fixedPointExtremaProfile,
  type FixedPointExtremumProfile,
} from "./fixed-point-reading.mts";
import type { FixedPointStructure, FixedPointWitness } from "./fixed-point.mts";
import type { FromSchema } from "../schema/contract.mts";

export interface DocumentAddress {
  readonly kind: "settledDocument.address";
  readonly key: string;
  readonly cell: Cell;
}

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
} as const;

export type DocumentOrder = FromSchema<typeof documentOrderSchema>;

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
  readonly source: FixedPointStructure;
  readonly fixedPoint: FixedPointWitness;
  readonly reading: FixedPointExtremumProfile;
  readonly addresses: readonly DocumentAddress[];
  readonly order: readonly DocumentOrder[];
  readonly references: readonly DocumentReference[];
  readonly valuationSites: readonly DocumentValuationSite[];
}

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
} as const;

export type DocumentFixedPointObstruction = FromSchema<typeof documentFixedPointObstructionSchema>;

export interface HtmlPresentationNotDocumentWitness {
  readonly kind: "settledDocument.html_presentation_is_not_document:witness";
  readonly documentKind: Document["kind"];
  readonly presentationKind: string;
  readonly distinct: true;
}

export type DocumentJudgment = Document | DocumentFixedPointObstruction;

const stableStringify = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};

const termKey = (term: PredicationTerm): string => stableStringify(term.mark.value);
const predicateKey = (predicate: PredicationPredicate): string => stableStringify(predicate.mark.value);

export const documentAddressKey = (cell: Cell): string =>
  stableStringify([termKey(cell.subject), predicateKey(cell.predicate), termKey(cell.object)]);

const addressOf = (meme: Meme): DocumentAddress => Object.freeze({
  kind: "settledDocument.address" as const,
  key: documentAddressKey(meme.cell),
  cell: meme.cell,
});

const referenceOf = (meme: Meme, addresses: readonly DocumentAddress[]): DocumentReference | undefined => {
  const from = documentAddressKey(meme.cell);
  const target = addresses.find((address) => termKey(address.cell.subject) === termKey(meme.cell.object));
  return termKey(meme.cell.subject) === termKey(meme.cell.object) || target === undefined
    ? undefined
    : Object.freeze({
      kind: "settledDocument.reference" as const,
      from,
      to: target.key,
      predicate: meme.cell.predicate,
    });
};

const orderedAddresses = (memes: readonly Meme[]): readonly DocumentAddress[] =>
  Object.freeze(memes.map(addressOf).sort((left, right) => left.key.localeCompare(right.key)));

const adjacencyOrder = (addresses: readonly DocumentAddress[]): readonly DocumentOrder[] =>
  Object.freeze(addresses.slice(0, -1).map((address, index) => Object.freeze({
    kind: "settledDocument.order" as const,
    before: address.key,
    after: addresses[index + 1]!.key,
  })));

/** Derive a document from the witnessed knowledge-least fixed point. */
export function documentOfFixedPoint(source: FixedPointStructure): DocumentJudgment {
  const fixedPoint = source.knowledge.least.fixedPoint;
  if (fixedPoint.kind !== "predication.valuation.fixedPoint:witness") {
    return Object.freeze({ kind: "settledDocument.fixedPoint-obstruction" as const, reason: "knowledge-least-not-fixed" as const });
  }
  const memes = fixedPoint.value.fibers.flatMap((fiber) => fiber.assignments);
  if (memes.length === 0) {
    return Object.freeze({ kind: "settledDocument.fixedPoint-obstruction" as const, reason: "empty-fixed-point" as const });
  }
  const addresses = orderedAddresses(memes);
  const references = Object.freeze(memes
    .map((meme) => referenceOf(meme, addresses))
    .filter((reference): reference is DocumentReference => reference !== undefined));
  return Object.freeze({
    kind: "settledDocument.fixedPoint" as const,
    source,
    fixedPoint,
    reading: fixedPointExtremaProfile(source).knowledgeLeast,
    addresses,
    order: adjacencyOrder(addresses),
    references,
    valuationSites: Object.freeze(memes.map((meme) => Object.freeze({
      kind: "settledDocument.valuationSite" as const,
      address: documentAddressKey(meme.cell),
      value: chargeValueName(valueOf(meme.charge)),
      meme,
    }))),
  });
}

/** HTML may carry a settled document, but it is not identical to the document. */
export function html_presentation_is_not_document(document: Document, presentationKind: string): HtmlPresentationNotDocumentWitness {
  return Object.freeze({
    kind: "settledDocument.html_presentation_is_not_document:witness" as const,
    documentKind: document.kind,
    presentationKind,
    distinct: true as const,
  });
}
