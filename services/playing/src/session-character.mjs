/**
 * session-character - read one agent-session as a performed character.
 *
 * A session self is not stored in an actor record. It is reconstructed from the
 * chronicle of what the session did: the plays yield the actor, the actor wears
 * masks at situation addresses, and role-distance/persona-shadow are read only
 * relative to a supplied troupe and universe.
 *
 * `playing` intentionally does not import `animating`: the dependency graph runs
 * the other way. Callers inject the animating interior, or inject the `perceive`
 * leg so this module can fold events append-only with prior events as memory.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { characterAgent, identity, performedSelf } from "./character-agent.mjs";
import { mask, performativity, personaShadow, roleDistance } from "./persona.mjs";
import { designFromActionSet } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";

const optionalString = { type: "string", minLength: 1 };
const addressSchema = { type: "array", items: { type: "integer", minimum: 0 } };
const looseObjectSchema = { type: "object", additionalProperties: true };

export const sessionEventWitnessSchema = {
  $id: "playing/session-character/event-witness",
  title: "SessionEventWitness",
  description:
    "One witnessed event in a session chronicle. The chronicle is the play carried by the event; harness/lane/office provide mask labels.",
  type: "object",
  additionalProperties: true,
  required: ["kind", "session", "chronicle"],
  properties: {
    kind: { const: "playing.session-character.event:witness" },
    session: optionalString,
    chronicle: looseObjectSchema,
    harness: optionalString,
    via: optionalString,
    lane: optionalString,
    office: optionalString,
  },
};

export const sessionEventWitnessCarrier = schemaFrom(sessionEventWitnessSchema);

export const sessionMaskSchema = {
  $id: "playing/session-character/mask",
  title: "SessionMask",
  description:
    "A session mask: the reconstructed actor delocated at a harness, lane, or office address.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "axis", "label", "at", "persona"],
  properties: {
    kind: { const: "playing.session-character.mask" },
    axis: { enum: ["harness", "lane", "office"] },
    label: optionalString,
    at: addressSchema,
    persona: looseObjectSchema,
  },
};

export const sessionMaskCarrier = schemaFrom(sessionMaskSchema);

export const sessionSituationSchema = {
  $id: "playing/session-character/situation",
  title: "SessionSituationReading",
  description:
    "A parameterized reading of one reconstructed actor before a troupe and universe.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "personaShadow", "roleDistance"],
  properties: {
    kind: { const: "playing.session-character.situation" },
    name: optionalString,
    personaShadow: looseObjectSchema,
    roleDistance: looseObjectSchema,
  },
};

export const sessionSituationCarrier = schemaFrom(sessionSituationSchema);

export const sessionCharacterReadingSchema = {
  $id: "playing/session-character/reading",
  title: "SessionCharacterReading",
  description:
    "The performed character reading of one session: animating interior, masks, character-agent bundle, and situation-sensitive moat readings.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "name",
    "events",
    "folds",
    "actor",
    "interior",
    "masks",
    "character",
    "performativity",
    "performedSelf",
    "identity",
    "baseline",
    "situation",
  ],
  properties: {
    kind: { const: "playing.session-character.reading" },
    name: optionalString,
    events: { type: "integer", minimum: 0 },
    folds: { type: "integer", minimum: 0 },
    actor: looseObjectSchema,
    interior: looseObjectSchema,
    masks: { type: "array", items: { $ref: "playing/session-character/mask" } },
    character: looseObjectSchema,
    performativity: looseObjectSchema,
    performedSelf: looseObjectSchema,
    identity: looseObjectSchema,
    baseline: { $ref: "playing/session-character/situation" },
    situation: { $ref: "playing/session-character/situation" },
  },
};

export const sessionCharacterReadingCarrier = schemaFrom(sessionCharacterReadingSchema);

const MASK_BASE = Object.freeze({
  harness: 1,
  lane: 2,
  office: 3,
});

function actorFromChronicle(events) {
  return designFromActionSet(events.flatMap((event) => [...event.chronicle.actions]));
}

function newestLabel(
  events,
  read,
  fallback,
) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const label = read(events[index]);
    if (label !== undefined && label.trim() !== "") return label.trim();
  }
  return fallback;
}

function sessionName(events, optionsName) {
  if (optionsName !== undefined && optionsName.trim() !== "") return optionsName.trim();
  return newestLabel(events, (event) => event.session, "session");
}

function addressFor(axis, label) {
  const normalized = label.trim().toLowerCase();
  const suffix = [...normalized].map((char) => char.codePointAt(0) ?? 0);
  return Object.freeze([MASK_BASE[axis], ...(suffix.length === 0 ? [0] : suffix)]);
}

export function sessionMasks(actor, events) {
  const specs = Object.freeze([
    { axis: "harness", label: newestLabel(events, (event) => event.harness ?? event.via, "unknown-harness") },
    { axis: "lane", label: newestLabel(events, (event) => event.lane, "unknown-lane") },
    { axis: "office", label: newestLabel(events, (event) => event.office, "unknown-office") },
  ]);
  return Object.freeze(specs.map(({ axis, label }) => {
    const at = addressFor(axis, label);
    return Object.freeze({
      kind: "playing.session-character.mask",
      axis,
      label,
      at,
      persona: mask(actor, at),
    });
  }));
}

export function foldSessionInterior(
  events,
  perceive,
  options,
) {
  if (events.length === 0) {
    return Object.freeze({ interior: perceive(Object.freeze([]), undefined, options), folds: 1 });
  }
  const memory = [];
  let interior;
  for (const event of events) {
    interior = perceive(Object.freeze([event]), memory.length === 0 ? undefined : Object.freeze([...memory]), options);
    memory.push(event);
  }
  return Object.freeze({ interior: interior, folds: events.length });
}

function injectedInterior(
  events,
  options,
  identityName,
) {
  if (options.interior !== undefined) return Object.freeze({ interior: options.interior, folds: events.length });
  if (options.perceive !== undefined) {
    return foldSessionInterior(events, options.perceive, { identity: identityName });
  }
  throw new TypeError("session-character: inject an animating interior or a perceive fold");
}

function situationReading(
  name,
  actor,
  troupe,
  universe,
) {
  return Object.freeze({
    kind: "playing.session-character.situation",
    name,
    personaShadow: personaShadow(actor, troupe, universe),
    roleDistance: roleDistance(actor, troupe, universe),
  });
}

export function sessionCharacterReading(
  events,
  troupe,
  universe,
  options,
) {
  const name = sessionName(events, options.name);
  const actor = actorFromChronicle(events);
  const folded = injectedInterior(events, options, name);
  const masks = sessionMasks(actor, events);
  const character = characterAgent(name, {
    personas: masks.map((entry) => entry.persona),
    disciplines: Object.freeze([...(options.disciplines ?? [])]),
    skills: Object.freeze([...(options.skills ?? [])]),
    plays: Object.freeze(events.map((event) => event.chronicle)),
  });
  const baselineUniverse = options.baselineUniverse ?? Object.freeze([actor, ...universe]);
  return Object.freeze({
    kind: "playing.session-character.reading",
    name,
    events: events.length,
    folds: folded.folds,
    actor,
    interior: folded.interior,
    masks,
    character,
    performativity: performativity(actor),
    performedSelf: performedSelf(character),
    identity: identity(character),
    baseline: situationReading("baseline", actor, Object.freeze([]), baselineUniverse),
    situation: situationReading("situation", actor, troupe, universe),
  });
}
