/** Pure placement-independent RMN die types. */
export type RmnType = readonly unknown[];
export type RmnTerm = readonly unknown[];
export interface Four {
  readonly positiveEvidence: boolean;
  readonly negativeEvidence: boolean;
}

export const FOUR: Readonly<{
  readonly neither: Four;
  readonly true: Four;
  readonly false: Four;
  readonly both: Four;
}>;
export function four(positiveEvidence: boolean, negativeEvidence: boolean): Four;
export function validateFour(value: unknown): Four;
export function joinKnowledge(left: Four, right: Four): Four;
export function isKnowledgeCover(before: Four, after: Four): boolean;
export function witnessBit(before: Four, after: Four): "positiveEvidence" | "negativeEvidence";

export const PROFILE: string;
export const RML_LANGUAGE: string;
export function normalizeCarrier(value: unknown): unknown;
export function semanticBytes(value: unknown): Buffer;
export function semanticId(value: unknown): string;
export function decodeSemantic(bytes: Uint8Array): unknown;
export function parseRml(source: string): unknown;
export function formatRml(value: unknown): string;
export function validateType(type: unknown): RmnType;
export function validateTerm(term: unknown): RmnTerm;
export function inferTerm(term: unknown, context?: readonly unknown[]): RmnType;
export function checkTerm(term: unknown, expectedType: unknown, context?: readonly unknown[]): RmnTerm;
export function normalizeEffectCell(cell: unknown): Readonly<Record<string, unknown>>;
