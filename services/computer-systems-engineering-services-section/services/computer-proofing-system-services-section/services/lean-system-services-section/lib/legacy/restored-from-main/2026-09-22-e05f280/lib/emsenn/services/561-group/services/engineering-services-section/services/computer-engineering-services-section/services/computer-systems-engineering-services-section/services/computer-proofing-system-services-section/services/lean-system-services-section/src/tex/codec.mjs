/**
 * integrations/lean/src/codec/tex — TeX-family file plate codec index.
 *
 * This family index re-exports host-neutral plate codecs only. Blueprint-TeX and Verso authoring text have separate codec modules; TeX
 * engines, Blueprint tooling, and Verso tooling remain service instruments.
 */
export { blueprintTexClaimOccurrenceContract, blueprintTexClaimOccurrenceSchema, blueprintTexPlateContract, blueprintTexPlateSchema, versoTexPlateContract, versoTexPlateSchema, } from "./schema.mjs";
export * as blueprint from "../blueprint/codec.mjs";
export * as verso from "../verso/codec.mjs";
export { decodeBlueprintTexPlate } from "../blueprint/codec.mjs";
export { decodeVersoTexPlate } from "../verso/codec.mjs";
