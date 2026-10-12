
/**
 * integrations/federation/micropub/service — the live Micropub `GET`/`POST
 * `/micropub` endpoint.
 *
 * A thin mount: command grammar comes from `codecs/text/micropub`, the
 * bearer/scope gate from `admission/micropub` (itself a thin reuse of
 * `admission/indieauth`). This module owns only the HTTP binding — the
 * caller-supplied `write` function owns actual persistence, matching how
 * `services/web/webmention-receiver` takes its verification dependency rather
 * than embedding a store.
 */
import type { IncomingMessage } from "node:http";
import { readFormBody, readJsonBody } from "../../http/host-body-read.mts";
import { parseContentType } from "../../http/codec/index.mts";
import {
  micropubCommandStatements,
  micropubConfigResponse,
  parseMicropubForm,
  parseMicropubJson,
  type MicropubCommand,
  type MicropubConfig,
} from "./codec.mts";
import type { IndieAuthTokenClaims } from "../indieauth/codec.mts";
import { authorizeBearerToken } from "../indieauth/validation.mts";
import { authorizeMicropubAction } from "./validation.mts";
import type { Context, Resource } from "../../http/index.mts";

export interface MicropubWriteResult {
  readonly url?: string;
}

export type MicropubWriter = (
  command: MicropubCommand,
  claims: IndieAuthTokenClaims,
) => MicropubWriteResult | Promise<MicropubWriteResult>;

export type MicropubSourceReader = (
  url: string,
  properties: readonly string[],
) => MicropubCommand | undefined | Promise<MicropubCommand | undefined>;

export interface MicropubServerOptions {
  readonly secret: string;
  readonly write: MicropubWriter;
  readonly source?: MicropubSourceReader;
  readonly path?: string;
  readonly config?: MicropubConfig;
  readonly maxBodyBytes?: number;
}

function jsonRepr(status: number, body: unknown, headers: Record<string, string> = {}) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store", ...headers }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx: Context): IncomingMessage {
  return ctx.req as IncomingMessage;
}

function requestedSourceProperties(params: URLSearchParams): readonly string[] {
  return Object.freeze([...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean).sort());
}

function sourceResponse(source: MicropubCommand, requested: readonly string[]): unknown {
  if (requested.length === 0) return { type: source.type, properties: source.properties };
  const properties: Record<string, readonly unknown[]> = {};
  for (const property of requested) if (source.properties[property] !== undefined) properties[property] = source.properties[property]!;
  return { type: source.type, properties };
}

async function readCommand(ctx: Context, maxBodyBytes: number): Promise<MicropubCommand> {
  const contentType = parseContentType(req(ctx).headers["content-type"]);
  if (contentType?.type === "application/json") {
    return parseMicropubJson((await readJsonBody(req(ctx), { maxBytes: maxBodyBytes, empty: {} })).value);
  }
  return parseMicropubForm((await readFormBody(req(ctx), { maxBytes: maxBodyBytes })).value);
}

/** Build the `GET`/`POST /micropub` Resource. */
export function micropubResource(opts: MicropubServerOptions): Resource {
  const path = opts.path ?? "/micropub";
  const maxBodyBytes = opts.maxBodyBytes ?? 262_144;
  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.micropub.endpoint",
    name: "Micropub Endpoint",
    methods: Object.freeze(["GET", "POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      if (req(ctx).method === "GET") {
        const query = ctx.url.searchParams.get("q");
        if (query === "config") return jsonRepr(200, micropubConfigResponse(opts.config));
        if (query === "syndicate-to") return jsonRepr(200, { "syndicate-to": opts.config?.["syndicate-to"] ?? [] });
        if (query === "source") {
          const auth = authorizeBearerToken(req(ctx).headers["authorization"], opts.secret);
          if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason });
          if (opts.source === undefined) return jsonRepr(501, { error: "source query is not configured" });
          const url = ctx.url.searchParams.get("url");
          if (url === null) return jsonRepr(400, { error: "url is required" });
          const source = await opts.source(url, requestedSourceProperties(ctx.url.searchParams));
          if (source === undefined) return jsonRepr(404, { error: "source not found" });
          return jsonRepr(200, sourceResponse(source, requestedSourceProperties(ctx.url.searchParams)));
        }
        return jsonRepr(400, { error: "unsupported_query" });
      }

      let command: MicropubCommand;
      try {
        command = await readCommand(ctx, maxBodyBytes);
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
      const auth = authorizeMicropubAction(req(ctx).headers["authorization"], opts.secret, command.action);
      if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason }, auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : {});

      const result = await opts.write(command, auth.claims!);
      const location = result.url ?? command.url;
      const status = command.action === "create" ? 201 : 200;

      // The journal projection needs a subject; a create only has one once
      // `write` assigns its URL, so recording happens after the write, not
      // before it.
      let statementCount: number | undefined;
      if (location !== undefined) {
        try {
          statementCount = micropubCommandStatements(command, { subject: location, source: auth.claims!.me }).length;
        } catch {
          statementCount = undefined;
        }
      }
      return jsonRepr(
        status,
        { action: command.action, url: location, ...(statementCount === undefined ? {} : { statementCount }) },
        location === undefined ? {} : { Location: location },
      );
    },
  });
}
