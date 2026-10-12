import { type HeaderValue } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/header-value";
/** Parse an If-Match / If-None-Match field value into its entity-tag list. */
export declare function etagList(value: string | readonly string[]): string[];
/** Weak comparison (§8.8.3.2): opaque-tags equal, weakness ignored. */
export declare function weakEtagMatch(a: string, b: string): boolean;
/** Strong comparison (§8.8.3.2): equal, and neither validator is weak. */
export declare function strongEtagMatch(a: string, b: string): boolean;
/** If-None-Match evaluates true when the precondition FAILS for the given validator (§13.1.2). */
export declare function ifNoneMatch(value: HeaderValue, etag: string): boolean;
/** If-Match evaluates true when the precondition HOLDS for the given validator (§13.1.1). */
export declare function ifMatch(value: HeaderValue, etag: string): boolean;
/** If-Modified-Since evaluates true when the selected representation is not newer than the field date (§13.1.3). */
export declare function ifModifiedSince(value: HeaderValue, lastModified: Date): boolean;
/** If-Unmodified-Since evaluates true when the precondition HOLDS (§13.1.4). */
export declare function ifUnmodifiedSince(value: HeaderValue, lastModified: Date): boolean;
/** If-Range evaluates true when Range may be honored against the selected representation (§13.1.5). */
export declare function ifRange(value: HeaderValue, current: {
    etag?: string;
    lastModified?: Date;
}): boolean;
