/**
 * Loci — the addresses of ludics.
 *
 * Girard 2001 builds ludics on three primitives: loci (addresses), designs
 * (dialogical objects located at loci), and interaction.  A locus is a finite
 * path from the root of the locus tree — a sequence of natural numbers naming
 * which child to descend into at each step.  The empty sequence is the root;
 * `child(xi, i)` is the $i$-th child of $\xi$; the prefix order is the tree
 * order.  Designs (next module) are valuations defined over loci.
 */

export function locus(address = []) {
  return Object.freeze({ kind: "game.locus", address: Object.freeze([...address]) });
}

export const root = () => locus([]);

export const child = (xi, i) => locus([...xi.address, i]);

export const parent = (xi) =>
  xi.address.length === 0 ? null : locus(xi.address.slice(0, -1));

export const locusKey = (xi) => xi.address.join(".");

export const sameLocus = (left, right) => locusKey(left) === locusKey(right);

export const locusDepth = (xi) => xi.address.length;

/** Prefix order $\xi \sqsubseteq \zeta$ — $\xi$ is an ancestor of (or equal to) $\zeta$. */
export function prefixes(xi, zeta) {
  if (xi.address.length > zeta.address.length) return false;
  return xi.address.every((n, i) => zeta.address[i] === n);
}

export function locusFromKey(key) {
  if (key === "") return root();
  return locus(key.split(".").map((part) => Number.parseInt(part, 10)));
}

export function isLocus(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.locus"
    && Array.isArray(candidate.address)
    && candidate.address.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0);
}
