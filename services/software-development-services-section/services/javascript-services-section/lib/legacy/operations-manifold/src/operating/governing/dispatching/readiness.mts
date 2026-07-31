import { charge, chargeValue, chargeValueName, valueOf, type PredicationTerm } from "@emsenn/relating";

import { CODEX_AGENT_CAPABILITIES } from "../../../codecs/codex.mts";
import { optionalText, stringList } from "../../../records.mts";
import { fiber, fiberCoordinate, officeName, officeTerm, term, termKey, type Fiber, type FiberCoordinate } from "../../../work-carriers.mts";

export type CoordMatch = Readonly<{
  coordinate: FiberCoordinate;
  requirement: boolean;
  provision: boolean;
  match: boolean;
}>;

export type DispatchReadiness = Readonly<{
  ready: boolean;
  gap: "none" | "capability" | "authority" | "capability-and-authority";
  contested: boolean;
  delta: string;
  capability: string;
  authority: string;
  capabilityMatches: readonly CoordMatch[];
  authorityMatches: readonly CoordMatch[];
}>;

export type AgentProvisions = Readonly<{
  capabilities?: Fiber | undefined;
}>;

export type Office = Readonly<{
  term: PredicationTerm;
  authorities: Fiber;
  capabilities: Fiber;
  duties: readonly PredicationTerm[];
  evidence: readonly PredicationTerm[];
}>;

export type GovernanceDecision = Readonly<{
  operation: PredicationTerm;
  eligible: boolean;
  readiness: DispatchReadiness;
  charge: ReturnType<typeof charge>;
}>;

type DispatchMode = Readonly<{
  term: PredicationTerm;
  operations: readonly Readonly<{
    operation: PredicationTerm;
    requirement: Readonly<{
      capabilities: Fiber;
      authorities: Fiber;
    }>;
  }>[];
}>;

export const CODEX_DISPATCH_OPERATION_REQUIREMENTS = Object.freeze([
  Object.freeze({ operation: "inspect-read-workspace", capabilities: Object.freeze(["read-workspace.inspect"]), authorities: Object.freeze(["read-read-workspace"]) }),
  Object.freeze({ operation: "edit-site-code", capabilities: Object.freeze(["code.edit"]), authorities: Object.freeze(["edit-site-code"]) }),
  Object.freeze({ operation: "run-verification", capabilities: Object.freeze(["test.run"]), authorities: Object.freeze(["run-checks"]) }),
  Object.freeze({ operation: "invoke-mcp-tool", capabilities: Object.freeze(["mcp.tool-use"]), authorities: Object.freeze(["invoke-tools"]) }),
  Object.freeze({ operation: "restart-service", capabilities: Object.freeze(["command.run"]), authorities: Object.freeze(["restart-site-service"]) }),
] as const);

export type CodexDispatchOperationName = typeof CODEX_DISPATCH_OPERATION_REQUIREMENTS[number]["operation"];

export type AssessDispatchReadinessParams = Readonly<{
  operation?: string | undefined;
  q?: string | undefined;
  agent?: string | undefined;
  office?: string | undefined;
  capabilities?: string | readonly string[] | undefined;
  focus?: string | undefined;
  intent?: string | undefined;
}>;

export type AssessDispatchReadinessReading = Readonly<{
  kind: "operations-manifold.assess-dispatch-readiness";
  generatedAt: string;
  domain: Readonly<{
    agent: string;
    office: string;
    operation: string;
    focus: string | null;
    intent: string | null;
  }>;
  codomain: Readonly<{
    ready: boolean;
    eligible: boolean;
    gap: DispatchReadiness["gap"];
    contested: boolean;
    delta: DispatchReadiness["delta"];
    capability: DispatchReadiness["capability"];
    authority: DispatchReadiness["authority"];
    charge: string;
    nextInterfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
  }>;
  requirement: Readonly<{
    capabilities: readonly string[];
    authorities: readonly string[];
  }>;
  provisions: Readonly<{
    capabilities: readonly string[];
    officeAuthorities: readonly string[];
  }>;
  matches: Readonly<{
    capabilities: readonly DispatchMatchReading[];
    authorities: readonly DispatchMatchReading[];
  }>;
  upstream: Readonly<{
    package: "@red-cup-engineering/animating";
    functions: readonly ["mode", "office", "provisions", "governOperation", "dispatchReadiness"];
  }>;
  evidence: readonly string[];
}>;

export type DispatchMatchReading = Readonly<{
  coordinate: string;
  requirement: CoordMatch["requirement"];
  provision: CoordMatch["provision"];
  match: CoordMatch["match"];
}>;

const coordinateCache = new Map<string, ReturnType<typeof fiberCoordinate>>();

export function office(termValue: PredicationTerm, input: Omit<Office, "term">): Office {
  return Object.freeze({
    term: termValue,
    authorities: input.authorities,
    capabilities: input.capabilities,
    duties: Object.freeze([...input.duties]),
    evidence: Object.freeze([...input.evidence]),
  });
}

export function provisions(input: AgentProvisions): AgentProvisions {
  return Object.freeze({
    ...(input.capabilities === undefined ? {} : { capabilities: input.capabilities }),
  });
}

function mode(
  termValue: PredicationTerm,
  operations: DispatchMode["operations"],
): DispatchMode {
  return Object.freeze({
    term: termValue,
    operations: Object.freeze([...operations]),
  });
}

export function governOperation(input: Readonly<{
  agent: PredicationTerm;
  operation: PredicationTerm;
  mode: DispatchMode;
  capabilities: Fiber;
  office: Office;
}>): GovernanceDecision {
  void input.agent;
  const entry = input.mode.operations.find((candidate) => termKey(candidate.operation) === termKey(input.operation))
    ?? input.mode.operations[0]!;
  const capabilityMatches = matchFiber(entry.requirement.capabilities, input.capabilities);
  const authorityMatches = matchFiber(entry.requirement.authorities, input.office.authorities);
  const capabilityReady = capabilityMatches.every((match) => match.match);
  const authorityReady = authorityMatches.every((match) => match.match);
  const ready = capabilityReady && authorityReady;
  const gap: DispatchReadiness["gap"] = ready
    ? "none"
    : !capabilityReady && !authorityReady
      ? "capability-and-authority"
      : capabilityReady
        ? "authority"
        : "capability";
  const readiness: DispatchReadiness = Object.freeze({
    ready,
    gap,
    contested: !ready,
    delta: ready ? "matched" : `missing-${gap}`,
    capability: capabilityReady ? "matched" : "missing",
    authority: authorityReady ? "matched" : "missing",
    capabilityMatches,
    authorityMatches,
  });
  return Object.freeze({
    operation: entry.operation,
    eligible: ready,
    readiness,
    charge: charge(chargeValue(ready ? "potential" : "stable")),
  });
}

export function matchFiber(requirement: Fiber, provision: Fiber): readonly CoordMatch[] {
  const provided = new Set(provision.entries.map((entry) => termKey(entry.coordinate.term)));
  return Object.freeze(requirement.entries.map((entry) => {
    const key = termKey(entry.coordinate.term);
    const provisioned = provided.has(key);
    return Object.freeze({
      coordinate: entry.coordinate,
      requirement: true,
      provision: provisioned,
      match: provisioned,
    });
  }));
}

export function requirements(input: Readonly<{ capabilities: Fiber; authorities: Fiber }>): Readonly<{ capabilities: Fiber; authorities: Fiber }> {
  return Object.freeze({
    capabilities: input.capabilities,
    authorities: input.authorities,
  });
}

export function incumbentProvisions(capabilities: Fiber, officeValue: Office): Readonly<{ capabilities: Fiber; authorities: Fiber }> {
  return Object.freeze({
    capabilities,
    authorities: officeValue.authorities,
  });
}

export function dispatchReadiness(
  requirement: Readonly<{ capabilities: Fiber; authorities: Fiber }>,
  provision: Readonly<{ capabilities: Fiber; authorities: Fiber }>,
): DispatchReadiness {
  const capabilityMatches = matchFiber(requirement.capabilities, provision.capabilities);
  const authorityMatches = matchFiber(requirement.authorities, provision.authorities);
  const capabilityReady = capabilityMatches.every((match) => match.match);
  const authorityReady = authorityMatches.every((match) => match.match);
  const ready = capabilityReady && authorityReady;
  const gap: DispatchReadiness["gap"] = ready
    ? "none"
    : !capabilityReady && !authorityReady
      ? "capability-and-authority"
      : capabilityReady
        ? "authority"
        : "capability";
  return Object.freeze({
    ready,
    gap,
    contested: !ready,
    delta: ready ? "matched" : `missing-${gap}`,
    capability: capabilityReady ? "matched" : "missing",
    authority: authorityReady ? "matched" : "missing",
    capabilityMatches,
    authorityMatches,
  });
}

export function codexDispatchOffices(): readonly Office[] {
  return Object.freeze([
    office(officeTerm("operations-manifold.engineering"), {
      authorities: codexDispatchFiber(["read-read-workspace", "edit-site-code", "run-checks", "invoke-tools", "restart-site-service"], "authority"),
      capabilities: codexDispatchFiber(["read-workspace.inspect", "code.edit", "test.run", "mcp.tool-use", "governance.dispatch", "trace.fold"]),
      duties: ["inspect-existing-carriers", "implement-site-capabilities", "verify-runtime"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Engineering"])],
    }),
    office(officeTerm("operations-manifold.governance"), {
      authorities: codexDispatchFiber(["set-policy", "admit-tool", "assign-read-work"], "authority"),
      capabilities: codexDispatchFiber(["governance.dispatch", "memory.recall", "trace.fold"]),
      duties: ["settle-rules", "admit-operations", "review-contested-read-work"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Governance"])],
    }),
    office(officeTerm("koios.newsroom"), {
      authorities: codexDispatchFiber(["review-copy", "publish-story", "repair-intake"], "authority"),
      capabilities: codexDispatchFiber(["site.administer", "news.edit", "work.plan"]),
      duties: ["review-editorial-read-work", "repair-publication-gates"].map((value) => term(["duty", value])),
      evidence: [term(["label", "Koios Newsroom"])],
    }),
  ]);
}

export function codexAgentProvisions(capabilities: readonly string[] = CODEX_AGENT_CAPABILITIES): AgentProvisions {
  return provisions({ capabilities: codexDispatchFiber(capabilities) });
}

export function codexDispatchMode() {
  return mode(term(["operations-manifold", "read-agent-platform"]), CODEX_DISPATCH_OPERATION_REQUIREMENTS.map((entry) => Object.freeze({
    operation: term(["operation", entry.operation]),
    requirement: Object.freeze({
      capabilities: codexDispatchFiber(entry.capabilities),
      authorities: codexDispatchFiber(entry.authorities, "authority"),
    }),
  })));
}

export function codexGovernanceDecisions(agentProvisions: AgentProvisions = codexAgentProvisions(), engineering: Office = codexDispatchOffices()[0]!): readonly GovernanceDecision[] {
  const platformMode = codexDispatchMode();
  const capabilities = agentProvisions.capabilities ?? codexDispatchFiber([]);
  return Object.freeze(platformMode.operations.map((entry) =>
    governOperation({ agent: term(["agent", "codex"]), operation: entry.operation, mode: platformMode, capabilities, office: engineering })
  ));
}

export async function assessDispatchReadiness(_repoRoot: string, params: AssessDispatchReadinessParams = {}): Promise<AssessDispatchReadinessReading> {
  const operationName = selectedOperation(optionalText(params.operation ?? params.q));
  const requirement = CODEX_DISPATCH_OPERATION_REQUIREMENTS.find((entry) => entry.operation === operationName)!;
  const requestedCapabilities = stringList(params.capabilities);
  const capabilityNames = requestedCapabilities.length === 0 ? CODEX_AGENT_CAPABILITIES : requestedCapabilities;
  const agentProvisions = codexAgentProvisions(capabilityNames);
  const offices = codexDispatchOffices();
  const officeValue = selectedOffice(offices, optionalText(params.office));
  const platformMode = codexDispatchMode();
  const operationEntry = platformMode.operations.find((entry) => operationNameOf(entry.operation) === operationName) ?? platformMode.operations[0]!;
  const decision = governOperation({
    agent: term(["agent", optionalText(params.agent) ?? "codex"]),
    operation: operationEntry.operation,
    mode: platformMode,
    capabilities: agentProvisions.capabilities ?? codexDispatchFiber([]),
    office: officeValue,
  });
  const focus = optionalText(params.focus);
  const intent = optionalText(params.intent);
  return Object.freeze({
    kind: "operations-manifold.assess-dispatch-readiness" as const,
    generatedAt: new Date().toISOString(),
    domain: Object.freeze({
      agent: optionalText(params.agent) ?? "codex",
      office: officeName(officeValue.term),
      operation: operationName,
      focus,
      intent,
    }),
    codomain: Object.freeze({
      ready: decision.readiness.ready,
      eligible: decision.eligible,
      gap: decision.readiness.gap,
      contested: decision.readiness.contested,
      delta: decision.readiness.delta,
      capability: decision.readiness.capability,
      authority: decision.readiness.authority,
      charge: chargeValueName(valueOf(decision.charge)),
      nextInterfaces: nextInterfaces(operationName, focus, intent, decision),
    }),
    requirement: Object.freeze({
      capabilities: requirement.capabilities,
      authorities: requirement.authorities,
    }),
    provisions: Object.freeze({
      capabilities: capabilityNames,
      officeAuthorities: officeAuthorities(officeValue),
    }),
    matches: Object.freeze({
      capabilities: Object.freeze(decision.readiness.capabilityMatches.map(matchReading)),
      authorities: Object.freeze(decision.readiness.authorityMatches.map(matchReading)),
    }),
    upstream: Object.freeze({
      package: "@red-cup-engineering/animating" as const,
      functions: Object.freeze(["mode", "office", "provisions", "governOperation", "dispatchReadiness"] as const),
    }),
    evidence: Object.freeze([
      "src/operating/governing/dispatching/readiness.mts",
      "src/holography/llm/codex.mts",
      "@red-cup-engineering/animating governOperation",
      "@red-cup-engineering/animating dispatchReadiness",
    ]),
  });
}

export function codexDispatchFiber(values: readonly string[], axis: "capability" | "authority" = "capability"): Fiber {
  return fiber(values.map((value) => {
    const key = `${axis}:${value}`;
    const existing = coordinateCache.get(key);
    if (existing !== undefined) return existing;
    const coordinate = fiberCoordinate(term([axis, value]));
    coordinateCache.set(key, coordinate);
    return coordinate;
  }));
}

function selectedOperation(value: string | null): CodexDispatchOperationName {
  if (value !== null) {
    const normalized = value.trim().toLowerCase();
    const direct = CODEX_DISPATCH_OPERATION_REQUIREMENTS.find((entry) => entry.operation === normalized);
    if (direct !== undefined) return direct.operation;
    const fuzzy = CODEX_DISPATCH_OPERATION_REQUIREMENTS.find((entry) => normalized.includes(entry.operation) || entry.operation.includes(normalized));
    if (fuzzy !== undefined) return fuzzy.operation;
  }
  return "invoke-mcp-tool";
}

function selectedOffice(offices: readonly Office[], value: string | null): Office {
  if (value === null) return offices[0]!;
  const normalized = value.toLowerCase();
  return offices.find((item) => officeName(item.term).toLowerCase() === normalized || officeName(item.term).toLowerCase().includes(normalized)) ?? offices[0]!;
}

function operationNameOf(value: ReturnType<typeof term>): string | null {
  const raw = value.mark.value;
  return Array.isArray(raw) && raw[0] === "operation" && typeof raw[1] === "string" ? raw[1] : null;
}

function officeAuthorities(value: Office): readonly string[] {
  return Object.freeze(value.authorities.entries.map((entry) => coordinateName(entry.coordinate)).filter((entry) => entry !== null));
}

function matchReading(match: CoordMatch): DispatchMatchReading {
  return Object.freeze({
    coordinate: coordinateName(match.coordinate) ?? termKey(match.coordinate.term),
    requirement: match.requirement,
    provision: match.provision,
    match: match.match,
  });
}

function coordinateName(value: CoordMatch["coordinate"]): string | null {
  const raw = value.term.mark.value;
  return Array.isArray(raw) && typeof raw[1] === "string" ? raw[1] : null;
}

function nextInterfaces(operationName: string, focus: string | null, intent: string | null, decision: GovernanceDecision): AssessDispatchReadinessReading["codomain"]["nextInterfaces"] {
  return Object.freeze([
    iface("read-agent-platform", "inspect the full Codex governance and work projection", { focus: focus ?? "sites/ops.561.group" }),
    iface("derive-codex-harness-profile", "read whether tool-use governance is mounted in the Codex harness", { focus: focus ?? "sites/ops.561.group", intent: intent ?? `assess dispatch readiness for ${operationName}` }),
    ...(decision.eligible
      ? [iface("record-operation", "book the governed operation as witnessed work evidence", { event: "tool-use", tool: operationName })]
      : [iface("update-work", "record the dispatch gap against active work before proceeding", { evidence: `dispatch-gap:${operationName}:${decision.readiness.gap}` })]),
  ]);
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }> {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}
