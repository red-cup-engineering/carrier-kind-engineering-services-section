import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";

/**
 * HTTP server service bindings for metroplat action routers.
 *
 * `src/presentation` owns pure route decisions over induced apices. This service
 * module binds those routes to `node:http` sockets.
 */

import { once } from "node:events";

import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import {
  routeRequest,

} from "@red-cup-engineering/metroplat/presentation/serving";
import {
  routeSchemaNamespace,

} from "@red-cup-engineering/metroplat/presentation/mounting";

import { attachClaimSession } from "@red-cup-engineering/metroplat/http/ws-session";
import { bindHttpServerLifecycle } from "@red-cup-engineering/metroplat/http/lifecycle";
import { httpResources, routeHttpResource } from "@red-cup-engineering/metroplat/http/resource-router";
import { servedRequest } from "@red-cup-engineering/computer-web-server/platform-http/request";
import { routeOpenAIChatGuest } from "@red-cup-engineering/metroplat/http/openai-chat";
import { assertedHttpSubject } from "@red-cup-engineering/metroplat/http-options";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { SETTLEMENT_EXCHANGE_PATHS, settlementExchangeResponse } from "@red-cup-engineering/computer-system-engine/rpc/node";

export { bindHttpServerLifecycle } from "@red-cup-engineering/metroplat/http/lifecycle";

/**
 * Per-request dispatch identity: the gateway-asserted subject when the request
 * proves it (see `assertedHttpSubject`), else the process's own fixed subject.
 * The process subject invoking an operation asserted-only is refused downstream
 * by ordinary capability-standing authorization — no special-casing here.
 */
function requestDispatchOptions(req, options) {
  if (options.httpConfig === undefined) return options;
  const asserted = assertedHttpSubject(req.headers, options.httpConfig);
  if (asserted === undefined) return options;
  const baseCaller = isJsonRecord(options.caller) ? options.caller : {};
  return {
    ...options,
    subject: asserted,
    caller: { ...baseCaller, transport: "http", asserted: asserted !== options.subject },
  };
}

function claimSessionOptions(options) {
  return {
    ...(options.claimSession === undefined ? {} : { persistence: options.claimSession }),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    now: options.now,
  };
}

async function writeOpenAIChatGuestResponse(res, response) {
  res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
  if (typeof response.body === "string") {
    res.end(response.body);
    return;
  }
  try {
    for await (const chunk of response.body) {
      if (res.destroyed || res.writableEnded) return;
      if (!res.write(chunk)) {
        await Promise.race([once(res, "drain"), once(res, "close")]);
      }
    }
    if (!res.destroyed && !res.writableEnded) res.end();
  } catch (error) {
    if (!res.destroyed) res.destroy(error instanceof Error ? error : new Error(String(error)));
  }
}

export function serve(operations, options) {
  const inducedRef = options.induced;
  const journalFeed = options.journalFeed;
  const resources = httpResources(options);
  const server = createHttpServer({ handle: (req, res) => {
    void (async () => {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (pathname === "/v1/chat/completions" && options.openAIChat !== undefined) {
        const subscription = new AbortController();
        res.once("close", () => subscription.abort());
        const dispatchOptions = requestDispatchOptions(req, options);
        const response = await routeOpenAIChatGuest(
          await servedRequest(req),
          dispatchOptions,
          { ...options.openAIChat, subject: dispatchOptions.subject },
          { subscriptionSignal: subscription.signal },
        );
        await writeOpenAIChatGuestResponse(res, response);
        return;
      }
      const resourceResponse = await routeHttpResource(resources, req, res, options);
      if (resourceResponse !== undefined) {
        res.writeHead(resourceResponse.status, { "content-type": resourceResponse.type, ...(resourceResponse.headers ?? {}) });
        res.end(resourceResponse.body);
        return;
      }
      const request = await servedRequest(req);
      const induced = inducedRef ?? projectSurface(operations);
      const response = await routeRequest(induced, request, requestDispatchOptions(req, { ...options, journalFeed }));
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  } });
  attachClaimSession(server, claimSessionOptions(options));
  bindHttpServerLifecycle(server, options);
  return server;
}


export function serveSchemaNamespace(
  mounts,
  options,
) {
  const resources = httpResources(options);
  const server = createHttpServer({ handle: (req, res) => {
    void (async () => {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (options.settlementExchange !== undefined && req.method === "POST" && SETTLEMENT_EXCHANGE_PATHS.includes(pathname)) {
        const answer = await settlementExchangeResponse(req, options.settlementExchange);
        res.writeHead(answer.status, { "content-type": "application/json" });
        res.end(JSON.stringify(answer.value));
        return;
      }
      if (pathname === "/v1/chat/completions" && options.openAIChat !== undefined) {
        const subscription = new AbortController();
        res.once("close", () => subscription.abort());
        const dispatchOptions = requestDispatchOptions(req, options);
        const response = await routeOpenAIChatGuest(
          await servedRequest(req),
          dispatchOptions,
          { ...options.openAIChat, subject: dispatchOptions.subject },
          { subscriptionSignal: subscription.signal },
        );
        await writeOpenAIChatGuestResponse(res, response);
        return;
      }
      const resourceResponse = await routeHttpResource(resources, req, res, options);
      if (resourceResponse !== undefined) {
        res.writeHead(resourceResponse.status, { "content-type": resourceResponse.type, ...(resourceResponse.headers ?? {}) });
        res.end(resourceResponse.body);
        return;
      }
      const request = await servedRequest(req);
      const response = await routeSchemaNamespace(mounts, request, requestDispatchOptions(req, options));
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  } });
  attachClaimSession(server, claimSessionOptions(options));
  bindHttpServerLifecycle(server, options);
  return server;
}
