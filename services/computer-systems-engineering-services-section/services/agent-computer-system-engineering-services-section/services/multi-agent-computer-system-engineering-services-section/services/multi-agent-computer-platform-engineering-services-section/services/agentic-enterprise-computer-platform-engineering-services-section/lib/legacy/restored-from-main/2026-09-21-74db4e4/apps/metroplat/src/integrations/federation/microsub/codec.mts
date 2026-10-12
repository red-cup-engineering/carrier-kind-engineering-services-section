
/**
 * codecs/text/microsub — the Microsub wire grammars.
 *
 * Source input: a GET query string (`?q=timeline|search`) or a POST form
 * body (mark-read/unread/starred/unstarred). Target representation: an
 * admitted {@link MicrosubTimelineRequest}/{@link MicrosubSearchRequest}/
 * {@link MicrosubMutationRequest}, or a normalized {@link MicrosubEntry}
 * (h-feed-shaped: author, published/updated, category, arbitrary mf2
 * properties). Pagination of an admitted entry sequence into a timeline page is
 * not this codec's job — that is `integrations/web/core/microsub/timeline`, over the
 * one shared cursor-pagination law in `projections/pagination`.
 *
 * @packageDocumentation
 */

export interface MicrosubChannel {
  readonly uid: string;
  readonly name: string;
  readonly unread?: number;
  readonly source?: string;
}

export interface MicrosubAuthor {
  readonly name?: string;
  readonly url?: string;
  readonly photo?: string;
}

export interface MicrosubEntry {
  readonly uid: string;
  readonly url?: string;
  readonly name?: string;
  readonly content?: string;
  readonly summary?: string;
  readonly published?: string;
  readonly updated?: string;
  readonly author?: MicrosubAuthor;
  readonly read?: boolean;
  readonly starred?: boolean;
  readonly channel?: string;
  readonly category?: readonly string[];
  readonly properties?: Readonly<Record<string, unknown>>;
}

export interface MicrosubTimelineRequest {
  readonly channel: string;
  readonly before?: string;
  readonly after?: string;
  readonly limit: number;
}

export interface MicrosubSearchRequest {
  readonly query: string;
  readonly channel?: string;
  readonly limit: number;
}

export interface MicrosubMutationRequest {
  readonly channel?: string;
  readonly entry: readonly string[];
}

function positiveLimit(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function optional(value: string | null): string | undefined {
  return value === null || value === "" ? undefined : value;
}

/** Admit a `?q=timeline` query's parameters as a {@link MicrosubTimelineRequest}. */
export function timelineRequest(params: URLSearchParams, defaultLimit: number, maxLimit: number): MicrosubTimelineRequest {
  const before = optional(params.get("before"));
  const after = optional(params.get("after"));
  return Object.freeze({
    channel: params.get("channel") || "default",
    limit: positiveLimit(params.get("limit"), defaultLimit, maxLimit),
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
  });
}

/** Admit a `?q=search` query's parameters as a {@link MicrosubSearchRequest}, or throw if no query is given. */
export function searchRequest(params: URLSearchParams, defaultLimit: number, maxLimit: number): MicrosubSearchRequest {
  const query = params.get("search") ?? params.get("query") ?? "";
  if (!query) throw new TypeError("microsub: search query is required");
  const channel = optional(params.get("channel"));
  return Object.freeze({
    query,
    limit: positiveLimit(params.get("limit"), defaultLimit, maxLimit),
    ...(channel === undefined ? {} : { channel }),
  });
}

function entryIdentifiers(form: URLSearchParams): readonly string[] {
  const entries = form.getAll("entry").filter(Boolean);
  const single = form.get("url") ?? form.get("uid");
  return Object.freeze(entries.length > 0 ? entries : single ? [single] : []);
}

/** Admit a mark-read/unread/starred/unstarred form body as a {@link MicrosubMutationRequest}, or throw. */
export function mutationRequest(form: URLSearchParams): MicrosubMutationRequest {
  const entry = entryIdentifiers(form);
  if (entry.length === 0) throw new TypeError("microsub: entry is required");
  const channel = optional(form.get("channel"));
  return Object.freeze({ entry, ...(channel === undefined ? {} : { channel }) });
}

/** Normalize a possibly-loose entry object into a {@link MicrosubEntry}, requiring a `uid`. */
export function normalizeEntry(entry: MicrosubEntry): MicrosubEntry {
  if (!entry.uid) throw new TypeError("microsub: entry.uid is required");
  return Object.freeze({
    uid: entry.uid,
    ...(entry.url === undefined ? {} : { url: entry.url }),
    ...(entry.name === undefined ? {} : { name: entry.name }),
    ...(entry.content === undefined ? {} : { content: entry.content }),
    ...(entry.summary === undefined ? {} : { summary: entry.summary }),
    ...(entry.published === undefined ? {} : { published: entry.published }),
    ...(entry.updated === undefined ? {} : { updated: entry.updated }),
    ...(entry.author === undefined ? {} : { author: Object.freeze({ ...entry.author }) }),
    ...(entry.read === undefined ? {} : { read: entry.read }),
    ...(entry.starred === undefined ? {} : { starred: entry.starred }),
    ...(entry.channel === undefined ? {} : { channel: entry.channel }),
    ...(entry.category === undefined ? {} : { category: Object.freeze([...entry.category]) }),
    ...(entry.properties === undefined ? {} : { properties: Object.freeze({ ...entry.properties }) }),
  });
}
