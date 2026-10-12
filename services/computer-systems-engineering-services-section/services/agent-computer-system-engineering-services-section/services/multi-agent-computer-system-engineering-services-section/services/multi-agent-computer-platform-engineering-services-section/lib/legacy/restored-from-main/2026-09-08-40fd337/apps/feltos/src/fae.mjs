import { composeProviders, serializeComposition } from "@red-cup-engineering/fae/compositor";
import { fourNamed } from "./four.mjs";
import { createEngine } from "./engine.mjs";
import { defineGame } from "./game.mjs";

const FELTOS_FOUR_BY_FAE_READING = Object.freeze({
  BOT: "neither",
  T: "true",
  F: "false",
  TOP: "both",
});

/**
 * Translate FAE's serialized knowledge reading into FeltOS's Four carrier.
 *
 * @param {"BOT" | "T" | "F" | "TOP"} reading FAE's serialized knowledge reading.
 * @returns {{positiveEvidence: boolean, negativeEvidence: boolean}} The equivalent FeltOS evidence.
 * @throws {TypeError} When the reading is not part of FAE's serialized carrier.
 */
export function fourFromFaeReading(reading) {
  const name = FELTOS_FOUR_BY_FAE_READING[reading];
  if (name === undefined) throw new TypeError(`unknown FAE knowledge reading: ${String(reading)}`);
  return fourNamed(name);
}

/**
 * Run FAE's admitted resource graph as the initial assertion territory of a
 * FeltOS world. FAE acquires and composes observations; FeltOS owns the
 * deterministic multi-agent simulation over those assertions.
 */
export async function createFaeOperatedEngine({ game, providers, providerContext = {}, onProviderError = "throw" } = {}) {
  if (game?.kind !== "feltos.game.v1") throw new TypeError("game must be a defined FeltOS game");
  const composition = await composeProviders(providers, { context: providerContext, onProviderError });
  const projection = serializeComposition(composition);
  const assertions = projection.cells.map(({ subject, predicate, object, reading }) => ({
    subject,
    predicate,
    object,
    evidence: fourFromFaeReading(reading),
  }));
  const operatedGame = defineGame({ ...game, assertions: [...game.assertions, ...assertions] });
  return Object.freeze({
    kind: "feltos.fae-operated-engine.v1",
    engine: createEngine(operatedGame),
    fae: Object.freeze({
      resources: projection.resources,
      providers: projection.providers,
      diagnostics: projection.diagnostics,
      cells: projection.cells,
      cellCount: projection.cells.length,
    }),
  });
}
