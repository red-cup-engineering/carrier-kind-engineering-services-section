import { readJsonBody, type App, type Repr } from "@emsenn/relating/running/http";
import { JsonRpcClient, type JsonRpcClientOptions, type JsonRpcParams } from "@red-cup-engineering/organizing-with-the-web/jsonrpc";
import { linkHeader } from "@emsenn/relating/writing/http";
import {
  logFor,
  subjects,
  type Assertion,
  type AssertionTrace,
  type WorldInput,
} from "@red-cup-engineering/organizing-with-the-web/assertion-worlds";
import {
  linkedDataSubject,
  subjectIri,
  toJsonLd,
  type LinkedDataCell,
  type LinkedDataSettleOptions,
  type LinkedDataSubject,
} from "@red-cup-engineering/organizing-with-the-semantic-web/linked-data";
import {
  paginate,
  paginationLinkHeader,
  type Page,
} from "@red-cup-engineering/organizing-with-the-web/pagination";
import {
  authorizeBearer,
  type AuthDecision,
  type TokenPolicy,
} from "@red-cup-engineering/organizing-with-the-web/sync-guard";

export type ContentField = LinkedDataCell;

export type ContentResource = Readonly<{
  id: string;
  url: string;
  title: string;
  summary?: string;
  published?: string;
  updated?: string;
  status?: string;
  tags: readonly string[];
  fields: readonly ContentField[];
  active: readonly ContentField[];
  stable: readonly ContentField[];
  links: Readonly<{
    self: string;
    describedby: string;
  }>;
}>;

export type ContentSummary = Readonly<{
  id: string;
  url: string;
  title: string;
  summary?: string;
  published?: string;
  updated?: string;
  status?: string;
  tags: readonly string[];
}>;

export type ContentProjectionOptions = Readonly<{
  base?: string;
  fold?: LinkedDataSettleOptions;
  titlePredicates?: readonly string[];
  summaryPredicates?: readonly string[];
  publishedPredicates?: readonly string[];
  updatedPredicates?: readonly string[];
  statusPredicates?: readonly string[];
  tagPredicates?: readonly string[];
}>;

export type ContentListOptions = ContentProjectionOptions & Readonly<{
  status?: string;
  tag?: string;
  includeStatus?: readonly string[];
}>;

export type ContentListPage = Page<ContentSummary>;

export type ContentApiAppOptions = ContentListOptions & Readonly<{
  world: WorldInput | (() => WorldInput | Promise<WorldInput>);
  paths?: {
    collection?: string;
    item?: string;
  };
  pageSize?: number;
}>;

export type ContentWriteAction = "create" | "update" | "delete";

export type ContentWriteCommand = Readonly<{
  action: ContentWriteAction;
  subject: string;
  properties: Readonly<Record<string, readonly unknown[]>>;
  replace: Readonly<Record<string, readonly unknown[]>>;
  add: Readonly<Record<string, readonly unknown[]>>;
  delete: Readonly<Record<string, readonly unknown[] | true>>;
}>;

export type ContentWriteResult = Readonly<{
  assertions: AssertionTrace;
  subject?: string;
}>;

export type ContentWriter = (command: ContentWriteCommand, auth: AuthDecision) => ContentWriteResult | Promise<ContentWriteResult>;

export type ContentAdminAppOptions = Readonly<{
  write: ContentWriter;
  tokens?: TokenPolicy;
  path?: string;
  maxBodyBytes?: number;
}>;

const DEFAULT_TITLE = Object.freeze(["title", "name", "label", "p-name"]);
const DEFAULT_SUMMARY = Object.freeze(["summary", "description", "excerpt"]);
const DEFAULT_PUBLISHED = Object.freeze(["published", "datePublished", "dt-published"]);
const DEFAULT_UPDATED = Object.freeze(["updated", "modified", "dateModified", "dt-updated"]);
const DEFAULT_STATUS = Object.freeze(["status"]);
const DEFAULT_TAGS = Object.freeze(["tag", "tags", "category", "categories"]);

function ensureSlash(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function valuesFor(cells: readonly LinkedDataCell[], predicates: readonly string[]): readonly unknown[] {
  const wanted = new Set(predicates);
  return cells.filter((cell) => wanted.has(cell.predicate)).map((cell) => cell.object);
}

function firstString(cells: readonly LinkedDataCell[], predicates: readonly string[]): string | undefined {
  for (const value of valuesFor(cells, predicates)) {
    const string = stringValue(value);
    if (string) return string;
  }
  return undefined;
}

function manyStrings(cells: readonly LinkedDataCell[], predicates: readonly string[]): readonly string[] {
  const out = new Set<string>();
  for (const value of valuesFor(cells, predicates)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const string = stringValue(item);
        if (string) out.add(string);
      }
    } else {
      const string = stringValue(value);
      if (string) out.add(string);
    }
  }
  return Object.freeze([...out].sort());
}

function itemUrl(base: string, subject: string): string {
  return subjectIri(base, subject);
}

function describedbyUrl(base: string, subject: string): string {
  const url = new URL(itemUrl(base, subject));
  url.searchParams.set("format", "jsonld");
  return url.href;
}

export function contentFromLinkedData(algebra: LinkedDataSubject, opts: ContentProjectionOptions = {}): ContentResource {
  const base = opts.base ?? "http://localhost/";
  const titlePredicates = opts.titlePredicates ?? DEFAULT_TITLE;
  const summaryPredicates = opts.summaryPredicates ?? DEFAULT_SUMMARY;
  const publishedPredicates = opts.publishedPredicates ?? DEFAULT_PUBLISHED;
  const updatedPredicates = opts.updatedPredicates ?? DEFAULT_UPDATED;
  const statusPredicates = opts.statusPredicates ?? DEFAULT_STATUS;
  const tagPredicates = opts.tagPredicates ?? DEFAULT_TAGS;
  const potential = algebra.potential;
  const title = firstString(potential, titlePredicates) ?? algebra.subject;
  const url = itemUrl(base, algebra.subject);
  const out: {
    id: string;
    url: string;
    title: string;
    summary?: string;
    published?: string;
    updated?: string;
    status?: string;
    tags: readonly string[];
    fields: readonly ContentField[];
    active: readonly ContentField[];
    stable: readonly ContentField[];
    links: { self: string; describedby: string };
  } = {
    id: algebra.subject,
    url,
    title,
    tags: manyStrings(potential, tagPredicates),
    fields: potential,
    active: algebra.active,
    stable: algebra.stable,
    links: {
      self: url,
      describedby: describedbyUrl(base, algebra.subject),
    },
  };
  const summary = firstString(potential, summaryPredicates);
  const published = firstString(potential, publishedPredicates);
  const updated = firstString(potential, updatedPredicates);
  const status = firstString(potential, statusPredicates);
  if (summary !== undefined) out.summary = summary;
  if (published !== undefined) out.published = published;
  if (updated !== undefined) out.updated = updated;
  if (status !== undefined) out.status = status;
  return Object.freeze(out);
}

export function contentResource(world: WorldInput, subject: string, opts: ContentProjectionOptions = {}): ContentResource | null {
  const assertions = logFor(world, subject);
  if (assertions.length === 0) return null;
  return contentFromLinkedData(linkedDataSubject(subject, assertions, opts.fold ?? {}), opts);
}

function summaryOf(resource: ContentResource): ContentSummary {
  const out: {
    id: string;
    url: string;
    title: string;
    summary?: string;
    published?: string;
    updated?: string;
    status?: string;
    tags: readonly string[];
  } = {
    id: resource.id,
    url: resource.url,
    title: resource.title,
    tags: resource.tags,
  };
  if (resource.summary !== undefined) out.summary = resource.summary;
  if (resource.published !== undefined) out.published = resource.published;
  if (resource.updated !== undefined) out.updated = resource.updated;
  if (resource.status !== undefined) out.status = resource.status;
  return Object.freeze(out);
}

function publishedRank(item: ContentSummary): string {
  return item.updated ?? item.published ?? "";
}

export function listContent(world: WorldInput, opts: ContentListOptions = {}): readonly ContentSummary[] {
  const include = opts.includeStatus ? new Set(opts.includeStatus) : undefined;
  const items = subjects(world)
    .map((subject) => contentResource(world, subject, opts))
    .filter((item): item is ContentResource => item !== null)
    .map(summaryOf)
    .filter((item) => opts.status === undefined || item.status === opts.status)
    .filter((item) => opts.tag === undefined || item.tags.includes(opts.tag))
    .filter((item) => include === undefined || (item.status !== undefined && include.has(item.status)))
    .sort((left, right) => {
      const leftRank = publishedRank(left);
      const rightRank = publishedRank(right);
      return leftRank === rightRank ? left.title.localeCompare(right.title) : rightRank.localeCompare(leftRank);
    });
  return Object.freeze(items);
}

export function contentListPage(
  world: WorldInput,
  opts: ContentListOptions & { base?: string; path?: string; page?: number; pageSize?: number } = {},
): ContentListPage {
  const pageSize = opts.pageSize ?? 20;
  const items = listContent(world, opts);
  return paginate(items, {
    baseUrl: opts.base ?? "http://localhost/",
    path: collectionPath(opts.path ?? "/content", opts.status, opts.tag),
    page: opts.page ?? 1,
    pageSize,
  });
}

function collectionPath(path: string, status: string | undefined, tag: string | undefined): string {
  const url = new URL(path, "http://localhost/");
  if (status !== undefined) url.searchParams.set("status", status);
  if (tag !== undefined) url.searchParams.set("tag", tag);
  return `${url.pathname}${url.search}`;
}

function collectionJsonLd(page: ContentListPage): Record<string, unknown> {
  return {
    "@context": {
      hydra: "http://www.w3.org/ns/hydra/core#",
      title: "http://purl.org/dc/terms/title",
    },
    "@type": "hydra:Collection",
    "hydra:totalItems": page.totalItems,
    "hydra:view": {
      "@type": "hydra:PartialCollectionView",
      "@id": page.links.self,
      "hydra:first": page.links.first,
      "hydra:last": page.links.last,
      ...(page.links.previous ? { "hydra:previous": page.links.previous } : {}),
      ...(page.links.next ? { "hydra:next": page.links.next } : {}),
    },
    "hydra:member": page.items.map((item) => ({
      "@id": item.url,
      title: item.title,
      ...(item.summary ? { summary: item.summary } : {}),
      ...(item.published ? { published: item.published } : {}),
      ...(item.updated ? { updated: item.updated } : {}),
      ...(item.status ? { status: item.status } : {}),
      ...(item.tags.length ? { tags: item.tags } : {}),
    })),
  };
}

function repr(type: string, body: unknown, status = 200, headers: Record<string, string> = {}): Repr {
  return {
    status,
    type,
    headers,
    cacheControl: { visibility: "public", maxAge: 60 },
    body: typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`,
  };
}

async function worldFrom(options: ContentApiAppOptions): Promise<WorldInput> {
  return typeof options.world === "function" ? options.world() : options.world;
}

function pageFrom(search: URLSearchParams): number {
  const value = Number.parseInt(search.get("page") ?? "1", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function arrayValue(value: unknown): readonly unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? Object.freeze([...value]) : Object.freeze([value]);
}

function propertyBag(value: unknown): Readonly<Record<string, readonly unknown[]>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Object.freeze({});
  const out: Record<string, readonly unknown[]> = {};
  for (const [key, item] of Object.entries(value)) out[key] = arrayValue(item);
  return Object.freeze(out);
}

function deleteBag(value: unknown): Readonly<Record<string, readonly unknown[] | true>> {
  if (Array.isArray(value)) {
    const out: Record<string, true> = {};
    for (const item of value) if (typeof item === "string" && item) out[item] = true;
    return Object.freeze(out);
  }
  if (!value || typeof value !== "object") return Object.freeze({});
  const out: Record<string, readonly unknown[] | true> = {};
  for (const [key, item] of Object.entries(value)) out[key] = item === null || item === true ? true : arrayValue(item);
  return Object.freeze(out);
}

function actionFor(method: string, explicit: unknown): ContentWriteAction {
  if (explicit === "create" || explicit === "update" || explicit === "delete") return explicit;
  if (method === "POST") return "create";
  if (method === "PATCH" || method === "PUT") return "update";
  if (method === "DELETE") return "delete";
  return "update";
}

export function parseContentWriteCommand(input: unknown, opts: { method?: string; subject?: string } = {}): ContentWriteCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("content write body must be an object");
  const body = input as Record<string, unknown>;
  const subject = opts.subject ?? (typeof body.subject === "string" ? body.subject : undefined);
  if (!subject) throw new TypeError("subject is required");
  const action = actionFor((opts.method ?? "POST").toUpperCase(), body.action);
  return Object.freeze({
    action,
    subject,
    properties: propertyBag(body.properties),
    replace: propertyBag(body.replace),
    add: propertyBag(body.add),
    delete: deleteBag(body.delete),
  });
}

export function contentWriteAssertions(command: ContentWriteCommand, opts: { source?: string; now?: () => string } = {}): AssertionTrace {
  const at = opts.now?.() ?? new Date().toISOString();
  const t = { by: opts.source ?? "content-admin", at, action: command.action };
  const assertions: Assertion[] = [];
  const push = (predicate: string, object: unknown, phase: string) => {
    assertions.push(Object.freeze({ e: command.subject, a: predicate, v: object, t: { ...t, phase } }));
  };
  push("content-action", command.action, "meta");
  if (command.action === "delete") push("deleted", true, "delete");
  for (const [predicate, values] of Object.entries(command.properties)) for (const value of values) push(predicate, value, "set");
  for (const [predicate, values] of Object.entries(command.replace)) for (const value of values) push(predicate, value, "replace");
  for (const [predicate, values] of Object.entries(command.add)) for (const value of values) push(predicate, value, "add");
  for (const [predicate, values] of Object.entries(command.delete)) {
    if (values === true) push(predicate, { not: "*" }, "delete");
    else for (const value of values) push(predicate, { not: value }, "delete");
  }
  return Object.freeze(assertions);
}

export function contentApiApp(options: ContentApiAppOptions): App {
  const paths = {
    collection: "/content",
    item: "/content/:subject",
    ...(options.paths ?? {}),
  };
  const base = ensureSlash(options.base ?? "http://localhost/");
  return {
    resources: [
      {
        id: "content.collection",
        name: "Content Collection",
        route: paths.collection,
        match: paths.collection,
        methods: ["GET"],
        produces: ["application/json", "application/ld+json"],
        handler: async (ctx) => {
          const world = await worldFrom(options);
          const status = ctx.url.searchParams.get("status") ?? options.status;
          const tag = ctx.url.searchParams.get("tag") ?? options.tag;
          const page = contentListPage(world, {
            ...options,
            base,
            path: paths.collection,
            page: pageFrom(ctx.url.searchParams),
            ...(status !== undefined ? { status } : {}),
            ...(tag !== undefined ? { tag } : {}),
            ...(options.pageSize !== undefined ? { pageSize: options.pageSize } : {}),
          });
          const headers = { Link: paginationLinkHeader(page) };
          if (ctx.negotiatedType === "application/ld+json") {
            return repr("application/ld+json; charset=utf-8", collectionJsonLd(page), 200, headers);
          }
          return repr("application/json; charset=utf-8", page, 200, headers);
        },
      },
      {
        id: "content.item",
        name: "Content Item",
        route: paths.item,
        match: paths.item,
        methods: ["GET"],
        produces: ["application/json", "application/ld+json"],
        handler: async (ctx) => {
          const subject = ctx.params.subject ?? "";
          const world = await worldFrom(options);
          const algebra = linkedDataSubject(subject, logFor(world, subject), options.fold ?? {});
          if (algebra.potential.length === 0 && algebra.active.length === 0 && algebra.stable.length === 0) {
            return repr("application/json; charset=utf-8", { error: "not found" }, 404);
          }
          const resource = contentFromLinkedData(algebra, { ...options, base });
          const headers = { Link: linkHeader([{ href: resource.links.describedby, rel: "describedby", type: "application/ld+json" }]) };
          if (ctx.negotiatedType === "application/ld+json") {
            return repr("application/ld+json; charset=utf-8", toJsonLd(algebra, {
              base,
              subjects: subjects(world),
            }), 200, headers);
          }
          return repr("application/json; charset=utf-8", resource, 200, headers);
        },
      },
    ],
  };
}

export function contentAdminApp(options: ContentAdminAppOptions): App {
  const path = options.path ?? "/content/admin/:subject";
  const maxBodyBytes = options.maxBodyBytes ?? 262_144;
  return {
    resources: [
      {
        id: "content.admin",
        name: "Content Admin",
        route: path,
        match: path,
        methods: ["POST", "PUT", "PATCH", "DELETE"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const auth = authorizeBearer(ctx.req.headers, options.tokens);
          if (!auth.ok) {
            return repr("application/json; charset=utf-8", { error: auth.reason }, auth.status, auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : {});
          }
          let body: unknown = {};
          try {
            body = await readJsonBody(ctx.req, { maxBytes: maxBodyBytes, empty: {} });
          } catch (error) {
            return repr("application/json; charset=utf-8", { error: error instanceof Error ? error.message : "invalid JSON body" }, 400);
          }
          try {
            const command = parseContentWriteCommand(body, {
              ...(ctx.req.method !== undefined ? { method: ctx.req.method } : {}),
              ...(ctx.params.subject !== undefined ? { subject: ctx.params.subject } : {}),
            });
            const result = await options.write(command, auth);
            return repr("application/json; charset=utf-8", {
              action: command.action,
              subject: result.subject ?? command.subject,
              assertions: result.assertions.length,
            }, command.action === "create" ? 201 : 200);
          } catch (error) {
            return repr("application/json; charset=utf-8", { error: error instanceof Error ? error.message : String(error) }, 400);
          }
        },
      },
    ],
  };
}

export type HiveRpc = Readonly<{
  call<T = unknown>(method: string, params?: JsonRpcParams): Promise<T>;
}>;

export type HiveReferenceBlock = Readonly<{
  ref_block_num: number;
  ref_block_prefix: number;
}>;

export type HiveDynamicGlobalProperties = Readonly<{
  head_block_number: number;
  head_block_id: string;
  time: string;
}> & Record<string, unknown>;

export type HiveReferenceBlockData = HiveReferenceBlock & Readonly<{
  time: string;
  head_block_number: number;
}>;

export type HiveRankedPostsQuery = Readonly<{
  sort: string;
  tag?: string;
  observer?: string;
  limit?: number;
  start_author?: string;
  start_permlink?: string;
}>;

export type HiveAccountPostsQuery = Readonly<{
  sort: string;
  account: string;
  observer?: string;
  limit?: number;
  start_author?: string;
  start_permlink?: string;
}>;

export type HivePostQuery = Readonly<{
  author: string;
  permlink: string;
  observer?: string;
}>;

export type HiveProfileQuery = Readonly<{
  account: string;
  observer?: string;
}>;

export type HivePost = Readonly<{
  author: string;
  permlink: string;
  title?: string;
  body?: string;
  category?: string;
  created?: string;
  updated?: string;
  url?: string;
  json_metadata?: string | Record<string, unknown>;
}> & Record<string, unknown>;

export type HivePostAssertionOptions = Readonly<{
  source?: string;
  observedAt?: string | (() => string);
  baseUrl?: string;
  includeBody?: boolean;
  subject?: string;
}>;

/** The curated HTTPS Hive node set — upstream knowledge lives with the consumer that has it. */
export const DEFAULT_HIVE_RPC_NODES = [
  "https://api.hive.blog",
  "https://api.deathwing.me",
  "https://api.openhive.network",
  "https://anyx.io",
  "https://hive-api.arcange.eu",
  "https://techcoderx.com",
  "https://rpc.mahdiyari.info",
  "https://api.c0ff33a.uk",
] as const;

export function createHiveRpcClient(options: Partial<JsonRpcClientOptions> = {}): JsonRpcClient {
  return new JsonRpcClient({ ...options, nodes: options.nodes?.length ? options.nodes : DEFAULT_HIVE_RPC_NODES });
}

export function deriveHiveReferenceBlock(headBlockNumber: number, headBlockId: string): HiveReferenceBlock {
  const bytes = Buffer.from(headBlockId, "hex");
  if (!Number.isSafeInteger(headBlockNumber) || headBlockNumber < 0) {
    throw new RangeError("headBlockNumber must be a non-negative safe integer");
  }
  if (bytes.length < 8) throw new RangeError("headBlockId must contain at least 8 bytes of hex");
  return Object.freeze({
    ref_block_num: headBlockNumber & 0xffff,
    ref_block_prefix: bytes.readUInt32LE(4),
  });
}

export async function hiveGetDynamicGlobalProperties(rpc: HiveRpc): Promise<HiveDynamicGlobalProperties> {
  return rpc.call("condenser_api.get_dynamic_global_properties", []);
}

export async function hiveGetReferenceBlockData(rpc: HiveRpc): Promise<HiveReferenceBlockData> {
  const dgp = await hiveGetDynamicGlobalProperties(rpc);
  return Object.freeze({
    ...deriveHiveReferenceBlock(dgp.head_block_number, dgp.head_block_id),
    time: dgp.time,
    head_block_number: dgp.head_block_number,
  });
}

export async function hiveGetAccounts<T = unknown>(rpc: HiveRpc, names: readonly string[]): Promise<T> {
  return rpc.call("condenser_api.get_accounts", [[...names]]);
}

export async function hiveGetContent<T = unknown>(rpc: HiveRpc, author: string, permlink: string): Promise<T> {
  return rpc.call("condenser_api.get_content", [author, permlink]);
}

export async function hiveGetPost<T = unknown>(rpc: HiveRpc, query: HivePostQuery): Promise<T> {
  return rpc.call("bridge.get_post", {
    author: query.author,
    permlink: query.permlink,
    ...(query.observer !== undefined ? { observer: query.observer } : {}),
  });
}

export async function hiveGetRankedPosts<T = unknown>(rpc: HiveRpc, query: HiveRankedPostsQuery): Promise<T> {
  return rpc.call("bridge.get_ranked_posts", {
    sort: query.sort,
    tag: query.tag ?? "",
    observer: query.observer ?? "",
    ...(query.limit !== undefined ? { limit: query.limit } : {}),
    ...(query.start_author !== undefined ? { start_author: query.start_author } : {}),
    ...(query.start_permlink !== undefined ? { start_permlink: query.start_permlink } : {}),
  });
}

export async function hiveGetAccountPosts<T = unknown>(rpc: HiveRpc, query: HiveAccountPostsQuery): Promise<T> {
  return rpc.call("bridge.get_account_posts", {
    sort: query.sort,
    account: query.account,
    observer: query.observer ?? "",
    ...(query.limit !== undefined ? { limit: query.limit } : {}),
    ...(query.start_author !== undefined ? { start_author: query.start_author } : {}),
    ...(query.start_permlink !== undefined ? { start_permlink: query.start_permlink } : {}),
  });
}

export async function hiveGetProfile<T = unknown>(rpc: HiveRpc, query: HiveProfileQuery): Promise<T> {
  return rpc.call("bridge.get_profile", {
    account: query.account,
    observer: query.observer ?? "",
  });
}

export async function hiveGetFollowCount<T = unknown>(rpc: HiveRpc, account: string): Promise<T> {
  return rpc.call("condenser_api.get_follow_count", [account]);
}

export async function hiveGetFollowers<T = unknown>(
  rpc: HiveRpc,
  account: string,
  start: string | null = null,
  type = "blog",
  limit = 100,
): Promise<T> {
  return rpc.call("condenser_api.get_followers", [account, start, type, limit]);
}

export async function hiveGetFollowing<T = unknown>(
  rpc: HiveRpc,
  account: string,
  start: string | null = null,
  type = "blog",
  limit = 100,
): Promise<T> {
  return rpc.call("condenser_api.get_following", [account, start, type, limit]);
}

export async function hiveGetAccountHistory<T = unknown>(
  rpc: HiveRpc,
  account: string,
  start = -1,
  limit = 100,
): Promise<T> {
  return rpc.call("condenser_api.get_account_history", [account, start, limit]);
}

export async function hiveBroadcastTransaction<T = unknown>(rpc: HiveRpc, tx: unknown): Promise<T> {
  return rpc.call("condenser_api.broadcast_transaction", [tx]);
}

export async function hiveBroadcastTransactionSynchronous<T = unknown>(rpc: HiveRpc, tx: unknown): Promise<T> {
  return rpc.call("condenser_api.broadcast_transaction_synchronous", [tx]);
}

function observedAt(options: HivePostAssertionOptions): string {
  if (typeof options.observedAt === "function") return options.observedAt();
  return options.observedAt ?? new Date().toISOString();
}

function parseHiveMetadata(value: HivePost["json_metadata"]): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return value;
}

export function hivePostSubject(author: string, permlink: string): string {
  return `hive:post:${encodeURIComponent(author)}:${encodeURIComponent(permlink)}`;
}

export function hivePostUrl(post: Pick<HivePost, "author" | "permlink" | "url">, baseUrl = "https://hive.blog"): string {
  if (typeof post.url === "string" && post.url.length > 0) return post.url;
  return `${baseUrl.replace(/\/$/, "")}/@${encodeURIComponent(post.author)}/${encodeURIComponent(post.permlink)}`;
}

export function hivePostTags(post: Pick<HivePost, "category" | "json_metadata">): readonly string[] {
  const tags = new Set<string>();
  if (typeof post.category === "string" && post.category.length > 0) tags.add(post.category);
  const metadata = parseHiveMetadata(post.json_metadata);
  const raw = metadata.tags;
  if (Array.isArray(raw)) {
    for (const item of raw) if (typeof item === "string" && item.length > 0) tags.add(item);
  }
  return Object.freeze([...tags].sort());
}

export function hivePostAssertions(post: HivePost, options: HivePostAssertionOptions = {}): AssertionTrace {
  const subject = options.subject ?? hivePostSubject(post.author, post.permlink);
  const at = observedAt(options);
  const t = { by: options.source ?? "hive", at };
  const assertions: Assertion[] = [];
  const push = (predicate: string, object: unknown) => {
    if (object !== undefined && object !== "") assertions.push(Object.freeze({ e: subject, a: predicate, v: object, t }));
  };

  push("type", "SocialMediaPosting");
  push("source", "hive");
  push("author", post.author);
  push("permlink", post.permlink);
  push("url", hivePostUrl(post, options.baseUrl));
  push("title", post.title);
  if (options.includeBody !== false) push("body", post.body);
  push("published", post.created);
  push("updated", post.updated);
  push("status", "published");
  for (const tag of hivePostTags(post)) push("tag", tag);
  return Object.freeze(assertions);
}
