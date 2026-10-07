// Moved down from computer-web-server (create-application.mjs): a
// higher-level declarative application over createWebServer -- nested
// `applications` composition, one memoized bounded body intake shared by
// hooks and resources, and an optional per-resource request-validation hook
// -- is generic HTTP application shape, not specific to the web server. TUFTE
// (the gui server) needs exactly this and nothing about OpenAPI or
// JSON-schema validation, so this module owns the generic composition and
// takes an optional `validate` capability rather than hard-wiring one.
// computer-web-server's own create-application.mjs now imports this and
// layers its OpenAPI document generation and JSON-schema request validation
// on top, which stay specific to it.
import { BodyReadError, readBody, readTextBody, readJsonBody, readFormDataBody, DEFAULT_BODY_LIMIT } from "./body/web.mjs";
import { createWebServer } from "./web-application.mjs";
import { appendEntries } from "./request-trace.mjs";

function intakeFor(context, options = {}) {
  let encoded;
  const maximum = options.maxEncodedBytes ?? options.maxBytes;
  const intake = {
    read: false,
    inputs: new Map(),
    encoded: () => {
      intake.read = true;
      return encoded ??= readBody(context.request, {
        decodeContentEncoding: false,
        ...maximum !== undefined ? { maxBytes: maximum, maxEncodedBytes: maximum } : {},
      });
    },
  };
  return intake;
}

function inputFor(context, intake, options = {}) {
  const key = JSON.stringify([options.maxBytes ?? null, options.maxEncodedBytes ?? null, options.contentType ?? null, options.contentEncoding ?? null, options.decodeContentEncoding ?? true]);
  const existing = intake.inputs.get(key);
  if (existing) return existing;
  let bytes;
  const requestFor = (body, decoded = false) => {
    const headers = new Headers(context.request.headers);
    headers.delete("content-length");
    if (decoded) headers.delete("content-encoding");
    return new Request(context.request.url, { method: "POST", headers, body, signal: context.signal });
  };
  const collect = () => bytes ??= intake.encoded().then((encoded) => readBody(requestFor(encoded), options));
  const projections = new Map();
  async function project(name, read) {
    let value = projections.get(name);
    if (!value) {
      value = collect().then((body) => read(requestFor(body, true), { ...options, contentEncoding: "identity", decodeContentEncoding: false, maxEncodedBytes: options.maxBytes ?? DEFAULT_BODY_LIMIT }));
      projections.set(name, value);
    }
    return value;
  }
  const input = Object.freeze({
    bytes: async () => (await collect()).slice(),
    text: () => project("text", readTextBody),
    json: () => project("json", readJsonBody),
    formData: () => project("formData", readFormDataBody),
  });
  intake.inputs.set(key, input);
  return input;
}

function compose(spec) {
  const parts = (spec.applications ?? []).map(compose);
  if (!parts.length) return spec;
  const inherited = {};
  for (const key of ["cors", "cacheControl", "security", "problems", "onError", "body"]) {
    if (spec[key] !== undefined) continue;
    const values = parts.map((part) => part[key]).filter((value) => value !== undefined);
    if (values.some((value) => value !== values[0])) throw new TypeError(`application composition requires an explicit ${key} policy`);
    if (values.length) inherited[key] = values[0];
  }
  const requests = [spec.onRequest, ...parts.map((part) => part.onRequest)].filter((hook) => Boolean(hook));
  const completions = [...parts.map((part) => part.onComplete), spec.onComplete].filter(Boolean);
  const responses = [...parts.map((part) => part.onResponse), spec.onResponse].filter(Boolean);
  const { applications: _applications, ...own } = spec;
  return {
    ...inherited,
    ...own,
    resources: [...parts.flatMap((part) => part.resources ?? []), ...spec.resources ?? []],
    middlewares: [...spec.middlewares ?? [], ...parts.flatMap((part) => part.middlewares ?? [])],
    locals: Object.assign({}, ...parts.map((part) => part.locals), spec.locals),
    onRequest: async (ctx) => {
      for (const hook of requests) {
        const value = await hook(ctx);
        if (value instanceof Response) return value;
        if (Array.isArray(value)) ctx.trace = appendEntries(ctx.trace, value);
      }
    },
    onComplete: (ctx) => {
      const failures = [];
      for (const hook of completions) {
        try { hook(ctx); } catch (error) { failures.push(error); }
      }
      if (failures.length) throw new AggregateError(failures, "application completion failed");
    },
    onResponse: async (response, ctx) => {
      for (const hook of responses) await hook(response, ctx);
    },
  };
}

/** Composes a declarative application specification into the plain server
 * spec createWebServer (or createWebPlatform, for a caller that also needs
 * provider lifetime) expects, plus the merged `spec` a caller can derive
 * further capabilities (an OpenAPI document, for one) from. An optional
 * `validate` capability compiles a resource's `validation` descriptor into a
 * request-admission middleware; without one, `validation` descriptors are
 * carried on the resource (visible to `spec`) but enforce nothing.
 * `specification.platform` is refused here: name it to a platform-lifetime
 * layer instead. */
export function composeWebApplicationSpec(specification, { validate } = {}) {
  if (specification.platform !== undefined) throw new TypeError("This composition has no provider lifetime; compose platform lifetime at a layer that provides one");
  const spec = compose(specification);
  const intakes = new WeakMap();
  const bind = (context, options, replace = false) => {
    let intake = intakes.get(context);
    if (!intake) {
      intake = intakeFor(context, spec.body);
      intakes.set(context, intake);
    }
    if (replace || !("input" in context)) Object.assign(context, { input: inputFor(context, intake, options) });
    return context;
  };
  const stage = (middleware) => (ctx) => middleware(bind(ctx, spec.body));
  const resources = (spec.resources ?? []).map((resource) => ({
    ...resource,
    middlewares: [
      async (ctx) => {
        const bound = bind(ctx, { ...spec.body, ...resource.validation?.maxBytes !== undefined ? { maxBytes: resource.validation.maxBytes } : {}, ...resource.body }, true);
        if (intakes.get(ctx)?.read) await bound.input.bytes();
      },
      ...resource.validation && validate ? [stage(validate(resource.validation))] : [],
      ...(resource.middlewares ?? []).map(stage),
    ],
    handler: (ctx) => resource.handler(bind(ctx, spec.body)),
  }));
  const { onRequest: _request, onResponse: _response, onError: _error, onComplete: _complete, ...base } = spec;
  const server = {
    ...base,
    resources,
    middlewares: (spec.middlewares ?? []).map(stage),
    ...spec.onRequest ? { onRequest: stage(spec.onRequest) } : {},
    ...spec.onResponse ? { onResponse: (response, ctx) => spec.onResponse(response, bind(ctx, spec.body)) } : {},
    ...spec.onComplete ? { onComplete: (ctx) => spec.onComplete(bind(ctx, spec.body)) } : {},
    onError: async (error, ctx) => {
      const response = await spec.onError?.(error, bind(ctx, spec.body));
      if (response) return response;
      if (error instanceof BodyReadError) return Response.json({ type: "about:blank", status: error.status, title: error.message, code: error.code }, { status: error.status, headers: { "content-type": "application/problem+json" } });
    },
  };
  return { server, spec };
}

/** The plain (no provider lifetime, no OpenAPI, no JSON-schema validation)
 * web application: compose, validate, bound-and-share one request body, and
 * serve it over createWebServer. A caller that wants OpenAPI generation or
 * JSON-schema request validation composes those on top (as computer-web-server
 * does for the web server). */
export function createWebApplication(specification, options) {
  const { server } = composeWebApplicationSpec(specification, options);
  return Object.freeze({ ...createWebServer(server) });
}
