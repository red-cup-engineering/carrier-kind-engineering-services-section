
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Live Node execution of pure HTTP Resource surfaces.
 */

import { admitServedRequestArrival, type ServedResponse, type ServeOptions } from "../../../presentation/serving.mts";
import { processMillisNow } from "@red-cup-engineering/node-process-services-section";
import {
  httpMiddlewareDecision,
  matchHttpResource,
  observeHttpMiddlewareExecution,
  observeHttpResourceMatch,
  semanticWebsiteStructuredDataResources,
  servedResponseFromRepr,
  type App,
  type Context,
  type HandlerResult,
  type Repr,
  type RequestTraceEntry,
  type Resource,
  type StructuredDataResourceSource,
} from "../../../integrations/http/index.mts";

export interface HttpResourceServiceOptions {
  readonly resources?: readonly Resource[] | undefined;
  readonly structuredData?: StructuredDataResourceSource | undefined;
}

export function httpResources(options: HttpResourceServiceOptions): readonly Resource[] {
  return Object.freeze([
    ...(options.resources ?? []),
    ...(options.structuredData === undefined ? [] : semanticWebsiteStructuredDataResources(options.structuredData)),
  ]);
}

function traceWith(ctx: Context, entries: readonly RequestTraceEntry[]): Context {
  if (entries.length === 0) return ctx;
  return {
    ...ctx,
    trace: Object.freeze({
      ...ctx.trace,
      entries: Object.freeze([...ctx.trace.entries, ...entries]),
    }),
  };
}

function traceEntry(e: unknown, a: string, v: unknown): RequestTraceEntry {
  return Object.freeze({ e, a, v, t: processMillisNow() });
}

function middlewareObservationEntry(
  ctx: Context,
  index: number,
  decision: "continue" | "append-trace" | "respond" | "stop",
  traceEntries: number,
): RequestTraceEntry {
  const observation = observeHttpMiddlewareExecution(decision);
  return traceEntry(ctx.routeId ?? ctx.routeName ?? ctx.route ?? "http.middleware", "execute-resource-middleware", observation);
}

type ResourceMiddlewareRun = Readonly<{
  ctx: Context;
  result?: HandlerResult;
  stopped: boolean;
}>;

async function runResourceMiddlewares(ctx: Context): Promise<ResourceMiddlewareRun> {
  let current = ctx;
  const middlewares = ctx.resource?.middlewares ?? [];
  for (let index = 0; index < middlewares.length; index += 1) {
    const middleware = middlewares[index];
    if (middleware === undefined) continue;
    const result = await middleware(current);
    const decision = httpMiddlewareDecision(result);
    const returnedTraceEntries = Array.isArray(result) ? result : [];
    const observation = middlewareObservationEntry(current, index, decision, returnedTraceEntries.length);
    current = traceWith(current, [...returnedTraceEntries, observation]);
    if (decision === "stop") return { ctx: current, stopped: true };
    if (decision === "respond") return { ctx: current, result: result as HandlerResult, stopped: false };
  }
  return { ctx: current, stopped: false };
}

function resourceContext(req: IncomingMessage, res: ServerResponse, app: App, path: string): Context {
  const url = new URL(req.url ?? "/", "http://localhost");
  return {
    req,
    res,
    app,
    url,
    params: Object.freeze({}),
    locals: {},
    nonce: "",
    signal: new AbortController().signal,
    trace: Object.freeze({ kind: "web-server.request-trace" as const, id: `http:${path}`, entries: Object.freeze([]) }),
    startedAt: processMillisNow(),
  };
}

async function reprResponse(repr: Repr, method: string): Promise<ServedResponse> {
  return servedResponseFromRepr(repr, method);
}

export async function routeHttpResource(
  resources: readonly Resource[],
  req: IncomingMessage,
  res: ServerResponse,
  options: ServeOptions,
): Promise<ServedResponse | undefined> {
  if (resources.length === 0) return undefined;
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  const app: App = { resources };
  for (const resource of resources) {
    const ctx = resourceContext(req, res, app, path);
    const match = matchHttpResource(resource, path, method, ctx);
    const matchObservation = observeHttpResourceMatch(match);
    if (!match.matched) continue;
    const arrival = admitServedRequestArrival({
      method,
      path,
      query: Object.freeze(Object.fromEntries(url.searchParams)),
      body: "",
      ...(req.headers.accept === undefined ? {} : { accept: req.headers.accept }),
      ...(req.headers["last-event-id"] === undefined ? {} : { lastEventId: String(req.headers["last-event-id"]) }),
    }, options, path);
    if (arrival !== undefined && "status" in arrival) return arrival;
    const routedCtx: Context = {
      ...ctx,
      params: match.params,
      resource,
      ...(resource.route === undefined ? {} : { route: resource.route }),
      matchedRoute: match.route ?? path,
      ...(resource.id === undefined ? {} : { routeId: resource.id }),
      ...(resource.name === undefined ? {} : { routeName: resource.name }),
      trace: Object.freeze({
        ...ctx.trace,
        entries: Object.freeze([
          ...ctx.trace.entries,
          traceEntry(match.resourceId ?? match.resourceName ?? match.route ?? "http.resource", "match-http-resource", matchObservation),
        ]),
      }),
    };
    const middlewareRun = await runResourceMiddlewares(routedCtx);
    if (middlewareRun.stopped) return undefined;
    const result = middlewareRun.result === undefined ? await resource.handler(middlewareRun.ctx) : middlewareRun.result;
    if (result === undefined || result === null) return undefined;
    if (result instanceof Response) {
      const headers: Record<string, string> = {};
      result.headers.forEach((value, key) => { headers[key] = value; });
      const type = headers["content-type"] ?? "application/octet-stream";
      delete headers["content-type"];
      return { status: result.status, type, headers, body: method === "HEAD" ? "" : await result.text() };
    }
    return reprResponse(result, method);
  }
  return undefined;
}
