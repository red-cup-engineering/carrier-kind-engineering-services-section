
/**
 * Micropub's wire grammar: a POST body (JSON or form-encoded) admitted as a command (an action, its
 * target url, h-* types and property bags; a non-create action needs an absolute http(s) url), the
 * scopes each action accepts, the `?q=config` response, and the command as SignGraph relations.
 */
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";

const CONTENT_PROPERTY_DENYLIST = new Set(["access_token"]);

/** The scopes (any-of) each Micropub action requires from an IndieAuth token. */
export const REQUIRED_SCOPE = Object.freeze({
  create: Object.freeze(["create", "post"]),
  update: Object.freeze(["update"]),
  delete: Object.freeze(["delete"]),
  undelete: Object.freeze(["delete"]),
});

/** The scopes (any-of) the media endpoint accepts. */
export const MEDIA_SCOPES = Object.freeze(["media", "create"]);

/** Whether a granted scope satisfies one of the action's acceptable scopes. */
export function scopeAllows(action, scope) {
  const granted = new Set(Array.isArray(scope) ? scope : String(scope ?? "").split(/\s+/).filter(Boolean));
  return REQUIRED_SCOPE[action].some((required) => granted.has(required));
}

/** Derive the default Micropub `?q=config` response, folding in caller-supplied post-types/media/syndication. */
export function micropubConfigResponse(config = {}) {
  return Object.freeze({
    "post-types": Object.freeze([
      Object.freeze({ type: "note", name: "Note", properties: Object.freeze(["content", "category"]) }),
      Object.freeze({ type: "article", name: "Article", properties: Object.freeze(["name", "content", "category"]) }),
      ...(config["post-types"] ?? []),
    ]),
    ...(config["media-endpoint"] === undefined ? {} : { "media-endpoint": config["media-endpoint"] }),
    ...(config["syndicate-to"] === undefined ? {} : { "syndicate-to": config["syndicate-to"] }),
  });
}

function firstString(values) {
  return (values ?? []).find((value) => typeof value === "string" && value.length > 0);
}

/**
 * A Micropub command's relations about its subject (its url, uid or slug): the action and each declared
 * type as meta relations, one relation per admitted property, replaced or added value, and one told
 * against per deleted value (`*` for a whole property) — a deletion records the denial, never erases.
 */
export function micropubCommandRelations(command, opts = {}) {
  const subject = opts.subject ?? command.url ?? firstString(command.properties["uid"]) ?? firstString(command.properties["slug"]);
  if (subject === undefined) throw new TypeError("micropub: command needs a subject URL, uid, or slug");
  const relations = [];
  const push = (predicate, object, phase, polarity = "for") => relations.push(Object.freeze({ subject, predicate, object, datum: Object.freeze({ phase, action: command.action }), polarity }));
  push("micropub-action", command.action, "meta");
  for (const value of command.type) push("type", value, "meta");
  for (const [predicate, values] of Object.entries(command.properties)) {
    if (CONTENT_PROPERTY_DENYLIST.has(predicate)) continue;
    for (const value of values) push(predicate, value, "set");
  }
  for (const [predicate, values] of Object.entries(command.replace)) for (const value of values) push(predicate, value, "replace");
  for (const [predicate, values] of Object.entries(command.add)) for (const value of values) push(predicate, value, "add");
  for (const [predicate, values] of Object.entries(command.delete)) {
    for (const value of values === true ? ["*"] : values) push(predicate, value, "delete", "against");
  }
  return Object.freeze(relations);
}

/** A Micropub command as a SignGraph relation-web observation, its source the author (`opts.source`) at `opts.now()`. */
export function micropubCommandObservation(command, opts = {}) {
  return observationBatch({ source: { protocol: "micropub", by: opts.source ?? "micropub", ...(opts.now ? { at: opts.now() } : {}) }, relations: micropubCommandRelations(command, opts) });
}

/** A Micropub command as EAVT statement rows: `[subject, predicate, object, t]`, a denial's object `{ not: value }`. */
export function micropubCommandStatements(command, opts = {}) {
  return Object.freeze(micropubCommandRelations(command, opts).map((relation) => Object.freeze([relation.subject, relation.predicate,
    relation.polarity === "against" ? { not: relation.object } : relation.object,
    { by: opts.source ?? "micropub", at: opts.now(), action: relation.datum.action, phase: relation.datum.phase }])));
}

// — commands —

const DEFAULT_TYPE = Object.freeze(["h-entry"]);
/** Admit a JSON Micropub body as a command. */
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
/** Admit form-encoded Micropub fields (entries) as a command. */
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
