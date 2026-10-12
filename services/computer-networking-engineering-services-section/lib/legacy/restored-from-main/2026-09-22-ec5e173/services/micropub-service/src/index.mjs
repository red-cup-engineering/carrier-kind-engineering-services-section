import { bearerChallenge, bearerToken } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/bearer-authentication.mjs";
import { parseContentType } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-type.mjs";
import { BodyReadError, readFormBody, readJsonBody, readMultipartBody } from "@red-cup-engineering/http-services-section/body";
export const REQUIRED_SCOPES = Object.freeze({
    create: Object.freeze(["create", "post"]),
    update: Object.freeze(["update"]),
    delete: Object.freeze(["delete"]),
    undelete: Object.freeze(["delete"]),
});
export const MEDIA_SCOPES = Object.freeze(["media", "create"]);
const DEFAULT_TYPE = Object.freeze(["h-entry"]);
export function parseMicropubJson(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        throw new TypeError("Micropub JSON body must be an object");
    const body = input;
    const action = actionOf(body["action"]);
    return validateCommand(Object.freeze({
        action,
        ...(nonempty(body["url"]) ? { url: body["url"] } : {}),
        type: stringArray(body["type"]).length ? stringArray(body["type"]) : DEFAULT_TYPE,
        properties: propertyBag(body["properties"]),
        replace: propertyBag(body["replace"]),
        add: propertyBag(body["add"]),
        delete: deleteBag(body["delete"]),
    }));
}
export function parseMicropubForm(form) {
    const properties = {};
    const replace = {};
    const add = {};
    const deleted = {};
    let action = "create";
    let url;
    const type = [];
    for (const [key, value] of form) {
        if (key === "action")
            action = actionOf(value);
        else if (key === "url" && value)
            url = value;
        else if (key === "h" && value)
            type.push(`h-${value}`);
        else if (bracketName(key, "replace") !== null)
            append(replace, bracketName(key, "replace"), value);
        else if (bracketName(key, "add") !== null)
            append(add, bracketName(key, "add"), value);
        else if (bracketName(key, "delete") !== null)
            append(deleted, bracketName(key, "delete"), value);
        else if (key === "delete" && value)
            deleted[value] = true;
        else if (key !== "access_token")
            append(properties, key, value);
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
export function scopes(value) {
    return new Set(Array.isArray(value) ? value.filter(Boolean) : typeof value === "string" ? value.split(/\s+/).filter(Boolean) : []);
}
export function scopeAllows(action, value) {
    const granted = scopes(value);
    return REQUIRED_SCOPES[action].some((scope) => granted.has(scope));
}
export function micropubApp(options) {
    if (typeof options.verifyToken !== "function")
        throw new TypeError("Micropub requires verifyToken(token)");
    if (typeof options.write !== "function")
        throw new TypeError("Micropub requires write(command, authorization)");
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
                    handler: async (context) => media(context, options, maxMediaBytes),
                }] : [])],
    };
}
async function query(context, options) {
    const authorization = await authorize(context, options);
    if (!("token" in authorization))
        return authorization;
    const name = context.url.searchParams.get("q");
    if (name === "config")
        return json(200, configResponse(options.config));
    if (name === "syndicate-to")
        return json(200, { "syndicate-to": options.config?.["syndicate-to"] ?? [] });
    if (name === "source") {
        if (!options.source)
            return problem(501, "invalid_request", "source query is not configured");
        const url = context.url.searchParams.get("url");
        if (!url)
            return problem(400, "invalid_request", "url is required");
        const source = await options.source(url, authorization);
        if (!source)
            return problem(404, "not_found", "source was not found");
        return json(200, selectSourceProperties(source, context.url.searchParams));
    }
    return problem(400, "invalid_request", "unsupported Micropub query");
}
async function mutate(context, options, maxBytes) {
    const authorization = await authorize(context, options);
    if (!("token" in authorization))
        return authorization;
    let command;
    try {
        command = await readCommand(context, maxBytes);
    }
    catch (error) {
        return problem(error instanceof BodyReadError ? error.status : error instanceof RangeError ? 413 : 400, "invalid_request", message(error));
    }
    if (!scopeAllows(command.action, authorization.claims.scope)) {
        return authProblem(403, options, "insufficient_scope", `${command.action} requires ${REQUIRED_SCOPES[command.action].join(" or ")}`);
    }
    let result;
    try {
        result = await options.write(command, authorization);
    }
    catch {
        return problem(500, "server_error", "writer failed");
    }
    if (command.action === "create") {
        if (!result.url)
            return problem(500, "server_error", "create writer did not return a URL");
        return json(201, { url: result.url }, { location: result.url });
    }
    return { status: 204, cacheControl: { noStore: true }, body: "" };
}
async function media(context, options, maxBytes) {
    const authorization = await authorize(context, options);
    if (!("token" in authorization))
        return authorization;
    if (![...scopes(authorization.claims.scope)].some((scope) => MEDIA_SCOPES.includes(scope))) {
        return authProblem(403, options, "insufficient_scope", `media requires ${MEDIA_SCOPES.join(" or ")}`);
    }
    let form;
    try {
        form = await readMultipartBody(context.req, { maxBytes, maxEncodedBytes: maxBytes });
    }
    catch (error) {
        return problem(error instanceof BodyReadError ? error.status : error instanceof RangeError ? 413 : 400, "invalid_request", message(error));
    }
    const part = form.file("file") ?? form.files[0];
    if (!part)
        return problem(400, "invalid_request", "media endpoint requires a multipart file field");
    const input = Object.freeze({
        field: part.name,
        ...(part.filename === undefined ? {} : { filename: part.filename }),
        ...(part.contentType === undefined ? {} : { contentType: part.contentType }),
        data: part.data, fields: form.fields, part,
    });
    try {
        const result = await options.writeMedia(input, authorization);
        return json(201, { url: result.url }, { location: result.url });
    }
    catch {
        return problem(500, "server_error", "media writer failed");
    }
}
async function authorize(context, options) {
    const token = bearerToken(context.req.headers.authorization);
    if (!token)
        return authProblem(401, options, "invalid_token", "a bearer token is required");
    let claims;
    try {
        claims = await options.verifyToken(token);
    }
    catch {
        claims = null;
    }
    if (!claims)
        return authProblem(401, options, "invalid_token", "bearer token verification failed");
    const subject = nonempty(claims.me) ? claims.me : nonempty(claims.client_id) ? claims.client_id : undefined;
    return Object.freeze({ token, claims, ...(subject ? { subject } : {}) });
}
async function readCommand(context, maxBytes) {
    const contentType = parseContentType(context.req.headers["content-type"]);
    if (contentType?.type === "application/json") {
        return parseMicropubJson(await readJsonBody(context.req, { maxBytes, maxEncodedBytes: maxBytes, empty: {} }));
    }
    if (contentType?.type === "application/x-www-form-urlencoded") {
        return parseMicropubForm(await readFormBody(context.req, { maxBytes, maxEncodedBytes: maxBytes }));
    }
    throw new TypeError("expected application/json or application/x-www-form-urlencoded");
}
function validateCommand(command) {
    if (command.action !== "create" && !command.url)
        throw new TypeError(`${command.action} requires url`);
    if (command.url) {
        let url;
        try {
            url = new URL(command.url);
        }
        catch {
            throw new TypeError("url must be an absolute HTTP URL");
        }
        if (url.protocol !== "http:" && url.protocol !== "https:")
            throw new TypeError("url must be an absolute HTTP URL");
    }
    return command;
}
function actionOf(value) {
    if (value === undefined || value === "" || value === "create")
        return "create";
    if (value === "update" || value === "delete" || value === "undelete")
        return value;
    throw new TypeError(`unsupported Micropub action: ${String(value)}`);
}
function propertyBag(value) {
    if (value === undefined)
        return Object.freeze({});
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new TypeError("property maps must be objects");
    return freezeBag(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Array.isArray(item) ? item : [item]])));
}
function deleteBag(value) {
    if (value === undefined)
        return Object.freeze({});
    if (Array.isArray(value))
        return Object.freeze(Object.fromEntries(value.filter(nonempty).map((key) => [key, true])));
    if (!value || typeof value !== "object")
        throw new TypeError("delete must be an array or object");
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === null ? true : Object.freeze(Array.isArray(item) ? [...item] : [item])])));
}
function freezeBag(value) {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, items]) => [key, Object.freeze([...items])])));
}
function append(bag, key, value) { bag[key] = [...(bag[key] ?? []), value]; }
function bracketName(key, prefix) {
    const match = new RegExp(`^${prefix}\\[([^\\]]+)\\]$`).exec(key);
    return match?.[1] || null;
}
function stringArray(value) {
    return Object.freeze((Array.isArray(value) ? value : value === undefined ? [] : [value]).filter(nonempty));
}
function nonempty(value) { return typeof value === "string" && value.length > 0; }
function configResponse(config = {}) {
    return Object.freeze({
        "post-types": config["post-types"] ?? Object.freeze([
            Object.freeze({ type: "note", name: "Note", properties: Object.freeze(["content", "category"]) }),
            Object.freeze({ type: "article", name: "Article", properties: Object.freeze(["name", "content", "category"]) }),
        ]),
        ...(config["media-endpoint"] ? { "media-endpoint": config["media-endpoint"] } : {}),
        ...(config["syndicate-to"] ? { "syndicate-to": config["syndicate-to"] } : {}),
    });
}
function selectSourceProperties(source, params) {
    const requested = [...params.getAll("properties[]"), ...params.getAll("properties"), ...params.getAll("property")].filter(Boolean);
    if (requested.length === 0)
        return source;
    return Object.freeze({ type: source.type, properties: Object.freeze(Object.fromEntries(requested.flatMap((key) => source.properties[key] === undefined ? [] : [[key, source.properties[key]]]))) });
}
function json(status, body, headers = {}) {
    return { status, headers, type: "application/json; charset=utf-8", cacheControl: { noStore: true }, body: `${JSON.stringify(body)}\n` };
}
function problem(status, error, description) { return json(status, { error, error_description: description }); }
function authProblem(status, options, error, description) {
    return json(status, { error, error_description: description }, {
        "www-authenticate": bearerChallenge({ realm: options.realm ?? "micropub", error, errorDescription: description }),
    });
}
function message(error) { return error instanceof Error ? error.message : String(error); }
