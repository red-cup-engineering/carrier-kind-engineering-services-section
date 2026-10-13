
/**
 * codecs/text/micropub — the Micropub wire grammars.
 *
 * Source input: a POST body (`application/json` or
 * `application/x-www-form-urlencoded`) admitted as a {@link MicropubCommand}
 * — an action plus an h-* properties bag, never a partial guess at a
 * malformed body. Target representation: the same command projected as
 * real EAVT statement rows (`micropubCommandStatements`, reusing
 * `codecs/text/json/jsonl/eavt`'s `toEavt` rather than a bespoke assertion
 * shape) — metroplat already carries the journal math this command
 * settles into.
 *
 * @packageDocumentation
 */
import { type JsonValue } from "../../../lib/codecs/json/core.mts";
import { type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";

export type MicropubAction = "create" | "update" | "delete" | "undelete";

export interface MicropubCommand {
  readonly action: MicropubAction;
  readonly url?: string;
  readonly type: readonly string[];
  readonly properties: Readonly<Record<string, readonly unknown[]>>;
  readonly replace: Readonly<Record<string, readonly unknown[]>>;
  readonly add: Readonly<Record<string, readonly unknown[]>>;
  readonly delete: Readonly<Record<string, readonly unknown[] | true>>;
}

export interface MicropubPostType {
  readonly type: string;
  readonly name: string;
  readonly properties?: readonly string[];
}

export interface MicropubSyndicationTarget {
  readonly uid: string;
  readonly name: string;
  readonly service?: string;
}

export interface MicropubConfig {
  readonly "media-endpoint"?: string;
  readonly "syndicate-to"?: readonly MicropubSyndicationTarget[];
  readonly "post-types"?: readonly MicropubPostType[];
}

const DEFAULT_TYPE: readonly string[] = Object.freeze(["h-entry"]);
const CONTENT_PROPERTY_DENYLIST = new Set(["access_token"]);

/** The scopes (any-of) each Micropub action requires from an IndieAuth token. */
export const REQUIRED_SCOPE: Readonly<Record<MicropubAction, readonly string[]>> = Object.freeze({
  create: Object.freeze(["create", "post"]),
  update: Object.freeze(["update"]),
  delete: Object.freeze(["delete"]),
  undelete: Object.freeze(["delete"]),
});

function toArray(value: unknown): readonly unknown[] {
  if (value === undefined) return Object.freeze([]);
  return Object.freeze(Array.isArray(value) ? [...value] : [value]);
}

function propertyBag(input: unknown): Readonly<Record<string, readonly unknown[]>> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return Object.freeze({});
  const out: Record<string, readonly unknown[]> = {};
  for (const [key, value] of Object.entries(input)) out[key] = toArray(value);
  return Object.freeze(out);
}

function deleteBag(input: unknown): Readonly<Record<string, readonly unknown[] | true>> {
  if (Array.isArray(input)) {
    const out: Record<string, true> = {};
    for (const item of input) if (typeof item === "string" && item) out[item] = true;
    return Object.freeze(out);
  }
  if (input === null || typeof input !== "object") return Object.freeze({});
  const out: Record<string, readonly unknown[] | true> = {};
  for (const [key, value] of Object.entries(input)) out[key] = value === null ? true : toArray(value);
  return Object.freeze(out);
}

function strings(value: readonly unknown[]): readonly string[] {
  return Object.freeze(value.filter((item): item is string => typeof item === "string" && item.length > 0));
}

function normalizeAction(value: string | undefined): MicropubAction {
  return value === "update" || value === "delete" || value === "undelete" ? value : "create";
}

/** Admit a Micropub JSON body as a {@link MicropubCommand}, or throw. */
export function parseMicropubJson(input: unknown): MicropubCommand {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("micropub: JSON body must be an object");
  const body = input as Record<string, unknown>;
  const type = strings(toArray(body["type"]));
  const url = typeof body["url"] === "string" && body["url"] ? body["url"] : undefined;
  return Object.freeze({
    action: normalizeAction(typeof body["action"] === "string" ? body["action"] : undefined),
    ...(url === undefined ? {} : { url }),
    type: type.length > 0 ? type : DEFAULT_TYPE,
    properties: propertyBag(body["properties"]),
    replace: propertyBag(body["replace"]),
    add: propertyBag(body["add"]),
    delete: deleteBag(body["delete"]),
  });
}

function appendFormValue(out: Record<string, unknown[]>, key: string, value: unknown): void {
  out[key] = [...(out[key] ?? []), value];
}

/** Admit a Micropub `application/x-www-form-urlencoded` body as a {@link MicropubCommand}. */
export function parseMicropubForm(form: URLSearchParams): MicropubCommand {
  const properties: Record<string, unknown[]> = {};
  const replace: Record<string, unknown[]> = {};
  const add: Record<string, unknown[]> = {};
  const deleted: Record<string, readonly unknown[] | true> = {};
  let action: MicropubAction = "create";
  let url: string | undefined;
  const type: string[] = [];

  for (const [key, value] of form) {
    if (key === "action") action = normalizeAction(value);
    else if (key === "url" && value) url = value;
    else if (key === "h") type.push(`h-${value}`);
    else if (key.startsWith("replace[")) appendFormValue(replace, key.slice(8, -1), value);
    else if (key.startsWith("add[")) appendFormValue(add, key.slice(4, -1), value);
    else if (key.startsWith("delete[")) appendFormValue(deleted as Record<string, unknown[]>, key.slice(7, -1), value);
    else if (key === "delete") deleted[value] = true;
    else if (key === "access_token") continue;
    else appendFormValue(properties, key, value);
  }

  return Object.freeze({
    action,
    ...(url === undefined ? {} : { url }),
    type: Object.freeze(type.length > 0 ? type : [...DEFAULT_TYPE]),
    properties: propertyBag(properties),
    replace: propertyBag(replace),
    add: propertyBag(add),
    delete: Object.freeze(deleted),
  });
}

/** Whether a granted scope satisfies one of the action's acceptable scopes. */
export function scopeAllows(action: MicropubAction, scope: string | readonly string[] | null | undefined): boolean {
  const granted = new Set(Array.isArray(scope) ? scope : String(scope ?? "").split(/\s+/).filter(Boolean));
  return REQUIRED_SCOPE[action].some((required) => granted.has(required));
}

/** Derive the default Micropub `?q=config` response, folding in caller-supplied post-types/media/syndication. */
export function micropubConfigResponse(config: MicropubConfig = {}): MicropubConfig {
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

export interface MicropubStatementOptions {
  readonly subject?: string;
  readonly source?: string;
  readonly now?: () => string;
}

function firstString(values: readonly unknown[] | undefined): string | undefined {
  return (values ?? []).find((value): value is string => typeof value === "string" && value.length > 0);
}

/**
 * Project a {@link MicropubCommand} into real EAVT statement rows: one meta
 * row for the action and each declared `type`, one row per admitted
 * property/replace/add value, and a `{not: value}`-marked row per deletion
 * (a deletion records the negation, never erases the prior row).
 */
export function micropubCommandStatements(command: MicropubCommand, opts: MicropubStatementOptions = {}): readonly EAVT[] {
  const subject = opts.subject ?? command.url ?? firstString(command.properties["uid"]) ?? firstString(command.properties["slug"]);
  if (subject === undefined) throw new TypeError("micropub: command needs a subject URL, uid, or slug");
  const now = opts.now ?? (() => new Date().toISOString());
  const t = (phase: string): unknown => ({ by: opts.source ?? "micropub", at: now(), action: command.action, phase });
  const rows: EAVT[] = [];
  const push = (predicate: string, object: unknown, phase = "set"): void => {
    rows.push(Object.freeze([subject, predicate, object as JsonValue, t(phase) as JsonValue] as const));
  };

  push("micropub-action", command.action, "meta");
  for (const value of command.type) push("type", value, "meta");
  for (const [predicate, values] of Object.entries(command.properties)) {
    if (CONTENT_PROPERTY_DENYLIST.has(predicate)) continue;
    for (const value of values) push(predicate, value);
  }
  for (const [predicate, values] of Object.entries(command.replace)) for (const value of values) push(predicate, value, "replace");
  for (const [predicate, values] of Object.entries(command.add)) for (const value of values) push(predicate, value, "add");
  for (const [predicate, values] of Object.entries(command.delete)) {
    if (values === true) push(predicate, { not: "*" }, "delete");
    else for (const value of values) push(predicate, { not: value }, "delete");
  }
  return Object.freeze(rows);
}
