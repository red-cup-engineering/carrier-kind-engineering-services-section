import process from "node:process";
import { createServer as createNodeHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createSecureServer as createH2SecureServer, createServer as createH2Server } from "node:http2";
import { handler } from "./web-application-pipeline.mjs";
const DEFAULT_SHUTDOWN_SIGNALS = [
    "SIGTERM",
    "SIGINT"
];
const SIGNAL_EXIT_OFFSETS = {
    SIGHUP: 1,
    SIGINT: 2,
    SIGTERM: 15
};
function pickServer(app) {
    if (app.tls && app.http2) {
        return createH2SecureServer({
            ...app.tls,
            allowHTTP1: true
        });
    }
    if (app.tls) {
        return createHttpsServer(app.tls);
    }
    if (app.http2) {
        return createH2Server();
    }
    return createNodeHttpServer();
}
function upgradeMatches(match, req) {
    if (match === undefined) return true;
    const path = new URL(req.url ?? "/", "http://x").pathname;
    if (typeof match === "string") return path === match;
    if (match instanceof RegExp) return match.test(path);
    try {
        if (match(path)) return true;
    } catch  {}
    try {
        return Boolean(match(req));
    } catch  {
        return false;
    }
}
export function createHttpServer(binding, app = {}) {
    const h = binding.handle;
    const srv = pickServer(app);
    srv.on("request", h);
    srv.on("checkContinue", (req, res)=>{
        void handleExpectContinue(app, h, req, res);
    });
    if (app.clientError !== false) {
        srv.on("clientError", (error, socket)=>{
            void handleClientError(app, error, socket);
        });
    }
    if (app.upgrades?.length) {
        srv.on("upgrade", (...upgradeArgs)=>{
            const [req, socket, head] = upgradeArgs;
            for (const u of app.upgrades ?? []){
                if (!upgradeMatches(u.match, req)) continue;
                if (u.handleUpgrade) {
                    u.handleUpgrade(req, socket, head, {
                        app
                    });
                    return;
                }
                if (u.handler) {
                    u.handler(req, socket, head);
                    return;
                }
            }
            socket.destroy();
        });
    }
    const sockets = new Set();
    srv.on("connection", (socket)=>{
        sockets.add(socket);
        socket.once("close", ()=>sockets.delete(socket));
        app.onConnection?.(socket);
        app.lifecycle?.onConnection?.(socket);
    });
    let closing = null;
    const closeGracefully = (grace = 10_000)=>{
        if (closing) return closing;
        closing = (async ()=>{
            const drained = new Promise((resolve, reject)=>{
                srv.close((error)=>error ? reject(error) : resolve());
            });
            srv.closeIdleConnections?.();
            const timer = setTimeout(()=>{
                if (srv.closeAllConnections) {
                    srv.closeAllConnections();
                }
                for (const s of sockets)s.destroy();
            }, grace);
            if (typeof timer.unref === "function") {
                timer.unref();
            }
            try {
                const outcomes = await Promise.allSettled([
                    drained,
                    (async ()=>{
                        await app.onStop?.(app);
                        await app.lifecycle?.onStop?.(srv);
                    })()
                ]);
                const failures = outcomes.filter((outcome)=>outcome.status === "rejected").map((outcome)=>outcome.reason);
                if (failures.length) throw new AggregateError(failures, "Node server shutdown failed");
            } finally{
                clearTimeout(timer);
                await binding.close?.();
            }
        })();
        return closing;
    };
    return Object.assign(srv, {
        closeGracefully
    });
}
async function handleExpectContinue(app, requestHandler, req, res) {
    try {
        const decision = typeof app.expectContinue === "function" ? await app.expectContinue(req, res, app) : app.expectContinue;
        if (res.headersSent || res.writableEnded) return;
        if (decision === false) {
            res.writeHead(417, {
                "content-type": "text/plain; charset=utf-8"
            }).end("Expectation Failed");
            return;
        }
        res.writeContinue();
        requestHandler(req, res);
    } catch (error) {
        if (!res.headersSent && !res.writableEnded) {
            res.writeHead(500, {
                "content-type": "text/plain; charset=utf-8"
            }).end(error instanceof Error ? error.message : "Internal Server Error");
        }
    }
}
function clientErrorStatus(error) {
    if (error.code === "HPE_HEADER_OVERFLOW") return {
        status: 431,
        reason: "Request Header Fields Too Large"
    };
    return {
        status: 400,
        reason: "Bad Request"
    };
}
function writeDefaultClientError(error, socket) {
    const s = socket;
    if (s.destroyed) return;
    const { status, reason } = clientErrorStatus(error);
    const response = `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`;
    try {
        if (s.writable !== false && typeof s.end === "function") s.end(response);
        else if (typeof s.destroy === "function") s.destroy();
    } catch  {
        try {
            s.destroy?.();
        } catch  {}
    }
}
async function handleClientError(app, error, socket) {
    try {
        if (typeof app.clientError === "function") {
            const handled = await app.clientError(error, socket, app);
            if (handled === true) return;
        }
        writeDefaultClientError(error, socket);
    } catch  {
        writeDefaultClientError(error, socket);
    }
}
export function installGracefulShutdown(target, options = {}) {
    const source = options.source ?? process;
    const signals = options.signals ?? DEFAULT_SHUTDOWN_SIGNALS;
    const grace = options.grace ?? 10_000;
    const now = options.now ?? (()=>new Date());
    const listeners = new Map();
    let state = {
        phase: "running"
    };
    let closePromise = null;
    const snapshot = ()=>({
            ...state
        });
    const drain = (reason = "manual", requestedGrace = grace, signal)=>{
        if (closePromise) return closePromise;
        state = {
            phase: "draining",
            reason,
            ...signal ? {
                signal
            } : {},
            startedAt: now().toISOString()
        };
        closePromise = (async ()=>{
            try {
                await options.onDrain?.(snapshot());
                await closeTarget(target, requestedGrace);
                state = {
                    ...state,
                    phase: "closed",
                    closedAt: now().toISOString()
                };
                await options.onClosed?.(snapshot());
            } catch (error) {
                state = {
                    ...state,
                    phase: "failed",
                    error: error instanceof Error ? error.message : String(error)
                };
                await options.onError?.(error, snapshot());
                throw error;
            }
        })();
        return closePromise;
    };
    for (const signal of signals){
        const listener = ()=>{
            if (state.phase === "draining" && options.forceExit) {
                options.forceExit(signalExitCode(signal), signal);
                return;
            }
            void drain(`signal:${signal}`, grace, signal).catch(()=>{});
        };
        listeners.set(signal, listener);
        source.on(signal, listener);
    }
    return {
        get state () {
            return snapshot();
        },
        get draining () {
            return state.phase === "draining";
        },
        get promise () {
            return closePromise;
        },
        drain,
        dispose () {
            for (const [signal, listener] of listeners){
                if (source.off) {
                    source.off(signal, listener);
                } else {
                    source.removeListener?.(signal, listener);
                }
            }
            listeners.clear();
        }
    };
}
async function closeTarget(target, grace) {
    if ("closeGracefully" in target) {
        await target.closeGracefully(grace);
    } else {
        await target.close(grace);
    }
}
function signalExitCode(signal) {
    return 128 + (SIGNAL_EXIT_OFFSETS[signal] ?? 0);
}
function abortError() {
    const error = new Error("start aborted");
    error.name = "AbortError";
    return error;
}
function removeServerListener(server, event, listener) {
    if (server.off) server.off(event, listener);
    else server.removeListener?.(event, listener);
}
// systemd socket activation (sd_listen_fds(3)): the service manager owns the listening socket and
// passes it as fd 3 onward, so connections queue in its backlog across a restart instead of being
// refused. LISTEN_PID names the process the descriptors were passed to; a child that inherited the
// environment is not that process. Returns the first passed descriptor, or undefined.
export function inheritedListenFd(environment = process.env, pid = process.pid) {
    if (Number(environment.LISTEN_PID) !== pid) return undefined;
    const count = Number(environment.LISTEN_FDS);
    return Number.isInteger(count) && count >= 1 ? 3 : undefined;
}
function listenOptions(portOrOptions) {
    if (typeof portOrOptions === "string") return portOrOptions;
    if (typeof portOrOptions === "object" && portOrOptions?.fd !== undefined) return {
        fd: portOrOptions.fd
    };
    if (typeof portOrOptions === "number" || portOrOptions === undefined) {
        const port = portOrOptions ?? 0;
        return {
            port,
            host: "0.0.0.0"
        };
    }
    if (portOrOptions.path) {
        return {
            path: portOrOptions.path,
            ...portOrOptions.backlog !== undefined ? {
                backlog: portOrOptions.backlog
            } : {}
        };
    }
    const port = portOrOptions.port ?? 0;
    return {
        port,
        ...portOrOptions.host !== undefined ? {
            host: portOrOptions.host
        } : {
            host: "0.0.0.0"
        },
        ...portOrOptions.backlog !== undefined ? {
            backlog: portOrOptions.backlog
        } : {}
    };
}
function startSignal(portOrOptions) {
    return typeof portOrOptions === "object" ? portOrOptions.signal : undefined;
}
function startTimeouts(portOrOptions) {
    return typeof portOrOptions === "object" ? portOrOptions.timeouts : undefined;
}
function applyServerTimeouts(server, options) {
    if (!options) return;
    const headersMs = options.headersMs ?? options.requestMs;
    if (headersMs !== undefined && "headersTimeout" in server) server.headersTimeout = headersMs;
    if (options.requestMs !== undefined && "requestTimeout" in server) server.requestTimeout = options.requestMs;
    if (options.idleMs !== undefined && "keepAliveTimeout" in server) server.keepAliveTimeout = options.idleMs;
    if (options.connectionsCheckingIntervalMs !== undefined && "connectionsCheckingInterval" in server) {
        server.connectionsCheckingInterval = options.connectionsCheckingIntervalMs;
    }
    if (options.maxRequestsPerSocket !== undefined && "maxRequestsPerSocket" in server) {
        server.maxRequestsPerSocket = options.maxRequestsPerSocket;
    }
}
function listen(server, options, onListening) {
    if (typeof options === "string") {
        server.listen(options, onListening);
        return;
    }
    server.listen(options, onListening);
}
export async function startHttpServer(binding, portOrOptions) {
    const app = typeof portOrOptions === "object" ? portOrOptions : {};
    let dispose = async ()=>{};
    try {
        await binding.start?.();
        const srv = createHttpServer(binding, app);
        dispose = ()=>srv.closeGracefully(0).catch(()=>{});
        applyServerTimeouts(srv, startTimeouts(portOrOptions));
        const signal = startSignal(portOrOptions);
        if (signal?.aborted) {
            await srv.closeGracefully(0).catch(()=>{});
            throw abortError();
        }
        const actualPort = await new Promise((resolve, reject)=>{
            const onError = (error)=>{
                cleanup();
                reject(error);
            };
            const onAbort = ()=>{
                cleanup();
                srv.close(()=>reject(abortError()));
            };
            const cleanup = ()=>{
                removeServerListener(srv, "error", onError);
                signal?.removeEventListener("abort", onAbort);
            };
            srv.once("error", onError);
            signal?.addEventListener("abort", onAbort, {
                once: true
            });
            listen(srv, listenOptions(portOrOptions), ()=>{
                cleanup();
                const addr = srv.address();
                resolve(typeof addr === "object" && addr !== null ? addr.port : 0);
            });
        });
        const address = srv.address();
        await app.onStart?.(app);
        await app.lifecycle?.onStart?.(srv);
        return {
            server: srv,
            port: actualPort,
            address,
            close: (grace)=>typeof grace === "number" ? srv.closeGracefully(grace) : srv.closeGracefully()
        };
    } catch (error) {
        await dispose();
        try {
            await binding.close?.();
        } catch  {}
        throw error;
    }
}
// Binding a compiled web application (web-application.mjs's createWebServer,
// or any other engine shaped like one) onto the real Node HTTP listener
// above, over this package's own web-application-pipeline. The web server,
// TUFTE and anything else running a plain web application over Node share
// this one implementation.
export function bindWebServer(engine, transport = {}) {
    if (!engine || typeof engine.fetch !== "function" || !engine.specification) throw new TypeError("Node transport requires a compiled web server");
    return {
        handle: handler(engine, transport),
        start: async ()=>{
            if ("start" in engine && typeof engine.start === "function") await engine.start();
        },
        close: async ()=>{
            if ("close" in engine && typeof engine.close === "function") await engine.close();
        }
    };
}
export function createNodeServer(engine, transport = {}) {
    return createHttpServer(bindWebServer(engine, transport), transport);
}
export async function startWebServer(engine, portOrOptions) {
    const transport = typeof portOrOptions === "object" ? portOrOptions : {};
    return startHttpServer(bindWebServer(engine, transport), portOrOptions);
}
