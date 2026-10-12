import * as fae from "@red-cup-engineering/feltos/flatfile";
import { readMemberFace } from "./face.mjs";
import { fireAdmittedExchanges } from "./exchange.mjs";

// The MASH tick, π = σ∘Δ (section README, 2026-08-19 "FARS and MASH: σ,
// Δ, and the tick"). σ: read every member's already-settled face and
// fold into one composite (apps/fae's compositor.mjs generalized one
// level up — sovereign FARS substrates, not providers over one
// substrate). Δ: kernel/exchange.mjs fires the exchange each admitted
// member's committed obligation licenses, only when composeMembers is
// given `cells` — see its own JSDoc below.

/** The `exchanges` value composeMembers returns when no cells are supplied. */
export const EXCHANGES_UNFIRED = Object.freeze([]);

function memberDiagnostic(member, error) {
  return Object.freeze({
    member: member.id,
    code: "member-face-read-failed",
    message: error instanceof Error ? error.message : String(error),
  });
}

function byMemberId(a, b) {
  return a.member < b.member ? -1 : a.member > b.member ? 1 : 0;
}

/**
 * Compose many members' settled faces into one MASH-level readout, and —
 * only when `cells` is supplied — fire the exchange each admitted
 * member's committed obligation licenses (kernel/exchange.mjs's
 * fireAdmittedExchanges, over the Ethereum service's
 * invokeFinalizedDemandInterval). `onMemberError` mirrors apps/fae's
 * compositor.mjs's onProviderError: "throw" (default) aborts the whole
 * tick on one member's corrupted log; "diagnose" omits that member into
 * `diagnostics` and completes over the rest.
 *
 * @param {ReadonlyArray<{id: string, root: string}>} members members built by defineMember
 * @param {{onMemberError?: "throw"|"diagnose", cells?: {conformHireInput: Function, selectProvider: Function, submitHire: Function}}} [options] tick options
 * @returns {object|Promise<object>} the composite synchronously when `cells` is omitted; a Promise of the composite (with `exchanges` populated) when `cells` is supplied, since firing a real exchange is inherently asynchronous
 */
export function composeMembers(members, { onMemberError = "throw", cells } = {}) {
  if (!Array.isArray(members)) throw new TypeError("members must be an array");
  if (onMemberError !== "throw" && onMemberError !== "diagnose") {
    throw new TypeError("onMemberError must be throw or diagnose");
  }

  const seenIds = new Set();
  for (const member of members) {
    if (member === null || typeof member !== "object" || typeof member.id !== "string" || typeof member.root !== "string") {
      throw new TypeError("every member must be defined by defineMember");
    }
    if (seenIds.has(member.id)) throw new TypeError(`duplicate member id: ${member.id}`);
    seenIds.add(member.id);
  }

  const faces = [];
  const diagnostics = [];
  for (const member of members) {
    try {
      faces.push(readMemberFace(member));
    } catch (error) {
      if (onMemberError === "throw") throw error;
      diagnostics.push(memberDiagnostic(member, error));
    }
  }

  const sortedFaces = faces.slice().sort(byMemberId);
  const digest = fae.identity.identity({
    members: sortedFaces.map((face) => ({ member: face.member, digest: face.digest })),
  });

  const composite = {
    members: Object.freeze(sortedFaces),
    diagnostics: Object.freeze(diagnostics),
    exchanges: EXCHANGES_UNFIRED,
    digest,
  };

  if (cells === undefined) return Object.freeze(composite);

  return fireAdmittedExchanges(sortedFaces, cells).then((exchanges) => Object.freeze({ ...composite, exchanges }));
}
