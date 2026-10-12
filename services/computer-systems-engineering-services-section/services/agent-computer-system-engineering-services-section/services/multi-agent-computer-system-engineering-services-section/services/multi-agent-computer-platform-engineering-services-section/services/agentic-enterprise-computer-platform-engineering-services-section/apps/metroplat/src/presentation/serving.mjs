/**
 * api/serving — the four transports as functorial images of the apex.
 *
 * `projectSurface` gives one `ProjectedSurface` apex (the coproduct apex of a module's
 * operations). This module projects it, with no second ontology, to:
 *   - CLI         — `dispatch` (elsewhere; the `metroplat` bin)
 *   - HTTP        — optional root site route, `POST /:verb`
 *                   (body→stdin, stdout→response), `GET /health`
 *   - OpenAPI     — `GET /openapi.json` (a 3.1.1 document derived from the operations)
 *   - MCP         — `POST /mcp` (tools, resources, and prompts over one apex)
 *   - web UX      — `GET /:verb` (a basic HTML form) as a site projection
 *
 * The MCP projection is the full standard knowledge-vault surface: `tools/list`
 * and `tools/call` run the morphisms; `resources/list` and `resources/read`
 * serve the package's schemas and discovery document; `prompts/list` and
 * `prompts/get` serve the guided per-operation (and registered) prompts. All three are functorial images of the same
 * `projectSurface` apex — no second ontology.
 *
 * Every routed POST goes through `dispatch`, so an HTTP/MCP/form call is a
 * scripted play and is recorded as EAVT exactly like a CLI call. Pure routing
 * (`routeRequest`) is separated from the thin live HTTP binding in
 * `services/http`.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { negotiateType } from "@red-cup-engineering/http-services-section/negotiation";
import { apexMcpServer, approximationChain, continuationHandle, eventIndexAfter, html, json, negotiateOutputWire, promptArguments, stdinOf, text, wantsEventStream } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
export { feeds, html, json, text } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
import { mcpRpcError } from "@red-cup-engineering/mcp-engineering-services-section/server";
import { mcpToolRefusal, mcpToolRefusalResult } from "@red-cup-engineering/mcp-engineering-services-section/catalog";
import { parse as parseJson, requireJsonValue } from "@red-cup-engineering/json-services-section";
import {
  programMcpPrompts,
  programMcpResources,
  programMcpToolsWithEndpoints,
  programOpenApi,
  toolTakesArguments,
} from "@red-cup-engineering/metroplat/presentation/program-surface";
import {
  programFormHtml,
  programIndexHtml,
  decodeSchemaFormEntries,
} from "@red-cup-engineering/computer-web-server/platform-http/program-html";
import { operationsManifoldOf } from "@red-cup-engineering/computer-system-engine/rpc/manifold";

import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { transportCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { feedResponse } from "@red-cup-engineering/http-services-section/statement-log-stream";
import { sseFrame } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";

import { writeProcessStderr } from "@red-cup-engineering/node-process-services-section/stdio";
import { settleSite } from "@red-cup-engineering/signcraft/settle";
import { freeSite } from "@red-cup-engineering/signgraph/site";

export const routeOwnerDescriptorSchema = {
  $id: "metroplat/executing/route-settlement-descriptor",
  title: "RouteOwnerDescriptor",
  description: "A finite settlement/body descriptor used by the pure route projector when a settlement owns a root route.",
  type: "object",
  required: ["id", "path"],
  properties: {
    id: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

/** The route owner carried by root-route projections. */

const servedResponseSchema = {
  type: "object",
  required: ["status", "type", "body"],
  properties: {
    status: { type: "integer", minimum: 100, maximum: 599 },
    type: { type: "string", minLength: 1 },
    body: { type: "string" },
    headers: { type: "object" },
    exposure: {},
    routeExposureReport: {},
    outcome: {},
    outcomeReport: {},
    instrumentOutcome: {},
    instrumentOutcomeReport: {},
    instrumentRealization: {},
  },
  additionalProperties: false,
};

export const rootRouteProjectionSchema = {
  $id: "metroplat/executing/root-route-projection",
  title: "RootRouteProjection",
  description: "The admitted result of a settlement-supplied root route projector: a route kind, response face, and optional owning settlement descriptor.",
  type: "object",
  required: ["route", "response"],
  properties: {
    route: {
      enum: [
        "settlement",
        "root-observation",
        "health",
        "openapi",
        "discovery",
        "feed",
        "mcp",
        "mcp-notification",
        "action-form",
        "action-error",
        "not-found",
        "method-not-allowed",
      ],
    },
    response: servedResponseSchema,
    settlement: routeOwnerDescriptorSchema,
  },
  additionalProperties: false,
};

export const routeOwnerDescriptorContract = schemaFrom(routeOwnerDescriptorSchema);
export const rootRouteProjectionContract = schemaFrom(rootRouteProjectionSchema);

/**
 * Pure routed response returned by the serving projection.
 *
 * This is deliberately smaller than a live HTTP response: the router
 * computes only status, content type, and body bytes. The `serve*` helpers bind
 * this value to Node's mutable socket API at the edge.
 */

    

/**
 * Pure routed request consumed by the serving projection.
 *
 * `accept` drives corner-aware content negotiation when no explicit
 * `output-format` is selected; absent, the action's declared output is served.
 * This keeps the core router testable without an HTTP listener while still
 * preserving the one header that changes the representation face.
 */

/**
 * Options shared by pure routing and live HTTP bindings.
 *
 * Dispatch options flow through unchanged, so a routed HTTP/MCP/form call can be
 * admitted to the same append-only journal as CLI dispatch. The extra fields
 * affect only mounted paths and generated descriptive documents.
 */

function arrivalJson(receipt) {
  return {
    status: receipt.ok ? 202 : 422,
    type: "application/json; charset=utf-8",
    body: `${canonicalJson(receipt)}\n`,
    arrival: receipt,
  };
}

export function admitServedRequestArrival(
  request,
  options,
  path,
) {
  const at = options.now();
  try {
    return options.onArrival(transportCloudEvent("http", Object.freeze({
      kind: "metroplat.http.arrival-material",
      method: request.method,
      path: request.path,
      routedPath: path,
      query: request.query,
      body: request.body,
      ...(request.accept === undefined ? {} : { accept: request.accept }),
      ...(request.lastEventId === undefined ? {} : { lastEventId: request.lastEventId }),
    }), at, Object.freeze({
      kind: "metroplat.generated-endpoint-readout-reference",
      transport: "http",
      path,
      method: request.method,
    })));
  } catch (error) {
    return { status: 500, type: "text/plain; charset=utf-8", body: `arrival admission failed: ${error instanceof Error ? error.message : String(error)}\n` };
  }
}

function admitMcpArrival(
  induced,
  message,
  options,
  transport,
) {
  const record = typeof message === "object" && message !== null && !Array.isArray(message) ? message : undefined;
  const id = record?.["id"];
  const method = typeof record?.["method"] === "string" ? record["method"] : "invalid";
  const at = options.now();
  try {
    const arrivalTransport = options.arrivalTransport ?? transport;
    const receipt = options.onArrival(transportCloudEvent(arrivalTransport, Object.freeze({
      kind: "metroplat.mcp.arrival-material",
      message: requireJsonValue(message, "mcp arrival message"),
    }), at, Object.freeze({
      kind: "metroplat.generated-endpoint-readout-reference",
      transport: arrivalTransport,
      path: "/mcp",
      verb: method,
    })));
    return Object.freeze({ receipt });
  } catch (error) {
    return Object.freeze(id === undefined ? {} : { error: mcpError(id, -32603, `arrival admission failed: ${error instanceof Error ? error.message : String(error)}`, induced, options, method) });
  }
}

/**
 * Route-output class observed at the HTTP boundary of an induced apex.
 *
 * Actions, resources, and prompts have their own specialized contracts. These
 * names cover the generated HTTP/MCP route documents and transport envelopes
 * that are projected from the same apex but are not themselves operation bodies.
 */

/**
 * MCP list face projected from an induced package apex.
 *
 * These are not free descriptor arrays. Each kind names a boundary observation
 * whose descriptor set must be admitted as material from the apex, exposed
 * through its list lens and governed by the boundary evidence policy.
 */

/**
 * MCP control/error face projected from an induced package apex.
 *
 * `initialize`, `ping`, generated JSON-RPC errors, and MCP tool-result errors
 * are boundary-only moves: they expose protocol envelope material but do not
 * execute an action, read a resource, or compose a prompt. The contract records
 * that narrower phase and lens instead of letting those envelopes remain
 * unlensed transport output.
 */

/** Project a value to a JSON routed response. */
/** Project HTML text to a routed response. */
/** Project plain text to a routed response. */
/**
 * Content-negotiate the root settlement route: `Accept: text/html` gets a
 * generated operations index (the same program-surface, projected through
 * `programIndexHtml` instead of the site's own JSON surface); everything else
 * — including no `Accept` header at all — keeps the site's JSON response,
 * so agent/curl callers see no change. Only the root's own "settlement" route
 * kind negotiates; a root POST (`root-observation`) and every other route
 * keep serving whatever their projector already decided.
 */
function negotiatedRootResponse(projected, induced, request, base) {
  if (projected.route !== "settlement" || request.method !== "GET") return projected.response;
  return negotiateType(request.accept, ["application/json", "text/html"]) === "text/html"
    ? html(programIndexHtml(induced.discovery, base, operationsManifoldOf(induced.discovery)))
    : projected.response;
}

/**
 * When a POST/GET carries the `form` wire against an endpoint with a declared
 * domain schema, decode name-path form entries into the object shape the
 * schema describes (numbers/booleans/enums coerced, nested objects rebuilt
 * from dotted paths) and hand dispatch plain JSON instead. Untouched when no
 * domain schema is declared, or the schema does not resolve to a walkable
 * object shape — those requests keep the flat-string `form` wire dispatch
 * already used for simple input objects.
 */
function schemaFormDecoded(endpoint, stdin, inName) {
  if (inName !== "form") return { stdin, inName };
  const decoded = decodeSchemaFormEntries(endpoint.domainSchema, stdin);
  return decoded === undefined ? { stdin, inName } : { stdin: JSON.stringify(decoded), inName: "json" };
}

function dispatchObservation(result) {
  void result;
  return {};
}

function rootRouteProjection(value) {
  const settlement = value.settlement === undefined
    ? undefined
    : routeOwnerDescriptorContract.assert(value.settlement, "root route settlement descriptor");
  return rootRouteProjectionContract.assert(Object.freeze({
    route: value.route,
    response: value.response,
    ...(settlement === undefined ? {} : { settlement }),
  }), "root route projection");
}

function mcpToolErrorResult(
  induced,
  method,
  result,
  options,
) {
  void induced; void method; void options;
  const text = result.stderr.trim();
  const receipt = result.receipt;
  const reasons = receipt !== undefined && receipt.reasons.length > 0 ? receipt.reasons : [text];
  const refusal = mcpToolRefusal({
    phase: receipt?.phase ?? "input",
    reasons,
    ...(receipt === undefined ? {} : { evidence: receipt.evidence }),
  });
  return mcpToolRefusalResult(text, refusal);
}

function exposeRoute(
  induced,
  request,
  response,
  route,
  options,
  verb,
) {
  void induced; void request; void route; void options; void verb;
  return response;
}

function mcpError(
  id,
  code,
  message,
  induced,
  options,
  method,
) {
  void induced; void options; void method;
  return mcpRpcError(typeof id === "string" || typeof id === "number" ? id : null, code, message);
}

/**
 * Project a package-generated JSON-RPC error as a lensed MCP control/failure boundary.
 *
 * This is for service or route bindings that detect protocol failure before
 * `programMcpHandle` can inspect a method. When an induced apex is known, even
 * parse errors can carry `error.data.exposure` and `error.data.exposureReport`
 * under the same boundary-only control contract as handler-generated failures.
 */
export function mcpProtocolError(
  induced,
  id,
  code,
  message,
  options,
  method,
) {
  return mcpError(id, code, message, induced, options, method);
}

/** The boundary document for an action's input from an MCP `arguments.input`. */
const DIRECT_DISPATCH_VERBS = new Set(["read", "write"]);

function operationPathVerb(path) {
  if (!path.startsWith("/") || path === "/") return undefined;
  return decodeURIComponent(path.replace(/^\//, ""));
}

const programServers = new WeakMap();

/** An induced program surface on the one MCP server: its operations as tools (dispatched through
 *  the projected surface, so witnessing and authorization are the surface's own), resources and prompts. */
function programMcpServer(induced, version) {
  if (!programServers.has(induced)) {
    programServers.set(induced, apexMcpServer({
      name: induced.discovery.package,
      version,
      tools: programMcpToolsWithEndpoints(induced.operations, induced.discovery.programs, induced.discovery.package),
      callTool: async (name, args, context) => {
        const options = context.dispatchOptions;
        const program = induced.discovery.programs.find((bin) => bin.name === name);
        // Arguments are the input of an object-input tool; a lone { input } is still read as the input.
        const wrapped = args !== null && typeof args === "object" && Object.keys(args).length === 1 && Object.hasOwn(args, "input") && program?.domainSchema?.properties?.input === undefined;
        const input = toolTakesArguments(program?.domainSchema) && !wrapped ? args : args?.input;
        const result = await dispatchProjectedSurface(induced, [name], stdinOf(input ?? {}), options);
        if (result.code !== 0) return mcpToolErrorResult(induced, "tools/call", result, options);
        const endpoint = induced.discovery.programs.find((bin) => bin.name === name);
        const act = induced.operations.find((operation) => operation.verb === name);
        const declaresOutput = endpoint?.codomainSchema !== undefined || act?.codomain !== undefined;
        const text = endpoint !== undefined && endpoint.settlement.finality !== "normal-form"
          ? JSON.stringify(partialObservation(endpoint, result.stdout, options.basePath ?? ""), null, 2)
          : result.stdout.trim();
        return { content: [{ type: "text", text }], ...(declaresOutput ? { structuredContent: parseOutput(result.stdout) } : {}) };
      },
      resources: programMcpResources(induced),
      readResource: (uri) => {
        const resource = induced.resources.find((candidate) => candidate.uri === uri);
        return resource === undefined ? undefined : { mimeType: resource.mimeType, text: resource.read() };
      },
      prompts: programMcpPrompts(induced),
      getPrompt: (name, args) => {
        const prompt = induced.prompts.find((candidate) => candidate.name === name);
        return { ...(prompt.description === undefined ? {} : { description: prompt.description }), messages: prompt.compose(promptArguments(args)) };
      },
    }));
  }
  return programServers.get(induced);
}

/** The account a trusted gateway names for one call (`params._meta["metroplat/subject"]`). Only a
 *  process started behind a gateway (`options.gatewaySubjects`) honors it; otherwise the process
 *  subject stands. */
export function gatewaySubject(message, options) {
  if (options.gatewaySubjects !== true) return undefined;
  const subject = message?.params?._meta?.["metroplat/subject"];
  return typeof subject === "string" && subject.trim() !== "" ? subject : undefined;
}

/** The hand a trusted gateway names for one call (`params._meta["metroplat/session"]`): the harness
 *  session's connection, or the digest of the credential it presented (`mcp-token:<digest>`) where the
 *  entrance keeps no sessions (organizing agency cast: an account or session is only a hand; the bearer
 *  is read off it). Honored only behind a gateway, as the subject is. */
export function gatewayHand(message, options) {
  if (options.gatewaySubjects !== true) return undefined;
  const session = message?.params?._meta?.["metroplat/session"];
  if (typeof session !== "string" || session.trim() === "") return undefined;
  // A harness's own session is the account its SessionStart tells as its character's hand (`session:<id>`).
  if (session.startsWith("harness:")) return `session:${session.slice("harness:".length)}`;
  return session.startsWith("token:") ? `mcp-${session}` : `mcp-session:${session}`;
}

/** One MCP JSON-RPC message against an induced program surface: admitted as an arrival first, whose
 *  receipt is the cause of whatever the message dispatches. Notifications answer undefined. */
export async function programMcpHandle(induced, message, options) {
  const arrival = admitMcpArrival(induced, message, options, "mcp-http");
  if (arrival.error !== undefined) return arrival.error;
  const received = arrival.receipt === undefined ? options : {
    ...options,
    request: arrival.receipt.cloudEventIdentity,
    causes: arrival.receipt.admission?.statements?.map((statement) => statement.id) ?? [],
  };
  const hand = gatewayHand(message, options);
  const dispatchOptions = { ...received, subject: gatewaySubject(message, options) ?? received.subject,
    ...(hand === undefined ? {} : { caller: Object.freeze({ ...(received.caller ?? {}), hand }) }) };
  const answer = await programMcpServer(induced, options.version ?? "0.1.0").handleMessage(message, { dispatchOptions });
  return answer ?? undefined;
}

/** The Scott transport route: `GET /feed` streams path-addressed statement material as resumable SSE. */
function feedRoute(request, options) {
  const observation = options.journalFeed === undefined
    ? feedResponse([], request.lastEventId)
    : options.journalFeed(request.lastEventId);
  const { ["content-type"]: contentType = "text/event-stream; charset=utf-8", ...headers } = observation.response.headers;
  return {
    status: observation.response.status,
    type: contentType,
    headers,
    body: observation.response.body,
  };
}

function parseOutput(stdout) {
  try {
    return parseJson(stdout);
  } catch {
    return stdout;
  }
}

function partialObservation(endpoint, stdout, base) {
  return {
    kind: "metroplat.action.partial-settlement",
    final: false,
    regime: endpoint.settlement.regime,
    transport: endpoint.settlement.transport,
    partial: parseOutput(stdout),
    continuation: continuationHandle(endpoint, base),
  };
}

/** A site result is approximated by its settlement's stages (SignCraft settles it; the web server does not). */
const approximateSite = (value) => value?.kind === "signgraph.site" ? settleSite(freeSite(value)).stages : [value];

function operationEventStreamResponse(endpoint, result, request) {
  const chain = approximationChain(result.stdout, approximateSite);
  const from = eventIndexAfter(request.lastEventId);
  const frames = chain.slice(from).map((partial, offset) =>
    sseFrame("approximation", {
      kind: "metroplat.action.approximation",
      regime: endpoint.settlement.regime,
      final: false,
      partial,
    }, String(from + offset))).join("");
  return {
    status: 200,
    type: "text/event-stream; charset=utf-8",
    headers: { "cache-control": "no-cache", connection: "keep-alive" },
    body: frames,
    ...dispatchObservation(result),
  };
}

function parseMcpRequestBody(body) {
  return parseJson(body);
}

function mcpParseErrorResponse(induced, request, error, options) {
  const message = error instanceof Error ? error.message : "parse error";
  return exposeRoute(induced, request, json(mcpProtocolError(induced, null, -32700, message, options), 200), "mcp", options);
}

function mcpRequestId(message) {
  return typeof message === "object" && message !== null && "id" in (message)
    ? (message).id
    : null;
}

/**
 * Last-resort guard around `programMcpHandle`'s dispatch: any error that
 * escapes its own boundary handling (not only an unaddressable receipt,
 * already refused earlier in `dispatch`) must become a JSON-RPC error
 * response, never an unhandled rejection that kills the serving process.
 * Logged once to stderr; the caller-facing response carries the error's
 * message only, no stack.
 */
function mcpDispatchFailureResponse(
  induced,
  request,
  message,
  error,
  options,
) {
  const failureMessage = error instanceof Error ? error.message : String(error);
  writeProcessStderr(`metroplat mcp dispatch failed: ${failureMessage}\n`);
  return exposeRoute(induced, request, json(mcpProtocolError(induced, mcpRequestId(message), -32603, failureMessage, options), 200), "mcp", options);
}

export async function routeRequest(induced, request, options) {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p) => decodeURIComponent(p.replace(/^\//, ""));
  const directVerb = operationPathVerb(path);
  const directOperation = directVerb !== undefined && DIRECT_DISPATCH_VERBS.has(directVerb);
  const suppliedArrival = request.method === "POST" && path === "/arrivals";
  const mcpMethodNotAllowed = path === "/mcp" && (request.method === "GET" || request.method === "DELETE");
  const arrival = (request.method === "POST" && (path === "/mcp" || directOperation || suppliedArrival)) || mcpMethodNotAllowed
    ? undefined
    : admitServedRequestArrival(request, options, path);
  if (arrival !== undefined && "status" in arrival) return arrival;
  const arrivalReceipt = arrival;
  const dispatchOptions = arrivalReceipt === undefined || "status" in arrivalReceipt
    ? options
    : {
        ...options,
        request: arrivalReceipt.cloudEventIdentity,
        causes: arrivalReceipt.admission?.statements?.map((statement) => statement.id) ?? [],
      };
  if (arrivalReceipt !== undefined && request.method !== "GET" && (path === "" || path === "/")) return arrivalJson(arrivalReceipt);

  const rootRoute = options.rootRoute?.({ induced, request, path, basePath: base, options });
  if (rootRoute !== undefined) {
    const projected = rootRouteProjection(rootRoute);
    const response = negotiatedRootResponse(projected, induced, request, base);
    return exposeRoute(induced, request, response, projected.route, { ...options, routeOwner: projected.settlement ?? options.routeOwner });
  }
  if (request.method === "GET" && (path === "" || path === "/")) {
    const response = negotiateType(request.accept, ["text/html", "application/json"]) === "application/json"
      ? json(induced.discovery)
      : html(programIndexHtml(induced.discovery, base, operationsManifoldOf(induced.discovery)));
    return exposeRoute(induced, request, response, "settlement", options);
  }
  if (request.method === "GET" && path === "/health") return exposeRoute(induced, request, json({ status: "ok", package: induced.discovery.package }), "health", options);
  if (request.method === "GET" && path === "/openapi.json") return exposeRoute(induced, request, json(programOpenApi(induced, options)), "openapi", options);
  if (request.method === "GET" && path === "/operations-manifold") return exposeRoute(induced, request, json(operationsManifoldOf(induced.discovery)), "operations-manifold", options);
  if (request.method === "GET" && path === "/discovery") return exposeRoute(induced, request, json(induced.discovery), "discovery", options);
  if (request.method === "GET" && path === "/feed") return exposeRoute(induced, request, feedRoute(request, options), "feed", options);

  if (suppliedArrival) {
    try {
      return arrivalJson(options.onArrival(parseJson(request.body)));
    } catch (error) {
      return exposeRoute(induced, request, text(`arrival admission failed: ${error instanceof Error ? error.message : String(error)}\n`, 422), "arrival", options);
    }
  }

  if (mcpMethodNotAllowed) {
    const refusal = mcpToolRefusal({
      phase: "transport",
      reasons: [`${request.method} /mcp is not offered: this endpoint accepts only POST for the MCP streamable HTTP transport (no server-initiated GET SSE stream)`],
    });
    return exposeRoute(induced, request, { ...json(refusal, 405), headers: { Allow: "POST" } }, "method-not-allowed", options);
  }

  if (request.method === "POST" && path === "/mcp") {
    let message;
    try {
      message = parseMcpRequestBody(request.body);
    } catch (error) {
      return mcpParseErrorResponse(induced, request, error, options);
    }
    let response;
    try {
      response = await programMcpHandle(induced, message, options);
    } catch (error) {
      return mcpDispatchFailureResponse(induced, request, message, error, options);
    }
    return response === undefined
      ? exposeRoute(induced, request, { status: 202, type: "application/json; charset=utf-8", body: "" }, "mcp-notification", options)
      : exposeRoute(induced, request, json(response), "mcp", options);
  }

  const verb = verbOf(path);
  const endpoint = induced.discovery.programs.find((bin) => bin.name === verb);
  if (endpoint === undefined) return exposeRoute(induced, request, text(`no such operation: ${verb}\n`, 404), "not-found", options, verb);

  const outName = request.query["output-format"];
  const inputFields = Object.entries(request.query).filter(([key]) => key !== "input-format" && key !== "output-format" && key !== "transport");
  if (request.method === "GET" && inputFields.length === 0) return exposeRoute(induced, request, html(programFormHtml(endpoint, base)), "action-form", options, verb);

  if (request.method === "GET" || request.method === "POST") {
    let stdin;
    let inName;
    if (inputFields.length > 0) {
      stdin = new URLSearchParams(inputFields).toString();
      inName = request.query["input-format"] ?? "form";
    } else {
      stdin = request.body.startsWith("body=") ? decodeURIComponent(request.body.slice(5).replace(/\+/g, " ")) : request.body;
      inName = request.query["input-format"];
    }
    const negotiated = negotiateOutputWire(endpoint, outName, request.accept);
    const argv = [verb, ...(inName ? ["--input-format", inName] : []), ...(negotiated.name ? ["--output-format", negotiated.name] : [])];
    const result = await dispatchProjectedSurface(induced, argv, stdin, dispatchOptions);
    if (result.code !== 0) return exposeRoute(induced, request, text(result.stderr, result.code === 2 ? 400 : 422), "action-error", options, verb);
    if (endpoint.settlement.finality !== "normal-form") {
      if (endpoint.settlement.transport === "event-stream" && wantsEventStream(request)) {
        return operationEventStreamResponse(endpoint, result, request);
      }
      return { ...json(partialObservation(endpoint, result.stdout, base)), ...dispatchObservation(result) };
    }
    return { status: 200, type: negotiated.mediaType, body: result.stdout, ...dispatchObservation(result) };
  }

  return exposeRoute(induced, request, text("method not allowed\n", 405), "method-not-allowed", options, verb);
}

/**
 * SchemaContract `$id`s emitted by a mounted package's operations.
 *
 * These are codomain refs, the local outputs a downstream module may consume.
 */
export function producedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) if (act.codomain !== undefined) ids.add(act.codomain.id);
  return ids;
}

/**
 * SchemaContract `$id`s admitted by a mounted package's operations.
 *
 * These are domain refs, the local inputs an upstream module may produce.
 */
export function consumedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) if (act.domain !== undefined) ids.add(act.domain.id);
  return ids;
}

/**
 * Test whether package `a` can feed package `b` as a schema-boundary candidate.
 *
 * This is the package-mounting frontier test: an edge exists when a produced
 * schema `$id` equals a consumed schema `$id`. Local action manifolds carry
 * the stronger Hoare Q=>P report when both endpoint contracts are available.
 */
