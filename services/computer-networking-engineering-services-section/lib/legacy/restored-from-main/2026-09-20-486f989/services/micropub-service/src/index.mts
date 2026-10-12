import { bearerChallenge, bearerToken } from "@red-cup-engineering/code-http-bearer-authentication-service";
import { parseContentType } from "@red-cup-engineering/code-http-content-type-service";
import type { MultipartPart } from "@red-cup-engineering/code-http-multipart-form-data-service";
import type { App, Context, Repr } from "@red-cup-engineering/http-server-application-contract-service";
import { readFormBody, readJsonBody, readMultipartBody } from "@red-cup-engineering/read-http-request-body-service";

export type MicropubAction = "create" | "update" | "delete" | "undelete";
export type PropertyBag = Readonly<Record<string, readonly unknown[]>>;
export type DeleteBag = Readonly<Record<string, readonly unknown[] | true>>;
export type MicropubCommand = Readonly<{
  action: MicropubAction;
  url?: string;
  type: readonly string[];
  properties: PropertyBag;
  replace: PropertyBag;
  add: PropertyBag;
  delete: DeleteBag;
}>;
export type MicropubConfig = Readonly<{
  "media-endpoint"?: string;
  "syndicate-to"?: readonly Readonly<{ uid: string; name: string; service?: string }>[];
  "post-types"?: readonly Readonly<{ type: string; name: string; properties?: readonly string[] }>[];
}>;
export type TokenClaims = Readonly<{ me?: string; client_id?: string; scope?: string | readonly string[]; [claim: string]: unknown }>;
export type Authorization = Readonly<{ token: string; claims: TokenClaims; subject?: string }>;
export type VerifyToken = (token: string) => TokenClaims | null | false | undefined | Promise<TokenClaims | null | false | undefined>;
export type WriteResult = Readonly<{ url?: string }>;
export type Writer = (command: MicropubCommand, authorization: Authorization) => WriteResult | Promise<WriteResult>;
export type MicropubSource = Readonly<{ type: readonly string[]; properties: PropertyBag }>;
export type SourceReader = (url: string, authorization: Authorization) => MicropubSource | null | undefined | Promise<MicropubSource | null | undefined>;
export type MediaInput = Readonly<{
  field: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
  fields: URLSearchParams;
  part: MultipartPart;
}>;
export type MediaWriter = (input: MediaInput, authorization: Authorization) => Readonly<{ url: string }> | Promise<Readonly<{ url: string }>>;

export type MicropubAppOptions = Readonly<{
  verifyToken: VerifyToken;
  write: Writer;
  source?: SourceReader;
  writeMedia?: MediaWriter;
  config?: MicropubConfig;
  path?: string;
  mediaPath?: string;
  realm?: string;
  maxBodyBytes?: number;
  maxMediaBytes?: number;
}>;

export const REQUIRED_SCOPES = Object.freeze({
  create: Object.freeze(["create", "post"]),
  update: Object.freeze(["update"]),
  delete: Object.freeze(["delete"]),
  undelete: Object.freeze(["delete"]),
} satisfies Record<MicropubAction, readonly string[]>);
export const MEDIA_SCOPES = Object.freeze(["media", "create"]);
const DEFAULT_TYPE = Object.freeze(["h-entry"]);

export function parseMicropubJson(input: unknown): MicropubCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Micropub JSON body must be an object");
  const body = input as Record<string, unknown>;
  const action = actionOf(body["action"]);
  return validateCommand(Object.freeze({
    action,
    ...(nonempty(body["url"]) ? { url: body["url"] as string } : {}),
    type: stringArray(body["type"]).length ? stringArray(body["type"]) : DEFAULT_TYPE,
    properties: propertyBag(body["properties"]),
    replace: propertyBag(body["replace"]),
    add: propertyBag(body["add"]),
    delete: deleteBag(body["delete"]),
  }));
}

export function parseMicropubForm(form: URLSearchParams): MicropubCommand {
  const properties: Record<string, unknown[]> = {};
  const replace: Record<string, unknown[]> = {};
  const add: Record<string, unknown[]> = {};
  const deleted: Record<string, unknown[] | true> = {};
  let action: MicropubAction = "create";
  let url: string | undefined;
  const type: string[] = [];
  for (const [key, value] of form) {
    if (key === "action") action = actionOf(value);
    else if (key === "url" && value) url = value;
    else if (key === "h" && value) type.push(`h-${value}`);
    else if (bracketName(key, "replace") !== null) append(replace, bracketName(key, "replace")!, value);
    else if (bracketName(key, "add") !== null) append(add, bracketName(key, "add")!, value);
    else if (bracketName(key, "delete") !== null) append(deleted as Record<string, unknown[]>, bracketName(key, "delete")!, value);
    else if (key === "delete" && value) deleted[value] = true;
    else if (key !== "access_token") append(properties, key, value);
  }
  return validateCommand(Object.freeze({
    action,
    ...(url ? { url } : {}),
    type: Object.freeze(type.length ? type : [...DEFAULT_TYPE]),
    properties: freezeBag(properties),
    replace: freezeBag(replace),
    add: freezeBag(add),
    delete: Object.freeze(deleted),
  }));
}

export function scopes(value: string | readonly string[] | null | undefined): ReadonlySet<string> {
  return new Set(Array.isArray(value) ? value.filter(Boolean) : typeof value === "string" ? value.split(/\s+/).filter(Boolean) : []);
}

export function scopeAllows(action: MicropubAction, value: TokenClaims["scope"]): boolean {
  const granted = scopes(value);
  return REQUIRED_SCOPES[action].some((scope) => granted.has(scope));
}

export function micropubApp(options: MicropubAppOptions): App {
  if (typeof options.verifyToken !== "function") throw new TypeError("Micropub requires verifyToken(token)");
  if (typeof options.write !== "function") throw new TypeError("Micropub requires write(command, authorization)");
  const path = options.path ?? "/micropub";
  const mediaPath = options.mediaPath ?? "/micropub/media";
  const maxBodyBytes = options.maxBodyBytes ?? 256 * 1024;
  const maxMediaBytes = options.maxMediaBytes ?? 10 * 1024 * 1024;
  return {
    resources: [{
      id: "micropub.endpoint", name: "Micropub Endpoint", route: path, match: path,
      methods: ["GET", "POST"], produces: ["application/json"],
      handler: async (context) => context.req.method === "GET"
        ? query(context, options)
        : mutate(context, options, maxBodyBytes),
    }, ...(options.writeMedia ? [{
      id: "micropub.media", name: "Micropub Media Endpoint", route: mediaPath, match: mediaPath,
      methods: ["POST"], produces: ["application/json"],
      handler: async (context: Context) => media(context, options, maxMediaBytes),
    }] : [])],
  };
}

async function query(context: Context, options: MicropubAppOptions): Promise<Repr> {
  const authorization = await authorize(context, options);
  if (!("token" in authorization)) return authorization;
  const name = context.url.searchParams.get("q");
  if (name === "config") return json(200, configResponse(options.config));
  if (name === "syndicate-to") return json(200, { "syndicate-to": options.config?.["syndicate-to"] ?? [] });
  if (name === "source") {
    if (!options.source) return problem(501, "invalid_request", "source query is not configured");
    const url = context.url.searchParams.get("url");
    if (!url) return problem(400, "invalid_request", "url is required");
    const source = await options.source(url, authorization);
    if (!source) return problem(404, "not_found", "source was not found");
    return json(200, selectSourceProperties(source, context.url.searchParams));
  }
  return problem(400, "invalid_request", "unsupported Micropub query");
}

async function mutate(context: Context, options: MicropubAppOptions, maxBytes: number): Promise<Repr> {
  const authorization = await authorize(context, options);
  if (!("token" in authorization)) return authorization;
  let command: MicropubCommand;
  try { command = await readCommand(context, maxBytes); }
  catch (error) { return problem(error instanceof RangeError ? 413 : 400, "invalid_request", message(error)); }
  if (!scopeAllows(command.action, authorization.claims.scope)) {
    return authProblem(403, options, "insufficient_scope", `${command.action} requires ${REQUIRED_SCOPES[command.action].join(" or ")}`);
  }
  let result: WriteResult;
  try { result = await options.write(command, authorization); }
  catch { return problem(500, "server_error", "writer failed"); }
  if (command.action === "create") {
    if (!result.url) return problem(500, "server_error", "create writer did not return a URL");
    return json(201, { url: result.url }, { location: result.url });
  }
  return { status: 204, cacheControl: { noStore: true }, body: "" };
}

async function media(context: Context, options: MicropubAppOptions, maxBytes: number): Promise<Repr> {
  const authorization = await authorize(context, options);
  if (!("token" in authorization)) return authorization;
  if (![...scopes(authorization.claims.scope)].some((scope) => MEDIA_SCOPES.includes(scope))) {
    return authProblem(403, options, "insufficient_scope", `media requires ${MEDIA_SCOPES.join(" or ")}`);
  }
  let form: Awaited<ReturnType<typeof readMultipartBody>>;
  try { form = await readMultipartBody(context.req, { maxBytes, maxEncodedBytes: maxBytes }); }
  catch (error) { return problem(error instanceof RangeError ? 413 : 400, "invalid_request", message(error)); }
  const part = form.file("file") ?? form.files[0];
  if (!part) return problem(400, "invalid_request", "media endpoint requires a multipart file field");
  const input = Object.freeze({
    field: part.name,
    ...(part.filename === undefined ? {} : { filename: part.filename }),
    ...(part.contentType === undefined ? {} : { contentType: part.contentType }),
    data: part.data, fields: form.fields, part,
  });
  try {
    const result = await options.writeMedia!(input, authorization);
    return json(201, { url: result.url }, { location: result.url });
  } catch { return problem(500, "server_error", "media writer failed"); }
}

async function authorize(context: Context, options: MicropubAppOptions): Promise<Authorization | Repr> {
  const token = bearerToken(context.req.headers.authorization);
  if (!token) return authProblem(401, options, "invalid_token", "a bearer token is required");
  let claims: TokenClaims | null | false | undefined;
  try { claims = await options.verifyToken(token); } catch { claims = null; }
  if (!claims) return authProblem(401, options, "invalid_token", "bearer token verification failed");
  const subject = nonempty(claims.me) ? claims.me : nonempty(claims.client_id) ? claims.client_id : undefined;
  return Object.freeze({ token, claims, ...(subject ? { subject } : {}) });
}

async function readCommand(context: Context, maxBytes: number): Promise<MicropubCommand> {
  const contentType = parseContentType(context.req.headers["content-type"]);
  if (contentType?.type === "application/json") {
    return parseMicropubJson(await readJsonBody(context.req, { maxBytes, maxEncodedBytes: maxBytes, empty: {} }));
  }
  if (contentType?.type === "application/x-www-form-urlencoded") {
    return parseMicropubForm(await readFormBody(context.req, { maxBytes, maxEncodedBytes: maxBytes }));
  }
  throw new TypeError("expected application/json or application/x-www-form-urlencoded");
}

function validateCommand(command: MicropubCommand): MicropubCommand {
  if (command.action !== "create" && !command.url) throw new TypeError(`${command.action} requires url`);
  if (command.url) {
    let url: URL;
    try { url = new URL(command.url); } catch { throw new TypeError("url must be an absolute HTTP URL"); }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("url must be an absolute HTTP URL");
  }
  return command;
}

function actionOf(value: unknown): MicropubAction {
  if (value === undefined || value === "" || value === "create") return "create";
  if (value === "update" || value === "delete" || value === "undelete") return value;
  throw new TypeError(`unsupported Micropub action: ${String(value)}`);
}

function propertyBag(value: unknown): PropertyBag {
  if (value === undefined) return Object.freeze({});
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("property maps must be objects");
  return freezeBag(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Array.isArray(item) ? item : [item]])));
}

function deleteBag(value: unknown): DeleteBag {
  if (value === undefined) return Object.freeze({});
  if (Array.isArray(value)) return Object.freeze(Object.fromEntries(value.filter(nonempty).map((key) => [key, true as const]))) as DeleteBag;
  if (!value || typeof value !== "object") throw new TypeError("delete must be an array or object");
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === null ? true : Object.freeze(Array.isArray(item) ? [...item] : [item])]))) as DeleteBag;
}

function freezeBag(value: Record<string, readonly unknown[]>): PropertyBag {
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, items]) => [key, Object.freeze([...items])]))) as PropertyBag;
}

function append(bag: Record<string, unknown[]>, key: string, value: unknown): void { bag[key] = [...(bag[key] ?? []), value]; }
function bracketName(key: string, prefix: string): string | null {
  const match = new RegExp(`^${prefix}\\[([^\\]]+)\\]$`).exec(key);
  return match?.[1] || null;
}
function stringArray(value: unknown): readonly string[] {
  return Object.freeze((Array.isArray(value) ? value : value === undefined ? [] : [value]).filter(nonempty));
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.length > 0; }

function configResponse(config: MicropubConfig = {}): MicropubConfig {
  return Object.freeze({
    "post-types": config["post-types"] ?? Object.freeze([
      Object.freeze({ type: "note", name: "Note", properties: Object.freeze(["content", "category"]) }),
      Object.freeze({ type: "article", name: "Article", properties: Object.freeze(["name", "content", "category"]) }),
    ]),
    ...(config["media-endpoint"] ? { "media-endpoint": config["media-endpoint"] } : {}),
    ...(config["syndicate-to"] ? { "syndicate-to": config["syndicate-to"] } : {}),
  });
}

function selectSourceProperties(source: MicropubSource, params: URLSearchParams): MicropubSource {
  const requested = [...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean);
  if (requested.length === 0) return source;
  return Object.freeze({ type: source.type, properties: Object.freeze(Object.fromEntries(requested.flatMap((key) => source.properties[key] === undefined ? [] : [[key, source.properties[key]]]))) });
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Repr {
  return { status, headers, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(body)}\n` };
}
function problem(status: number, error: string, description: string): Repr { return json(status, { error, error_description: description }); }
function authProblem(status: 401 | 403, options: MicropubAppOptions, error: string, description: string): Repr {
  return json(status, { error, error_description: description }, {
    "www-authenticate": bearerChallenge({ realm: options.realm ?? "micropub", error, errorDescription: description }),
  });
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
