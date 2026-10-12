/**
 * Plays — positions with history.
 *
 * A play is a sequence of moves (event ids) every prefix of which is a
 * configuration of the arena: a secured linearization of the causal order.
 * The underlying set of a play is the position reached; the order records how
 * the running game got there.  `extend` is the one legal-move transition —
 * adding an event is legal exactly when the extended prefix stays down-closed
 * and conflict-free, i.e. remains a configuration.
 */
import { } from "../arena.mjs";
import { configurationJudgment, isConfiguration } from "@red-cup-engineering/playing/structuring/event/structure";

export function play(moves = []) {
  return Object.freeze({ kind: "game.play", moves: Object.freeze([...moves]) });
}

export const emptyPlay = () => play([]);

/** The position (underlying set) reached by the play. */
export const positionOf = (p) => Object.freeze([...new Set(p.moves)]);

export const playLength = (p) => p.moves.length;

/**
 * Whether a play is valid in an arena: every prefix is a configuration and no
 * move repeats.  Validity at every prefix is the secured-linearization
 * condition — each move's causes already appear, and no two moves conflict.
 */
export function isValidPlay(a, p) {
  const seen = new Set();
  for (let i = 0; i < p.moves.length; i++) {
    const move = p.moves[i];
    if (move === undefined || seen.has(move)) return false;
    seen.add(move);
    if (!isConfiguration(a.structure, p.moves.slice(0, i + 1))) return false;
  }
  return true;
}

/** Judge whether `move` legally extends the play in the arena. */
export function extendJudgment(a, p, move) {
  const judgment = configurationJudgment(a.structure, [...p.moves, move]);
  return judgment.kind === "game.configuration:witness"
    ? Object.freeze({ kind: "game.play.extend:witness", play: p, move })
    : Object.freeze({ kind: "game.play.extend-obstruction", play: p, move, judgment });
}

/** Extend the play by a move, or return null if the move is not legal here. */
export function extend(a, p, move) {
  if (extendJudgment(a, p, move).kind !== "game.play.extend:witness") return null;
  return play([...p.moves, move]);
}

export function isPlay(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.play" && Array.isArray(candidate.moves) && candidate.moves.every((m) => typeof m === "string");
}
