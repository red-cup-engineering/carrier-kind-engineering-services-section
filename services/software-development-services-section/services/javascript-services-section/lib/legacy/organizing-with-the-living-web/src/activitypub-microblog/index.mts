import type {
  Activity,
  ActivityFiniteAlgebra,
  ActivityObject,
  ActivityPubActor,
  JsonRecord,
  NodeInfoDecision,
  NodeInfoFacts,
  WebFingerAccount,
  WebFingerDecision,
  WebFingerQuery,
} from "@emsenn/organizing-with-the-web/activitypub";
import {
  NODEINFO_2_1_PATH,
  NODEINFO_WELL_KNOWN,
  WEBFINGER_PATH,
  accountJrd,
  activityToClaims,
  actorDocument,
  createActivity,
  nodeinfo,
  noteObject,
  signHttpRequest,
  webfinger,
  witnessActivity,
} from "@emsenn/organizing-with-the-web/activitypub";
import type { FeedAuthor, FeedChannel, FeedItem, SitemapUrl } from "@emsenn/organizing-with-the-web/feed";
import { assertHttpUrl, atom, escapeHtmlText, jsonFeed, jsonFeedObject, robots, rss2, sitemap } from "@emsenn/organizing-with-the-web/feed";
import type { MicroformatAuthor, MicroformatEntry, MicroformatFeed, MicroformatProperties } from "@emsenn/organizing-with-the-semantic-web/microformats";
import { hEntry, hFeed } from "@emsenn/organizing-with-the-semantic-web/microformats";
import type { MicropubAppOptions, MicropubCommand, MicropubSource, MicropubWriter } from "@emsenn/organizing-with-the-web/micropub";
import { commandAssertions, micropubApp } from "@emsenn/organizing-with-the-web/micropub";
import { securityTxt, type SecurityTxt } from "@emsenn/organizing-with-the-semantic-web/page-metadata";
import { minimal, render, type Theme, type ThemeContext } from "@emsenn/organizing-with-the-web/theming";
import {
  htmlRepr as serverHtmlRepr,
  jsonRepr as serverJsonRepr,
  readJsonBody,
  textRepr as serverTextRepr,
  type App,
  type Repr,
} from "@emsenn/relating/running/http";
import { httpDate } from "@emsenn/relating/writing/http";

export const ACTIVITY_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

export type MicroblogAuthor = Readonly<{
  name: string;
  url?: string;
  photo?: string;
  email?: string;
}>;

export type MicroblogConfigInput = Readonly<{
  title: string;
  username: string;
  baseUrl: string;
  description?: string;
  language?: string;
  author?: string | MicroblogAuthor;
  name?: string;
  summary?: string;
  icon?: JsonRecord;
  notePath?: string;
  feedUrl?: string;
  actorPath?: string;
  publicKeyPem?: string;
  publicKeyId?: string;
}>;

export type ActorIris = Readonly<{
  host: string;
  handle: string;
  actorId: string;
  profileUrl: string;
  inbox: string;
  outbox: string;
  followers: string;
  following: string;
  sharedInbox: string;
}>;

export type MicroblogConfig = Required<Pick<MicroblogConfigInput, "title" | "username" | "baseUrl" | "description" | "language" | "notePath" | "feedUrl">>
  & Readonly<{
    author?: string | MicroblogAuthor;
    name?: string;
    summary?: string;
    icon?: JsonRecord;
    actorPath?: string;
    publicKeyPem?: string;
    publicKeyId?: string;
    iris: ActorIris;
  }>;

export type NoteCell = Readonly<{
  predicate: string;
  object: unknown;
  citation?: string;
  claimedBy?: string;
  contraryClaimedBy?: string;
}>;

// Buckets carry the dynamical charge values: `potential` cells are claimed
// and unspent, `active` cells are derived, and `stable` cells are held
// contradictions — rendered as contested, never thrown.
export type MicroblogAlgebra = ActivityFiniteAlgebra & Readonly<{
  subject?: string;
  potential?: readonly NoteCell[];
  active?: readonly NoteCell[];
  stable?: readonly NoteCell[];
  t?: unknown;
}>;

export type MicroblogNoteInput = Readonly<{
  algebra: MicroblogAlgebra;
  slug?: string;
  path?: string;
  id?: string;
  url?: string;
  author?: string | MicroblogAuthor;
}>;

export type MicroblogMedia = Readonly<{
  url: string;
  type?: string;
  mediaType?: string;
  name?: string;
  alt?: string;
}>;

export type MicroblogNote = Readonly<{
  subject: string;
  slug: string;
  id: string;
  url: string;
  content: string;
  summary?: string;
  name?: string;
  published?: string;
  updated?: string;
  author?: string | MicroblogAuthor;
  inReplyTo?: string;
  tags: readonly string[];
  syndication: readonly string[];
  media: readonly MicroblogMedia[];
  fields: Readonly<Record<string, unknown>>;
  algebra: MicroblogAlgebra;
}>;

export type MicroblogBodyProjector = (note: MicroblogNote) => string;

export type MicroblogSite = Readonly<{
  config: MicroblogConfig;
  notes: readonly MicroblogNote[];
  actor: () => JsonRecord;
  actorProfile: () => ActivityPubActor;
  webfinger: (requestUrl: string) => Promise<WebFingerDecision>;
  nodeinfo: (requestPath: string, facts?: Partial<NodeInfoFacts>) => NodeInfoDecision;
  notePage: (slug: string) => NotePage | undefined;
  noteObjectFor: (slug: string) => ActivityObject | undefined;
  createFor: (slug: string) => Activity | undefined;
  outbox: () => JsonRecord;
  inbox: (activity: Activity, ctx: WitnessContext) => ReturnType<typeof witnessActivity>;
  deliver: (activity: Activity, followers: readonly DeliveryFollower[], keys: DeliveryKeys) => readonly DeliveryRequest[];
  timeline: () => string;
  jsonFeed: () => string;
  jsonFeedObject: () => Record<string, unknown>;
  atomFeed: () => string;
  rssFeed: () => string;
  sitemapXml: () => string;
  robotsTxt: () => string;
}>;

export type BuildSiteOptions = Readonly<{
  projectBody?: MicroblogBodyProjector;
  theme?: Theme;
  themeContext?: ThemeContext;
  now?: () => Date;
}>;

export type MicroblogMicropubPlan = Readonly<{
  command: MicropubCommand;
  assertions: ReturnType<typeof commandAssertions>;
  url?: string;
  note?: MicroblogNoteInput;
}>;

export type MicroblogMicropubOptions = Omit<MicropubAppOptions, "write" | "source"> & Readonly<{
  write?: (plan: MicroblogMicropubPlan, auth: Parameters<MicropubWriter>[1]) => ReturnType<MicropubWriter>;
  now?: () => string;
}>;

export type MicroblogAppOptions = Readonly<{
  securityTxtPath?: string;
  security?: SecurityTxt;
}>;

export type NotePage = Readonly<{
  url: string;
  body: string;
  entry: string;
  html: string;
}>;

export type WitnessContext = Readonly<{
  root: string;
  utter: (root: string, subject: string, claims: Record<string, unknown>, opts: { citation: string }) => unknown;
}>;

export type DeliveryFollower = string | Readonly<{
  inbox?: string;
  sharedInbox?: string;
}>;

export type DeliveryKeys = Readonly<{
  keyId?: string;
  privateKeyPem: string;
  now?: () => Date;
}>;

export type DeliveryRequest = Readonly<{
  method: "POST";
  url: string;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;

type NotePredicateRule = Readonly<{ field: keyof NoteFields; repeatable?: boolean }>;
type NoteFields = {
  content?: string;
  summary?: string;
  name?: string;
  published?: string;
  updated?: string;
  author?: string | MicroblogAuthor;
  inReplyTo?: string;
  tags?: unknown[];
  syndication?: unknown[];
  media?: unknown[];
};

export const NOTE_PREDICATE_MAP: Readonly<Record<string, NotePredicateRule>> = Object.freeze({
  content: { field: "content" },
  body: { field: "content" },
  summary: { field: "summary" },
  name: { field: "name" },
  title: { field: "name" },
  published: { field: "published" },
  date: { field: "published" },
  updated: { field: "updated" },
  modified: { field: "updated" },
  author: { field: "author" },
  "in-reply-to": { field: "inReplyTo" },
  inReplyTo: { field: "inReplyTo" },
  tag: { field: "tags", repeatable: true },
  category: { field: "tags", repeatable: true },
  syndication: { field: "syndication", repeatable: true },
  "u-syndication": { field: "syndication", repeatable: true },
  photo: { field: "media", repeatable: true },
  image: { field: "media", repeatable: true },
  media: { field: "media", repeatable: true },
  attachment: { field: "media", repeatable: true },
});

function trimBase(baseUrl: string): string {
  const trimmed = String(baseUrl ?? "").replace(/\/+$/, "");
  assertHttpUrl(trimmed, "baseUrl");
  return trimmed;
}

export function joinUrl(base: string, path = ""): string {
  const left = String(base ?? "").replace(/\/+$/, "");
  const right = String(path ?? "").replace(/^\/+/, "");
  return right ? `${left}/${right}` : left;
}

export function slugify(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableSlug(value: unknown): string {
  const slug = slugify(value);
  return slug.length > 0 ? slug : "note";
}

function isHttpUrl(value: string): boolean {
  try {
    assertHttpUrl(value, "url");
    return true;
  } catch {
    return false;
  }
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? value : String(value);
}

function toArray(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqStrings(value: unknown): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of toArray(value)) {
    const text = stringValue(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return Object.freeze(out);
}

function asAuthor(value: unknown): string | MicroblogAuthor | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const name = stringValue(record.name);
  if (!name) return undefined;
  const url = stringValue(record.url);
  const photo = stringValue(record.photo);
  const email = stringValue(record.email);
  return Object.freeze({
    name,
    ...(url ? { url } : {}),
    ...(photo ? { photo } : {}),
    ...(email ? { email } : {}),
  });
}

function mediaFromValue(value: unknown): MicroblogMedia | undefined {
  if (typeof value === "string") {
    if (!value) return undefined;
    assertHttpUrl(value, "note.media.url");
    return Object.freeze({ url: value, type: "Image" });
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const url = stringValue(record.url ?? record.href ?? record.src);
  if (!url) return undefined;
  assertHttpUrl(url, "note.media.url");
  const type = stringValue(record.type);
  const mediaType = stringValue(record.mediaType ?? record.contentType);
  const name = stringValue(record.name ?? record.title);
  const alt = stringValue(record.alt ?? record.summary);
  return Object.freeze({
    url,
    type: type ?? "Image",
    ...(mediaType ? { mediaType } : {}),
    ...(name ? { name } : {}),
    ...(alt ? { alt } : {}),
  });
}

function mediaFromValues(values: readonly unknown[] | undefined): readonly MicroblogMedia[] {
  const seen = new Set<string>();
  const out: MicroblogMedia[] = [];
  for (const value of values ?? []) {
    const media = mediaFromValue(value);
    if (!media || seen.has(media.url)) continue;
    seen.add(media.url);
    out.push(media);
  }
  return Object.freeze(out);
}

function feedAuthor(author: string | MicroblogAuthor | undefined): FeedAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return { name: author };
  return {
    name: author.name,
    ...(author.url ? { url: author.url } : {}),
    ...(author.email ? { email: author.email } : {}),
  };
}

function microformatAuthor(author: string | MicroblogAuthor | undefined): string | MicroformatAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author;
  return {
    name: author.name,
    ...(author.url ? { url: author.url } : {}),
    ...(author.photo ? { photo: author.photo } : {}),
  };
}

function microformatFeedAuthor(author: string | MicroblogAuthor | undefined): MicroformatAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return { name: author };
  return {
    name: author.name,
    ...(author.url ? { url: author.url } : {}),
    ...(author.photo ? { photo: author.photo } : {}),
  };
}

export function isNotePredicate(predicate: string): boolean {
  return Object.prototype.hasOwnProperty.call(NOTE_PREDICATE_MAP, predicate);
}

export function fieldsFromCells(cells: readonly NoteCell[] = []): Readonly<Record<string, unknown>> {
  const fields: Record<string, unknown> = {};
  for (const { predicate, object } of cells) {
    const rule = NOTE_PREDICATE_MAP[predicate];
    if (!rule || object === undefined || object === null || object === "") continue;
    if (rule.repeatable) {
      const prior = fields[rule.field];
      const items = Array.isArray(prior) ? prior : [];
      if (!items.includes(object)) fields[rule.field] = [...items, object];
    } else {
      fields[rule.field] = object;
    }
  }
  return Object.freeze(fields);
}

export function actorIris(config: Pick<MicroblogConfigInput, "baseUrl" | "username" | "actorPath">): ActorIris {
  if (!config.username) throw new TypeError("username is required");
  const baseUrl = trimBase(config.baseUrl);
  const user = String(config.username);
  const host = new URL(baseUrl).host;
  const actorPath = String(config.actorPath ?? `@${user}`).replace(/^\/+/, "");
  const actorId = joinUrl(baseUrl, actorPath);
  return Object.freeze({
    host,
    handle: `acct:${user}@${host}`,
    actorId,
    profileUrl: actorId,
    inbox: `${actorId}/inbox`,
    outbox: `${actorId}/outbox`,
    followers: `${actorId}/followers`,
    following: `${actorId}/following`,
    sharedInbox: `${baseUrl}/inbox`,
  });
}

export function normalizeConfig(input: MicroblogConfigInput): MicroblogConfig {
  if (!input || typeof input !== "object") throw new TypeError("config must be an object");
  if (!input.title) throw new TypeError("config.title is required");
  if (!input.username) throw new TypeError("config.username is required");
  const baseUrl = trimBase(input.baseUrl);
  const iris = actorIris({ baseUrl, username: input.username, ...(input.actorPath ? { actorPath: input.actorPath } : {}) });
  return Object.freeze({
    title: input.title,
    username: input.username,
    baseUrl,
    description: input.description ?? "",
    language: input.language ?? "en",
    notePath: input.notePath ?? "notes",
    feedUrl: input.feedUrl ?? `${baseUrl}/feed.json`,
    ...(input.author !== undefined ? { author: input.author } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
    ...(input.actorPath !== undefined ? { actorPath: input.actorPath } : {}),
    ...(input.publicKeyPem !== undefined ? { publicKeyPem: input.publicKeyPem } : {}),
    ...(input.publicKeyId !== undefined ? { publicKeyId: input.publicKeyId } : {}),
    iris,
  });
}

export function normalizeNote(input: MicroblogNoteInput, opts: Pick<MicroblogConfig, "baseUrl" | "notePath">): MicroblogNote {
  if (!input || typeof input !== "object") throw new TypeError("note input must be an object");
  if (!input.algebra || typeof input.algebra !== "object") throw new TypeError("note.algebra is required");
  const fields = fieldsFromCells(input.algebra.potential ?? []) as Readonly<NoteFields>;
  const subject = stringValue(input.algebra.subject) ?? "";
  const slug = stableSlug(input.slug ?? subject);
  const path = input.path ?? joinUrl(opts.notePath, slug);
  const derivedUrl = isHttpUrl(path) ? path : joinUrl(opts.baseUrl, path);
  const subjectUrl = subject && isHttpUrl(subject) ? subject : undefined;
  const id = input.id ?? subjectUrl ?? derivedUrl;
  const url = input.url ?? id;
  assertHttpUrl(id, "note.id");
  assertHttpUrl(url, "note.url");
  const author = input.author ?? asAuthor(fields.author);
  const summary = stringValue(fields.summary);
  const name = stringValue(fields.name);
  const published = stringValue(fields.published);
  const updated = stringValue(fields.updated);
  const inReplyTo = stringValue(fields.inReplyTo);
  const media = mediaFromValues(fields.media);
  return Object.freeze({
    subject,
    slug,
    id,
    url,
    content: stringValue(fields.content) ?? "",
    ...(summary ? { summary } : {}),
    ...(name ? { name } : {}),
    ...(published ? { published } : {}),
    ...(updated ? { updated } : {}),
    ...(author !== undefined ? { author } : {}),
    ...(inReplyTo ? { inReplyTo } : {}),
    tags: uniqStrings(fields.tags),
    syndication: uniqStrings(fields.syndication),
    media,
    fields,
    algebra: input.algebra,
  });
}

export function reverseChronological(notes: readonly MicroblogNote[]): readonly MicroblogNote[] {
  return Object.freeze([...notes].sort((a, b) => {
    const ap = a.published ?? "";
    const bp = b.published ?? "";
    if (ap && bp && ap !== bp) return ap < bp ? 1 : -1;
    if (ap !== bp) return ap ? -1 : 1;
    return a.subject.localeCompare(b.subject);
  }));
}

function cellLine(cell: NoteCell, contested: boolean): string {
  const label = escapeHtmlText(cell.predicate);
  const value = escapeHtmlText(typeof cell.object === "string" ? cell.object : JSON.stringify(cell.object) ?? "");
  const contestedAttr = contested ? ' data-contested="true"' : "";
  return `<p${contestedAttr}><span class="p-category">${label}</span>: ${value}</p>`;
}

export function projectNoteBody(note: MicroblogNote): string {
  const parts = [
    note.content ? `<p>${escapeHtmlText(note.content)}</p>` : "",
    ...(note.algebra.potential ?? [])
      .filter((cell) => !isNotePredicate(cell.predicate))
      .map((cell) => cellLine(cell, false)),
    ...(note.algebra.stable ?? []).map((cell) => cellLine(cell, true)),
  ].filter(Boolean);
  return `<article class="microblog-note-body">${parts.join("")}</article>`;
}

export function actorProfile(config: MicroblogConfigInput | MicroblogConfig): ActivityPubActor {
  const cfg = "iris" in config ? config : normalizeConfig(config);
  return Object.freeze({
    id: cfg.iris.actorId,
    type: "Person",
    preferredUsername: cfg.username,
    inbox: cfg.iris.inbox,
    outbox: cfg.iris.outbox,
    followers: cfg.iris.followers,
    following: cfg.iris.following,
    name: cfg.name ?? cfg.title,
    ...(cfg.summary ? { summary: cfg.summary } : {}),
    url: cfg.iris.profileUrl,
    ...(cfg.icon ? { icon: cfg.icon } : {}),
    ...(cfg.publicKeyPem
      ? {
          publicKey: {
            id: cfg.publicKeyId ?? `${cfg.iris.actorId}#main-key`,
            owner: cfg.iris.actorId,
            publicKeyPem: cfg.publicKeyPem,
          },
        }
      : {}),
  });
}

export function buildActor(config: MicroblogConfigInput | MicroblogConfig): JsonRecord {
  return actorDocument(actorProfile(config));
}

export function accountRecord(config: MicroblogConfigInput | MicroblogConfig): WebFingerAccount {
  const cfg = "iris" in config ? config : normalizeConfig(config);
  return {
    user: cfg.username,
    host: cfg.iris.host,
    actorId: cfg.iris.actorId,
    profileUrl: cfg.iris.profileUrl,
  };
}

export function resolveWebFingerAccount(config: MicroblogConfigInput | MicroblogConfig, query: WebFingerQuery): WebFingerAccount | null {
  const account = accountRecord(config);
  if (query.acct && query.acct.user === account.user && query.acct.host === account.host) return account;
  if (query.resource === account.actorId || query.resource === account.profileUrl) return account;
  return null;
}

export function webfingerJrd(config: MicroblogConfigInput | MicroblogConfig, rels: readonly string[] = []): JsonRecord {
  return accountJrd(accountRecord(config), rels);
}

export function handleWebfinger(requestUrl: string, config: MicroblogConfigInput | MicroblogConfig): Promise<WebFingerDecision> {
  return webfinger(requestUrl, (query) => resolveWebFingerAccount(config, query));
}

export function nodeInfoFacts(config: MicroblogConfig, noteCount = 0, facts: Partial<NodeInfoFacts> = {}): NodeInfoFacts {
  return {
    baseUrl: config.baseUrl,
    software: facts.software ?? { name: "561-group-web-activitypub-microblog", version: "0.0.1" },
    protocols: facts.protocols ?? ["activitypub"],
    ...(facts.services ? { services: facts.services } : {}),
    openRegistrations: facts.openRegistrations === true,
    usage: facts.usage ?? { users: { total: 1 }, localPosts: noteCount },
    ...(facts.metadata ? { metadata: facts.metadata } : {}),
    documentPath: facts.documentPath ?? NODEINFO_2_1_PATH,
  };
}

export function handleNodeinfo(requestPath: string, config: MicroblogConfig, noteCount = 0, facts: Partial<NodeInfoFacts> = {}): NodeInfoDecision {
  return nodeinfo(requestPath, nodeInfoFacts(config, noteCount, facts));
}

export function noteHEntryProps(note: MicroblogNote, bodyHtml = projectNoteBody(note)): MicroformatProperties {
  const author = microformatAuthor(note.author);
  return {
    ...(note.name ? { name: note.name } : {}),
    ...(note.summary ? { summary: note.summary } : {}),
    content: bodyHtml,
    url: note.url,
    uid: note.id,
    ...(note.published ? { published: note.published } : {}),
    ...(note.updated ? { updated: note.updated } : {}),
    ...(author ? { author } : {}),
    ...(note.tags.length > 0 ? { category: note.tags } : {}),
    ...(note.inReplyTo ? { inReplyTo: note.inReplyTo } : {}),
    ...(note.media.length > 0 ? { photo: note.media.map((media) => media.url) } : {}),
    ...(note.syndication.length > 0 ? { syndication: note.syndication } : {}),
  };
}

export function noteHEntry(note: MicroblogNote, bodyHtml = projectNoteBody(note)): string {
  return hEntry(noteHEntryProps(note, bodyHtml));
}

function noteTitle(note: MicroblogNote): string {
  return note.name ?? note.summary ?? (note.content.length > 0 ? note.content.slice(0, 80) : note.slug);
}

export function noteFeedItem(note: MicroblogNote, bodyHtml = projectNoteBody(note)): FeedItem {
  const author = feedAuthor(note.author);
  return {
    id: note.id,
    url: note.url,
    title: noteTitle(note),
    contentHtml: bodyHtml,
    ...(note.summary ? { summary: note.summary } : {}),
    ...(author ? { author } : {}),
    ...(note.published ? { published: note.published } : {}),
    ...(note.updated ? { updated: note.updated } : {}),
    ...(note.tags.length > 0 ? { tags: note.tags } : {}),
    ...(note.media[0] ? { imageUrl: note.media[0].url } : {}),
  };
}

export function feedChannel(config: MicroblogConfig): FeedChannel {
  const author = feedAuthor(config.author);
  return {
    title: config.title,
    homePageUrl: config.baseUrl,
    feedUrl: config.feedUrl,
    ...(config.description ? { description: config.description } : {}),
    ...(author ? { author } : {}),
    language: config.language,
  };
}

export function sitemapUrls(config: MicroblogConfig, notes: readonly MicroblogNote[]): readonly SitemapUrl[] {
  return [
    { loc: config.baseUrl, priority: 1.0 },
    { loc: config.iris.actorId, priority: 0.8 },
    ...notes.map((note) => ({
      loc: note.url,
      ...(note.updated ?? note.published ? { lastmod: note.updated ?? note.published } : {}),
      changefreq: "weekly",
      priority: 0.6,
    } satisfies SitemapUrl)),
  ];
}

export function timelineFeed(config: MicroblogConfig, notes: readonly MicroblogNote[], projectBody: MicroblogBodyProjector = projectNoteBody): MicroformatFeed {
  const entries: MicroformatEntry[] = notes.map((note) => {
    const author = microformatFeedAuthor(note.author);
    return {
      id: note.id,
      url: note.url,
      title: noteTitle(note),
      contentHtml: projectBody(note),
      ...(note.summary ? { summary: note.summary } : {}),
      ...(author ? { author } : {}),
      ...(note.published ? { published: note.published } : {}),
      ...(note.updated ? { updated: note.updated } : {}),
      ...(note.tags.length > 0 ? { tags: note.tags } : {}),
      ...(note.inReplyTo ? { inReplyTo: [note.inReplyTo] } : {}),
      ...(note.media.length > 0 ? { photos: note.media.map((media) => media.url) } : {}),
      ...(note.syndication.length > 0 ? { syndication: note.syndication } : {}),
    };
  });
  const author = microformatFeedAuthor(config.author);
  return {
    title: config.title,
    url: config.baseUrl,
    ...(author ? { author } : {}),
    entries,
  };
}

export function noteActivityObject(note: MicroblogNote, config: MicroblogConfig, bodyHtml = projectNoteBody(note)): ActivityObject {
  const object = noteObject({
    id: note.id,
    attributedTo: config.iris.actorId,
    content: bodyHtml,
    ...(note.name ? { name: note.name } : {}),
    ...(note.summary ? { summary: note.summary } : {}),
    url: note.url,
    ...(note.published ? { published: note.published } : {}),
    to: ACTIVITY_PUBLIC,
    cc: config.iris.followers,
    ...(note.tags.length > 0 ? { tag: note.tags } : {}),
  });
  if (note.media.length === 0) return object;
  return Object.freeze({
    ...object,
    attachment: note.media.map((media) => ({
      type: media.type ?? "Document",
      url: media.url,
      ...(media.mediaType ? { mediaType: media.mediaType } : {}),
      ...(media.name ? { name: media.name } : {}),
      ...(media.alt ? { summary: media.alt } : {}),
    })),
  });
}

export function micropubSourceForNote(note: MicroblogNote): MicropubSource {
  const properties: Record<string, readonly unknown[]> = {
    url: [note.url],
    uid: [note.id],
    content: [note.content],
  };
  if (note.name) properties.name = [note.name];
  if (note.summary) properties.summary = [note.summary];
  if (note.published) properties.published = [note.published];
  if (note.updated) properties.updated = [note.updated];
  if (note.inReplyTo) properties["in-reply-to"] = [note.inReplyTo];
  if (note.tags.length > 0) properties.category = note.tags;
  if (note.media.length > 0) properties.photo = note.media.map((media) => media.url);
  if (note.syndication.length > 0) properties.syndication = note.syndication;
  return Object.freeze({
    type: Object.freeze(["h-entry"]),
    properties: Object.freeze(properties),
  });
}

export function resolveMicropubSource(site: MicroblogSite, url: string): MicropubSource | null {
  const note = site.notes.find((candidate) => candidate.url === url || candidate.id === url);
  return note ? micropubSourceForNote(note) : null;
}

function commandValueString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return stringValue(record.value ?? record.html ?? record.url ?? record.href ?? record.src);
}

function firstCommandString(command: MicropubCommand, property: string): string | undefined {
  for (const value of command.properties[property] ?? []) {
    const text = commandValueString(value);
    if (text) return text;
  }
  return undefined;
}

function micropubCellObject(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record.html ?? record.value ?? value;
}

function micropubCells(command: MicropubCommand): readonly NoteCell[] {
  const cells: NoteCell[] = [];
  const skipped = new Set(["access_token", "mp-slug", "slug", "url"]);
  for (const [predicate, values] of Object.entries(command.properties)) {
    if (skipped.has(predicate)) continue;
    for (const value of values) cells.push(Object.freeze({ predicate, object: micropubCellObject(value) }));
  }
  return Object.freeze(cells);
}

export function noteInputFromMicropubCreate(
  command: MicropubCommand,
  config: MicroblogConfigInput | MicroblogConfig,
  options: { now?: () => string } = {},
): MicroblogNoteInput {
  if (command.action !== "create") throw new TypeError("noteInputFromMicropubCreate requires a create command");
  const cfg = "iris" in config ? config : normalizeConfig(config);
  const slug = stableSlug(
    firstCommandString(command, "mp-slug")
      ?? firstCommandString(command, "slug")
      ?? firstCommandString(command, "name")
      ?? firstCommandString(command, "content")
      ?? options.now?.()
      ?? new Date().toISOString(),
  );
  const url = command.url ?? firstCommandString(command, "url") ?? joinUrl(cfg.baseUrl, joinUrl(cfg.notePath, slug));
  assertHttpUrl(url, "micropub create url");
  return Object.freeze({
    slug,
    id: url,
    url,
    algebra: Object.freeze({
      subject: url,
      potential: micropubCells(command),
      ...(options.now ? { t: options.now() } : {}),
    }),
  });
}

export function planMicropubCommand(
  command: MicropubCommand,
  config: MicroblogConfigInput | MicroblogConfig,
  options: { source?: string; now?: () => string } = {},
): MicroblogMicropubPlan {
  const note = command.action === "create" ? noteInputFromMicropubCreate(command, config, { ...(options.now ? { now: options.now } : {}) }) : undefined;
  const url = note?.url ?? command.url;
  const assertions = commandAssertions(command, {
    ...(url ? { subject: url } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.now ? { now: options.now } : {}),
  });
  return Object.freeze({
    command,
    assertions,
    ...(url ? { url } : {}),
    ...(note ? { note } : {}),
  });
}

export function createForNote(note: MicroblogNote, config: MicroblogConfig, projectBody: MicroblogBodyProjector = projectNoteBody): Activity {
  const object = noteActivityObject(note, config, projectBody(note));
  return createActivity({
    id: `${note.id}#create`,
    actor: config.iris.actorId,
    object,
    ...(note.published ? { published: note.published } : {}),
    to: ACTIVITY_PUBLIC,
    cc: config.iris.followers,
  });
}

export function outboxCollection(config: MicroblogConfig, notes: readonly MicroblogNote[], projectBody: MicroblogBodyProjector = projectNoteBody): JsonRecord {
  const orderedItems = notes.map((note) => createForNote(note, config, projectBody));
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: config.iris.outbox,
    type: "OrderedCollection",
    totalItems: orderedItems.length,
    first: {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${config.iris.outbox}?page=1`,
      type: "OrderedCollectionPage",
      partOf: config.iris.outbox,
      totalItems: orderedItems.length,
      orderedItems,
    },
  };
}

export function deliveryInboxes(followers: readonly DeliveryFollower[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const follower of followers) {
    const inbox = typeof follower === "string" ? follower : follower.sharedInbox ?? follower.inbox;
    if (!inbox || seen.has(inbox)) continue;
    assertHttpUrl(inbox, "follower inbox");
    seen.add(inbox);
    out.push(inbox);
  }
  return Object.freeze(out);
}

export function deliveryRequest(activity: Activity, inboxUrl: string, keys: DeliveryKeys): DeliveryRequest {
  if (!keys.privateKeyPem) throw new TypeError("privateKeyPem is required");
  assertHttpUrl(inboxUrl, "inboxUrl");
  const body = JSON.stringify(activity);
  const url = new URL(inboxUrl);
  const signOptions = {
    keyId: keys.keyId ?? `${activity.actor}#main-key`,
    privateKeyPem: keys.privateKeyPem,
    headers: ["(request-target)", "host", "date", "digest"],
    ...(keys.now ? { now: keys.now } : {}),
  };
  const headers = {
    "Content-Type": "application/activity+json",
    ...signHttpRequest({
      method: "POST",
      url: inboxUrl,
      body,
      headers: {
        host: url.host,
        date: httpDate(keys.now?.() ?? new Date()),
      },
    }, signOptions),
  };
  return Object.freeze({ method: "POST", url: inboxUrl, headers, body });
}

export function deliverActivity(activity: Activity, followers: readonly DeliveryFollower[], keys: DeliveryKeys): readonly DeliveryRequest[] {
  return Object.freeze(deliveryInboxes(followers).map((inbox) => deliveryRequest(activity, inbox, keys)));
}

export function buildNotePage(note: MicroblogNote, config: MicroblogConfig, options: BuildSiteOptions = {}): NotePage {
  const body = (options.projectBody ?? projectNoteBody)(note);
  const entry = noteHEntry(note, body);
  const author = typeof note.author === "string" ? note.author : note.author?.name;
  const context = {
    title: noteTitle(note),
    siteName: config.title,
    description: note.summary ?? config.description,
    canonical: note.url,
    lang: config.language,
    ...(author ? { author } : {}),
    ...options.themeContext,
  };
  const html = render(options.theme ?? minimal, entry, context);
  return Object.freeze({ url: note.url, body, entry, html });
}

export function buildSite(config: MicroblogConfigInput, inputNotes: readonly MicroblogNoteInput[], options: BuildSiteOptions = {}): MicroblogSite {
  const cfg = normalizeConfig(config);
  const projectBody = options.projectBody ?? projectNoteBody;
  const notes = reverseChronological(inputNotes.map((note) => normalizeNote(note, cfg)));
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  return Object.freeze({
    config: cfg,
    notes,
    actorProfile: () => actorProfile(cfg),
    actor: () => buildActor(cfg),
    webfinger: (requestUrl: string) => handleWebfinger(requestUrl, cfg),
    nodeinfo: (requestPath: string, facts: Partial<NodeInfoFacts> = {}) => handleNodeinfo(requestPath, cfg, notes.length, facts),
    notePage(slug: string) {
      const note = bySlug.get(slug);
      return note ? buildNotePage(note, cfg, options) : undefined;
    },
    noteObjectFor(slug: string) {
      const note = bySlug.get(slug);
      return note ? noteActivityObject(note, cfg, projectBody(note)) : undefined;
    },
    createFor(slug: string) {
      const note = bySlug.get(slug);
      return note ? createForNote(note, cfg, projectBody) : undefined;
    },
    outbox: () => outboxCollection(cfg, notes, projectBody),
    inbox: (activity: Activity, ctx: WitnessContext) => witnessActivity(activity, ctx),
    deliver: (activity: Activity, followers: readonly DeliveryFollower[], keys: DeliveryKeys) => deliverActivity(activity, followers, keys),
    timeline: () => hFeed(timelineFeed(cfg, notes, projectBody)),
    jsonFeed: () => jsonFeed(feedChannel(cfg), notes.map((note) => noteFeedItem(note, projectBody(note)))),
    jsonFeedObject: () => jsonFeedObject(feedChannel(cfg), notes.map((note) => noteFeedItem(note, projectBody(note)))),
    atomFeed: () => atom({ ...feedChannel(cfg), feedUrl: joinUrl(cfg.baseUrl, "feed.atom") }, notes.map((note) => noteFeedItem(note, projectBody(note)))),
    rssFeed: () => rss2({ ...feedChannel(cfg), feedUrl: joinUrl(cfg.baseUrl, "feed.xml") }, notes.map((note) => noteFeedItem(note, projectBody(note)))),
    sitemapXml: () => sitemap(sitemapUrls(cfg, notes)),
    robotsTxt: () => robots(joinUrl(cfg.baseUrl, "sitemap.xml")),
  });
}

export function microblogMicropubApp(site: MicroblogSite, options: MicroblogMicropubOptions = {}): App {
  const { write, now, config, ...rest } = options;
  return micropubApp({
    ...rest,
    ...(config ? { config } : {}),
    source: (url) => resolveMicropubSource(site, url),
    write: (command, auth) => {
      const plan = planMicropubCommand(command, site.config, {
        ...(auth.source ? { source: auth.source } : {}),
        ...(now ? { now } : {}),
      });
      if (write) return write(plan, auth);
      return plan.url ? { url: plan.url, assertions: plan.assertions } : { assertions: plan.assertions };
    },
  });
}

function jsonRepr(body: unknown, status = 200, type = "application/activity+json; charset=utf-8"): Repr {
  return serverJsonRepr(body, { status, type, pretty: true, cacheControl: { visibility: "public", maxAge: 60 } });
}

function htmlRepr(body: string, status = 200): Repr {
  return serverHtmlRepr(body, { status, cacheControl: { visibility: "public", maxAge: 60 } });
}

function textRepr(body: string, status = 404): Repr {
  return serverTextRepr(body, status);
}

export function microblogApp(site: MicroblogSite, options: MicroblogAppOptions = {}): App {
  const actorPath = new URL(site.config.iris.actorId).pathname;
  const notePrefix = `/${site.config.notePath.replace(/^\/+|\/+$/g, "")}/`;
  const securityTxtPath = options.securityTxtPath ?? "/.well-known/security.txt";
  const security = options.security;
  const languages = Object.freeze([site.config.language]);
  return {
    resources: [
      {
        id: "activitypub-microblog.webfinger",
        name: "ActivityPub Microblog WebFinger",
        route: WEBFINGER_PATH,
        match: WEBFINGER_PATH,
        methods: ["GET"],
        produces: ["application/jrd+json"],
        languages,
        handler: async (ctx) => {
          const decision = await site.webfinger(ctx.url.href);
          return decision.jrd ? jsonRepr(decision.jrd, decision.status, decision.mediaType) : textRepr(decision.reason ?? "Not Found", decision.status);
        },
      },
      {
        id: "activitypub-microblog.nodeinfo.well-known",
        name: "ActivityPub Microblog NodeInfo Discovery",
        route: NODEINFO_WELL_KNOWN,
        match: NODEINFO_WELL_KNOWN,
        methods: ["GET"],
        produces: ["application/json"],
        languages,
        handler: async (ctx) => {
          const decision = site.nodeinfo(ctx.url.pathname);
          return decision.body ? jsonRepr(decision.body, decision.status, "application/json; charset=utf-8") : textRepr(decision.reason ?? "Not Found", decision.status);
        },
      },
      {
        id: "activitypub-microblog.nodeinfo.document",
        name: "ActivityPub Microblog NodeInfo Document",
        route: NODEINFO_2_1_PATH,
        match: NODEINFO_2_1_PATH,
        methods: ["GET"],
        produces: ["application/json"],
        languages,
        handler: async (ctx) => {
          const decision = site.nodeinfo(ctx.url.pathname);
          return decision.body ? jsonRepr(decision.body, decision.status, "application/json; charset=utf-8") : textRepr(decision.reason ?? "Not Found", decision.status);
        },
      },
      {
        id: "activitypub-microblog.actor",
        name: "ActivityPub Microblog Actor",
        route: actorPath,
        match: actorPath,
        methods: ["GET"],
        produces: ["application/activity+json"],
        languages,
        handler: async () => jsonRepr(site.actor()),
      },
      {
        id: "activitypub-microblog.outbox",
        name: "ActivityPub Microblog Outbox",
        route: new URL(site.config.iris.outbox).pathname,
        match: new URL(site.config.iris.outbox).pathname,
        methods: ["GET"],
        produces: ["application/activity+json"],
        languages,
        handler: async () => jsonRepr(site.outbox()),
      },
      {
        id: "activitypub-microblog.inbox",
        name: "ActivityPub Microblog Inbox",
        route: new URL(site.config.iris.inbox).pathname,
        match: new URL(site.config.iris.inbox).pathname,
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const activity = await readJsonBody<Activity>(ctx.req, { maxBytes: 1_000_000, empty: {} as Activity });
          const assertions: unknown[] = [];
          const report = site.inbox(activity, {
            root: site.config.baseUrl,
            utter: (_root, subject, claims, opts) => assertions.push({ subject, claims, citation: opts.citation }),
          });
          return jsonRepr({ report, assertions }, report.applied ? 202 : 400, "application/json; charset=utf-8");
        },
      },
      {
        id: "activitypub-microblog.feed.json",
        name: "ActivityPub Microblog JSON Feed",
        route: "/feed.json",
        match: "/feed.json",
        methods: ["GET"],
        produces: ["application/feed+json"],
        languages,
        handler: async () => ({ type: "application/feed+json; charset=utf-8", body: site.jsonFeed() }),
      },
      {
        id: "activitypub-microblog.feed.atom",
        name: "ActivityPub Microblog Atom Feed",
        route: "/feed.atom",
        match: "/feed.atom",
        methods: ["GET"],
        produces: ["application/atom+xml"],
        languages,
        handler: async () => ({ type: "application/atom+xml; charset=utf-8", body: site.atomFeed() }),
      },
      {
        id: "activitypub-microblog.feed.rss",
        name: "ActivityPub Microblog RSS Feed",
        route: "/feed.xml",
        match: "/feed.xml",
        methods: ["GET"],
        produces: ["application/rss+xml"],
        languages,
        handler: async () => ({ type: "application/rss+xml; charset=utf-8", body: site.rssFeed() }),
      },
      {
        id: "activitypub-microblog.sitemap",
        name: "ActivityPub Microblog Sitemap",
        route: "/sitemap.xml",
        match: "/sitemap.xml",
        methods: ["GET"],
        produces: ["application/xml"],
        handler: async () => ({ type: "application/xml; charset=utf-8", body: site.sitemapXml() }),
      },
      {
        id: "activitypub-microblog.robots",
        name: "ActivityPub Microblog Robots",
        route: "/robots.txt",
        match: "/robots.txt",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => ({ type: "text/plain; charset=utf-8", body: site.robotsTxt() }),
      },
      ...(security ? [{
        id: "activitypub-microblog.security-txt",
        name: "ActivityPub Microblog Security Contact Policy",
        route: securityTxtPath,
        match: securityTxtPath,
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => ({ type: "text/plain; charset=utf-8", body: securityTxt(security) }),
      }] : []),
      {
        id: "activitypub-microblog.timeline",
        name: "ActivityPub Microblog Timeline",
        route: "/",
        match: "/",
        methods: ["GET"],
        produces: ["text/html"],
        languages,
        handler: async () => htmlRepr(site.timeline()),
      },
      {
        id: "activitypub-microblog.note",
        name: "ActivityPub Microblog Note",
        route: `${notePrefix}:slug`,
        match: (path) => path.startsWith(notePrefix) ? { slug: path.slice(notePrefix.length).replace(/\/$/, "") } : null,
        methods: ["GET"],
        produces: ["text/html"],
        languages,
        handler: async (ctx) => {
          const page = site.notePage(ctx.params.slug ?? "");
          return page ? htmlRepr(page.html) : textRepr("Not Found", 404);
        },
      },
    ],
  };
}

export { activityToClaims };
