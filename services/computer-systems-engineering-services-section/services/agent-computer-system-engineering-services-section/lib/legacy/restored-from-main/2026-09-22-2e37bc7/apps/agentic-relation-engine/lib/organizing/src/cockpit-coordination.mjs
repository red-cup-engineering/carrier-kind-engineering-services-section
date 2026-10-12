import { posix } from "node:path";
import {
  carrierFrom,

} from "@red-cup-engineering/relating";
import { cell } from "@red-cup-engineering/relating/ledger/cells";
import { cohere } from "@red-cup-engineering/relating/ledger/reading";

import {
  federateGraded,

} from "./federate-graded.mjs";

// ── the held write-capability as one RWIL witness row ────────────────────────

const CLAIM_ATTRIBUTE = "workspace-write-capability-held";

function claimEntity(path) {
  return Object.freeze(["organizing", "cockpit", "work-locus", path]);
}

/**
 * The one EAVT row that IS the held capability claim. Entity = the claimed path,
 * value = who holds it under which capability until when. This is the shared
 * pivot every reading round-trips through.
 */
export function claimWitness(
  claim,
  path,
) {
  return cell(
    claimEntity(path),
    CLAIM_ATTRIBUTE,
    Object.freeze({
      claimId: claim.claimId,
      session: claim.session,
      harness: claim.harness,
      capability: claim.capability.id,
      grants: claim.capability.grants,
      holder: claim.capability.holder,
      reason: claim.reason ?? null,
      expiresAt: claim.expiresAt ?? null,
    }),
    Object.freeze({
      session: claim.session,
      at: claim.at ?? null,
      event: claim.event ?? null,
    }),
  );
}

function heldCapabilityFromWitness(row) {
  if (row.e === null || typeof row.e !== "object" || !Array.isArray(row.e)) {
    throw new TypeError("cockpit claim reading: witness entity is not a path tuple");
  }
  if (row.v === null || typeof row.v !== "object" || Array.isArray(row.v)) {
    throw new TypeError("cockpit claim reading: witness value is not a record");
  }
  if (row.t === null || typeof row.t !== "object" || Array.isArray(row.t)) {
    throw new TypeError("cockpit claim reading: witness time is not a record");
  }
  const entity = row.e;
  const value = row.v;
  const time = row.t;
  const path = entity[entity.length - 1];
  if (typeof path !== "string") throw new TypeError("cockpit claim reading: malformed path entity");
  const session = value.session;
  const harness = value.harness;
  const claimId = value.claimId;
  const capability = value.capability;
  const grants = value.grants;
  const holder = value.holder;
  if (typeof session !== "string" || typeof harness !== "string" || typeof claimId !== "string") {
    throw new TypeError("cockpit claim reading: malformed holder identity");
  }
  if (typeof capability !== "string" || typeof grants !== "string" || typeof holder !== "string") {
    throw new TypeError("cockpit claim reading: malformed capability");
  }
  return Object.freeze({
    kind: "organizing.cockpit.held-capability",
    path,
    session,
    harness,
    claimId,
    capability,
    grants,
    holder,
    reason: typeof value.reason === "string" ? value.reason : null,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
    at: typeof time.at === "string" ? time.at : null,
    event: typeof time.event === "string" ? time.event : null,
  });
}

function witnessFromHeldCapability(wire) {
  return cell(
    claimEntity(wire.path),
    CLAIM_ATTRIBUTE,
    Object.freeze({
      claimId: wire.claimId,
      session: wire.session,
      harness: wire.harness,
      capability: wire.capability,
      grants: wire.grants,
      holder: wire.holder,
      reason: wire.reason,
      expiresAt: wire.expiresAt,
    }),
    Object.freeze({
      session: wire.session,
      at: wire.at,
      event: wire.event,
    }),
  );
}

/**
 * The held write-capability read as a coherence-kernel `Reading`: the claim row
 * and the held-capability wire are the same object under two codes, exactly like
 * `outbox ≅ log`. This is what makes the claim QUERYABLE — it is a real RWIL
 * reading, not an ad-hoc record.
 */
export const heldCapabilityReading = Object.freeze({
  id: "organizing.cockpit.held-capability",
  toWire: heldCapabilityFromWitness,
  fromWire: witnessFromHeldCapability,
});

// ── wiring 1: a held capability claim is an ACCOUNTABLE transaction ──────────

/**
 * Authority gate: does the held `Capability` actually grant the claimed path?
 *
 * Work-locus capabilities are granted as `workspace:<path>|<path>...` (see
 * `organizingTheatreWorkLocusCapabilityGrant`). A claim over `path` is authorized
 * iff the capability's grant string names that path (or a prefix of it).
 */
export function capabilityGrantsPath(capability, path) {
  const grants = capability.grants;
  if (typeof grants !== "string" || !grants.startsWith("workspace:")) return false;
  if (path === "") return false;
  const query = posix.normalize(path).replace(/\/$/u, "");
  const granted = grants.slice("workspace:".length).split("|").filter((entry) => entry !== "")
    .map((entry) => posix.normalize(entry).replace(/\/$/u, ""));
  return granted.some((entry) => entry === query || query.startsWith(`${entry}/`));
}

const accountableClaimSchema = {
  $id: "organizing/cockpit/accountable-claim",
  title: "CockpitAccountableClaim",
  description:
    "A held workspace write-capability read as an accountable transaction: authorized (capability grants the path), witnessed (one RWIL row), and queryable. Overlapping claims preserve every holder and require admission.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "path", "query", "witness", "authorized", "witnessed", "accountable", "legs", "standing", "holders", "coherence"],
  properties: {
    kind: { const: "organizing.cockpit.accountable-claim" },
    path: { type: "string", minLength: 1 },
    query: { const: "authorized and witnessed" },
    witness: {},
    authorized: { type: "boolean" },
    witnessed: { type: "boolean" },
    accountable: { type: "boolean" },
    legs: {
      type: "object",
      additionalProperties: false,
      required: ["authorized", "witnessed"],
      properties: {
        authorized: { type: "string", minLength: 1 },
        witnessed: { type: "string", minLength: 1 },
      },
    },
    standing: { enum: ["sole", "requires-admission"] },
    holders: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["session", "harness", "claimId", "capability", "witness", "authorized"],
        properties: {
          session: { type: "string", minLength: 1 },
          harness: { type: "string", minLength: 1 },
          claimId: { type: "string", minLength: 1 },
          capability: { type: "string", minLength: 1 },
          witness: { type: "string", minLength: 1 },
          authorized: { type: "boolean" },
        },
      },
    },
    coherence: { type: "array", items: {} },
  },
};

export const accountableClaimCarrier = carrierFrom(accountableClaimSchema);

/** Read authorization and witness evidence; overlapping claims require admission. */
export function accountableClaim(
  path,
  claims,
) {
  if (claims.length === 0) throw new TypeError("accountableClaim: at least one claim is required");
  const holders = [];
  const coherence = [];
  for (const claim of claims) {
    const row = claimWitness(claim, path);
    const authorized = capabilityGrantsPath(claim.capability, path);
    holders.push(Object.freeze({
      session: claim.session,
      harness: claim.harness,
      claimId: claim.claimId,
      capability: claim.capability.id,
      witness: `${claim.session}:${claim.claimId}`,
      authorized,
    }));
    // The claim round-trips through the kernel: it IS a coherent RWIL reading.
    coherence.push(cohere(heldCapabilityReading, heldCapabilityReading, row));
  }
  const sortedHolders = Object.freeze([...holders].sort((left, right) => left.session.localeCompare(right.session) || left.claimId.localeCompare(right.claimId)));
  const authorized = sortedHolders.every((holder) => holder.authorized);
  const witnessed = coherence.every((report) => report.ok);
  const requiresAdmission = sortedHolders.length > 1;
  return accountableClaimCarrier.assert(Object.freeze({
    kind: "organizing.cockpit.accountable-claim",
    path,
    query: "authorized and witnessed",
    witness: claimWitness(claims[0], path),
    authorized,
    witnessed,
    accountable: authorized && witnessed && !requiresAdmission,
    legs: {
      authorized: authorized ? "potential" : "active",
      witnessed: witnessed ? "potential" : "active",
    },
    standing: requiresAdmission ? "requires-admission" : "sole",
    holders: sortedHolders,
    coherence: Object.freeze(coherence),
  }), "cockpit accountable claim");
}

// ── wiring 2: peer disagreement routes through CONTRADICTION-AWARE FEDERATION ─

function pathsOf(claim) {
  return claim.paths.filter((path) => typeof path === "string" && path !== "" && path !== ".");
}

/**
 * The intent a claim takes on a path. The claim's `reason` is the shared
 * coordination vocabulary: two sessions naming the SAME reason agree, and two
 * naming DIFFERENT reasons require an admission decision. A claim with no stated
 * reason takes a holder-unique stance, so it too requires admission when another
 * source asserts a distinct value.
 */
function intentOf(claim) {
  return typeof claim.reason === "string" && claim.reason !== ""
    ? `intent:${claim.reason}`
    : `holder:${claim.session}:${claim.claimId}`;
}

/**
 * Project the cockpit's active work-locus claims into `federateGraded` sources:
 * one source per session, one cell per claimed path. A path claimed by a single
 * session is agreement (shared); a path claimed by two sessions is disagreement,
 * routed through contradiction-aware federation. The value carried per cell is the
 * claim's INTENT (`reason`), whose distinct same-polarity values are presented for
 * explicit admission rather than classified by an unproved cohomological rule.
 */
export function cockpitFederationSources(
  claims,
) {
  const bySession = new Map();
  for (const claim of claims) {
    bySession.set(claim.session, [...(bySession.get(claim.session) ?? []), claim]);
  }
  const sources = [];
  for (const [session, group] of [...bySession.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const collection = [];
    for (const claim of group) {
      for (const path of pathsOf(claim)) {
        collection.push(Object.freeze({
          cell: path,
          value: intentOf(claim),
          witness: `${claim.session}:${claim.claimId}:${path}`,
        }));
      }
    }
    if (collection.length === 0) continue;
    sources.push(Object.freeze({
      id: session,
      protocol: "cockpit-work-locus",
      collection: Object.freeze(collection),
    }));
  }
  return Object.freeze(sources);
}

const cockpitCoordinationSchema = {
  $id: "organizing/cockpit/coordination",
  title: "CockpitCoordination",
  description:
    "The cockpit's claim field coordinated over its own bridges: per-path accountable claims (held capability as authorized ∧ witnessed transaction, overlapping paths requiring admission) plus contradiction-aware federation of competing claims. Shared evidence is retained, opposite polarities for the same value form a bilattice top, and incompatible same-polarity values require admission.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "claims", "federation"],
  properties: {
    kind: { const: "organizing.cockpit.coordination" },
    claims: { type: "array", items: { $ref: "organizing/cockpit/accountable-claim" } },
    federation: {},
  },
};

export const cockpitCoordinationCarrier = carrierFrom(cockpitCoordinationSchema);

/**
 * coordinateCockpitClaims — the additive bridge the live cockpit CAN switch to.
 *
 * Wiring 1: each claimed path becomes an accountable claim (held capability as
 * authorized ∧ witnessed, overlaps requiring admission).
 *
 * Wiring 2: all competing claims are routed through `federateGraded`, which
 * preserves shared witnesses and exposes only incompatible values for admission.
 *
 * This does not touch the running hook loop; it is a pure reading over the same
 * `OrganizingTheatreActiveWorkLocusClaim[]` the live signal already produces.
 */
export function coordinateCockpitClaims(
  claims,
) {
  const byPath = new Map();
  for (const claim of claims) {
    for (const path of pathsOf(claim)) {
      byPath.set(path, [...(byPath.get(path) ?? []), claim]);
    }
  }
  const accountable = [];
  for (const [path, group] of [...byPath.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    accountable.push(accountableClaim(path, group));
  }

  const sources = cockpitFederationSources(claims);
  const federation = sources.length === 0
    ? null
    : federateGraded(sources);

  return cockpitCoordinationCarrier.assert(Object.freeze({
    kind: "organizing.cockpit.coordination",
    claims: Object.freeze(accountable),
    federation,
  }), "cockpit coordination");
}
