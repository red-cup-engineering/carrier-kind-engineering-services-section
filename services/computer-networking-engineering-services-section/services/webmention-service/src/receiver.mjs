/**
 * Webmention's live `POST /webmention` endpoint: a bounded form-encoded body, admitted by this
 * directory's validation (the target on this site by `baseUrl` or in the caller's custody by
 * `ownsTarget`, a vouch when required), verified by its client unless the caller supplies `verify`,
 * and an accepted mention handed to the caller's `custody({ source, target, verdict, receivedAt, observation })`,
 * the observation being the mention as a SignGraph relation-web batch.
 */
import { readTextBody } from "@red-cup-engineering/http-services-section/body";
import { receiveMentionRequest } from "./validation.mjs";
import { verifyWebmention, verifyWebmentionVouch } from "./client.mjs";
import { mentionObservation } from "./codec.mjs";

const json = (status, value) => ({ status, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(value)}\n` });

/** The `POST /webmention` resource. */
export function webmentionReceiverResource(opts) {
  const path = opts.path ?? "/webmention";
  const maxBytes = opts.maxBodyBytes ?? 64 * 1024;
  const network = { ...(opts.fetch === undefined ? {} : { fetch: opts.fetch }), ...(opts.network === undefined ? {} : { network: opts.network }) };
  const now = opts.now ?? (() => new Date());
  return Object.freeze({
    match: path,
    route: path,
    id: "webmention.receiver",
    name: "Webmention Receiver",
    methods: Object.freeze(["POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      const header = ctx.req.headers["content-type"];
      const contentType = Array.isArray(header) ? header[0] : header;
      if (!String(contentType ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded")) return json(415, { error: "expected application/x-www-form-urlencoded" });
      let raw;
      try {
        raw = await readTextBody(ctx.req, { maxBytes });
      } catch {
        return json(413, { error: "request body too large or invalid" });
      }
      const result = await receiveMentionRequest(raw, contentType, {
        ...(opts.baseUrl === undefined ? {} : { baseUrl: opts.baseUrl }),
        ...(opts.ownsTarget === undefined ? {} : { ownsTarget: opts.ownsTarget }),
        ...(opts.requireVouch === undefined ? {} : { requireVouch: opts.requireVouch }),
        verify: opts.verify ?? ((source, target) => verifyWebmention(source, target, network)),
        verifyVouch: (vouch, source, target) => verifyWebmentionVouch(vouch, source, target, network),
      });
      if (result.accepted && opts.custody !== undefined) {
        try {
          const receivedAt = now().toISOString();
          const observation = mentionObservation(result, { endpoint: path, receivedAt });
          await opts.custody(Object.freeze({ source: result.request.source, target: result.request.target, verdict: result.verdict, receivedAt, observation }));
        } catch (error) {
          return json(500, { ...result, accepted: false, reason: `custody failed: ${error instanceof Error ? error.message : String(error)}` });
        }
      }
      if (result.accepted) await opts.onMention?.(result);
      return json(result.status, result);
    },
  });
}

/** The receiver as an application of one resource. */
export function webmentionReceiverApp(opts) {
  return { resources: [webmentionReceiverResource(opts)] };
}
