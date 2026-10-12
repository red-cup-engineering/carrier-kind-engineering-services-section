import type { PredicationCell } from "./provider.d.mts";
export const FARS_ATTRIBUTE_NAMESPACE: string;
export const FARS_ATTRIBUTE_WITNESS: string;
export const FARS_ATTRIBUTE_VALUE_TYPE: string;
export const FARS_JSON_VALUE_NAMESPACE: string;
export function attributePredicate(key: string): string;
export function encodeJsonGraphValue(value: unknown): string;
export function decodeJsonGraphValue(value: string): unknown;
export function projectAttributeCells(options: { subject: string; resource: string; attributes: Record<string, unknown> }): readonly PredicationCell[];
