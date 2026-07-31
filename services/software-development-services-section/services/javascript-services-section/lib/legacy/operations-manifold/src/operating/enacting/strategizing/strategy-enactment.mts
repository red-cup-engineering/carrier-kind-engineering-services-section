import {
  play,
  strategyContainsPlay,
  strategyExtensionsAfter,
  strategyMovePolarity,
} from "@red-cup-engineering/gaming";

import {
  OPERATIONS_MANIFOLD_AGENT_EVENTS,
  operationsManifoldAgentStrategy,
} from "../../../agents/index.mts";
import { boundedInteger, optionalText, stringList } from "../../../records.mts";

export type StrategyEnactmentParams = Readonly<{
  focus?: string | number | undefined;
  intent?: string | number | undefined;
  q?: string | number | undefined;
  phase?: string | number | undefined;
  move?: string | number | undefined;
  moves?: string | readonly string[] | undefined;
  limit?: string | number | undefined;
}>;

export type StrategyMoveReading = Readonly<{
  id: string;
  label: string;
  polarity: string | null;
}>;

export type StrategyEnactmentInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type StrategyEnactmentReading = Readonly<{
  kind: "operations-manifold.enact-strategy";
  generatedAt: string;
  domain: Readonly<{
    focus: string;
    intent: string;
    phase: string;
    moves: readonly StrategyMoveReading[];
  }>;
  codomain: Readonly<{
    ready: boolean;
    currentAdmitted: boolean;
    wellFormed: boolean;
    nextMove: StrategyMoveReading | null;
    nextInterfaces: readonly StrategyEnactmentInterface[];
    hookContextTask: Readonly<{
      id: string;
      title: string;
      interface: StrategyEnactmentInterface;
    }>;
  }>;
  strategy: Readonly<{
    plays: readonly (readonly StrategyMoveReading[])[];
    report: unknown;
    flow: Readonly<{
      kind: string;
      challenge: string;
      skill: string;
      reason: string | null;
      mismatch: number;
    }>;
  }>;
  current: Readonly<{
    admittedExtensions: readonly StrategyMoveReading[];
  }>;
  evidence: readonly string[];
}>;

const MOVE_LABEL_BY_ID = new Map<string, string>([
  [OPERATIONS_MANIFOLD_AGENT_EVENTS.request, "request"],
  [OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities, "inspect-existing-capabilities"],
  [OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier, "choose-existing-carrier"],
  [OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection, "mount-transport-projection"],
]);

const MOVE_ID_BY_ALIAS = new Map<string, string>([
  ["request", OPERATIONS_MANIFOLD_AGENT_EVENTS.request],
  ["agent-request", OPERATIONS_MANIFOLD_AGENT_EVENTS.request],
  ["inspect", OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities],
  ["inspect-existing-capabilities", OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities],
  ["choose", OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier],
  ["choose-existing-carrier", OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier],
  ["mount", OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection],
  ["complete", OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection],
  ["mount-transport-projection", OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection],
]);

export function enactStrategy(
  _repoRoot: string,
  params: StrategyEnactmentParams = {},
): StrategyEnactmentReading {
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const intent = optionalText(params.intent ?? params.q) ?? "enact the next Operations Manifold Codex strategy step";
  const limit = boundedInteger(params.limit, { min: 1, max: 24, fallback: 8 });
  const model = operationsManifoldAgentStrategy();
  const moves = requestedMoves(params, intent);
  const currentPlay = play(moves);
  const currentAdmitted = strategyContainsPlay(model.strategy, currentPlay);
  const admittedExtensions = currentAdmitted
    ? strategyExtensionsAfter(model.strategy, currentPlay).map((move) => moveReading(model.strategy, move))
    : [];
  const nextMove = admittedExtensions[0] ?? null;
  const hookContext = iface("derive-context-relevance", "provide Codex hooks with keyword-matched functions, types, scripts, and context interfaces", {
    focus,
    intent,
    limit: String(limit),
  });

  return Object.freeze({
    kind: "operations-manifold.enact-strategy" as const,
    generatedAt: new Date().toISOString(),
    domain: Object.freeze({
      focus,
      intent,
      phase: phaseOf(params),
      moves: Object.freeze(moves.map((move) => moveReading(model.strategy, move))),
    }),
    codomain: Object.freeze({
      ready: model.report.wellFormed === true && currentAdmitted,
      currentAdmitted,
      wellFormed: model.report.wellFormed === true,
      nextMove,
      nextInterfaces: nextInterfacesFor({ focus, intent, limit, move: nextMove?.label ?? null }),
      hookContextTask: Object.freeze({
        id: "work:wire-codex-hooks-to-keyword-relevant-function-context:fb1223892fd3",
        title: "Wire Codex hooks to keyword-relevant function context",
        interface: hookContext,
      }),
    }),
    strategy: Object.freeze({
      plays: Object.freeze(model.strategy.plays.map((item) => Object.freeze(item.moves.map((move) => moveReading(model.strategy, move))))),
      report: model.report,
      flow: Object.freeze({
        kind: model.flow.kind,
        challenge: String(model.flow.challenge.value),
        skill: String(model.flow.skill.value),
        reason: "reason" in model.flow ? String(model.flow.reason) : null,
        mismatch: "mismatch" in model.flow ? Number(model.flow.mismatch) : 0,
      }),
    }),
    current: Object.freeze({
      admittedExtensions: Object.freeze(admittedExtensions),
    }),
    evidence: Object.freeze([
      "@red-cup-engineering/gaming play",
      "@red-cup-engineering/gaming strategyExtensionsAfter",
      "src/agents/arena.mts",
      "src/agents/strategy.mts",
      "derive-context-relevance",
      "work:wire-codex-hooks-to-keyword-relevant-function-context:fb1223892fd3",
    ]),
  });
}

function requestedMoves(params: StrategyEnactmentParams, intent: string): readonly string[] {
  const explicit = [...stringList(params.moves), ...stringList(textParam(params.move))].map(resolveMove).filter((move): move is string => move !== null);
  if (explicit.length > 0) return Object.freeze(explicit);

  const phase = phaseOf(params);
  if (phase === "request") return Object.freeze([OPERATIONS_MANIFOLD_AGENT_EVENTS.request]);
  if (phase === "inspect") return Object.freeze([
    OPERATIONS_MANIFOLD_AGENT_EVENTS.request,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities,
  ]);
  if (phase === "choose") return Object.freeze([
    OPERATIONS_MANIFOLD_AGENT_EVENTS.request,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier,
  ]);
  if (phase === "mount" || phase === "complete") return Object.freeze([
    OPERATIONS_MANIFOLD_AGENT_EVENTS.request,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.inspectExistingCapabilities,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.chooseExistingCarrier,
    OPERATIONS_MANIFOLD_AGENT_EVENTS.mountTransportProjection,
  ]);
  return intent.trim() === "" ? Object.freeze([]) : Object.freeze([OPERATIONS_MANIFOLD_AGENT_EVENTS.request]);
}

function phaseOf(params: StrategyEnactmentParams): string {
  const phase = optionalText(params.phase)?.toLowerCase().replace(/_/gu, "-") ?? "";
  if (phase === "inspect-existing-capabilities") return "inspect";
  if (phase === "choose-existing-carrier") return "choose";
  if (phase === "mount-transport-projection") return "mount";
  if (["request", "inspect", "choose", "mount", "complete"].includes(phase)) return phase;
  return "request";
}

function resolveMove(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/_/gu, "-").replace(/\./gu, "-");
  if (normalized === "") return null;
  return MOVE_ID_BY_ALIAS.get(normalized) ?? (MOVE_LABEL_BY_ID.has(value) ? value : null);
}

function moveReading(strategy: ReturnType<typeof operationsManifoldAgentStrategy>["strategy"], id: string): StrategyMoveReading {
  return Object.freeze({
    id,
    label: MOVE_LABEL_BY_ID.get(id) ?? id,
    polarity: strategyMovePolarity(strategy, id)?.name ?? null,
  });
}

function nextInterfacesFor(input: Readonly<{ focus: string; intent: string; limit: number; move: string | null }>): readonly StrategyEnactmentInterface[] {
  if (input.move === "inspect-existing-capabilities") {
    return Object.freeze([
      iface("derive-context-relevance", "read keyword-relevant functions, types, and scripts for the current intent", { focus: input.focus, intent: input.intent, limit: String(input.limit) }),
      iface("derive-codebase-profile", "project focused carriers, relations, and applicable functions", { focus: input.focus, intent: input.intent, limit: String(input.limit) }),
      iface("read-jsnode-functions", "inspect exported function signatures matching the dominant keyword", { q: "llm", limit: String(input.limit) }),
      iface("check-capability", "ask whether an existing carrier already covers the requested capability", { q: input.intent }),
    ]);
  }
  if (input.move === "choose-existing-carrier") {
    return Object.freeze([
      iface("select-work-interface", "select the next work interface from the shared work topology", { focus: input.focus, intent: input.intent, limit: String(input.limit) }),
      iface("assess-dispatch-readiness", "check authority and capability before a tool or transport operation", { focus: input.focus, intent: input.intent, operation: "invoke-mcp-tool" }),
      iface("project-context-suit", "assemble bounded context for the selected carrier", { focus: input.focus, intent: input.intent }),
    ]);
  }
  if (input.move === "mount-transport-projection") {
    return Object.freeze([
      iface("update-work", "record witnessed implementation and verification evidence", { evidence: "verification:..." }),
      iface("record-operation", "append an operation event for the carrier projection", { subject: input.focus, predicate: "mounted-carrier", object: input.intent }),
      iface("derive-codex-harness-profile", "confirm the mounted carrier appears in the Codex harness profile", { focus: input.focus, intent: input.intent }),
    ]);
  }
  return Object.freeze([
    iface("derive-codex-harness-profile", "read the current harness gates, capabilities, and next interfaces", { focus: input.focus, intent: input.intent }),
    iface("read-session", "inspect current Codex session bindings and pressures", { focus: input.focus, intent: input.intent }),
  ]);
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): StrategyEnactmentInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function textParam(value: string | number | undefined): string | undefined {
  const text = optionalText(value);
  return text === null ? undefined : text;
}
