import { capabilityCoverage, capabilitySearch } from "../capability-index.mts";
import { operationsManifoldAgentRun, operationsManifoldAgentHarness } from "./harness.mts";
import {
  OPERATIONS_MANIFOLD_DISCOVERY_PLAY,
  OPERATIONS_MANIFOLD_OBSTRUCTED_DISCOVERY_PLAY,
  operationsManifoldAgentStrategy,
} from "./strategy.mts";

export { OPERATIONS_MANIFOLD_AGENT_ARENA_LABELS, OPERATIONS_MANIFOLD_AGENT_CAUSALITY, OPERATIONS_MANIFOLD_AGENT_EVENTS, operationsManifoldAgentArena } from "./arena.mts";
export { operationsManifoldAgentHarness, operationsManifoldAgentRun } from "./harness.mts";
export { OPERATIONS_MANIFOLD_DISCOVERY_PLAY, OPERATIONS_MANIFOLD_OBSTRUCTED_DISCOVERY_PLAY, operationsManifoldAgentStrategy } from "./strategy.mts";

export function operationsManifoldAgents() {
  const arena = operationsManifoldAgentStrategy();
  const agentHarness = operationsManifoldAgentHarness();
  const agentRun = operationsManifoldAgentRun();
  return Object.freeze({
    kind: "operations-manifold.agents",
    harness: Object.freeze({
      term: agentHarness.carrier.term,
      agent: agentHarness.carrier.agent,
      channels: agentHarness.carrier.channels,
      utterances: agentHarness.carrier.utterances.length,
    }),
    loop: Object.freeze({
      id: agentRun.run.id,
      stop: agentRun.run.stop,
      settled: agentRun.classification.settled,
      regime: agentRun.classification.regime,
      turns: agentRun.classification.turns,
      finalAnswer: agentRun.classification.settled ? agentRun.classification.finalAnswer : null,
    }),
    arena: Object.freeze({
      kind: arena.arena.kind,
      events: arena.arena.structure.events.map((event) => Object.freeze({
        id: event.id,
        polarity: event.polarity.name,
      })),
      causality: arena.arena.structure.causality,
      conflict: arena.arena.structure.conflict,
    }),
    strategy: Object.freeze({
      kind: arena.strategy.kind,
      plays: arena.strategy.plays.map((item: { readonly moves: readonly string[] }) => item.moves),
      report: arena.report,
      flow: Object.freeze({
        kind: arena.flow.kind,
        challenge: arena.flow.challenge.value,
        skill: arena.flow.skill.value,
        reason: "reason" in arena.flow ? arena.flow.reason : null,
        mismatch: "mismatch" in arena.flow ? arena.flow.mismatch : 0,
      }),
    }),
  });
}

export async function operationsManifoldCapabilityCheck(
  repoRoot: string,
  query: string,
  options: Readonly<{ refresh?: boolean }> = {},
) {
  const [result, coverage] = await Promise.all([
    capabilitySearch(repoRoot, query, options),
    capabilityCoverage(repoRoot, query, options),
  ]);
  const matches = result.packages.length + result.functions.length + result.types.length;
  const foundExistingCarrier = matches > 0 || (coverage.terms.length > 0 && coverage.gaps.length === 0);
  const selectedPlay = foundExistingCarrier ? OPERATIONS_MANIFOLD_DISCOVERY_PLAY : OPERATIONS_MANIFOLD_OBSTRUCTED_DISCOVERY_PLAY;
  const agents = operationsManifoldAgents();
  return Object.freeze({
    kind: "operations-manifold.agent.check-capability",
    query,
    foundExistingCarrier,
    counts: Object.freeze({
      packages: result.packages.length,
      functions: result.functions.length,
      types: result.types.length,
      total: matches,
    }),
    play: Object.freeze(selectedPlay),
    strategy: Object.freeze({
      wellFormed: agents.strategy.report.wellFormed,
      report: agents.strategy.report,
    }),
    coverage,
    result,
  });
}

export type OperationsManifoldAgents = ReturnType<typeof operationsManifoldAgents>;
export type OperationsManifoldCapabilityCheck = Awaited<ReturnType<typeof operationsManifoldCapabilityCheck>>;
