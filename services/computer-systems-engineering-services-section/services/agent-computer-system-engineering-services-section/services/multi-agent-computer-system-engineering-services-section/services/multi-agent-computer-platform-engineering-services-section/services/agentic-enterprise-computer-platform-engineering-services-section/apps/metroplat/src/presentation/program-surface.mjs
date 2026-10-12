/**
 * program-surface projections - generated descriptor faces of an induced program surface.
 *
 * These functions do not open sockets, read `process.env`, or execute action
 * bodies. They turn the same induced program surface into transport-facing discovery
 * documents. Runtime routing and dispatch remain in `src/presentation`.
 */
import { schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";

import { promptDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/prompt";
import { resourceDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/resource";
import { programPacketFromOperation, programPacketResourceUri } from "@red-cup-engineering/communicating/language/packets";
import { mcpToolRefusalSchema } from "@red-cup-engineering/mcp-engineering-services-section/catalog";

/** Whether an operation's input schema is an object, so a tool's arguments are its input. */
export const toolTakesArguments = (schema) => schema !== undefined && schema !== null && (schema.type === "object" || (schema.type === undefined && typeof schema.properties === "object"));

function programPacketDescriptor(action, packageName, contract) {
  const packet = programPacketFromOperation({ ...action, contract });
  if (packet === undefined) return undefined;
  return {
    id: packet.id,
    resource: programPacketResourceUri(packet.id, packageName),
    bodyFormat: packet.bodyFormat,
    digest: packet.digest,
    contract: packet.contract,
  };
}

function programContractDescriptor(endpoint) {
  return {
    id: endpoint.contract.contract.id,
    standing: endpoint.contract.reading,
    price: endpoint.contract.price,
    precondition: endpoint.contract.contract.precondition,
    postcondition: endpoint.contract.contract.postcondition,
    coordination: endpoint.contract.contract.coordination,
    laws: endpoint.contract.contract.laws,
    evidence: endpoint.contract.evidence,
  };
}

/**
 * Project an induced program surface to an OpenAPI 3.1.1 document.
 *
 * The paths are not authored independently: each POST operation is a mounted
 * program endpoint, and request/response schemas are the schema refs already
 * present on that endpoint. The component schema table is derived from the
 * carried operation domains and codomains, so the generated document is a
 * transport face of the category rather than a second source of API truth.
 */
export function programOpenApi(induced, options = {}) {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const packageName = induced.discovery.package;
  const operationByVerb = new Map(induced.operations.map((action) => [action.verb, action]));
  const paths = {};
  for (const endpoint of induced.discovery.programs) {
    const packet = operationByVerb.get(endpoint.name) === undefined
      ? undefined
      : programPacketDescriptor(operationByVerb.get(endpoint.name), packageName, endpoint.contract.contract.id);
    paths[`${base}/${endpoint.name}`] = {
      post: {
        operationId: endpoint.name,
        ...(packet === undefined ? {} : { "x-metroplat-program-packet": packet }),
        "x-metroplat-program-contract": programContractDescriptor(endpoint),
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
    info: { title: options.title ?? induced.discovery.package, version: options.version ?? "0.1.0" },
    paths,
    components: {
      schemas: Object.fromEntries(schemasOfOperations(induced.operations).map((schemaContract) => [schemaContract.id, schemaContract.schema])),
    },
  };
}

/**
 * Project operations to MCP tool descriptors.
 *
 * Each action becomes one tool named by its verb. The tool input is a single
 * `input` property whose schema is the action domain ref when one exists; the
 * output schema mirrors the codomain ref when present. Calls still execute
 * through dispatch, so this list is discovery metadata, not an executor.
 */
export function programMcpTools(operations) {
  return programMcpToolsWithEndpoints(operations, []);
}

export function programMcpToolsWithEndpoints(
  operations,
  endpoints,
  packageName = "@red-cup-engineering/metroplat",
) {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint]));
  return operations.map((act) => {
    const endpoint = byName.get(act.verb);
    const domainSchema = endpoint?.domainSchema ?? (act.domain === undefined ? undefined : { $ref: act.domain.id });
    const codomainSchema = endpoint?.codomainSchema ?? (act.codomain === undefined ? undefined : { $ref: act.codomain.id });
    const packet = endpoint === undefined ? undefined : programPacketDescriptor(act, packageName, endpoint.contract.contract.id);
    return {
      name: act.verb,
      ...(act.summary === undefined ? {} : { description: act.summary }),
      // An object input is the tool's arguments themselves; any other input travels as { input }.
      inputSchema: toolTakesArguments(domainSchema) ? domainSchema : {
        type: "object",
        properties: { input: domainSchema ?? { description: `The ${act.inputFormat} input schema for ${act.verb}.` } },
        required: ["input"],
      },
      ...(codomainSchema === undefined ? {} : { outputSchema: { type: "object", oneOf: [codomainSchema, mcpToolRefusalSchema] } }),
      // MCP's standard hints, read from the operation's declared effects.
      ...(act.effects === undefined ? {} : { annotations: {
        readOnlyHint: act.effects.class === "pure" || act.effects.class === "host-read",
        idempotentHint: act.effects.replay === "safe",
        openWorldHint: act.effects.class === "external",
      } }),
      ...(endpoint === undefined ? {} : {
        ...(packet === undefined ? {} : { "x-metroplat-program-packet": packet }),
        "x-metroplat-program-contract": programContractDescriptor(endpoint),
        "x-settlement-regime": endpoint.settlement.regime,
        "x-settlement-transport": endpoint.settlement.transport,
        "x-settlement-finality": endpoint.settlement.finality,
      }),
    };
  });
}

/**
 * Project operations to OpenAI function-tool descriptors.
 *
 * The public OpenAI wire expects function tools to carry their name and JSON
 * Schema under a nested `function` object. The schema remains the same boundary
 * object used by MCP: one required `input` field containing the action input schema.
 * Agreement metadata stays in the endpoint projection report resource rather
 * than being injected into the OpenAI tool descriptor.
 */
export function programOpenAiFunctionTools(induced) {
  return programOpenAiFunctionToolsWithEndpoints(induced.operations, induced.discovery.programs);
}

export function programOpenAiFunctionToolsWithEndpoints(
  operations,
  endpoints,
) {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint]));
  return Object.freeze(operations.map((act) => {
    const endpoint = byName.get(act.verb);
    const domainSchema = endpoint?.domainSchema ?? (act.domain === undefined ? undefined : { $ref: act.domain.id });
    return Object.freeze({
      type: "function",
      function: Object.freeze({
        name: act.verb,
        ...(act.summary === undefined ? {} : { description: act.summary }),
        parameters: Object.freeze({
          type: "object",
          properties: Object.freeze({
            input: domainSchema ?? Object.freeze({ description: `The ${act.inputFormat} input schema for ${act.verb}.` }),
          }),
          required: Object.freeze(["input"]),
          additionalProperties: false,
        }),
        strict: true,
      }),
    });
  }));
}

/**
 * Project an induced program surface to MCP resource descriptors.
 *
 * Resources include registered package artifacts plus resources derived by
 * `projectSurface`, such as registered schemas, action input/output schemas, discovery,
 * and the operations-manifold read.
 */
export function programMcpResources(induced) {
  return induced.resources.map((res) => ({ ...resourceDescriptor(res) }));
}

/**
 * Project an induced program surface to MCP prompt descriptors.
 *
 * Registered prompts are preserved and per-operation prompts are derived from the
 * same operation metadata, keeping agent guidance coupled to the operation
 * declaration.
 */
export function programMcpPrompts(induced) {
  return induced.prompts.map((pr) => ({ ...promptDescriptor(pr) }));
}
