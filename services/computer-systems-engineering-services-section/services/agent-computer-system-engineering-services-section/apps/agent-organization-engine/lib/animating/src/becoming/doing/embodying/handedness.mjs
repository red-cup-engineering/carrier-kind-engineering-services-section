/**
 * handedness — an embodied agent's asymmetric coordinates as Player/Opponent
 * duality.
 *
 * The predicated-drone-swarm sub-theory characterizes an embodied participant
 * by the four-tuple `h(p) = (recv, send, actuate, observe)`.  The corpus claim
 * *embodied-handedness-is-player-opponent-duality* identifies this four-tuple
 * with Player/Opponent duality `(-)^⊥` in CGS (the theory of computing): a
 * morphism `A → B` is a strategy on `A^⊥ ∥ B`, playing Opponent-style on its
 * input and Player-style on its output.  The coordinates partition by side:
 *
 *   - `recv`, `observe` — Opponent-side: the agent takes input from the
 *     environment (the environment is Player on `A`).  This is the agent's
 *     PERCEIVE side.
 *   - `send`, `actuate` — Player-side: the agent commits output to the
 *     environment (the environment is Opponent on `B`).  This is the agent's
 *     ACT side.
 *
 * So handedness is the polarity reading of the agent's perceive→act loop: the
 * Opponent coordinates are the inbound membrane, the Player coordinates the
 * outbound one.  Each coordinate carries a *capacity* reading — `absurd` = ⊥ (the
 * agent lacks it), `potential` = t (provided), `active` = f (denied), `stable` =
 * ⊤ (held contradiction).  The dualizing operation `(-)^⊥` swaps the input and
 * output roles: recv↔send, observe↔actuate.  A *symmetric peer* is exactly a
 * fixed point of this dual — `recv = send` and `observe = actuate` — which the
 * corpus names the special case; embodied participants are generically
 * asymmetric, and each asymmetric axis contributes one generator to the
 * frame-disagreement cohomology `H^1_{χ∼}`.  Asymmetry is recorded, not refused.
 *
 * The categorical home of these coordinates — Player/Opponent polarity in a
 * concurrent game system — is the sibling `playing` faculty (the exterior/world
 * reading that closes animating's spiral); we keep the animating-side reading
 * self-contained here on the relating reading so the agency substrate stays
 * foundational and does not depend on the faculties that mount on it.
 */

/**
 * The name of one handedness coordinate of an embodied agent: `recv` and
 * `observe` (opponent/perceive side), `send` and `actuate` (player/act side).
 */

/**
 * Which side of the Player/Opponent duality `(-)^⊥` a coordinate sits on:
 * `"opponent"` for the perceive (input) side, `"player"` for the act (output) side.
 */

/** The canonical Player/Opponent side of each coordinate, per the embodied-handedness claim. */
const COORDINATE_SIDE = Object.freeze({
  recv: "opponent",
  observe: "opponent",
  send: "player",
  actuate: "player",
});

/** The dual coordinate name under the agent-side reading of `(-)^⊥`. */
const DUAL_COORDINATE = Object.freeze({
  recv: "send",
  send: "recv",
  observe: "actuate",
  actuate: "observe",
});

/**
 * One handedness coordinate carrier. The name is the projection used as an
 * object key; side and dual record the finite relation the name descends from.
 */

/**
 * The four handedness coordinate names as a frozen tuple: `recv`, `send`, `actuate`,
 * `observe`.
 */
export const handednessCoordinateNames = () =>
  Object.freeze(["recv", "send", "actuate", "observe"]);

/** Build the carrier for a named handedness coordinate. */
export function handednessCoordinate(name) {
  return Object.freeze({
    kind: "animating.agent.handedness.coordinate",
    name,
    side: COORDINATE_SIDE[name],
    dual: DUAL_COORDINATE[name],
  });
}

/** The finite carrier family of handedness coordinates. */
export const handednessCoordinates = () =>
  Object.freeze(handednessCoordinateNames().map(handednessCoordinate));

export function isHandednessCoordinate(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "animating.agent.handedness.coordinate"
    && isHandednessCoordinateName(candidate.name)
    && candidate.side === COORDINATE_SIDE[candidate.name]
    && candidate.dual === DUAL_COORDINATE[candidate.name];
}

export function isHandednessCoordinateName(value) {
  return value === "recv" || value === "send" || value === "actuate" || value === "observe";
}

export function handednessCoordinateName(input) {
  return typeof input === "string" ? input : input.name;
}

/** Which side of `(-)^⊥` a coordinate sits on: perceive (opponent) or act (player). */
export const coordinateSide = (coordinate) =>
  COORDINATE_SIDE[handednessCoordinateName(coordinate)];

/** The dual coordinate under `(-)^⊥`: recv↔send, observe↔actuate. */
export const dualCoordinate = (coordinate) =>
  handednessCoordinate(DUAL_COORDINATE[handednessCoordinateName(coordinate)]);

/**
 * An agent's handedness: the capacity reading it carries at each of the four
 * coordinates.  This is the agent's individual face on the same bilattice
 * reading the rest of the package uses — the polarity of its perceive→act loop.
 */

/**
 * Optional per-coordinate capacity readings for building a handedness; any
 * omitted coordinate defaults to `absurd`.
 */

/**
 * Build a handedness from explicit per-coordinate capacity readings; any omitted
 * coordinate defaults to `absurd` (⊥, the agent lacks it).  Pass capacities to
 * describe an asymmetric embodied participant (e.g. a drone that can `observe`
 * but not `actuate`).
 */
export function handedness(input = {}) {
  return Object.freeze({
    kind: "animating.agent.handedness",
    recv: input.recv ?? "absurd",
    send: input.send ?? "absurd",
    actuate: input.actuate ?? "absurd",
    observe: input.observe ?? "absurd",
  });
}

/** The symmetric-peer handedness: every coordinate provided (`potential`), a fixed point of the dual. */
export const peerHandedness = () =>
  handedness({ recv: "potential", send: "potential", actuate: "potential", observe: "potential" });

/** A handedness from a set of coordinates the agent provides; the rest are `absurd`. */
export function handednessFrom(present) {
  const has = new Set(present.map(handednessCoordinateName));
  const at = (c) => (has.has(c) ? "potential" : "absurd");
  return handedness({ recv: at("recv"), send: at("send"), actuate: at("actuate"), observe: at("observe") });
}

/** The capacity reading a handedness carries at a given coordinate. */
export const readingAt = (h, coordinate) =>
  h[handednessCoordinateName(coordinate)];

/**
 * The dual `(-)^⊥` of a handedness: swaps the Opponent perceive side with the
 * Player act side — recv↔send, observe↔actuate — the agent-side reading of the
 * CGS dualizing operation.  A symmetric peer is a fixed point of this dual.
 */
export function dualHandedness(h) {
  return Object.freeze({
    kind: "animating.agent.handedness",
    recv: readingAt(h, dualCoordinate("recv")),
    send: readingAt(h, dualCoordinate("send")),
    actuate: readingAt(h, dualCoordinate("actuate")),
    observe: readingAt(h, dualCoordinate("observe")),
  });
}

/**
 * Evidence that a handedness is a symmetric peer - a fixed point of the dual
 * where `recv = send` and `observe = actuate` - carrying the witnessed
 * handedness.
 */

/**
 * Evidence that a handedness fails to be a symmetric peer: carries the
 * handedness and the coordinate axes (`recv/send`, `observe/actuate`) whose two
 * sides disagree.
 */

  

/**
 * The result of judging symmetric-peerhood: either a `SymmetricPeerWitness` or
 * a `SymmetricPeerObstruction`.
 */

/**
 * Judge whether a handedness is a *symmetric peer* — a fixed point of the dual,
 * i.e. `recv = send` and `observe = actuate`.  Embodied participants are
 * generically asymmetric; the obstruction records which axes break symmetry.
 */
export function symmetricPeerJudgment(h) {
  const axes = [];
  if (h.recv !== h.send) axes.push("recv/send");
  if (h.observe !== h.actuate) axes.push("observe/actuate");
  return axes.length === 0
    ? Object.freeze({ kind: "animating.agent.handedness.symmetricPeer:witness", handedness: h })
    : Object.freeze({ kind: "animating.agent.handedness.symmetricPeer-obstruction", handedness: h, asymmetricAxes: Object.freeze(axes) });
}

/**
 * Whether a handedness is a symmetric peer: true when `symmetricPeerJudgment`
 * yields a witness.
 */
export const isSymmetricPeer = (h) =>
  symmetricPeerJudgment(h).kind === "animating.agent.handedness.symmetricPeer:witness";

/**
 * Type guard for `Handedness`: true when the value is an object tagged
 * `"animating.agent.handedness"` with string readings at all four coordinates.
 */
export function isHandedness(value) {
  if (typeof value !== "object" || value === null) return false;
  const c = value;
  return c.kind === "animating.agent.handedness"
    && typeof c.recv === "string"
    && typeof c.send === "string"
    && typeof c.actuate === "string"
    && typeof c.observe === "string";
}
