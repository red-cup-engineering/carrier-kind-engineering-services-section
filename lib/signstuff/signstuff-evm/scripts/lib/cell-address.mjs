/**
 * signstuff-evm — JS twin of the EVM identities.
 *
 * The cell address is not re-implemented here: it IS SignCell's (`semanticHex` of the triple), and the
 * Solidity `SignCell.cellId` is tested against it. The few identities that are chain-native
 * (telling id, section digest, witness ids) are defined here once, as the canonical JS function the
 * Solidity library must match.
 */
import { createHash } from "node:crypto";
import { semanticBytes, semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { telling } from "@red-cup-engineering/signchain/log";

export const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const hexToBytes = (hex) => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
export const bytesToHex = (bytes) => Buffer.from(bytes).toString("hex");

/** Canonical-CBOR bytes of a term / witness, as lowercase hex (no 0x). */
export const encodeTerm = (term) => bytesToHex(semanticBytes(term));

/** The identity of a term or witness: sha256 of its canonical CBOR. */
export const termIdHex = (term) => sha256Hex(semanticBytes(term));
export const witnessIdHex = termIdHex;

/** SignCell's content address of the triple, as the 32-byte digest in hex (the ni: name's payload). */
export const cellIdHex = (subject, predicate, object = subject) => semanticHex({ subject, predicate, object });

/** The ni: name of a digest in hex, and back: the same 32 bytes, spelled two ways. */
export const niOfHex = (hex) => `ni:///sha-256;${Buffer.from(hex, "hex").toString("base64url")}`;
export const hexOfNi = (ni) => Buffer.from(ni.slice("ni:///sha-256;".length), "base64url").toString("hex");

/** A SignChain telling row's content address (what `semanticHex(telling(...))` gives). */
export const tellingRowIdHex = (subject, predicate, object, witness, side = "for") =>
  semanticHex(telling({ subject, predicate, object }, witness, side));

const TELLING_DOMAIN = createHash("sha256").update("signstuff-evm.telling.v1").digest();

/** The chain-native identity of "witness told this side of this cell"; Solidity `SignCell.tellingId`. */
export const tellingIdHex = (cellHex, side, witnessHex) =>
  sha256Hex(Buffer.concat([TELLING_DOMAIN, Buffer.from(cellHex, "hex"), Buffer.from([side === "against" ? 1 : 0]), Buffer.from(witnessHex, "hex")]));

/** Chain-agnostic and chain-scoped account witnesses (JS carrier values; Solidity encodes them to CBOR text). */
export const accountWitness = (address) => `evm:${address.toLowerCase()}`;
export const scopedAccountWitness = (chainId, address) => `eip155:${chainId}:${address.toLowerCase()}`;

/** Digest of a settled section: `semanticHex([[cellId bytes, value], ...])`, cells ascending; Solidity `Settlement.sectionDigest`. */
export function sectionDigestHex(entries) {
  const sorted = [...entries].sort((l, r) => (l.cell < r.cell ? -1 : l.cell > r.cell ? 1 : 0));
  return semanticHex(sorted.map(({ cell, value }) => [hexToBytes(cell), value]));
}
