/**
 * Nominal action on a CGS arena: finite name permutations induce event
 * bijections, then the existing arena symmetry law decides whether they are
 * valid CGS symmetries.
 */
import { eventById } from "@red-cup-engineering/playing/structuring/event/structure";
import { symmetryJudgment } from "../arena.mjs";
import { applyPermutation } from "./permutation.mjs";

export const eventName = (event, name) =>
  Object.freeze({ kind: "game.nominal.eventName", event, name });

function labelsByEvent(labels) {
  return new Map(labels.map((label) => [label.event, label.name]));
}

function eventsByName(labels, permutation) {
  const out = new Map();
  for (const label of labels) {
    if (out.has(label.name)) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction",
        permutation,
        reason: "duplicate-name",
        event: label.event,
        name: label.name,
      });
    }
    out.set(label.name, label.event);
  }
  return out;
}

const isNominalActionObstruction = (
  value,
) => !Array.isArray(value);

/** Build the event bijection induced by a finite name permutation. */
export function permutationBijection(
  arena,
  labels,
  permutation,
) {
  const byEvent = labelsByEvent(labels);
  const byName = eventsByName(labels, permutation);
  if (!(byName instanceof Map)) return byName;
  const pairs = [];
  for (const event of arena.structure.events) {
    const name = byEvent.get(event.id);
    if (name === undefined) {
      pairs.push(Object.freeze([event.id, event.id]));
      continue;
    }
    const imageName = applyPermutation(permutation, name);
    const imageEvent = byName.get(imageName);
    if (imageEvent === undefined) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction",
        permutation,
        reason: "missing-image",
        event: event.id,
        name: imageName,
      });
    }
    if (eventById(arena.structure, imageEvent) === null) {
      return Object.freeze({
        kind: "game.nominal.action-obstruction",
        permutation,
        reason: "unknown-event",
        event: imageEvent,
      });
    }
    pairs.push(Object.freeze([event.id, imageEvent]));
  }
  return Object.freeze(pairs);
}

/** Decide whether a finite name permutation acts as a CGS symmetry. */
export function nominalActionJudgment(
  arena,
  labels,
  permutation,
) {
  const bijection = permutationBijection(arena, labels, permutation);
  if (isNominalActionObstruction(bijection)) return bijection;
  const symmetry = symmetryJudgment(arena, bijection);
  return symmetry.kind === "game.symmetry:witness"
    ? Object.freeze({ kind: "game.nominal.action:witness", permutation, bijection, symmetry })
    : Object.freeze({
        kind: "game.nominal.action-obstruction",
        permutation,
        reason: "not-symmetry",
        symmetry,
      });
}
