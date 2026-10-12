/**
 * api/serving — the four transports as functorial images of the apex.
 *
 * `projectSurface` gives one `ProjectedSurface` apex (the coproduct apex of a module's
 * operations). This module projects it, with no second ontology, to:
 *   - CLI         — `dispatch` (elsewhere; the `infograph` bin)
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
import { wireCodec, wireByMediaType, WIRE_CODEC_NAMES } from "../lib/codecs/wire/index.mts";
import { canonicalBytes } from "../lib/identity/index.mts";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { mediaTypeCorner, negotiateRepresentation, negotiateType } from "../integrations/http/codec/negotiation/index.mts";
import { mcpOk, mcpRpcError } from "@red-cup-engineering/mcp-tool-server";
import { mcpToolRefusal, mcpToolRefusalResult } from "../integrations/mcp/index.mts";
import { parse as parseJson, requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  programMcpPrompts,
  programMcpResources,
  programMcpToolsWithEndpoints,
  programOpenApi,
} from "./program-surface.mts";
import {
  programFormHtml,
  programIndexHtml,
  decodeSchemaFormEntries,
} from "../integrations/http/program-html.mts";
import { operationsManifoldOf } from "./manifold.mts";
import { projectionSegmentKey } from "../lib/codecs/javascript/segment-key.mts";
import type { ProgramEndpoint, ProjectedSurface } from "./surface.mts";
import { dispatchProjectedSurface, type DispatchOptions, type DispatchResult } from "../integrations/cli/dispatch.mts";
import { transportCloudEvent, type ArrivalAdmissionHook, type ArrivalReceipt, type ArrivalTransport } from "../rpc/index.mts";
import { feedResponse, type FeedResponseObservation } from "../integrations/http/artifacts-stream.mts";
import { sseFrame } from "../integrations/http/codec/sse/index.mts";
import { freeSettlementFiltration, type SettlementFiltrationGenerators } from "../lib/settling.mts";
import type { Settlement } from "@lenticule-science/metrologic/settling/settlement";
import { writeProcessStderr } from "@red-cup-engineering/node-process-services-section";

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
} as const;

/** The route owner carried by root-route projections. */
export interface RouteOwnerDescriptor {
  readonly id: string;
  readonly path: string;
}

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
} as const;

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
} as const;

export const routeOwnerDescriptorContract = schemaFrom(routeOwnerDescriptorSchema);
export const rootRouteProjectionContract = schemaFrom(rootRouteProjectionSchema);

/**
 * Pure routed response returned by the serving projection.
 *
 * This is deliberately smaller than a live HTTP response: the router
 * computes only status, content type, and body bytes. The `serve*` helpers bind
 * this value to Node's mutable socket API at the edge.
 */
export interface ServedResponse {
  /** HTTP status code to write at the binding boundary. */
  readonly status: number;
  /** Full response media type, usually including `charset=utf-8`. */
  readonly type: string;
  /** Serialized response body. */
  readonly body: string;
  /** Extra response headers (e.g. SSE `cache-control`/`connection`); merged after `type`. */
  readonly headers?: Readonly<Record<string, string>> | undefined;
  /** Full action-contract Hoare outcome for routed action output. */
  /** Decidable report that the operation outcome satisfies Γ ⊨ {P} m {Q}. */
  /** Full action-instrument Hoare outcome for routed action output. */
  /** Decidable report for the operation-derived instrument outcome. */
  /** Runtime realization report for the configured operation instrument. */
  /** Arrival receipt when this request was admitted instead of executed directly. */
  readonly arrival?: ArrivalReceipt;
}

/**
 * Pure routed request consumed by the serving projection.
 *
 * `accept` drives corner-aware content negotiation when no explicit
 * `output-format` is selected; absent, the action's declared output is served.
 * This keeps the core router testable without an HTTP listener while still
 * preserving the one header that changes the representation face.
 */
export interface ServedRequest {
  /** HTTP method as observed by the binding. */
  readonly method: string;
  /** URL pathname, optionally including the configured `basePath`. */
  readonly path: string;
  /** Query parameters flattened to the last string value per key. */
  readonly query: Readonly<Record<string, string>>;
  /** Request body already decoded as UTF-8 text by the binding. */
  readonly body: string;
  /** Optional HTTP `Accept` header used for representation negotiation. */
  readonly accept?: string | undefined;
  /** Optional `Last-Event-ID` for resuming the SSE feed from the next row. */
  readonly lastEventId?: string | undefined;
  /** Stable caller request key used to resume an idempotent governed execution. */
  readonly idempotencyKey?: string | undefined;
}

export interface RootRouteProjection {
  readonly route: RouteObservationKind;
  readonly response: ServedResponse;
  readonly settlement?: RouteOwnerDescriptor | undefined;
}

export interface RootRouteInput {
  readonly induced: ProjectedSurface;
  readonly request: ServedRequest;
  readonly path: string;
  readonly basePath: string;
  readonly options: ServeOptions;
}

export type RootRouteProjector = (input: RootRouteInput) => RootRouteProjection | undefined;

/**
 * Options shared by pure routing and live HTTP bindings.
 *
 * Dispatch options flow through unchanged, so a routed HTTP/MCP/form call can be
 * admitted to the same append-only journal as CLI dispatch. The extra fields
 * affect only mounted paths and generated descriptive documents.
 */
export interface ServeOptions extends DispatchOptions {
  /** Mandatory raw boundary observation writer for HTTP/MCP/resource traffic. */
  readonly onArrival: ArrivalAdmissionHook;
  /** URL prefix this induced apex is mounted under. */
  readonly basePath?: string;
  /** OpenAPI title; defaults to the induced package name. */
  readonly title?: string;
  /** OpenAPI/MCP server version string; defaults to the package's 0.1 release. */
  readonly version?: string;
  /** Path-first feed responder for the `GET /feed` Scott transport. */
  readonly journalFeed?: ((lastEventId?: string) => FeedResponseObservation) | undefined;
  /** Optional settlement/application route that owns `GET /` and `POST /`. */
  readonly rootRoute?: RootRouteProjector | undefined;
  /** Settlement descriptor used when observing route contracts. */
  readonly routeOwner?: RouteOwnerDescriptor | undefined;
  /** Transport label used when MCP admission is reached from a concrete binding. */
  readonly arrivalTransport?: ArrivalTransport | undefined;
}

function arrivalJson(receipt: ArrivalReceipt): ServedResponse {
  return {
    status: receipt.ok ? 202 : 422,
    type: "application/json; charset=utf-8",
    body: `${canonicalBytes(receipt as unknown as JsonValue)}\n`,
    arrival: receipt,
  };
}

export function admitServedRequestArrival(
  request: ServedRequest,
  options: ServeOptions,
  path: string,
): ArrivalReceipt | ServedResponse | undefined {
  const at = options.now();
  try {
    return options.onArrival(transportCloudEvent("http", Object.freeze({
      kind: "metroplat.http.arrival-material" as const,
      method: request.method,
      path: request.path,
      routedPath: path,
      query: request.query as unknown as JsonValue,
      body: request.body,
      ...(request.accept === undefined ? {} : { accept: request.accept }),
      ...(request.lastEventId === undefined ? {} : { lastEventId: request.lastEventId }),
    }) as JsonValue, at, Object.freeze({
      kind: "metroplat.generated-endpoint-readout-reference" as const,
      transport: "http",
      path,
      method: request.method,
    })));
  } catch (error) {
    return { status: 500, type: "text/plain; charset=utf-8", body: `arrival admission failed: ${error instanceof Error ? error.message : String(error)}\n` };
  }
}

function admitMcpArrival(
  induced: ProjectedSurface,
  message: unknown,
  options: ServeOptions,
  transport: ArrivalTransport,
): Readonly<{ receipt?: ArrivalReceipt; error?: Record<string, unknown> }> {
  const record = typeof message === "object" && message !== null && !Array.isArray(message) ? message as Record<string, unknown> : undefined;
  const id = record?.["id"];
  const method = typeof record?.["method"] === "string" ? record["method"] : "invalid";
  const at = options.now();
  try {
    const arrivalTransport = options.arrivalTransport ?? transport;
    const receipt = options.onArrival(transportCloudEvent(arrivalTransport, Object.freeze({
      kind: "metroplat.mcp.arrival-material" as const,
      message: requireJsonValue(message, "mcp arrival message"),
    }) as JsonValue, at, Object.freeze({
      kind: "metroplat.generated-endpoint-readout-reference" as const,
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
export type RouteObservationKind =
  | "settlement"
  | "root-observation"
  | "health"
  | "openapi"
  | "operations-manifold"
  | "discovery"
  | "feed"
  | "arrival"
  | "mcp"
  | "mcp-notification"
  | "action-form"
  | "action-error"
  | "not-found"
  | "method-not-allowed";

/**
 * MCP list face projected from an induced package apex.
 *
 * These are not free descriptor arrays. Each kind names a boundary observation
 * whose descriptor set must be admitted as material from the apex, exposed
 * through its list lens and governed by the boundary evidence policy.
 */
export type McpListObservationKind = "tools" | "resources" | "prompts";

/**
 * MCP control/error face projected from an induced package apex.
 *
 * `initialize`, `ping`, generated JSON-RPC errors, and MCP tool-result errors
 * are boundary-only moves: they expose protocol envelope material but do not
 * execute an action, read a resource, or compose a prompt. The contract records
 * that narrower phase and lens instead of letting those envelopes remain
 * unlensed transport output.
 */
export type McpControlObservationKind = "initialize" | "ping" | "error" | "tool-error";

/** Project a value to a JSON routed response. */
export const json = (value: unknown, status = 200): ServedResponse => ({ status, type: "application/json; charset=utf-8", body: `${JSON.stringify(value, null, 2)}\n` });
/** Project HTML text to a routed response. */
export const html = (body: string, status = 200): ServedResponse => ({ status, type: "text/html; charset=utf-8", body });
/** Project plain text to a routed response. */
export const text = (body: string, status: number): ServedResponse => ({ status, type: "text/plain; charset=utf-8", body });

/**
 * Content-negotiate the root settlement route: `Accept: text/html` gets a
 * generated operations index (the same program-surface, projected through
 * `programIndexHtml` instead of the site's own JSON surface); everything else
 * — including no `Accept` header at all — keeps the site's JSON response,
 * so agent/curl callers see no change. Only the root's own "settlement" route
 * kind negotiates; a root POST (`root-observation`) and every other route
 * keep serving whatever their projector already decided.
 */
function negotiatedRootResponse(projected: RootRouteProjection, induced: ProjectedSurface, request: ServedRequest, base: string): ServedResponse {
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
function schemaFormDecoded(endpoint: ProgramEndpoint, stdin: string, inName: string | undefined): { readonly stdin: string; readonly inName: string | undefined } {
  if (inName !== "form") return { stdin, inName };
  const decoded = decodeSchemaFormEntries(endpoint.domainSchema, stdin);
  return decoded === undefined ? { stdin, inName } : { stdin: JSON.stringify(decoded), inName: "json" };
}

function dispatchObservation(result: DispatchResult): Partial<ServedResponse> {
  void result;
  return {};
}

function rootRouteProjection(value: RootRouteProjection): RootRouteProjection {
  const settlement = value.settlement === undefined
    ? undefined
    : routeOwnerDescriptorContract.assert(value.settlement, "root route settlement descriptor") as RouteOwnerDescriptor;
  return rootRouteProjectionContract.assert(Object.freeze({
    route: value.route,
    response: value.response,
    ...(settlement === undefined ? {} : { settlement }),
  }), "root route projection") as RootRouteProjection;
}

function mcpListResult(
  induced: ProjectedSurface,
  list: McpListObservationKind,
  descriptors: readonly Record<string, unknown>[],
  options: ServeOptions,
): Record<string, unknown> {
  void induced; void options;
  return { [list]: descriptors };
}

function mcpControlResult(
  induced: ProjectedSurface,
  control: Exclude<McpControlObservationKind, "error">,
  method: string,
  result: Record<string, unknown>,
  options: ServeOptions,
): Record<string, unknown> {
  void induced; void control; void method; void options;
  return { ...result };
}

function mcpToolErrorResult(
  induced: ProjectedSurface,
  method: string,
  result: DispatchResult,
  options: ServeOptions,
): Record<string, unknown> {
  void induced; void method; void options;
  const text = result.stderr.trim();
  const receipt = result.receipt;
  const reasons = receipt !== undefined && receipt.reasons.length > 0 ? receipt.reasons : [text];
  const refusal = mcpToolRefusal({
    phase: receipt?.phase ?? "input",
    reasons,
    ...(receipt === undefined ? {} : { evidence: receipt.evidence }),
  });
  return mcpToolRefusalResult(text, refusal) as unknown as Record<string, unknown>;
}

function exposeRoute(
  induced: ProjectedSurface,
  request: ServedRequest,
  response: ServedResponse,
  route: RouteObservationKind,
  options: ServeOptions,
  verb?: string,
): ServedResponse {
  void induced; void request; void route; void options; void verb;
  return response;
}

/** The content corner the settled value commits to: the corner of the action's
 *  declared output wire. A value crosses the boundary down this corner but never up
 *  — negotiation may settle it to a lower corner, never fabricate a richer one. */
function valueCorner(endpoint: ProgramEndpoint): import("../../../../../../../../../../../../../computer-data-engineering-services-section/services/typed-resource-classification-kernel-service/src/index.mjs").Corner {
  const codec = wireByMediaType(endpoint.output);
  return codec?.corner ?? mediaTypeCorner(endpoint.output);
}

/** Choose the wire to emit a response down, honoring the bilattice asymmetry.
 *
 *  An explicit `output-format` is a NAMED selection and always wins (the caller
 *  asked for that wire by name). Otherwise, when an `Accept` header is present, the
 *  offered wires are negotiated against it BUT restricted to those whose content
 *  corner does not exceed the settled value's: a `data` value may be served as
 *  json but never as turtle/rmn (`assertion`), because that would fabricate
 *  assertivity the value does not carry. With no `Accept` and no explicit format,
 *  the action's declared output is served. Returns the wire NAME for dispatch and
 *  the media type to label the response. */
function negotiateOutputWire(
  endpoint: ProgramEndpoint,
  explicitOutName: string | undefined,
  accept: string | undefined,
): { readonly name: string | undefined; readonly mediaType: string } {
  if (explicitOutName !== undefined) {
    return { name: explicitOutName, mediaType: wireCodec(explicitOutName).mediaType };
  }
  if (accept === undefined || accept.trim() === "") {
    return { name: undefined, mediaType: endpoint.output };
  }
  const offered = WIRE_CODEC_NAMES.map((n) => wireCodec(n).mediaType);
  const chosen = negotiateRepresentation(accept, offered, valueCorner(endpoint));
  if (chosen === null) return { name: undefined, mediaType: endpoint.output };
  const codec = wireByMediaType(chosen);
  // The declared output already matches the negotiated representation: serve it as-is.
  if (codec === undefined || codec.mediaType === endpoint.output) {
    return { name: undefined, mediaType: endpoint.output };
  }
  return { name: codec.name, mediaType: codec.mediaType };
}

function mcpResult(id: unknown, result: unknown): Record<string, unknown> {
  return mcpOk(typeof id === "string" || typeof id === "number" ? id : null, result) as unknown as Record<string, unknown>;
}

function mcpError(
  id: unknown,
  code: number,
  message: string,
  induced?: ProjectedSurface,
  options?: ServeOptions,
  method?: string,
): Record<string, unknown> {
  void induced; void options; void method;
  return mcpRpcError(typeof id === "string" || typeof id === "number" ? id : null, code, message) as unknown as Record<string, unknown>;
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
  induced: ProjectedSurface,
  id: unknown,
  code: number,
  message: string,
  options: ServeOptions,
  method?: string,
): Record<string, unknown> {
  return mcpError(id, code, message, induced, options, method);
}

function promptArguments(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  return out;
}

/** The boundary document for an action's input from an MCP `arguments.input`. */
function stdinOf(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

const DIRECT_DISPATCH_VERBS: ReadonlySet<string> = new Set(["read", "write"]);

function operationPathVerb(path: string): string | undefined {
  if (!path.startsWith("/") || path === "/") return undefined;
  return decodeURIComponent(path.replace(/^\//, ""));
}

/** Handle one MCP JSON-RPC message through the sole asynchronous dispatcher. */
export async function programMcpHandle(induced: ProjectedSurface, message: unknown, options: ServeOptions): Promise<Record<string, unknown> | undefined> {
  const arrival = admitMcpArrival(induced, message, options, "mcp-http");
  if (arrival.error !== undefined) return arrival.error;
  const dispatchOptions: ServeOptions = arrival.receipt === undefined ? options : {
    ...options,
    request: arrival.receipt.cloudEventIdentity,
    causes: arrival.receipt.admission?.statements?.map((statement) => statement.id) ?? [],
  };
  if (typeof message !== "object" || message === null) return mcpError(null, -32600, "invalid request", induced, options);
  const record = message as Record<string, unknown>;
  const id = record["id"];
  const method = record["method"];
  if (record["jsonrpc"] !== "2.0" || typeof method !== "string") return mcpError(id ?? null, -32600, "invalid request", induced, options, typeof method === "string" ? method : undefined);
  if (id === undefined) return undefined;
  if (method === "initialize") {
    return mcpResult(id, mcpControlResult(induced, "initialize", method, { protocolVersion: "2025-06-18", serverInfo: { name: induced.discovery.package, version: options.version ?? "0.1.0" }, capabilities: { tools: {}, resources: {}, prompts: {} } }, options));
  }
  if (method === "ping") return mcpResult(id, mcpControlResult(induced, "ping", method, {}, options));
  if (method === "tools/list") {
    const tools = programMcpToolsWithEndpoints(induced.operations, induced.discovery.programs, induced.discovery.package);
    return mcpResult(id, mcpListResult(induced, "tools", tools, options));
  }
  if (method === "tools/call") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const args = (params["arguments"] ?? {}) as Record<string, unknown>;
    const result = await dispatchProjectedSurface(induced, [name], stdinOf(args["input"]), dispatchOptions);
    if (result.code !== 0) return mcpResult(id, mcpToolErrorResult(induced, method, result, options));
    const endpoint = induced.discovery.programs.find((bin) => bin.name === name);
    const act = induced.operations.find((operation) => operation.verb === name);
    const declaresOutput = endpoint?.codomainSchema !== undefined || act?.codomain !== undefined;
    const text = endpoint !== undefined && endpoint.settlement.regime !== "strict-finite"
      ? JSON.stringify(partialObservation(endpoint, result.stdout, options.basePath ?? ""), null, 2)
      : result.stdout.trim();
    return mcpResult(id, {
      content: [{ type: "text", text }],
      ...(declaresOutput ? { structuredContent: parseOutput(result.stdout) } : {}),
      ...dispatchObservation(result),
    });
  }
  if (method === "resources/list") {
    const resources = programMcpResources(induced);
    return mcpResult(id, mcpListResult(induced, "resources", resources, options));
  }
  if (method === "resources/read") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const uri = String(params["uri"] ?? "");
    const res = induced.resources.find((candidate) => candidate.uri === uri);
    if (res === undefined) return mcpError(id, -32602, `no such resource: ${uri}`, induced, options, method);
    try {
      const text = res.read();
      return mcpResult(id, {
        contents: [{ uri: res.uri, mimeType: res.mimeType, text }],
      });
    } catch (error) {
      return mcpError(id, -32603, `resource read failed: ${error instanceof Error ? error.message : String(error)}`, induced, options, method);
    }
  }
  if (method === "prompts/list") {
    const prompts = programMcpPrompts(induced);
    return mcpResult(id, mcpListResult(induced, "prompts", prompts, options));
  }
  if (method === "prompts/get") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const pr = induced.prompts.find((candidate) => candidate.name === name);
    if (pr === undefined) return mcpError(id, -32602, `no such prompt: ${name}`, induced, options, method);
    try {
      const messages = pr.compose(promptArguments(params["arguments"]));
      return mcpResult(id, {
        ...(pr.description === undefined ? {} : { description: pr.description }),
        messages,
      });
    } catch (error) {
      return mcpError(id, -32603, `prompt compose failed: ${error instanceof Error ? error.message : String(error)}`, induced, options, method);
    }
  }
  return mcpError(id, -32601, "method not found", induced, options, method);
}

/** The Scott transport route: `GET /feed` streams path-addressed statement material as resumable SSE. */
function feedRoute(request: ServedRequest, options: ServeOptions): ServedResponse {
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

function parseOutput(stdout: string): unknown {
  try {
    return parseJson(stdout);
  } catch {
    return stdout;
  }
}

function continuationHandle(endpoint: ProgramEndpoint, base: string): Record<string, unknown> {
  const endpointHref = endpoint.href.startsWith("/") ? endpoint.href : `/${endpoint.href}`;
  const href = base !== "" && endpointHref.startsWith(`${base}/`) ? endpointHref : `${base}${endpointHref}`;
  if (endpoint.settlement.transport === "event-stream") {
    return { kind: "sse", href, cursor: null, lastEventId: null };
  }
  if (endpoint.settlement.transport === "websocket-session") {
    return { kind: "websocket", href, subscriptionUrl: href };
  }
  return { kind: "none" };
}

function partialObservation(endpoint: ProgramEndpoint, stdout: string, base: string): Record<string, unknown> {
  return {
    kind: "metroplat.action.partial-settlement",
    final: false,
    regime: endpoint.settlement.regime,
    closureRegime: endpoint.settlement.closureRegime,
    transport: endpoint.settlement.transport,
    partial: parseOutput(stdout),
    continuation: continuationHandle(endpoint, base),
  };
}

function isSettlementFiltration(value: unknown): value is Settlement {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: unknown }).kind === "predication.settlement.filtration"
    && Array.isArray((value as { readonly stages?: unknown }).stages);
}

function isSettlementFiltrationGenerators(value: unknown): value is SettlementFiltrationGenerators {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: unknown }).kind === "predication.settlement.filtration"
    && Array.isArray((value as { readonly cells?: unknown }).cells)
    && Array.isArray((value as { readonly specializations?: unknown }).specializations);
}

function approximationChain(stdout: string): readonly unknown[] {
  const value = parseOutput(stdout);
  if (isSettlementFiltration(value)) return value.stages;
  if (isSettlementFiltrationGenerators(value)) return freeSettlementFiltration(value).stages;
  return [value];
}

function eventIndexAfter(lastEventId: string | undefined): number {
  if (lastEventId === undefined || lastEventId.trim() === "") return 0;
  const parsed = Number(lastEventId);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed + 1 : 0;
}

function operationEventStreamResponse(endpoint: ProgramEndpoint, result: DispatchResult, request: ServedRequest): ServedResponse {
  const chain = approximationChain(result.stdout);
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

function wantsEventStream(request: ServedRequest): boolean {
  const transport = request.query["transport"];
  return transport === "sse"
    || transport === "event-stream"
    || (request.accept ?? "").split(",").some((part) => part.trim().toLowerCase().startsWith("text/event-stream"));
}

function parseMcpRequestBody(body: string): unknown {
  return parseJson(body);
}

function mcpParseErrorResponse(induced: ProjectedSurface, request: ServedRequest, error: unknown, options: ServeOptions): ServedResponse {
  const message = error instanceof Error ? error.message : "parse error";
  return exposeRoute(induced, request, json(mcpProtocolError(induced, null, -32700, message, options), 200), "mcp", options);
}

function mcpRequestId(message: unknown): unknown {
  return typeof message === "object" && message !== null && "id" in (message as Record<string, unknown>)
    ? (message as Record<string, unknown>).id
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
  induced: ProjectedSurface,
  request: ServedRequest,
  message: unknown,
  error: unknown,
  options: ServeOptions,
): ServedResponse {
  const failureMessage = error instanceof Error ? error.message : String(error);
  writeProcessStderr(`metroplat mcp dispatch failed: ${failureMessage}\n`);
  return exposeRoute(induced, request, json(mcpProtocolError(induced, mcpRequestId(message), -32603, failureMessage, options), 200), "mcp", options);
}

export async function routeRequest(induced: ProjectedSurface, request: ServedRequest, options: ServeOptions): Promise<ServedResponse> {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p: string): string => decodeURIComponent(p.replace(/^\//, ""));
  const directVerb = operationPathVerb(path);
  const directOperation = directVerb !== undefined && DIRECT_DISPATCH_VERBS.has(directVerb);
  const suppliedArrival = request.method === "POST" && path === "/arrivals";
  const mcpMethodNotAllowed = path === "/mcp" && (request.method === "GET" || request.method === "DELETE");
  const arrival = (request.method === "POST" && (path === "/mcp" || directOperation || suppliedArrival)) || mcpMethodNotAllowed
    ? undefined
    : admitServedRequestArrival(request, options, path);
  if (arrival !== undefined && "status" in arrival) return arrival;
  const arrivalReceipt = arrival;
  const dispatchOptions: ServeOptions = arrivalReceipt === undefined || "status" in arrivalReceipt
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
      return arrivalJson(options.onArrival(parseJson(request.body) as Parameters<ArrivalAdmissionHook>[0]));
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
    let message: unknown;
    try {
      message = parseMcpRequestBody(request.body);
    } catch (error) {
      return mcpParseErrorResponse(induced, request, error, options);
    }
    let response: Record<string, unknown> | undefined;
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
    let stdin: string;
    let inName: string | undefined;
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
    if (endpoint.settlement.regime !== "strict-finite") {
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
export function producedIds(induced: ProjectedSurface): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const act of induced.operations) if (act.codomain !== undefined) ids.add(act.codomain.id);
  return ids;
}

/**
 * SchemaContract `$id`s admitted by a mounted package's operations.
 *
 * These are domain refs, the local inputs an upstream module may produce.
 */
export function consumedIds(induced: ProjectedSurface): ReadonlySet<string> {
  const ids = new Set<string>();
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
export function feeds(a: ProjectedSurface, b: ProjectedSurface): boolean {
  const produced = producedIds(a);
  for (const id of consumedIds(b)) if (produced.has(id)) return true;
  return false;
}
