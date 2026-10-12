// Shared x402 settlement-witness graph identity.
//
// Sibling x402 sellers (paid-ephemeris-gateway and public-blockchain-services-section)
// each need the same WitnessJournal graph identity for a
// settled payment. Hand-rolling it per seller as
// `ni:///sha-256;${sha256(`${network}\0${transaction}`)}` is delimiter-joining two
// distinct typed fields into one byte string: a `\0` occurring inside either field
// would silently collide two distinct settlements.
//
// This computes it once, through RFC 8949 core-deterministic CBOR
// (@red-cup-engineering/cbor-codec-service), which encodes network and transaction
// as separate map entries rather than a joined string, and names the result with
// its RFC 6920 sha-256 `ni:` URI (@red-cup-engineering/cbor-ni-service).
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-services-section";

export const SETTLEMENT_WITNESS_CARRIER_TYPE = "org.emsenn.x402.settlement-witness.v1";

/**
 * Compute the canonical WitnessJournal graph identity for one settled x402 payment.
 *
 * @param {{network: string, transaction: string}} settlement
 * @returns {string} an `ni:///sha-256;<43 base64url chars>` identity
 */
export function settlementWitnessGraphId({ network, transaction } = {}) {
  if (typeof network !== "string" || network.length === 0) {
    throw new Error("settlementWitnessGraphId requires a non-empty network id");
  }
  if (typeof transaction !== "string" || transaction.length === 0) {
    throw new Error("settlementWitnessGraphId requires a non-empty transaction id");
  }
  const canonical = encodeCanonical({
    type: SETTLEMENT_WITNESS_CARRIER_TYPE,
    network,
    transaction,
  });
  return canonicalCborToNiUri(canonical);
}
