import {
  attenuatedAuthorityCutContract,
  canInvoke,
  oauthDelegatedAccessContract,

} from "@red-cup-engineering/feltos/capability";
import { empiricalModel, hasGlobalSection, measurementScenario, stronglyContextual } from "@lenticule-science/metrologic/models/physics/models/quantum-contextuality/measurement-scenario";
import { codexPluginAffordanceContract } from "../openai/codex/schema.mjs";
import {
  openaiFunctionToolContract,
  openaiToolCallContract,
  openaiToolContract,
  openaiToolName,

} from "@red-cup-engineering/computer-inference-engine/openai/codecs";
import { mcpToolCatalogTransportContract } from "@red-cup-engineering/mcp-engineering-services-section/index";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const ALL_FACES = Object.freeze([
  "capability",
  "openai-tool",
  "mcp-catalog-transport",
  "oauth-delegation",
  "codex-plugin",
]);

const AUTHORITY_CONTEXTUALITY_OUTCOMES = Object.freeze([
  "admitted",
  "blocked",
  "discharged",
  "missing",
]);

function nonempty(value, label) {
  const clean = value.trim();
  if (clean.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return clean;
}

function unique(values, label) {
  const out = [];
  for (const value of values) {
    const clean = nonempty(value, label);
    if (!out.includes(clean)) out.push(clean);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

function resourceWithin(parent, child) {
  return child === parent || child.startsWith(`${parent}/`);
}

function affords(affordances, request) {
  return affordances.some((affordance) =>
    affordance === request.action
    || affordance === `${request.resource}:${request.action}`
    || affordance === `${request.resource}#${request.action}`
    || (affordance.endsWith("*") && `${request.resource}:${request.action}`.startsWith(affordance.slice(0, -1)))
    || (affordance.endsWith("*") && request.action.startsWith(affordance.slice(0, -1)))
  );
}

function asJson(value, context) {
  return jsonResource(value, context);
}

function face(input

) {
  return Object.freeze({
    kind: input.kind,
    name: nonempty(input.name, `${input.kind} face name`),
    status: input.status,
    reasons: Object.freeze([...(input.reasons ?? [])]),
    material: asJson(input.material, `${input.kind} material`),
  });
}

function bridgedStatus(ok, baseAdmitted) {
  return ok && baseAdmitted ? "admitted" : "blocked";
}

function bridgeReasons(rawReasons, baseAdmitted) {
  return Object.freeze(baseAdmitted ? [...rawReasons] : [...rawReasons, "base capability cut blocks descriptor execution"]);
}

function authorityContextualityReadout(faces, requiredFaces) {
  const selectedFaces = requiredFaces.length === 0 ? faces.map((entry) => entry.kind) : requiredFaces;
  const required = Object.freeze([...new Set(selectedFaces)]);
  const byKind = new Map(faces.map((entry) => [entry.kind, entry.status]));
  const contexts = Object.freeze(required.map((kind) => Object.freeze({
    face: kind,
    status: byKind.get(kind) ?? ("missing"),
  })));
  const measurements = Object.freeze([
    "request",
    ...contexts.map((context) => `face:${context.face}`),
  ]);
  const scenario = measurementScenario(
    measurements,
    contexts.map((context) => Object.freeze(["request", `face:${context.face}`])),
  );
  const statusByMarker = new Map(
    contexts.map((context) => [`face:${context.face}`, context.status]),
  );
  const model = empiricalModel(
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
      kind: "metroplat.authority.contextuality-readout",
      model: "Obsmetrologia.QuantumContextuality.MeasurementScenario",
      measurement: "request",
      contexts,
      classification: "noncontextual",
      globalStatus: global.assignment.request,
    });
  }
  const strong = stronglyContextual(model);
  if (strong === undefined) throw new TypeError("authorityContextualityReadout: authority face cover was neither global nor strongly contextual");
  const statuses = Object.freeze([...new Set(contexts.map((context) => context.status))].sort());
  return Object.freeze({
    kind: "metroplat.authority.contextuality-readout",
    model: "Obsmetrologia.QuantumContextuality.MeasurementScenario",
    measurement: "request",
    contexts,
    classification: "strongly-contextual",
    obstruction: Object.freeze({
      kind: "metroplat.authority.strong-contextuality-obstruction",
      theorem: "Obsmetrologia.QuantumContextuality.stronglyContextual_iff",
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
export function oauthDelegatedAccess(input

) {
  return oauthDelegatedAccessContract.assert(Object.freeze({
    kind: "authority.oauth-delegated-access",
    issuer: nonempty(input.issuer, "OAuth issuer"),
    subject: nonempty(input.subject, "OAuth subject"),
    client: nonempty(input.client, "OAuth client"),
    resourceServer: nonempty(input.resourceServer, "OAuth resource server"),
    scopes: unique(input.scopes, "OAuth scope"),
    status: input.status ?? "active",
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  }), "OAuth delegated access");
}

/** Admit a Codex plugin manifest as finite affordance material. */
export function codexPluginAffordance(input

) {
  return codexPluginAffordanceContract.assert(Object.freeze({
    kind: "authority.codex-plugin-affordance",
    plugin: nonempty(input.plugin, "Codex plugin"),
    manifest: nonempty(input.manifest, "Codex plugin manifest"),
    affordances: unique(input.affordances, "Codex plugin affordance"),
    enabled: input.enabled ?? true,
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
  }), "Codex plugin affordance");
}

/** Join capability, protocol descriptor, delegated-access, and plugin faces into one authority cut. */
export function attenuatedAuthorityCut(input) {
  const capabilityJudgment = canInvoke(input.capability.capability, input.capability.invocation);
  const request = Object.freeze({
    actor: capabilityJudgment.invocation.actor,
    resource: capabilityJudgment.invocation.resource,
    action: capabilityJudgment.invocation.action,
  });
  const baseAdmitted = capabilityJudgment.ok;
  const faces = [
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
      : openaiToolContract.assert(input.openai.tool, "OpenAI authority-cut tool"));
    const call = input.openai.call === undefined ? undefined : openaiToolCallContract.assert(input.openai.call, "OpenAI authority-cut tool call");
    const toolName = openaiToolName(tool);
    const reasons = [];
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
    const transport = mcpToolCatalogTransportContract.assert(input.mcp.transport, "MCP authority-cut transport");
    const toolName = nonempty(input.mcp.toolName ?? request.action, "MCP authority-cut tool name");
    const reasons = [];
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
    const delegated = oauthDelegatedAccessContract.assert(input.oauth, "OAuth authority-cut descriptor");
    const reasons = [];
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
    const plugin = codexPluginAffordanceContract.assert(input.codex, "Codex plugin authority-cut descriptor");
    const reasons = [];
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
    kind: "metroplat.authority.attenuated-cut",
    locus: nonempty(input.locus, "authority cut locus"),
    request,
    faces: Object.freeze(faces),
    admitted,
    blocked,
    discharged,
    missing,
    contextuality: authorityContextualityReadout(faces, required),
    ok: blocked.length === 0 && missing.length === 0,
  }), "attenuated authority cut");
}
