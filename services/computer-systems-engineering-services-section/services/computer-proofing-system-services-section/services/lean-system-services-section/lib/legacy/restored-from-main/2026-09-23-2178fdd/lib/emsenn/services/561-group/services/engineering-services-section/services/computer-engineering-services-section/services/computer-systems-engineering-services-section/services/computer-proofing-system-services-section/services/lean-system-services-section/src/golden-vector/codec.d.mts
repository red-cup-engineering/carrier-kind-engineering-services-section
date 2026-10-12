
import { LeanGoldenVectorSchema } from "./schema.mjs";
export { LeanGoldenVectorSchema, leanGoldenVectorContract, } from "./schema.mjs";
export type LeanGoldenVector = FromJsonSchema<typeof LeanGoldenVectorSchema>;
export declare function decodeLeanGoldenVectorLine(line: string, label?: string): LeanGoldenVector;
export declare function decodeLeanGoldenVectorJsonl(text: string, label?: string): readonly LeanGoldenVector[];
export declare function encodeLeanGoldenVectorJsonl(rows: readonly LeanGoldenVector[]): string;
export declare function leanGoldenVectorsByAction(rows: readonly LeanGoldenVector[]): ReadonlyMap<string, readonly LeanGoldenVector[]>;
