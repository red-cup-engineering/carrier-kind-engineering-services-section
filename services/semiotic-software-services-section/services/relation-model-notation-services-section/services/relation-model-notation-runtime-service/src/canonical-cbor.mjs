/**
 * Compatibility surface for the historical monolithic RMN runtime.
 *
 * Canonical carrier encoding belongs to the CBOR codec; RFC 6920 byte naming
 * belongs to the NI service behind that codec. Keeping this re-export lets
 * existing runtime consumers migrate without preserving a second identity
 * implementation.
 */
export * from "@red-cup-engineering/relation-model-notation-cbor-codec";
