// Moved down from computer-web-server (index.mjs): a plain, transport-free
// web application -- compile a `{ resources, middlewares, cors, security,
// cacheControl, onError, onComplete, onResponse }` specification into one
// Request -> Response `fetch` function over web-application-dispatch.mjs and
// this package's own response-policy. The web server and TUFTE (and the
// Node transport binding in node-server.mjs) all share this one
// implementation; only the web server's own OpenAPI/validation layering and
// edge behavior are specific to it.
import { dispatchApplication } from "./web-application-dispatch.mjs";
import { applyCacheControl, applySecurityHeaders, applyCors, corsPreflight } from "./response-policy.mjs";
function headerSink(headers, terminate) {
    return {
        hasHeader: (name)=>headers.has(name),
        getHeader: (name)=>headers.get(name),
        setHeader (name, value) {
            headers.delete(name);
            for (const item of Array.isArray(value) ? value : [
                value
            ])headers.append(name, String(item));
        },
        writeHead (status, values) {
            for (const [name, value] of Object.entries(values ?? {}))headers.set(name, value);
            return {
                end: (body)=>terminate(status, body)
            };
        }
    };
}
function nonce() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte)=>byte.toString(16).padStart(2, "0")).join("");
}
function bodyForbidden(status) {
    return status === 204 || status === 205 || status === 304 || status < 200;
}
function abortableBody(body, signal, complete) {
    if (!body) return null;
    const reader = body.getReader();
    let terminal = false;
    let abort;
    const cleanup = ()=>{
        terminal = true;
        signal.removeEventListener("abort", abort);
    };
    return new ReadableStream({
        start (controller) {
            abort = ()=>{
                if (terminal) return;
                cleanup();
                void (async ()=>{
                    const reason = signal.reason ?? new DOMException("Aborted", "AbortError");
                    try {
                        await reader.cancel(reason);
                    } catch  {} finally{
                        reader.releaseLock();
                        try {
                            complete();
                        } finally{
                            controller.error(reason);
                        }
                    }
                })().catch(()=>{});
            };
            if (signal.aborted) abort();
            else signal.addEventListener("abort", abort, {
                once: true
            });
        },
        async pull (controller) {
            if (terminal) return;
            try {
                const next = await reader.read();
                if (terminal) return;
                if (next.done) {
                    cleanup();
                    reader.releaseLock();
                    try {
                        complete();
                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                } else controller.enqueue(next.value);
            } catch (error) {
                if (!terminal) {
                    cleanup();
                    reader.releaseLock();
                    try {
                        complete();
                    } finally{
                        controller.error(error);
                    }
                }
            }
        },
        async cancel (reason) {
            cleanup();
            try {
                await reader.cancel(reason);
            } finally{
                reader.releaseLock();
                complete();
            }
        }
    }, {
        highWaterMark: 0
    });
}
function createFetchHandler(application) {
    return async (request, execution = {})=>{
        request.signal.throwIfAborted();
        const now = execution.now ?? Date.now;
        const startedAt = now();
        const requestNonce = (execution.nonce ?? nonce)();
        const id = requestNonce;
        const entries = [
            {
                e: id,
                a: "method",
                v: request.method,
                t: startedAt
            },
            {
                e: id,
                a: "url",
                v: request.url,
                t: startedAt
            },
            ...Array.from(request.headers, ([name, value])=>({
                    e: id,
                    a: `header.${name}`,
                    v: value,
                    t: startedAt
                })),
            ...execution.remoteAddress !== undefined ? [
                {
                    e: id,
                    a: "remote-addr",
                    v: execution.remoteAddress,
                    t: startedAt
                }
            ] : [],
            ...execution.httpVersion !== undefined ? [
                {
                    e: id,
                    a: "http-version",
                    v: execution.httpVersion,
                    t: startedAt
                }
            ] : []
        ];
        const context = {
            request,
            url: new URL(request.url),
            params: Object.freeze({}),
            locals: {
                ...application.locals
            },
            capabilities: execution.capabilities ?? Object.freeze({}),
            ...execution.remoteAddress !== undefined ? {
                remoteAddress: execution.remoteAddress
            } : {},
            ...execution.httpVersion !== undefined ? {
                httpVersion: execution.httpVersion
            } : {},
            nonce: requestNonce,
            signal: request.signal,
            startedAt,
            trace: Object.freeze({
                kind: "web-server.request-trace",
                id,
                entries: Object.freeze(entries)
            }),
            responseHeaders: new Headers({
                date: new Date(startedAt).toUTCString()
            })
        };
        let completed = false;
        const complete = ()=>{
            if (!completed) {
                completed = true;
                application.onComplete?.(context);
            }
        };
        let response;
        const sink = headerSink(context.responseHeaders, (status, body)=>{
            response = new Response(bodyForbidden(status) ? null : body, {
                status
            });
        });
        try {
            applyCacheControl(sink, application.cacheControl);
            applySecurityHeaders(sink, application.security, context.nonce);
            await dispatchApplication(application, context, {
                method: request.method,
                ...request.headers.has("accept") ? {
                    accept: request.headers.get("accept")
                } : {},
                ...request.headers.has("accept-language") ? {
                    acceptLanguage: request.headers.get("accept-language")
                } : {}
            }, {
                async accept (value) {
                    if (value == null || value === false) return false;
                    if (!(value instanceof Response)) throw new TypeError("portable HTTP handlers must return a Response");
                    response = value;
                    return true;
                },
                async preflight () {
                    const cors = application.cors;
                    if (!cors) return false;
                    const origins = cors.origins;
                    const options = {
                        ...cors,
                        ...typeof origins === "function" ? {
                            origins: (origin)=>origins(origin, request)
                        } : {}
                    };
                    const source = {
                        headers: Object.fromEntries(request.headers)
                    };
                    if (request.method === "OPTIONS") {
                        corsPreflight(source, sink, options);
                        return true;
                    }
                    applyCors(sink, source, options);
                    return false;
                },
                matched (resource) {
                    const vary = [
                        context.responseHeaders.get("vary"),
                        ...resource.produces?.length ? [
                            "Accept"
                        ] : [],
                        ...resource.languages?.length ? [
                            "Accept-Language"
                        ] : []
                    ].filter(Boolean);
                    if (vary.length) context.responseHeaders.set("vary", vary.join(", "));
                },
                async refuse ({ status, title, headers, evidence }) {
                    response = application.problems && status >= 400 ? Response.json({
                        type: "about:blank",
                        title,
                        status,
                        instance: context.url.pathname,
                        ...evidence !== undefined ? {
                            evidence
                        } : {}
                    }, {
                        status,
                        headers: {
                            ...headers,
                            "content-type": "application/problem+json"
                        }
                    }) : new Response(bodyForbidden(status) ? null : title, {
                        status,
                        ...headers ? {
                            headers
                        } : {}
                    });
                }
            });
            if (!response) throw new TypeError("HTTP handler completed without a Response");
        } catch (error) {
            if (request.signal.aborted) {
                complete();
                throw request.signal.reason ?? error;
            }
            try {
                response = await application.onError?.(error, context) || undefined;
            } catch  {
                response = undefined;
            }
            response ??= application.problems ? Response.json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500
            }, {
                status: 500,
                headers: {
                    "content-type": "application/problem+json"
                }
            }) : new Response("Internal Server Error", {
                status: 500
            });
        }
        const headers = new Headers(context.responseHeaders);
        for (const [name, value] of response.headers)if (name !== "set-cookie") headers.set(name, value);
        for (const cookie of response.headers.getSetCookie())headers.append("set-cookie", cookie);
        if (context.negotiatedLanguage) headers.set("content-language", context.negotiatedLanguage);
        const suppress = request.method === "HEAD" || bodyForbidden(response.status);
        let finalResponse;
        try {
            if (suppress && response.body) await response.body.cancel();
            finalResponse = new Response(suppress ? null : abortableBody(response.body, request.signal, complete), {
                status: response.status,
                statusText: response.statusText,
                headers
            });
            await application.onResponse?.(finalResponse, context);
            if (!finalResponse.body) complete();
            return finalResponse;
        } catch (error) {
            try {
                await (finalResponse?.body ?? response.body)?.cancel(error);
            } finally{
                complete();
            }
            throw error;
        }
    };
}
/** Compile one web application into a Request → Response server. */
export function createWebServer(specification = {}) {
    if (specification.platform !== undefined) throw new TypeError("Use createWebPlatform to compose provider lifetime with a web server");
    return Object.freeze({ specification, fetch: createFetchHandler(specification) });
}
