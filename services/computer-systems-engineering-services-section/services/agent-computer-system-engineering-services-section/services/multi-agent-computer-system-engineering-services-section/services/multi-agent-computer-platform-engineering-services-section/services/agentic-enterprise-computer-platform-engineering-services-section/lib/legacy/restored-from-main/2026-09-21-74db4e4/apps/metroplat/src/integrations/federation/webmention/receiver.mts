
/**
 * integrations/federation/webmention/receiver — the live `POST /webmention`
 * endpoint.
 *
 * A thin mount: reads the request body via `services/http`'s bounded body
 * reader, admits it through `admission/webmention`'s `receiveMentionRequest`,
 * and defaults its `verify`/`verifyVouch` dependencies to the live
 * `services/web/webmention-client` fetchers. No Webmention grammar or
 * verification law lives here.
 */
import { readTextBody } from "../../http/host-body-read.mts";
import { receiveMentionRequest, type ReceiveResult } from "./validation.mts";
import { verifyWebmention, verifyWebmentionVouch, type WebmentionClientOptions } from "./client.mts";
import type { Resource } from "../../http/index.mts";

export interface WebmentionReceiverOptions extends WebmentionClientOptions {
  readonly baseUrl: string;
  readonly path?: string;
  readonly requireVouch?: boolean;
  readonly maxBodyBytes?: number;
  readonly onMention?: (result: ReceiveResult) => void | Promise<void>;
}

/** Build the `POST /webmention` Resource; register it in a server's `options.resources`. */
export function webmentionReceiverResource(opts: WebmentionReceiverOptions): Resource {
  const path = opts.path ?? "/webmention";
  const maxBytes = opts.maxBodyBytes ?? 1024 * 1024;
  const fetchOpts: WebmentionClientOptions = opts.fetch === undefined ? {} : { fetch: opts.fetch };
  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.webmention.receiver",
    name: "Webmention Receiver",
    methods: Object.freeze(["POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      const req = ctx.req as import("node:http").IncomingMessage;
      let raw: string;
      try {
        raw = (await readTextBody(req, { maxBytes })).value;
      } catch {
        return { status: 413, type: "application/json; charset=utf-8", body: JSON.stringify({ error: "request body too large" }) };
      }
      const contentType = req.headers["content-type"];
      const result = await receiveMentionRequest(raw, Array.isArray(contentType) ? contentType[0] : contentType, {
        baseUrl: opts.baseUrl,
        ...(opts.requireVouch === undefined ? {} : { requireVouch: opts.requireVouch }),
        verify: (source, target) => verifyWebmention(source, target, fetchOpts),
        verifyVouch: (vouch, source, target) => verifyWebmentionVouch(vouch, source, target, fetchOpts),
      });
      if (result.accepted) await opts.onMention?.(result);
      return { status: result.status, type: "application/json; charset=utf-8", body: `${JSON.stringify(result)}\n` };
    },
  });
}
