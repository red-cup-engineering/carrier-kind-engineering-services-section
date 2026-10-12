import type { Coding } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-coding";
export declare function negotiateType(header: string | undefined, offered: readonly string[]): string | null;
export declare function negotiateLanguage(header: string | undefined, offered: readonly string[]): string | null;
export declare function negotiateEncoding(header: string | undefined, offered: readonly Coding[]): Coding | null;
