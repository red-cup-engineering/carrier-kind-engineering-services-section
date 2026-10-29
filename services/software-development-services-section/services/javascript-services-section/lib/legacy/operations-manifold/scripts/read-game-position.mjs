#!/usr/bin/env node
/**
 * read-game-position — read the agent's work as a real lib/gaming concurrent-game
 * position: the open read-work as an arena, the operation repertoire as a
 * strategy, judged for Csikszentmihalyi flow (anxiety/flow/boredom). Optional
 * JSON param `session` scopes the repertoire to one session.
 */
import { gamePosition } from "../src/game-position.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => gamePosition(repoRoot, { session: params["session"] ?? params["session_id"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-game-position", "operations-manifold game position", morphism);
}
