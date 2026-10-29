import { observeLabels } from "@red-cup-engineering/computing";
import { arena, event, eventStructure, negative, positive } from "@red-cup-engineering/gaming";

type ArenaEventSpec = Readonly<{
  id: string;
  predicate: string;
  charge: "active" | "potential";
}>;

export const OPERATIONS_MANIFOLD_AGENT_ARENA_LABELS: readonly ArenaEventSpec[] = Object.freeze([
  Object.freeze({ id: "operations-manifold.agent.request", predicate: "operations-manifold.agent.requested", charge: "active" }),
  Object.freeze({ id: "operations-manifold.agent.inspect-existing-capabilities", predicate: "operations-manifold.agent.inspected-existing-capabilities", charge: "potential" }),
  Object.freeze({ id: "operations-manifold.agent.choose-existing-carrier", predicate: "operations-manifold.agent.chose-existing-carrier", charge: "potential" }),
  Object.freeze({ id: "operations-manifold.agent.mount-transport-projection", predicate: "operations-manifold.agent.mounted-transport-projection", charge: "potential" }),
]);

function eventId(id: string): string {
  return id;
}

export const OPERATIONS_MANIFOLD_AGENT_EVENTS = Object.freeze({
  request: eventId("operations-manifold.agent.request"),
  inspectExistingCapabilities: eventId("operations-manifold.agent.inspect-existing-capabilities"),
  chooseExistingCarrier: eventId("operations-manifold.agent.choose-existing-carrier"),
  mountTransportProjection: eventId("operations-manifold.agent.mount-transport-projection"),
} as const);

export const OPERATIONS_MANIFOLD_AGENT_CAUSALITY = Object.freeze([
  Object.freeze([OPERATIONS_MANIFOLD_AGENT_EVENTS.request, OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities] as const),
  Object.freeze([OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities, OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier] as const),
  Object.freeze([OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier, OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection] as const),
]);

export function operationsManifoldAgentArena() {
  const observation = observeLabels(OPERATIONS_MANIFOLD_AGENT_ARENA_LABELS);
  return arena(eventStructure(
    observation.arena.structure.events.map((item) => event(item.id, item.charge === "active" ? negative() : positive())),
    OPERATIONS_MANIFOLD_AGENT_CAUSALITY,
    [],
  ));
}
