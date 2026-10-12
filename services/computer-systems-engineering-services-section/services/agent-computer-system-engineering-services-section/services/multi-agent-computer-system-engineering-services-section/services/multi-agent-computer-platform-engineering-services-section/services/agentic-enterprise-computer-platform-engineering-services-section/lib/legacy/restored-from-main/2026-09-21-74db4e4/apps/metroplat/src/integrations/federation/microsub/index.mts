
/**
 * integrations/federation/microsub — the live `GET`/`POST /microsub`
 * endpoint.
 *
 * A thin mount: request grammar comes from `codecs/text/microsub`, the
 * timeline page from `integrations/web/core/microsub/timeline` (itself over the
 * shared cursor-pagination law), and the bearer gate directly from
 * `admission/indieauth`'s `authorizeBearerToken` — Microsub adds no
 * authorization law of its own. The caller-supplied `store` owns actual
 * channel/entry persistence, matching `services/web/micropub`'s injected
 * writer.
 */
export * from "./codec.mts";
export * from "./timeline.mts";

import type { IncomingMessage } from "node:http";
import { readFormBody } from "../../http/host-body-read.mts";
import {
  mutationRequest,
  searchRequest,
  timelineRequest,
  type MicrosubChannel,
  type MicrosubEntry,
  type MicrosubMutationRequest,
} from "./codec.mts";
import { microsubTimeline, type MicrosubTimeline } from "./timeline.mts";
import { authorizeBearerToken, type BearerAuthorization } from "../indieauth/validation.mts";
import type { Context, Resource } from "../../http/index.mts";

export interface MicrosubMutationResult {
  readonly updated: number;
}

export interface MicrosubStore {
  readonly channels: (auth: BearerAuthorization) => readonly MicrosubChannel[] | Promise<readonly MicrosubChannel[]>;
  readonly entries: (channel: string, auth: BearerAuthorization) => readonly MicrosubEntry[] | Promise<readonly MicrosubEntry[]>;
  readonly search?: (query: string, channel: string | undefined, auth: BearerAuthorization) => readonly MicrosubEntry[] | Promise<readonly MicrosubEntry[]>;
  readonly markRead?: (request: MicrosubMutationRequest, auth: BearerAuthorization) => MicrosubMutationResult | Promise<MicrosubMutationResult>;
  readonly markUnread?: (request: MicrosubMutationRequest, auth: BearerAuthorization) => MicrosubMutationResult | Promise<MicrosubMutationResult>;
  readonly markStarred?: (request: MicrosubMutationRequest, auth: BearerAuthorization) => MicrosubMutationResult | Promise<MicrosubMutationResult>;
  readonly markUnstarred?: (request: MicrosubMutationRequest, auth: BearerAuthorization) => MicrosubMutationResult | Promise<MicrosubMutationResult>;
}

export interface MicrosubServerOptions {
  readonly secret: string;
  readonly store: MicrosubStore;
  readonly path?: string;
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
  readonly maxBodyBytes?: number;
}

function jsonRepr(status: number, body: unknown, headers: Record<string, string> = {}) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store", ...headers }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx: Context): IncomingMessage {
  return ctx.req as IncomingMessage;
}

function mutationHandler(action: string, store: MicrosubStore): MicrosubStore["markRead"] | undefined {
  if (action === "mark_read") return store.markRead;
  if (action === "mark_unread") return store.markUnread;
  if (action === "mark_starred") return store.markStarred;
  if (action === "mark_unstarred") return store.markUnstarred;
  return undefined;
}

/** Build the `GET`/`POST /microsub` Resource. */
export function microsubResource(opts: MicrosubServerOptions): Resource {
  const path = opts.path ?? "/microsub";
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit = opts.maxLimit ?? 100;
  const maxBodyBytes = opts.maxBodyBytes ?? 64_000;
  const base = "http://localhost";

  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.microsub.endpoint",
    name: "Microsub Endpoint",
    methods: Object.freeze(["GET", "POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      const auth = authorizeBearerToken(req(ctx).headers["authorization"], opts.secret);
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
            const timeline: MicrosubTimeline = microsubTimeline(entries, { base, path, limit: request.limit, ...(request.before === undefined ? {} : { before: request.before }), ...(request.after === undefined ? {} : { after: request.after }) });
            return jsonRepr(200, timeline);
          }
          if (query === "search" && opts.store.search !== undefined) {
            const request = searchRequest(ctx.url.searchParams, defaultLimit, maxLimit);
            const entries = await opts.store.search(request.query, request.channel, auth);
            const timeline: MicrosubTimeline = microsubTimeline(entries, { base, path, limit: request.limit });
            return jsonRepr(200, timeline);
          }
          return jsonRepr(400, { error: "unsupported_query" });
        }

        const form = (await readFormBody(req(ctx), { maxBytes: maxBodyBytes })).value;
        const action = form.get("action") ?? "";
        const handler = mutationHandler(action, opts.store);
        if (handler === undefined) return jsonRepr(400, { error: "unsupported_action" });
        return jsonRepr(200, await handler(mutationRequest(form), auth));
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
    },
  });
}
