import type { PredicationCell } from "./flatfile-provider.d.mts";

export function attributePredicate(key: string): string;
export function encodeJsonGraphValue(value: unknown): string;
export function decodeJsonGraphValue(value: string): unknown;
export function projectAttributeCells(options: {
  subject: string;
  resource: string;
  attributes: Record<string, unknown>;
}): readonly PredicationCell[];
