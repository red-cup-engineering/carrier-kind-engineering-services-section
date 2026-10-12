
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

import { readFormBody, readJsonBody } from "@red-cup-engineering/computer-web-server/platform-http/host-body-read";
import { parseContentType } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
import {
  micropubCommandStatements,
  micropubConfigResponse,
  parseMicropubForm,
  parseMicropubJson,

} from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/micropub/codec";

import { authorizeBearerToken } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/validation";
import { authorizeMicropubAction } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/micropub/validation";

function jsonRepr(status, body, headers = {}) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store", ...headers }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx) {
  return ctx.req;
}

function requestedSourceProperties(params) {
  return Object.freeze([...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean).sort());
}

function sourceResponse(source, requested) {
  if (requested.length === 0) return { type: source.type, properties: source.properties };
  const properties = {};
  for (const property of requested) if (source.properties[property] !== undefined) properties[property] = source.properties[property];
  return { type: source.type, properties };
}

async function readCommand(ctx, maxBodyBytes) {
  const contentType = parseContentType(req(ctx).headers["content-type"]);
  if (contentType?.type === "application/json") {
    return parseMicropubJson((await readJsonBody(req(ctx), { maxBytes: maxBodyBytes, empty: {} })).value);
  }
  return parseMicropubForm((await readFormBody(req(ctx), { maxBytes: maxBodyBytes })).value);
}

/** Build the `GET`/`POST /micropub` Resource. */
export function micropubResource(opts) {
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
          const auth = authorizeBearerToken(req(ctx).headers["authorization"], opts.secret, { now: opts.now() });
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

      let command;
      try {
        command = await readCommand(ctx, maxBodyBytes);
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
      const auth = authorizeMicropubAction(req(ctx).headers["authorization"], opts.secret, command.action, { now: opts.now() });
      if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason }, auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : {});

      const result = await opts.write(command, auth.claims);
      const location = result.url ?? command.url;
      const status = command.action === "create" ? 201 : 200;

      // The journal projection needs a subject; a create only has one once
      // `write` assigns its URL, so recording happens after the write, not
      // before it.
      let statementCount;
      if (location !== undefined) {
        try {
          statementCount = micropubCommandStatements(command, { subject: location, source: auth.claims.me, now: opts.now }).length;
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
