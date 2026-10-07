// Moved down from computer-web-server (pipeline.mjs): bridging a Node
// request/response pair to a compiled web application's `fetch` is generic
// transport wiring over this package's own web-bridge and node-request, not
// specific to the web server.
import { toWebRequest, sendWebResponse } from "./web-bridge.mjs";
import { requestAbortSignal, requestTarget, requestBase } from "./node-request.mjs";
export function handler(engine, transport = {}) {
    if (!engine || typeof engine.fetch !== "function" || !engine.specification) throw new TypeError("Node transport requires a constructed web engine");
    return (req, res)=>{
        void (async ()=>{
            const url = new URL(requestTarget(req.url ?? "/"), requestBase(req, transport));
            const request = toWebRequest(req, {
                url,
                signal: requestAbortSignal(req, res),
                response: res
            });
            const response = await engine.fetch(request, {
                ...req.socket.remoteAddress ? {
                    remoteAddress: req.socket.remoteAddress
                } : {},
                httpVersion: req.httpVersion
            });
            await sendWebResponse(res, response, {
                method: req.method ?? "GET"
            });
        })().catch((error)=>{
            if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
            else res.destroy(error instanceof Error ? error : undefined);
        });
    };
}
