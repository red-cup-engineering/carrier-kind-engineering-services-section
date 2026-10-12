import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import { actorOfAgent } from "@red-cup-engineering/animating/writing/activitypub/actor";
import { orderedCollection, outboxOf } from "@red-cup-engineering/animating/writing/activitypub/collections";
import {
  organizingTheatreSessionCharacter,

} from "../performing/session-character.mjs";
import { deliverToCamps, federateActivities, reach } from "../writing/activitypub/index.mjs";

function actorIdOf(config                                )         {
  return `${trimmedBase(config.baseUrl)}/`;
}

export function organizingTheatreServiceProjection(config                                )                                     {
  const actorId = actorIdOf(config);
  const name = config.name ?? `${new URL(actorId).hostname} Modeled Agent Semiotic Hub`;
  const actor        = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: actorId,
    type: "Service",
    preferredUsername: config.preferredUsername ?? "OrganizingTheatre",
    summary: config.summary ?? `${name}: a service actor where workspace agents coordinate through ActivityPub and admitted actions.`,
    inbox: `${actorId}inbox`,
    outbox: `${actorId}outbox`,
    followers: `${actorId}followers`,
    following: `${actorId}following`,
  };
  return Object.freeze({
    actor: Object.freeze(actor),
    outboxId: actor.outbox,
    inboxId: actor.inbox,
    actionSubjectId: `${actorId}#admitted-actions`,
  });
}

export function organizingTheatreOutbox(
  activities                     ,
  config                                ,
)                    {
  return outboxOf(activities, organizingTheatreServiceProjection(config).outboxId);
}

export function organizingTheatreInbox(
  activities                     ,
  config                                ,
)                    {
  return orderedCollection(activities, organizingTheatreServiceProjection(config).inboxId);
}

export function acceptsOrganizingTheatreActivityPub(accept                                        )          {
  const values = Array.isArray(accept) ? accept : accept === undefined ? [] : [accept];
  return values.some((header) => header.split(",").some((item        ) => {
    const mediaType = item.split(";")[0]?.trim().toLowerCase();
    return mediaType === "application/activity+json"
      || mediaType === "application/ld+json"
      || mediaType === "application/json";
  }));
}

export function organizingTheatreActivityPubRoute(
  input

    ,
  config                                ,
)                                           {
  const method = input.method?.toUpperCase() ?? "GET";
  let endpoint                                              = null;
  if (input.pathname === "/" && method === "GET" && acceptsOrganizingTheatreActivityPub(input.accept)) endpoint = "actor";
  else if (input.pathname === "/inbox" && (method === "GET" || method === "POST")) endpoint = "inbox";
  else if (input.pathname === "/outbox" && method === "GET") endpoint = "outbox";
  if (endpoint === null) return null;
  const window = queryWindow(input.searchParams);
  return Object.freeze({
    endpoint,
    actorId: organizingTheatreServiceProjection(config).actor.id,
    ...(window.limit === undefined ? {} : { limit: window.limit }),
    ...(window.eventScanLimit === undefined ? {} : { eventScanLimit: window.eventScanLimit }),
  });
}

export function organizingTheatreWebFingerActor(resource        , config                                )                                         {
  if (!resource.startsWith("acct:")) return null;
  const acct = resource.slice("acct:".length);
  const at = acct.lastIndexOf("@");
  const local = at === -1 ? acct : acct.slice(0, at);
  const domain = at === -1 ? "" : acct.slice(at + 1);
  const projection = organizingTheatreServiceProjection(config);
  const expectedLocal = config.preferredUsername ?? projection.actor.preferredUsername;
  const expectedDomain = new URL(projection.actor.id).hostname;
  if (local !== expectedLocal || (domain !== "" && domain !== expectedDomain)) return null;
  return Object.freeze({
    resource,
    actorId: projection.actor.id,
  });
}

export function organizingTheatreActivityPubActors(
  activities                     ,
  config                                ,
  seedActors                   = [],
)                   {
  const actors = new Map               ();
  for (const actor of seedActors) actors.set(actor.id, actor);
  for (const activity of activities) {
    if (!actors.has(activity.actor)) actors.set(activity.actor, organizingTheatreAgentActorFromIri(activity.actor, config, { activities }));
  }
  return Object.freeze([...actors.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActor(
  config                                ,
  harness        ,
  session        ,
  options                                           = {},
)        {
  return actorOfAgent(organizingTheatreSessionCharacter(config, harness, session, options).reading.interior);
}

export function organizingTheatreAgentActorFromIri(
  id        ,
  config                                ,
  options                                           = {},
)        {
  const parsed = organizingTheatreAgentActorSession(id, config);
  if (parsed !== null) return organizingTheatreAgentActor(config, parsed.harness, parsed.session, {
    ...options,
    actorId: id.trim(),
  });
  const actorId = id.trim();
  return actorOfAgent(organizingTheatreSessionCharacter(config, "external", actorId, {
    ...options,
    actorId,
  }).reading.interior);
}

export function organizingTheatreAgentActorForLocus(
  config                                ,
  harness        ,
  locus                                  ,
  options                                           = {},
)        {
  return organizingTheatreAgentActor(config, harness, locus.session, {
    ...options,
    lane: options.lane ?? locus.lane ?? {
      lastTool: locus.lastTool ?? null,
    },
  });
}

export function organizingTheatreAgentActorsForLoci(
  loci                                             ,
  config                                ,
  options                                           = {},
)                   {
  const actors = new Map               ();
  for (const locus of loci) {
    for (const harness of locus.harnesses ?? []) {
      const actor = organizingTheatreAgentActorForLocus(config, harness, locus, options);
      actors.set(actor.id, actor);
    }
  }
  return Object.freeze([...actors.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActorSession(id        , config                                )                                            {
  return OrganizingTheatreActorSession(id, config);
}

export function organizingTheatreActivityPubCamps(
  actors                  ,
  config                                ,
)                                              {
  const groups = new Map                 ();
  for (const actor of actors) {
    const harness = OrganizingTheatreHarnessForActor(actor.id, config);
    const group = groups.get(harness) ?? [];
    group.push(actor);
    groups.set(harness, group);
  }
  const base = trimmedBase(config.baseUrl);
  return Object.freeze([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([harness, members]) => {
      const id = `${base}/camps/${encodeURIComponent(harness)}`;
      return Object.freeze({
        id,
        members: Object.freeze(members.sort((left, right) => left.id.localeCompare(right.id))),
        sharedInbox: `${id}/inbox`,
      });
    }));
}

export function organizingTheatreActivityPubFederation(
  activities                     ,
  config                                ,
  seedActors                   = [],
)                                         {
  const actors = organizingTheatreActivityPubActors(activities, config, seedActors);
  const camps = organizingTheatreActivityPubCamps(actors, config);
  const deliveries = activities.slice(-12).map((activity) => {
    const delivery = deliverToCamps(activity, camps);
    return Object.freeze({
      kind: "organizing.theatre.activitypub.delivery"         ,
      context: delivery["@context"],
      activity: activity.id ?? null,
      type: activity.type,
      actor: activity.actor,
      targets: delivery.targets,
      reach: reach(delivery),
    });
  });
  const activeCamps = camps
    .map((camp) => Object.freeze({
      camp,
      activities: activities.filter((activity) => camp.members.some((member) => member.id === activity.actor)),
    }))
    .filter((item) => item.activities.length > 0);
  return Object.freeze({
    kind: "organizing.theatre.activitypub.federation"         ,
    camps: camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members.map((member) => member.id),
      sharedInbox: camp.sharedInbox,
    })),
    deliveries: Object.freeze(deliveries),
    reading: activeCamps.length === 0 ? null : federateActivities(activeCamps.map((item) => item.activities)),
  });
}

export function organizingTheatreActivityPubSignal(
  activities                     ,
  config                                ,
  seedActors                   = [],
)                                     {
  const recent = activities.slice(-24);
  const actors = organizingTheatreActivityPubActors(recent, config, seedActors);
  const federation = organizingTheatreActivityPubFederation(recent, config, seedActors);
  const reading = federation.reading;
  return Object.freeze({
    kind: "organizing.theatre.activitypub.signal"         ,
    context: ACTIVITYSTREAMS_CONTEXT,
    activityWindow: recent.length,
    actorCount: actors.length,
    camps: federation.camps.map((camp) => Object.freeze({
      id: camp.id,
      members: camp.members.length,
      sharedInbox: camp.sharedInbox,
    })),
    deliveryReach: federation.deliveries.reduce((sum, delivery) => sum + delivery.reach, 0),
    reading: compactFederationReading(reading),
  });
}

export function organizingTheatreActivityPubFederationProjection(
  activities                     ,
  config                                ,
  seedActors                   = [],
  options                                                          = {},
)                                                   {
  const federation = organizingTheatreActivityPubFederation(activities, config, seedActors);
  return organizingTheatreActivityPubFederationProjectionFrom(federation, options);
}

export function organizingTheatreActivityPubSignalProjection(
  activities                     ,
  config                                ,
  seedActors                   = [],
  options                                                      = {},
)                                               {
  return Object.freeze({
    ...organizingTheatreActivityPubSignal(activities, config, seedActors),
    kind: options.kind ?? "organizing.theatre.activitypub-signal",
  });
}

function organizingTheatreActivityPubFederationProjectionFrom(
  federation                                        ,
  options                                                         ,
)                                                   {
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

export function organizingTheatreAgentActorId(
  config                                ,
  harness        ,
  session        ,
)         {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

function OrganizingTheatreHarnessForActor(id        , config                                )         {
  return OrganizingTheatreActorSession(id, config)?.harness ?? "external";
}

function OrganizingTheatreActorSession(id        , config                                )                                                                {
  try {
    const parsed = new URL(id);
    const base = new URL(organizingTheatreServiceProjection(config).actor.id);
    if (parsed.origin !== base.origin) return null;
    const baseSegments = base.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    const pathSegments = parsed.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    if (!baseSegments.every((segment, index) => pathSegments[index] === segment)) return null;
    const segments = pathSegments.slice(baseSegments.length);
    if (segments[0] !== "agents" || segments.length < 3) return null;
    const harness = segments[1];
    if (harness === undefined) return null;
    return { harness, session: segments.slice(2).join("/") };
  } catch {
    return null;
  }
}

function compactFederationReading(reading         )          {
  if (reading === null || typeof reading !== "object") return null;
  const value = reading                           ;
  return Object.freeze({
    constituents: value.constituents,
    members: value.members,
    federationOnly: value.federationOnly,
    glued: value.glued,
    coordination: value.coordination,
  });
}

function queryWindow(searchParams                             )                                                                      {
  if (searchParams === undefined) return {};
  const limit = searchParams.get("limit");
  const eventScanLimit = searchParams.get("eventScanLimit") ?? searchParams.get("scanLimit");
  return {
    ...(limit === null ? {} : { limit }),
    ...(eventScanLimit === null ? {} : { eventScanLimit }),
  };
}

function trimmedBase(baseUrl        )         {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
