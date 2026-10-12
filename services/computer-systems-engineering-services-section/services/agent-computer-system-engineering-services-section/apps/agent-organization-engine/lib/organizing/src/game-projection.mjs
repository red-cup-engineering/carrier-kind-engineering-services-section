/**
 * game-projection - read computing observations as actual gaming arenas.
 *
 * ObservationArena already has positions and moves. This module realizes that
 * shape as a finite CGS/event-structure projection using @red-cup-engineering/gaming's real
 * constructors: readings become polarity, moves become causal edges, and the
 * secured linearization becomes a strategy/play witness.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import {
  arena,
  event,
  eventStructure,
  negative,
  play,
  positive,
  strategy,
  strategyReport,

} from "@red-cup-engineering/gaming";

import { traceTile } from "@red-cup-engineering/computing/trace-holography";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export const observationGameProjectionSchema = {
  $id: "computing/observation-game-projection",
  title: "ObservationGameProjection",
  type: "object",
  required: [
    "kind",
    "observationHash",
    "arena",
    "play",
    "strategy",
    "report",
    "traceTiles",
    "polarityReading",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.observation-game-projection" },
    observationHash: { type: "string", minLength: 1 },
    arena: { type: "object" },
    play: { type: "object" },
    strategy: { type: "object" },
    report: { type: "object" },
    traceTiles: { type: "array", items: { type: "object" } },
    polarityReading: {
      type: "object",
      required: ["positive", "negative", "silent"],
      additionalProperties: false,
      properties: {
        positive: { type: "array", items: { type: "string" } },
        negative: { type: "array", items: { type: "string" } },
        silent: { type: "array", items: { type: "string" } },
      },
    },
    theory: {
      type: "object",
      required: ["eventStructure", "cgs", "goi"],
      additionalProperties: false,
      properties: {
        eventStructure: { type: "string", minLength: 1 },
        cgs: { type: "string", minLength: 1 },
        goi: { type: "string", minLength: 1 },
      },
    },
  },
};

export const observationGameRequestSchema = {
  $id: "computing/observation-game-request",
  title: "ObservationGameRequest",
  type: "object",
  required: ["kind", "arena"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.observation-game-request" },
    arena: { type: "object" },
  },
};

export const observationGameRequestCarrier = schemaFrom(observationGameRequestSchema);

export const observationGameProjectionCarrier = schemaFrom(observationGameProjectionSchema);

function unique(values) {
  return Object.freeze([...new Set(values)]);
}

function polarityOf(reading) {
  switch (reading) {
    case "potential":
      return "positive";
    case "active":
      return "negative";
    case "stable":
    case "absurd":
      return "silent";
  }
}

function sortedByMoveOrder(arenaInput) {
  const seen = new Set();
  const out = [];
  for (const move of arenaInput.moves) {
    for (const id of [move.from, move.to]) {
      if (!arenaInput.positions.includes(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of arenaInput.positions) if (!seen.has(id)) out.push(id);
  return Object.freeze(out);
}

export function projectObservationGame(observation) {
  const arenaInput = observation.kind === "computing.observation" ? observation.arena : observation;
  const readingByPosition = new Map();
  for (const eventInput of arenaInput.structure.events) readingByPosition.set(eventInput.id, eventInput.reading);
  for (const move of arenaInput.moves) {
    if (!readingByPosition.has(move.from)) readingByPosition.set(move.from, move.reading);
    if (!readingByPosition.has(move.to)) readingByPosition.set(move.to, move.reading);
  }
  const positiveIds = [];
  const negativeIds = [];
  const silentIds = [];
  const gameEvents = arenaInput.positions.flatMap((id) => {
    const reading = readingByPosition.get(id) ?? "absurd";
    const polarity = polarityOf(reading);
    if (polarity === "silent") {
      silentIds.push(id);
      return [];
    }
    if (polarity === "positive") positiveIds.push(id);
    else negativeIds.push(id);
    return [event(id, polarity === "positive" ? positive() : negative())];
  });
  const causalPairs = arenaInput.moves
    .filter((move) => move.from !== move.to)
    .filter((move) => polarityOf(readingByPosition.get(move.from) ?? move.reading) !== "silent")
    .filter((move) => polarityOf(readingByPosition.get(move.to) ?? move.reading) !== "silent")
    .map((move) => Object.freeze([move.from, move.to]));
  const gameArena = arena(eventStructure(gameEvents, causalPairs), []);
  const gamePlay = play(sortedByMoveOrder(arenaInput)
    .filter((id) => polarityOf(readingByPosition.get(id) ?? "absurd") !== "silent"));
  const prefixes = gamePlay.moves.map((_, index) => play(gamePlay.moves.slice(0, index + 1)));
  const gameStrategy = strategy(gameArena, [play([]), ...prefixes]);
  const report = strategyReport(gameStrategy);
  const observationHash = semanticHex(arenaInput);
  const traceTiles = Object.freeze(gamePlay.moves.map((move, index) => traceTile({
    kind: "computing.trace-event-input",
    source: "labels",
    subject: move,
    rule: "observation.game.play",
    stage: index,
    payload: { move, index, polarity: polarityOf(readingByPosition.get(move) ?? "absurd") },
    boundaryHashes: index === 0 ? [observationHash] : [semanticHex({ previous: gamePlay.moves[index - 1] })],
  })));
  const projection = Object.freeze({
    kind: "computing.observation-game-projection",
    observationHash,
    arena: gameArena,
    play: gamePlay,
    strategy: gameStrategy,
    report,
    traceTiles,
    polarityReading: Object.freeze({
      positive: unique(positiveIds),
      negative: unique(negativeIds),
      silent: unique(silentIds),
    }),
    theory: Object.freeze({
      eventStructure: "finite prime-event-structure shadow: events plus causal dependency edges",
      cgs: "concurrent game with symmetry via @red-cup-engineering/gaming arena and strategy constructors",
      goi: "play trace as token-machine path through the observation arena",
    }),
  });
  observationGameProjectionCarrier.assert(projection);
  return projection;
}

export const projectObservationGameAction = operation({
  verb: "project-observation-game",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project a computing observation arena into a gaming CGS arena, play, and strategy report.",
  description: "Domain: computing/observation-game-request. Codomain: computing/observation-game-projection. The projection uses @red-cup-engineering/gaming's real arena/play/strategy constructors: observation moves become event-structure causality, readings become polarity, and the secured play becomes a finite GoI-style token path.",
  domain: observationGameRequestCarrier,
  codomain: observationGameProjectionCarrier,
  run: (input) => {
    const request = observationGameRequestCarrier.assert(jsonResource(input, "project-observation-game input"));
    return jsonResource(projectObservationGame(request.arena), "observation-game-projection");
  },
});

