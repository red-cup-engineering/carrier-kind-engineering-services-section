/**
 * HTTP server service bindings for relating action routers.
 *
 * `src/running` owns pure route decisions over induced apices. This service
 * module binds those routes to `node:http` sockets.
 */
import { createServer, } from "node:http";

import { induceBins, } from "../../src/running/induce.mjs";
import {
  routeManifold,
  routeManifoldAsync,
  routeRequest,
  routeRequestAsync,

} from "../../src/running/serving.mjs";
import {
  routeCarrierManifold,
  routeCarrierManifoldAsync,

} from "../../src/running/mounting.mjs";

import { attachClaimSession } from "./ws-session.mjs";

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}

function lastEventIdOf(req) {
  const id = req.headers["last-event-id"];
  return typeof id === "string" ? id : undefined;
}

async function servedRequest(req) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const query = {};
  for (const [key, value] of url.searchParams) query[key] = value;
  const accept = req.headers["accept"];
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query,
    body: req.method === "POST" ? await readBody(req) : "",
    accept: typeof accept === "string" ? accept : undefined,
    lastEventId: lastEventIdOf(req),
  };
}

export function serveManifold(mounts, options = {}) {
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = routeManifold(mounts, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveManifoldAsync(mounts, options = {}) {
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = await routeManifoldAsync(mounts, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serve(actions, options = {}) {
  const inducedRef = options.induced;
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const induced = inducedRef ?? induceBins(actions);
      const response = routeRequest(induced, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveAsync(actions, options = {}) {
  const inducedRef = options.induced;
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const induced = inducedRef ?? induceBins(actions);
      const response = await routeRequestAsync(induced, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveCarrierManifold(
  mounts,
  options = {},
  registry,
) {
  return createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = routeCarrierManifold(mounts, request, options, registry);
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
}

export function serveCarrierManifoldAsync(
  mounts,
  options = {},
  registry,
) {
  return createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = await routeCarrierManifoldAsync(mounts, request, options, registry);
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
}
