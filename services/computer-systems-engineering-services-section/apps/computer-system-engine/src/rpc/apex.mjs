/**
 * action-apex projections - generated descriptor faces of an induced action apex.
 *
 * These functions do not open sockets, read the process environment, or execute action
 * bodies. They turn the same induced apex into transport-facing discovery
 * documents. Runtime routing and dispatch remain in `src/running`.
 */

import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { schemaRegistry } from "@red-cup-engineering/json-schema-services-section/schema-registry";
import { promptDescriptor, } from "./prompt.mjs";
import { declaredSchemas } from "@red-cup-engineering/json-schema-services-section/contracts";
import { resourceDescriptor, } from "./resource.mjs";

/**
 * Project an induced action apex to an OpenAPI 3.1.1 document.
 *
 * The paths are not authored independently: each POST operation is an action
 * endpoint, and request/response schemas are the carrier refs already present on
 * that endpoint. The component schema table is the live carrier registry, so the
 * generated document is a transport face of the category rather than a second
 * source of API truth.
 */
export function actionOpenApi(induced, options = {}) {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const paths = {};
  for (const endpoint of induced.discovery.programs) {
    paths[`${base}/${endpoint.name}`] = {
      post: {
        operationId: endpoint.name,
        "x-settlement-regime": endpoint.settlement.regime,
        "x-settlement-transport": endpoint.settlement.transport,
        "x-settlement-finality": endpoint.settlement.finality,
        ...(endpoint.summary === undefined ? {} : { summary: endpoint.summary }),
        ...(endpoint.description === undefined ? {} : { description: endpoint.description }),
        requestBody: {
          required: true,
          content: { [endpoint.input]: { schema: endpoint.domainSchema ?? {} } },
        },
        responses: {
          "200": { description: "OK", content: { [endpoint.output]: { schema: endpoint.codomainSchema ?? {} } } },
          "400": { description: "Bad Request" },
        },
      },
    };
  }
  return {
    openapi: "3.1.1",
    info: { title: options.title ?? induced.discovery.package, version: options.version ?? "0.0.0" },
    paths,
    components: {
      schemas: Object.fromEntries(declaredSchemas().map((carrier) => [carrier.id, carrier.schema])),
    },
  };
}

/**
 * Project actions to MCP tool descriptors.
 *
 * Each action becomes one conforming MCP tool name. The tool input is a single
 * `input` property whose schema is the action domain ref when one exists; the
 * output schema mirrors the codomain ref when present. Calls still execute
 * through dispatch, so this list is discovery metadata, not an executor.
 */
export function actionMcpTools(actions) {
  return actionMcpToolsWithEndpoints(actions, []);
}

const MCP_TOOL_NAME = /^[A-Za-z0-9_.-]{1,128}$/;

/**
 * Project one action identity to its MCP tool name.
 *
 * MCP names retain already-conforming action identities. Other identities use a
 * deterministic shared content digest, while descriptors and call readbacks
 * retain the complete action identity.
 *
 * @param identity Action identity used by local dispatch.
 * @returns A conforming MCP tool name.
 */
export function mcpToolNameForIdentity(identity) {
  return MCP_TOOL_NAME.test(identity) ? identity : `relating-${sha256Hex(identity)}`;
}

function mcpActionsByToolName(actions) {
  const result = new Map();
  for (const action of actions) {
    const name = mcpToolNameForIdentity(action.verb);
    const prior = result.get(name);
    if (prior !== undefined) {
      throw new TypeError(`MCP tool name collision: ${name} maps both ${prior.verb} and ${action.verb}`);
    }
    result.set(name, action);
  }
  return result;
}

/**
 * Resolve an MCP tool name to the action's complete local identity.
 *
 * @param actions Actions projected by the induced apex.
 * @param name MCP tool name supplied by a client.
 * @returns The action, or `undefined` when the name is not listed.
 */
export function actionByMcpToolName(actions, name) {
  return mcpActionsByToolName(actions).get(name);
}

function mcpCarrierEnvelope(carrier, property) {
  const registry = schemaRegistry(declaredSchemas());
  const standalone = registry.standalone(carrier.id);
  return {
    ...(typeof standalone.$schema === "string" ? { $schema: standalone.$schema } : {}),
    type: "object",
    properties: { [property]: { $ref: standalone.$ref } },
    required: [property],
    $defs: standalone.$defs,
  };
}

export function actionMcpToolsWithEndpoints(
  actions,
  endpoints,
) {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint]));
  mcpActionsByToolName(actions);
  return actions.map((act) => {
    const endpoint = byName.get(act.verb);
    const hasFiniteOutput = endpoint === undefined || endpoint.settlement.finality === "normal-form";
    return {
      name: mcpToolNameForIdentity(act.verb),
      _meta: { "relating/action-identity": act.verb },
      ...(act.summary === undefined ? {} : { description: act.summary }),
      inputSchema: act.domain === undefined
        ? { type: "object", properties: { input: { description: `The ${act.inputFormat} input carrier for ${act.verb}.` } }, required: ["input"] }
        : mcpCarrierEnvelope(act.domain, "input"),
      ...(act.codomain === undefined || !hasFiniteOutput ? {} : { outputSchema: mcpCarrierEnvelope(act.codomain, "output") }),
      ...(endpoint === undefined ? {} : {
        "x-settlement-regime": endpoint.settlement.regime,
        "x-settlement-transport": endpoint.settlement.transport,
        "x-settlement-finality": endpoint.settlement.finality,
      }),
    };
  });
}

/**
 * Project an induced apex to MCP resource descriptors.
 *
 * Resources include registered package artifacts plus resources derived by
 * `induceSurface`, such as carrier schemas, action input/output schemas, discovery,
 * and the operations-manifold read.
 */
export function actionMcpResources(induced) {
  return induced.resources.map((res) => ({ ...resourceDescriptor(res) }));
}

/**
 * Project an induced apex to MCP prompt descriptors.
 *
 * Registered prompts are preserved and per-action prompts are derived from the
 * same action metadata, keeping agent guidance coupled to the operation
 * declaration.
 */
export function actionMcpPrompts(induced) {
  return induced.prompts.map((pr) => ({ ...promptDescriptor(pr) }));
}
