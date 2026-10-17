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
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";
import { MEDIA_SCOPES, REQUIRED_SCOPE, micropubCommandObservation, micropubConfigResponse, micropubFormAccessToken, parseMicropubForm, parseMicropubJson, scopeAllows } from "./codec.mjs";
import { applyMicropubUpdate, micropubChangeRelations, micropubSourceResponse } from "./source.mjs";

const message = (error) => error instanceof Error ? error.message : String(error);

function json(status, body, headers = {}) {
  return { status, headers, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(body)}\n` };
}

const problem = (status, error, description, headers = {}) => json(status, { error, error_description: description }, headers);

/** The Micropub error response (3.8) with its RFC 6750 challenge: 401 unauthorized and insufficient_scope, 403 forbidden. */
function authProblem(status, opts, error, description, scope) {
  const rfc = error === "insufficient_scope" ? { error, errorDescription: description, ...(scope ? { scope } : {}) } : {};
  return json(status, { error, error_description: description, ...(scope ? { scope } : {}) },
    { "www-authenticate": bearerChallenge({ realm: opts.realm ?? "micropub", ...rfc }) });
}

/**
 * The request's authorization, or the problem response refusing it. The token is in the Authorization
 * header or, for form requests, the `access_token` parameter -- servers MUST accept both (Micropub 2.1.3),
 * and RFC 6750 2 forbids using more than one method in a request.
 */
async function authorize(ctx, opts, formToken) {
  const headerToken = bearerToken(ctx.req.headers.authorization);
  if (headerToken && formToken) return problem(400, "invalid_request", "send the access token by one method only");
  const token = headerToken || formToken;
  if (!token) return authProblem(401, opts, "unauthorized", "no access token was provided");
  let claims;
  try { claims = await opts.verifyToken(token); } catch { claims = null; }
  if (!claims) return authProblem(403, opts, "forbidden", "the access token is not valid for this endpoint");
  const subject = claims.me || claims.client_id || undefined;
  return Object.freeze({ token, claims, ...(subject ? { subject } : {}) });
}

const granted = (claims) => Array.isArray(claims.scope) ? claims.scope : String(claims.scope ?? "").split(/\s+/).filter(Boolean);

/** Read the command; a form-encoded or multipart body may also carry the access token. */
async function readCommand(ctx, maxBytes) {
  const contentType = parseContentType(ctx.req.headers["content-type"]);
  if (contentType?.type === "application/json") return { command: parseMicropubJson(await readJsonBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes, empty: {} })) };
  if (contentType?.type === "application/x-www-form-urlencoded") {
    const form = await readFormBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes });
    return { command: parseMicropubForm(form), formToken: micropubFormAccessToken(form) };
  }
  if (contentType?.type === "multipart/form-data") {
    const form = await readMultipartBody(ctx.req, { maxBytes, maxEncodedBytes: maxBytes });
    return { command: parseMicropubForm(form.fields, form.files), formToken: micropubFormAccessToken(form.fields) };
  }
  throw new TypeError("expected application/json, application/x-www-form-urlencoded or multipart/form-data");
}

function requestedProperties(params) {
  return Object.freeze([...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean));
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
  return source ? json(200, micropubSourceResponse(source, requested)) : problem(404, "not_found", "source was not found");
}

/** Store each uploaded file part with the caller's `writeMedia` and file its URL under the property it was sent as (3.3.1). */
async function storeFiles(command, opts, authorization) {
  if (!command.files?.length) return command;
  if (!opts.writeMedia) return command;
  const properties = { ...command.properties };
  for (const file of command.files) {
    const stored = await opts.writeMedia(Object.freeze({ field: file.property, filename: file.filename, contentType: file.contentType, data: file.data, fields: new Map() }), authorization);
    properties[file.property] = [...(properties[file.property] ?? []), stored.url];
  }
  const { files: _stored, ...rest } = command;
  return Object.freeze({ ...rest, properties: Object.freeze(properties) });
}

async function mutate(ctx, opts, maxBytes) {
  let read;
  try { read = await readCommand(ctx, maxBytes); }
  catch (error) {
    if (!(error instanceof BodyReadError || error instanceof RangeError)) {
      const early = await authorize(ctx, opts);
      if (!("token" in early)) return early;
    }
    return problem(error instanceof BodyReadError ? error.status : error instanceof RangeError ? 413 : 400, "invalid_request", message(error));
  }
  const authorization = await authorize(ctx, opts, read.formToken);
  if (!("token" in authorization)) return authorization;
  let command = read.command;
  if (!scopeAllows(command.action, granted(authorization.claims))) {
    return authProblem(401, opts, "insufficient_scope", `${command.action} requires ${REQUIRED_SCOPE[command.action].join(" or ")}`, REQUIRED_SCOPE[command.action][0]);
  }
  let before;
  let result;
  try {
    command = await storeFiles(command, opts, authorization);
    if (command.action !== "create" && opts.source) before = (await opts.source(command.url, authorization, [])) ?? undefined;
    result = await opts.write(command, authorization, before === undefined ? undefined : Object.freeze({ before, after: command.action === "update" ? applyMicropubUpdate(before, command) : undefined }));
  }
  catch { return problem(500, "server_error", "writer failed"); }
  const location = result?.url ?? command.url;
  if (command.action === "create" && !location) return problem(500, "server_error", "create writer did not return a URL");
  let statementCount;
  if (location) {
    try {
      const subject = location;
      const observation = before !== undefined && command.action !== "create"
        ? observationBatch({ source: { protocol: "micropub", by: authorization.subject ?? "micropub", ...(opts.now ? { at: opts.now() } : {}) },
            relations: micropubChangeRelations(subject, before, command.action === "delete" ? null : command.action === "update" ? applyMicropubUpdate(before, command) : before, { action: command.action }) })
        : micropubCommandObservation(command, { subject, source: authorization.subject, ...(opts.now ? { now: opts.now } : {}) });
      statementCount = observation.relations.length;
      await opts.observe?.(observation);
    } catch { statementCount = undefined; }
  }
  if (command.action === "create") {
    return json(result?.accepted === true ? 202 : 201, { action: command.action, url: location, ...(statementCount === undefined ? {} : { statementCount }) }, { location });
  }
  // 3.4.4, 3.5.1: 201 with the new Location when the URL changed; else 200 with a body or 204 without.
  if (result?.url && result.url !== command.url) return { status: 201, headers: { location: result.url }, cacheControl: { noStore: true }, body: "" };
  if (result?.body !== undefined) return json(200, result.body);
  return { status: 204, cacheControl: { noStore: true }, body: "" };
}

async function media(ctx, opts, maxBytes) {
  const authorization = await authorize(ctx, opts);
  if (!("token" in authorization)) return authorization;
  if (!granted(authorization.claims).some((scope) => MEDIA_SCOPES.includes(scope))) return authProblem(401, opts, "insufficient_scope", `media requires ${MEDIA_SCOPES.join(" or ")}`, MEDIA_SCOPES[0]);
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
