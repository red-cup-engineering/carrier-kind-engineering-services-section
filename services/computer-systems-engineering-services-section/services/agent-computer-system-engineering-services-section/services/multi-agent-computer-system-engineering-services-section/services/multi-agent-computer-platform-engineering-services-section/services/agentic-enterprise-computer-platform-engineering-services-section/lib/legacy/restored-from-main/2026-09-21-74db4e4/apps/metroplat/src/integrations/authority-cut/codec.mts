import {
  attenuatedAuthorityCutContract,
  canInvoke,
  oauthDelegatedAccessContract,
  type AttenuatedAuthorityCut,
  type AuthorityCutFace,
  type AuthorityCutFaceKind,
  type AuthorityCutRequest,
  type AuthorityCutStatus,
  type CapabilityInvocation,
  type CodexPluginAffordance,
  type OAuthDelegatedAccess,
  type ObjectCapability,
} from "../../lib/capability/index.mts";
import {
  empiricalModel,
  hasGlobalSection,
  measurementScenario,
  stronglyContextual,
} from "@lenticule-science/metrologic/models/physics/models/quantum-contextuality";
import { codexPluginAffordanceContract } from "../openai/codex/schema.mts";
import { jsonResource, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  openaiFunctionToolContract,
  openaiToolCallContract,
  openaiToolContract,
  openaiToolName,
  type OpenAIToolDescriptor,
  type OpenAIToolCall,
} from "../openai/codecs.mts";
import { mcpToolCatalogTransportContract, type McpToolCatalogTransport } from "../mcp/index.mts";

const ALL_FACES: readonly AuthorityCutFaceKind[] = Object.freeze([
  "capability",
  "openai-tool",
  "mcp-catalog-transport",
  "oauth-delegation",
  "codex-plugin",
]);

type AuthorityCutContextualityOutcome = AuthorityCutStatus | "missing";
type AuthorityCutMeasurement = "request" | `face:${AuthorityCutFaceKind}`;

const AUTHORITY_CONTEXTUALITY_OUTCOMES: readonly AuthorityCutContextualityOutcome[] = Object.freeze([
  "admitted",
  "blocked",
  "discharged",
  "missing",
]);

export interface AttenuatedAuthorityCutInput {
  readonly locus: string;
  readonly capability: Readonly<{
    capability: ObjectCapability;
    invocation: CapabilityInvocation;
  }>;
  readonly openai?: Readonly<{
    tool: OpenAIToolDescriptor;
    call?: OpenAIToolCall;
  }>;
  readonly mcp?: Readonly<{
    transport: McpToolCatalogTransport;
    toolName?: string;
  }>;
  readonly oauth?: OAuthDelegatedAccess;
  readonly codex?: CodexPluginAffordance;
  readonly requiredFaces?: readonly AuthorityCutFaceKind[];
}

function nonempty(value: string, label: string): string {
  const clean = value.trim();
  if (clean.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return clean;
}

function unique(values: readonly string[], label: string): readonly string[] {
  const out: string[] = [];
  for (const value of values) {
    const clean = nonempty(value, label);
    if (!out.includes(clean)) out.push(clean);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

function resourceWithin(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

function affords(affordances: readonly string[], request: AuthorityCutRequest): boolean {
  return affordances.some((affordance) =>
    affordance === request.action
    || affordance === `${request.resource}:${request.action}`
    || affordance === `${request.resource}#${request.action}`
    || (affordance.endsWith("*") && `${request.resource}:${request.action}`.startsWith(affordance.slice(0, -1)))
    || (affordance.endsWith("*") && request.action.startsWith(affordance.slice(0, -1)))
  );
}

function asJson(value: unknown, context: string): JsonValue {
  return jsonResource(value, context);
}

function face(input: {
  readonly kind: AuthorityCutFaceKind;
  readonly name: string;
  readonly status: AuthorityCutStatus;
  readonly reasons?: readonly string[];
  readonly material: unknown;
}): AuthorityCutFace {
  return Object.freeze({
    kind: input.kind,
    name: nonempty(input.name, `${input.kind} face name`),
    status: input.status,
    reasons: Object.freeze([...(input.reasons ?? [])]),
    material: asJson(input.material, `${input.kind} material`),
  });
}

function bridgedStatus(ok: boolean, baseAdmitted: boolean): AuthorityCutStatus {
  return ok && baseAdmitted ? "admitted" : "blocked";
}

function bridgeReasons(rawReasons: readonly string[], baseAdmitted: boolean): readonly string[] {
  return Object.freeze(baseAdmitted ? [...rawReasons] : [...rawReasons, "base capability cut blocks descriptor execution"]);
}

function authorityContextualityReadout(faces: readonly AuthorityCutFace[], requiredFaces: readonly AuthorityCutFaceKind[]): JsonValue {
  const selectedFaces = requiredFaces.length === 0 ? faces.map((entry) => entry.kind) : requiredFaces;
  const required = Object.freeze([...new Set(selectedFaces)]);
  const byKind = new Map(faces.map((entry) => [entry.kind, entry.status] as const));
  const contexts = Object.freeze(required.map((kind) => Object.freeze({
    face: kind,
    status: byKind.get(kind) ?? ("missing" as const),
  })));
  const measurements = Object.freeze([
    "request",
    ...contexts.map((context) => `face:${context.face}` as const),
  ]) as readonly AuthorityCutMeasurement[];
  const scenario = measurementScenario<AuthorityCutMeasurement>(
    measurements,
    contexts.map((context) => Object.freeze(["request", `face:${context.face}` as const])),
  );
  const statusByMarker = new Map<AuthorityCutMeasurement, AuthorityCutContextualityOutcome>(
    contexts.map((context) => [`face:${context.face}` as const, context.status]),
  );
  const model = empiricalModel<AuthorityCutMeasurement, AuthorityCutContextualityOutcome>(
    scenario,
    AUTHORITY_CONTEXTUALITY_OUTCOMES,
    (context, assignment) => {
      const marker = context.find((measurement) => measurement.startsWith("face:"));
      return marker !== undefined && assignment.request === statusByMarker.get(marker);
    },
  );
  const global = hasGlobalSection(model);
  if (global !== undefined) {
    return Object.freeze({
      kind: "metroplat.authority.contextuality-readout" as const,
      model: "Obsmetrologia.QuantumContextuality.MeasurementScenario" as const,
      measurement: "request" as const,
      contexts,
      classification: "noncontextual" as const,
      globalStatus: global.assignment.request,
    });
  }
  const strong = stronglyContextual(model);
  if (strong === undefined) throw new TypeError("authorityContextualityReadout: authority face cover was neither global nor strongly contextual");
  const statuses = Object.freeze([...new Set(contexts.map((context) => context.status))].sort());
  return Object.freeze({
    kind: "metroplat.authority.contextuality-readout" as const,
    model: "Obsmetrologia.QuantumContextuality.MeasurementScenario" as const,
    measurement: "request" as const,
    contexts,
    classification: "strongly-contextual" as const,
    obstruction: Object.freeze({
      kind: "metroplat.authority.strong-contextuality-obstruction" as const,
      theorem: "Obsmetrologia.QuantumContextuality.stronglyContextual_iff" as const,
      hasNoGlobalSection: strong.hasNoGlobalSection,
      statuses,
      facesByStatus: Object.freeze(statuses.map((status) => Object.freeze({
        status,
        faces: Object.freeze(contexts.filter((context) => context.status === status).map((context) => context.face)),
      }))),
    }),
  });
}

/** Admit an OAuth-shaped delegated-access descriptor as authority-cut material. */
export function oauthDelegatedAccess(input: {
  readonly issuer: string;
  readonly subject: string;
  readonly client: string;
  readonly resourceServer: string;
  readonly scopes: readonly string[];
  readonly status?: OAuthDelegatedAccess["status"];
  readonly evidence?: readonly string[];
}): OAuthDelegatedAccess {
  return oauthDelegatedAccessContract.assert(Object.freeze({
    kind: "authority.oauth-delegated-access" as const,
    issuer: nonempty(input.issuer, "OAuth issuer"),
    subject: nonempty(input.subject, "OAuth subject"),
    client: nonempty(input.client, "OAuth client"),
    resourceServer: nonempty(input.resourceServer, "OAuth resource server"),
    scopes: unique(input.scopes, "OAuth scope"),
    status: input.status ?? "active" as const,
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  }), "OAuth delegated access") as OAuthDelegatedAccess;
}

/** Admit a Codex plugin manifest as finite affordance material. */
export function codexPluginAffordance(input: {
  readonly plugin: string;
  readonly manifest: string;
  readonly affordances: readonly string[];
  readonly enabled?: boolean;
  readonly evidence?: readonly string[];
}): CodexPluginAffordance {
  return codexPluginAffordanceContract.assert(Object.freeze({
    kind: "authority.codex-plugin-affordance" as const,
    plugin: nonempty(input.plugin, "Codex plugin"),
    manifest: nonempty(input.manifest, "Codex plugin manifest"),
    affordances: unique(input.affordances, "Codex plugin affordance"),
    enabled: input.enabled ?? true,
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  }), "Codex plugin affordance") as CodexPluginAffordance;
}

/** Join capability, protocol descriptor, delegated-access, and plugin faces into one authority cut. */
export function attenuatedAuthorityCut(input: AttenuatedAuthorityCutInput): AttenuatedAuthorityCut {
  const capabilityJudgment = canInvoke(input.capability.capability, input.capability.invocation);
  const request: AuthorityCutRequest = Object.freeze({
    actor: capabilityJudgment.invocation.actor,
    resource: capabilityJudgment.invocation.resource,
    action: capabilityJudgment.invocation.action,
  });
  const baseAdmitted = capabilityJudgment.ok;
  const faces: AuthorityCutFace[] = [
    face({
      kind: "capability",
      name: `${request.actor}:${request.resource}:${request.action}`,
      status: baseAdmitted ? "admitted" : "blocked",
      reasons: capabilityJudgment.reasons,
      material: capabilityJudgment,
    }),
  ];

  if (input.openai !== undefined) {
    const tool = (input.openai.tool.kind === "openai.function-tool"
      ? openaiFunctionToolContract.assert(input.openai.tool, "OpenAI authority-cut function tool")
      : openaiToolContract.assert(input.openai.tool, "OpenAI authority-cut tool")) as OpenAIToolDescriptor;
    const call = input.openai.call === undefined ? undefined : openaiToolCallContract.assert(input.openai.call, "OpenAI authority-cut tool call") as OpenAIToolCall;
    const toolName = openaiToolName(tool);
    const reasons: string[] = [];
    if (toolName !== request.action) reasons.push("OpenAI tool name must match the requested action");
    if (call === undefined) reasons.push("OpenAI tool call is missing");
    if (call !== undefined && call.name !== toolName) reasons.push("OpenAI tool call name must match the descriptor");
    const ok = reasons.length === 0;
    faces.push(face({
      kind: "openai-tool",
      name: toolName,
      status: bridgedStatus(ok, baseAdmitted),
      reasons: bridgeReasons(reasons, baseAdmitted),
      material: { tool, ...(call === undefined ? {} : { call }) },
    }));
  }

  if (input.mcp !== undefined) {
    const transport = mcpToolCatalogTransportContract.assert(input.mcp.transport, "MCP authority-cut transport") as unknown as McpToolCatalogTransport;
    const toolName = nonempty(input.mcp.toolName ?? request.action, "MCP authority-cut tool name");
    const reasons: string[] = [];
    if (toolName !== request.action) reasons.push("MCP tool name must match the requested action");
    if (!transport.bound.includes(toolName)) reasons.push("MCP catalog row must be bound to a tools/call handler");
    const ok = reasons.length === 0;
    faces.push(face({
      kind: "mcp-catalog-transport",
      name: toolName,
      status: bridgedStatus(ok, baseAdmitted),
      reasons: bridgeReasons(reasons, baseAdmitted),
      material: transport,
    }));
  }

  if (input.oauth !== undefined) {
    const delegated = oauthDelegatedAccessContract.assert(input.oauth, "OAuth authority-cut descriptor") as OAuthDelegatedAccess;
    const reasons: string[] = [];
    if (delegated.subject !== request.actor) reasons.push("OAuth subject must match the requesting actor");
    if (!resourceWithin(delegated.resourceServer, request.resource)) reasons.push("requested resource must be below the OAuth resource server");
    if (!affords(delegated.scopes, request)) reasons.push("OAuth scopes must include the requested action");
    const discharged = delegated.status !== "active";
    if (discharged) reasons.push(`OAuth delegated access is ${delegated.status}`);
    const ok = reasons.length === 0;
    faces.push(face({
      kind: "oauth-delegation",
      name: `${delegated.client}:${request.action}`,
      status: discharged ? "discharged" : bridgedStatus(ok, baseAdmitted),
      reasons: bridgeReasons(reasons, baseAdmitted),
      material: delegated,
    }));
  }

  if (input.codex !== undefined) {
    const plugin = codexPluginAffordanceContract.assert(input.codex, "Codex plugin authority-cut descriptor") as CodexPluginAffordance;
    const reasons: string[] = [];
    if (!plugin.enabled) reasons.push("Codex plugin affordance is disabled");
    if (!affords(plugin.affordances, request)) reasons.push("Codex plugin affordances must include the requested action");
    const ok = reasons.length === 0;
    faces.push(face({
      kind: "codex-plugin",
      name: `${plugin.plugin}:${request.action}`,
      status: bridgedStatus(ok, baseAdmitted),
      reasons: bridgeReasons(reasons, baseAdmitted),
      material: plugin,
    }));
  }

  const required = input.requiredFaces ?? ALL_FACES;
  const present = new Set(faces.map((entry) => entry.kind));
  const missing = Object.freeze(required.filter((kind) => !present.has(kind)));
  const admitted = Object.freeze(faces.filter((entry) => entry.status === "admitted").map((entry) => entry.name));
  const blocked = Object.freeze(faces.filter((entry) => entry.status === "blocked").map((entry) => entry.name));
  const discharged = Object.freeze(faces.filter((entry) => entry.status === "discharged").map((entry) => entry.name));

  return attenuatedAuthorityCutContract.assert(Object.freeze({
    kind: "metroplat.authority.attenuated-cut" as const,
    locus: nonempty(input.locus, "authority cut locus"),
    request,
    faces: Object.freeze(faces),
    admitted,
    blocked,
    discharged,
    missing,
    contextuality: authorityContextualityReadout(faces, required),
    ok: blocked.length === 0 && missing.length === 0,
  }), "attenuated authority cut") as AttenuatedAuthorityCut;
}
