/**
 * Masks — a participant's HANDEDNESS as the I/O FACE it turns to an arena.
 *
 * The corpus claim *embodied-handedness-is-player-opponent-duality*
 * (`concurrent-game-system.md:363-381`) is a theorem: an embodied participant's
 * four-tuple handedness $h(p) = (\mathrm{recv}, \mathrm{send}, \mathrm{actuate},
 * \mathrm{observe})$ IS Player/Opponent duality $(-)^\perp$ in $\mathbf{CGS}$. A
 * morphism $A \to B$ is a strategy on $A^\perp \| B$, and the four coordinates
 * partition by which side of that duality they sit on:
 *
 *   - `recv`, `observe` — **Opponent-side** on the input arena $A$ (the
 *     environment dictates; the participant receives);
 *   - `send`, `actuate` — **Player-side** on the output arena $B$ (the
 *     participant commits; the environment receives).
 *
 * This four-coordinate shape is a **MASK**: the face the agent turns to the arena —
 * what it shows outward (the Player side it commits) and what it takes in (the
 * Opponent side it receives). It is not a self; it carries no algebra and no
 * interior. There is no character "behind" it — the dramatic character is the
 * GLUING of an agent's masks (`@red-cup-engineering/playing`'s `identity` / `characterAgent`),
 * not a substance beneath them. A mask records one participant's four bounded
 * coordinates, partitioned by the $(-)^\perp$ side; `sides` exposes the
 * $A^\perp \| B$ split so a reader sees the morphism shape, and a *symmetric peer*
 * (the fixed point of the dual: `recv = send`, `observe = actuate`) is recorded as
 * the degenerate **copycat** — recorded, never imposed (`concurrent-game-system.md:379`,
 * "asymmetry is recorded, not refused").
 *
 * This module owns no composition: a Mask IS the *shape* of a morphism; the
 * composable 1-cell it realizes (copycat identity, interaction-plus-hiding) is
 * earned in `@red-cup-engineering/computing`, one layer up. Here we only record the face and
 * its polarity partition, reusing the game's own `Polarity` carrier — no second
 * encoding of duality.
 */

import { readingAt, coordinateSide, handednessCoordinates, isHandedness, isSymmetricPeer } from "@red-cup-engineering/animating/becoming/doing/embodying/handedness";
import { positive, negative } from "@red-cup-engineering/playing/structuring/polarity";

/** animating handedness side → playing CGS polarity: the gaming bridge between the
 *  agent's perceive→act handedness and the game's Player/Opponent duality. Lives here
 *  (not in animating) because it crosses animating × playing — gaming's own concern. */
const polarityOfHandednessSide = (side) =>
  side === "player" ? positive() : negative();

/**
 * A mask: one participant's I/O face turned to an arena, viewed as a concurrent-game
 * morphism shape and named by its agent handedness. It carries no algebra and no
 * interior — it is a pure typing over a handedness, partitioned by the Player/Opponent
 * duality (what the agent shows vs takes).
 *
 * Carrier surface (gaming/mask): the `kind`/`label` shell is local and the reused
 * `handedness` subfield is pinned to animating's `Handedness` carrier.
 */

/** Build a mask from an agent handedness and an optional label. */
export function mask(handedness, label = "") {
  return Object.freeze({
    kind: "game.mask",
    label,
    handedness,
  });
}

/**
 * The game `Polarity` a handedness coordinate sits at, by the CGS theorem:
 * Player-side coordinates (`send`, `actuate`) commit output and are `positive`
 * (Player); Opponent-side coordinates (`recv`, `observe`) take input and are
 * `negative` (Opponent). We reuse the apex's `Polarity`, not a new encoding.
 */
export function coordinatePolarity(coordinate) {
  return polarityOfHandednessSide(coordinateSide(coordinate));
}

/**
 * One coordinate's place in the morphism shape: its handedness coordinate carrier
 * records the side of $(-)^\perp$ it sits on; the face adds the game polarity that
 * side commits and the capacity reading the participant carries there.
 */

function coordinateFace(handedness, coordinate) {
  return Object.freeze({
    kind: "game.mask.face",
    coordinate,
    polarity: coordinatePolarity(coordinate),
    capacity: readingAt(handedness, coordinate),
  });
}

/**
 * The $A^\perp \| B$ partition of a mask: the input side $A$ (the Opponent-side
 * coordinates `recv`, `observe`) and the output side $B$ (the Player-side
 * coordinates `send`, `actuate`). Exposing the split lets a reader see the morphism
 * shape without re-deriving the duality theorem.
 *
 * Carrier surface (gaming/mask-sides): the `kind` shell is local; the `input`/`output`
 * arrays are pinned to the local `CoordinateFace` composite carrying reused animating
 * and playing carriers.
 */

/** Expose a mask's $A^\perp \| B$ partition, grouped by duality side. */
export function sides(m) {
  const faces = handednessCoordinates().map((coordinate) => coordinateFace(m.handedness, coordinate));
  return Object.freeze({
    kind: "game.mask.sides",
    input: Object.freeze(faces.filter((face) => face.coordinate.side === "opponent")),
    output: Object.freeze(faces.filter((face) => face.coordinate.side === "player")),
  });
}

/**
 * Whether a mask is a *symmetric peer* — the fixed point of the dual (`recv = send`,
 * `observe = actuate`), which realizes as the degenerate copycat morphism on the
 * self-dual arena $A^\perp \| A$. Recorded from the handedness, never imposed; the
 * generic mask is the asymmetric morphism.
 */
export const maskIsSymmetricPeer = (m) => isSymmetricPeer(m.handedness);

/** Type guard for `Mask`: tagged `"game.mask"` over a valid handedness. */
export function isMask(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.mask"
    && typeof candidate.label === "string"
    && isHandedness(candidate.handedness);
}
