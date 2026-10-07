/**
 * analysis — surface the lab's operationalized ludic/game theory over a game.
 *
 * The game family operationalizes a large body of ludic and game theory; this
 * module makes the *arena-derivable* part of it reachable. Given a running game
 * (a concurrent game system), it reports:
 *   - the Caillois regime classification (agon / alea / mimicry / ilinx) of the
 *     arena, with each regime's necessary condition (fairness, indeterminacy,
 *     identity-boundary, reversibility) as a witness/obstruction;
 *   - the paidia↔ludus placement and ludus-index (free play vs rule-bound);
 *   - the configuration count of the underlying prime event structure.
 *
 * Everything here is a pure read over `game.arena` — no game logic, no I/O.  The
 * judgments are already plain frozen carriers, so they serialize directly.
 */

import { classifyRegime } from "../structuring/concurrent-game/with-symmetry/reading/regime.mjs";
import { regimeConditions } from "../structuring/concurrent-game/with-symmetry/reading/regime-conditions.mjs";
import { paidiaLudusPlacement } from "../structuring/concurrent-game/with-symmetry/placing/paidia-ludus.mjs";
import { ludusIndex } from "../structuring/concurrent-game/with-symmetry/placing/ludus.mjs";
import { configurations } from "../structuring/concurrent-game/with-symmetry/placing/configurations.mjs";

/** A JSON analysis of a game's arena, drawn from games/analysis + games/geometry. */

  

/** Analyze a game's arena through the operationalized ludic/game theory. */
export function analyzeGame(game) {
  return {
    id: game.id,
    events: game.arena.structure.events.length,
    designs: game.designs.length,
    regime: classifyRegime(game.arena),
    regimeConditions: regimeConditions(game.arena),
    paidiaLudus: paidiaLudusPlacement(game.arena.structure),
    ludusIndex: ludusIndex(game.arena.structure),
    configurations: configurations(game.arena.structure).length,
  };
}
