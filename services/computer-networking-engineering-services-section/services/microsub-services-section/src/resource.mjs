/**
 * Microsub's live `GET`/`POST /microsub` endpoint over this section's codec and timeline. A bearer
 * token is checked by the caller's `verifyToken(token)` (IndieAuth's `tokenVerifier`, say), whose
 * claims name the reader (`me`); the caller's `store` holds channels and entries, and `observe`
 * receives each mutation as a SignGraph relation-web observation.
 */

import { readFormBody } from "@red-cup-engineering/http-services-section/body";
import { bearerToken } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/bearer-authentication";
import {
  mutationObservation,
  mutationRequest,
  searchRequest,
  timelineRequest,

} from "./codec.mjs";
import { microsubTimeline } from "./timeline.mjs";

function jsonRepr(status, body, headers = {}) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store", ...headers }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx) {
  return ctx.req;
}

function mutationHandler(action, store) {
  if (action === "mark_read") return store.markRead;
  if (action === "mark_unread") return store.markUnread;
  if (action === "mark_starred") return store.markStarred;
  if (action === "mark_unstarred") return store.markUnstarred;
  return undefined;
}

async function authorize(ctx, opts) {
  const token = bearerToken(req(ctx).headers["authorization"]);
  if (!token) return { ok: false, status: 401, reason: "a bearer token is required" };
  let claims;
  try { claims = await opts.verifyToken(token); } catch { claims = null; }
  return claims ? { ok: true, token, claims, subject: claims.me ?? claims.client_id } : { ok: false, status: 401, reason: "bearer token verification failed" };
}

/** Build the `GET`/`POST /microsub` Resource. */
export function microsubResource(opts) {
  if (typeof opts.verifyToken !== "function") throw new TypeError("Microsub requires verifyToken(token)");
  const path = opts.path ?? "/microsub";
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit = opts.maxLimit ?? 100;
  const maxBodyBytes = opts.maxBodyBytes ?? 64_000;
  const base = "http://localhost";

  return Object.freeze({
    match: path,
    route: path,
    id: "microsub.endpoint",
    name: "Microsub Endpoint",
    methods: Object.freeze(["GET", "POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      const auth = await authorize(ctx, opts);
      if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason }, auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : {});

      try {
        if (req(ctx).method === "GET") {
          const query = ctx.url.searchParams.get("q") ?? "channels";
          if (query === "config") {
            return jsonRepr(200, {
              channels: true,
              timeline: true,
              search: Boolean(opts.store.search),
              actions: ["mark_read", "mark_unread", "mark_starred", "mark_unstarred"],
            });
          }
          if (query === "channels") return jsonRepr(200, { channels: await opts.store.channels(auth) });
          if (query === "timeline") {
            const request = timelineRequest(ctx.url.searchParams, defaultLimit, maxLimit);
            const entries = await opts.store.entries(request.channel, auth);
            const timeline = microsubTimeline(entries, { base, path, limit: request.limit, ...(request.before === undefined ? {} : { before: request.before }), ...(request.after === undefined ? {} : { after: request.after }) });
            return jsonRepr(200, timeline);
          }
          if (query === "search" && opts.store.search !== undefined) {
            const request = searchRequest(ctx.url.searchParams, defaultLimit, maxLimit);
            const entries = await opts.store.search(request.query, request.channel, auth);
            const timeline = microsubTimeline(entries, { base, path, limit: request.limit });
            return jsonRepr(200, timeline);
          }
          return jsonRepr(400, { error: "unsupported_query" });
        }

        const form = await readFormBody(req(ctx), { maxBytes: maxBodyBytes });
        const action = form.get("action") ?? "";
        const handler = mutationHandler(action, opts.store);
        if (handler === undefined) return jsonRepr(400, { error: "unsupported_action" });
        const request = mutationRequest(form);
        const result = await handler(request, auth);
        if (auth.subject !== undefined) await opts.observe?.(mutationObservation(action, request, auth.subject));
        return jsonRepr(200, result);
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
    },
  });
}
