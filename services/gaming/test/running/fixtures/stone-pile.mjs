/**
 * Stone pile — the smallest complete game rules, used to exercise the running layer end to
 * end: manifest validation, play-record encode/decode, and replay.
 *
 * A pile starts with a seed-determined count (the environment's one move). The Player adds
 * stones, removes stones, or renames the pile; removing more stones than the pile holds is
 * not enabled, which is the illegal-move case a replay must refuse.
 */

import { hashSeed, mulberry32 } from "@red-cup-engineering/computer-data-engineering-services-section/randomization";
import { gameRules } from "../../../src/running/rules.mjs";

export function initialPosition(seed, configId) {
  const next = mulberry32(hashSeed(`${seed}:${configId ?? ""}`));
  return { name: configId ?? "default", stones: 10 + Math.floor(next() * 41), turn: 0 };
}

export function extend(state, move) {
  switch (move.kind) {
    case "add": {
      if (!Number.isInteger(move.amount) || move.amount <= 0) throw new RangeError(`add: amount must be a positive integer, got ${move.amount}`);
      const next = { ...state, stones: state.stones + move.amount, turn: state.turn + 1 };
      return { state: next, events: [{ kind: "stones-added", amount: move.amount, total: next.stones }] };
    }
    case "remove": {
      if (!Number.isInteger(move.amount) || move.amount <= 0) throw new RangeError(`remove: amount must be a positive integer, got ${move.amount}`);
      if (move.amount > state.stones) throw new RangeError(`remove: cannot remove ${move.amount} stones from a pile of ${state.stones}`);
      const next = { ...state, stones: state.stones - move.amount, turn: state.turn + 1 };
      const events = [{ kind: "stones-removed", amount: move.amount, total: next.stones }];
      if (next.stones === 0) events.push({ kind: "pile-emptied" });
      return { state: next, events };
    }
    case "rename": {
      if (typeof move.name !== "string" || move.name.length === 0) throw new TypeError("rename: name must be a non-empty string");
      return { state: { ...state, name: move.name, turn: state.turn + 1 }, events: [{ kind: "renamed", name: move.name }] };
    }
    default:
      throw new TypeError(`extend: unknown move kind ${move.kind}`);
  }
}

export function serialize(state) {
  return { name: state.name, stones: state.stones, turn: state.turn };
}

export function deserialize(data) {
  if (typeof data !== "object" || data === null || typeof data.name !== "string" || typeof data.stones !== "number" || typeof data.turn !== "number") {
    throw new TypeError("deserialize: malformed stone pile data");
  }
  return { name: data.name, stones: data.stones, turn: data.turn };
}

export const stonePileRules = gameRules(initialPosition, extend, { serialize, deserialize });
export const { replay } = stonePileRules;
