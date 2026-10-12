import * as fare from "../../../../../../apps/flatfile-agentic-resource-engine/apps/fare/src/index.mjs";
import { readMemberFace } from "./face.mjs";

// The MASH tick, π = σ∘Δ (section README). This module implements the
// σ half in full: read every member's already-settled face, in
// isolation, and fold the faces into one composite, content-identified
// readout — a direct generalization of apps/fare's own
// src/provider/compositor.mjs (composeProviders), one level up: where
// compositor.mjs composes many *providers* observing one FARS
// substrate's own resource graph, composeMembers composes many
// *sovereign FARS substrates* into one MASH-level readout. Same
// discipline (freeze everything, refuse duplicate ids up front, an
// explicit throw-vs-diagnose failure mode per member), deliberately not
// the same code — compositor.mjs's admit()/origins machinery exists to
// merge many providers' cells into one *shared* store MASH has no
// analog for yet (a member's belief state is never merged into another
// member's; each stays its own sovereign fixed point, per the README's
// "one directory, one writer").
//
// The Δ half — "fires the exchanges their committed obligations
// license" — is a named, deliberately unimplemented seam here, exactly
// the discipline apps/fare/src/kernel/replay.mjs's own header comment
// states for its (still-unbuilt) projector seam: "named seam, not
// implemented here... inventing one is out of scope for this
// milestone." Firing a real exchange requires the networking mesh this
// section's README names (A2A/ActivityPub/x402/on-chain settlement) —
// the FARS revival design's own deferred M12 — none of which exists as
// wired, testable code in this repository yet. composeMembers's
// `exchanges` field is therefore always the empty array: read as "no
// exchanges were fired," never as "no exchanges are licensed" — a
// distinction the caller must not collapse. See this app's README
// STATUS section for the concrete state of that gap.
export const EXCHANGES_NOT_IMPLEMENTED = Object.freeze([]);

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

// Compose many members' settled faces into one MASH-level readout.
// `onMemberError`, mirroring compositor.mjs's `onProviderError`:
//   "throw"    — a member whose event log fails to replay (a corrupted
//                line, a causally-reordered log — see apps/fare's
//                ReplayError subclasses) aborts the whole tick. The
//                default: a bad member face is not silently excluded
//                from a composite that claims to represent all of them.
//   "diagnose" — the failing member is omitted from `members` and
//                recorded in `diagnostics` instead; the tick still
//                completes over whichever members did replay cleanly.
export function composeMembers(members, { onMemberError = "throw" } = {}) {
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
  const digest = fare.identity.identity({
    members: sortedFaces.map((face) => ({ member: face.member, digest: face.digest })),
  });

  return Object.freeze({
    members: Object.freeze(sortedFaces),
    diagnostics: Object.freeze(diagnostics),
    exchanges: EXCHANGES_NOT_IMPLEMENTED,
    digest,
  });
}
