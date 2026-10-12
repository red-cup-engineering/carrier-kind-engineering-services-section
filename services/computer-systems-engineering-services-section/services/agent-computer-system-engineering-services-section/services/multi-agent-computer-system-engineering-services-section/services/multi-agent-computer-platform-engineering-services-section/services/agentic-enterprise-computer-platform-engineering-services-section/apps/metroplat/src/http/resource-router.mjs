

/**
 * Live Node execution of pure HTTP Resource surfaces.
 */

import { admitServedRequestArrival } from "@red-cup-engineering/metroplat/presentation/serving";
import { processMillisNow } from "@red-cup-engineering/node-process-services-section/clock";
import { httpMiddlewareDecision, observeHttpMiddlewareExecution, observeHttpResourceMatch } from "@red-cup-engineering/computer-web-server/platform-http/resource-observation";
import { matchHttpResource } from "@red-cup-engineering/computer-web-server/platform-http/app-surface";
import { servedResponseFromRepr } from "@red-cup-engineering/http-services-section/representation";

export function httpResources(options) {
  return Object.freeze([
    ...(options.resources ?? []),
  ]);
}

function traceWith(ctx, entries) {
  if (entries.length === 0) return ctx;
  return {
    ...ctx,
    trace: Object.freeze({
      ...ctx.trace,
      entries: Object.freeze([...ctx.trace.entries, ...entries]),
    }),
  };
}

function traceEntry(e, a, v) {
  return Object.freeze({ e, a, v, t: processMillisNow() });
}

function middlewareObservationEntry(
  ctx,
  index,
  decision,
  traceEntries,
) {
  const observation = observeHttpMiddlewareExecution(decision);
  return traceEntry(ctx.routeId ?? ctx.routeName ?? ctx.route ?? "http.middleware", "execute-resource-middleware", observation);
}

async function runResourceMiddlewares(ctx) {
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
    if (decision === "respond") return { ctx: current, result: result, stopped: false };
  }
  return { ctx: current, stopped: false };
}

function resourceContext(req, res, app, path) {
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
    trace: Object.freeze({ kind: "web-server.request-trace", id: `http:${path}`, entries: Object.freeze([]) }),
    startedAt: processMillisNow(),
  };
}

async function reprResponse(repr, method) {
  return servedResponseFromRepr(repr, method);
}

export async function routeHttpResource(
  resources,
  req,
  res,
  options,
) {
  if (resources.length === 0) return undefined;
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  const app = { resources };
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
    const routedCtx = {
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
      const headers = {};
      result.headers.forEach((value, key) => { headers[key] = value; });
      const type = headers["content-type"] ?? "application/octet-stream";
      delete headers["content-type"];
      return { status: result.status, type, headers, body: method === "HEAD" ? "" : await result.text() };
    }
    return reprResponse(result, method);
  }
  return undefined;
}
