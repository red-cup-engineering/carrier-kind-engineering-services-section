import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import { actorOfAgent } from "@red-cup-engineering/animating/writing/activitypub/actor";
import { agentCardOfSessionCharacter } from "@red-cup-engineering/animating/writing/a2a/index";
import { perceive } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";
import { chronicle, designFromActionSet } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/chronicle";
import { daimonAction, negativeAction, positiveAction } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/action";
import { locus } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";
import { sessionCharacterReading } from "@red-cup-engineering/playing/session-character";
import { stage } from "@red-cup-engineering/playing/dramaturgy";

import { cast, stageTroupeMember } from "../casting/index.mjs";
import { situation } from "../situation/index.mjs";

export function organizingTheatreSessionCharacter(
  config,
  harness,
  session,
  options = {},
) {
  const actorId = options.actorId ?? organizingTheatreAgentActorId(config, harness, session);
  const events = options.events ?? [];
  const eventActivities = options.activities ?? events.map((event) => event.activity).filter(organizingTheatreIsActivity);
  const eventWitnesses = organizingTheatreSessionEventWitnesses(events, {
    actorId,
    harness,
    session,
    ...(options.lane === undefined ? {} : { lane: options.lane }),
  });
  const witnesses = eventWitnesses.length === 0
    ? organizingTheatreSessionActivityWitnesses(eventActivities, {
      actorId,
      harness,
      session,
      ...(options.lane === undefined ? {} : { lane: options.lane }),
    })
    : eventWitnesses;
  const standing = organizingTheatreStandingSessionStage(config, actorId, events, witnesses, options);
  const reading = sessionCharacterReading(
    witnesses,
    options.troupeDesigns ?? standing.troupeDesigns,
    options.universe ?? standing.universe,
    {
      name: actorId,
      perceive: (input, memory, perceiveOptions) =>
        perceive(
          organizingTheatreWitnessSeed(input, actorId),
          memory === undefined ? undefined : organizingTheatreWitnessSeed(memory, actorId),
          perceiveOptions,
        ),
    },
  );
  const surface = {
    kind: "animating.writing.a2a.session-character-surface",
    url: `${actorId.replace(/\/+$/u, "")}/.well-known/agent-card.json`,
    version: options.version ?? "0.0.0",
    session: reading,
    publishedMasks: reading.masks.map((entry) => `mask:${entry.axis}:${entry.label}`),
    admittedActions: Object.freeze([...(options.admittedActions ?? organizingTheatreActionNamesFromActivities(eventActivities))]),
  };
  return Object.freeze({
    kind: "organizing.theatre.session-character",
    actor: actorId,
    camp: standing.camp,
    situation: standing.situation,
    troupe: standing.troupe,
    reading,
    agentCard: agentCardOfSessionCharacter(surface),
  });
}

export function organizingTheatreAgentActorsForEvents(
  events,
  config,
  options = {},
) {
  const sessions = new Map();
  for (const event of events) {
    const harness = String(event.harness ?? "agent");
    const session = String(event.session ?? "unknown-session");
    const actorId = organizingTheatreIsActivity(event.activity)
      ? event.activity.actor
      : organizingTheatreAgentActorId(config, harness, session);
    sessions.set(actorId, { harness, session });
  }
  return Object.freeze([...sessions.entries()]
    .map(([actorId, item]) => actorOfAgent(organizingTheatreSessionCharacter(config, item.harness, item.session, {
      ...options,
      actorId,
      events,
    }).reading.interior))
    .sort((left, right) => left.id.localeCompare(right.id)));
}

export function organizingTheatreAgentActorId(
  config,
  harness,
  session,
) {
  return `${trimmedBase(config.baseUrl)}/agents/${encodeURIComponent(String(harness || "agent"))}/${encodeURIComponent(String(session || "unknown-session"))}`;
}

export function organizingTheatreActionNamesFromActivities(activities) {
  const names = activities
    .map((activity) => activity.object)
    .filter((object) => object !== null && typeof object === "object" && !Array.isArray(object))
    .map((object) => typeof object.name === "string" ? object.name : typeof object.id === "string" ? object.id.split("/").at(-1) : null)
    .filter((name) => typeof name === "string" && name !== "");
  return Object.freeze([...new Set(names)].sort());
}

function organizingTheatreSessionEventWitnesses(
  events,
  context

,
) {
  const relevant = events.filter((event) =>
    String(event.session ?? context.session) === context.session
    || (organizingTheatreIsActivity(event.activity) && event.activity.actor === context.actorId));
  return Object.freeze(relevant.map((event, index) => {
    const hook = OrganizingTheatreHookEventName(event);
    const witness = {
      kind: "playing.session-character.event:witness",
      session: String(event.session ?? context.session),
      harness: String(event.harness ?? context.harness),
      via: typeof event.source === "string" ? event.source : "organizing.theatre.event-chronicle",
      lane: OrganizingTheatreLaneLabel(event, context.lane),
      ...(hook === null ? {} : { office: hook }),
      chronicle: chronicle([OrganizingTheatreActionForEvent(event, index)]),
    };
    return Object.freeze(witness);
  }));
}

function organizingTheatreSessionActivityWitnesses(
  activities,
  context

,
) {
  const relevant = activities.filter((activity) => activity.actor === context.actorId);
  return Object.freeze(relevant.map((activity, index) => {
    const witness = {
      kind: "playing.session-character.event:witness",
      session: context.session,
      harness: context.harness,
      via: "activitypub",
      lane: context.lane?.currentCwd ?? "activitypub",
      office: activity.type,
      chronicle: chronicle([OrganizingTheatreActionForActivity(activity, index)]),
    };
    return Object.freeze(witness);
  }));
}

function organizingTheatreStandingSessionStage(
  config,
  actorId,
  events,
  actorWitnesses,
  options,
) {
  const designs = OrganizingTheatreSessionDesigns(config, actorId, events, actorWitnesses);
  const universe = Object.freeze([...(options.universe ?? designs.values())]);
  const members = Object.freeze([...designs.keys()].sort().map((id) => OrganizingTheatreBareActor(id)));
  const scene = options.situation ?? OrganizingTheatreSituationForActor(actorId, options, Math.max(2, members.length));
  const camp = members.length < 2
    ? null
    : Object.freeze({
      id: `${trimmedBase(config.baseUrl)}/camps/standing`,
      members,
      sharedInbox: `${trimmedBase(config.baseUrl)}/camps/standing/inbox`,
    });
  const troupe = camp === null || camp.members.length < scene.matchSize ? null : cast(camp, scene);
  const troupeDesigns = troupe === null
    ? Object.freeze([])
    : Object.freeze(troupe.memberIds
      .filter((memberId) => memberId !== actorId)
      .map((memberId) => designs.get(memberId))
      .filter((design) => design !== undefined));
  if (troupe !== null && troupe.memberIds.includes(actorId)) {
    stageTroupeMember({
      troupe,
      memberId: actorId,
      designs: Object.fromEntries(designs.entries()),
      universe,
      stage: (actor, troupe, stagedUniverse) =>
        stage(actor, troupe, stagedUniverse),
    });
  }
  return Object.freeze({
    camp,
    situation: scene,
    troupe,
    troupeDesigns,
    universe,
  });
}

function OrganizingTheatreSessionDesigns(
  config,
  actorId,
  events,
  actorWitnesses,
) {
  const byActor = new Map();
  byActor.set(actorId, [...actorWitnesses]);
  for (const event of events) {
    const harness = String(event.harness ?? "agent");
    const session = String(event.session ?? "unknown-session");
    const id = organizingTheatreIsActivity(event.activity)
      ? event.activity.actor
      : organizingTheatreAgentActorId(config, harness, session);
    const group = byActor.get(id) ?? [];
    group.push(...organizingTheatreSessionEventWitnesses([event], {
      actorId: id,
      harness,
      session,
    }));
    byActor.set(id, group);
  }
  const designs = new Map();
  for (const [id, witnesses] of byActor) {
    designs.set(id, designFromActionSet(witnesses.flatMap((witness) => [...witness.chronicle.actions])));
  }
  if (!designs.has(actorId)) designs.set(actorId, designFromActionSet([]));
  return designs;
}

function OrganizingTheatreSituationForActor(
  actorId,
  options,
  matchSize,
) {
  const focusPaths = options.lane?.focusPaths?.filter((item) => item !== "") ?? [];
  const substrate = focusPaths.length === 0 ? [actorId] : focusPaths;
  const scene = focusPaths.length === 0 ? "frontier-node" : "task-to-be-done";
  return situation({
    id: `${actorId}#situation`,
    scene,
    subject: actorId,
    substrate,
    matchSize,
    description: "OrganizingTheatre session-character scene over the active dev substrate.",
  });
}

function OrganizingTheatreBareActor(id) {
  const trimmed = id.replace(/\/+$/u, "");
  const handle = trimmed.split("/").filter(Boolean).at(-1) ?? "agent";
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: trimmed,
    type: "Service",
    preferredUsername: handle,
    inbox: `${trimmed}/inbox`,
    outbox: `${trimmed}/outbox`,
    followers: `${trimmed}/followers`,
    following: `${trimmed}/following`,
    summary: `OrganizingTheatre standing-pool actor ${handle}.`,
  });
}

function OrganizingTheatreActionForEvent(event, index) {
  if (organizingTheatreIsActivity(event.activity)) return OrganizingTheatreActionForActivity(event.activity, index);
  const hook = OrganizingTheatreHookEventName(event);
  if (hook === "Stop" || hook === "SubagentStop") return daimonAction(locus([index + 1, 0]));
  return positiveAction(locus([index + 1, 0]));
}

function OrganizingTheatreActionForActivity(activity, index) {
  if (activity.type === "Undo" || activity.type === "Remove") return negativeAction(locus([index + 1]));
  return positiveAction(locus([index + 1, 0]));
}

function OrganizingTheatreHookEventName(event) {
  const value = event.hookEventName;
  return typeof value === "string" && value !== "" ? value : null;
}

function OrganizingTheatreLaneLabel(event, lane) {
  const payload = event !== null && typeof event === "object" ? OrganizingTheatreRecord(event.payload) : null;
  const cwd = typeof payload?.cwd === "string" ? payload.cwd : null;
  return cwd ?? lane?.currentCwd ?? event.source ?? "unknown-lane";
}

function organizingTheatreWitnessSeed(witnesses, identity) {
  if (witnesses.length === 0) return Object.freeze([Object.freeze([identity, "playing.session-character.unperformed"])]);
  return Object.freeze(witnesses.map((witness, index) => Object.freeze([
    `${witness.session}:${index}`,
    [
      witness.kind,
      witness.harness ?? "unknown-harness",
      witness.via ?? "unknown-source",
      witness.lane ?? "unknown-lane",
      witness.office ?? "unknown-office",
      witness.chronicle.actions.map((action) => `${action.variety}@${action.locus.address.join(".")}`).join(","),
    ].join("|"),
  ])));
}

function organizingTheatreIsActivity(value) {
  return value !== null
    && typeof value === "object"
    && (value)["@context"] === ACTIVITYSTREAMS_CONTEXT
    && typeof (value).type === "string"
    && typeof (value).actor === "string"
    && (value).object !== undefined;
}

function OrganizingTheatreRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function trimmedBase(baseUrl) {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
