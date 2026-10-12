/**
 * Micropub's live endpoints: `GET`/`POST /micropub` (the config, syndicate-to and source queries,
 * and create, update, delete and undelete commands) and, when the caller can store media,
 * `POST /micropub/media`. Every request bears a token, checked by the caller's `verifyToken(token)`
 * (IndieAuth's `tokenVerifier`, or any token system; its claims carry `scope`, `me`, `client_id`).
 * The caller's `write(command, authorization)` persists and returns `{ url }` for a create, and
 * `observe(observation)` receives each command as a SignGraph relation-web observation.
 */
import { BodyReadError, readFormBody, readJsonBody, readMultipartBody } from "@red-cup-engineering/http-services-section/body";
import { bearerChallenge, bearerToken } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/bearer-authentication";
import { parseContentType } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-type";
import { MEDIA_SCOPES, REQUIRED_SCOPE, micropubCommandObservation, micropubConfigResponse, parseMicropubForm, parseMicropubJson, scopeAllows } from "./codec.mjs";

const message = (error) => error instanceof Error ? error.message : String(error);

function json(status, body, headers = {}) {
  return { status, headers, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(body)}\n` };
}

const problem = (status, error, description, headers = {}) => json(status, { error, error_description: description }, headers);

function authProblem(status, opts, error, description) {
  return problem(status, error, description, { "www-authenticate": bearerChallenge({ realm: opts.realm ?? "micropub", error, errorDescription: description }) });
}

/** The request's authorization, or the problem response refusing it. */
async function authorize(ctx, opts) {
  const token = bearerToken(ctx.req.headers.authorization);
  if (!token) return authProblem(401, opts, "invalid_token", "a bearer token is required");
  let claims;
  try { claims = await opts.verifyToken(token); } catch { claims = null; }
  if (!claims) return authProblem(401, opts, "invalid_token", "bearer token verification failed");
  const subject = claims.me || claims.client_id || undefined;
  return Object.freeze({ token, claims, ...(subject ? { subject } : {}) });
}

const granted = (claims) => Array.isArray(claims.scope) ? claims.scope : String(claims.scope ?? "").split(/\s+/).filter(Boolean);

async function readCommand(ctx, maxBytes) {
  const contentType = parseContentType(ctx.req.headers["content-type"]);
  if (contentType?.type === "application/json") return parseMicropubJson(await readJsonBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes, empty: {} }));
  if (contentType?.type === "application/x-www-form-urlencoded") return parseMicropubForm(await readFormBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes }));
  throw new TypeError("expected application/json or application/x-www-form-urlencoded");
}

function requestedProperties(params) {
  return Object.freeze([...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean));
}

function sourceResponse(source, requested) {
  if (requested.length === 0) return source;
  return { type: source.type, properties: Object.fromEntries(requested.flatMap((key) => source.properties[key] === undefined ? [] : [[key, source.properties[key]]])) };
}

async function query(ctx, opts) {
  const authorization = await authorize(ctx, opts);
  if (!("token" in authorization)) return authorization;
  const name = ctx.url.searchParams.get("q");
  if (name === "config") return json(200, micropubConfigResponse(opts.config));
  if (name === "syndicate-to") return json(200, { "syndicate-to": opts.config?.["syndicate-to"] ?? [] });
  if (name !== "source") return problem(400, "invalid_request", "unsupported Micropub query");
  if (!opts.source) return problem(501, "invalid_request", "source query is not configured");
  const url = ctx.url.searchParams.get("url");
  if (!url) return problem(400, "invalid_request", "url is required");
  const requested = requestedProperties(ctx.url.searchParams);
  const source = await opts.source(url, authorization, requested);
  return source ? json(200, sourceResponse(source, requested)) : problem(404, "not_found", "source was not found");
}

async function mutate(ctx, opts, maxBytes) {
  const authorization = await authorize(ctx, opts);
  if (!("token" in authorization)) return authorization;
  let command;
  try { command = await readCommand(ctx, maxBytes); }
  catch (error) { return problem(error instanceof BodyReadError ? error.status : error instanceof RangeError ? 413 : 400, "invalid_request", message(error)); }
  if (!scopeAllows(command.action, granted(authorization.claims))) {
    return authProblem(403, opts, "insufficient_scope", `${command.action} requires ${REQUIRED_SCOPE[command.action].join(" or ")}`);
  }
  let result;
  try { result = await opts.write(command, authorization); }
  catch { return problem(500, "server_error", "writer failed"); }
  const location = result?.url ?? command.url;
  if (command.action === "create" && !location) return problem(500, "server_error", "create writer did not return a URL");
  let statementCount;
  if (location) {
    try {
      const observation = micropubCommandObservation(command, { subject: location, source: authorization.subject, ...(opts.now ? { now: opts.now } : {}) });
      statementCount = observation.relations.length;
      await opts.observe?.(observation);
    } catch { statementCount = undefined; }
  }
  if (command.action !== "create") return { status: 204, cacheControl: { noStore: true }, body: "" };
  return json(201, { action: command.action, url: location, ...(statementCount === undefined ? {} : { statementCount }) }, { location });
}

async function media(ctx, opts, maxBytes) {
  const authorization = await authorize(ctx, opts);
  if (!("token" in authorization)) return authorization;
  if (!granted(authorization.claims).some((scope) => MEDIA_SCOPES.includes(scope))) return authProblem(403, opts, "insufficient_scope", `media requires ${MEDIA_SCOPES.join(" or ")}`);
  let form;
  try { form = await readMultipartBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes }); }
  catch (error) { return problem(error instanceof BodyReadError ? error.status : error instanceof RangeError ? 413 : 400, "invalid_request", message(error)); }
  const part = form.file("file") ?? form.files[0];
  if (!part) return problem(400, "invalid_request", "media endpoint requires a multipart file field");
  try {
    const result = await opts.writeMedia(Object.freeze({ field: part.name, ...(part.filename === undefined ? {} : { filename: part.filename }),
      ...(part.contentType === undefined ? {} : { contentType: part.contentType }), data: part.data, fields: form.fields, part }), authorization);
    return json(201, { url: result.url }, { location: result.url });
  } catch {
    return problem(500, "server_error", "media writer failed");
  }
}

function requireAuth(opts) {
  if (typeof opts.verifyToken !== "function") throw new TypeError("Micropub requires verifyToken(token)");
  if (typeof opts.write !== "function") throw new TypeError("Micropub requires write(command, authorization)");
}

/** The `GET`/`POST /micropub` resource. */
export function micropubResource(opts) {
  requireAuth(opts);
  const path = opts.path ?? "/micropub";
  const maxBytes = opts.maxBodyBytes ?? 256 * 1024;
  return Object.freeze({ id: "micropub.endpoint", name: "Micropub Endpoint", route: path, match: path,
    methods: Object.freeze(["GET", "POST"]), produces: Object.freeze(["application/json"]),
    handler: (ctx) => ctx.req.method === "GET" ? query(ctx, opts) : mutate(ctx, opts, maxBytes) });
}

/** The `POST /micropub/media` resource, storing uploads with the caller's `writeMedia(input, authorization)`. */
export function micropubMediaResource(opts) {
  requireAuth(opts);
  const path = opts.mediaPath ?? "/micropub/media";
  const maxBytes = opts.maxMediaBytes ?? 10 * 1024 * 1024;
  return Object.freeze({ id: "micropub.media", name: "Micropub Media Endpoint", route: path, match: path,
    methods: Object.freeze(["POST"]), produces: Object.freeze(["application/json"]), handler: (ctx) => media(ctx, opts, maxBytes) });
}

/** The Micropub application: the endpoint, and the media endpoint when `writeMedia` is given. */
export function micropubApp(opts) {
  return { resources: [micropubResource(opts), ...(opts.writeMedia ? [micropubMediaResource(opts)] : [])] };
}
