import { constants as http2Constants } from "node:http2";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { applyTrailerHeader, immediateResponseTrailers, resolveResponseTrailers, writeResponseTrailers } from "./trailers.mjs";
import { bodyForbidden, pipeCompressed, planWebResponseCompression, writeContentCodingNotAcceptable } from "./response-compression.mjs";
function requestBody(req, response) {
    let cleanup = ()=>{};
    let pull = ()=>{};
    return new ReadableStream({
        start (controller) {
            let waiting = false, finished = false;
            const end = ()=>{
                if (finished) return;
                finished = true;
                cleanup();
                controller.close();
            };
            const fail = (error)=>{
                if (finished) return;
                finished = true;
                cleanup();
                controller.error(error);
            };
            const aborted = ()=>fail(new Error("request aborted by client"));
            const pump = ()=>{
                if (!waiting || finished) return;
                const chunk = req.read();
                if (chunk !== null) {
                    waiting = false;
                    controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
                } else if (req.readableEnded) end();
            };
            cleanup = ()=>{
                req.off("readable", pump);
                req.off("end", end);
                req.off("error", fail);
                req.off("aborted", aborted);
            };
            req.on("readable", pump);
            req.once("end", end);
            req.once("error", fail);
            req.once("aborted", aborted);
            pull = ()=>{
                waiting = true;
                pump();
            };
        },
        pull () {
            pull();
        },
        cancel () {
            cleanup();
            const discardError = ()=>{};
            req.on("error", discardError);
            req.once("close", ()=>req.off("error", discardError));
            if (response && !req.complete && req.httpVersionMajor === 1) response.shouldKeepAlive = false;
            if (response && !req.complete && req.httpVersionMajor === 2) {
                const stream = req.stream;
                stream.once("finish", ()=>stream.close(http2Constants.NGHTTP2_CANCEL));
            }
            req.resume();
        }
    }, {
        highWaterMark: 0
    });
}
export function toWebRequest(req, context = {}) {
    const options = typeof context === "string" ? {
        base: context
    } : context;
    const url = options.url ?? new URL(req.url ?? "/", options.base ?? `http://${req.headers.host ?? "localhost"}/`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)){
        if (key.startsWith(":")) continue;
        if (Array.isArray(value)) for (const item of value)headers.append(key, item);
        else if (value !== undefined) headers.set(key, String(value));
    }
    const method = req.method ?? "GET", hasBody = options.body !== false && method !== "GET" && method !== "HEAD";
    const init = {
        method,
        headers,
        ...options.signal ? {
            signal: options.signal
        } : {},
        ...hasBody ? {
            body: requestBody(req, options.response),
            duplex: "half"
        } : {}
    };
    return new Request(url, init);
}
export async function sendWebResponse(first, second, options = {}) {
    const response = first instanceof Response ? first : second;
    const res = first instanceof Response ? second : first;
    // A response can finish being prepared after its client has left. Do not
    // create a new Node stream pipeline against an already closed receiver.
    if (res.destroyed) {
        await response.body?.cancel().catch(()=>{});
        return;
    }
    const headers = {};
    for (const [key, value] of response.headers)if (key !== "set-cookie") headers[key] = value;
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    const plan = planWebResponseCompression(response.status, headers, options);
    applyTrailerHeader(headers, immediateResponseTrailers(response));
    const head = options.method?.toUpperCase() === "HEAD";
    if (plan.kind === "not-acceptable") {
        await response.body?.cancel();
        writeContentCodingNotAcceptable(headers);
        res.writeHead(406, headers).end(head ? undefined : "Not Acceptable");
        return;
    }
    res.writeHead(response.status, headers);
    if (!response.body || head || bodyForbidden(response.status)) {
        await response.body?.cancel();
        res.end();
        return;
    }
    const source = Readable.fromWeb(response.body);
    const compressed = pipeCompressed(source, plan);
    const cancel = ()=>{
        if (!res.writableFinished) {
            source.destroy();
            if (compressed !== source) compressed.destroy();
        }
    };
    res.once("close", cancel);
    try {
        await pipeline(compressed, res, {
            end: false
        });
        writeResponseTrailers(res, await resolveResponseTrailers(response));
        res.end();
    } finally{
        res.off("close", cancel);
        if (!source.destroyed) source.destroy();
    }
}
