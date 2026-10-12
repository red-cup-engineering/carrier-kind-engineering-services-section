/**
 * Rules — an arena presented by its rules, and replay as the play check.
 *
 * The arenas note (2026-07-07, "Arenas, Plays, and Strategies") separates the arena, the
 * space of possible interaction, from a play, one passage through it. A finite arena can be
 * listed event by event (`../structuring/concurrent-game/with-symmetry/arena.mjs`); a real
 * game's arena cannot, so its rules present it intensionally. Def. 12.3 names the one rule
 * every arena supplies: the legal move rule is enabling in A. A game's rules are therefore
 * two functions:
 *
 *   initialPosition(seed, configId) -> position     the empty configuration, with the
 *                                                     environment's strategy fixed by the seed
 *   extend(position, move) -> { state, events }     the legal extension x -> x + {e}
 *                                                     (Prop. 3.5); throws when e is not in En(x)
 *
 * The seed fixes the Opponent's strategy: O is the environment (Def. 4.1), so dice, shuffles
 * and spawns are O-moves whose choice the seed determines. `events` are the occurrences the
 * extension produced beyond the Player's move (the environment's answers).
 *
 * A play is a secured linearization: a sequence that grows by legal extension at every step
 * (Def. 7.3, Prop. 7.4). `replayPlay` is that check run from the initial position: it stops
 * at the first move the rules refuse, because a play with an illegal step is no play at all.
 * The position reached is content-addressed by `hashPosition` over its JSON form: the rules'
 * `serialize(position)` when they declare one (a position holding a Map, or carrying a rendered frame
 * that is an observation of the position rather than part of it, Def. 12.3), else the position. Rules
 * may also declare `isTerminal(position)`: replay stops at the first terminal position because later
 * log entries are not extensions of that completed play.
 *
 * `finalState`, `stateHash`, and a play record's `intent` key keep their names: stored runs,
 * match records and wire bodies carry them.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { sha256Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256";
import { validatePlayRecord } from './play-record.mjs';

/** SHA-256 hex of `canonicalJson(value)`: the content address of a position (or of any
 *  JSON-safe value). Portable SHA-256, so the module loads in a browser without a Node
 *  builtin; its digests equal `node:crypto`'s, so every stored hash still verifies. */
export function hashPosition(value) {
  return sha256Bytes(new TextEncoder().encode(canonicalJson(value)));
}

/** Replay a sequence of moves from the rules' initial position (`rules`: `initialPosition`,
 *  `extend`, and optionally `serialize` and `isTerminal`). Stops at a terminal position or the first move
 *  `extend` refuses: `valid` is false, `finalState` is the last position reached, and
 *  `events` holds everything produced up to it. */
export function replayPlay(rules, seed, moves, configId) {
  let state = rules.initialPosition(seed, configId);
  const events = [];
  let valid = true;
  for (const move of moves) {
    if (rules.isTerminal?.(state)) break;
    try {
      const result = rules.extend(state, move);
      state = result.state;
      events.push(...result.events);
    } catch {
      valid = false;
      break;
    }
  }
  return { finalState: state, valid, events, stateHash: hashPosition(rules.serialize === undefined ? state : rules.serialize(state)) };
}

/** A verifier over a stored play record (`{ seq, intent, ts? }` entries, `./play-record.mjs`):
 *  unwraps each entry's move and replays it. This is the function a game's manifest names as
 *  its `replayVerifier`. */
export function playVerifier(rules) {
  return (seed, configId, record) => {
    const result = replayPlay(rules, seed, record.map((entry) => entry.intent), configId);
    return { valid: result.valid, finalState: result.finalState, events: result.events, stateHash: result.stateHash };
  };
}

/** A game's complete rules from `initialPosition` and `extend`: `replay` is `replayPlay`, and
 *  `serialize`/`deserialize` default to identity for positions that are already plain JSON. */
export function gameRules(initialPosition, extend, options = {}) {
  if (typeof initialPosition !== "function") throw new TypeError("gameRules: initialPosition must be a function");
  if (typeof extend !== "function") throw new TypeError("gameRules: extend must be a function");
  const serialize = options.serialize ?? ((state) => state);
  const isTerminal = options.isTerminal;
  if (isTerminal !== undefined && typeof isTerminal !== "function") throw new TypeError("gameRules: isTerminal must be a function");
  return {
    initialPosition,
    extend,
    replay: (seed, moves, configId) => replayPlay({ initialPosition, extend, serialize, isTerminal }, seed, moves, configId),
    serialize,
    deserialize: options.deserialize ?? ((data) => data),
    ...(isTerminal === undefined ? {} : { isTerminal }),
  };
}

/** A streaming player for rule-presented arenas. Retains only the current
 * position; the caller owns record persistence and event observations. Stored
 * entry order is checked before extension, so a valid move in a reordered or
 * truncated record cannot silently become a different play.
 */
export function createRulePlayer(rules, { seed, configId, onEntry, onEvents } = {}) {
  let position = rules.initialPosition(seed, configId), seq = -1;
  const accept = (entry, record) => {
    const check = validatePlayRecord([entry]);
    if (!check.valid) throw new TypeError(check.errors.join('; '));
    if (!Number.isSafeInteger(entry.seq) || entry.seq !== seq + 1) throw new RangeError(`record sequence ${entry.seq} does not follow ${seq}`);
    if (rules.isTerminal?.(position)) throw new RangeError('play is already terminal');
    const result = rules.extend(position, entry.intent);
    position = result.state; seq = entry.seq;
    onEvents?.(result.events, entry); if (record) onEntry?.(entry);
    return result;
  };
  return {
    get position() { return position; }, get moves() { return seq + 1; },
    play: (intent, ts) => accept({ seq: seq + 1, intent, ...(ts === undefined ? {} : { ts }) }, true),
    replayEntry: (entry) => accept(entry, false),
    stateHash: () => hashPosition(rules.serialize ? rules.serialize(position) : position),
  };
}
