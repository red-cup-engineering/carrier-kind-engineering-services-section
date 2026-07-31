import { flow, play, strategy, strategyReport } from "@red-cup-engineering/gaming";

import { OPERATIONS_MANIFOLD_AGENT_EVENTS, operationsManifoldAgentArena } from "./arena.mts";

export const OPERATIONS_MANIFOLD_DISCOVERY_PLAY = Object.freeze([
  OPERATIONS_MANIFOLD_AGENT_EVENTS.request,
  OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities,
  OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier,
  OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection,
] as const);

export const OPERATIONS_MANIFOLD_OBSTRUCTED_DISCOVERY_PLAY = Object.freeze([
  OPERATIONS_MANIFOLD_AGENT_EVENTS.request,
  OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities,
] as const);

export function operationsManifoldAgentStrategy() {
  const arena = operationsManifoldAgentArena();
  const current = strategy(arena, [
    play([]),
    play([OPERATIONS_MANIFOLD_AGENT_EVENTS.request]),
    play([OPERATIONS_MANIFOLD_AGENT_EVENTS.request, OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities]),
    play([OPERATIONS_MANIFOLD_AGENT_EVENTS.request, OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities, OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier]),
    play(OPERATIONS_MANIFOLD_DISCOVERY_PLAY),
  ]);
  return Object.freeze({
    arena,
    strategy: current,
    report: strategyReport(current),
    flow: flow(arena, current),
  });
}
