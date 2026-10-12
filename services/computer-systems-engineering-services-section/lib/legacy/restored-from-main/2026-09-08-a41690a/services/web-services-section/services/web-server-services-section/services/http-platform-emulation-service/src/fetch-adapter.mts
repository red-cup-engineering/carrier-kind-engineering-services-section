import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context, Middleware, WebApplication, WebFetchHandler } from "@red-cup-engineering/http-server-application-contract-service";
import { createFetchHandler } from "@red-cup-engineering/http-server-core-service/fetch";
import { toWebRequest, sendWebResponse, type SendWebResponseOptions as SendOptions } from "@red-cup-engineering/http-server-core-service/web-bridge";
export { toWebRequest, sendWebResponse };
export type { WebFetchHandler } from "@red-cup-engineering/http-server-application-contract-service";
export type FetchHandler = (request: Request, ctx: Context) => Response | null | undefined | Promise<Response | null | undefined>;
export type FromFetchOptions = { passThrough?: boolean; onError?: (error: unknown, req: IncomingMessage) => void };
export type FetchMiddleware = {
  (ctx: Context): Promise<boolean>;
  (req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<boolean>;
};
function fetchMiddleware(fetchHandler: FetchHandler, options: FromFetchOptions = {}): FetchMiddleware {
  const { passThrough = false, onError } = options;
  return (async (...args: [Context] | [IncomingMessage, ServerResponse, Context]) => {
    const ctx = args.length === 1 ? args[0] : args[2];
    const req = args.length === 1 ? ctx.req : args[0];
    const res = args.length === 1 ? ctx.res : args[1];
    let response: Response | null | undefined;

    try {
      response = await fetchHandler(toWebRequest(req, ctx), ctx);
    } catch (error) {
      try {
        onError?.(error, req);
      } catch {}
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      } else {
        try {
          res.end();
        } catch {}
      }
      return true;
    }

    if (response == null) {
      if (passThrough) return false;
      if (!res.headersSent) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not Found");
      }
      return true;
    }

    if (!(response instanceof Response)) {
      try {
        onError?.(new TypeError("fetch handler must return a Response"), req);
      } catch {}
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      } else {
        try {
          res.end();
        } catch {}
      }
      return true;
    }

    const sendOptions: SendOptions = {
      ...(req.method === undefined ? {} : { method: req.method }),
      ...(req.headers["accept-encoding"] === undefined ? {} : { acceptEncoding: req.headers["accept-encoding"] }),
      ...(req.headers.range === undefined ? {} : { range: req.headers.range }),
    };
    await sendWebResponse(res, response, sendOptions);
    return true;
  }) as FetchMiddleware;
}


/** Portable applications run directly; raw Node middleware is only admitted on Node. */
export function fromFetch(app: WebApplication): WebFetchHandler;
export function fromFetch(fetchHandler: FetchHandler, options?: FromFetchOptions): Middleware & FetchMiddleware;
export function fromFetch(input: WebApplication | FetchHandler, options: FromFetchOptions = {}): WebFetchHandler | (Middleware & FetchMiddleware) {
  return typeof input === "function" ? fetchMiddleware(input, options) as Middleware & FetchMiddleware : createFetchHandler(input);
}
