import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import { orderedCollection, outboxOf } from "@red-cup-engineering/animating/writing/activitypub/collections";
import { codecs } from "@red-cup-engineering/relating";

import {
  organizingTheatreActionNamesFromActivities,
  organizingTheatreAgentActorsForEvents,
  organizingTheatreSessionCharacter,

} from "./performing/session-character.mjs";
import {
  organizingTheatreInboxActivitiesFor,
  organizingTheatreInboxPerceptionSignal,
  organizingTheatreIsActivity,

} from "./performing/inbox-perception.mjs";
import {
  organizingTheatreActiveWorkLocusClaims,
  organizingTheatreStrongestPathOverlap,
  organizingTheatreWorkLocusCapability,
  organizingTheatreWorkLocusCapabilityGrant,
  organizingTheatreWorkLocusCapabilitySignal,
  organizingTheatreWorkLocusClaimConflictsAcross,
  organizingTheatreWorkLocusClaimConflictsFor,
  organizingTheatreWorkLocusClaimFrom,

} from "./theatre/work-locus.mjs";
import {
  admittedOrganizingTheatreActionActivities,
  organizingTheatreActivityForEvent,

} from "./theatre/event-activity.mjs";
import * as activitypub from "./theatre/activitypub.mjs";

const { eavtRecord } = codecs.text.json.jsonl.eavt;

export {
  organizingTheatreAgentActorsForEvents,
  organizingTheatreSessionCharacter,

} from "./performing/session-character.mjs";

export {
  organizingTheatreActivityAddressedTo,
  organizingTheatreCompactActivitySummary,
  organizingTheatreInboxActivitiesFor,
  organizingTheatreInboxPerceptionSignal,
  organizingTheatreIsActivity,

} from "./performing/inbox-perception.mjs";

export {
  organizingTheatreActiveWorkLocusClaims,
  organizingTheatreStrongestPathOverlap,
  organizingTheatreWorkLocusCapability,
  organizingTheatreWorkLocusCapabilityGrant,
  organizingTheatreWorkLocusCapabilitySignal,
  organizingTheatreWorkLocusClaimConflictsAcross,
  organizingTheatreWorkLocusClaimConflictsFor,
  organizingTheatreWorkLocusClaimFrom,

} from "./theatre/work-locus.mjs";

export * from "./theatre/activitypub.mjs";
export * from "./theatre/manifold.mjs";
export * from "./theatre/event-activity.mjs";

function trimmedBase(baseUrl        )         {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}

export function organizingTheatreAgentEventsFromWitnessRows(
  rows                                              ,
  config                                ,
  options                                            = {},
)                                               {
  return Object.freeze(rows
    .map((row, index) => organizingTheatreAgentEventFromWitnessRow(eavtRecord(row), config, options, index))
    .filter((event)                                             => event !== null));
}

function organizingTheatreAgentEventFromWitnessRow(
  row            ,
  config                                ,
  options                                           ,
  index        ,
)                                           {
  const attribute = OrganizingTheatreRecord(row.a);
  const value = OrganizingTheatreRecord(row.v);
  if (attribute === null || value === null) return null;
  const verb = stringField(attribute, "verb");
  if (verb === (options.recordedEventVerb ?? "record-dev-event") && value.kind === (options.recordedEventKind ?? options.kind ?? "organizing.theatre.agent-event")) {
    return normalizeWitnessAgentEvent(value, config, options);
  }
  if (verb !== (options.hookVerb ?? "admit-hook-event")) return null;
  if (value.kind !== (options.hookAdmissionKind ?? "information-coherence-kernel.hook.admission")) return null;
  const payload = OrganizingTheatreRecord(value.payload) ?? {
    hook_event_name: stringField(value, "hookEventName") ?? "HookEvent",
    session_id: stringField(value, "session") ?? (options.defaultSession ?? "unknown-session"),
    harness: stringField(value, "harness") ?? (options.defaultHarness ?? "agent"),
    ...(stringField(value, "cwd") === null ? {} : { cwd: stringField(value, "cwd") }),
    ...(stringField(value, "tool") === null ? {} : { tool_name: stringField(value, "tool") }),
  };
  const at = typeof row.t === "string" ? row.t : new Date(0).toISOString();
  const session = stringField(value, "session") ?? stringField(payload, "session_id") ?? stringField(payload, "session") ?? (options.defaultSession ?? "unknown-session");
  const harness = stringField(value, "harness") ?? stringField(payload, "harness") ?? (options.defaultHarness ?? "agent");
  const hook = stringField(value, "hookEventName") ?? stringField(payload, "hook_event_name") ?? "HookEvent";
  return normalizeWitnessAgentEvent({
    kind: options.kind ?? "organizing.theatre.agent-event",
    at,
    id: `ick-hook-event:${stableHash([row.e, row.a, row.v, row.t]).slice(0, 24)}`,
    source: options.hookSource ?? "information-coherence-kernel.admit-hook-event",
    ...(options.cockpit === undefined ? {} : { cockpit: options.cockpit }),
    harness,
    session,
    hookEventName: hook,
    payload,
    ickWitness: {
      ...(options.root === undefined ? {} : { root: options.root }),
      namespace: options.namespace ?? "root",
      caller: row.e ?? null,
      verb: options.hookVerb ?? "admit-hook-event",
    },
  }, config, options, index);
}

function normalizeWitnessAgentEvent(
  event                                   ,
  config                                ,
  options                                           ,
  index = 0,
)                                    {
  if (organizingTheatreIsActivity(event.activity)) return event                                     ;
  const id = stringField(event, "id") ?? `organizing-theatre-event:${stableHash([event, index]).slice(0, 24)}`;
  const at = stringField(event, "at") ?? new Date(0).toISOString();
  const source = stringField(event, "source") ?? "organizing.theatre.witness";
  const session = stringField(event, "session") ?? (options.defaultSession ?? "unknown-session");
  const harness = stringField(event, "harness") ?? (options.defaultHarness ?? "agent");
  const hook = stringField(event, "hookEventName") ?? "HookEvent";
  const payload = OrganizingTheatreRecord(event.payload) ?? {};
  const { activity: _activity, ...extra } = event;
  return Object.freeze({
    ...event,
    id,
    at,
    source,
    session,
    harness,
    hookEventName: hook,
    payload,
    activity: organizingTheatreActivityForEvent({
      id,
      at,
      source,
      session,
      harness,
      hookEventName: hook,
      payload,
      extra,
    }, config, options),
  })                                     ;
}

function stringField(record                                   , key        )                {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function stableHash(value         )         {
  let h = 2166136261;
  for (const char of JSON.stringify(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function organizingTheatreInstanceProfile(options                                         )                                   {
  const namespace = options.namespace.replace(/\.+$/u, "");
  const service                                 = {
    baseUrl: options.baseUrl,
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.preferredUsername === undefined ? {} : { preferredUsername: options.preferredUsername }),
    ...(options.summary === undefined ? {} : { summary: options.summary }),
  };
  const kinds = Object.freeze({
    agentLocus: `${namespace}.agent-locus`,
    agentMashSignal: `${namespace}.agent-mash-signal`,
    agentSessionHandoff: `${namespace}.agent-session-handoff`,
    agentSessionHandoffResource: `${namespace}.agent-session-handoff-resource`,
    activeWorkLocusCapability: `${namespace}.active-work-locus-capability`,
    activityPub: `${namespace}.mash-activitypub`,
    activityPubActor: `${namespace}.activitypub-actor`,
    activityPubDelivery: `${namespace}.mash-activitypub-delivery`,
    activityPubInboxDelivery: `${namespace}.activitypub-inbox-delivery`,
    activityPubInboxPerception: `${namespace}.activitypub-inbox-perception`,
    activityPubInboxPerceivedAgent: `${namespace}.activitypub-inbox-perceived-agent`,
    activityPubOutbox: `${namespace}.activitypub-outbox`,
    capabilityField: `${namespace}.capability-field`,
    mashActivityPubFederation: `${namespace}.mash-activitypub-federation`,
    mashActivityPubSignal: `${namespace}.mash-activitypub-signal`,
    modeledAgentSemioticHub: `${namespace}.modeled-agent-semiotic-hub`,
    workLocusClaim: `${namespace}.work-locus-claim`,
    workLocusClaimConflict: `${namespace}.work-locus-claim-conflict`,
    activeWorkLocusClaim: `${namespace}.active-work-locus-claim`,
    workLocusClaimResult: `${namespace}.work-locus-claim-result`,
    agentRelation: `${namespace}.agent-relation`,
  });
  const workLocus = Object.freeze({
    claimKind: kinds.workLocusClaim,
    activeKind: kinds.activeWorkLocusClaim,
    conflictKind: kinds.workLocusClaimConflict,
    ...(options.capabilityBasePath === undefined ? {} : { capabilityBasePath: options.capabilityBasePath }),
  });
  const inbox = Object.freeze({
    inboxSource: `${namespace}.activitypub-inbox`,
    kind: kinds.activityPubInboxPerception,
    claim: options.inboxClaim ?? "Inbound ActivityPub Activities are folded through animating's perceiveInbox leg, so an agent inbox is read as an agent membrane.",
    perceivedAgentKind: kinds.activityPubInboxPerceivedAgent,
  });
  return Object.freeze({
    namespace,
    service: Object.freeze(service),
    workLocus,
    kinds,
    inbox,
    activityPubFederation: Object.freeze({
      kind: kinds.mashActivityPubFederation,
      claim: options.activityPubFederationClaim ?? "MASH sessions are ActivityPub actors grouped into harness camps and delivered through organizing federation.",
      deliveryKind: kinds.activityPubDelivery,
    }),
    activityPubOutbox: Object.freeze({
      kind: kinds.activityPubOutbox,
      signalKind: kinds.mashActivityPubSignal,
      federationKind: kinds.mashActivityPubFederation,
      deliveryKind: kinds.activityPubDelivery,
    }),
    eventActivity: Object.freeze({
      ...workLocus,
      handoffKind: kinds.agentSessionHandoff,
    }),
  });
}

export function organizingTheatreAgentSignal(
  input

    ,
  config                                ,
  options                                      = {},
)                               {
  const actorId = input.actorId ?? activitypub.organizingTheatreAgentActorId(config, input.harness, input.session);
  const activeClaims = input.activeClaims ?? organizingTheatreActiveWorkLocusClaims(input.events, config, {
    ...options,
    ...(options.activeClaimsMax === undefined ? {} : { max: options.activeClaimsMax }),
  });
  const claimConflicts = input.claimConflicts ?? organizingTheatreWorkLocusClaimConflictsAcross(activeClaims, config, {
    ...options,
    ...(options.claimConflictsMax === undefined ? {} : { max: options.claimConflictsMax }),
  });
  const activities = input.activities ?? input.events.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const inboxActivities = input.inboxActivities ?? organizingTheatreInboxActivitiesFor(
    input.events,
    actorId,
    options.inbox?.inboxSource === undefined ? {} : { inboxSource: options.inbox.inboxSource },
  );
  const activeCapabilities = activeClaims.map((claim) => OrganizingTheatreCapabilitySignalForAgentSignal(claim, config, options));
  const activityPub = activitypub.organizingTheatreActivityPubSignal(activities, config, input.seedActors);
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.agent-signal",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    harness: input.harness,
    activeClaims,
    yourClaims: Object.freeze(activeClaims.filter((claim) => claim.session === input.session)),
    peerClaims: Object.freeze(activeClaims.filter((claim) => claim.session !== input.session).slice(0, options.peerClaims ?? 8)),
    activeCapabilities: Object.freeze(activeCapabilities),
    yourCapabilities: Object.freeze(activeCapabilities.filter((capability) => capability.session === input.session)),
    peerCapabilities: Object.freeze(activeCapabilities.filter((capability) => capability.session !== input.session).slice(0, options.peerCapabilities ?? 8)),
    claimConflicts,
    yourClaimConflicts: Object.freeze(claimConflicts.filter((conflict) => conflict.left.session === input.session || conflict.right.session === input.session)),
    activityPub: Object.freeze({
      ...activityPub,
      ...(options.activityPubKind === undefined ? {} : { kind: options.activityPubKind }),
      observer: Object.freeze({
        actor: actorId,
        inbox: organizingTheatreInboxPerceptionSignal(actorId, inboxActivities, options.inbox),
      }),
    }),
  });
}

export function organizingTheatreAgentSessionHandoff(
  input                                           ,
  options                                              = {},
)                                       {
  const touchedPathsMax = Math.max(0, options.touchedPathsMax ?? 24);
  const lane = OrganizingTheatreRecord(input.lane);
  const laneFocusPaths = OrganizingTheatreStringArray(lane?.focusPaths);
  const claimPaths = input.signal.yourClaims.flatMap((claim) => claim.paths ?? []);
  const touchedPaths = [...new Set([...laneFocusPaths, ...claimPaths])]
    .filter((item) => item !== "")
    .slice(0, touchedPathsMax);
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.agent-session-handoff",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    harness: input.harness,
    hookEventName: input.hookEventName,
    lane: input.lane,
    recentEvents: Object.freeze([...input.recentEvents]),
    touchedPaths: Object.freeze(touchedPaths),
    activeClaims: Object.freeze([...input.signal.yourClaims]),
    claimConflicts: Object.freeze([...input.signal.yourClaimConflicts]),
    latestGate: input.latestGate ?? null,
    summary: Object.freeze({
      recentEvents: input.recentEvents.length,
      touchedPaths: touchedPaths.length,
      activeClaims: input.signal.yourClaims.length,
      claimConflicts: input.signal.yourClaimConflicts.length,
      lastTool: lane?.lastTool ?? null,
      currentCwd: lane?.currentCwd ?? null,
    }),
    nextInterfaces: Object.freeze([...(options.nextInterfaces ?? [])]),
  });
}

export function organizingTheatreLatestRecordedAgentSessionHandoff(
  events                                                              ,
  session        ,
  options                                                      = {},
)                                                           {
  const handoffKind = options.handoffKind ?? "organizing.theatre.agent-session-handoff";
  return [...events]
    .reverse()
    .find((event) => event.session === session
      && OrganizingTheatreRecord(event.handoffCarrier)?.kind === handoffKind) ?? null;
}

export function organizingTheatreAgentSessionHandoffResource(
  input                                                   ,
  options                                                      = {},
)                                               {
  const recorded = input.recorded ?? null;
  if (recorded !== null) {
    return Object.freeze({
      kind: options.kind ?? "organizing.theatre.agent-session-handoff-resource",
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      session: input.session,
      source: "recorded-handoff"         ,
      event: typeof recorded.id === "string" ? recorded.id : null,
      at: typeof recorded.at === "string" ? recorded.at : null,
      handoff: recorded.handoff ?? null,
      handoffCarrier: recorded.handoffCarrier ?? null,
    });
  }
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.agent-session-handoff-resource",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    source: "current-fold"         ,
    event: null,
    at: null,
    handoff: null,
    handoffCarrier: input.handoffCarrier ?? null,
  });
}

export function organizingTheatreCapabilityField(
  input

    ,
  config                                ,
  options                                          = {},
)                                   {
  const limit = Math.max(0, options.limit ?? 16);
  const focusPaths = Object.freeze([...(input.focusPaths ?? [])].filter((item) => item !== ""));
  const activeClaims = input.activeClaims ?? organizingTheatreActiveWorkLocusClaims(input.events, config, {
    ...options,
    ...(options.activeClaimsMax === undefined ? {} : { max: options.activeClaimsMax }),
  });
  const activeCapabilities = activeClaims.map((claim) => OrganizingTheatreCapabilitySignalForCapabilityField(claim, config, options));
  const claimConflicts = input.claimConflicts ?? organizingTheatreWorkLocusClaimConflictsAcross(activeClaims, config, {
    ...options,
    ...(options.claimConflictsMax === undefined ? {} : { max: options.claimConflictsMax }),
  });
  const focusSet = new Set(focusPaths);
  const relevantCapabilities = focusPaths.length === 0
    ? activeCapabilities
    : activeCapabilities.filter((capability) => capability.paths.some((claimPath) => organizingTheatreStrongestPathOverlap(focusSet, claimPath) !== null));
  const relevantConflicts = focusPaths.length === 0
    ? claimConflicts
    : claimConflicts.filter((conflict) => organizingTheatreStrongestPathOverlap(focusSet, conflict.path) !== null);
  const activities = input.activities ?? input.events.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const activityPub = activitypub.organizingTheatreActivityPubSignal(activities, config, input.seedActors);
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.capability-field",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    harness: input.harness,
    focusPaths,
    summary: Object.freeze({
      activeCapabilities: activeCapabilities.length,
      yourCapabilities: activeCapabilities.filter((capability) => capability.session === input.session).length,
      peerCapabilities: activeCapabilities.filter((capability) => capability.session !== input.session).length,
      relevantCapabilities: relevantCapabilities.length,
      claimConflicts: claimConflicts.length,
      relevantConflicts: relevantConflicts.length,
      activityPub: Object.freeze({
        ...activityPub,
        ...(options.activityPubKind === undefined ? {} : { kind: options.activityPubKind }),
      }),
    }),
    capabilities: Object.freeze({
      yours: Object.freeze(activeCapabilities.filter((capability) => capability.session === input.session).slice(0, limit)),
      peers: Object.freeze(activeCapabilities.filter((capability) => capability.session !== input.session).slice(0, limit)),
      relevant: Object.freeze(relevantCapabilities.slice(0, limit)),
    }),
    conflicts: Object.freeze({
      yours: Object.freeze(claimConflicts.filter((conflict) => conflict.left.session === input.session || conflict.right.session === input.session).slice(0, limit)),
      relevant: Object.freeze(relevantConflicts.slice(0, limit)),
    }),
    nextInterfaces: Object.freeze([...(options.nextInterfaces ?? [])]),
  });
}

export function organizingTheatreActivityPubOutboxResource(
  input

    ,
  config                                ,
  options                                                    = {},
)                                             {
  const limit = Math.max(0, options.limit ?? 24);
  const serviceActor = activitypub.organizingTheatreServiceProjection(config).actor.id;
  const actor = input.actor ?? null;
  const eventActivities = input.events.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const allActivities = actor === null || actor === serviceActor
    ? [...eventActivities, ...(input.admittedActionActivities ?? [])]
    : eventActivities;
  const activities = actor === null ? allActivities : allActivities.filter((activity) => activity.actor === actor);
  const window = activities.slice(-limit);
  const actors = activitypub.organizingTheatreActivityPubActors(window, config, input.seedActors);
  const federation = activitypub.organizingTheatreActivityPubFederation(window, config, input.seedActors);
  const signal = activitypub.organizingTheatreActivityPubSignal(window, config, input.seedActors);
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.activitypub-outbox",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    harness: input.harness,
    scope: actor === null ? "theatre" : "actor",
    actor,
    context: ACTIVITYSTREAMS_CONTEXT,
    totalActivities: activities.length,
    window: window.length,
    outbox: actor === null || actor === serviceActor ? activitypub.organizingTheatreOutbox(window, config) : outboxOf(window, `${actor}/outbox`),
    actors: Object.freeze(actors.map((item) => Object.freeze({
      id: item.id,
      type: item.type,
      preferredUsername: item.preferredUsername,
      inbox: item.inbox,
      outbox: item.outbox,
    }))),
    federation: organizingTheatreActivityPubFederationWithKinds(federation, options),
    signal: Object.freeze({
      ...signal,
      ...(options.signalKind === undefined ? {} : { kind: options.signalKind }),
    }),
    nextInterfaces: Object.freeze([...(options.nextInterfaces ?? [])]),
  });
}

export function organizingTheatreActivityPubActorResource(
  input

    ,
  config                                ,
  options                                                   = {},
)                                            {
  const limit = Math.max(0, options.limit ?? 12);
  const serviceProjection = activitypub.organizingTheatreServiceProjection(config);
  const serviceActor = serviceProjection.actor.id;
  const isServiceActor = input.actorId === serviceActor;
  const activeClaims = input.activeClaims ?? organizingTheatreActiveWorkLocusClaims(input.events, config, options);
  const actorEvents = isServiceActor ? [] : input.events.filter((event) => organizingTheatreIsActivity(event.activity) && event.activity.actor === input.actorId);
  const actorActivities = actorEvents.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const actorClaims = isServiceActor
    ? activeClaims
    : activeClaims.filter((claim) => activitypub.organizingTheatreAgentActorId(config, claim.harness, claim.session) === input.actorId);
  const inboxActivities = organizingTheatreInboxActivitiesFor(
    input.events,
    input.actorId,
    options.inbox?.inboxSource === undefined ? {} : { inboxSource: options.inbox.inboxSource },
  );
  const inboxPerception = organizingTheatreInboxPerceptionSignal(input.actorId, inboxActivities, options.inbox);
  const sessionCharacter = isServiceActor ? null : organizingTheatreSessionCharacter(config, input.actorHarness ?? input.harness, input.actorSession ?? input.session, {
    actorId: input.actorId,
    events: input.events,
    activities: actorActivities,
    admittedActions: organizingTheatreActionNamesFromActivities(input.admittedActionActivities ?? []),
    ...(input.lane === undefined ? {} : { lane: input.lane }),
  });
  const actor = input.actor ?? (isServiceActor
    ? serviceProjection.actor
    : actorActivities.length === 0 && actorEvents.length === 0
    ? activitypub.organizingTheatreAgentActorFromIri(input.actorId, config, {
      events: input.events,
      ...(input.lane === undefined ? {} : { lane: input.lane }),
    })
    : activitypub.organizingTheatreAgentActorForLocus(config, input.actorHarness ?? input.harness, {
      session: input.actorSession ?? input.session,
      hooks: actorEvents.length,
      lastTool: input.lane?.lastTool ?? null,
      ...(input.lane === undefined ? {} : { lane: input.lane }),
    }, {
      actorId: input.actorId,
      events: input.events,
      activities: actorActivities,
      admittedActions: organizingTheatreActionNamesFromActivities(input.admittedActionActivities ?? []),
      ...(input.lane === undefined ? {} : { lane: input.lane }),
    }));
  const outboxResource = isServiceActor
    ? organizingTheatreActivityPubOutboxResource({
      session: input.session,
      harness: input.harness,
      events: input.events,
      actor: serviceActor,
      ...(input.admittedActionActivities === undefined ? {} : { admittedActionActivities: input.admittedActionActivities }),
      ...(input.seedActors === undefined ? {} : { seedActors: input.seedActors }),
    }, config, options.outboxResourceOptions)
    : null;
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.activitypub-actor",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    session: input.session,
    harness: input.harness,
    actor,
    sessionCharacter,
    agentCard: sessionCharacter?.agentCard ?? null,
    summary: Object.freeze({
      activities: isServiceActor ? outboxResource?.totalActivities ?? 0 : actorActivities.length,
      inboxActivities: inboxActivities.length,
      inboxPerception: inboxPerception.agent === null ? null : inboxPerception.agent,
      activeCapabilities: actorClaims.length,
      lastEventAt: isServiceActor ? null : input.lane?.lastEventAt ?? null,
      lastTool: isServiceActor ? null : input.lane?.lastTool ?? null,
      focusPaths: Object.freeze(isServiceActor ? [] : [...(input.lane?.focusPaths ?? [])]),
    }),
    capabilities: Object.freeze(actorClaims.map((claim) => OrganizingTheatreCapabilitySignalForActorResource(claim, config, options))),
    outbox: isServiceActor
      ? outboxResource?.outbox ?? activitypub.organizingTheatreOutbox([], config)
      : outboxOf(actorActivities.slice(-limit), actor.outbox),
    inbox: isServiceActor
      ? activitypub.organizingTheatreInbox(inboxActivities.slice(-limit), config)
      : orderedCollection(inboxActivities.slice(-limit), actor.inbox),
    inboxPerception,
    nextInterfaces: Object.freeze([...(options.nextInterfaces ?? [])]),
  });
}

function OrganizingTheatreCapabilitySignalForAgentSignal(
  claim                                                                         ,
  config                                ,
  options                                     ,
)                                                                {
  const signal = organizingTheatreWorkLocusCapabilitySignal(claim, config, options);
  return Object.freeze({
    ...signal,
    ...(options.capabilityKind === undefined ? {} : { kind: options.capabilityKind }),
  });
}

function OrganizingTheatreCapabilitySignalForCapabilityField(
  claim                                                                         ,
  config                                ,
  options                                         ,
)                                                                {
  const signal = organizingTheatreWorkLocusCapabilitySignal(claim, config, options);
  return Object.freeze({
    ...signal,
    ...(options.capabilityKind === undefined ? {} : { kind: options.capabilityKind }),
  });
}

function OrganizingTheatreCapabilitySignalForActorResource(
  claim                                                                         ,
  config                                ,
  options                                                  ,
)                                                                {
  const signal = organizingTheatreWorkLocusCapabilitySignal(claim, config, options);
  return Object.freeze({
    ...signal,
    ...(options.capabilityKind === undefined ? {} : { kind: options.capabilityKind }),
  });
}

function organizingTheatreActivityPubFederationWithKinds(
  federation                                                    ,
  options                                                   ,
)          {
  if (options.federationKind === undefined && options.deliveryKind === undefined) return federation;
  const projectionOptions                                                                      = {
    claim: "Organizing theatre ActivityPub actors are grouped into harness camps and delivered through organizing federation.",
  };
  if (options.federationKind !== undefined) {
    Object.assign(projectionOptions, { kind: options.federationKind });
  }
  if (options.deliveryKind !== undefined) {
    Object.assign(projectionOptions, { deliveryKind: options.deliveryKind });
  }
  return organizingTheatreActivityPubFederationProjectionFrom(federation, projectionOptions);
}

function organizingTheatreActivityPubFederationProjectionFrom(
  federation                                                    ,
  options                                                                     ,
)                                                               {
  return Object.freeze({
    kind: options.kind ?? "organizing.theatre.activitypub-federation",
    claim: options.claim ?? "OrganizingTheatre sessions are ActivityPub actors grouped into harness camps and delivered through organizing federation.",
    camps: Object.freeze(federation.camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members,
      sharedInbox: camp.sharedInbox ?? null,
    }))),
    deliveries: Object.freeze(federation.deliveries.map((delivery) => Object.freeze({
      ...delivery,
      kind: options.deliveryKind ?? delivery.kind,
    }))),
    reading: federation.reading,
  });
}

function OrganizingTheatreRecord(value         )                                 {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value                            : null;
}

function OrganizingTheatreStringArray(value         )           {
  return Array.isArray(value) ? value.filter((item)                 => typeof item === "string") : [];
}
