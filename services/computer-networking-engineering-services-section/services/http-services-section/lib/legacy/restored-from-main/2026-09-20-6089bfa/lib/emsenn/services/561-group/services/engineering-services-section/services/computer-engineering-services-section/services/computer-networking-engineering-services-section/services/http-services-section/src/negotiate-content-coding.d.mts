import type { Coding } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-coding.mjs";
export type { Coding } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-coding.mjs";
/** RFC 9110 §§12.4.2, 12.5.3. Malformed weights exclude their coding;
 * repeated codings retain the last preference, as in the original API. */
export declare function parseAcceptEncoding(header: string): Map<string, number>;
/** Select an acceptable offered coding; ties retain the caller's order.
 * With no header, prefer identity if offered. An implicit identity is a
 * fallback unless a wildcard supplies its weight; explicit identity wins
 * over the wildcard, including its exclusion. */
export declare function negotiateEncoding(acceptEncodingHeader: string | undefined, offered: readonly Coding[]): Coding | null;
