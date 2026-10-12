
/**
 * HTTP server service bindings for metroplat action routers.
 *
 * `src/presentation` owns pure route decisions over induced apices. This service
 * module binds those routes to `node:http` sockets.
 */
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import type { Operation } from "../../../rpc/index.mts";
import { projectSurface, type ProjectedSurface } from "../../../presentation/surface.mts";
import {
  routeRequest,
  type ServeOptions,
} from "../../../presentation/serving.mts";
import {
  routeSchemaNamespace,
  type SchemaNamespaceRouteOptions,
  type SchemaMount,
} from "../../../presentation/mounting.mts";
import type { ServiceLifecycleEvent } from "../../../integrations/process/services/lifecycle-schema/schema.mts";
import { attachClaimSession, type ClaimSessionAttachOptions, type ClaimSessionPersistence } from "./ws-session.mts";
import { bindHttpServerLifecycle, type HttpLifecycleOptions } from "./lifecycle.mts";
import { httpResources, routeHttpResource, type HttpResourceServiceOptions } from "./resource-router.mts";
import { servedRequest } from "../../../integrations/http/request.mts";
import { routeOpenAIChatGuest, type OpenAIChatGuestOptions, type OpenAIChatGuestResponse } from "./openai-chat.mts";

export { bindHttpServerLifecycle } from "./lifecycle.mts";

export interface HttpServiceOptions extends HttpLifecycleOptions, HttpResourceServiceOptions {
  readonly claimSession?: ClaimSessionPersistence | undefined;
  readonly lifecycle?: ((event: ServiceLifecycleEvent) => void) | undefined;
  readonly openAIChat?: OpenAIChatGuestOptions | undefined;
}

function claimSessionOptions(options: HttpServiceOptions): ClaimSessionAttachOptions {
  return {
    ...(options.claimSession === undefined ? {} : { persistence: options.claimSession }),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
  };
}

async function writeOpenAIChatGuestResponse(res: import("node:http").ServerResponse, response: OpenAIChatGuestResponse): Promise<void> {
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

export function serve(operations: readonly Operation[], options: ServeOptions & HttpServiceOptions & { readonly induced?: ProjectedSurface }): Server {
  const inducedRef = options.induced;
  const journalFeed = options.journalFeed;
  const resources = httpResources(options);
  const server = createServer((req, res) => {
    void (async () => {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (pathname === "/v1/chat/completions" && options.openAIChat !== undefined) {
        const subscription = new AbortController();
        res.once("close", () => subscription.abort());
        const response = await routeOpenAIChatGuest(await servedRequest(req), options, options.openAIChat, { subscriptionSignal: subscription.signal });
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
      const response = await routeRequest(induced, request, { ...options, journalFeed });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server, claimSessionOptions(options));
  bindHttpServerLifecycle(server, options);
  return server;
}

export function serveSchemaNamespace(
  mounts: readonly SchemaMount[],
  options: SchemaNamespaceRouteOptions & HttpServiceOptions,
): Server {
  const resources = httpResources(options);
  const server = createServer((req, res) => {
    void (async () => {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (pathname === "/v1/chat/completions" && options.openAIChat !== undefined) {
        const subscription = new AbortController();
        res.once("close", () => subscription.abort());
        const response = await routeOpenAIChatGuest(await servedRequest(req), options, options.openAIChat, { subscriptionSignal: subscription.signal });
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
      const response = await routeSchemaNamespace(mounts, request, options);
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server, claimSessionOptions(options));
  bindHttpServerLifecycle(server, options);
  return server;
}
