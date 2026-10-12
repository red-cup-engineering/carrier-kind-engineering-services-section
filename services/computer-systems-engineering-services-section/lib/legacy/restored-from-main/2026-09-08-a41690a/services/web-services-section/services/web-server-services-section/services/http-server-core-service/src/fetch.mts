import type { WebApplication, WebContext, WebExecutionContext, WebFetchHandler } from "@red-cup-engineering/http-server-application-contract-service/web";
import { dispatchApplication } from "./application.mts";
import { applyCacheControl, applySecurityHeaders, applyCors, corsPreflight, type HeaderSink, type HeaderCorsOptions } from "./response-policy.mts";

export type { WebApplication, WebContext, WebResource, WebHandler, WebMiddleware, WebExecutionContext, WebFetchHandler, WebCorsOptions } from "@red-cup-engineering/http-server-application-contract-service/web";

function headerSink(headers: Headers, terminate: (status: number, body?: string) => void): HeaderSink {
  return {
    hasHeader: (name) => headers.has(name), getHeader: (name) => headers.get(name),
    setHeader(name, value) { headers.delete(name); for (const item of Array.isArray(value) ? value : [value]) headers.append(name, String(item)); },
    writeHead(status, values) { for (const [name, value] of Object.entries(values ?? {})) headers.set(name, value); return { end: (body) => terminate(status, body) }; },
  };
}
function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function bodyForbidden(status: number): boolean { return status === 204 || status === 205 || status === 304 || status < 200; }

/** Cancellation follows the request after headers are returned, with one bounded pull at a time. */
function abortableBody(body: ReadableStream<Uint8Array> | null, signal: AbortSignal): ReadableStream<Uint8Array> | null {
  if (!body) return null;
  const reader = body.getReader();
  let terminal = false;
  let abort: () => void;
  const cleanup = () => { terminal = true; signal.removeEventListener("abort", abort); };
  return new ReadableStream<Uint8Array>({
    start(controller) {
      abort = () => {
        if (terminal) return;
        cleanup();
        void reader.cancel(signal.reason).catch(() => {});
        controller.error(signal.reason ?? new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
    },
    async pull(controller) {
      if (terminal) return;
      try {
        const next = await reader.read();
        if (terminal) return;
        if (next.done) { cleanup(); reader.releaseLock(); controller.close(); }
        else controller.enqueue(next.value);
      } catch (error) { if (!terminal) { cleanup(); controller.error(error); } }
    },
    async cancel(reason) { cleanup(); await reader.cancel(reason); reader.releaseLock(); },
  }, { highWaterMark: 0 });
}

/** Create a Fetch-native application with the same dispatcher used by the Node server. */
export function createFetchHandler(application: WebApplication): WebFetchHandler {
  return async (request: Request, execution: WebExecutionContext = {}): Promise<Response> => {
    request.signal.throwIfAborted();
    const now = execution.now ?? Date.now;
    const startedAt = now();
    const requestNonce = (execution.nonce ?? nonce)();
    const id = requestNonce;
    const entries = [
      { e: id, a: "method", v: request.method, t: startedAt },
      { e: id, a: "url", v: request.url, t: startedAt },
      ...Array.from(request.headers, ([name, value]) => ({ e: id, a: `header.${name}`, v: value, t: startedAt })),
      ...(execution.remoteAddress !== undefined ? [{ e: id, a: "remote-addr", v: execution.remoteAddress, t: startedAt }] : []),
      ...(execution.httpVersion !== undefined ? [{ e: id, a: "http-version", v: execution.httpVersion, t: startedAt }] : []),
    ];
    const context: WebContext = {
      request, url: new URL(request.url), params: Object.freeze({}), locals: { ...application.locals },
      capabilities: execution.capabilities ?? Object.freeze({}),
      ...(execution.remoteAddress !== undefined ? { remoteAddress: execution.remoteAddress } : {}),
      ...(execution.httpVersion !== undefined ? { httpVersion: execution.httpVersion } : {}),
      nonce: requestNonce, signal: request.signal, startedAt,
      trace: Object.freeze({ kind: "web-server.request-trace", id, entries: Object.freeze(entries) }),
      responseHeaders: new Headers({ date: new Date(startedAt).toUTCString() }),
    };
    let response: Response | undefined;
    const sink = headerSink(context.responseHeaders, (status, body) => { response = new Response(bodyForbidden(status) ? null : body, { status }); });
    try {
      applyCacheControl(sink, application.cacheControl);
      applySecurityHeaders(sink, application.security, context.nonce);
      await dispatchApplication(application, context, {
        method: request.method,
        ...(request.headers.has("accept") ? { accept: request.headers.get("accept")! } : {}),
        ...(request.headers.has("accept-language") ? { acceptLanguage: request.headers.get("accept-language")! } : {}),
      }, {
        async accept(value) {
          if (value == null || value === false) return false;
          if (!(value instanceof Response)) throw new TypeError("portable HTTP handlers must return a Response");
          response = value; return true;
        },
        async preflight() {
          const cors = application.cors;
          if (!cors) return false;
          const origins = cors.origins;
          const options: HeaderCorsOptions = { ...cors, ...(typeof origins === "function" ? { origins: (origin: string) => origins(origin, request) } : {}) } as HeaderCorsOptions;
          const source = { headers: Object.fromEntries(request.headers) };
          if (request.method === "OPTIONS") { corsPreflight(source, sink, options); return true; }
          applyCors(sink, source, options); return false;
        },
        matched(resource) {
          const vary = [context.responseHeaders.get("vary"), ...(resource.produces?.length ? ["Accept"] : []), ...(resource.languages?.length ? ["Accept-Language"] : [])].filter(Boolean);
          if (vary.length) context.responseHeaders.set("vary", vary.join(", "));
        },
        async refuse({ status, title, headers, evidence }) {
          response = application.problems && status >= 400
            ? Response.json({ type: "about:blank", title, status, instance: context.url.pathname, ...(evidence !== undefined ? { evidence } : {}) }, { status, headers: { ...headers, "content-type": "application/problem+json" } })
            : new Response(bodyForbidden(status) ? null : title, { status, ...(headers ? { headers } : {}) });
        },
      });
      if (!response) throw new TypeError("HTTP handler completed without a Response");
    } catch (error) {
      if (request.signal.aborted) throw request.signal.reason ?? error;
      try { response = await application.onError?.(error, context) || undefined; } catch { response = undefined; }
      response ??= application.problems ? Response.json({ type: "about:blank", title: "Internal Server Error", status: 500 }, { status: 500, headers: { "content-type": "application/problem+json" } }) : new Response("Internal Server Error", { status: 500 });
    }
    const headers = new Headers(context.responseHeaders);
    for (const [name, value] of response.headers) if (name !== "set-cookie") headers.set(name, value);
    for (const cookie of response.headers.getSetCookie()) headers.append("set-cookie", cookie);
    if (context.negotiatedLanguage) headers.set("content-language", context.negotiatedLanguage);
    const suppress = request.method === "HEAD" || bodyForbidden(response.status);
    if (suppress && response.body) await response.body.cancel();
    const finalResponse = new Response(suppress ? null : abortableBody(response.body, request.signal), { status: response.status, statusText: response.statusText, headers });
    await application.onResponse?.(finalResponse, context);
    return finalResponse;
  };
}
