/**
 * signstuff-evm — JS twin of `WitnessSet.sol`: the canonical sorted-pair Merkle commitment to a set of
 * witness ids. A pure function of the SET, so the same witnesses give the same root on every chain.
 *
 *   leaf(id)   = sha256(0x00 || id)
 *   node(a, b) = sha256(0x01 || min(a,b) || max(a,b))
 *   level k+1  = adjacent pairs; an odd last node is promoted unchanged
 *   empty set  = 32 zero bytes
 */
import { createHash } from "node:crypto";

const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts)).digest();
const ZERO = Buffer.alloc(32);

export const sortedUnique = (idsHex) => [...new Set(idsHex.map((h) => h.toLowerCase()))].sort();

const leaf = (id) => sha(Buffer.from([0]), id);
const node = (a, b) => (Buffer.compare(a, b) <= 0 ? sha(Buffer.from([1]), a, b) : sha(Buffer.from([1]), b, a));

function levels(idsHex) {
  const ids = sortedUnique(idsHex).map((h) => Buffer.from(h, "hex"));
  if (ids.length === 0) return [[ZERO]];
  const out = [ids.map(leaf)];
  while (out[out.length - 1].length > 1) {
    const prev = out[out.length - 1], next = [];
    for (let i = 0; i + 1 < prev.length; i += 2) next.push(node(prev[i], prev[i + 1]));
    if (prev.length % 2 === 1) next.push(prev[prev.length - 1]);
    out.push(next);
  }
  return out;
}

export const rootHex = (idsHex) => levels(idsHex).at(-1)[0].toString("hex");

/** The sibling path of `idHex` in the set, bottom-up (omitting levels where the node is promoted). */
export function proofHex(idsHex, idHex) {
  const ids = sortedUnique(idsHex);
  let index = ids.indexOf(idHex.toLowerCase());
  if (index < 0) throw new RangeError("witness-set: not a member");
  const proof = [];
  for (const level of levels(idsHex).slice(0, -1)) {
    const sibling = index ^ 1;
    if (sibling < level.length) proof.push(level[sibling].toString("hex"));
    index >>= 1;
  }
  return proof;
}

export const unionHex = (a, b) => sortedUnique([...a, ...b]);
