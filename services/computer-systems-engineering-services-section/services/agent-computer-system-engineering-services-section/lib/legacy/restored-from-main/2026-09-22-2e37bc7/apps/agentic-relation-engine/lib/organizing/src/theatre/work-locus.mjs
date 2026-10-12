import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import { grant } from "@red-cup-engineering/animating/writing/activitypub/capability";

export function organizingTheatreWorkLocusCapability(
  claim                                 ,
  config                                ,
  options                                    = {},
)             {
  if (claim.capability?.type === "Capability" && typeof claim.capability.id === "string") return claim.capability;
  const holder = organizingTheatreAgentActorId(config, claim.harness, claim.session);
  const grants = organizingTheatreWorkLocusCapabilityGrant(claim);
  const base = trimmedBase(config.baseUrl);
  const capabilityBasePath = options.capabilityBasePath ?? "/capabilities/work-locus";
  const id = `${base}${capabilityBasePath.startsWith("/") ? capabilityBasePath : `/${capabilityBasePath}`}/${encodeURIComponent(String(claim.claimId))}`;
  return grant(holder, grants, id);
}

export function organizingTheatreWorkLocusCapabilityGrant(claim                                                            )         {
  const paths = Array.isArray(claim.paths) ? claim.paths.filter((item) => typeof item === "string" && item !== "") : [];
  return `workspace:${paths.length === 0 ? String(claim.claimId ?? "unknown-locus") : paths.join("|")}`;
}

export function organizingTheatreWorkLocusCapabilitySignal(
  claim                                                                         ,
  config                                ,
  options                                    = {},
)

   {
  const capability = "capability" in claim && claim.capability?.type === "Capability"
    ? claim.capability
    : organizingTheatreWorkLocusCapability(claim                                   , config, options);
  return Object.freeze({
    kind: "organizing.theatre.active-work-locus-capability",
    id: capability.id,
    grants: capability.grants,
    holder: capability.holder,
    claimId: String(claim.claimId),
    session: String(claim.session),
    harness: String(claim.harness),
    paths: Array.isArray(claim.paths) ? claim.paths : [],
    reason: typeof claim.reason === "string" ? claim.reason : null,
    expiresAt: typeof claim.expiresAt === "string" ? claim.expiresAt : null,
  });
}

export function organizingTheatreActiveWorkLocusClaims(
  events                                            ,
  config                                ,
  options                                                                             = {},
)                                                   {
  const active = new Map                                               ();
  const releases = new Set        ();
  const now = options.now ?? new Date();
  for (const event of events) {
    const claim = organizingTheatreWorkLocusClaimFrom(event.locusClaim, options);
    if (claim === null) continue;
    const paths = claim.paths.filter((item) => item !== "");
    const releaseKeys = OrganizingTheatreWorkLocusClaimKeys(claim, config, options, paths);
    if (claim.action === "release") {
      for (const key of releaseKeys) {
        releases.add(key);
        active.delete(key);
      }
      if (claim.claimId !== "") {
        for (const [key, value] of active) {
          if (value.session === String(claim.session ?? event.session ?? "unknown-session") && value.claimId === claim.claimId) active.delete(key);
        }
      }
      const releaseReason = typeof claim.reason === "string" ? claim.reason : null;
      const releasePaths = new Set(paths);
      if (releaseReason !== null && releasePaths.size > 0) {
        const releaseSession = String(claim.session ?? event.session ?? "unknown-session");
        for (const [key, value] of active) {
          if (value.session !== releaseSession || value.reason !== releaseReason) continue;
          const overlaps = value.paths.some((activePath) => organizingTheatreStrongestPathOverlap(releasePaths, activePath) !== null);
          if (overlaps) active.delete(key);
        }
      }
      continue;
    }
    const expiresAt = typeof claim.expiresAt === "string" ? Date.parse(claim.expiresAt) : Number.NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) continue;
    for (const key of releaseKeys) {
      if (releases.has(key)) continue;
      active.set(key, Object.freeze({
        kind: options.activeKind ?? "organizing.theatre.active-work-locus-claim",
        claimId: String(claim.claimId ?? key),
        capability: organizingTheatreWorkLocusCapability(claim, config, options),
        session: String(claim.session ?? event.session ?? "unknown-session"),
        harness: String(claim.harness ?? event.harness ?? "agent"),
        paths,
        reason: typeof claim.reason === "string" ? claim.reason : null,
        at: typeof claim.at === "string" ? claim.at : event.at ?? null,
        expiresAt: claim.expiresAt ?? null,
        event: event.id ?? null,
      }));
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaims([...active.values()])
    .sort((left, right) => String(right.at ?? "").localeCompare(String(left.at ?? "")) || left.claimId.localeCompare(right.claimId))
    .slice(0, options.max ?? 64));
}

export function organizingTheatreWorkLocusClaimConflictsFor(
  claim                                 ,
  activeClaims                                                  ,
  config                                ,
  options                                    = {},
)                                                     {
  if (claim.action !== "claim") return [];
  const claimPathsSet = new Set(claim.paths);
  const conflicts                                            = [];
  for (const active of activeClaims) {
    if (active.session === claim.session && active.claimId === claim.claimId) continue;
    for (const activePath of active.paths) {
      const overlap = organizingTheatreStrongestPathOverlap(claimPathsSet, activePath);
      if (overlap === null) continue;
      conflicts.push(OrganizingTheatreWorkLocusClaimConflict({ left: claim, right: active, path: overlap, leftPath: overlap, rightPath: activePath }, config, options));
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts));
}

export function organizingTheatreWorkLocusClaimConflictsAcross(
  activeClaims                                                  ,
  config                                ,
  options                                                                 = {},
)                                                     {
  const conflicts                                            = [];
  for (let leftIndex = 0; leftIndex < activeClaims.length; leftIndex += 1) {
    const left = activeClaims[leftIndex];
    if (left === undefined) continue;
    const leftPaths = new Set(left.paths);
    for (let rightIndex = leftIndex + 1; rightIndex < activeClaims.length; rightIndex += 1) {
      const right = activeClaims[rightIndex];
      if (right === undefined) continue;
      if (left.session === right.session && left.claimId === right.claimId) continue;
      for (const rightPath of right.paths) {
        const overlap = organizingTheatreStrongestPathOverlap(leftPaths, rightPath);
        if (overlap === null) continue;
        conflicts.push(OrganizingTheatreWorkLocusClaimConflict({ left, right, path: overlap, leftPath: overlap, rightPath }, config, options));
      }
    }
  }
  return Object.freeze(dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts).slice(0, options.max ?? 32));
}

export function organizingTheatreStrongestPathOverlap(yourPaths                  , peerPath        )                {
  for (const yourPath of yourPaths) {
    if (yourPath === "." || peerPath === ".") continue;
    if (yourPath === peerPath) return yourPath;
    if (yourPath.length >= 6 && peerPath.startsWith(`${yourPath}/`)) return yourPath;
    if (peerPath.length >= 6 && yourPath.startsWith(`${peerPath}/`)) return peerPath;
  }
  return null;
}

export function organizingTheatreWorkLocusClaimFrom(value         , options                                    = {})                                         {
  if (value === null || typeof value !== "object") return null;
  const claim = value                           ;
  if (claim.kind !== (options.claimKind ?? "organizing.theatre.work-locus-claim")) return null;
  const action = claim.action === "release" ? "release" : claim.action === "claim" ? "claim" : null;
  if (action === null) return null;
  const paths = Array.isArray(claim.paths) ? claim.paths.filter((item)                 => typeof item === "string" && item !== "") : [];
  return Object.freeze({
    kind: String(claim.kind),
    action,
    claimId: String(claim.claimId ?? ""),
    session: String(claim.session ?? "unknown-session"),
    harness: String(claim.harness ?? "agent"),
    paths,
    ...(typeof claim.reason === "string" ? { reason: claim.reason } : { reason: null }),
    ...(typeof claim.at === "string" ? { at: claim.at } : { at: null }),
    ...(typeof claim.expiresAt === "string" ? { expiresAt: claim.expiresAt } : { expiresAt: null }),
    ...(isCapability(claim.capability) ? { capability: claim.capability } : {}),
  });
}

function OrganizingTheatreWorkLocusClaimKeys(
  claim                                 ,
  config                                ,
  options                                   ,
  paths = claim.paths,
)                    {
  const session = String(claim.session ?? "unknown-session");
  const claimId = String(claim.claimId ?? "");
  const capabilityId = claim.capability?.id ?? organizingTheatreWorkLocusCapability(claim, config, options).id;
  return Object.freeze([
    ...(claimId === "" ? [] : [`${session}:${claimId}`]),
    `${session}:${capabilityId}`,
    ...paths.map((item) => `${session}:${item}`),
  ]);
}

function OrganizingTheatreWorkLocusClaimConflict(
  input

    ,
  config                                ,
  options                                   ,
)                                          {
  return Object.freeze({
    kind: options.conflictKind ?? "organizing.theatre.work-locus-claim-conflict",
    relation: "claimed-locus-overlap",
    path: input.path,
    left: OrganizingTheatreClaimConflictSide(input.left, input.leftPath, config, options),
    right: OrganizingTheatreClaimConflictSide(input.right, input.rightPath, config, options),
    reason: input.left.session === input.right.session ? "same session has overlapping active claims" : "different sessions have overlapping active claims",
    severity: input.left.session === input.right.session ? "notice" : "watch",
  });
}

function OrganizingTheatreClaimConflictSide(
  claim                                                                         ,
  path        ,
  config                                ,
  options                                   ,
)                                         {
  const capability = "capability" in claim && claim.capability?.type === "Capability"
    ? claim.capability
    : organizingTheatreWorkLocusCapability(claim                                   , config, options);
  return Object.freeze({
    claimId: claim.claimId,
    capability: capability.id,
    session: claim.session,
    harness: claim.harness,
    path,
    reason: claim.reason ?? null,
    at: claim.at ?? null,
    expiresAt: claim.expiresAt ?? null,
  });
}

function dedupeOrganizingTheatreWorkLocusClaimConflicts(conflicts                                                    )                                            {
  const seen = new Set        ();
  const out                                            = [];
  for (const conflict of conflicts) {
    const key = [
      conflict.path,
      conflict.left.session,
      conflict.left.claimId,
      conflict.right.session,
      conflict.right.claimId,
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(conflict);
  }
  return out.sort((left, right) => left.path.localeCompare(right.path) || left.left.session.localeCompare(right.left.session) || left.right.session.localeCompare(right.right.session));
}

function dedupeOrganizingTheatreWorkLocusClaims(claims                                                  )                                          {
  const seen = new Set        ();
  const out                                          = [];
  for (const claim of claims) {
    const key = claim.claimId;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(claim);
  }
  return out;
}

function isCapability(value         )                      {
  return value !== null
    && typeof value === "object"
    && (value                           )["@context"] === ACTIVITYSTREAMS_CONTEXT
    && (value                           ).type === "Capability"
    && typeof (value                           ).id === "string"
    && typeof (value                           ).grants === "string"
    && typeof (value                           ).holder === "string";
}

function organizingTheatreAgentActorId(
  config                                ,
  harness        ,
  session        ,
)         {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

function trimmedBase(baseUrl        )         {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
