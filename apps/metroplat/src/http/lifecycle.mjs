

/**
 * Node HTTP listener lifecycle observations.
 */

import { serviceLifecycleEvent } from "@red-cup-engineering/node-process-services-section/lifecycle";

function emitHttpLifecycle(
  options,
  event,
  detail,
  ok = true,
) {
  if (options.lifecycle === undefined) return;
  options.lifecycle(serviceLifecycleEvent({
    service: "services/http/server",
    boundary: event === "upgrade" ? "websocket-upgrade" : "http-listener",
    event,
    ok,
    at: options.now(),
    ...(detail === undefined ? {} : { detail }),
    evidence: ["services/http/lifecycle.mts", "services/http/server.mts"],
  }));
}

export function bindHttpServerLifecycle(server, options = {}) {
  if (options.lifecycle === undefined) return server;
  server.on("listening", () => {
    emitHttpLifecycle(options, "listening", { address: server.address() });
  });
  server.on("close", () => {
    emitHttpLifecycle(options, "close");
  });
  server.on("error", (error) => {
    emitHttpLifecycle(options, "error", error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }, false);
  });
  server.on("upgrade", (req) => {
    emitHttpLifecycle(options, "upgrade", { method: req.method ?? "GET", url: req.url ?? "/" });
  });
  return server;
}
