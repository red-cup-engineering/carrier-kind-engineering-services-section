// pipeline.ts — the settling request pipeline.
//
// Each request is a RequestTrace. Middleware strategies append trace entries. The routing admission
// settles the trace: potential = matched resource admitted; active = denied (4xx); stable =
// contradiction held (500, not thrown); absurd = no resource matched (404).
//
// The pipeline is the only place that writes to res — handlers receive a live Context and
// write directly. Hooks (onRequest, onResponse, onError) are extension points.

import { randomBytes } from "node:crypto";
import { dispatchApplication } from "@red-cup-engineering/web-server-services-section/application";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { App, Context, Resource } from "@red-cup-engineering/http-server-application-contract-service";
import { traceRequest } from "@red-cup-engineering/web-server-services-section/request";
import { appendVary, applyCacheControl, applyCors, applySecurityHeaders, corsPreflight, ensureDateHeader, send } from "@red-cup-engineering/web-server-services-section/http";
import { toWebRequest, sendWebResponse } from "@red-cup-engineering/web-server-services-section/internal/web-bridge";
import {
  httpProblem,
  problemFromError,
  resolveProblemInstance,
  sendProblem,
  type ProblemResponseOptions,
} from "@red-cup-engineering/web-server-services-section/problem";

// ── Context factory ───────────────────────────────────────────────────────────────────────────

export function contextFor(req: IncomingMessage, res: ServerResponse, app: App): Context {
  const trace = traceRequest(req);
  const raw = req.url ?? "/";
  const base = requestBase(req, app);
  const target = requestTarget(raw);
  const url = (() => { try { return new URL(target, base); } catch { return new URL("/", base); } })();
  const signal = requestAbortSignal(req, res);
  const nonce = randomBytes(16).toString("base64url");
  return {
    req, res, app, url,
    params: {},
    locals: { ...(app.locals ?? {}) },
    nonce,
    signal,
    trace,
    startedAt: Date.now(), // law-allow: wall-clock-as-data — startedAt is duration-telemetry testimony, not ordering
  };
}

function requestAbortSignal(req: IncomingMessage, res: ServerResponse): AbortSignal {
  const controller = new AbortController();
  // Node.js v24+ adds IncomingMessage.signal, but it aborts on normal req.close
  // (after body fully read), not only on premature client disconnect. Propagating
  // it would abort ctx.signal the moment the request body ends, which breaks
  // any middleware (e.g. proxyPass) that still needs to write a response. Genuine
  // client-disconnect aborts are covered by res.once("close") below.
  let completed = false;
  const abort = (reason: string) => {
    if (!completed && !controller.signal.aborted) controller.abort(new Error(reason));
  };
  res.once("finish", () => { completed = true; });
  res.once("close", () => abort("response closed before completion"));
  res.once("error", () => abort("response stream error"));
  req.once("aborted", () => abort("request aborted by client"));
  req.once("error", () => abort("request stream error"));
  // A bridged WHATWG Request (appToFetch) has no socket to emit close/aborted;
  // its cancellation arrives as an explicit upstream signal. Distinct property,
  // NOT req.signal — see the IncomingMessage.signal caveat above.
  const upstream = (req as { webAbortSignal?: unknown }).webAbortSignal;
  if (upstream instanceof AbortSignal) {
    if (upstream.aborted) abort("request aborted upstream");
    else upstream.addEventListener("abort", () => abort("request aborted upstream"), { once: true });
  }
  return controller.signal;
}

function requestTarget(raw: string): string {
  try {
    const absolute = new URL(raw);
    return `${absolute.pathname}${absolute.search}${absolute.hash}`;
  } catch {
    return raw;
  }
}

function requestBase(req: IncomingMessage, app: App): string {
  const configured = absoluteHttpBase(app.base);
  if (configured) return configured;

  const forwarded = app.trustProxy ? forwardedAuthority(req) : {};
  const proto = forwarded.proto ?? directProtocol(req);
  const host = forwarded.host ?? firstHeaderValue(req.headers.host) ?? "localhost";
  return safeOrigin(proto, host);
}

function absoluteHttpBase(base: string | undefined): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {}
  return null;
}

function forwardedAuthority(req: IncomingMessage): { proto?: string; host?: string } {
  const forwarded = parseForwarded(firstHeaderValue(req.headers.forwarded));
  const proto = forwarded.proto ?? firstHeaderValue(req.headers["x-forwarded-proto"]);
  const host = forwarded.host ?? firstHeaderValue(req.headers["x-forwarded-host"]);
  return {
    ...(proto !== undefined ? { proto } : {}),
    ...(host !== undefined ? { host } : {}),
  };
}

function parseForwarded(value: string | undefined): { proto?: string; host?: string } {
  if (!value) return {};
  const first = value.split(",")[0] ?? "";
  const out: { proto?: string; host?: string } = {};
  for (const part of first.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim().toLowerCase();
    if (key !== "proto" && key !== "host") continue;
    const rawValue = rest.join("=").trim();
    const unquoted = rawValue.startsWith("\"") && rawValue.endsWith("\"")
      ? rawValue.slice(1, -1).replace(/\\(["\\])/g, "$1")
      : rawValue;
    if (key === "proto") out.proto = unquoted;
    if (key === "host") out.host = unquoted;
  }
  return out;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const first = text?.split(",")[0]?.trim();
  return first || undefined;
}

function joinedHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(",") : value;
}

function directProtocol(req: IncomingMessage): string {
  return (req.socket as { encrypted?: boolean }).encrypted ? "https" : "http";
}

function safeOrigin(proto: string, host: string): string {
  const protocol = proto.trim().toLowerCase() === "https" ? "https" : "http";
  const trimmedHost = host.trim();
  try {
    return new URL(`${protocol}://${trimmedHost}/`).href;
  } catch {
    return `${protocol}://localhost/`;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────────────────────

export function handler(app: App): (req: IncomingMessage, res: ServerResponse) => void {
  if (app.fetch) {
    for (const field of ["resources", "middlewares", "onRequest", "onResponse", "onError", "cors", "cacheControl", "security", "problems"] as const) {
      if (app[field] !== undefined) throw new TypeError(`Declare ${field} inside the portable application; the Node fetch adapter accepts only transport and lifecycle options`);
    }
  }
  return function (req: IncomingMessage, res: ServerResponse) {
    if (app.fetch) {
      void (async () => {
        const ctx = contextFor(req, res, app);
        const request = toWebRequest(req, { url: ctx.url, signal: ctx.signal, response: res });
        const response = await app.fetch!(request, {
          ...(req.socket.remoteAddress ? { remoteAddress: req.socket.remoteAddress } : {}),
          httpVersion: req.httpVersion,
        });
        await sendWebResponse(res, response, { method: req.method ?? "GET" });
      })().catch((error) => { if (!res.headersSent) res.writeHead(500).end("Internal Server Error"); else res.destroy(error instanceof Error ? error : undefined); });
    } else void handle(app, req, res);
  };
}

async function handle(app: App, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const ctx = contextFor(req, res, app);
  const problemOptions = appProblemOptions(app);
  let responseHookCalled = false;
  const fireOnResponse = async (): Promise<void> => {
    if (responseHookCalled) return;
    responseHookCalled = true;
    await app.onResponse?.(ctx);
  };
  ensureDateHeader(res);
  applyCacheControl(res, app.cacheControl);
  applySecurityHeaders(res, app.security, ctx.nonce);

  try {
    await dispatchApplication(app, ctx, {
      method: req.method ?? "GET",
      ...(joinedHeaderValue(req.headers.accept) !== undefined ? { accept: joinedHeaderValue(req.headers.accept)! } : {}),
      ...(joinedHeaderValue(req.headers["accept-language"]) !== undefined ? { acceptLanguage: joinedHeaderValue(req.headers["accept-language"])! } : {}),
    }, {
      accept: (value) => sendReturnedResponse(ctx, value),
      preflight: async () => {
        if (req.method === "OPTIONS" && app.cors) { corsPreflight(req, res, app.cors); return true; }
        if (app.cors) applyCors(res, req, app.cors);
        return false;
      },
      matched: (resource) => {
        ctx.resource = resource as Resource;
        if (resource.produces?.length) appendVary(res, "Accept");
        if (resource.languages?.length) appendVary(res, "Accept-Language");
      },
      admitted: () => { if (ctx.negotiatedLanguage) res.setHeader("Content-Language", ctx.negotiatedLanguage); },
      refuse: async ({ status, title, headers, evidence }) => {
        if (status === 204) { res.writeHead(status, headers).end(); return; }
        if (evidence !== undefined && problemOptions) {
          await sendProblem(req, res, httpProblem(status, title, { extensions: { evidence } }), problemOptions);
          return;
        }
        if (await maybeSendProblem(ctx, status, title, problemOptions, headers ? { headers } : undefined)) return;
        res.writeHead(status, headers).end(req.method === "HEAD" ? undefined : evidence !== undefined ? JSON.stringify({ error: "contradicted", evidence }) : title);
      },
    });
  } catch (err) {
    if (app.onError) {
      try {
        const result = await app.onError(err, ctx);
        if (result === true || res.headersSent || res.writableEnded) return;
        if (await sendReturnedResponse(ctx, result)) return;
      } catch { /* fall through */ }
    }
    if (problemOptions && !res.headersSent) {
      const source = problemFromError(err, problemOptions);
      const instance = resolveProblemInstance(ctx, problemOptions) ?? source.instance;
      await sendProblem(req, res, instance === source.instance ? source : httpProblem(source.status, source.title, {
        type: source.type,
        headers: source.headers,
        extensions: source.extensions,
        ...(source.detail !== undefined ? { detail: source.detail } : {}),
        ...(instance !== undefined ? { instance } : {}),
        cause: err,
      }), problemOptions);
      return;
    }
    if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
  } finally {
    if (res.writableEnded) await fireOnResponse();
  }
}

async function sendReturnedResponse(ctx: Context, result: unknown): Promise<boolean> {
  if (result === undefined || result === null || ctx.res.headersSent || ctx.res.writableEnded) return false;
  if (result === false) return false;
  if (ctx.negotiatedLanguage) ctx.res.setHeader("Content-Language", ctx.negotiatedLanguage);
  if (result instanceof Response) {
    await sendWebResponse(ctx.res, result, {
      ...(ctx.req.method === undefined ? {} : { method: ctx.req.method }),
      ...(ctx.req.headers["accept-encoding"] === undefined ? {} : { acceptEncoding: ctx.req.headers["accept-encoding"] }),
      ...(ctx.req.headers.range === undefined ? {} : { range: ctx.req.headers.range }),
    });
    return true;
  }
  if (isRepr(result)) {
    await send(ctx.req, ctx.res, result);
    return true;
  }
  throw new TypeError("request stage returned an unsupported response value");
}

function isRepr(value: unknown): value is Parameters<typeof send>[2] {
  return typeof value === "object" && value !== null && (
    "body" in value ||
    "status" in value ||
    "headers" in value ||
    "type" in value ||
    "etag" in value ||
    "lastModified" in value ||
    "cacheControl" in value ||
    "security" in value
  );
}

function appProblemOptions(app: App): ProblemResponseOptions | null {
  if (app.problems === true) return {};
  if (!app.problems) return null;
  return app.problems as ProblemResponseOptions;
}

async function maybeSendProblem(
  ctx: Context,
  status: number,
  title: string,
  options: ProblemResponseOptions | null,
  extra?: { headers?: Readonly<Record<string, string>> },
): Promise<boolean> {
  if (!options || ctx.res.headersSent) return false;
  const instance = resolveProblemInstance(ctx, options);
  await sendProblem(ctx.req, ctx.res, httpProblem(status, title, {
    ...(instance !== undefined ? { instance } : {}),
    ...(extra?.headers !== undefined ? { headers: extra.headers } : {}),
  }), options);
  return true;
}
