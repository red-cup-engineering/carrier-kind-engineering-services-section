
import {
  httpAppSurfaceContract,
  httpResourceDescriptorContract,
  httpResourceMatchContract,
  type HttpAppSurface,
  type HttpResourceDescriptor,
  type HttpResourceMatch,
} from "./schema.mts";
import { uniqueSortedStrings } from "../../lib/values/unique-sorted-strings.mts";
import type { HandlerResult } from "./representation.mts";

export type {
  HttpAppSurface,
  HttpResourceDescriptor,
  HttpResourceMatch,
} from "./schema.mts";

export type RequestTraceEntry = Readonly<{
  e: unknown;
  a: string;
  v: unknown;
  t: unknown;
}>;

export type RequestTrace = Readonly<{
  kind: "web-server.request-trace";
  id: string;
  entries: readonly RequestTraceEntry[];
}>;

/** Resource handler over a fully matched request context. */
export type Handler = (ctx: Context) => HandlerResult | Promise<HandlerResult>;

/** Middleware can append trace rows, continue routing, or return a response. */
export type Middleware = (ctx: Context) => MiddlewareResult | Promise<MiddlewareResult>;
export type MiddlewareResult = RequestTraceEntry[] | boolean | HandlerResult;

/** Route-shaped resource descriptor for the small HTTP app object language. */
export type Resource = {
  match: string | RegExp | ((path: string, ctx: Context) => boolean | Record<string, string> | null | undefined);
  route?: string;
  id?: string;
  name?: string;
  methods?: readonly string[];
  produces?: readonly string[];
  languages?: readonly string[];
  middlewares?: readonly Middleware[];
  handler: Handler;
};

/** Per-request context passed to middleware and handlers after route matching. */
export type Context = {
  req: unknown;
  res: unknown;
  app: App;
  url: URL;
  params: Readonly<Record<string, string>>;
  locals: Record<string, unknown>;
  nonce: string;
  negotiatedType?: string;
  negotiatedLanguage?: string;
  resource?: Resource;
  route?: string;
  routeTemplate?: string;
  matchedRoute?: string;
  routeId?: string;
  routeName?: string;
  signal: AbortSignal;
  trace: RequestTrace;
  startedAt: number;
};

/** Data description of the constructed small HTTP app object language. */
export type App = {
  resources?: readonly Resource[];
};

function matchKind(match: Resource["match"]): HttpResourceDescriptor["match"] {
  if (typeof match === "string") return "string";
  if (match instanceof RegExp) return "regexp";
  return "function";
}

/** Read a live HTTP resource as finite descriptor material without serializing its handler. */
export function describeHttpResource(resource: Resource): HttpResourceDescriptor {
  return httpResourceDescriptorContract.assert(Object.freeze({
    kind: "metroplat.http.resource-descriptor" as const,
    ...(resource.id === undefined ? {} : { id: resource.id }),
    ...(resource.name === undefined ? {} : { name: resource.name }),
    ...(resource.route === undefined ? {} : { route: resource.route }),
    match: matchKind(resource.match),
    methods: Object.freeze([...(resource.methods ?? ["GET", "HEAD"])]),
    produces: Object.freeze([...(resource.produces ?? [])]),
    languages: Object.freeze([...(resource.languages ?? [])]),
    middlewareCount: resource.middlewares?.length ?? 0,
    hasHandler: typeof resource.handler === "function",
  }), "HTTP resource descriptor") as HttpResourceDescriptor;
}

/** Read the constructed HTTP app resource surface as package-owned descriptor material. */
export function describeHttpAppSurface(app: App): HttpAppSurface {
  const resources = Object.freeze((app.resources ?? []).map(describeHttpResource));
  return httpAppSurfaceContract.assert(Object.freeze({
    kind: "metroplat.http.app-surface" as const,
    resources,
    resourceCount: resources.length,
    methods: uniqueSortedStrings(resources.flatMap((resource) => [...resource.methods])),
    produces: uniqueSortedStrings(resources.flatMap((resource) => [...resource.produces])),
    runnable: resources.every((resource) => resource.hasHandler),
  }), "HTTP app surface") as HttpAppSurface;
}

export function matchHttpResource(resource: Resource, path: string, method: string, ctx: Context): HttpResourceMatch {
  const methodAllowed = (resource.methods ?? ["GET", "HEAD"]).includes(method);
  if (!methodAllowed) {
    return httpResourceMatchContract.assert(Object.freeze({
      kind: "metroplat.http.resource-match" as const,
      operation: "match-http-resource" as const,
      path,
      method,
      methodAllowed,
      matched: false,
      params: Object.freeze({}),
      ...(resource.route === undefined ? {} : { route: resource.route }),
      ...(resource.id === undefined ? {} : { resourceId: resource.id }),
      ...(resource.name === undefined ? {} : { resourceName: resource.name }),
    }), "HTTP resource match") as HttpResourceMatch;
  }

  const match = resource.match;
  let params: Readonly<Record<string, string>> | undefined;
  if (typeof match === "string") params = match === path ? Object.freeze({}) : undefined;
  else if (match instanceof RegExp) {
    const found = match.exec(path);
    params = found === null ? undefined : Object.freeze({ ...(found.groups ?? {}) });
  } else {
    const out = match(path, ctx);
    if (out === true) params = Object.freeze({});
    else if (out === false || out === null || out === undefined) params = undefined;
    else params = Object.freeze({ ...out });
  }

  return httpResourceMatchContract.assert(Object.freeze({
    kind: "metroplat.http.resource-match" as const,
    operation: "match-http-resource" as const,
    path,
    method,
    methodAllowed,
    matched: params !== undefined,
    params: params ?? Object.freeze({}),
    ...(resource.route === undefined ? {} : { route: resource.route }),
    ...(resource.id === undefined ? {} : { resourceId: resource.id }),
    ...(resource.name === undefined ? {} : { resourceName: resource.name }),
  }), "HTTP resource match") as HttpResourceMatch;
}
