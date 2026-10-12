import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import * as activitypub from "./activitypub.mjs";
import {
  organizingTheatreStrongestPathOverlap,
  organizingTheatreWorkLocusClaimConflictsAcross,

} from "./work-locus.mjs";

export function organizingTheatreAgentLocus(
  input                                  ,
  options                                     = {},
)                              {
  const lane = OrganizingTheatreRecord(input.lane);
  const locus                              = {
    kind: options.kind ?? "organizing.theatre.agent-locus",
    session: input.session,
    harnesses: Object.freeze([...new Set(input.harnesses ?? [])].filter(Boolean).sort()),
    updatedAt: input.updatedAt ?? null,
    hooks: input.hooks ?? 0,
    currentCwd: typeof lane?.currentCwd === "string" ? lane.currentCwd : null,
    focusPaths: Object.freeze(OrganizingTheatreStringArray(lane?.focusPaths).slice(0, options.focusPathsMax ?? 12)),
    lastTool: typeof lane?.lastTool === "string" ? lane.lastTool : null,
    lastEventAt: typeof lane?.lastEventAt === "string" ? lane.lastEventAt : null,
    hookCounts: lane?.hookCounts ?? [],
    toolCounts: lane?.toolCounts ?? [],
  };
  if (input.role !== undefined) {
    Object.assign(locus, { role: input.role });
  }
  return Object.freeze(locus);
}

export function organizingTheatreCollisionAwarenessFor(
  yourLane                            ,
  peerSessions                                              ,
  options                             = {},
)                                                 {
  const yours = new Set(yourLane.focusPaths ?? []);
  const warnings                                        = [];
  for (const peer of peerSessions) {
    for (const peerPath of peer.lane?.focusPaths ?? []) {
      if (peerPath === ".") continue;
      const match = organizingTheatreStrongestPathOverlap(yours, peerPath);
      if (match !== null) {
        warnings.push(Object.freeze({
          peerSession: peer.session,
          path: match,
          peerPath,
          reason: match === peerPath ? "same focus path" : "overlapping path prefix",
          ...(peer.updatedAt === undefined ? {} : { updatedAt: peer.updatedAt }),
        }));
      }
    }
  }
  return Object.freeze(warnings
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.path.localeCompare(right.path))
    .slice(0, options.max ?? 16));
}

export function organizingTheatreModeledRelations(
  loci                                        ,
  collisionAwareness                                                ,
  activeClaims                                                   = [],
  options

     = {},
)                                            {
  const relationKind = options.relationKind ?? "organizing.theatre.agent-relation";
  const source = options.source ?? "observer";
  const coPresentReason = options.coPresentReason ?? "recent hook state present in the shared OrganizingTheatre event field";
  const relations                                   = [];
  for (const item of collisionAwareness) {
    relations.push(Object.freeze({
      kind: relationKind,
      relation: "focus-overlap",
      source,
      target: item.peerSession,
      path: item.path,
      peerPath: item.peerPath,
      reason: item.reason,
      ...(item.updatedAt === undefined ? {} : { updatedAt: item.updatedAt }),
    }));
  }
  for (const locus of loci.slice(1)) {
    relations.push(Object.freeze({
      kind: relationKind,
      relation: "co-present-session",
      source,
      target: locus.session,
      path: locus.currentCwd ?? ".",
      reason: coPresentReason,
      ...(locus.updatedAt === undefined ? {} : { updatedAt: locus.updatedAt }),
    }));
  }
  const observerSession = options.observerSession ?? null;
  const observerLocus = loci.find((locus) => locus.session === observerSession) ?? loci[0] ?? null;
  const observerPaths = new Set(observerLocus?.focusPaths ?? []);
  for (const claim of activeClaims) {
    for (const claimPath of claim.paths) {
      const overlap = organizingTheatreStrongestPathOverlap(observerPaths, claimPath);
      if (overlap === null) continue;
      relations.push(Object.freeze({
        kind: relationKind,
        relation: claim.session === observerSession ? "self-locus-claim" : "claimed-locus-overlap",
        source,
        target: claim.session,
        path: overlap,
        peerPath: claimPath,
        reason: claim.reason ?? "active work-locus claim",
        claimId: claim.claimId,
        updatedAt: claim.at,
        expiresAt: claim.expiresAt,
      }));
    }
  }
  return Object.freeze(relations
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.target.localeCompare(right.target))
    .slice(0, options.max ?? 32));
}

export function organizingTheatreModeledAgentSemioticHub(
  input                                               ,
  config                                ,
)                                           {
  const events = input.events;
  const activities = input.activities;
  const activeClaims = input.activeClaims ?? [];
  const claimConflicts = input.claimConflicts ?? organizingTheatreWorkLocusClaimConflictsAcross(activeClaims, config, input.workLocusOptions);
  const relations = input.relations ?? organizingTheatreModeledRelations(input.loci, input.collisionAwareness ?? [], activeClaims, {
    observerSession: input.observer.session,
  });
  const harnesses = new Set(input.harnesses ?? [input.observer.harness]);
  for (const locus of input.loci) for (const item of locus.harnesses ?? []) harnesses.add(item);
  const oldestEventAt = input.oldestEventAt ?? eventAt(events[0]);
  const newestEventAt = input.newestEventAt ?? eventAt(events.at(-1));
  return Object.freeze({
    kind: input.kind ?? "organizing.theatre.modeled-agent-semiotic-hub",
    shortName: input.shortName ?? "OrganizingTheatre",
    title: input.title ?? "Modeled Agent Semiotic Hub",
    claim: input.claim ?? "A OrganizingTheatre surface where agent sessions, activities, loci, relations, and work projections become a readable multi-agent manifold.",
    generatedAt: input.generatedAt,
    observer: input.observer,
    spacetime: Object.freeze({
      eventWindow: events.length,
      activityWindow: activities.length,
      sessionCount: input.sessionCount,
      harnesses: Object.freeze([...harnesses].filter(Boolean).sort()),
      oldestEventAt,
      newestEventAt,
      clock: "activitypub-published-order"         ,
    }),
    activityPub: Object.freeze({
      kind: input.activityPub?.kind ?? "organizing.theatre.activitypub",
      claim: input.activityPub?.claim ?? "The OrganizingTheatre trace is read as ActivityStreams activities and projected as an OrderedCollection outbox.",
      context: ACTIVITYSTREAMS_CONTEXT,
      outbox: activitypub.organizingTheatreOutbox(activities.slice(-(input.outboxLimit ?? 32)), config),
      federation: input.activityPub?.federation ?? activitypub.organizingTheatreActivityPubFederation(activities, config),
    }),
    channels: input.channels ?? {},
    loci: Object.freeze([...input.loci]),
    relations,
    workField: Object.freeze({
      ...(input.workField ?? {}),
      activeClaims,
      claimConflicts,
    }),
    recentEvents: Object.freeze([...(input.recentEvents ?? [])]),
    nextInterfaces: Object.freeze([...(input.nextInterfaces ?? [])]),
  });
}

function eventAt(event         )                {
  if (event === null || typeof event !== "object") return null;
  const value = (event                           ).at;
  return typeof value === "string" ? value : null;
}

function OrganizingTheatreRecord(value         )                                 {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value                            : null;
}

function OrganizingTheatreStringArray(value         )           {
  return Array.isArray(value) ? value.filter((item)                 => typeof item === "string") : [];
}