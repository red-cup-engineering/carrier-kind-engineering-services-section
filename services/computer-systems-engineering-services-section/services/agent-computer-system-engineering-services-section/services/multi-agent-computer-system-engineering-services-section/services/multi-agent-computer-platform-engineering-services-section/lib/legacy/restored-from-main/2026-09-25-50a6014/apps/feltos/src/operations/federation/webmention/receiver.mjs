
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
import { readTextBody } from "@red-cup-engineering/computer-web-server/platform-http/host-body-read";
import { receiveMentionRequest } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/webmention/validation";
import { verifyWebmention, verifyWebmentionVouch } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/webmention/client";

/** Build the `POST /webmention` Resource; register it in a server's `options.resources`. */
export function webmentionReceiverResource(opts) {
  const path = opts.path ?? "/webmention";
  const maxBytes = opts.maxBodyBytes ?? 1024 * 1024;
  const fetchOpts = opts.fetch === undefined ? {} : { fetch: opts.fetch };
  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.webmention.receiver",
    name: "Webmention Receiver",
    methods: Object.freeze(["POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      const req = ctx.req;
      let raw;
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
