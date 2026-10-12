// MASH — the Multi-Agent Semiotic Hub. Organizing's locus of organizing
// among sovereign agents: the tick that composes many members' settled
// faces (σ) into one composite, and — where a caller supplies real
// exchange-firing cells — the composite carries the exchanges their
// committed obligations license (Δ), advancing history by π = σ∘Δ.
//
// This module holds MASH's pure structure only: a member's shape, the
// σ fold, and the pure exchange-obligation derivation. It imports
// nothing from the filesystem, FARS (flatfile-resource-graph-service),
// or Ethereum — reading a member's substrate from disk, firing a real
// exchange, and the CLI are effectful, and live in FeltOS's own
// "./mash" (@red-cup-engineering/feltos/mash), which composes this
// module with those effects.

import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

/**
 * A member names one sovereign FARS substrate MASH composes over — a
 * pure {id, root} record. Whether `root` actually resolves to an
 * existing directory is an effectful question (FeltOS's own live
 * member constructor answers it before it hands a member here).
 *
 * @param {{id: string, root: string}} member the member's id and substrate root
 * @returns {{id: string, root: string}} the frozen member record
 */
export function defineMember({ id, root }) {
  nonEmptyString(id, "member.id");
  nonEmptyString(root, "member.root");
  return Object.freeze({ id, root });
}

/**
 * A cheap shape check, not a validation: true for anything with string
 * id and root fields, regardless of whether root resolves to anything.
 *
 * @param {unknown} value the candidate
 * @returns {boolean} whether value has the member shape
 */
export function isMember(value) {
  return value !== null && typeof value === "object" && typeof value.id === "string" && typeof value.root === "string";
}

function identify(value) {
  return makeNiUri(Buffer.from(canonicalJson(value), "utf8"));
}

/**
 * Read one admitted member face as the committed obligation Δ fires an
 * exchange for: the member's own settled digest (a face's content
 * identity) becomes the carrier of a synthetic DemandRaised-shaped
 * record, so no real chain interval is required to exercise injected
 * hire cells.
 *
 * @param {{member: string, digest: string}} face one composeMembers member face
 * @returns {{member: string, demand: {demand: string, member: string, carrier: Buffer}}} one obligation
 */
export function obligationFromFace(face) {
  if (!face || typeof face.member !== "string" || typeof face.digest !== "string" || face.digest === "") {
    throw new TypeError("obligationFromFace requires a member face with member and digest");
  }
  return Object.freeze({
    member: face.member,
    demand: Object.freeze({
      demand: face.digest,
      member: face.member,
      carrier: Buffer.from(face.digest, "hex"),
    }),
  });
}

/**
 * Every admitted member face's committed obligation, in the composite's
 * own member order.
 *
 * @param {ReadonlyArray<{member: string, digest: string}>} admittedFaces composeMembers's `members`
 * @returns {ReadonlyArray<{member: string, demand: object}>} one obligation per admitted face
 */
export function deriveAdmittedObligations(admittedFaces) {
  if (!Array.isArray(admittedFaces)) throw new TypeError("admittedFaces must be an array");
  return Object.freeze(admittedFaces.map(obligationFromFace));
}

/** The `exchanges` value a σ-only composite carries: exchange-firing is FeltOS's Δ, layered on top of this fold. */
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

function requireReadFace(readFace) {
  if (typeof readFace !== "function") {
    throw new TypeError("composeMembers requires a readFace(member) function when members is non-empty — pass a real reader (FeltOS's readMemberFace), or a lookup over faces already read");
  }
  return readFace;
}

/**
 * Compose many members' settled faces into one MASH-level readout — the
 * σ fold. `readFace(member)` is the only seam onto the outside world:
 * pass FeltOS's readMemberFace to read real FARS substrates, or a
 * trivial lookup over faces you already hold to recompose without
 * touching disk again. `onMemberError` mirrors this house's compositor
 * convention: "throw" (default) aborts the whole tick on one member's
 * corrupted face; "diagnose" omits that member into `diagnostics` and
 * completes over the rest. The returned composite's `exchanges` is
 * always EXCHANGES_UNFIRED — firing the exchanges admitted obligations
 * license is Δ, layered on by the caller (see FeltOS's runTick).
 *
 * @param {ReadonlyArray<{id: string, root: string}>} members members built by defineMember
 * @param {{onMemberError?: "throw"|"diagnose", readFace?: (member: {id: string, root: string}) => {member: string, digest: string}}} [options] tick options
 * @returns {{members: ReadonlyArray<object>, diagnostics: ReadonlyArray<object>, exchanges: ReadonlyArray<object>, digest: string}} the composite
 */
export function composeMembers(members, { onMemberError = "throw", readFace } = {}) {
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

  const read = members.length === 0 ? readFace : requireReadFace(readFace);
  const faces = [];
  const diagnostics = [];
  for (const member of members) {
    try {
      faces.push(read(member));
    } catch (error) {
      if (onMemberError === "throw") throw error;
      diagnostics.push(memberDiagnostic(member, error));
    }
  }

  const sortedFaces = faces.slice().sort(byMemberId);
  const digest = identify({
    members: sortedFaces.map((face) => ({ member: face.member, digest: face.digest })),
  });

  return Object.freeze({
    members: Object.freeze(sortedFaces),
    diagnostics: Object.freeze(diagnostics),
    exchanges: EXCHANGES_UNFIRED,
    digest,
  });
}
